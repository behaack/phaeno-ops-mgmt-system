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
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, "sample-shipping-default-destination", ct);
        await SampleShippingPackingData.LockAsync(dbContext, $"shipping-destination:{key}", ct);
        var family = await dbContext.SampleShippingDestinations.Where(value => value.DefinitionKey == key).ToListAsync(ct);
        var item = family.Single(value => value.Id == id);
        EnsureVersion(item.Version, request.Version);
        var now = DateTime.UtcNow;
        if (!request.IsActive && item.IsEffectiveAt(now))
        {
            var defaultKey = await dbContext.OrderSystemConfigurations.AsNoTracking().OrderBy(value => value.CreatedAt)
                .Select(value => value.DefaultShippingDestinationDefinitionKey).FirstOrDefaultAsync(ct);
            if (defaultKey == key && !family.Any(value => value.Id != id && value.IsEffectiveAt(now)))
                throw Conflict("shipping_default_destination_in_use",
                    "Choose another default Phaeno ship-to destination before deactivating the current default.");
        }
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

    private async Task<Guid> DestinationFamilyKeyAsync(Guid id, CancellationToken ct)
        => await dbContext.SampleShippingDestinations.AsNoTracking().Where(value => value.Id == id)
            .Select(value => (Guid?)value.DefinitionKey).SingleOrDefaultAsync(ct)
            ?? throw Missing("shipping_destination_not_found", "The destination revision was not found.");

}
