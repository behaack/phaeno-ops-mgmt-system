namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.LabOperations.Domain;

public sealed partial class LabServiceOrdersController
{
    public sealed record CustomerHoldRequest(Guid SpecimenId, Guid? HoldId, int Version, string Reason);
    [HttpGet("{orderId:guid}/specimen-holds")]
    public async Task<object> CustomerSpecimenHolds(Guid orderId, CancellationToken ct)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, false, ct);
        await ReadOrderAsync(orderId, tenant, ct);
        var work = await dbContext.LabWorkOrders.AsNoTracking().SingleOrDefaultAsync(w => w.AuthorizationSourceId == orderId
            && w.AuthorizationSource == LabAuthorizationSource.CommercialOrder, ct);
        if (work is null) return new { workOrderId = (Guid?)null, specimens = Array.Empty<object>(), holds = Array.Empty<object>(), canRequest = false, canDecide = false };
        return await LabCustomerHolds.ReadAsync(dbContext, work.Id, tenant.IsDepartmentAdmin, false, ct);
    }
    [HttpPost("{orderId:guid}/specimen-holds")]
    public async Task<object> RequestSpecimenHold(Guid orderId, CustomerHoldRequest input, CancellationToken ct)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, ct);
        await ReadOrderAsync(orderId, tenant, ct);
        var work = await dbContext.LabWorkOrders.SingleOrDefaultAsync(w => w.AuthorizationSourceId == orderId
            && w.AuthorizationSource == LabAuthorizationSource.CommercialOrder, ct) ?? throw Missing();
        var specimen = await dbContext.LabSpecimens.SingleOrDefaultAsync(s => s.Id == input.SpecimenId && s.LabWorkOrderId == work.Id, ct) ?? throw Missing();
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "customer-hold:" + specimen.Id, ct);
        if (work.Status == LabWorkOrderStatus.Cancelled) throw Conflict("customer_hold_closed", "A cancelled job cannot accept a new hold request.");
        LabCustomerHold hold;
        if (input.HoldId is {} holdId)
        {
            hold = await dbContext.LabCustomerHolds.SingleOrDefaultAsync(h => h.Id == holdId && h.LabSpecimenId == specimen.Id, ct) ?? throw Missing();
            EnsureVersion(hold.Version, input.Version);
            Execute(() => hold.RequestResume(input.Reason));
            LabCustomerHolds.Event(dbContext, hold, tenant.Actor.Id, "ResumeRequested", input.Reason);
        }
        else
        {
            if (await dbContext.LabCustomerHolds.AnyAsync(h => h.LabSpecimenId == specimen.Id && h.State != "Released", ct))
                throw Conflict("customer_hold_exists", "This sample already has an active hold request. Reload its status.");
            // Previously delivered results remain accessible. A hold may still be needed for a remaining repeat run.
            try { hold = new(work.Id, specimen.Id, tenant.Actor.Id, input.Reason, DateTime.UtcNow); }
            catch (ArgumentException e) { throw Invalid("customer_hold_reason", e.Message); }
            dbContext.Add(hold); LabCustomerHolds.Event(dbContext, hold, tenant.Actor.Id, "Requested", input.Reason);
        }
        await dbContext.SaveChangesAsync(ct);
        if (tx is not null) await tx.CommitAsync(ct);
        return await LabCustomerHolds.ReadAsync(dbContext, work.Id, tenant.IsDepartmentAdmin, false, ct);
    }
}
