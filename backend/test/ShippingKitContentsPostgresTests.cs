namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task KitDraftWaitsForIndividualUnitsAndAnOuterContainerThatFits()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var shipment = await scope.CreateShipmentAsync();
        var producer = await scope.DbContext.LabSuppliers.SingleAsync(item => item.IsInternalProducer);
        var sku = $"PACK-{scope.Suffix}-CAPACITY";
        var finished = new PSeq.Operations.Laboratory.Domain.LabSupplierProduct(producer.Id, sku,
            "Twenty-tube kit", PSeq.Operations.Laboratory.Domain.LabProductType.TransportationKitId);
        var contents = await scope.KitContentsAsync(20);
        var shipper = await scope.DbContext.LabSupplierProducts.SingleAsync(item => item.Id == contents[0].SupplierProductId);
        var tube = await scope.DbContext.LabSupplierProducts.SingleAsync(item => item.Id == contents[1].SupplierProductId);
        shipper.SetTubeCapacity(10);
        tube.SetDefaultQuantityUnit(null);
        scope.DbContext.LabSupplierProducts.Add(finished);
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();

        var catalog = scope.ContainerCatalog();
        var draft = await catalog.CreateAsync(new(sku, finished.Description, 20, DateTime.UtcNow.AddMinutes(-1),
            FinishedKitProductId: finished.Id, TemperatureControlInstructions: "Keep frozen.",
            SampleTypeDefinitionId: shipment.SampleType.Id, KitContents: contents), default);
        Assert.False(draft.IsActive);
        scope.ClearTrackedState();
        var unitError = await Assert.ThrowsAsync<OrderManagementException>(() => catalog.ActivateAsync(draft.Id, draft.Version, default));
        Assert.Contains("inventory units must be each", unitError.Message);
        scope.ClearTrackedState();

        tube = await scope.DbContext.LabSupplierProducts.SingleAsync(item => item.Id == contents[1].SupplierProductId);
        tube.SetDefaultQuantityUnit("each");
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        var capacityError = await Assert.ThrowsAsync<OrderManagementException>(() => catalog.ActivateAsync(draft.Id, draft.Version, default));
        Assert.Contains("tube capacity", capacityError.Message);
        scope.ClearTrackedState();

        shipper = await scope.DbContext.LabSupplierProducts.SingleAsync(item => item.Id == contents[0].SupplierProductId);
        shipper.SetTubeCapacity(20);
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        var active = await catalog.ActivateAsync(draft.Id, draft.Version, default);
        Assert.True(active.IsActive);
        Assert.Equal(20, active.TubeCapacity);
    }

    [PostgreSqlReferenceFact]
    public async Task KitWithoutApprovedWorkflowCanBeOrderedButCannotBePrepared()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var shipment = await scope.CreateShipmentAsync();
        var supplier = await scope.DbContext.LabSuppliers.SingleAsync(item => item.IsInternalProducer);
        var sku = $"PACK-{scope.Suffix}-PENDING-WORKFLOW";
        var product = new PSeq.Operations.Laboratory.Domain.LabSupplierProduct(supplier.Id, sku,
            "Kit awaiting assembly workflow", PSeq.Operations.Laboratory.Domain.LabProductType.TransportationKitId);
        scope.DbContext.LabSupplierProducts.Add(product);
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();

        var catalog = scope.ContainerCatalog();
        var contents = await scope.KitContentsAsync(20);
        var draft = await catalog.CreateAsync(new(sku, product.Description, 20, DateTime.UtcNow.AddMinutes(-1),
            FinishedKitProductId: product.Id, TemperatureControlInstructions: "Keep frozen.",
            SampleTypeDefinitionId: shipment.SampleType.Id, KitContents: contents), default);
        scope.ClearTrackedState();
        var released = await catalog.ActivateAsync(draft.Id, draft.Version, default);
        var current = await catalog.ReadAsync(released.Id, default);
        Assert.True(current.NewWorkReady);
        Assert.False(current.AssemblyWorkflowReady);
        Assert.Contains(await catalog.ReadCompatibleAsync([new(shipment.SampleType.Id)], default),
            item => item.Id == released.Id);

        var request = await scope.CatalogKitRequestAsync(released.Id);
        scope.ClearTrackedState();
        var error = await Assert.ThrowsAsync<OrderManagementException>(() => scope.StockController().Create(request, default));
        Assert.Contains("no approved assembly workflow", error.Message);
    }

    [PostgreSqlReferenceFact]
    public async Task KitSpecificationCanActivateWithoutAnActiveSampleTypeButStaysUnorderable()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var shipment = await scope.CreateShipmentAsync();
        var draft = await scope.CreateContainerAsync(shipment, 20, active: false);
        await scope.CreateConfigurationController().SetSampleTypeStatus(shipment.SampleType.Id,
            new(false, shipment.SampleType.Version), default);
        scope.ClearTrackedState();

        var catalog = scope.ContainerCatalog();
        var released = await catalog.ActivateAsync(draft.Id, draft.Version, default);
        Assert.True(released.IsActive);
        Assert.False((await catalog.ReadAsync(released.Id, default)).NewWorkReady);
        Assert.DoesNotContain(await TransportationKitDefinitionReadiness.ReadAsync(scope.DbContext, DateTime.UtcNow, default),
            item => item.DefinitionId == released.Id);
    }

    [PostgreSqlReferenceFact]
    public async Task HistoricalContainerRevisionCanBecomeActiveWithoutBecomingOrderable()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var shipment = await scope.CreateShipmentAsync();
        var type = new SampleShippingContainerType($"PACK-{scope.Suffix}-LEGACY");
        type.LinkSampleType(shipment.SampleType.Id, scope.PlatformUser.Id, DateTime.UtcNow);
        var draft = new SampleShippingContainerDefinition(type.Id, 1, null, "Earlier 20-tube container", 20,
            null, null, "Earlier packing notes", DateTime.UtcNow.AddDays(-1), null, true, 0,
            sampleTypeAnchorId: shipment.SampleType.Id);
        type.Definitions.Add(draft);
        scope.DbContext.SampleShippingContainerTypes.Add(type);
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();

        var unlinkedPending = await scope.ContainerCatalog().ReviseAsync(draft.Id,
            new(draft.Version, draft.CommonName, 20, DateTime.UtcNow, IsActive: false,
                TemperatureControlInstructions: "Keep frozen."), default);
        Assert.Null(unlinkedPending.SampleTypeAnchorId);
        var pending = await scope.ContainerCatalog().LinkSampleTypeAsync(unlinkedPending.Id,
            shipment.SampleType.Id, unlinkedPending.Version, scope.PlatformUser.Id, default);
        Assert.Equal(shipment.SampleType.Id, pending.SampleTypeAnchorId);
        scope.ClearTrackedState();
        var active = await scope.ContainerCatalog().ActivateAsync(pending.Id, pending.Version, default);
        Assert.True(active.IsActive);
        Assert.False((await scope.ContainerCatalog().ReadAsync(active.Id, default)).NewWorkReady);
        Assert.Empty(await scope.ContainerCatalog().ReadCompatibleAsync(
            [new ContainerSampleTypeContext(shipment.SampleType.Id)], default));
        scope.ClearTrackedState();
        var nextDraft = await scope.ContainerCatalog().ReviseAsync(active.Id,
            new(active.Version, active.CommonName, 20, DateTime.UtcNow, IsActive: false), default);
        var nextLinked = await scope.ContainerCatalog().LinkSampleTypeAsync(nextDraft.Id,
            shipment.SampleType.Id, nextDraft.Version, scope.PlatformUser.Id, default);
        var next = await scope.ContainerCatalog().ActivateAsync(nextLinked.Id, nextLinked.Version, default);
        Assert.True(next.IsActive);
        Assert.Equal(active.SampleTypeAnchorId, next.SampleTypeAnchorId);
        var stockError = await Assert.ThrowsAsync<OrderManagementException>(() => scope.StockController().Create(
            new(next.Id, Guid.NewGuid(), Guid.NewGuid(), null), default));
        Assert.Equal("stock_kit_conflict", stockError.ErrorCode);
        Assert.Contains("shipping dependencies are not ready", stockError.Message);
        Assert.Equal(3, await scope.DbContext.SampleShippingContainerDefinitions.AsNoTracking()
            .CountAsync(item => item.ContainerTypeId == type.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task InactiveKitRevisionKeepsPredecessorActiveUntilExplicitActivation()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var shipment = await scope.CreateShipmentAsync();
        var active = await scope.CreateContainerAsync(shipment, 20);
        var catalog = scope.ContainerCatalog();
        var unlinkedDraft = await catalog.ReviseAsync(active.Id, new(active.Version, active.CommonName, active.TubeCapacity,
            DateTime.UtcNow.AddMinutes(1), IsActive: false,
            AssemblyWorkflowRevisionId: Guid.NewGuid(),
            TemperatureControlInstructions: active.TemperatureControlInstructions), default);
        Assert.Null(unlinkedDraft.SampleTypeAnchorId);
        var draft = await catalog.LinkSampleTypeAsync(unlinkedDraft.Id, shipment.SampleType.Id,
            unlinkedDraft.Version, scope.PlatformUser.Id, default);
        Assert.Equal(active.AssemblyWorkflowRevisionId, draft.AssemblyWorkflowRevisionId);
        Assert.Equal(shipment.SampleType.Id, active.SampleTypeAnchorId);
        Assert.Equal(active.SampleTypeAnchorId, draft.SampleTypeAnchorId);
        scope.ClearTrackedState();
        var stillActive = await catalog.ReadAsync(active.Id, default);
        var savedDraft = await catalog.ReadAsync(draft.Id, default);
        Assert.Equal(stillActive.SampleTypeAnchorId, savedDraft.SampleTypeAnchorId);
        Assert.All(await catalog.ReadRevisionsAsync(draft.Id, default),
            revision => Assert.Equal(stillActive.SampleTypeAnchorId, revision.SampleTypeAnchorId));
        Assert.True(stillActive.IsActive);
        Assert.Null(stillActive.EffectiveTo);
        Assert.False(draft.IsActive);
        var pendingError = await Assert.ThrowsAsync<OrderManagementException>(() => catalog.ReviseAsync(draft.Id,
            new(draft.Version, draft.CommonName, draft.TubeCapacity, DateTime.UtcNow.AddMinutes(2),
                IsActive: true, AssemblyWorkflowRevisionId: draft.AssemblyWorkflowRevisionId,
                TemperatureControlInstructions: draft.TemperatureControlInstructions), default));
        Assert.Equal("shipping_container_invalid", pendingError.ErrorCode);
        Assert.Contains("Create a Draft specification", pendingError.Message);

        var activated = await catalog.ActivateAsync(draft.Id, draft.Version, default);
        scope.ClearTrackedState();
        var predecessor = await catalog.ReadAsync(active.Id, default);
        Assert.True(activated.IsActive);
        Assert.Equal(activated.EffectiveFrom, predecessor.EffectiveTo);
        Assert.True(predecessor.IsActive);
        Assert.Null(predecessor.DeactivatedAt);
        var stale = await Assert.ThrowsAsync<OrderManagementException>(() => catalog.ActivateAsync(draft.Id, draft.Version, default));
        Assert.Equal("shipping_container_conflict", stale.ErrorCode);
    }

    [PostgreSqlReferenceFact]
    public async Task KitCanBeLinkedToAnInactiveSampleTypeForLaterOrdering()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var shipment = await scope.CreateShipmentAsync();
        var type = new SampleShippingContainerType($"PACK-{scope.Suffix}-UNLINKED");
        var draft = new SampleShippingContainerDefinition(type.Id, 1, null, "Unlinked historical container", 20,
            null, null, "Earlier packing notes", DateTime.UtcNow.AddDays(-1), null, false, 0);
        type.Definitions.Add(draft);
        scope.DbContext.SampleShippingContainerTypes.Add(type);
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();

        var controller = scope.CreateConfigurationController();
        var inactive = await controller.SetSampleTypeStatus(shipment.SampleType.Id,
            new(false, shipment.SampleType.Version), default);
        scope.ClearTrackedState();
        var linked = await scope.ContainerCatalog().LinkSampleTypeAsync(draft.Id, shipment.SampleType.Id,
            draft.Version, scope.PlatformUser.Id, default);
        Assert.Equal(shipment.SampleType.Id, linked.SampleTypeAnchorId);
        Assert.False(inactive.IsActive);
        Assert.Null((await scope.DbContext.SampleShippingContainerTypes.AsNoTracking()
            .SingleAsync(item => item.Id == type.Id)).SampleTypeAnchorId);
    }

    [PostgreSqlReferenceFact]
    public async Task OneSampleTypeCanHaveManyKitDesignsButAKitCannotBeReassigned()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var shipment = await scope.CreateShipmentAsync();
        var first = await scope.CreateContainerAsync(shipment, 10);
        var second = await scope.CreateContainerAsync(shipment, 20);

        var matching = await scope.ContainerCatalog().ReadCompatibleAsync(
            [new ContainerSampleTypeContext(shipment.SampleType.Id)], default);
        Assert.Contains(matching, kit => kit.Id == first.Id);
        Assert.Contains(matching, kit => kit.Id == second.Id);

        var other = await scope.CreateConfigurationController().CreateSampleType(
            scope.SampleTypeRequest(DateTime.UtcNow.AddDays(-1), name: "Other RNA")
                with { Code = $"REF_{scope.Suffix}_OTHER", IsActive = false }, default);
        scope.ClearTrackedState();
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.ContainerCatalog()
            .LinkSampleTypeAsync(first.Id, other.Id, first.Version, scope.PlatformUser.Id, default));
        var unrelated = await scope.ContainerCatalog().ReadCompatibleAsync(
            [new ContainerSampleTypeContext(other.Id)], default);
        Assert.DoesNotContain(unrelated, kit => kit.DefinitionKey == first.DefinitionKey);
    }

    [PostgreSqlReferenceFact]
    public async Task KitSpecificationContentSnapshotSurvivesCatalogRename()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var shipment = await scope.CreateShipmentAsync();
        var definition = await scope.CreateContainerAsync(shipment, 10);
        var part = Assert.Single(definition.KitContents!, value => value.Kind == "Tube");
        var snapshot = SampleShippingContainerCatalogService.Snapshot(definition);

        var product = await scope.DbContext.LabSupplierProducts.SingleAsync(value => value.Id == part.SupplierProductId);
        product.Update(product.ProductNumber, "Renamed tube", product.ProductTypeId, true);
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();

        var saved = await scope.ContainerCatalog().ReadAsync(definition.Id, default);
        Assert.Equal(part.ProductDescription, Assert.Single(saved.KitContents!, value => value.SupplierProductId == part.SupplierProductId).ProductDescription);
        var revised = await scope.ContainerCatalog().ReviseAsync(definition.Id,
            new(definition.Version, definition.CommonName, definition.TubeCapacity,
                DateTime.UtcNow.AddMinutes(1), IsActive: false,
                AssemblyWorkflowRevisionId: definition.AssemblyWorkflowRevisionId,
                PackingInstructions: definition.PackingInstructions,
                TemperatureControlInstructions: definition.TemperatureControlInstructions,
                KitContents: definition.KitContents!.Select(item => new ShippingKitContentRequest(item.SupplierProductId, item.Quantity)).ToArray()), default);

        Assert.Equal("Renamed tube", Assert.Single(revised.KitContents!, value => value.SupplierProductId == part.SupplierProductId).ProductDescription);
        Assert.Contains(part.ProductDescription, snapshot);
        Assert.DoesNotContain("Renamed tube", snapshot);
    }
}
