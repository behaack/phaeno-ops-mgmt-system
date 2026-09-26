namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record OrderableTransportationKit(Guid DefinitionId, Guid ContainerTypeId, Guid SampleTypeAnchorId);

/// <summary>One new-work gate shared by the Sample type picker and kit recommendations.</summary>
public static class TransportationKitDefinitionReadiness
{
    public static async Task<IReadOnlyList<OrderableTransportationKit>> ReadAsync(
        PSeqOperationsDbContext db, DateTime at, CancellationToken ct)
    {
        var candidates = await db.SampleShippingContainerDefinitions.AsNoTracking()
            .Where(item => item.IsActive && item.EffectiveFrom <= at
                && (!item.EffectiveTo.HasValue || item.EffectiveTo > at)
                && item.ContainerType.SampleTypeAnchorId.HasValue
                && item.ContainerType.FinishedKitProductId.HasValue
                && item.AssemblyWorkflowRevisionId.HasValue && item.KitContents.Any())
            .Select(item => new
            {
                item.Id, item.ContainerTypeId, item.ContainerType.SampleTypeAnchorId,
                item.ContainerType.FinishedKitProductId, item.AssemblyWorkflowRevisionId,
                item.TemperatureControlInstructions
            }).ToArrayAsync(ct);
        if (candidates.Length == 0) return [];

        var definitionIds = candidates.Select(item => item.Id).ToArray();
        var contents = await db.Set<ShippingKitContent>().AsNoTracking()
            .Where(item => definitionIds.Contains(item.ContainerDefinitionId))
            .Select(item => new { item.ContainerDefinitionId, item.SupplierProductId }).ToArrayAsync(ct);
        var productIds = contents.Select(item => item.SupplierProductId)
            .Concat(candidates.Select(item => item.FinishedKitProductId!.Value)).Distinct().ToArray();
        var activeProducts = await (from product in db.LabSupplierProducts.AsNoTracking()
            join supplier in db.LabSuppliers.AsNoTracking() on product.SupplierId equals supplier.Id
            join type in db.LabProductTypes.AsNoTracking() on product.ProductTypeId equals type.Id
            where productIds.Contains(product.Id) && product.IsActive && supplier.IsActive && type.IsActive
            select new { product.Id, product.ProductTypeId, supplier.IsInternalProducer }).ToArrayAsync(ct);
        var activeProductIds = activeProducts.Select(item => item.Id).ToHashSet();
        var finishedProductIds = activeProducts.Where(item => item.IsInternalProducer
            && item.ProductTypeId == LabProductType.TransportationKitId).Select(item => item.Id).ToHashSet();
        var workflowIds = candidates.Select(item => item.AssemblyWorkflowRevisionId!.Value).Distinct().ToArray();
        var approvedWorkflows = await (from revision in db.LabKitAssemblyWorkflowRevisions.AsNoTracking()
            join workflow in db.LabKitAssemblyWorkflows.AsNoTracking() on revision.WorkflowId equals workflow.Id
            where workflowIds.Contains(revision.Id) && revision.Status == LabKitAssemblyRevisionStatus.Approved
            select new { revision.Id, workflow.FinishedKitProductId }).ToArrayAsync(ct);
        var workflowProductById = approvedWorkflows.ToDictionary(item => item.Id, item => item.FinishedKitProductId);
        var contentIdsByDefinition = contents.GroupBy(item => item.ContainerDefinitionId)
            .ToDictionary(group => group.Key, group => group.Select(item => item.SupplierProductId).ToArray());

        return candidates.Where(item => !string.IsNullOrWhiteSpace(item.TemperatureControlInstructions)
                && finishedProductIds.Contains(item.FinishedKitProductId!.Value)
                && workflowProductById.TryGetValue(item.AssemblyWorkflowRevisionId!.Value, out var productId)
                && productId == item.FinishedKitProductId
                && contentIdsByDefinition.TryGetValue(item.Id, out var contentIds)
                && contentIds.All(activeProductIds.Contains))
            .Select(item => new OrderableTransportationKit(item.Id, item.ContainerTypeId,
                item.SampleTypeAnchorId!.Value)).ToArray();
    }
}
