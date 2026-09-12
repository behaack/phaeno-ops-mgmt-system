namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    private async Task<LabSpecimenAttempt?> RequireExecutionAttemptAsync(LabProtocolExecution execution, CancellationToken ct, bool allowSucceeded = false)
    {
        var work = await RequireOpenExecutionWorkAsync(execution.LabWorkOrderId, ct);
        if (!execution.LabSpecimenAttemptId.HasValue)
        {
            if (work.TubeUsePolicyKey is not null || execution.Status == LabExecutionStatus.Planned && execution.LabSpecimenId.HasValue)
                throw Conflict("source_attempt_required", "Open this specimen and select its source tube before execution. Adopt existing Planned work through that action.");
            return null;
        }
        var attempt = await dbContext.LabSpecimenAttempts.SingleAsync(a => a.Id == execution.LabSpecimenAttemptId, ct);
        if (!allowSucceeded) await RequireOutsidePreparationAsync(attempt.Id, ct);
        if (attempt.LabWorkOrderId != work.Id || attempt.LabSpecimenId != execution.LabSpecimenId || attempt.LabServiceWorkflowVersionId != work.LabServiceWorkflowVersionId)
            throw Conflict("attempt_scope_mismatch", "The execution must match its specimen attempt and pinned workflow.");
        if (!(allowSucceeded && attempt.State == LabSpecimenAttemptState.Succeeded)) Execute(() => attempt.RequireOpen());
        dbContext.Entry(attempt).Property(a => a.UpdatedAt).IsModified = true;
        return attempt;
    }

    private async Task<LabContainer> RequireAttemptSourceAsync(LabSpecimenAttempt attempt, CancellationToken ct)
    {
        var specimen = await RequireSpecimenAsync(attempt.LabWorkOrderId, attempt.LabSpecimenId, ct);
        var tube = await dbContext.LabContainers.SingleAsync(t => t.Id == attempt.SourceContainerId, ct);
        var reason = TubeUnavailableReason(specimen, tube, null);
        if (tube.LabWorkOrderId != attempt.LabWorkOrderId || tube.LabSpecimenId != specimen.Id || reason is not null)
            throw Conflict("attempt_source_unavailable", reason ?? "The selected source does not belong to this specimen.");
        dbContext.Entry(tube).Property(t => t.UpdatedAt).IsModified = true;
        return tube;
    }

    private async Task RequireAttemptLineageAsync(Guid containerId, LabSpecimenAttempt attempt, CancellationToken ct)
    {
        var seen = new HashSet<Guid>();
        Guid? current = containerId;
        while (current.HasValue && seen.Add(current.Value))
        {
            var item = await dbContext.LabContainers.SingleOrDefaultAsync(t => t.Id == current && t.LabWorkOrderId == attempt.LabWorkOrderId && t.LabSpecimenId == attempt.LabSpecimenId, ct);
            if (item is null) break;
            if (item.Id == attempt.SourceContainerId) return;
            if (item.LabSpecimenAttemptId != attempt.Id) break;
            current = item.ParentContainerId;
        }
        throw Conflict("attempt_lineage_mismatch", "Use a container derived from this attempt's selected source. Outputs from other attempts cannot be reused.");
    }

    private async Task AttachDerivedContainerAsync(LabContainer container, CancellationToken ct)
    {
        var work = await RequireOpenExecutionWorkAsync(container.LabWorkOrderId, ct);
        if (work.TubeUsePolicyKey is null) return;
        if (container.Kind == LabContainerKind.SubmittedSpecimen)
            throw Conflict("tube_accession_required", "Receive and accession submitted tubes through the receipt workflow.");
        if (!container.LabSpecimenId.HasValue)
        {
            if (container.ParentContainerId.HasValue)
                throw Invalid("derived_specimen_required", "Choose the specimen when creating a child container.");
            return;
        }
        var attempt = await dbContext.LabSpecimenAttempts.SingleOrDefaultAsync(a => a.LabSpecimenId == container.LabSpecimenId && a.LabWorkOrderId == work.Id
            && (a.State == LabSpecimenAttemptState.InProgress || a.State == LabSpecimenAttemptState.OnHold || a.State == LabSpecimenAttemptState.Succeeded), ct)
            ?? throw Conflict("derived_attempt_required", "Start the specimen's source attempt before recording derived material.");
        if (attempt.State != LabSpecimenAttemptState.Succeeded) Execute(() => attempt.RequireOpen());
        await RequireOutsidePreparationAsync(attempt.Id, ct);
        if (!container.ParentContainerId.HasValue) throw Invalid("derived_parent_required", "Select the immediate parent container for this specimen output.");
        await RequireAttemptLineageAsync(container.ParentContainerId.Value, attempt, ct);
        container.AttachAttempt(attempt);
        dbContext.Entry(attempt).Property(a => a.UpdatedAt).IsModified = true;
    }

    private async Task RequireLibraryAttemptAsync(LabLibrary library, CancellationToken ct, bool requireSuccess = true)
    {
        var work = await RequireOpenExecutionWorkAsync(library.LabWorkOrderId, ct);
        if (work.TubeUsePolicyKey is null) return;
        var execution = await dbContext.LabProtocolExecutions.SingleAsync(e => e.Id == library.PreparationExecutionId, ct);
        var attempt = await RequireExecutionAttemptAsync(execution, ct, allowSucceeded: true);
        if (attempt is null || attempt.LabSpecimenId != library.LabSpecimenId || requireSuccess && attempt.State != LabSpecimenAttemptState.Succeeded)
            throw Conflict("successful_attempt_required", "Only material from a successful specimen attempt can proceed downstream.");
        if (requireSuccess && await (from m in dbContext.LabPreparationMembers join b in dbContext.LabPreparationBatches on m.LabPreparationBatchId equals b.Id
            where m.LabSpecimenAttemptId == attempt.Id && !m.Removed && b.Status != LabBatchStatus.Complete select m).AnyAsync(ct))
            throw Conflict("preparation_not_closed", "Complete the preparation batch before handing its libraries to sequencing.");
        await RequireAttemptLineageAsync(library.SourceContainerId, attempt, ct);
        await RequireAttemptLineageAsync(library.LibraryContainerId, attempt, ct);
    }

    private async Task RequireBatchAttemptReadinessAsync(Guid batchId, CancellationToken ct)
    {
        var libraries = await (from member in dbContext.LabBatchMembers join library in dbContext.LabLibraries on member.LabLibraryId equals library.Id
            where member.LabOperationalBatchId == batchId select library).ToListAsync(ct);
        foreach (var library in libraries) await RequireLibraryAttemptAsync(library, ct);
    }

    private async Task RequireOutsidePreparationAsync(Guid attemptId, CancellationToken ct)
    {
        if (await dbContext.LabPreparationMembers.AnyAsync(m => m.LabSpecimenAttemptId == attemptId && !m.Removed, ct))
            throw Conflict("preparation_workspace_required", "Open this tube's preparation batch to record work, resources, outputs or failure. Its tray membership and shared evidence must stay connected.");
    }

    private async Task RequireSpecimenReviewReadinessAsync(LabWorkOrder work, CancellationToken ct, Guid? submittedSpecimenId = null)
    {
        if (work.TubeUsePolicyKey is null) return;
        var specimens = await dbContext.LabSpecimens.Where(s => s.LabWorkOrderId == work.Id && s.IntakeDisposition != LabSpecimenIntakeDisposition.Cancelled).ToListAsync(ct);
        if (submittedSpecimenId.HasValue) specimens = specimens.Where(s => s.SubmittedSpecimenId == submittedSpecimenId).ToList();
        if (specimens.Count == 0 || specimens.Any(s => s.ProcessingState is not (LabSpecimenProcessingState.Succeeded or LabSpecimenProcessingState.Failed))
            || specimens.All(s => s.ProcessingState != LabSpecimenProcessingState.Succeeded))
            throw Conflict("specimen_attempts_incomplete", "Resolve every affected specimen attempt before review. Only successful specimen outputs may be approved for release.");
    }
}
