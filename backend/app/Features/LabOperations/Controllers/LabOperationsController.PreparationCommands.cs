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
        => await ApplyPreparationCore(preparationBatchId, request, ct);

    private async Task<object> ApplyPreparationCore(Guid preparationBatchId, LabPreparationCommand request, CancellationToken ct,
        string? reportFingerprint = null, Func<CancellationToken, Task<PreparationQcReport>>? uploadReport = null)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, Enum.GetValues<LabRole>());
        if (request.Action != "step" && !actor.HasAny(LabRole.Operator, LabRole.Supervisor)) throw Conflict("preparation_role_required", "An Operator or Supervisor must perform this action.");
        if (request.RequestId == Guid.Empty) throw Invalid("preparation_request_required", "A request identifier is required.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"lab-preparation:{preparationBatchId}", ct);
        var hash = reportFingerprint is null ? PreparationHash(new { preparationBatchId, request })
            : PreparationHash(new { preparationBatchId, request, reportFingerprint });
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
        LabContainer? candidate = null;
        if (request.Action == "add")
        {
            var matches = await dbContext.LabContainers.AsNoTracking()
                .Where(t => t.Barcode == request.Barcode && (!request.ContainerId.HasValue || t.Id == request.ContainerId.Value))
                .Take(2).ToListAsync(ct);
            if (matches.Count > 1) throw Conflict("barcode_ambiguous", "This printed barcode identifies tubes from more than one manufacturer. Select the intended tube from its job before adding it to the tray.");
            candidate = matches.SingleOrDefault() ?? throw Missing();
        }
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
            if (work.TubeUsePolicyKey != LabTubeUsePolicy.RunOneWithFailureFallback && work.TubeUsePolicyKey != LabTubeUsePolicy.RunAuthorizedWithFailureFallback)
                throw Conflict("preparation_workflow_mismatch", "Every job must have an authorized run and failure-recovery instruction.");
            jobs.Add(work.Id, work);
        }
        string? reportProperty = null;
        IReadOnlyList<PreparationOutputResult>? outputResults = null;
        var now = LabEvidenceTime.UtcNow;
        var trayConfirmed = PreparationTrayConfirmed(await dbContext.LabPreparationRecords.AsNoTracking()
            .Where(r => r.LabPreparationBatchId == batch.Id && (r.Action == "confirm-tray" || r.Action == "reopen-tray")).ToListAsync(ct));
        if (trayConfirmed && request.Action is "assign-tray" or "add" or "move" or "remove")
            throw Conflict("preparation_tray_confirmed", "The assembled tray is confirmed and locked. Choose Edit tray before changing its contents.");
        try
        {
            if (request.Action == "allocate-library-tube")
            {
                await AllocatePreparationLibraryTubeAsync(batch, Member(), Attempt(Member()), request, ct);
            }
            else if (request.Action == "confirm-tray")
            {
                batch.RequireDraft();
                batch.RequireTray();
                if (trayConfirmed) throw new InvalidOperationException("The tray is already confirmed. Start preparation when ready.");
                if (!request.Confirmed || members.Count == 0) throw new ArgumentException("Review and confirm the assembled tray with at least one scanned tube.");
            }
            else if (request.Action == "reopen-tray")
            {
                batch.RequireDraft();
                if (!trayConfirmed) throw new InvalidOperationException("The tray is already open for editing.");
                if (string.IsNullOrWhiteSpace(request.Reason)) throw new ArgumentException("Record why the confirmed tray needs editing.");
            }
            else if (request.Action == "assign-tray")
            {
                var barcode = request.Barcode?.Trim().ToUpperInvariant() ?? "";
                batch.AssignTray(barcode, members.Count > 0);
                await SampleShippingPackingData.LockAsync(dbContext, $"lab-physical-tray:{barcode}", ct);
                await SampleShippingPackingData.LockAsync(dbContext, $"supplier-tube:{barcode.ToUpperInvariant()}", ct);
                if (await dbContext.LabPreparationBatches.AnyAsync(b => b.Id != batch.Id && b.TrayBarcode != null && b.TrayBarcode.ToUpper() == barcode
                    && (b.Status == LabBatchStatus.Draft || b.Status == LabBatchStatus.InProgress), ct))
                    throw Conflict("preparation_tray_in_use", "This physical tray is already assigned to another active batch. Complete or cancel that batch before reusing the tray.");
                if (await dbContext.LabPreparationBatches.AnyAsync(b => b.Name.ToUpper() == barcode, ct)
                    || await dbContext.LabContainers.AnyAsync(t => t.Barcode == barcode.ToUpperInvariant(), ct)
                    || await dbContext.RegisteredSampleTubes.AnyAsync(t => t.SupplierBarcode == barcode.ToUpperInvariant(), ct)
                    || await dbContext.SampleShippingStockTubes.AnyAsync(t => t.SupplierBarcode == barcode.ToUpperInvariant(), ct))
                    throw Conflict("preparation_tray_identity", "Scan the physical tray label, not a batch or tube barcode.");
            }
            else if (request.Action == "add")
            {
                batch.RequireTray();
                batch.CheckPosition(request.Position ?? "", members);
                await RequirePreparationWorkflowAsync(batch.LabServiceWorkflowVersionId, ct);
                var work = jobs[candidate!.LabWorkOrderId];
                await RequireExecutionWorkflowAsync(work, batch.LabServiceWorkflowVersionId, ct);
                var specimen = await RequireSpecimenAsync(work.Id, candidate.LabSpecimenId ?? Guid.Empty, ct);
                if (specimen.ProcessingState == LabSpecimenProcessingState.Failed || specimen.ProcessingState == LabSpecimenProcessingState.Succeeded
                    && (await ReadSequencingRunAllocationsAsync(work.Id, ct)).GetValueOrDefault(specimen.SubmittedSpecimenId, 1) == 1)
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
                    await SelectAttemptAsync(work, specimen, new(Guid.NewGuid(), work.Version, "select", specimen.Id, SourceContainerId: candidate.Id, Barcode: request.Barcode), actor.User.Id, ct, batch.LabServiceWorkflowVersionId);
                    attempt = dbContext.LabSpecimenAttempts.Local.Single(a => a.LabSpecimenId == specimen.Id && a.State == LabSpecimenAttemptState.Planned);
                }
                dbContext.LabPreparationMembers.Add(new(batch.Id, attempt.Id, request.Position!, candidate.Barcode));
            }
            else if (request.Action is "move" or "remove" or "cancel")
            {
                batch.RequireDraft();
                if (request.Action == "move")
                {
                    var member = Member(); member.Move(batch, request.Position ?? "", members);
                    if (member.LibraryTubeContainerId.HasValue)
                    {
                        var tube = await dbContext.LabContainers.SingleAsync(c => c.Id == member.LibraryTubeContainerId, ct);
                        tube.Move($"Tray {batch.TrayBarcode} · {member.Position}");
                    }
                }
                else
                {
                    if (string.IsNullOrWhiteSpace(request.Reason)) throw new ArgumentException("Record why the tube or draft batch is being removed.");
                    foreach (var member in request.Action == "cancel" ? members : new List<LabPreparationMember> { Member() })
                    {
                        if (member.MaterialTransferId.HasValue) throw new InvalidOperationException("A physical transfer has already occurred. Retain this preparation and its material history; cancellation cannot return material to its source.");
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
                batch.RequireDraft();
                if (!trayConfirmed) throw Conflict("preparation_tray_confirmation_required", "Confirm the assembled tray before starting preparation.");
                var stages = await RequirePreparationWorkflowAsync(batch.LabServiceWorkflowVersionId, ct);
                foreach (var member in members)
                {
                    var attempt = Attempt(member);
                    await RequireExecutionWorkflowAsync(jobs[attempt.LabWorkOrderId], attempt.LabServiceWorkflowVersionId, ct);
                    if (attempt.LabServiceWorkflowVersionId != batch.LabServiceWorkflowVersionId)
                        throw Conflict("preparation_workflow_mismatch", "Every attempt must use this batch’s workflow version.");
                    var source = await RequireAttemptSourceAsync(attempt, ct, allowTransferredMaterial: true);
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
                    case "evaluate-conditions": break; // Reconciliation below rechecks saved evidence under the batch lock.
                    case "step":
                        reportProperty = await RecordPreparationStepAsync(batch, members, attempts, request, actor, ct, uploadReport is not null, now); break;
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
                    case "resume":
                        if (!actor.HasAny(LabRole.Supervisor)) throw new InvalidOperationException("A Supervisor must review and resolve the tube hold.");
                        var resumed = Attempt(Member());
                        await RequireAttemptSourceAsync(resumed, ct, allowTransferredMaterial: true);
                        await RequireMaterialExceptionReviewAsync(resumed, actor.HasAny(LabRole.Supervisor), ct);
                        resumed.Resume(request.Reason ?? "");
                        await RefreshAttemptOutcomeAsync(jobs[resumed.LabWorkOrderId], await RequireSpecimenAsync(resumed.LabWorkOrderId, resumed.LabSpecimenId, ct), resumed, actor.User.Id, ct);
                        break;
                    case "output": await PreparationOutputAsync(Member(), Attempt(Member()), request, actor.User.Id, ct); break;
                    case "outputs": outputResults = await PreparationOutputsAsync(members, attempts, request, actor.User.Id, ct); break;
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
        try
        {
            if (request.Action is "step" or "fail" or "evaluate-conditions")
                await ApplyAutomaticPreparationSkipAsync(batch, members, attempts, request, actor, ct);
        }
        catch (ArgumentException e) { throw Invalid("preparation_details_invalid", e.Message); }
        catch (InvalidOperationException e) { throw Conflict("preparation_blocked", e.Message); }
        var report = uploadReport is null ? null : await uploadReport(ct);
        if (report is not null) await SampleShippingPackingData.LockAsync(dbContext, "investigation-file:" + report.StorageKey, ct);
        var details = JsonSerializer.SerializeToNode(request, JsonOptions)!.AsObject();
        if (outputResults is not null) details["outputResults"] = JsonSerializer.SerializeToNode(outputResults, JsonOptions);
        if (report is not null) details[reportProperty ?? throw new InvalidOperationException("Report step was not validated.")] = JsonSerializer.SerializeToNode(report, JsonOptions);
        dbContext.LabPreparationRecords.Add(new(request.RequestId, batch.Id, actor.User.Id, request.Action, hash, details.ToJsonString(), now));
        foreach (var workId in workIds) dbContext.LabWorkEvents.Add(new(workId, null, "PreparationBatchCommand", now, actor.User.Id,
            JsonSerializer.Serialize(new { preparationBatchId, request.RequestId, request.Action }, JsonOptions)));
        // Do not delete bytes after an uncertain commit: they may already be referenced.
        // Unreferenced private objects are retained for storage reconciliation.
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
