namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    public sealed record DecideCustomerHold(int Version, string Action, string Reason, bool Confirmed);
    [HttpGet("work-orders/{workOrderId:guid}/customer-holds")]
    public async Task<object> ReadCustomerHolds(Guid workOrderId, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        await RequireWorkOrderAsync(workOrderId, ct);
        return await LabCustomerHolds.ReadAsync(dbContext, workOrderId, false, actor.HasAny(LabRole.Supervisor, LabRole.OperationsAdministrator), ct);
    }
    [HttpPost("work-orders/{workOrderId:guid}/customer-holds/{holdId:guid}")]
    public async Task<object> ResolveCustomerHold(Guid workOrderId, Guid holdId, DecideCustomerHold input, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Supervisor, LabRole.OperationsAdministrator);
        var fact = await dbContext.LabCustomerHolds.AsNoTracking().SingleOrDefaultAsync(h => h.Id == holdId && h.LabWorkOrderId == workOrderId, ct) ?? throw Missing();
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "customer-hold:" + fact.LabSpecimenId, ct);
        var hold = await dbContext.LabCustomerHolds.SingleAsync(h => h.Id == holdId, ct);
        EnsureVersion(hold.Version, input.Version);
        if (!input.Confirmed) throw Invalid("customer_hold_confirmation", "Confirm the safe pause or resumption boundary, including any external provider work.");
        if (input.Action == "resume")
        {
            var work = await RequireWorkOrderAsync(workOrderId, ct);
            if (work.Status is LabWorkOrderStatus.Cancelled or LabWorkOrderStatus.OnHold)
                throw Conflict("customer_hold_resume_unavailable", "Resolve the job cancellation or separate internal hold before approving resumption.");
        }
        Execute(() => hold.Decide(input.Action, input.Reason, actor.User.Id, DateTime.UtcNow));
        LabCustomerHolds.Event(dbContext, hold, actor.User.Id, input.Action, input.Reason);
        await dbContext.SaveChangesAsync(ct);
        if (tx is not null) await tx.CommitAsync(ct);
        return await LabCustomerHolds.ReadAsync(dbContext, workOrderId, false, true, ct);
    }
}
