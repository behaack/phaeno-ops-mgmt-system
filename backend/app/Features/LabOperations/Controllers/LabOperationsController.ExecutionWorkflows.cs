namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    private async Task<Guid?> ReadDefaultExecutionWorkflowAsync(LabWorkOrder work, CancellationToken ct)
    {
        // A Trial's explicitly approved scientific scope is distinct from a commercial order.
        if (work.AuthorizationSource == LabAuthorizationSource.TrialProject && work.LabServiceWorkflowVersionId.HasValue)
            return work.LabServiceWorkflowVersionId;
        return await (from w in dbContext.LabServiceWorkflows.AsNoTracking()
            join v in dbContext.LabServiceWorkflowVersions.AsNoTracking() on w.Id equals v.LabServiceWorkflowId
            where w.ServiceKey == work.ServiceKey && v.Status == LabServiceWorkflowStatus.Production
            select (Guid?)v.Id).SingleOrDefaultAsync(ct);
    }

    private async Task RequireExecutionWorkflowAsync(LabWorkOrder work, Guid workflowVersionId, CancellationToken ct, bool newSelection = false)
    {
        var version = await dbContext.LabServiceWorkflowVersions.SingleOrDefaultAsync(v => v.Id == workflowVersionId, ct) ?? throw Missing();
        var workflow = await dbContext.LabServiceWorkflows.SingleAsync(w => w.Id == version.LabServiceWorkflowId, ct);
        if (workflow.ServiceKey != work.ServiceKey)
            throw Conflict("execution_service_mismatch", "Choose a workflow for this job's purchased service.");
        if (work.AuthorizationSource == LabAuthorizationSource.TrialProject && work.LabServiceWorkflowVersionId.HasValue
            && workflowVersionId != work.LabServiceWorkflowVersionId)
            throw Conflict("trial_workflow_mismatch", "This Trial has an explicitly approved workflow. Review its approved scope before changing the procedure.");
        if (version.Status is not (LabServiceWorkflowStatus.Approved or LabServiceWorkflowStatus.Production or LabServiceWorkflowStatus.Retired)
            || newSelection && version.Status == LabServiceWorkflowStatus.Retired
                && !(work.AuthorizationSource == LabAuthorizationSource.TrialProject && work.LabServiceWorkflowVersionId == workflowVersionId))
            throw Conflict("work_workflow_invalid", "This execution workflow is unavailable. Choose an approved workflow for new work; review existing attempts separately.");
        MarkWorkflowCandidateChanged(workflow);
        dbContext.Entry(version).Property(v => v.UpdatedAt).IsModified = true;
        var protocolIds = await dbContext.LabServiceWorkflowStages.Where(s => s.LabServiceWorkflowVersionId == version.Id)
            .Select(s => s.LabProtocolVersionId).ToListAsync(ct);
        if (protocolIds.Count == 0) throw Conflict("workflow_empty", "The workflow has no stages.");
        await RequireCurrentProtocolsAsync(protocolIds, ct);
    }

    private async Task RequireExecutionWorkflowAsync(LabProtocolExecution execution, CancellationToken ct)
    {
        var work = await RequireWorkOrderAsync(execution.LabWorkOrderId, ct);
        if (execution.LabServiceWorkflowStageId.HasValue)
        {
            var stage = await dbContext.LabServiceWorkflowStages.SingleAsync(s => s.Id == execution.LabServiceWorkflowStageId, ct);
            if (stage.LabProtocolVersionId != execution.LabProtocolVersionId)
                throw Conflict("workflow_stage_protocol_mismatch", "The execution must use its recorded stage's protocol version.");
            await RequireExecutionWorkflowAsync(work, stage.LabServiceWorkflowVersionId, ct);
        }
        else await RequireCurrentProtocolsAsync([execution.LabProtocolVersionId], ct);
    }
}
