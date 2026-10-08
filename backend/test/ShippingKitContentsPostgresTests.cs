namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task KitDraftCanReplaceContentsRepeatedlyWhileRejectingAStaleVersion()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var shipment = await scope.CreateShipmentAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var sku = $"PACK-{scope.Suffix}-DRAFT-EDIT";
            var contents = await scope.KitContentsAsync(20);
            var product = await scope.DbContext.LabSupplierProducts.SingleAsync(item => item.Id == contents[0].SupplierProductId);
            var catalog = scope.ContainerCatalog();
            var draft = await catalog.CreateAsync(new(sku, "Editable RNA kit", 20, DateTime.UtcNow.AddMinutes(-1),
                ShippingContainerProductId: contents[0].SupplierProductId, TemperatureControlInstructions: "Keep frozen.",
                SampleTypeDefinitionId: shipment.SampleType.Id, KitContents: contents), default);
            scope.ClearTrackedState();
            var replacement = contents.Select(item => item.Quantity == 20 ? item with { Quantity = 19 } : item).ToArray();
            var request = new EditSampleShippingContainerDraftRequest(draft.Version, "Edited kit", 19,
                draft.EffectiveFrom, draft.EffectiveTo, draft.DisplayOrder, shipment.SampleType.Id,
                TemperatureControlInstructions: "Keep frozen.", KitContents: replacement);
            var first = await catalog.EditDraftAsync(draft.Id, request, default);
            Assert.Equal(draft.Id, first.Id);
            Assert.Equal(draft.Revision, first.Revision);
            Assert.True(first.Version > draft.Version);
            scope.ClearTrackedState();
            var saved = await catalog.ReadAsync(draft.Id, default);
            Assert.Equal(19, saved.TubeCapacity);
            Assert.Equal(19, Assert.Single(saved.KitContents!, item => item.Kind == "Tube").Quantity);
            Assert.Equal(1, Assert.Single(saved.KitContents!, item => item.Kind == "ShippingContainer").Quantity);
            var stale = await Assert.ThrowsAsync<OrderManagementException>(() => catalog.EditDraftAsync(draft.Id, request, default));
            Assert.Contains("This Draft changed", stale.Message);
            scope.ClearTrackedState();
            var second = await catalog.EditDraftAsync(draft.Id, request with { Version = saved.Version, KitContents = contents, TubeCapacity = 20 }, default);
            Assert.Equal(draft.Revision, second.Revision);
            Assert.True(second.Version > saved.Version);
            scope.ClearTrackedState();
            var reloaded = await catalog.ReadAsync(draft.Id, default);
            Assert.Equal(20, Assert.Single(reloaded.KitContents!, item => item.Kind == "Tube").Quantity);
            Assert.Equal(2, await scope.DbContext.Set<ShippingKitContent>().CountAsync(item => item.ContainerDefinitionId == draft.Id));
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    [PostgreSqlReferenceFact]
    public async Task KitDraftWaitsForIndividualUnitsAndAnOuterContainerThatFits()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var shipment = await scope.CreateShipmentAsync();
        var sku = $"PACK-{scope.Suffix}-CAPACITY";
        var contents = await scope.KitContentsAsync(20);
        var shipper = await scope.DbContext.LabSupplierProducts.SingleAsync(item => item.Id == contents[0].SupplierProductId);
        var tube = await scope.DbContext.LabSupplierProducts.SingleAsync(item => item.Id == contents[1].SupplierProductId);
        shipper.SetTubeCapacity(20);
        tube.SetDefaultQuantityUnit("box");
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();

        var catalog = scope.ContainerCatalog();
        var draft = await catalog.CreateAsync(new(sku, "Twenty-tube RNA kit", 20, DateTime.UtcNow.AddMinutes(-1),
            ShippingContainerProductId: shipper.Id, TemperatureControlInstructions: "Keep frozen.",
            SampleTypeDefinitionId: shipment.SampleType.Id, KitContents: contents), default);
        Assert.False(draft.IsActive);
        scope.ClearTrackedState();
        var unitError = await Assert.ThrowsAsync<OrderManagementException>(() => catalog.ActivateAsync(draft.Id, draft.Version, default));
        Assert.Contains("inventory units must be each", unitError.Message);
        scope.ClearTrackedState();

        tube = await scope.DbContext.LabSupplierProducts.SingleAsync(item => item.Id == contents[1].SupplierProductId);
        tube.SetDefaultQuantityUnit("each");
        shipper = await scope.DbContext.LabSupplierProducts.SingleAsync(item => item.Id == contents[0].SupplierProductId);
        shipper.SetTubeCapacity(10);
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        var capacityError = await Assert.ThrowsAsync<OrderManagementException>(() => catalog.ActivateAsync(draft.Id, draft.Version, default));
        Assert.Contains("must hold at least", capacityError.Message);
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
        var sku = $"PACK-{scope.Suffix}-PENDING-WORKFLOW";
        var catalog = scope.ContainerCatalog();
        var contents = await scope.KitContentsAsync(20);
        var draft = await catalog.CreateAsync(new(sku, "Editable RNA kit", 20, DateTime.UtcNow.AddMinutes(-1),
            ShippingContainerProductId: contents[0].SupplierProductId, TemperatureControlInstructions: "Keep frozen.",
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
        Assert.Contains("Choose an approved assembly workflow", error.Message);
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
    public async Task InactiveKitRevisionKeepsPredecessorActiveUntilExplicitActivation()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var shipment = await scope.CreateShipmentAsync();
        var active = await scope.CreateContainerAsync(shipment, 20);
        var catalog = scope.ContainerCatalog();
        var unlinkedDraft = await catalog.ReviseAsync(active.Id, new(active.Version, active.CommonName, active.TubeCapacity,
            DateTime.UtcNow.AddMinutes(1), IsActive: false,
            AssemblyWorkflowId: active.AssemblyWorkflowId,
            TemperatureControlInstructions: active.TemperatureControlInstructions), default);
        Assert.Null(unlinkedDraft.SampleTypeAnchorId);
        var draft = await catalog.LinkSampleTypeAsync(unlinkedDraft.Id, shipment.SampleType.Id,
            unlinkedDraft.Version, scope.PlatformUser.Id, default);
        Assert.Equal(active.AssemblyWorkflowId, draft.AssemblyWorkflowId);
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
                IsActive: true, AssemblyWorkflowId: draft.AssemblyWorkflowId,
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
        var draft = await scope.CreateContainerAsync(shipment, 20, active: false);
        scope.ClearTrackedState();

        var controller = scope.CreateConfigurationController();
        var inactive = await controller.SetSampleTypeStatus(shipment.SampleType.Id,
            new(false, shipment.SampleType.Version), default);
        scope.ClearTrackedState();
        var linked = await scope.ContainerCatalog().LinkSampleTypeAsync(draft.Id, shipment.SampleType.Id,
            draft.Version, scope.PlatformUser.Id, default);
        Assert.Equal(shipment.SampleType.Id, linked.SampleTypeAnchorId);
        Assert.False(inactive.IsActive);
        Assert.Equal(shipment.SampleType.Id, (await scope.DbContext.SampleShippingContainerDefinitions.AsNoTracking()
            .SingleAsync(item => item.Id == draft.Id)).SampleTypeAnchorId);
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
                AssemblyWorkflowId: definition.AssemblyWorkflowId,
                TemperatureControlInstructions: definition.TemperatureControlInstructions,
                KitContents: definition.KitContents!.Select(item => new ShippingKitContentRequest(item.SupplierProductId, item.Quantity)).ToArray()), default);

        Assert.Equal("Renamed tube", Assert.Single(revised.KitContents!, value => value.SupplierProductId == part.SupplierProductId).ProductDescription);
        Assert.Contains(part.ProductDescription, snapshot);
        Assert.DoesNotContain("Renamed tube", snapshot);
    }
}
