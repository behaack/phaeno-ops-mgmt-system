namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;

public sealed partial class LabOperationsController
{
    private async Task RecordPreparationStepAsync(LabPreparationBatch batch, List<LabPreparationMember> members, List<LabSpecimenAttempt> attempts,
        LabPreparationCommand request, LabOperationsActor actor, CancellationToken ct)
    {
        var input = request.Step ?? throw new ArgumentException("Enter the preparation step evidence.");
        if (input.CoveredMemberIds.Count == 0 || input.CoveredMemberIds.Any(id => members.All(m => m.Id != id))) throw new ArgumentException("Select tubes in this batch.");
        var stage = await dbContext.LabServiceWorkflowStages.SingleOrDefaultAsync(s => s.Id == input.StageId && s.LabServiceWorkflowVersionId == batch.LabServiceWorkflowVersionId, ct) ?? throw Missing();
        var protocol = await dbContext.LabProtocolVersions.SingleAsync(p => p.Id == stage.LabProtocolVersionId, ct);
        var definition = RequireProtocolDefinition(protocol.DefinitionJson);
        var step = definition.Steps.SingleOrDefault(s => s.Key == input.StepKey) ?? throw Missing();
        foreach (var member in members.Where(m => input.CoveredMemberIds.Contains(m.Id)))
        {
            var attempt = attempts.Single(a => a.Id == member.LabSpecimenAttemptId); attempt.RequireOpen();
            var execution = await dbContext.LabProtocolExecutions.SingleOrDefaultAsync(e => e.LabSpecimenAttemptId == attempt.Id && e.LabServiceWorkflowStageId == stage.Id, ct)
                ?? throw Conflict("preparation_stage_not_started", "Complete the preceding stage before recording this stage.");
            var effective = LabPreparationEvidence.Resolve(step, input, member.Id, request.RequestId);
            foreach (var capture in step.Captures.Where(c => c.Type == "barcode"))
            {
                if (!effective.Captures.TryGetValue(capture.Key, out var value) || value.ValueKind != JsonValueKind.String) continue;
                var barcode = value.GetString()?.Trim();
                if (capture.SourceTube && barcode != member.ConfirmedBarcode) throw new ArgumentException($"{member.Position}: scan the selected source {member.ConfirmedBarcode}.");
                var container = await dbContext.LabContainers.AsNoTracking().SingleOrDefaultAsync(t => t.Barcode == barcode, ct);
                if (container is not null) await RequireAttemptLineageAsync(container.Id, attempt, ct);
            }
            execution.RecordStep(protocol, effective, actor.User.Id, EffectiveExecutionRoles(actor), DateTime.UtcNow);
            await RefreshAttemptOutcomeAsync(await RequireWorkOrderAsync(attempt.LabWorkOrderId, ct), await RequireSpecimenAsync(attempt.LabWorkOrderId, attempt.LabSpecimenId, ct), attempt, actor.User.Id, ct);
        }
    }

    private async Task AdvancePreparationAsync(LabPreparationBatch batch, List<LabPreparationMember> members, List<LabSpecimenAttempt> attempts,
        LabPreparationCommand request, LabOperationsActor actor, CancellationToken ct)
    {
        var stages = await dbContext.LabServiceWorkflowStages.Where(s => s.LabServiceWorkflowVersionId == batch.LabServiceWorkflowVersionId).OrderBy(s => s.Sequence).ToListAsync(ct);
        var stage = stages.SingleOrDefault(s => s.Id == request.StageId) ?? throw Missing();
        var protocol = await dbContext.LabProtocolVersions.SingleAsync(p => p.Id == stage.LabProtocolVersionId, ct);
        var next = stages.FirstOrDefault(s => s.Sequence > stage.Sequence);
        var participating = attempts.Where(a => a.State != LabSpecimenAttemptState.Failed).ToList();
        if (participating.Count == 0) throw new ArgumentException("Every tube failed. Close the batch to retain its outcomes.");
        foreach (var attempt in participating)
        {
            attempt.RequireOpen(false);
            if ((await NextAttemptStageAsync(attempt, ct))?.Id != stage.Id) throw new InvalidOperationException("Resolve the current stage for every participating tube before moving the batch forward.");
            var execution = await dbContext.LabProtocolExecutions.SingleAsync(e => e.LabSpecimenAttemptId == attempt.Id && e.LabServiceWorkflowStageId == stage.Id, ct);
            execution.Complete(protocol, request.Reason, DateTime.UtcNow);
            if (next is not null)
            {
                await RequireCurrentProtocolsAsync([next.LabProtocolVersionId], ct);
                var created = new LabProtocolExecution(attempt.LabWorkOrderId, attempt.LabSpecimenId, next.LabProtocolVersionId, null, next.Id);
                created.AttachAttempt(attempt); created.Start(DateTime.UtcNow); dbContext.LabProtocolExecutions.Add(created);
            }
            else
            {
                var member = members.Single(m => m.LabSpecimenAttemptId == attempt.Id);
                await EstablishPreparedLibraryAsync(member, attempt, execution, request.RequestId, ct);
                await RefreshAttemptOutcomeAsync(await RequireWorkOrderAsync(attempt.LabWorkOrderId, ct), await RequireSpecimenAsync(attempt.LabWorkOrderId, attempt.LabSpecimenId, ct), attempt, actor.User.Id, ct);
            }
        }
    }

