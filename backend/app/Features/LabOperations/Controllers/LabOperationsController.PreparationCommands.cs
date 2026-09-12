namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.Trials.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabOperationsController
{
    [HttpPost("preparation/batches/{preparationBatchId:guid}/commands")]
    public async Task<object> ApplyPreparation(Guid preparationBatchId, [FromBody] LabPreparationCommand request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, Enum.GetValues<LabRole>());
        if (request.Action != "step" && !actor.HasAny(LabRole.Operator, LabRole.Supervisor)) throw Conflict("preparation_role_required", "An Operator or Supervisor must perform this action.");
        if (request.RequestId == Guid.Empty) throw Invalid("preparation_request_required", "A request identifier is required.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"lab-preparation:{preparationBatchId}", ct);
        var hash = PreparationHash(new { preparationBatchId, request });
        var receipt = await dbContext.LabPreparationRecords.AsNoTracking().SingleOrDefaultAsync(r => r.Id == request.RequestId, ct);
        if (receipt is not null)
        {
            if (receipt.RequestHash != hash || receipt.ActorUserId != actor.User.Id) throw Conflict("preparation_request_reused", "This request was used for a different action.");
            return await ReadPreparation(preparationBatchId, ct);
        }
        var batch = await dbContext.LabPreparationBatches.SingleOrDefaultAsync(b => b.Id == preparationBatchId, ct) ?? throw Missing();
        EnsureVersion(batch.Version, request.Version);
        dbContext.Entry(batch).Property(b => b.UpdatedAt).IsModified = true;
        var members = await dbContext.LabPreparationMembers.Where(m => m.LabPreparationBatchId == batch.Id && !m.Removed).ToListAsync(ct);
        var attemptIds = members.Select(m => m.LabSpecimenAttemptId).ToList();
        var attempts = await dbContext.LabSpecimenAttempts.Where(a => attemptIds.Contains(a.Id)).ToListAsync(ct);
        LabContainer? candidate = request.Action == "add" ? await dbContext.LabContainers.AsNoTracking().SingleOrDefaultAsync(t => t.Barcode == request.Barcode, ct) ?? throw Missing() : null;
        var workIds = attempts.Select(a => a.LabWorkOrderId).Concat(candidate is null ? [] : new[] { candidate.LabWorkOrderId }).Distinct().Order().ToList();
        await LockPreparationTrialsAsync(workIds, ct);
        foreach (var workId in workIds) await SampleShippingPackingData.LockAsync(dbContext, $"lab-tube-receipt:{workId}", ct);
        foreach (var attempt in attempts)
        {
            await dbContext.Entry(attempt).ReloadAsync(ct);
            dbContext.Entry(attempt).Property(a => a.UpdatedAt).IsModified = true;
        }
        var jobs = new Dictionary<Guid, LabWorkOrder>();
        foreach (var workId in workIds)
        {
            var work = await RequireOpenExecutionWorkAsync(workId, ct);
            if (work.TubeUsePolicyKey != LabTubeUsePolicy.RunOneWithFailureFallback || work.LabServiceWorkflowVersionId != batch.LabServiceWorkflowVersionId)
                throw Conflict("preparation_workflow_mismatch", "Every job must already have the same pinned workflow and the run-one-with-failure-fallback instruction.");
            jobs.Add(work.Id, work);
        }
        var now = DateTime.UtcNow;
        try
        {
            if (request.Action == "add")
            {
                batch.CheckPosition(request.Position ?? "", members);
                await RequirePreparationWorkflowAsync(batch.LabServiceWorkflowVersionId, ct);
                var work = jobs[candidate!.LabWorkOrderId];
                var specimen = await RequireSpecimenAsync(work.Id, candidate.LabSpecimenId ?? Guid.Empty, ct);
                if (specimen.ProcessingState is LabSpecimenProcessingState.Succeeded or LabSpecimenProcessingState.Failed)
                    throw Conflict("specimen_processing_final", "This specimen already has a final processing outcome.");
                var attempt = await dbContext.LabSpecimenAttempts.SingleOrDefaultAsync(a => a.LabSpecimenId == specimen.Id && a.State == LabSpecimenAttemptState.Planned, ct);
                if (attempt is not null)
                {
                    if (attempt.SourceContainerId != candidate.Id || attempt.LabServiceWorkflowVersionId != batch.LabServiceWorkflowVersionId
                        || await dbContext.LabPreparationMembers.AnyAsync(m => m.LabSpecimenAttemptId == attempt.Id && !m.Removed, ct))
                        throw Conflict("source_reserved", "This specimen is already reserved. Open its selected source or preparation batch.");
                    if (await dbContext.LabProtocolExecutions.AnyAsync(e => e.LabSpecimenAttemptId == attempt.Id && (e.StartedAtUtc != null || e.Status != LabExecutionStatus.Planned), ct))
                        throw Conflict("source_started", "Only compatible unstarted work can join a preparation batch.");
                    await RequireAttemptSourceAsync(attempt, ct);
                    dbContext.Entry(attempt).Property(a => a.UpdatedAt).IsModified = true;
                }
                else
                {
                    await SelectAttemptAsync(work, specimen, new(Guid.NewGuid(), work.Version, "select", specimen.Id, SourceContainerId: candidate.Id, Barcode: request.Barcode), actor.User.Id, ct);
                    attempt = dbContext.LabSpecimenAttempts.Local.Single(a => a.LabSpecimenId == specimen.Id && a.State == LabSpecimenAttemptState.Planned);
                }
                dbContext.LabPreparationMembers.Add(new(batch.Id, attempt.Id, request.Position!, candidate.Barcode));
            }
            else if (request.Action is "move" or "remove" or "cancel")
            {
                batch.RequireDraft();
                if (request.Action == "move") Member().Move(batch, request.Position ?? "", members);
                else
                {
                    if (string.IsNullOrWhiteSpace(request.Reason)) throw new ArgumentException("Record why the tube or draft batch is being removed.");
                    foreach (var member in request.Action == "cancel" ? members : new List<LabPreparationMember> { Member() })
                    {
                        var attempt = Attempt(member); attempt.Cancel(request.Reason, actor.User.Id, now);
                        await CloseAttemptExecutionsAsync(attempt, request.Reason, ct);
                        member.Remove(batch);
                        await RefreshAttemptOutcomeAsync(jobs[attempt.LabWorkOrderId], await RequireSpecimenAsync(attempt.LabWorkOrderId, attempt.LabSpecimenId, ct), attempt, actor.User.Id, ct);
                    }
                    if (request.Action == "cancel") batch.Cancel();
                }
            }
            else if (request.Action == "start")
            {
                var stages = await RequirePreparationWorkflowAsync(batch.LabServiceWorkflowVersionId, ct);
                foreach (var member in members)
                {
                    var attempt = Attempt(member); var source = await RequireAttemptSourceAsync(attempt, ct);
                    if (attempt.State != LabSpecimenAttemptState.Planned || (await NextAttemptStageAsync(attempt, ct))?.Id != stages[0].Id)
                        throw Conflict("preparation_attempt_started", "Every tube must enter at the workflow's first stage with unstarted work.");
                    attempt.Start(source.Barcode, member.ConfirmedBarcode, now);
                    var execution = await dbContext.LabProtocolExecutions.SingleAsync(e => e.LabSpecimenAttemptId == attempt.Id && e.LabServiceWorkflowStageId == stages[0].Id, ct);
                    execution.Start(now);
                    var work = jobs[attempt.LabWorkOrderId];
                    if (work.Status is LabWorkOrderStatus.AwaitingSpecimens or LabWorkOrderStatus.Received)
                    { work.RecordMilestone(LabWorkOrderStatus.Processing); await EmitProjectionAsync(work, actor.User.Id, "PreparationStarted", ct); }
                    await RefreshAttemptOutcomeAsync(work, await RequireSpecimenAsync(work.Id, attempt.LabSpecimenId, ct), attempt, actor.User.Id, ct);
                }
                batch.Start(members, request.Confirmed, now);
            }
            else
            {
                batch.RequireActive();
                switch (request.Action)
                {
                    case "step":
                        await RecordPreparationStepAsync(batch, members, attempts, request, actor, ct); break;
                    case "advance":
                        await AdvancePreparationAsync(batch, members, attempts, request, actor, ct); break;
                    case "skip-stage":
                        await SkipPreparationStageAsync(batch, members, attempts, request, actor, ct); break;
                    case "fail":
                        var failed = Attempt(Member());
                        var failedExecution = await dbContext.LabProtocolExecutions.Where(e => e.LabSpecimenAttemptId == failed.Id && e.StartedAtUtc != null && e.Status != LabExecutionStatus.Completed && e.Status != LabExecutionStatus.Abandoned).SingleOrDefaultAsync(ct)
                            ?? throw Conflict("preparation_failure_execution_required", "A started unresolved execution is required for failure evidence.");
                        failed.Fail(request.ReasonCode ?? "", request.Reason ?? "", failedExecution.Id, actor.User.Id, now);
                        await CloseAttemptExecutionsAsync(failed, request.Reason!, ct);
                        await RefreshAttemptOutcomeAsync(jobs[failed.LabWorkOrderId], await RequireSpecimenAsync(failed.LabWorkOrderId, failed.LabSpecimenId, ct), failed, actor.User.Id, ct);
                        break;
                    case "output": await PreparationOutputAsync(Member(), Attempt(Member()), request, ct); break;
                    case "confirm-output":
                        Attempt(Member()).RequireOpen(false);
                        var outputId = Member().OutputContainerId;
                        var output = await dbContext.LabContainers.SingleAsync(c => c.Id == outputId, ct);
                        Member().ConfirmOutput(output.Barcode, request.Barcode ?? ""); break;
                    case "material": case "equipment": await PreparationResourceAsync(members, attempts, request, actor.User.Id, ct); break;
                    case "complete":
                        if (!request.Confirmed) throw new ArgumentException("Confirm the outcome of every tube before closing this batch.");
                        batch.Complete(members.All(m => Attempt(m).State == LabSpecimenAttemptState.Failed || Attempt(m).State == LabSpecimenAttemptState.Succeeded && m.LabLibraryId.HasValue), now);
                        break;
                    default: throw new ArgumentException("Choose a supported preparation action.");
                }
            }
        }
        catch (ArgumentException e) { throw Invalid("preparation_details_invalid", e.Message); }
        catch (InvalidOperationException e) { throw Conflict("preparation_blocked", e.Message); }
        dbContext.LabPreparationRecords.Add(new(request.RequestId, batch.Id, actor.User.Id, request.Action, hash, JsonSerializer.Serialize(request, JsonOptions), now));
        foreach (var workId in workIds) dbContext.LabWorkEvents.Add(new(workId, null, "PreparationBatchCommand", now, actor.User.Id,
            JsonSerializer.Serialize(new { preparationBatchId, request.RequestId, request.Action }, JsonOptions)));
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await ReadPreparation(batch.Id, ct);

        LabPreparationMember Member() => members.SingleOrDefault(m => m.Id == request.MemberId) ?? throw Missing();
        LabSpecimenAttempt Attempt(LabPreparationMember member) => attempts.Single(a => a.Id == member.LabSpecimenAttemptId);
    }

    private async Task LockPreparationTrialsAsync(IReadOnlyList<Guid> workIds, CancellationToken ct)
    {
        var trialIds = await dbContext.LabWorkOrders.AsNoTracking().Where(w => workIds.Contains(w.Id) && w.AuthorizationSource == LabAuthorizationSource.TrialProject)
            .Select(w => w.AuthorizationSourceId).Distinct().Order().ToListAsync(ct);
        foreach (var id in trialIds)
        {
            if (dbContext.Database.IsNpgsql())
            {
                var entity = dbContext.Model.FindEntityType(typeof(TrialProject))!;
                var table = $"\"{entity.GetSchema()!.Replace("\"", "\"\"")}\".\"{entity.GetTableName()!.Replace("\"", "\"\"")}\"";
#pragma warning disable EF1002
                await dbContext.Database.ExecuteSqlRawAsync($"SELECT id FROM {table} WHERE id = {{0}} FOR SHARE", [id], ct);
#pragma warning restore EF1002
            }
            var trial = await dbContext.TrialProjects.AsNoTracking().SingleAsync(t => t.Id == id, ct);
            if (trial.IsOnHold || trial.IsTerminal || trial.ApprovedScopeRevision != trial.CurrentScopeRevision || trial.AcceptedScopeRevision != trial.ApprovedScopeRevision)
                throw Conflict("trial_work_unavailable", "Every Trial job requires current approval and acceptance without a hold or terminal closure.");
        }
    }
}
