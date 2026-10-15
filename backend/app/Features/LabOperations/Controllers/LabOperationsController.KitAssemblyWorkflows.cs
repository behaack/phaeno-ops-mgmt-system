namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record SaveKitAssemblyWorkflowRequest(string Name, IReadOnlyList<LabKitAssemblyStep> Steps,
    long? WorkflowVersion = null, Guid? WorkflowId = null);
public sealed record ApproveKitAssemblyWorkflowRequest(long WorkflowVersion, string? OverrideReason = null);
public sealed record RenameKitAssemblyWorkflowRequest(string Name, long WorkflowVersion);
public sealed record DiscardKitAssemblyWorkflowRevisionRequest(long WorkflowVersion);
public sealed record KitAssemblyComponentDto(Guid SupplierProductId, int Quantity, string Kind,
    string SupplierName, string ProductNumber, string ProductDescription);
public sealed record KitAssemblyRevisionDto(Guid Id, int Revision, string Status,
    IReadOnlyList<LabKitAssemblyStep> Steps,
    Guid AuthoredByUserId, DateTime AuthoredAtUtc, Guid? ApprovedByUserId, DateTime? ApprovedAtUtc);
public sealed record KitAssemblyWorkflowDto(Guid Id, string Name, long Version, IReadOnlyList<KitAssemblyRevisionDto> Revisions);

public sealed partial class LabOperationsController
{
    [HttpGet("kit-assembly/workflows")]
    public async Task<IReadOnlyList<KitAssemblyWorkflowDto>> ReadKitAssemblyWorkflows(CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor,
            LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        return await MapKitAssemblyWorkflowsAsync(ct);
    }

