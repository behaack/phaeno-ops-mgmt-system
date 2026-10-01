namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Commercial.LabOperations.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class PlatformLabServiceOrdersController
{
    [HttpGet("{orderId:guid}/phases")]
    public async Task<LabPhasePlanDto> Phases(Guid orderId, CancellationToken ct)
    {
        await RequireCommercialAsync(true, ct);
        await ReadAsync(orderId, ct);
        return await new LabPhaseFacts(dbContext).ReadAsync(orderId, ct);
    }

    [HttpPost("{orderId:guid}/phases/configure")]
    public async Task<LabPhasePlanDto> ConfigurePhases(Guid orderId, LabPhasePlanWriteRequest request, CancellationToken ct)
        => await WritePhasePlan(orderId, request, false, ct);

    [HttpPost("{orderId:guid}/phases/proposals")]
    public async Task<LabPhasePlanDto> ProposePhases(Guid orderId, LabPhasePlanWriteRequest request, CancellationToken ct)
        => await WritePhasePlan(orderId, request, true, ct);

    private async Task<LabPhasePlanDto> WritePhasePlan(Guid orderId, LabPhasePlanWriteRequest request, bool proposal, CancellationToken ct)
    {
        var actor = await RequireCommercialAsync(false, ct);
        var execution = await idempotency.ExecuteAsync(actor.Id, $"platform:lab-order:{orderId}:phase-plan:{proposal}",
            idempotency.RequireKey(HttpContext), request, async token =>
            {
                var plans = new LabPhasePlans(dbContext);
                await plans.LockAsync(orderId, token);
                var order = await ReadAsync(orderId, token);
                if (proposal)
                {
                    if (!order.CanProposeChange) throw Conflict("phase_plan_not_accepted", "Rephasing requires an accepted open Job.");
                    if (await dbContext.Set<LabPhasePlanProposal>().AnyAsync(x => x.LabServiceOrderId == orderId && x.Status == "Pending", token))
                        throw Conflict("phase_proposal_pending", "Resolve the current phase proposal before submitting another.");
                    await plans.ValidateAsync(order, request, true, token);
                    var before = await new LabPhaseFacts(dbContext).ReadAsync(orderId, token);
                    dbContext.Set<LabPhasePlanProposal>().Add(new(orderId, order.PhasePlanRevision,
                        JsonSerializer.Serialize(before, LabPhasePlans.JsonOptions), JsonSerializer.Serialize(request.Phases, LabPhasePlans.JsonOptions),
                        request.Reason, actor.Id, DateTime.UtcNow));
                    Notice(order, "lab-rephasing-proposed", "Review proposed Job phases", $"Review the proposed phases and sample moves for {order.OrderNumber} in the Portal.");
                }
                else
                {
                    if (order.Status is not (LabServiceOrderStatus.DraftRequest or LabServiceOrderStatus.SubmittedForQuote
                        or LabServiceOrderStatus.ChangesRequested or LabServiceOrderStatus.QuoteInPreparation))
                        throw Conflict("phase_quote_fixed", "Configure phases before issuing the quote. An accepted Job requires mutual rephasing approval.");
                    await plans.ApplyAsync(order, request, false, token);
                }
                await dbContext.SaveChangesAsync(token);
                return await new LabPhaseFacts(dbContext).ReadAsync(orderId, token);
            }, cancellationToken: ct, concurrencyScope: $"lab-order:{orderId}");
        return execution.Response;
    }

    [HttpPost("{orderId:guid}/phases/cancellations/{requestId:guid}/decision")]
    public async Task<LabPhasePlanDto> DecidePhaseCancellation(Guid orderId, Guid requestId, LabPhaseDecisionRequest request, CancellationToken ct)
    {
        var actor = await RequireCommercialAsync(false, ct);
        var execution = await idempotency.ExecuteAsync(actor.Id, $"platform:lab-order:{orderId}:phase-cancellation:{requestId}",
            idempotency.RequireKey(HttpContext), request, async token =>
            {
                await new LabPhasePlans(dbContext).LockAsync(orderId, token);
                var order = await ReadAsync(orderId, token);
                var decision = await dbContext.Set<LabPhaseCancellationRequest>().SingleOrDefaultAsync(x => x.Id == requestId, token) ?? throw Missing();
                var phase = order.Phases.SingleOrDefault(x => x.Id == decision.LabJobPhaseId && x.SupersededAtUtc == null) ?? throw Missing();
                EnsureVersion(decision.Version, request.Version);
                if (order.IsTerminal()) throw Conflict("phase_plan_closed", "This Job is closed.");
                if (request.Accept)
                {
                    var facts = await new LabPhaseFacts(dbContext).ReadAsync(orderId, token);
                    if (!facts.Phases.Single(x => x.Id == phase.Id).CancellationEligible)
                        throw Conflict("phase_cancellation_closed", "The first required tube has arrived or processing has begun. Decline this request and review the work separately.");
                    var members = order.Samples.Where(x => x.LabJobPhaseId == phase.Id).ToArray();
                    var ids = members.Select(x => x.Id).ToArray();
                    var authorization = await dbContext.CommercialLabAuthorizations.SingleOrDefaultAsync(x => x.CommercialOrderId == orderId, token);
                    if (authorization != null && ids.Length > 0)
                    {
                        var outcome = await labOperationsProvider.RequestCancellationAsync(new RequestLabWorkCancellationCommand(
                            new LabOperationsCommandMetadata(Guid.NewGuid(), authorization.AuthorizationId, DateTime.UtcNow),
                            authorization.AuthorizationId, authorization.AuthorizationVersion, "commercial_phase_cancellation_approved", ids), token);
                        if (outcome.Disposition != LabCancellationDisposition.Accepted || !ids.ToHashSet().SetEquals(outcome.AffectedSubmittedSpecimenIds))
                            throw Conflict("phase_cancellation_review", "Laboratory work requires review before cancellation can be approved.");
                    }
                    Execute(() => phase.Cancel(actor.Id, request.Reason, DateTime.UtcNow));
                    Execute(() => order.ReadPreparationScope());
                    foreach (var sample in members) Execute(() => sample.ApplyLaboratoryOutcome(LabSampleStatus.Cancelled, request.Reason));
                    order.AdvancePhasePlan();
                    // Shipping and physical custody remain factual; approval does not fabricate a return or destroy material.
                }
                Execute(() => decision.Decide(request.Accept, actor.Id, request.Reason, DateTime.UtcNow));
                Notice(order, "lab-phase-cancellation-decided", "Phase cancellation reviewed", $"Phaeno {(request.Accept ? "approved" : "declined")} cancellation of {phase.Name} for {order.OrderNumber}: {request.Reason}");
                await dbContext.SaveChangesAsync(token);
                return await new LabPhaseFacts(dbContext).ReadAsync(orderId, token);
            }, cancellationToken: ct, concurrencyScope: $"lab-order:{orderId}");
        return execution.Response;
    }
}
