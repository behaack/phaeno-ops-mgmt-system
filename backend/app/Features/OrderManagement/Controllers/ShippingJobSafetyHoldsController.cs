namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record ShippingSafetyHoldRequest(long Version, string Reason);
public sealed record ShippingSafetyHoldDto(Guid JobId, bool IsOnHold, string? Reason,
    DateTime? HeldAt, DateTime? ResolvedAt, long Version);

[ApiController, Authorize, Route("api/platform/lab-service-orders/{jobId:guid}/shipping-safety-hold")]
public sealed class ShippingJobSafetyHoldsController(PSeqOperationsDbContext db,
    OrderRequestContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ShippingSafetyHoldDto> Read(Guid jobId, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        var job = await db.LabServiceOrders.AsNoTracking().SingleOrDefaultAsync(item => item.Id == jobId, ct)
            ?? throw Missing();
        return Map(job);
    }

    [HttpPost]
    public async Task<ShippingSafetyHoldDto> Place(Guid jobId,
        [FromBody] ShippingSafetyHoldRequest request, CancellationToken ct)
    {
        var actor = await context.RequirePlatformAdminAsync(HttpContext, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"sample-shipping:{jobId}", ct);
        var job = await db.LabServiceOrders.SingleOrDefaultAsync(item => item.Id == jobId, ct) ?? throw Missing();
        if (job.Version != request.Version) throw Conflict("This Job changed. Refresh before placing a safety hold.");
        var now = DateTime.UtcNow;
        try { job.PlaceShippingSafetyHold(request.Reason, actor.Id, now); }
        catch (ArgumentException error) { throw Invalid(error.Message); }
        catch (InvalidOperationException error) { throw Conflict(error.Message); }
        db.OrderStatusEvents.Add(new(job.OrganizationId, OrderWorkflowTypes.LabService, job.Id, null,
            job.Status.ToString(), job.Status.ToString(), "Shipping is temporarily paused",
            $"Shipping safety hold placed: {request.Reason}", actor.Id, now));
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Map(job);
    }

    [HttpPost("resolve")]
    public async Task<ShippingSafetyHoldDto> Resolve(Guid jobId,
        [FromBody] ShippingSafetyHoldRequest request, CancellationToken ct)
    {
        var actor = await context.RequirePlatformAdminAsync(HttpContext, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"sample-shipping:{jobId}", ct);
        var job = await db.LabServiceOrders.SingleOrDefaultAsync(item => item.Id == jobId, ct) ?? throw Missing();
        if (job.Version != request.Version) throw Conflict("This Job changed. Refresh before resolving its safety hold.");
        var now = DateTime.UtcNow;
        try { job.ResolveShippingSafetyHold(request.Reason, actor.Id, now); }
        catch (ArgumentException error) { throw Invalid(error.Message); }
        catch (InvalidOperationException error) { throw Conflict(error.Message); }
        db.OrderStatusEvents.Add(new(job.OrganizationId, OrderWorkflowTypes.LabService, job.Id, null,
            job.Status.ToString(), job.Status.ToString(), "Shipping safety hold resolved",
            $"Shipping safety hold resolved: {request.Reason}", actor.Id, now));
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Map(job);
    }

    private static ShippingSafetyHoldDto Map(PhaenoPortal.App.Features.OrderManagement.Domain.LabServiceOrder job)
        => new(job.Id, job.HasActiveShippingSafetyHold, job.ShippingSafetyHoldReason,
            job.ShippingSafetyHeldAt, job.ShippingSafetyHoldResolvedAt, job.Version);
    private static OrderManagementException Invalid(string message) => new("shipping_safety_hold_invalid", message);
    private static OrderManagementException Conflict(string message) => new("shipping_safety_hold_conflict", message, 409);
    private static OrderManagementException Missing() => new("lab_service_order_not_found", "The Job was not found.", 404);
}
