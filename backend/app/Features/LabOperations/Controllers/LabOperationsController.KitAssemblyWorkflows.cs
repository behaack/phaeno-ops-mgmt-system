namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record KitAssemblyComponentRequest(Guid SupplierProductId, int Quantity);
public sealed record SaveKitAssemblyWorkflowRequest(Guid FinishedKitProductId, IReadOnlyList<Guid> StepVersionIds,
    IReadOnlyList<KitAssemblyComponentRequest> Components, long? WorkflowVersion = null);
public sealed record ApproveKitAssemblyWorkflowRequest(long WorkflowVersion, string? OverrideReason = null);
public sealed record KitAssemblyComponentDto(Guid SupplierProductId, int Quantity, string Kind,
    string SupplierName, string ProductNumber, string ProductDescription);
public sealed record KitAssemblyRevisionDto(Guid Id, int Revision, string Status,
    IReadOnlyList<LabKitAssemblyStep> Steps, IReadOnlyList<KitAssemblyComponentDto> Components,
    Guid AuthoredByUserId, DateTime AuthoredAtUtc, Guid? ApprovedByUserId, DateTime? ApprovedAtUtc);
public sealed record KitAssemblyWorkflowDto(Guid Id, Guid FinishedKitProductId, string ProductSku,
    string ProductName, long Version, IReadOnlyList<KitAssemblyRevisionDto> Revisions);

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
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"kit-assembly-workflow:{request.FinishedKitProductId}", ct);
        var product = await (from p in dbContext.LabSupplierProducts.AsNoTracking()
            join s in dbContext.LabSuppliers.AsNoTracking() on p.SupplierId equals s.Id
            where p.Id == request.FinishedKitProductId && p.IsActive && s.IsActive && s.IsInternalProducer
                && p.ProductTypeId == LabProductType.TransportationKitId
            select p).SingleOrDefaultAsync(ct)
            ?? throw Invalid("kit_product_unavailable", "Choose an active Phaeno transportation kit product.");
        if (request.StepVersionIds is null || request.StepVersionIds.Count is < 1 or > 100
            || request.StepVersionIds.Distinct().Count() != request.StepVersionIds.Count)
            throw Invalid("kit_steps_invalid", "Choose 1 to 100 distinct approved Lab step versions.");
        var versions = await dbContext.LabStepVersions.AsNoTracking()
            .Where(item => request.StepVersionIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, ct);
        if (versions.Count != request.StepVersionIds.Count || versions.Values.Any(item => item.Status != LabProtocolStatus.Active))
            throw Invalid("kit_steps_unavailable", "Each assembly step must be an active, approved Lab step version.");
        var steps = new List<LabKitAssemblyStep>();
        foreach (var id in request.StepVersionIds)
        {
            var definition = LabProtocolDefinition.Parse(versions[id].DefinitionJson);
            var step = definition.Steps.Single();
            if (step.Captures.Count != 0 || step.InputMaterials.Count != 0 || step.PreparedOutputs.Count != 0
                || step.EquipmentTypes.Count != 0 || step.QcGate is not null || step.AttachmentRequired)
                throw Invalid("kit_step_scope_invalid", "Select instruction-only Lab steps for physical kit assembly. Sample, batch, and tube captures cannot run in this context.");
            steps.Add(new(id, step.Name, step.Instructions));
        }
        if (request.Components is null || request.Components.Count is < 2 or > 100
            || request.Components.Any(item => item.Quantity < 1)
            || request.Components.Select(item => item.SupplierProductId).Distinct().Count() != request.Components.Count)
            throw Invalid("kit_bom_invalid", "List each required component product once with a positive whole-number quantity.");
        var componentIds = request.Components.Select(item => item.SupplierProductId).ToArray();
        var components = await (from p in dbContext.LabSupplierProducts.AsNoTracking()
            join s in dbContext.LabSuppliers.AsNoTracking() on p.SupplierId equals s.Id
            join t in dbContext.LabProductTypes.AsNoTracking() on p.ProductTypeId equals t.Id
            where componentIds.Contains(p.Id) && p.IsActive && s.IsActive && !s.IsInternalProducer && t.IsActive
            select new { p.Id, p.DefaultQuantityUnit, t.KitUse }).ToDictionaryAsync(item => item.Id, ct);
        if (components.Count != componentIds.Length)
            throw Invalid("kit_bom_product_unavailable", "Every component must be an active purchased product.");
        if (request.Components.Count(item => components[item.SupplierProductId].KitUse == LabSupplierProductKind.Tube) != 1
            || request.Components.Count(item => components[item.SupplierProductId].KitUse == LabSupplierProductKind.ShippingContainer && item.Quantity == 1) != 1)
            throw Invalid("kit_bom_structure_invalid", "Choose exactly one tube product and one outer shipper product with quantity one.");
        if (request.Components.Any(item => components[item.SupplierProductId].KitUse is LabSupplierProductKind.Tube or LabSupplierProductKind.ShippingContainer
            && !string.Equals(components[item.SupplierProductId].DefaultQuantityUnit, "each", StringComparison.OrdinalIgnoreCase)))
            throw Invalid("kit_bom_unit_invalid", "Tube and outer shipper products must use the inventory unit each.");
        var workflow = await dbContext.LabKitAssemblyWorkflows.SingleOrDefaultAsync(item => item.FinishedKitProductId == product.Id, ct);
        LabKitAssemblyWorkflowRevision revision;
        var now = DateTime.UtcNow;
        if (workflow is null)
        {
            workflow = new(product.Id);
            revision = new(workflow.Id, 1, steps, actor.User.Id, now);
            dbContext.LabKitAssemblyWorkflows.Add(workflow);
            dbContext.LabKitAssemblyWorkflowRevisions.Add(revision);
        }
        else
        {
            if (request.WorkflowVersion != workflow.Version) throw Conflict("kit_workflow_changed", "This kit workflow changed. Refresh before editing it.");
            revision = await dbContext.LabKitAssemblyWorkflowRevisions.Include(item => item.Components)
                .Where(item => item.WorkflowId == workflow.Id).OrderByDescending(item => item.Revision).FirstAsync(ct);
            if (revision.Status == LabKitAssemblyRevisionStatus.Draft)
            {
                revision.UpdateDraft(steps, actor.User.Id, now);
                dbContext.LabKitAssemblyComponents.RemoveRange(revision.Components);
                revision.Components.Clear();
            }
            else
            {
                revision = new(workflow.Id, workflow.NextRevision(), steps, actor.User.Id, now);
                dbContext.LabKitAssemblyWorkflowRevisions.Add(revision);
            }
            dbContext.Entry(workflow).Property(item => item.Version).IsModified = true;
        }
        foreach (var (line, position) in request.Components.Select((item, index) => (item, index)))
            revision.Components.Add(new(revision.Id, line.SupplierProductId, line.Quantity,
                components[line.SupplierProductId].KitUse.ToString(), position));
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await MapKitAssemblyWorkflowsAsync(ct)).Single(item => item.FinishedKitProductId == product.Id);
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
        var revision = await dbContext.LabKitAssemblyWorkflowRevisions.Include(item => item.Components)
            .SingleOrDefaultAsync(item => item.Id == revisionId && item.WorkflowId == id, ct) ?? throw Missing();
        if (revision.Revision != workflow.LatestRevision) throw Conflict("kit_workflow_superseded", "Approve the latest revision.");
        if (revision.AuthoredByUserId == actor.User.Id && !actor.IsPlatformAdmin)
            throw Conflict("kit_workflow_independent_approval_required", "A different administrator must approve this kit workflow.");
        var product = await (from p in dbContext.LabSupplierProducts.AsNoTracking()
            join s in dbContext.LabSuppliers.AsNoTracking() on p.SupplierId equals s.Id
            where p.Id == workflow.FinishedKitProductId && p.IsActive && s.IsActive && s.IsInternalProducer
                && p.ProductTypeId == LabProductType.TransportationKitId
            select p.Id).SingleOrDefaultAsync(ct);
        if (product == Guid.Empty)
            throw Conflict("kit_product_unavailable", "Reactivate the Phaeno kit product before approving its workflow.");
        var stepIds = revision.Steps().Select(item => item.LabStepVersionId).ToArray();
        var activeSteps = await dbContext.LabStepVersions.AsNoTracking()
            .CountAsync(item => stepIds.Contains(item.Id) && item.Status == LabProtocolStatus.Active, ct);
        if (activeSteps != stepIds.Length)
            throw Conflict("kit_steps_unavailable", "Every assembly step must still be active and approved.");
        var componentIds = revision.Components.Select(item => item.SupplierProductId).ToArray();
        var activeComponents = await (from p in dbContext.LabSupplierProducts.AsNoTracking()
            join s in dbContext.LabSuppliers.AsNoTracking() on p.SupplierId equals s.Id
            join t in dbContext.LabProductTypes.AsNoTracking() on p.ProductTypeId equals t.Id
            where componentIds.Contains(p.Id) && p.IsActive && s.IsActive && !s.IsInternalProducer && t.IsActive
            select new { p.Id, p.DefaultQuantityUnit, t.KitUse }).ToDictionaryAsync(item => item.Id, ct);
        if (activeComponents.Count != componentIds.Length || revision.Components.Any(item =>
            !activeComponents.TryGetValue(item.SupplierProductId, out var component)
            || component.KitUse.ToString() != item.Kind
            || component.KitUse is LabSupplierProductKind.Tube or LabSupplierProductKind.ShippingContainer
                && !string.Equals(component.DefaultQuantityUnit, "each", StringComparison.OrdinalIgnoreCase)))
            throw Conflict("kit_components_unavailable", "Every approved component must still be active, keep its kit role, and use a valid inventory unit.");
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
        var revisions = await dbContext.LabKitAssemblyWorkflowRevisions.AsNoTracking().Include(item => item.Components)
            .Where(item => ids.Contains(item.WorkflowId)).OrderByDescending(item => item.Revision).ToListAsync(ct);
        var productIds = workflows.Select(item => item.FinishedKitProductId)
            .Concat(revisions.SelectMany(item => item.Components.Select(part => part.SupplierProductId))).Distinct().ToArray();
        var products = await (from p in dbContext.LabSupplierProducts.AsNoTracking()
            join s in dbContext.LabSuppliers.AsNoTracking() on p.SupplierId equals s.Id
            where productIds.Contains(p.Id)
            select new { p.Id, p.ProductNumber, p.Description, SupplierName = s.Name })
            .ToDictionaryAsync(item => item.Id, ct);
        return workflows.Select(workflow => new KitAssemblyWorkflowDto(workflow.Id, workflow.FinishedKitProductId,
            products[workflow.FinishedKitProductId].ProductNumber, products[workflow.FinishedKitProductId].Description,
            workflow.Version, revisions.Where(item => item.WorkflowId == workflow.Id).Select(revision =>
                new KitAssemblyRevisionDto(revision.Id, revision.Revision, revision.Status.ToString(),
                    revision.Steps(), revision.Components.OrderBy(item => item.Position).Select(item =>
                        new KitAssemblyComponentDto(item.SupplierProductId, item.Quantity, item.Kind,
                            products[item.SupplierProductId].SupplierName, products[item.SupplierProductId].ProductNumber,
                            products[item.SupplierProductId].Description)).ToArray(), revision.AuthoredByUserId,
                    revision.AuthoredAtUtc, revision.ApprovedByUserId, revision.ApprovedAtUtc)).ToArray())).ToArray();
    }
}
