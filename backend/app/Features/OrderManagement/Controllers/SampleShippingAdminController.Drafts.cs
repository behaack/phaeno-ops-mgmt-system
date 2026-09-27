namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class SampleShippingAdminController
{
    [HttpPut("destinations/{id:guid}/draft")]
    public async Task<SampleShippingDestinationDto> EditDestinationDraft(Guid id,
        [FromBody] UpdateShippingDestinationDraftRequest request, CancellationToken ct)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, ct);
        var key = await DestinationFamilyKeyAsync(id, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"shipping-destination:{key}", ct);
        var item = await dbContext.SampleShippingDestinations.SingleAsync(value => value.Id == id, ct);
        EnsureVersion(item.Version, request.Version);
        var draft = request.Draft;
        if (!string.Equals(item.Code, draft.Code?.Trim(), StringComparison.OrdinalIgnoreCase))
            throw Conflict("shipping_destination_code_frozen", "A destination code cannot change between revisions.");
        var candidate = Execute("shipping_destination_invalid", () => new SampleShippingDestination(
            item.DefinitionKey, item.Revision, item.SupersedesDestinationId, item.Code, draft.Name,
            draft.RecipientName, draft.OrganizationName, draft.AddressLine1, draft.AddressLine2,
            draft.City, draft.StateOrProvince, draft.PostalCode, draft.CountryCode,
            draft.ReceivingPhone, draft.ReceivingEmail, draft.ReceivingHours, draft.TimeZoneId,
            draft.ClosureInstructions, draft.DeliveryInstructions, draft.CarrierRestrictions,
            draft.InternationalShippingAllowed, RequireUtc(draft.EffectiveFrom, "Destination effective-from"), false));
        var released = await dbContext.SampleShippingDestinations.AsNoTracking()
            .Where(value => value.DefinitionKey == key && value.Id != id
                && (value.Lifecycle == ShippingRevisionLifecycle.Released
                    || value.Lifecycle == ShippingRevisionLifecycle.Superseded
                    || value.Lifecycle == ShippingRevisionLifecycle.Deactivated))
            .OrderByDescending(value => value.Revision).FirstOrDefaultAsync(ct);
        if (released is not null && candidate.EffectiveFrom <= released.EffectiveFrom)
            throw Invalid("shipping_destination_period_invalid", "A destination Draft must begin after the preceding released revision.");
        Execute("shipping_destination_invalid", () => item.UpdateDraftFrom(candidate));
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Map(item);
    }

    [HttpPost("destinations/{id:guid}/discard")]
    public async Task<SampleShippingDestinationDto> DiscardDestinationDraft(Guid id,
        [FromBody] DiscardShippingDraftRequest request, CancellationToken ct)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, ct);
        var key = await DestinationFamilyKeyAsync(id, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"shipping-destination:{key}", ct);
        var item = await dbContext.SampleShippingDestinations.SingleAsync(value => value.Id == id, ct);
        EnsureVersion(item.Version, request.Version);
        Execute("shipping_destination_invalid", item.Discard);
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Map(item);
    }

    [HttpPut("sample-types/{id:guid}/draft")]
    public async Task<SampleTypeDefinitionDto> EditSampleTypeDraft(Guid id,
        [FromBody] UpdateSampleTypeDraftRequest request, CancellationToken ct)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, ct);
        var key = await SampleTypeFamilyKeyAsync(id, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"sample-type:{key}", ct);
        var item = await dbContext.SampleTypeDefinitions.SingleAsync(value => value.Id == id, ct);
        EnsureVersion(item.Version, request.Version);
        var draft = request.Draft;
        if (!string.Equals(item.Code, draft.Code?.Trim(), StringComparison.OrdinalIgnoreCase))
            throw Conflict("sample_type_code_frozen", "A Sample type code cannot change between revisions.");
        if (draft.ShippingProcedureId.HasValue && !await dbContext.SampleShippingProcedures.AsNoTracking()
            .AnyAsync(value => value.Id == draft.ShippingProcedureId.Value, ct))
            throw Invalid("shipping_procedure_unavailable", "Choose an existing Shipping procedure for this Draft.");
        var candidate = Execute("sample_type_invalid", () => new SampleTypeDefinition(
            item.DefinitionKey, item.Revision, item.SupersedesSampleTypeId, item.Code,
            draft.Name, draft.Description, draft.MaterialClass, draft.MinimumQuantity,
            draft.MaximumQuantity, draft.QuantityUnit, draft.PrimaryContainerRequirements,
            draft.TemperatureRequirements, draft.StabilizerRequirements, draft.PackagingInstructions,
            draft.LabelingInstructions, draft.ProhibitedIdentifiers, draft.SafetyRequirements,
            draft.CarrierRestrictions, draft.MaximumTransitHours,
            RequireUtc(draft.EffectiveFrom, "Sample-type effective-from"), false, draft.ShippingProcedureId));
        var released = await dbContext.SampleTypeDefinitions.AsNoTracking()
            .Where(value => value.DefinitionKey == key && value.Id != id
                && (value.Lifecycle == ShippingRevisionLifecycle.Released
                    || value.Lifecycle == ShippingRevisionLifecycle.Superseded
                    || value.Lifecycle == ShippingRevisionLifecycle.Deactivated))
            .OrderByDescending(value => value.Revision).FirstOrDefaultAsync(ct);
        if (released is not null && candidate.EffectiveFrom <= released.EffectiveFrom)
            throw Invalid("sample_type_period_invalid", "A Sample type Draft must begin after the preceding released revision.");
        Execute("sample_type_invalid", () => item.UpdateDraftFrom(candidate));
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Map(item);
    }

    [HttpPost("sample-types/{id:guid}/discard")]
    public async Task<SampleTypeDefinitionDto> DiscardSampleTypeDraft(Guid id,
        [FromBody] DiscardShippingDraftRequest request, CancellationToken ct)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, ct);
        var key = await SampleTypeFamilyKeyAsync(id, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"sample-type:{key}", ct);
        var item = await dbContext.SampleTypeDefinitions.SingleAsync(value => value.Id == id, ct);
        EnsureVersion(item.Version, request.Version);
        Execute("sample_type_invalid", item.Discard);
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Map(item);
    }
}
