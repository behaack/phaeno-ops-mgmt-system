namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record LabMasterMixWorkflowDto(Guid Id, string Name, string QuantityUnit,
    IReadOnlyList<LabProtocolStepDefinition> Steps, IReadOnlyList<LabMasterMixRecipeIngredient> Ingredients,
    int Revision, string Status, Guid AuthoredByUserId,
    Guid? ApprovedByUserId, DateTime? ApprovedAtUtc, string? ApprovalOverrideReason,
    long Version, IReadOnlyList<LabMasterMixWorkflowRevision> Revisions);
public sealed record SaveLabMasterMixWorkflowRequest(string Name, string QuantityUnit,
    IReadOnlyList<LabProtocolStepDefinition> Steps, long Version = 0);
public sealed record DecideLabMasterMixWorkflowRequest(long Version, string? ApprovalOverrideReason = null);

public sealed partial class LabOperationsController
{
    private static LabMasterMixWorkflowDto MapMasterMixWorkflow(LabMasterMixWorkflow item) =>
        new(item.Id, item.Name, item.QuantityUnit, item.Steps(), item.Ingredients(), item.Revision,
            item.Status.ToString(), item.AuthoredByUserId, item.ApprovedByUserId,
            item.ApprovedAtUtc, item.ApprovalOverrideReason, item.Version, item.Revisions());

    [HttpGet("master-mix-workflows")]
    public async Task<IReadOnlyList<LabMasterMixWorkflowDto>> ListMasterMixWorkflows(CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor,
            LabRole.ProtocolAdministrator, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        return (await dbContext.LabMasterMixWorkflows.AsNoTracking().OrderBy(item => item.Name)
            .ToListAsync(ct)).Select(MapMasterMixWorkflow).ToArray();
    }