    private async Task SkipPreparationStageAsync(LabPreparationBatch batch, List<LabPreparationMember> members, List<LabSpecimenAttempt> attempts, LabPreparationCommand request, LabOperationsActor actor, CancellationToken ct)
    {
        var stage = await dbContext.LabServiceWorkflowStages.SingleOrDefaultAsync(s => s.Id == request.StageId && s.LabServiceWorkflowVersionId == batch.LabServiceWorkflowVersionId, ct) ?? throw Missing();
        // A stage may be skipped only before any steps were performed. The first stage still establishes source identity at Start.
        if (stage.Requirement == LabServiceWorkflowStageRequirement.Required) throw new InvalidOperationException("This workflow stage is required.");
        var next = await dbContext.LabServiceWorkflowStages.Where(s => s.LabServiceWorkflowVersionId == batch.LabServiceWorkflowVersionId && s.Sequence > stage.Sequence).OrderBy(s => s.Sequence).FirstOrDefaultAsync(ct);
        if (next is not null) await RequireCurrentProtocolsAsync([next.LabProtocolVersionId], ct);
        foreach (var attempt in attempts.Where(a => a.State != LabSpecimenAttemptState.Failed))
        {
            attempt.RequireOpen(false);
            if ((await NextAttemptStageAsync(attempt, ct))?.Id != stage.Id) throw new InvalidOperationException("Only the current stage may be skipped.");
            var execution = await dbContext.LabProtocolExecutions.SingleAsync(e => e.LabSpecimenAttemptId == attempt.Id && e.LabServiceWorkflowStageId == stage.Id, ct);
            if (LabProtocolEvidence.Read(execution.CapturedResultsJson).Records.Count > 0) throw new InvalidOperationException("A stage with recorded work cannot be skipped.");
            attempt.SkipStage(stage, request.Reason ?? "", actor.User.Id, DateTime.UtcNow); execution.Abandon(request.Reason);
            if (next is not null)
            {
                var created = new LabProtocolExecution(attempt.LabWorkOrderId, attempt.LabSpecimenId, next.LabProtocolVersionId, null, next.Id);
                created.AttachAttempt(attempt); created.Start(DateTime.UtcNow); dbContext.LabProtocolExecutions.Add(created);
            }
            else
            {
                var previous = await dbContext.LabProtocolExecutions.Where(e => e.LabSpecimenAttemptId == attempt.Id && e.Status == LabExecutionStatus.Completed).OrderByDescending(e => e.CompletedAtUtc).FirstOrDefaultAsync(ct)
                    ?? throw new InvalidOperationException("Preparation needs a completed execution with QC evidence before creating an eligible library.");
                await EstablishPreparedLibraryAsync(members.Single(m => m.LabSpecimenAttemptId == attempt.Id), attempt, previous, request.RequestId, ct);
                await RefreshAttemptOutcomeAsync(await RequireWorkOrderAsync(attempt.LabWorkOrderId, ct), await RequireSpecimenAsync(attempt.LabWorkOrderId, attempt.LabSpecimenId, ct), attempt, actor.User.Id, ct);
            }
        }
    }

    private async Task PreparationOutputAsync(LabPreparationMember member, LabSpecimenAttempt attempt, LabPreparationCommand request, CancellationToken ct)
    {
        attempt.RequireOpen(false);
        if (request.Quantity is null or <= 0 || string.IsNullOrWhiteSpace(request.QuantityUnit)) throw new ArgumentException("Record the actual output quantity and unit.");
        LabContainer output;
        if (request.OutputContainerId.HasValue)
        {
            output = await dbContext.LabContainers.SingleOrDefaultAsync(c => c.Id == request.OutputContainerId && c.LabSpecimenAttemptId == attempt.Id
                && c.Kind == LabContainerKind.Library && c.Status == LabContainerStatus.Available, ct) ?? throw Missing();
            if (output.Quantity != request.Quantity || output.QuantityUnit != request.QuantityUnit || output.Barcode != request.Barcode?.Trim())
                throw new ArgumentException("Confirm the existing output barcode and its recorded quantity and unit.");
            await RequireAttemptLineageAsync(output.Id, attempt, ct);
            if (await dbContext.LabLibraries.AnyAsync(l => l.LibraryContainerId == output.Id, ct)) throw new InvalidOperationException("This output is already a library.");
            member.SetOutput(output.Id); member.ConfirmOutput(output.Barcode, request.Barcode!);
        }
        else
        {
            var barcode = await LabBarcodeService.AllocateAsync(dbContext, LabContainerKind.Library, ct);
            output = new(attempt.LabWorkOrderId, attempt.LabSpecimenId, attempt.SourceContainerId, LabContainerKind.Library, barcode,
                $"Prepared library · {member.Position}", request.Location, request.Quantity, request.QuantityUnit, null);
            output.AttachAttempt(attempt); dbContext.LabContainers.Add(output); member.SetOutput(output.Id);
        }
    }

