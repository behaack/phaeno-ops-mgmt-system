namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record OrderableTransportationKit(Guid DefinitionId, Guid ContainerTypeId, Guid SampleTypeAnchorId,
    bool AssemblyWorkflowReady);

/// <summary>One new-work gate shared by the Sample type picker and kit recommendations.</summary>
public static class TransportationKitDefinitionReadiness
{
    public static async Task<IReadOnlyList<OrderableTransportationKit>> ReadAsync(
        PSeqOperationsDbContext db, DateTime at, CancellationToken ct)
    {
        var candidates = await db.SampleShippingContainerDefinitions.AsNoTracking()
            .Where(item => item.IsActive && item.EffectiveFrom <= at
                && (!item.EffectiveTo.HasValue || item.EffectiveTo > at)
                && item.SampleTypeAnchorId.HasValue
                && item.ShippingContainerProductId.HasValue
                && item.TubeCapacity > 0 && item.TemperatureControlInstructions != null
                && item.TemperatureControlInstructions != "")
            .Select(item => new
            {
                item.Id, item.ContainerTypeId, item.SampleTypeAnchorId,
                item.ShippingContainerProductId, item.AssemblyWorkflowId, item.TubeCapacity
            }).ToArrayAsync(ct);
        if (candidates.Length == 0) return [];
        var definitionIds = candidates.Select(item => item.Id).ToArray();
        var requiredContents = await db.Set<ShippingKitContent>().AsNoTracking()
            .Where(item => definitionIds.Contains(item.ContainerDefinitionId))
            .Select(item => new { item.ContainerDefinitionId, item.SupplierProductId, item.Kind, item.Quantity })
            .ToArrayAsync(ct);
        var contentsByDefinition = requiredContents.GroupBy(item => item.ContainerDefinitionId)
            .ToDictionary(group => group.Key, group => group.ToArray());

        var anchorIds = candidates.Select(item => item.SampleTypeAnchorId!.Value).Distinct().ToArray();
        var sampleFamilies = await db.SampleTypeDefinitions.AsNoTracking()
            .Where(item => anchorIds.Contains(item.Id))
            .Select(item => new { item.Id, item.DefinitionKey }).ToArrayAsync(ct);
        var familyByAnchor = sampleFamilies.ToDictionary(item => item.Id, item => item.DefinitionKey);
        var familyKeys = sampleFamilies.Select(item => item.DefinitionKey).Distinct().ToArray();
        var effectiveSamples = await db.SampleTypeDefinitions.AsNoTracking()
            .Where(item => familyKeys.Contains(item.DefinitionKey) && item.IsActive
                && item.EffectiveFrom <= at && (!item.EffectiveTo.HasValue || item.EffectiveTo > at))
            .Select(item => new { item.DefinitionKey, item.Revision, item.ShippingProcedureId,
                item.MinimumSampleAmount, item.SampleAmountUnit }).ToArrayAsync(ct);
        var currentSamples = effectiveSamples.GroupBy(item => item.DefinitionKey)
            .Select(group => group.OrderByDescending(item => item.Revision).First()).ToArray();
        var currentSampleByFamily = currentSamples.ToDictionary(item => item.DefinitionKey);
        var selectedProcedureIds = currentSamples.Where(item => item.ShippingProcedureId.HasValue)
            .Select(item => item.ShippingProcedureId!.Value).Distinct().ToArray();
        var selectedProcedures = await db.SampleShippingProcedures.AsNoTracking()
            .Where(item => selectedProcedureIds.Contains(item.Id))
            .Select(item => new { item.Id, item.DefinitionKey }).ToArrayAsync(ct);
        var procedureKeyById = selectedProcedures.ToDictionary(item => item.Id, item => item.DefinitionKey);
        var procedureKeys = selectedProcedures.Select(item => item.DefinitionKey).Distinct().ToArray();
        var activeProcedureKeys = (await db.SampleShippingProcedures.AsNoTracking()
            .Where(item => procedureKeys.Contains(item.DefinitionKey) && item.IsActive)
            .Select(item => item.DefinitionKey).ToArrayAsync(ct)).ToHashSet();
        var readySampleFamilies = currentSamples.Where(item => item.ShippingProcedureId.HasValue
                && procedureKeyById.TryGetValue(item.ShippingProcedureId.Value, out var procedureKey)
                && activeProcedureKeys.Contains(procedureKey))
            .Select(item => item.DefinitionKey).ToHashSet();

        var finishedIds = candidates.Select(item => item.ShippingContainerProductId!.Value).Distinct().ToArray();
        var selectedWorkflowIds = candidates.Where(item => item.AssemblyWorkflowId.HasValue).Select(item => item.AssemblyWorkflowId!.Value).Distinct().ToArray();
        var workflows = await db.LabKitAssemblyWorkflows.AsNoTracking()
            .Where(item => selectedWorkflowIds.Contains(item.Id))
            .Select(item => new { item.Id }).ToArrayAsync(ct);
        var workflowIds = workflows.Select(item => item.Id).ToArray();
        var approved = await db.LabKitAssemblyWorkflowRevisions.AsNoTracking()
            .Where(item => workflowIds.Contains(item.WorkflowId) && item.Status == LabKitAssemblyRevisionStatus.Approved)
            .ToArrayAsync(ct);
        var latestByWorkflow = approved.GroupBy(item => item.WorkflowId)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(item => item.Revision).First());
        var productIds = finishedIds.Concat(requiredContents.Select(item => item.SupplierProductId)).Distinct().ToArray();
        var activeProducts = await (from product in db.LabSupplierProducts.AsNoTracking()
            join supplier in db.LabSuppliers.AsNoTracking() on product.SupplierId equals supplier.Id
            join type in db.LabProductTypes.AsNoTracking() on product.ProductTypeId equals type.Id
            where productIds.Contains(product.Id) && product.ProductTypeId != LabProductType.SequencingServiceId && product.IsActive && supplier.IsActive && type.IsActive
            select new { product.Id, product.ProductTypeId, product.DefaultQuantityUnit, product.TubeCapacity,
                product.MaximumSampleAmount, product.SampleAmountUnit,
                supplier.IsInternalProducer, type.KitUse }).ToArrayAsync(ct);
        var activeProductById = activeProducts.ToDictionary(item => item.Id);
        var finishedProducts = activeProducts.Where(item => item.ProductTypeId == LabProductType.ShippingContainerId)
            .ToDictionary(item => item.Id);
        return candidates.Where(item => familyByAnchor.TryGetValue(item.SampleTypeAnchorId!.Value, out var sampleKey)
                && readySampleFamilies.Contains(sampleKey)
                && currentSampleByFamily.TryGetValue(sampleKey, out var sampleType)
                && sampleType.MinimumSampleAmount is > 0
                && contentsByDefinition.TryGetValue(item.Id, out var required)
                && required.Count(component => component.Kind == ShippingKitContentKind.Tube) == 1
                && activeProductById.TryGetValue(required.Single(component => component.Kind == ShippingKitContentKind.Tube).SupplierProductId, out var tubeProduct)
                && tubeProduct.MaximumSampleAmount >= sampleType.MinimumSampleAmount
                && string.Equals(tubeProduct.SampleAmountUnit, sampleType.SampleAmountUnit, StringComparison.Ordinal)
                && finishedProducts.TryGetValue(item.ShippingContainerProductId!.Value, out var product)
                && !product.IsInternalProducer
                && string.Equals(product.DefaultQuantityUnit, "each", StringComparison.OrdinalIgnoreCase)
                && product.TubeCapacity >= item.TubeCapacity)
            .Select(item =>
            {
                var assemblyReady = item.AssemblyWorkflowId.HasValue
                        && latestByWorkflow.TryGetValue(item.AssemblyWorkflowId.Value, out var workflowRevision)
                        && workflowRevision.Steps().Count == 1
                        && contentsByDefinition.TryGetValue(item.Id, out var contents)
                        && contents.Length >= 2
                        && contents.Select(component => component.SupplierProductId).Distinct().Count() == contents.Length
                        && contents.Count(component => component.Kind == ShippingKitContentKind.Tube) == 1
                        && contents.Single(component => component.Kind == ShippingKitContentKind.Tube).Quantity == item.TubeCapacity
                        && contents.Count(component => component.Kind == ShippingKitContentKind.ShippingContainer) == 1
                        && contents.Single(component => component.Kind == ShippingKitContentKind.ShippingContainer).Quantity == 1
                        && (!item.ShippingContainerProductId.HasValue || contents.Single(component => component.Kind == ShippingKitContentKind.ShippingContainer).SupplierProductId == item.ShippingContainerProductId)
                        && activeProductById.TryGetValue(contents.Single(component => component.Kind == ShippingKitContentKind.ShippingContainer).SupplierProductId, out var shipper)
                        && shipper.TubeCapacity >= item.TubeCapacity
                        && contents.All(component => component.Quantity > 0
                            && activeProductById.TryGetValue(component.SupplierProductId, out var product)
                            && !product.IsInternalProducer
                            && product.KitUse.ToString() == component.Kind.ToString()
                            && (component.Kind == ShippingKitContentKind.Other
                                || string.Equals(product.DefaultQuantityUnit, "each", StringComparison.OrdinalIgnoreCase)));
                return new OrderableTransportationKit(item.Id, item.ContainerTypeId,
                    item.SampleTypeAnchorId!.Value, assemblyReady);
            }).ToArray();
    }
}
