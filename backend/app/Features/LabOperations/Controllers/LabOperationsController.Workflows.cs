namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed partial class LabOperationsController
{
    [HttpPost("service-workflows")]
    public async Task<LabServiceWorkflowDto> CreateServiceWorkflow(
        [FromBody] CreateServiceWorkflowRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken, LabRole.ProtocolAdministrator);
        var serviceKey = request.ServiceKey.Trim().ToLowerInvariant();
        var marketed = await dbContext.QboCatalogItems.AsNoTracking().AnyAsync(item => item.IsActive
            && item.ExternalItemId.ToLower() == serviceKey
            && item.SalesUnit.ToLower() == OrderSalesUnits.Specimen, cancellationToken);
        if (!marketed)
            throw Invalid("service_workflow_service_invalid",
                "Select an active marketed laboratory service.");
        if (await dbContext.LabServiceWorkflows.AsNoTracking().AnyAsync(
            item => item.ServiceKey == serviceKey, cancellationToken))
            throw Conflict("service_workflow_exists",
                "This marketed service already has a canonical laboratory workflow.");

        var workflow = new LabServiceWorkflow(serviceKey, request.Name, request.Description);
        dbContext.LabServiceWorkflows.Add(workflow);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await ReadServiceWorkflowsAsync(cancellationToken)).Single(item => item.Id == workflow.Id);
    }

    [HttpPost("service-workflows/{workflowId:guid}/versions")]
    public async Task<LabServiceWorkflowDto> CreateServiceWorkflowVersion(Guid workflowId,
        [FromBody] CreateServiceWorkflowVersionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.ProtocolAdministrator);
        var workflow = await dbContext.LabServiceWorkflows.SingleOrDefaultAsync(
            item => item.Id == workflowId, cancellationToken) ?? throw Missing();
        EnsureVersion(workflow.Version, request.WorkflowVersion);
        var hasOpenCandidate = await dbContext.LabServiceWorkflowVersions.AnyAsync(item =>
            item.LabServiceWorkflowId == workflowId
            && (item.Status == LabServiceWorkflowStatus.Draft
                || item.Status == LabServiceWorkflowStatus.Approved), cancellationToken);
        if (hasOpenCandidate)
            throw Conflict("service_workflow_candidate_exists",
                "Continue, promote, withdraw, or discard the open workflow version before creating another.");

        var nextVersion = workflow.LatestVersion + 1;
        workflow.RecordVersion(nextVersion);
        var version = new LabServiceWorkflowVersion(workflow.Id, nextVersion,
            actor.User.Id, DateTime.UtcNow);
        var stages = await BuildWorkflowStagesAsync(version.Id, request.Stages, cancellationToken);
        dbContext.LabServiceWorkflowVersions.Add(version);
        dbContext.LabServiceWorkflowStages.AddRange(stages);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await ReadServiceWorkflowsAsync(cancellationToken)).Single(item => item.Id == workflow.Id);
    }

    [HttpPut("service-workflow-versions/{versionId:guid}")]
    public async Task<LabServiceWorkflowDto> UpdateServiceWorkflowVersion(Guid versionId,
        [FromBody] UpdateServiceWorkflowVersionRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken, LabRole.ProtocolAdministrator);
        var version = await dbContext.LabServiceWorkflowVersions.SingleOrDefaultAsync(
            item => item.Id == versionId, cancellationToken) ?? throw Missing();
        if (version.Status != LabServiceWorkflowStatus.Draft)
            throw Conflict("service_workflow_not_draft", "Only a draft workflow can be edited.");
        var workflow = await dbContext.LabServiceWorkflows.SingleOrDefaultAsync(
            item => item.Id == version.LabServiceWorkflowId, cancellationToken) ?? throw Missing();
        EnsureVersion(workflow.Version, request.WorkflowVersion);
        var replacement = await BuildWorkflowStagesAsync(version.Id, request.Stages, cancellationToken);
        var existing = await dbContext.LabServiceWorkflowStages.Where(
            item => item.LabServiceWorkflowVersionId == version.Id).ToListAsync(cancellationToken);
        dbContext.LabServiceWorkflowStages.RemoveRange(existing);
        dbContext.LabServiceWorkflowStages.AddRange(replacement);
        MarkWorkflowCandidateChanged(workflow);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await ReadServiceWorkflowsAsync(cancellationToken)).Single(item => item.Id == workflow.Id);
    }

    [HttpPost("service-workflow-versions/{versionId:guid}/transition")]
    public async Task<LabServiceWorkflowDto> TransitionServiceWorkflow(Guid versionId,
        [FromBody] ServiceWorkflowTransitionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.ProtocolAdministrator);
        var version = await dbContext.LabServiceWorkflowVersions.SingleOrDefaultAsync(
            item => item.Id == versionId, cancellationToken) ?? throw Missing();
        var workflow = await dbContext.LabServiceWorkflows.SingleOrDefaultAsync(
            item => item.Id == version.LabServiceWorkflowId, cancellationToken) ?? throw Missing();
        EnsureVersion(workflow.Version, request.WorkflowVersion);
        switch (request.Action.Trim().ToLowerInvariant())
        {
            case "approve":
                await RequireWorkflowStagesAsync(version.Id, cancellationToken);
                if (version.AuthoredByUserId == actor.User.Id)
                    requestContext.EnforceOrAuditActorConflict(actor.User.Id,
                        "service_workflow_author_approval_conflict",
                        "A workflow author cannot approve the same workflow version.",
                        new { workflowId = workflow.Id, workflowVersionId = version.Id });
                Execute(() => version.Approve(actor.User.Id, DateTime.UtcNow,
                    requestContext.DualControlEnforced));
                break;
            case "withdraw":
                Execute(version.WithdrawApproval);
                break;
            case "discard":
                Execute(version.Discard);
                break;
            case "promote":
                await PromoteWorkflowAsync(workflow, version, actor.User.Id, cancellationToken);
                break;
            case "retire":
                Execute(version.Retire);
                break;
            default:
                throw Invalid("service_workflow_transition_invalid",
                    "The workflow transition is invalid.");
        }
        MarkWorkflowCandidateChanged(workflow);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await ReadServiceWorkflowsAsync(cancellationToken)).Single(item => item.Id == workflow.Id);
    }

    private async Task<List<LabServiceWorkflowStage>> BuildWorkflowStagesAsync(Guid versionId,
        IReadOnlyList<ServiceWorkflowStageRequest> requests, CancellationToken cancellationToken)
    {
        if (requests.Count == 0)
            throw Invalid("service_workflow_stages_required",
                "Add at least one protocol stage to the workflow.");
        var protocolVersionIds = requests.Select(item => item.LabProtocolVersionId).Distinct().ToList();
        var protocolVersions = await dbContext.LabProtocolVersions.Where(
            item => protocolVersionIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, cancellationToken);
        if (protocolVersions.Count != protocolVersionIds.Count
            || protocolVersions.Values.Any(item => item.Status is not (LabProtocolStatus.Approved or LabProtocolStatus.Active)))
            throw Invalid("service_workflow_protocol_invalid",
                "Every workflow stage must use an approved protocol version.");
        if (protocolVersions.Values.GroupBy(item => item.LabProtocolId)
            .Any(group => group.Select(item => item.Id).Distinct().Count() > 1))
            throw Invalid("service_workflow_protocol_versions_mixed",
                "A workflow cannot mix multiple versions of the same protocol.");
        foreach (var protocol in protocolVersions.Values) RequireProtocolDefinition(protocol.DefinitionJson);

        return requests.Select((request, index) =>
        {
            if (!Enum.TryParse<LabServiceWorkflowStageRequirement>(request.Requirement, true,
                out var requirement))
                throw Invalid("service_workflow_requirement_invalid",
                    "Choose Required, Optional, or Conditional for every stage.");
            try
            {
                return new LabServiceWorkflowStage(versionId, index + 1, request.Name,
                    request.LabProtocolVersionId, requirement, request.Condition,
                    request.HandoffCriteria);
            }
            catch (ArgumentException exception)
            {
                throw Invalid("service_workflow_stage_invalid", exception.Message);
            }
        }).ToList();
    }

    private async Task PromoteWorkflowAsync(LabServiceWorkflow workflow,
        LabServiceWorkflowVersion version, Guid actorUserId, CancellationToken cancellationToken)
    {
        var stages = await RequireWorkflowStagesAsync(version.Id, cancellationToken);
        var protocolVersionIds = stages.Select(item => item.LabProtocolVersionId).Distinct().ToList();
        var protocolVersions = await dbContext.LabProtocolVersions.Where(
            item => protocolVersionIds.Contains(item.Id)).ToListAsync(cancellationToken);
        if (protocolVersions.Count != protocolVersionIds.Count
            || protocolVersions.Any(item => item.Status is not (LabProtocolStatus.Approved or LabProtocolStatus.Active)))
            throw Conflict("service_workflow_protocol_not_ready",
                "Every workflow protocol must still be approved.");

        foreach (var protocol in protocolVersions) RequireProtocolDefinition(protocol.DefinitionJson);
        foreach (var protocolVersion in protocolVersions.Where(item => item.Status == LabProtocolStatus.Approved))
        {
            var current = await dbContext.LabProtocolVersions.Where(item =>
                item.LabProtocolId == protocolVersion.LabProtocolId
                && item.Status == LabProtocolStatus.Active).ToListAsync(cancellationToken);
            foreach (var previous in current)
            {
                var usedElsewhere = await (
                    from stage in dbContext.LabServiceWorkflowStages
                    join workflowVersion in dbContext.LabServiceWorkflowVersions
                        on stage.LabServiceWorkflowVersionId equals workflowVersion.Id
                    where stage.LabProtocolVersionId == previous.Id
                        && workflowVersion.Status == LabServiceWorkflowStatus.Production
                        && workflowVersion.LabServiceWorkflowId != workflow.Id
                    select stage.Id).AnyAsync(cancellationToken);
                if (usedElsewhere)
                    throw Conflict("protocol_shared_by_production_workflow",
                        "A protocol being replaced is still used by another production workflow. Version that workflow first.");
                Execute(previous.Retire);
            }
            if (protocolVersion.AuthoredByUserId == actorUserId)
                requestContext.EnforceOrAuditActorConflict(actorUserId,
                    "protocol_author_activation_conflict",
                    "A protocol author cannot promote the same protocol version.",
                    new { protocolVersionId = protocolVersion.Id, workflowVersionId = version.Id });
            Execute(() => protocolVersion.Activate(actorUserId, requestContext.DualControlEnforced));
        }

        var previousWorkflowVersions = await dbContext.LabServiceWorkflowVersions.Where(item =>
            item.LabServiceWorkflowId == workflow.Id
            && item.Status == LabServiceWorkflowStatus.Production).ToListAsync(cancellationToken);
        foreach (var previous in previousWorkflowVersions) Execute(previous.Retire);
        if (version.AuthoredByUserId == actorUserId)
            requestContext.EnforceOrAuditActorConflict(actorUserId,
                "service_workflow_author_production_conflict",
                "A workflow author cannot promote the same workflow version.",
                new { workflowId = workflow.Id, workflowVersionId = version.Id });
        Execute(() => version.PromoteToProduction(actorUserId, DateTime.UtcNow,
            requestContext.DualControlEnforced));
    }

    private async Task<List<LabServiceWorkflowStage>> RequireWorkflowStagesAsync(
        Guid versionId, CancellationToken cancellationToken)
    {
        var stages = await dbContext.LabServiceWorkflowStages.Where(
            item => item.LabServiceWorkflowVersionId == versionId)
            .OrderBy(item => item.Sequence).ToListAsync(cancellationToken);
        if (stages.Count == 0)
            throw Conflict("service_workflow_stages_required",
                "A workflow must contain at least one protocol stage.");
        return stages;
    }

    private void MarkWorkflowCandidateChanged(LabServiceWorkflow workflow) =>
        dbContext.Entry(workflow).Property(item => item.UpdatedAt).IsModified = true;
}