    private async Task EstablishPreparedLibraryAsync(LabPreparationMember member, LabSpecimenAttempt attempt, LabProtocolExecution finalExecution, Guid recordId, CancellationToken ct)
    {
        if (!member.OutputConfirmed || !member.OutputContainerId.HasValue) throw new InvalidOperationException($"{member.Position}: create the library output and confirm its barcode before completing preparation.");
        var output = await dbContext.LabContainers.SingleAsync(c => c.Id == member.OutputContainerId, ct);
        if (output.Status != LabContainerStatus.Available) throw new InvalidOperationException($"{member.Position}: the output is not available.");
        var executions = await dbContext.LabProtocolExecutions.Where(e => e.LabSpecimenAttemptId == attempt.Id && e.Status != LabExecutionStatus.Abandoned).ToListAsync(ct);
        var qc = executions.SelectMany(e => LabProtocolEvidence.Read(e.CapturedResultsJson).Records.GroupBy(r => r.StepKey).Select(g => g.Last())
            .Where(r => r.QcOutcome is not null).Select(r => new { executionId = e.Id, record = r })).ToList();
        if (qc.Count == 0 || qc.Any(q => q.record.QcOutcome != "pass")) throw new InvalidOperationException($"{member.Position}: preparation needs recorded passing QC evidence. A skipped QC gate cannot grant eligibility.");
        var library = new LabLibrary(attempt.LabWorkOrderId, attempt.LabSpecimenId, attempt.SourceContainerId, output.Id, finalExecution.Id, output.Barcode);
        library.RecordQc(true, JsonSerializer.Serialize(new { source = "preparation", preparationRecordId = recordId, memberId = member.Id,
            evidence = qc.Select(q => new { q.executionId, stepRecordId = q.record.Id, q.record.PreparationRecordId }) }, JsonOptions));
        dbContext.LabLibraries.Add(library); member.SetLibrary(library.Id);
    }

    private async Task PreparationResourceAsync(List<LabPreparationMember> members, List<LabSpecimenAttempt> attempts, LabPreparationCommand request, Guid actorId, CancellationToken ct)
    {
        var coverage = request.CoveredMemberIds;
        if (!request.Confirmed || coverage is null || coverage.Count == 0 || coverage.Distinct().Count() != coverage.Count || coverage.Any(id => members.All(m => m.Id != id)))
            throw new ArgumentException("Confirm the tubes covered by this resource use.");
        var executions = new List<LabProtocolExecution>();
        foreach (var member in members.Where(m => coverage.Contains(m.Id)))
        {
            var attempt = attempts.Single(a => a.Id == member.LabSpecimenAttemptId); attempt.RequireOpen();
            var execution = await dbContext.LabProtocolExecutions.SingleOrDefaultAsync(e => e.LabSpecimenAttemptId == attempt.Id && e.LabServiceWorkflowStageId == request.StageId
                && (e.Status == LabExecutionStatus.InProgress || e.Status == LabExecutionStatus.Blocked), ct) ?? throw new InvalidOperationException("Resource use requires an active stage for every covered tube.");
            executions.Add(execution);
        }
        // One physical use record is anchored to the first execution. Its preparation record retains every covered member.
        if (request.Action == "material")
        {
            var lot = await dbContext.LabMaterialLots.SingleOrDefaultAsync(l => l.Id == request.ResourceId, ct) ?? throw Missing();
            EnsureVersion(lot.Version, request.ResourceVersion ?? -1);
            if (lot.QcDisposition is not (LabQcDisposition.Passed or LabQcDisposition.ApprovedException) || lot.ExpirationOrRetestDate < DateOnly.FromDateTime(DateTime.UtcNow))
                throw new InvalidOperationException("The material lot must be within date and released for use.");
            if (request.QuantityUnit != lot.QuantityUnit || request.Quantity is null or <= 0) throw new ArgumentException("Enter a positive quantity in the lot's tracked unit.");
            lot.Consume(request.Quantity.Value);
            dbContext.LabMaterialConsumptions.Add(new(executions[0].Id, lot.Id, null, request.Quantity.Value, lot.QuantityUnit, actorId, DateTime.UtcNow, request.RequestId));
        }
        else
        {
            var equipment = await dbContext.LabEquipment.SingleOrDefaultAsync(e => e.Id == request.ResourceId, ct) ?? throw Missing();
            if (!equipment.CanRecordUsage(DateOnly.FromDateTime(DateTime.UtcNow))) throw new InvalidOperationException("Equipment must be active and within calibration.");
            dbContext.Entry(equipment).Property(e => e.UpdatedAt).IsModified = true;
            dbContext.LabEquipmentUsages.Add(new(executions[0].Id, equipment.Id, DateTime.UtcNow, actorId, request.Reason, request.RequestId));
        }
        foreach (var execution in executions) dbContext.Entry(execution).Property(e => e.UpdatedAt).IsModified = true;
    }
}
