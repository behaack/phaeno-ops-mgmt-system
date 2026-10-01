namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabServiceOrdersController
{
    [HttpGet("{orderId:guid}/phases")]
    public async Task<LabPhasePlanDto> Phases(Guid orderId, CancellationToken ct)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, false, ct);
        await ReadOrderAsync(orderId, tenant, ct);
        return await new LabPhaseFacts(dbContext).ReadAsync(orderId, ct);
    }

    [HttpPost("{orderId:guid}/phases/proposals/{proposalId:guid}/decision")]
    public async Task<LabPhasePlanDto> DecidePhases(Guid orderId, Guid proposalId, LabPhaseDecisionRequest request, CancellationToken ct)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, ct);
        await ReadOrderAsync(orderId, tenant, ct);
        var execution = await idempotency.ExecuteAsync(tenant.Actor.Id, $"lab-order:{orderId}:phase-proposal:{proposalId}",
            idempotency.RequireKey(HttpContext), request, async token =>
            {
                var plans = new LabPhasePlans(dbContext);
                await plans.LockAsync(orderId, token);
                var order = await ReadLockedRosterAsync(orderId, tenant, token);
                var proposal = await dbContext.Set<LabPhasePlanProposal>().SingleOrDefaultAsync(x => x.Id == proposalId && x.LabServiceOrderId == orderId, token) ?? throw Missing();
                EnsureVersion(proposal.Version, request.Version);
                if (request.Accept)
                {
                    var items = JsonSerializer.Deserialize<LabPhasePlanItem[]>(proposal.AfterJson, LabPhasePlans.JsonOptions)!;
                    await plans.ApplyAsync(order, new((int)proposal.OrderVersion, items, proposal.Reason), true, token);
                }
                Execute(() => proposal.Decide(request.Accept, tenant.Actor.Id, request.Reason, DateTime.UtcNow));
                QueueNotice(order, "lab-rephasing-decided", "Job phase plan reviewed", $"The rephasing proposal for {order.OrderNumber} was {(request.Accept ? "accepted" : "declined")}.");
                await dbContext.SaveChangesAsync(token);
                return await new LabPhaseFacts(dbContext).ReadAsync(orderId, token);
            }, cancellationToken: ct, concurrencyScope: $"lab-order:{orderId}");
        return execution.Response;
    }

    [HttpPost("{orderId:guid}/phases/{phaseId:guid}/cancellation")]
    public async Task<LabPhasePlanDto> RequestPhaseCancellation(Guid orderId, Guid phaseId, LabPhaseCancellationWriteRequest request, CancellationToken ct)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, ct);
        await ReadOrderAsync(orderId, tenant, ct);
        var execution = await idempotency.ExecuteAsync(tenant.Actor.Id, $"lab-order:{orderId}:phase:{phaseId}:cancellation",
            idempotency.RequireKey(HttpContext), request, async token =>
            {
                await new LabPhasePlans(dbContext).LockAsync(orderId, token);
                var order = await ReadLockedRosterAsync(orderId, tenant, token);
                var plan = await new LabPhaseFacts(dbContext).ReadAsync(orderId, token);
                if (order.IsTerminal() || !order.AcceptedQuoteId.HasValue || plan.Revision != request.Revision)
                    throw Conflict("phase_plan_changed", "Use the current accepted plan of an open Job.");
                var phase = plan.Phases.SingleOrDefault(x => x.Id == phaseId) ?? throw Missing();
                if (!phase.CancellationEligible || phase.CancellationPending)
                    throw Conflict("phase_cancellation_closed", "A phase cancellation can be requested only before its first required tube is received and before work begins.");
                Execute(() => dbContext.Set<LabPhaseCancellationRequest>().Add(new(phaseId, tenant.Actor.Id, request.Reason, DateTime.UtcNow)));
                await dbContext.SaveChangesAsync(token);
                return await new LabPhaseFacts(dbContext).ReadAsync(orderId, token);
            }, cancellationToken: ct, concurrencyScope: $"lab-order:{orderId}");
        return execution.Response;
    }
}
