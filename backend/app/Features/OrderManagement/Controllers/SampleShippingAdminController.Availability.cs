namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class SampleShippingAdminController
{
    [HttpPost("destinations/{id:guid}/status")]
    public async Task<SampleShippingDestinationDto> SetDestinationStatus(Guid id,
        [FromBody] SampleShippingStatusRequest request, CancellationToken ct)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, ct);
        var key = await DestinationFamilyKeyAsync(id, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"shipping-destination:{key}", ct);
        var family = await dbContext.SampleShippingDestinations.Where(value => value.DefinitionKey == key).ToListAsync(ct);
        var item = family.Single(value => value.Id == id);
        EnsureVersion(item.Version, request.Version);
        var now = DateTime.UtcNow;
        if (request.IsActive && family.Any(value => value.Revision > item.Revision))
            throw Conflict("shipping_destination_already_superseded", "Only the latest destination revision can be activated.");
        Execute("shipping_destination_status_invalid", () => item.SetActive(request.IsActive, now));
        if (request.IsActive)
        {
            var at = item.EffectiveFrom > now ? item.EffectiveFrom : now;
            foreach (var previous in family.Where(value => value.Id != id && value.IsActive && (!value.EffectiveTo.HasValue || value.EffectiveTo > at)))
                Execute("shipping_destination_period_invalid", () => previous.EndAt(at));
        }
        await dbContext.SaveChangesAsync(ct);
        if (transaction != null) await transaction.CommitAsync(ct);
        return Map(item);
    }

    [HttpPost("instruction-rules/{id:guid}/status")]
    public async Task<SampleShippingInstructionRuleDto> SetInstructionRuleStatus(Guid id,
        [FromBody] SampleShippingStatusRequest request, CancellationToken ct)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, ct);
        var anchor = await dbContext.SampleShippingInstructionRules.AsNoTracking().SingleOrDefaultAsync(value => value.Id == id, ct)
            ?? throw Missing("shipping_instruction_rule_not_found", "The shipping assignment was not found.");
        var destinationKey = await DestinationFamilyKeyAsync(anchor.DestinationId, ct);
        var sampleKey = await SampleTypeFamilyKeyAsync(anchor.SampleTypeDefinitionId, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"shipping-destination:{destinationKey}", ct);
        await SampleShippingPackingData.LockAsync(dbContext, $"sample-type:{sampleKey}", ct);
        await SampleShippingPackingData.LockAsync(dbContext, $"shipping-rule:{anchor.DestinationId}:{sampleKey}", ct);
        var family = await dbContext.SampleShippingInstructionRules.Where(value => value.DefinitionKey == anchor.DefinitionKey).ToListAsync(ct);
        var item = family.Single(value => value.Id == id);
        EnsureVersion(item.Version, request.Version);
        var destination = await dbContext.SampleShippingDestinations.AsNoTracking().SingleAsync(value => value.Id == item.DestinationId, ct);
        var sample = await dbContext.SampleTypeDefinitions.AsNoTracking().SingleAsync(value => value.Id == item.SampleTypeDefinitionId, ct);
        var now = DateTime.UtcNow;
        var at = item.EffectiveFrom > now ? item.EffectiveFrom : now;
        if (request.IsActive)
        {
            if (family.Any(value => value.Revision > item.Revision))
                throw Conflict("shipping_instruction_rule_already_superseded", "Only the latest shipping-assignment revision can be activated.");
            if (!destination.IsEffectiveAt(at))
                throw Invalid("shipping_destination_not_effective", DestinationAvailabilityError(destination, at));
            var sampleIds = await dbContext.SampleTypeDefinitions.AsNoTracking().Where(value => value.DefinitionKey == sampleKey).Select(value => value.Id).ToArrayAsync(ct);
            var currentSample = await dbContext.SampleTypeDefinitions.AsNoTracking().Where(value => value.DefinitionKey == sampleKey
                && value.IsActive && value.EffectiveFrom <= at && (!value.EffectiveTo.HasValue || value.EffectiveTo > at))
                .OrderByDescending(value => value.Revision).FirstOrDefaultAsync(ct);
            if (currentSample is null)
                throw Invalid("sample_type_not_effective", $"Sample type '{sample.Name}' has no active revision at activation time. Open Sample types and activate the appropriate revision first.");
            sample = currentSample;
            if (item.ShippingProcedureId.HasValue && !await dbContext.SampleShippingProcedures.AsNoTracking()
                .AnyAsync(value => value.Id == item.ShippingProcedureId && value.IsActive, ct))
                throw Invalid("shipping_procedure_unavailable", "The selected shipping procedure is not approved. Review Shipping procedures before activating this assignment.");
            if (await dbContext.SampleShippingInstructionRules.AsNoTracking().AnyAsync(value => value.DefinitionKey != item.DefinitionKey
                && value.DestinationId == item.DestinationId && sampleIds.Contains(value.SampleTypeDefinitionId) && value.IsActive
                && (!value.EffectiveTo.HasValue || value.EffectiveTo > at)
                && (!item.EffectiveTo.HasValue || value.EffectiveFrom < item.EffectiveTo), ct))
                throw Conflict("shipping_instruction_period_overlap", "Another active assignment already covers this destination and sample type. Deactivate that assignment before activating this one.");
        }
        Execute("shipping_instruction_status_invalid", () => item.SetActive(request.IsActive, now));
        if (request.IsActive)
            foreach (var previous in family.Where(value => value.Id != id && value.IsActive && (!value.EffectiveTo.HasValue || value.EffectiveTo > at)))
                Execute("shipping_instruction_period_invalid", () => previous.EndAt(at));
        await dbContext.SaveChangesAsync(ct);
        if (transaction != null) await transaction.CommitAsync(ct);
        return Map(item, destination.Name, sample.Name);
    }

    private async Task<Guid> DestinationFamilyKeyAsync(Guid id, CancellationToken ct)
        => await dbContext.SampleShippingDestinations.AsNoTracking().Where(value => value.Id == id)
            .Select(value => (Guid?)value.DefinitionKey).SingleOrDefaultAsync(ct)
            ?? throw Missing("shipping_destination_not_found", "The destination revision was not found.");

    private static string DestinationAvailabilityError(SampleShippingDestination destination, DateTime at)
    {
        var label = $"Destination '{destination.Name}' revision {destination.Revision}";
        if (destination.EffectiveTo.HasValue && destination.EffectiveTo <= at)
            return $"{label} has ended. Create an assignment for a current destination revision.";
        if (!destination.IsActive) return $"{label} is inactive. Open Ship-to destinations and activate it before activating this assignment.";
        if (destination.EffectiveFrom > at) return $"{label} starts after this assignment's activation time. Choose an effective time on or after {destination.EffectiveFrom:yyyy-MM-dd HH:mm} UTC.";
        return $"{label} has ended. Create an assignment for a current destination revision.";
    }
}
