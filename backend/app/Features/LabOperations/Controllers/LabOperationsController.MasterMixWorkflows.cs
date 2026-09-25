namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record LabMasterMixWorkflowDto(Guid Id, string Name, string QuantityUnit,
    IReadOnlyList<LabReagentStep> Steps, IReadOnlyList<LabMasterMixRecipeIngredient> Ingredients,
    int Revision, string Status, Guid AuthoredByUserId,
    Guid? ApprovedByUserId, DateTime? ApprovedAtUtc, string? ApprovalOverrideReason,
    long Version, IReadOnlyList<LabMasterMixWorkflowRevision> Revisions);
public sealed record SaveLabMasterMixWorkflowRequest(string Name, string QuantityUnit,
    IReadOnlyList<LabReagentStep> Steps, IReadOnlyList<LabMasterMixRecipeIngredient> Ingredients, long Version = 0);
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
        var ingredients = await ResolveMasterMixRecipeIngredientsAsync(request.Ingredients, ct);
        try { workflow = new(request.Name, request.QuantityUnit, request.Steps, ingredients, actor.User.Id); }
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
        var ingredients = await ResolveMasterMixRecipeIngredientsAsync(request.Ingredients, ct);
        try { workflow.Revise(request.Name, request.QuantityUnit, request.Steps, ingredients, actor.User.Id); }
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

    private async Task<IReadOnlyList<LabMasterMixRecipeIngredient>> ResolveMasterMixRecipeIngredientsAsync(
        IReadOnlyList<LabMasterMixRecipeIngredient> requested, CancellationToken ct)
    {
        if (requested is null || requested.Count == 0) throw Invalid("master_mix_ingredients_required", "Add at least one recipe ingredient.");
        var ids = requested.Select(item => item.MaterialDefinitionId).Distinct().ToArray();
        var definitions = await dbContext.LabMaterialDefinitions.AsNoTracking()
            .Where(item => ids.Contains(item.Id) && item.IsActive).ToDictionaryAsync(item => item.Id, ct);
        if (definitions.Count != ids.Length) throw Invalid("master_mix_ingredient_unavailable", "Choose active source material definitions.");
        return requested.Select(item =>
        {
            if (item.QuantityText is null) return item with { Name = definitions[item.MaterialDefinitionId].Name };
            if (!ExactDecimalQuantity.TryParse(item.QuantityText, out var quantity))
                throw Invalid("master_mix_ingredient_quantity_invalid", "Enter an exact positive decimal recipe amount.");
            return item with { Name = definitions[item.MaterialDefinitionId].Name,
                Quantity = quantity, QuantityText = quantity.ToString(System.Globalization.CultureInfo.InvariantCulture) };
        }).ToArray();
    }

    private async Task RequireMasterMixRetirementSafeAsync(Guid workflowId, CancellationToken ct)
    {
        var idText = workflowId.ToString();
        var currentStepIds = await dbContext.LabSteps.AsNoTracking().Where(item => item.RetiredAtUtc == null)
            .Select(item => item.Id).ToArrayAsync(ct);
        var approvedSteps = await dbContext.LabStepVersions.AsNoTracking()
            .Where(item => currentStepIds.Contains(item.LabStepId) && item.Status == LabProtocolStatus.Approved
                && item.DefinitionJson.Contains(idText)).Select(item => item.DefinitionJson).ToArrayAsync(ct);
        if (approvedSteps.Any(json => ReferencesMasterMixWorkflow(json, workflowId)))
            throw Conflict("master_mix_workflow_in_use", "An approved Lab step still selects this master-mix workflow. Revise or retire that step before retiring the recipe.");
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
