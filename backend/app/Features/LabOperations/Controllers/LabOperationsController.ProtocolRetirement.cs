namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed partial class LabOperationsController
{
    [HttpGet("protocols/{protocolId:guid}/retirement-impact")]
    public async Task<ProtocolRetirementImpactDto> ProtocolRetirementImpact(Guid protocolId, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken, LabRole.ProtocolAdministrator);
        var protocol = await dbContext.LabProtocols.SingleOrDefaultAsync(x => x.Id == protocolId, cancellationToken) ?? throw Missing();
        Execute(protocol.RequireCurrent);
        return (await ReadRetirementImpactAsync(protocol, cancellationToken)).Dto;
    }

    [HttpPost("protocols/{protocolId:guid}/retire")]
    public async Task<LabProtocolDto> RetireProtocol(Guid protocolId,
        [FromBody] RetireProtocolRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken, LabRole.ProtocolAdministrator);
        var protocol = await dbContext.LabProtocols.SingleOrDefaultAsync(x => x.Id == protocolId, cancellationToken) ?? throw Missing();
        EnsureVersion(protocol.Version, request.Version);
        Execute(protocol.RequireCurrent);
        var versions = await dbContext.LabProtocolVersions.Where(x => x.LabProtocolId == protocolId).ToListAsync(cancellationToken);
        if (!versions.Any(x => x.ApprovedByUserId.HasValue || x.Status is LabProtocolStatus.Approved or LabProtocolStatus.Active or LabProtocolStatus.Retired))
            throw Conflict("protocol_not_approved", "This protocol has never been approved. Use Delete protocol instead.");
        if (versions.Any(x => x.Status == LabProtocolStatus.Draft))
            throw Conflict("protocol_has_draft", "Discard the open draft before retiring this protocol.");
        var impact = await ReadRetirementImpactAsync(protocol, cancellationToken);
        if (impact.Dto.ActiveWork.Count > 0)
            throw Conflict("protocol_processing_dependency", "Retirement is blocked because samples are in process on these jobs: " + string.Join(", ", impact.Dto.ActiveWork.Select(x => x.Reference)));
        if (impact.Dto.Workflows.Count > 0 || impact.Dto.QueuedWork.Count > 0)
        {
            if (!request.ConfirmImpact || request.ImpactToken != impact.Dto.ImpactToken)
                throw Conflict("protocol_retirement_confirmation_required", "Review the current affected workflows and queued work, then confirm Proceed anyway. The impact may have changed.");
        }

        var utcNow = DateTime.UtcNow;
        Execute(() => protocol.Retire(request.Reason, actor.User.Id, utcNow));
        var reason = $"Protocol {protocol.Name} retired. {protocol.RetirementReason}";
        foreach (var workflow in impact.Workflows)
        {
            var candidates = impact.WorkflowVersions.Where(x => x.LabServiceWorkflowId == workflow.Id).ToList();
            var source = candidates.Where(x => x.Status is LabServiceWorkflowStatus.Draft or LabServiceWorkflowStatus.Invalid or LabServiceWorkflowStatus.Approved or LabServiceWorkflowStatus.Production)
                .OrderByDescending(x => x.WorkflowVersion).FirstOrDefault()
                ?? candidates.OrderByDescending(x => x.WorkflowVersion).First();
            var sourceStages = await dbContext.LabServiceWorkflowStages.Where(x => x.LabServiceWorkflowVersionId == source.Id).OrderBy(x => x.Sequence).ToListAsync(cancellationToken);
            foreach (var version in candidates.Where(x => x.Status is LabServiceWorkflowStatus.Draft or LabServiceWorkflowStatus.Invalid
                or LabServiceWorkflowStatus.Approved or LabServiceWorkflowStatus.Production
                || impact.QueuedJobs.Any(job => job.LabServiceWorkflowVersionId == x.Id)))
                version.Invalidate(reason, utcNow);
            var next = workflow.LatestVersion + 1;
            workflow.RecordVersion(next);
            var recovery = new LabServiceWorkflowVersion(workflow.Id, next, actor.User.Id, utcNow);
            recovery.Invalidate(reason, utcNow, editable: true);
            dbContext.LabServiceWorkflowVersions.Add(recovery);
            var sourceProtocolIds = sourceStages.Select(x => x.LabProtocolVersionId).ToList();
            var eligible = await (from version in dbContext.LabProtocolVersions
                join identity in dbContext.LabProtocols on version.LabProtocolId equals identity.Id
                where sourceProtocolIds.Contains(version.Id) && identity.Id != protocol.Id && identity.RetiredAtUtc == null
                select version.Id).ToListAsync(cancellationToken);
            var sequence = 0;
            foreach (var stage in sourceStages.Where(x => eligible.Contains(x.LabProtocolVersionId)))
                dbContext.LabServiceWorkflowStages.Add(new LabServiceWorkflowStage(recovery.Id, ++sequence, stage.Name,
                    stage.LabProtocolVersionId, stage.Requirement, stage.Condition, stage.HandoffCriteria));
        }
        foreach (var job in impact.QueuedJobs)
        {
            // Pair the warning with the exact queued work state and retain its pin.
            dbContext.Entry(job).Property(x => x.UpdatedAt).IsModified = true;
            dbContext.LabWorkEvents.Add(new LabWorkEvent(job.Id, null, "WorkflowInvalidatedByProtocolRetirement", utcNow, actor.User.Id,
                JsonSerializer.Serialize(new { protocol.Id, protocol.Name, job.LabServiceWorkflowVersionId, reason }, JsonOptions)));
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await ReadProtocolsAsync(cancellationToken)).Single(x => x.Id == protocolId);
    }

    private sealed record RetirementImpact(ProtocolRetirementImpactDto Dto, List<LabServiceWorkflow> Workflows,
        List<LabServiceWorkflowVersion> WorkflowVersions, List<LabWorkOrder> QueuedJobs);

    private async Task<RetirementImpact> ReadRetirementImpactAsync(LabProtocol protocol, CancellationToken cancellationToken)
    {
        var versionIds = await dbContext.LabProtocolVersions.Where(x => x.LabProtocolId == protocol.Id).Select(x => x.Id).ToListAsync(cancellationToken);
        var referencedIds = await dbContext.LabServiceWorkflowStages.Where(x => versionIds.Contains(x.LabProtocolVersionId))
            .Select(x => x.LabServiceWorkflowVersionId).Distinct().ToListAsync(cancellationToken);
        var referencedVersions = await dbContext.LabServiceWorkflowVersions.Where(x => referencedIds.Contains(x.Id)).ToListAsync(cancellationToken);
        var liveWorkflowIds = referencedVersions.Where(x => x.Status is LabServiceWorkflowStatus.Draft or LabServiceWorkflowStatus.Invalid
            or LabServiceWorkflowStatus.Approved or LabServiceWorkflowStatus.Production).Select(x => x.LabServiceWorkflowId).Distinct().ToList();
        // Invalidation affects the canonical workflow's live candidates, so also
        // inspect jobs pinned to its other versions before allowing that change.
        var relatedVersionIds = await dbContext.LabServiceWorkflowVersions
            .Where(x => liveWorkflowIds.Contains(x.LabServiceWorkflowId) || referencedIds.Contains(x.Id))
            .Select(x => x.Id).ToListAsync(cancellationToken);
        var directlyUsingJobs = dbContext.LabProtocolExecutions.Where(x => versionIds.Contains(x.LabProtocolVersionId)).Select(x => x.LabWorkOrderId);
        var jobs = await dbContext.LabWorkOrders.Where(x => x.Status != LabWorkOrderStatus.ReadyForRelease && x.Status != LabWorkOrderStatus.Cancelled
            && ((x.LabServiceWorkflowVersionId.HasValue && relatedVersionIds.Contains(x.LabServiceWorkflowVersionId.Value)) || directlyUsingJobs.Contains(x.Id)))
            .OrderBy(x => x.Id).ToListAsync(cancellationToken);
        var jobIds = jobs.Select(x => x.Id).ToList();
        var executions = await dbContext.LabProtocolExecutions.Where(x => jobIds.Contains(x.LabWorkOrderId)).OrderBy(x => x.Id).ToListAsync(cancellationToken);
        var startedAttemptJobs = await dbContext.LabSpecimenAttempts.Where(a => jobIds.Contains(a.LabWorkOrderId) && a.StartedAtUtc.HasValue
            && (a.State == LabSpecimenAttemptState.InProgress || a.State == LabSpecimenAttemptState.OnHold)).Select(a => a.LabWorkOrderId).ToListAsync(cancellationToken);
        var activeIds = jobs.Where(x => startedAttemptJobs.Contains(x.Id) || x.Status is not (LabWorkOrderStatus.AwaitingSpecimens or LabWorkOrderStatus.Received or LabWorkOrderStatus.OnHold)
            || executions.Any(e => e.LabWorkOrderId == x.Id && e.StartedAtUtc.HasValue && e.Status != LabExecutionStatus.Abandoned)).Select(x => x.Id).ToHashSet();
        var queued = jobs.Where(x => !activeIds.Contains(x.Id)).ToList();
        var queuedWorkflowIds = queued.Select(x => x.LabServiceWorkflowVersionId).ToList();
        var affectedIds = referencedVersions.Where(x => x.Status is LabServiceWorkflowStatus.Draft or LabServiceWorkflowStatus.Invalid or LabServiceWorkflowStatus.Approved or LabServiceWorkflowStatus.Production
            || queuedWorkflowIds.Contains(x.Id)).Select(x => x.LabServiceWorkflowId).Distinct().ToList();
        var workflows = await dbContext.LabServiceWorkflows.Where(x => affectedIds.Contains(x.Id)).OrderBy(x => x.Id).ToListAsync(cancellationToken);
        var workflowVersions = await dbContext.LabServiceWorkflowVersions.Where(x => affectedIds.Contains(x.LabServiceWorkflowId)).OrderBy(x => x.Id).ToListAsync(cancellationToken);
        var authorizationIds = jobs.Select(x => x.AuthorizationId).ToList();
        var references = await (from authorization in dbContext.CommercialLabAuthorizations
            join order in dbContext.LabServiceOrders on authorization.CommercialOrderId equals order.Id
            where authorizationIds.Contains(authorization.Id) select new { authorization.Id, order.OrderNumber })
            .ToDictionaryAsync(x => x.Id, x => x.OrderNumber, cancellationToken);
        ProtocolRetirementWorkDto MapJob(LabWorkOrder x) => new(x.Id, references.GetValueOrDefault(x.AuthorizationId) ?? x.Id.ToString());
        var tokenData = JsonSerializer.Serialize(new { protocol.Id, protocol.Version,
            Workflows = workflows.Select(x => new { x.Id, x.Version }),
            Versions = workflowVersions.Select(x => new { x.Id, x.Version, x.Status }),
            Jobs = jobs.Select(x => new { x.Id, x.Version, x.Status, x.LabServiceWorkflowVersionId }),
            Executions = executions.Select(x => new { x.Id, x.Version, x.Status, x.StartedAtUtc }) });
        var token = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(tokenData)));
        return new(new(token, workflows.Select(x => x.Name).ToList(), jobs.Where(x => activeIds.Contains(x.Id)).Select(MapJob).ToList(), queued.Select(MapJob).ToList()), workflows, workflowVersions, queued);
    }

    private async Task RequireCurrentProtocolsAsync(IEnumerable<Guid> versionIds, CancellationToken cancellationToken)
    {
        var ids = versionIds.Distinct().ToList();
        var protocolIds = dbContext.LabProtocolVersions.Where(x => ids.Contains(x.Id)).Select(x => x.LabProtocolId);
        var protocols = await dbContext.LabProtocols.Where(x => protocolIds.Contains(x.Id)).OrderBy(x => x.Id).ToListAsync(cancellationToken);
        foreach (var protocol in protocols) { Execute(protocol.RequireCurrent); MarkProtocolCandidateChanged(protocol); }
    }

    private async Task RequireUsablePinnedWorkflowAsync(LabWorkOrder work, CancellationToken cancellationToken)
    {
        if (!work.LabServiceWorkflowVersionId.HasValue)
        {
            var assignedIds = await dbContext.LabProtocolExecutions.Where(x => x.LabWorkOrderId == work.Id)
                .Select(x => x.LabProtocolVersionId).ToListAsync(cancellationToken);
            await RequireCurrentProtocolsAsync(assignedIds, cancellationToken);
            return;
        }
        var version = await dbContext.LabServiceWorkflowVersions.SingleAsync(x => x.Id == work.LabServiceWorkflowVersionId.Value, cancellationToken);
        if (version.Status is LabServiceWorkflowStatus.Invalid or LabServiceWorkflowStatus.Invalidated)
            throw Conflict("work_workflow_invalid", "This job is assigned to an invalid workflow after protocol retirement. Review the job assignment before starting work.");
        var workflow = await dbContext.LabServiceWorkflows.SingleAsync(x => x.Id == version.LabServiceWorkflowId, cancellationToken);
        MarkWorkflowCandidateChanged(workflow);
        var ids = await dbContext.LabServiceWorkflowStages.Where(x => x.LabServiceWorkflowVersionId == version.Id).Select(x => x.LabProtocolVersionId).ToListAsync(cancellationToken);
        await RequireCurrentProtocolsAsync(ids, cancellationToken);
    }
}
