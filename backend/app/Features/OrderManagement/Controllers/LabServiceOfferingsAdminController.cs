namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/platform/order-configuration/lab-service-offerings")]
public sealed class LabServiceOfferingsAdminController(PSeqOperationsDbContext db, OrderRequestContext access) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<LabServiceOfferingDto>> List(CancellationToken token)
    {
        await access.RequirePlatformAdminAsync(HttpContext, token);
        return await new LabServiceOfferingService(db).ReadAsync(false, token);
    }

    [HttpPost]
    public async Task<LabServiceOfferingDto> Create([FromBody] LabServiceOfferingWriteRequest request, CancellationToken token)
    {
        var actor = await access.RequirePlatformAdminAsync(HttpContext, token);
        var service = new LabServiceOfferingService(db);
        var offering = LabServiceOfferingService.Build(Guid.NewGuid(), 1, request);
        await service.ValidateConfigurationAsync(offering, token);
        db.Set<LabServiceOffering>().Add(offering);
        AccountAudit.Add(db, HttpContext, nameof(LabServiceOffering), offering.Id, "LabServiceOfferingCreated", null,
            actor.Id, new { offering.FamilyId, offering.OfferingVersion, offering.CatalogItemId });
        await db.SaveChangesAsync(token);
        return await service.ReadOneAsync(offering.Id, token);
    }

    [HttpPost("{id:guid}/versions")]
    public async Task<LabServiceOfferingDto> CreateVersion(Guid id, [FromBody] LabServiceOfferingWriteRequest request, CancellationToken token)
    {
        var actor = await access.RequirePlatformAdminAsync(HttpContext, token);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, token);
        var previous = await ReadAsync(id, token);
        if (previous.Version != request.Version) throw new DbUpdateConcurrencyException();
        var latest = await db.Set<LabServiceOffering>().Where(value => value.FamilyId == previous.FamilyId)
            .MaxAsync(value => value.OfferingVersion, token);
        if (previous.OfferingVersion != latest)
            throw new OrderManagementException("lab_offering_newer_version_exists", "Review the latest offering version before creating another version.", StatusCodes.Status409Conflict);
        var service = new LabServiceOfferingService(db);
        var next = LabServiceOfferingService.Build(previous.FamilyId, latest + 1, request);
        await service.ValidateConfigurationAsync(next, token);
        if (next.IsActive)
        {
            var activeVersions = await db.Set<LabServiceOffering>().Where(value => value.FamilyId == previous.FamilyId
                && value.IsActive && (!value.EffectiveTo.HasValue || value.EffectiveTo > next.EffectiveFrom)
                && (!next.EffectiveTo.HasValue || value.EffectiveFrom < next.EffectiveTo)).ToListAsync(token);
            foreach (var active in activeVersions)
            {
                if (active.EffectiveFrom < next.EffectiveFrom)
                    active.SetAvailability(active.EffectiveFrom, next.EffectiveFrom, true);
                else
                    active.SetAvailability(active.EffectiveFrom, active.EffectiveTo, false);
            }
        }
        db.Set<LabServiceOffering>().Add(next);
        AccountAudit.Add(db, HttpContext, nameof(LabServiceOffering), next.Id, "LabServiceOfferingVersionCreated", null,
            actor.Id, new { previousOfferingId = previous.Id, next.FamilyId, next.OfferingVersion });
        await db.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
        return await service.ReadOneAsync(next.Id, token);
    }

    [HttpPatch("{id:guid}/availability")]
    public async Task<LabServiceOfferingDto> Availability(Guid id, [FromBody] LabServiceOfferingAvailabilityRequest request, CancellationToken token)
    {
        var actor = await access.RequirePlatformAdminAsync(HttpContext, token);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, token);
        var offering = await ReadAsync(id, token);
        if (offering.Version != request.Version) throw new DbUpdateConcurrencyException();
        if (request.IsActive && await db.Set<LabServiceOffering>().AnyAsync(value => value.FamilyId == offering.FamilyId
            && value.Id != offering.Id && value.IsActive && value.EffectiveFrom < (request.EffectiveTo ?? DateTime.MaxValue)
            && (!value.EffectiveTo.HasValue || value.EffectiveTo > request.EffectiveFrom), token))
            throw new OrderManagementException("lab_offering_window_overlap", "Another version is active in this effective window. Retire it before activating this version.", StatusCodes.Status409Conflict);
        try { offering.SetAvailability(request.EffectiveFrom, request.EffectiveTo, request.IsActive); }
        catch (ArgumentException exception) { throw new OrderManagementException("lab_offering_invalid", exception.Message, StatusCodes.Status400BadRequest); }
        var service = new LabServiceOfferingService(db);
        await service.ValidateConfigurationAsync(offering, token);
        AccountAudit.Add(db, HttpContext, nameof(LabServiceOffering), offering.Id, "LabServiceOfferingAvailabilityChanged", null,
            actor.Id, new { offering.IsActive, offering.EffectiveFrom, offering.EffectiveTo });
        await db.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
        return await service.ReadOneAsync(offering.Id, token);
    }

    private async Task<LabServiceOffering> ReadAsync(Guid id, CancellationToken token) =>
        await db.Set<LabServiceOffering>().SingleOrDefaultAsync(value => value.Id == id, token)
        ?? throw new OrderManagementException("lab_offering_not_found", "The Lab Service offering was not found.", StatusCodes.Status404NotFound);
}