    [HttpPost("master-mix-workflows")]
    public async Task<LabMasterMixWorkflowDto> CreateMasterMixWorkflow(
        [FromBody] SaveLabMasterMixWorkflowRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct,
            LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            "master-mix-workflow-name", ct);
        LabMasterMixWorkflow workflow;
        var steps = await ResolveMasterMixStepsAsync(request.Steps, ct);
        try { workflow = new(request.Name, request.QuantityUnit, steps, actor.User.Id); }
        catch (ArgumentException error) { throw Invalid("master_mix_workflow_invalid", error.Message); }
        await RequireUniqueMasterMixWorkflowNameAsync(workflow.Name, null, ct);
        dbContext.LabMasterMixWorkflows.Add(workflow);
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return MapMasterMixWorkflow(workflow);
    }

    [HttpPut("master-mix-workflows/{id:guid}")]
    public async Task<LabMasterMixWorkflowDto> ReviseMasterMixWorkflow(Guid id,
        [FromBody] SaveLabMasterMixWorkflowRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct,
            LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"master-mix-workflow:{id}", ct);
        var workflow = await dbContext.LabMasterMixWorkflows.SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing();
        EnsureVersion(workflow.Version, request.Version);
        await SampleShippingPackingData.LockAsync(dbContext, "master-mix-workflow-name", ct);
        await RequireUniqueMasterMixWorkflowNameAsync(request.Name, id, ct);
        var steps = await ResolveMasterMixStepsAsync(request.Steps, ct);
        try { workflow.Revise(request.Name, request.QuantityUnit, steps, actor.User.Id); }
        catch (ArgumentException error) { throw Invalid("master_mix_workflow_invalid", error.Message); }
        catch (InvalidOperationException error) { throw Conflict("master_mix_workflow_unavailable", error.Message); }
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return MapMasterMixWorkflow(workflow);
    }

    [HttpPost("master-mix-workflows/{id:guid}/approve")]
    public async Task<LabMasterMixWorkflowDto> ApproveMasterMixWorkflow(Guid id,
        [FromBody] DecideLabMasterMixWorkflowRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct,
            LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"master-mix-workflow:{id}", ct);
        var workflow = await dbContext.LabMasterMixWorkflows.SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing();
        EnsureVersion(workflow.Version, request.Version);
        var ownApproval = workflow.AuthoredByUserId == actor.User.Id;
        foreach (var step in workflow.Steps()) { await RequireMasterMixReagentsAsync(step, ct); await RequireIllustrationsAsync(step.Illustrations, ct, verifyContents: true); }
        if (ownApproval && !actor.IsPlatformAdmin)
            throw Conflict("master_mix_independent_approval_required", "A different administrator must approve this workflow.");
        try { workflow.Approve(actor.User.Id, DateTime.UtcNow,
            ownApproval && actor.IsPlatformAdmin, request.ApprovalOverrideReason); }
        catch (ArgumentException error) { throw Invalid("master_mix_approval_invalid", error.Message); }
        catch (InvalidOperationException error) { throw Conflict("master_mix_approval_unavailable", error.Message); }
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return MapMasterMixWorkflow(workflow);
    }

    [HttpPost("master-mix-workflows/{id:guid}/retire")]
    public async Task<LabMasterMixWorkflowDto> RetireMasterMixWorkflow(Guid id,
        [FromBody] DecideLabMasterMixWorkflowRequest request, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct,
            LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"master-mix-workflow:{id}", ct);
        var workflow = await dbContext.LabMasterMixWorkflows.SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing();
        EnsureVersion(workflow.Version, request.Version);
        await RequireMasterMixRetirementSafeAsync(id, ct);
        Execute(workflow.Retire);
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return MapMasterMixWorkflow(workflow);
    }

    private async Task RequireUniqueMasterMixWorkflowNameAsync(string name, Guid? exceptId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(name)) throw Invalid("master_mix_name_required", "Name the master-mix workflow.");
        if (await dbContext.LabMasterMixWorkflows.AnyAsync(item =>
            item.Id != exceptId && item.Status != LabMasterMixWorkflowStatus.Retired && item.Name.ToUpper() == name.Trim().ToUpper(), ct))
            throw Conflict("master_mix_workflow_name_taken", "A current master-mix workflow already has this name.");
    }

    private async Task<IReadOnlyList<LabProtocolStepDefinition>> ResolveMasterMixStepsAsync(
        IReadOnlyList<LabProtocolStepDefinition> steps, CancellationToken ct)
    {
        if (steps is null || steps.Count is < 1 or > 100 || steps.Any(s => s is null) || steps.Select(s => s.Key).Distinct().Count() != steps.Count)
            throw Invalid("master_mix_steps_required", "Define 1 to 100 distinct master-mix instructions.");
        var definition = new LabProtocolDefinition { SchemaVersion = 1, PreparationBatchEnabled = true, Steps = steps };
        Execute(() => LabProtocolDefinition.Parse(definition.ToJson()));
        foreach (var source in steps)
        {
            Execute(() => LabMasterMixDefinition.ValidateStep(source));
            await RequireMasterMixReagentsAsync(source, ct);
            await RequireIllustrationsAsync(source.Illustrations, ct);
            await RequireInstructionSourceAsync(source.CopiedFrom, "masterMix", ct);
        }
        return steps;
    }

    private async Task RequireMasterMixReagentsAsync(LabProtocolStepDefinition step, CancellationToken ct)
    {
        foreach (var field in step.Captures.Where(field => field.Type == "material"))
        {
            var material = field.Material!;
            if (material.ProductId is Guid productId)
            {
                if (!await dbContext.LabSupplierProducts.AnyAsync(product => product.Id == productId && product.IsActive
                    && product.ProductTypeId == LabProductType.ReagentId
                    && dbContext.LabSuppliers.Any(supplier => supplier.Id == product.SupplierId && supplier.IsActive && !supplier.IsInternalProducer)
                    && dbContext.LabProductTypes.Any(type => type.Id == product.ProductTypeId && type.IsActive), ct))
                    throw Invalid("master_mix_reagent_required", "Choose an active purchased Reagent product.");
            }
            else if (material.MaterialDefinitionId is Guid definitionId)
            {
                if (!await dbContext.LabMaterialDefinitions.AnyAsync(definition => definition.Id == definitionId
                    && definition.IsActive && definition.Kind == LabMaterialLotKind.PreparedReagent, ct))
                    throw Invalid("master_mix_reagent_required", "Choose an active internally prepared reagent.");
            }
            else throw Invalid("master_mix_reagent_required", "Master-mix entries require a reagent identity and lot tracking.");
        }
    }

    private async Task RequireMasterMixRetirementSafeAsync(Guid workflowId, CancellationToken ct)
    {
        var currentProtocols = await dbContext.LabProtocols.AsNoTracking().Where(p => p.RetiredAtUtc == null).Select(p => p.Id).ToArrayAsync(ct);
        var productionPins = dbContext.LabServiceWorkflowStages.Where(stage => dbContext.LabServiceWorkflowVersions
                .Any(version => version.Id == stage.LabServiceWorkflowVersionId && version.Status == LabServiceWorkflowStatus.Production))
            .Select(stage => stage.LabProtocolVersionId);
        var definitions = await dbContext.LabProtocolVersions.AsNoTracking()
            .Where(v => (currentProtocols.Contains(v.LabProtocolId) && (v.Status == LabProtocolStatus.Approved || v.Status == LabProtocolStatus.Active)
                    || productionPins.Contains(v.Id))).Select(v => v.DefinitionJson).ToArrayAsync(ct);
        if (definitions.Any(json => ReferencesMasterMixWorkflow(json, workflowId)))
            throw Conflict("master_mix_workflow_in_use", "An approved protocol still selects this master mix. Revise or retire the protocol before retiring the recipe.");
    }

    private static bool ReferencesMasterMixWorkflow(string json, Guid workflowId)
    {
        try { return ReferencedMasterMixWorkflowIds(LabProtocolDefinition.Parse(json)).Contains(workflowId); }
        catch (JsonException) { return false; }
    }

    private static IReadOnlyCollection<Guid> ReferencedMasterMixWorkflowIds(LabProtocolDefinition definition) =>
        definition.Steps.SelectMany(step => step.Captures)
            .Select(capture => capture.Material?.MasterMixWorkflowId)
            .OfType<Guid>().Distinct().ToArray();
}
