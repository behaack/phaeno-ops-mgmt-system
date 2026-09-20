namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabOperationsController
{
    [HttpGet("work-orders/{workOrderId:guid}/attempts")]
    public async Task<LabAttemptWorkspaceDto> ReadAttempts(Guid workOrderId, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.ProtocolAdministrator, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        var attempts = await dbContext.LabSpecimenAttempts.AsNoTracking().Where(a => a.LabWorkOrderId == work.Id)
            .OrderBy(a => a.Sequence).ToListAsync(cancellationToken);
        var specimens = await dbContext.LabSpecimens.AsNoTracking().Where(s => s.LabWorkOrderId == work.Id).ToListAsync(cancellationToken);
        var tubes = await dbContext.LabContainers.AsNoTracking().Where(t => t.LabWorkOrderId == work.Id && t.Kind == LabContainerKind.SubmittedSpecimen)
            .OrderBy(t => t.Barcode).ToListAsync(cancellationToken);
        var executions = await dbContext.LabProtocolExecutions.AsNoTracking().Where(e => e.LabWorkOrderId == work.Id).ToListAsync(cancellationToken);
        var snapshot = await dbContext.LabWorkAuthorizationVersions.AsNoTracking().Where(a => a.LabWorkOrderId == work.Id)
            .OrderByDescending(a => a.AuthorizationVersion).Select(a => a.SnapshotJson).FirstOrDefaultAsync(cancellationToken);
        var runAllocations = await ReadSequencingRunAllocationsAsync(work.Id, cancellationToken);
        var approvedRuns = await new LabSequencingRunProgress(dbContext).ApprovedCountsAsync(work.Id, cancellationToken);
        var names = new Dictionary<Guid, string>();
        if (snapshot is not null)
        {
            using var json = JsonDocument.Parse(snapshot);
            var root = json.RootElement;
            if (root.TryGetProperty("replacementAuthorization", out var replacement)) root = replacement;
            if (root.TryGetProperty("specimens", out var submitted))
                foreach (var item in submitted.EnumerateArray())
                    if (item.TryGetProperty("submittedSpecimenId", out var id) && id.TryGetGuid(out var guid)
                        && item.TryGetProperty("submitterSpecimenReference", out var reference)) names[guid] = reference.GetString() ?? "Specimen";
        }
        var shipments = await dbContext.SampleShipments.AsNoTracking().Include(s => s.Items).ThenInclude(i => i.TubeSlots)
            .Where(s => s.LabWorkOrderId == work.Id && s.Status != SampleShipmentStatus.Cancelled).ToListAsync(cancellationToken);
        var expected = shipments.SelectMany(s => s.Items).GroupBy(i => i.SubmittedSpecimenId)
            .ToDictionary(g => g.Key, g => g.Sum(SampleShippingPackingData.TubeCount));
        var defaultWorkflowId = await ReadDefaultExecutionWorkflowAsync(work, cancellationToken);
        var executionStageIds = executions.Where(e => e.LabServiceWorkflowStageId.HasValue).Select(e => e.LabServiceWorkflowStageId!.Value).ToList();
        var attemptWorkflowIds = attempts.Select(a => a.LabServiceWorkflowVersionId).ToList();
        var stages = await dbContext.LabServiceWorkflowStages.AsNoTracking()
            .Where(s => attemptWorkflowIds.Contains(s.LabServiceWorkflowVersionId) || s.LabServiceWorkflowVersionId == defaultWorkflowId || executionStageIds.Contains(s.Id))
            .OrderBy(s => s.Sequence).Select(s => new LabAttemptStageDto(s.Id, s.Sequence, s.Name, s.Requirement.ToString(), s.LabProtocolVersionId, s.LabServiceWorkflowVersionId)).ToListAsync(cancellationToken);
        var workflowIds = stages.Select(s => s.WorkflowVersionId).Concat(attemptWorkflowIds.Select(id => (Guid?)id)).ToList();
        var workflows = await (from v in dbContext.LabServiceWorkflowVersions.AsNoTracking()
            join w in dbContext.LabServiceWorkflows.AsNoTracking() on v.LabServiceWorkflowId equals w.Id
            where workflowIds.Contains(v.Id) select new { v.Id, w.Name, v.WorkflowVersion }).ToDictionaryAsync(v => v.Id, cancellationToken);
        var workflow = defaultWorkflowId.HasValue ? workflows.GetValueOrDefault(defaultWorkflowId.Value) : null;
        var prepMemberships = await dbContext.LabPreparationMembers.AsNoTracking().Where(m => !m.Removed && attempts.Select(a => a.Id).Contains(m.LabSpecimenAttemptId)).ToDictionaryAsync(m => m.LabSpecimenAttemptId, m => (Guid?)m.LabPreparationBatchId, cancellationToken);
        var open = work.Status is not (LabWorkOrderStatus.Cancelled or LabWorkOrderStatus.ReadyForRelease or LabWorkOrderStatus.OnHold);
        return new(work.Id, work.OpaqueSubmitterReference ?? "Laboratory job", work.Version, work.TubeUsePolicyKey,
            workflow?.Name, workflow?.WorkflowVersion, open && actor.HasAny(LabRole.Operator, LabRole.Supervisor),
            open && work.TubeUsePolicyKey is null && actor.HasAny(LabRole.Supervisor) && executions.All(e => !e.StartedAtUtc.HasValue), stages,
            specimens.Select(s =>
            {
                var history = attempts.Where(a => a.LabSpecimenId == s.Id).ToList();
                var inputs = tubes.Where(t => t.LabSpecimenId == s.Id).Select(t =>
                {
                    var used = history.LastOrDefault(a => a.SourceContainerId == t.Id && a.State != LabSpecimenAttemptState.Cancelled);
                    var reason = TubeUnavailableReason(s, t, used, runAllocations.GetValueOrDefault(s.SubmittedSpecimenId, 1) > approvedRuns.GetValueOrDefault(s.SubmittedSpecimenId));
                    return new LabAttemptTubeDto(t.Id, t.Barcode, t.Location, t.IntakeDisposition?.ToString(), t.Status.ToString(),
                        used is null ? reason is null ? "Reserve" : "Unavailable" : used.State is LabSpecimenAttemptState.Planned or LabSpecimenAttemptState.InProgress or LabSpecimenAttemptState.OnHold ? "Selected" : "Previously attempted", reason);
                }).ToList();
                var legacy = executions.Any(e => e.LabSpecimenId == s.Id && e.StartedAtUtc.HasValue && !e.LabSpecimenAttemptId.HasValue);
                return new LabAttemptSpecimenDto(s.Id, names.GetValueOrDefault(s.SubmittedSpecimenId, s.AccessionNumber ?? "Specimen"), s.AccessionNumber,
                    s.IntakeDisposition.ToString(), s.ProcessingState?.ToString() ?? (legacy ? "Historical work — source not recorded" : "Not started"),
                    s.ProcessingReasonCode, s.ProcessingNote, s.ProcessingNextAction,
                    Math.Max(inputs.Count, expected.GetValueOrDefault(s.SubmittedSpecimenId)), inputs.Count, inputs.Count(t => t.UnavailableReason is null), inputs,
                    history.Select(a => new LabAttemptDto(a.Id, a.LabSpecimenId, a.Sequence, a.PreviousAttemptId, a.SourceContainerId,
                        tubes.First(t => t.Id == a.SourceContainerId).Barcode, a.State.ToString(), a.Version, a.StartedAtUtc, a.ClosedAtUtc,
                        a.FailureReasonCode, a.FailureEvidence, a.FailedExecutionId, a.HoldReason, a.HoldNextAction, a.HoldOwnerUserId,
                        a.ReadStageSkips(), executions.Where(e => e.LabSpecimenAttemptId == a.Id).Select(e => e.Id).ToList(), prepMemberships.GetValueOrDefault(a.Id), a.LabServiceWorkflowVersionId, workflows.GetValueOrDefault(a.LabServiceWorkflowVersionId)?.Name, workflows.GetValueOrDefault(a.LabServiceWorkflowVersionId)?.WorkflowVersion)).ToList(),
                    legacy ? "Historical processing has no selected-source evidence. Supervisor review is required; do not infer a tube." : work.TubeUsePolicyKey is null ? "Confirm the order's tube-use instruction before selecting a source." : s.ProcessingState == LabSpecimenProcessingState.Failed ? "Material exhausted. Specimen processing failed." : null,
                    runAllocations.GetValueOrDefault(s.SubmittedSpecimenId, 1), approvedRuns.GetValueOrDefault(s.SubmittedSpecimenId));
            }).OrderBy(s => s.Name).ToList(), defaultWorkflowId);
    }

    [HttpPost("work-orders/{workOrderId:guid}/attempts")]
    public async Task<LabAttemptWorkspaceDto> ApplyAttemptCommand(Guid workOrderId, [FromBody] LabAttemptCommand request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken, LabRole.Operator, LabRole.Supervisor);
        if (request.RequestId == Guid.Empty) throw Invalid("attempt_request_required", "A request identifier is required.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"lab-tube-receipt:{workOrderId}", cancellationToken);
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new { workOrderId, request }, JsonOptions))));
        var receipt = await dbContext.LabAttemptCommandReceipts.AsNoTracking().SingleOrDefaultAsync(r => r.Id == request.RequestId, cancellationToken);
        if (receipt is not null)
        {
            if (receipt.LabWorkOrderId != workOrderId || receipt.ActorUserId != actor.User.Id || receipt.RequestHash != hash)
                throw Conflict("attempt_request_reused", "This request identifier was already used for a different command.");
            return await ReadAttempts(workOrderId, cancellationToken);
        }
        var work = await RequireOpenExecutionWorkAsync(workOrderId, cancellationToken);
        EnsureVersion(work.Version, request.WorkOrderVersion);
        if (request.Action == "adopt-policy")
        {
            if (!actor.HasAny(LabRole.Supervisor) || !request.ConfirmPolicy || string.IsNullOrWhiteSpace(request.Note))
                throw Invalid("policy_confirmation_required", "A supervisor must confirm the order instruction and record the reason for adopting it.");
            if (await dbContext.LabProtocolExecutions.AnyAsync(e => e.LabWorkOrderId == work.Id && e.StartedAtUtc.HasValue, cancellationToken))
                throw Conflict("legacy_work_review_required", "This job has processing history. Review its legacy records before any policy cutover.");
            Execute(() => work.SetTubeUsePolicy(LabTubeUsePolicy.RunOneWithFailureFallback, LabTubeUsePolicy.Version));
        }
        else
        {
            if (work.TubeUsePolicyKey != LabTubeUsePolicy.RunOneWithFailureFallback && work.TubeUsePolicyKey != LabTubeUsePolicy.RunAuthorizedWithFailureFallback)
                throw Conflict("tube_policy_required", "A supervisor must confirm this order's tube-use instruction first.");
            var specimen = await RequireSpecimenAsync(work.Id, request.SpecimenId ?? Guid.Empty, cancellationToken);
            if (specimen.ProcessingState == LabSpecimenProcessingState.Failed || specimen.ProcessingState == LabSpecimenProcessingState.Succeeded
                && (await ReadSequencingRunAllocationsAsync(work.Id, cancellationToken)).GetValueOrDefault(specimen.SubmittedSpecimenId, 1) == 1)
                throw Conflict("specimen_processing_final", "This specimen has a final processing outcome. A new source attempt is not permitted.");
            if (request.Action == "select") await SelectAttemptAsync(work, specimen, request, actor.User.Id, cancellationToken);
            else if (request.Action == "confirm-exhaustion")
                await ConfirmExhaustionAsync(work, specimen, request, actor.User.Id, cancellationToken);
            else
            {
                var attempt = await dbContext.LabSpecimenAttempts.SingleOrDefaultAsync(a => a.Id == request.AttemptId && a.LabSpecimenId == specimen.Id && a.LabWorkOrderId == work.Id, cancellationToken) ?? throw Missing();
                EnsureVersion(attempt.Version, request.AttemptVersion ?? -1);
                await RequireOutsidePreparationAsync(attempt.Id, cancellationToken);
                switch (request.Action)
                {
                    case "next-stage":
                        Execute(() => attempt.RequireOpen(false));
                        await AssignAttemptStageAsync(work, attempt, request.StageId, cancellationToken);
                        break;
                    case "skip-stage":
                        var next = await NextAttemptStageAsync(attempt, cancellationToken);
                        if (next is null || next.Id != request.StageId) throw Conflict("attempt_stage_not_next", "Review the next unresolved stage.");
                        var planned = await dbContext.LabProtocolExecutions.SingleOrDefaultAsync(e => e.LabSpecimenAttemptId == attempt.Id && e.LabServiceWorkflowStageId == next.Id, cancellationToken);
                        if (planned is not null && (planned.StartedAtUtc.HasValue || planned.Status != LabExecutionStatus.Planned))
                            throw Conflict("attempt_stage_started", "A started stage cannot be skipped.");
                        Execute(() => attempt.SkipStage(next, request.Note ?? "", actor.User.Id, DateTime.UtcNow));
                        if (planned is not null) Execute(() => planned.Abandon(request.Note));
                        break;
                    case "hold": Execute(() => attempt.Hold(request.Note ?? "", request.NextAction ?? "", actor.User.Id)); break;
                    case "resume":
                        await RequireAttemptSourceAsync(attempt, cancellationToken);
                        await RequireMaterialExceptionReviewAsync(attempt, actor.HasAny(LabRole.Supervisor), cancellationToken);
                        Execute(() => attempt.Resume(request.Note ?? "")); break;
                    case "cancel":
                        Execute(() => attempt.Cancel(request.Note ?? "", actor.User.Id, DateTime.UtcNow));
                        await CloseAttemptExecutionsAsync(attempt, request.Note ?? "", cancellationToken); break;
                    case "fail":
                        if (!await dbContext.LabProtocolExecutions.AnyAsync(e => e.Id == request.FailedExecutionId && e.LabSpecimenAttemptId == attempt.Id && e.StartedAtUtc.HasValue, cancellationToken))
                            throw Invalid("attempt_failure_execution_required", "Select a started execution from this attempt as the failure evidence.");
                        Execute(() => attempt.Fail(request.ReasonCode ?? "", request.Note ?? "", request.FailedExecutionId!.Value, actor.User.Id, DateTime.UtcNow));
                        await CloseAttemptExecutionsAsync(attempt, request.Note ?? "", cancellationToken); break;
                    default: throw Invalid("attempt_action_invalid", "Choose a supported attempt action.");
                }
                await RefreshAttemptOutcomeAsync(work, specimen, attempt, actor.User.Id, cancellationToken, request.NextAction);
                if (request.Action == "fail" && request.ConfirmMaterialExhausted)
                    await ConfirmExhaustionAsync(work, specimen, request, actor.User.Id, cancellationToken);
            }
        }
        dbContext.LabWorkEvents.Add(new LabWorkEvent(work.Id, request.SpecimenId, "SpecimenAttemptCommand", DateTime.UtcNow, actor.User.Id, JsonSerializer.Serialize(request, JsonOptions)));
        dbContext.LabAttemptCommandReceipts.Add(new(request.RequestId, work.Id, actor.User.Id, hash, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return await ReadAttempts(work.Id, cancellationToken);
    }

    private async Task SelectAttemptAsync(LabWorkOrder work, LabSpecimen specimen, LabAttemptCommand request, Guid actorId, CancellationToken ct, Guid? selectedWorkflowId = null)
    {
        var attempts = await dbContext.LabSpecimenAttempts.Where(a => a.LabSpecimenId == specimen.Id).OrderBy(a => a.Sequence).ToListAsync(ct);
        var authorizedRuns = (await ReadSequencingRunAllocationsAsync(work.Id, ct)).GetValueOrDefault(specimen.SubmittedSpecimenId, 1);
        if (attempts.Any(a => a.State is LabSpecimenAttemptState.Planned or LabSpecimenAttemptState.InProgress or LabSpecimenAttemptState.OnHold))
            throw Conflict("attempt_already_owned", "This specimen already has an active attempt.");
        if (authorizedRuns == 1 && attempts.Any(a => a.State == LabSpecimenAttemptState.Succeeded)
            || (await new LabSequencingRunProgress(dbContext).ApprovedCountsAsync(work.Id, ct)).GetValueOrDefault(specimen.SubmittedSpecimenId) >= authorizedRuns)
            throw Conflict("sequencing_runs_complete", "All authorized sample-sequencing runs are complete.");
        var tube = await dbContext.LabContainers.SingleOrDefaultAsync(t => t.Id == request.SourceContainerId && t.LabWorkOrderId == work.Id && t.LabSpecimenId == specimen.Id, ct) ?? throw Missing();
        var previousUse = attempts.LastOrDefault(a => a.SourceContainerId == tube.Id && a.State != LabSpecimenAttemptState.Cancelled);
        var unavailable = TubeUnavailableReason(specimen, tube, previousUse, authorizedRuns > 1);
        if (previousUse?.State == LabSpecimenAttemptState.Succeeded && (!request.ConfirmMaterialAvailable || string.IsNullOrWhiteSpace(request.Note)))
            throw Invalid("repeat_material_confirmation_required", "Confirm sufficient material remains in the selected source and record the evidence before another purchased run.");
        if (unavailable is not null) throw Conflict("attempt_source_unavailable", unavailable);
        if (!string.Equals(tube.Barcode, request.Barcode?.Trim(), StringComparison.Ordinal)) throw Invalid("attempt_barcode_mismatch", "Scan the source tube you selected.");
        var legacy = await dbContext.LabProtocolExecutions.Where(e => e.LabWorkOrderId == work.Id && e.LabSpecimenId == specimen.Id && e.LabSpecimenAttemptId == null && e.Status != LabExecutionStatus.Abandoned).ToListAsync(ct);
        if (legacy.Count > 1 || legacy.Any(e => e.Status != LabExecutionStatus.Planned || e.StartedAtUtc.HasValue))
            throw Conflict("legacy_attempt_review_required", "The existing processing records require supervisor review. No source has been inferred.");
        var legacyExecution = legacy.SingleOrDefault();
        var legacyWorkflowId = legacyExecution?.LabServiceWorkflowStageId is { } legacyStageId
            ? await dbContext.LabServiceWorkflowStages.Where(s => s.Id == legacyStageId).Select(s => (Guid?)s.LabServiceWorkflowVersionId).SingleAsync(ct)
            : null;
        var workflowId = selectedWorkflowId ?? request.WorkflowVersionId ?? legacyWorkflowId ?? await ReadDefaultExecutionWorkflowAsync(work, ct)
            ?? throw Conflict("production_workflow_required", "Promote a service workflow before selecting a source, or add this tube to an approved preparation batch.");
        await RequireExecutionWorkflowAsync(work, workflowId, ct, newSelection: legacyWorkflowId != workflowId);
        var first = await dbContext.LabServiceWorkflowStages.Where(s => s.LabServiceWorkflowVersionId == workflowId).OrderBy(s => s.Sequence).FirstOrDefaultAsync(ct)
            ?? throw Conflict("workflow_empty", "The workflow has no stages.");
        await RequireCurrentProtocolsAsync([first.LabProtocolVersionId], ct);
        RequireProtocolDefinition((await dbContext.LabProtocolVersions.SingleAsync(p => p.Id == first.LabProtocolVersionId, ct)).DefinitionJson);
        if (specimen.ProcessingState == LabSpecimenProcessingState.Succeeded)
            specimen.BeginAdditionalPreparation(actorId, DateTime.UtcNow);
        var attempt = new LabSpecimenAttempt(work.Id, specimen.Id, tube.Id, workflowId, (attempts.LastOrDefault()?.Sequence ?? 0) + 1, attempts.LastOrDefault()?.Id);
        dbContext.LabSpecimenAttempts.Add(attempt);
        var execution = legacy.SingleOrDefault();
        if (execution is not null && (execution.LabServiceWorkflowStageId != first.Id || execution.LabProtocolVersionId != first.LabProtocolVersionId))
            throw Conflict("legacy_stage_mismatch", "The existing Planned execution must match the workflow's first stage before adoption.");
        if (execution is null) { execution = new(work.Id, specimen.Id, first.LabProtocolVersionId, null, first.Id); dbContext.LabProtocolExecutions.Add(execution); }
        Execute(() => execution.AttachAttempt(attempt));
        specimen.RecordProcessingState(LabSpecimenProcessingState.Planned, actorId, DateTime.UtcNow);
        dbContext.Entry(tube).Property(t => t.UpdatedAt).IsModified = true;
    }

    private static string? TubeUnavailableReason(LabSpecimen specimen, LabContainer tube, LabSpecimenAttempt? used, bool allowSuccessfulReuse = false) =>
        tube.Kind != LabContainerKind.SubmittedSpecimen ? "Select a submitted specimen tube."
        : used is not null && !(allowSuccessfulReuse && used.State == LabSpecimenAttemptState.Succeeded) ? "This source is reserved or was already attempted."
        : specimen.IntakeDisposition == LabSpecimenIntakeDisposition.Cancelled || specimen.ReceivedAtUtc is null || specimen.AccessionNumber is null ? "Receipt and accession are required."
        : tube.IntakeDisposition != LabSpecimenIntakeDisposition.Accepted ? $"Tube intake is {tube.IntakeDisposition?.ToString() ?? "not reviewed"}."
        : tube.Status != LabContainerStatus.Available ? $"Tube is {tube.Status}." : null;

    private async Task<LabServiceWorkflowStage?> NextAttemptStageAsync(LabSpecimenAttempt attempt, CancellationToken ct)
    {
        var done = await dbContext.LabProtocolExecutions.Where(e => e.LabSpecimenAttemptId == attempt.Id && e.Status == LabExecutionStatus.Completed)
            .Select(e => e.LabServiceWorkflowStageId!.Value).ToListAsync(ct);
        done.AddRange(dbContext.LabProtocolExecutions.Local.Where(e => e.LabSpecimenAttemptId == attempt.Id && e.Status == LabExecutionStatus.Completed).Select(e => e.LabServiceWorkflowStageId!.Value));
        done.AddRange(attempt.ReadStageSkips().Select(s => s.StageId));
        return await dbContext.LabServiceWorkflowStages.Where(s => s.LabServiceWorkflowVersionId == attempt.LabServiceWorkflowVersionId && !done.Contains(s.Id)).OrderBy(s => s.Sequence).FirstOrDefaultAsync(ct);
    }

    private async Task AssignAttemptStageAsync(LabWorkOrder work, LabSpecimenAttempt attempt, Guid? stageId, CancellationToken ct)
    {
        var next = await NextAttemptStageAsync(attempt, ct);
        if (next is null || next.Id != stageId) throw Conflict("attempt_stage_not_next", "Complete or explicitly skip the preceding stages in this attempt first.");
        if (await dbContext.LabProtocolExecutions.AnyAsync(e => e.LabSpecimenAttemptId == attempt.Id && e.LabServiceWorkflowStageId == next.Id, ct))
            throw Conflict("attempt_stage_exists", "This stage already has an execution. Open the existing execution.");
        await RequireExecutionWorkflowAsync(work, attempt.LabServiceWorkflowVersionId, ct); await RequireCurrentProtocolsAsync([next.LabProtocolVersionId], ct);
        RequireProtocolDefinition((await dbContext.LabProtocolVersions.SingleAsync(p => p.Id == next.LabProtocolVersionId, ct)).DefinitionJson);
        var execution = new LabProtocolExecution(work.Id, attempt.LabSpecimenId, next.LabProtocolVersionId, null, next.Id);
        execution.AttachAttempt(attempt); dbContext.LabProtocolExecutions.Add(execution);
    }

    private async Task CloseAttemptExecutionsAsync(LabSpecimenAttempt attempt, string reason, CancellationToken ct)
    {
        var executions = await dbContext.LabProtocolExecutions.Where(e => e.LabSpecimenAttemptId == attempt.Id).ToListAsync(ct);
        foreach (var execution in executions.Where(e => e.Status is not (LabExecutionStatus.Completed or LabExecutionStatus.Abandoned))) execution.Abandon(reason);
    }

    private async Task RefreshAttemptOutcomeAsync(LabWorkOrder work, LabSpecimen specimen, LabSpecimenAttempt attempt, Guid actorId, CancellationToken ct, string? nextAction = null)
    {
        if (attempt.State is not (LabSpecimenAttemptState.Failed or LabSpecimenAttemptState.Cancelled) && attempt.HoldReason is null)
        {
            var executions = await dbContext.LabProtocolExecutions.Where(e => e.LabSpecimenAttemptId == attempt.Id).ToListAsync(ct);
            var done = await NextAttemptStageAsync(attempt, ct) is null;
            Execute(() => attempt.Refresh(executions.Any(e => e.Status == LabExecutionStatus.Blocked), done, actorId, DateTime.UtcNow));
        }
        var state = attempt.State switch { LabSpecimenAttemptState.Planned => LabSpecimenProcessingState.Planned, LabSpecimenAttemptState.InProgress => LabSpecimenProcessingState.InProgress,
            LabSpecimenAttemptState.OnHold => LabSpecimenProcessingState.OnHold, LabSpecimenAttemptState.Succeeded => LabSpecimenProcessingState.Succeeded, _ => LabSpecimenProcessingState.Ready };
        if (state == LabSpecimenProcessingState.OnHold)
            specimen.RecordProcessingState(state, actorId, DateTime.UtcNow, "attempt_on_hold", attempt.HoldReason ?? "Resolve the recorded protocol QC hold.", attempt.HoldNextAction ?? "Review QC evidence; repeat the permitted step or explicitly fail the attempt.");
        else specimen.RecordProcessingState(state, actorId, DateTime.UtcNow);
        if (attempt.State == LabSpecimenAttemptState.Failed)
        {
            var unused = await UnusedAttemptTubesAsync(specimen, attempt.SourceContainerId, ct);
            if (!unused.Any(t => TubeUnavailableReason(specimen, t, null) is null))
            {
                var action = string.IsNullOrWhiteSpace(nextAction) ? "Review remaining material and expected receipts; confirm exhaustion or resolve the blocking tube review." : nextAction;
                specimen.RecordProcessingState(LabSpecimenProcessingState.OnHold, actorId, DateTime.UtcNow, "material_resolution_pending", "The attempt failed and no eligible reserve is currently available.", action);
                if (!await dbContext.LabExceptions.AnyAsync(e => e.LabSpecimenId == specimen.Id && e.CategoryCode == "material_resolution_pending" && e.Status == LabExceptionStatus.Open, ct))
                    dbContext.LabExceptions.Add(new LabException(work.Id, specimen.Id, attempt.FailedExecutionId, LabExceptionAudience.Internal, "material_resolution_pending", "Resolve specimen material availability", action, null, false, null));
            }
        }
    }

    private async Task<List<LabContainer>> UnusedAttemptTubesAsync(LabSpecimen specimen, Guid? excluding, CancellationToken ct)
    {
        var runCount = (await ReadSequencingRunAllocationsAsync(specimen.LabWorkOrderId, ct)).GetValueOrDefault(specimen.SubmittedSpecimenId, 1);
        var used = await dbContext.LabSpecimenAttempts.Where(a => a.LabSpecimenId == specimen.Id && a.State != LabSpecimenAttemptState.Cancelled
            && (runCount == 1 || a.State != LabSpecimenAttemptState.Succeeded)).Select(a => a.SourceContainerId).ToListAsync(ct);
        if (excluding.HasValue) used.Add(excluding.Value);
        return await dbContext.LabContainers.Where(t => t.LabSpecimenId == specimen.Id && t.LabWorkOrderId == specimen.LabWorkOrderId && t.Kind == LabContainerKind.SubmittedSpecimen && !used.Contains(t.Id)).ToListAsync(ct);
    }

    private async Task ConfirmExhaustionAsync(LabWorkOrder work, LabSpecimen specimen, LabAttemptCommand request, Guid actorId, CancellationToken ct)
    {
        var history = await dbContext.LabSpecimenAttempts.Where(a => a.LabSpecimenId == specimen.Id).ToListAsync(ct);
        if (!request.ConfirmMaterialExhausted || string.IsNullOrWhiteSpace(request.Note) || !history.Any(a => a.State == LabSpecimenAttemptState.Failed)
            || history.Any(a => a.State is LabSpecimenAttemptState.Planned or LabSpecimenAttemptState.InProgress or LabSpecimenAttemptState.OnHold))
            throw Invalid("material_exhaustion_confirmation_required", "After terminal attempt failure, confirm that no material remains for further permitted analysis and record the evidence.");
        var unused = await UnusedAttemptTubesAsync(specimen, null, ct);
        if (unused.Any(t => t.Status == LabContainerStatus.Available && t.IntakeDisposition != LabSpecimenIntakeDisposition.Rejected))
            throw Conflict("material_resolution_required", "There are remaining available or unresolved tubes. Review them before confirming material exhaustion.");
        var shipments = await dbContext.SampleShipments.AsNoTracking().Include(s => s.Items).ThenInclude(i => i.TubeSlots)
            .Where(s => s.LabWorkOrderId == work.Id && s.Status != SampleShipmentStatus.Cancelled).ToListAsync(ct);
        var expected = shipments.SelectMany(s => s.Items).Where(i => i.SubmittedSpecimenId == specimen.SubmittedSpecimenId).Sum(SampleShippingPackingData.TubeCount);
        var received = await dbContext.LabContainers.CountAsync(t => t.LabSpecimenId == specimen.Id && t.Kind == LabContainerKind.SubmittedSpecimen, ct);
        if (expected > received) throw Conflict("material_receipt_pending", "Declared tubes are still awaiting receipt or accession. Resolve those records before confirming exhaustion.");
        specimen.RecordProcessingState(LabSpecimenProcessingState.Failed, actorId, DateTime.UtcNow, "material_exhausted", request.Note);
        work.AdvanceProjectionVersion();
        await EmitProjectionAsync(work, actorId, "SpecimenProcessingFailed", ct);
    }
}