    [HttpPost("kit-assembly/workflows")]
    public async Task<KitAssemblyWorkflowDto> SaveKitAssemblyWorkflow(
        [FromBody] SaveKitAssemblyWorkflowRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.ProtocolAdministrator);
        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name) || name.Length > 160)
            throw Invalid("kit_workflow_name_invalid", "Enter a workflow name of 1 to 160 characters.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"kit-assembly-workflow:{request.WorkflowId}", ct);
        var steps = request.Steps;
        if (steps is null || steps.Count is < 1 or > 100 || steps.Any(s => s is null || s.StepKey == Guid.Empty
                || string.IsNullOrWhiteSpace(s.Name) || s.Name.Length > 160
                || string.IsNullOrWhiteSpace(s.Instructions) || s.Instructions.Length > 4000)
            || steps.Select(s => s.StepKey).Distinct().Count() != steps.Count)
            throw Invalid("kit_steps_invalid", "Define 1 to 100 distinct assembly instructions.");
        foreach (var step in steps) { await RequireIllustrationsAsync(step.Illustrations, ct); await RequireInstructionSourceAsync(step.CopiedFrom, "kit", ct); }
        var workflow = request.WorkflowId.HasValue
            ? await dbContext.LabKitAssemblyWorkflows.SingleOrDefaultAsync(item => item.Id == request.WorkflowId, ct) ?? throw Missing()
            : null;
        LabKitAssemblyWorkflowRevision revision;
        var now = DateTime.UtcNow;
        if (workflow is null)
        {
            workflow = new(name);
            revision = new(workflow.Id, 1, steps, actor.User.Id, now);
            dbContext.LabKitAssemblyWorkflows.Add(workflow);
            dbContext.LabKitAssemblyWorkflowRevisions.Add(revision);
        }
        else
        {
            if (request.WorkflowVersion != workflow.Version) throw Conflict("kit_workflow_changed", "This kit workflow changed. Refresh before editing it.");
            if (workflow.Name != name)
                throw Invalid("kit_workflow_name_separate", "Use Edit title to change the workflow name without creating a revision.");
            revision = await dbContext.LabKitAssemblyWorkflowRevisions
                .Where(item => item.WorkflowId == workflow.Id).OrderByDescending(item => item.Revision).FirstAsync(ct);
            if (revision.Status == LabKitAssemblyRevisionStatus.Draft)
            {
                revision.UpdateDraft(steps, actor.User.Id, now);
            }
            else
            {
                revision = new(workflow.Id, workflow.NextRevision(), steps, actor.User.Id, now);
                dbContext.LabKitAssemblyWorkflowRevisions.Add(revision);
            }
            dbContext.Entry(workflow).Property(item => item.Version).IsModified = true;
        }
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await MapKitAssemblyWorkflowsAsync(ct)).Single(item => item.Id == workflow.Id);
    }

    [HttpPut("kit-assembly/workflows/{id:guid}/title")]
    public async Task<KitAssemblyWorkflowDto> RenameKitAssemblyWorkflow(Guid id,
        [FromBody] RenameKitAssemblyWorkflowRequest request, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.ProtocolAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"kit-assembly-workflow-id:{id}", ct);
        var workflow = await dbContext.LabKitAssemblyWorkflows.SingleOrDefaultAsync(item => item.Id == id, ct)
            ?? throw Missing();
        if (workflow.Version != request.WorkflowVersion)
            throw Conflict("kit_workflow_changed", "This kit workflow changed. Refresh before editing its title.");
        try { workflow.SetName(request.Name); }
        catch (ArgumentException error) { throw Invalid("kit_workflow_name_invalid", error.Message); }
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await MapKitAssemblyWorkflowsAsync(ct)).Single(item => item.Id == id);
    }

    [HttpPost("kit-assembly/workflows/{id:guid}/revisions/{revisionId:guid}/discard")]
    public async Task<KitAssemblyWorkflowDto> DiscardKitAssemblyWorkflowRevision(Guid id, Guid revisionId,
        [FromBody] DiscardKitAssemblyWorkflowRevisionRequest request, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.ProtocolAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"kit-assembly-workflow-id:{id}", ct);
        var workflow = await dbContext.LabKitAssemblyWorkflows.SingleOrDefaultAsync(item => item.Id == id, ct)
            ?? throw Missing();
        if (workflow.Version != request.WorkflowVersion)
            throw Conflict("kit_workflow_changed", "This kit workflow changed. Refresh before discarding the draft.");
        var revision = await dbContext.LabKitAssemblyWorkflowRevisions
            .SingleOrDefaultAsync(item => item.Id == revisionId && item.WorkflowId == id, ct) ?? throw Missing();
        if (revision.Revision != workflow.LatestRevision || revision.Status != LabKitAssemblyRevisionStatus.Draft)
            throw Conflict("kit_workflow_draft_unavailable", "Only the latest Draft revision can be discarded.");
        revision.Discard();
        dbContext.Entry(workflow).Property(item => item.Version).IsModified = true;
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await MapKitAssemblyWorkflowsAsync(ct)).Single(item => item.Id == id);
    }

    [HttpPost("kit-assembly/workflows/{id:guid}/revisions/{revisionId:guid}/approve")]
    public async Task<KitAssemblyWorkflowDto> ApproveKitAssemblyWorkflow(Guid id, Guid revisionId,
        [FromBody] ApproveKitAssemblyWorkflowRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.ProtocolAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"kit-assembly-workflow-id:{id}", ct);
        var workflow = await dbContext.LabKitAssemblyWorkflows.SingleOrDefaultAsync(item => item.Id == id, ct)
            ?? throw Missing();
        if (workflow.Version != request.WorkflowVersion) throw Conflict("kit_workflow_changed", "Refresh the workflow before approval.");
        var revision = await dbContext.LabKitAssemblyWorkflowRevisions
            .SingleOrDefaultAsync(item => item.Id == revisionId && item.WorkflowId == id, ct) ?? throw Missing();
        if (revision.Revision != workflow.LatestRevision) throw Conflict("kit_workflow_superseded", "Approve the latest revision.");
        if (revision.AuthoredByUserId == actor.User.Id && !actor.IsPlatformAdmin)
            throw Conflict("kit_workflow_independent_approval_required", "A different administrator must approve this kit workflow.");
        foreach (var step in revision.Steps()) await RequireIllustrationsAsync(step.Illustrations, ct, verifyContents: true);
        try { revision.Approve(actor.User.Id, DateTime.UtcNow, request.OverrideReason, actor.IsPlatformAdmin); }
        catch (InvalidOperationException error) { throw Conflict("kit_workflow_approval_blocked", error.Message); }
        catch (ArgumentException error) { throw Invalid("kit_workflow_approval_invalid", error.Message); }
        dbContext.Entry(workflow).Property(item => item.Version).IsModified = true;
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await MapKitAssemblyWorkflowsAsync(ct)).Single(item => item.Id == id);
    }

    private async Task<IReadOnlyList<KitAssemblyWorkflowDto>> MapKitAssemblyWorkflowsAsync(CancellationToken ct)
    {
        var workflows = await dbContext.LabKitAssemblyWorkflows.AsNoTracking().ToListAsync(ct);
        var ids = workflows.Select(item => item.Id).ToArray();
        var revisions = await dbContext.LabKitAssemblyWorkflowRevisions.AsNoTracking()
            .Where(item => ids.Contains(item.WorkflowId)).OrderByDescending(item => item.Revision).ToListAsync(ct);
        return workflows.Select(workflow => new KitAssemblyWorkflowDto(workflow.Id, workflow.Name,
            workflow.Version, revisions.Where(item => item.WorkflowId == workflow.Id).Select(revision =>
                new KitAssemblyRevisionDto(revision.Id, revision.Revision, revision.Status.ToString(),
                    revision.Steps(), revision.AuthoredByUserId,
                    revision.AuthoredAtUtc, revision.ApprovedByUserId, revision.ApprovedAtUtc)).ToArray())).ToArray();
    }
}
