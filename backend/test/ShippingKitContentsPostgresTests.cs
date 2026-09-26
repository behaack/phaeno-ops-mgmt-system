namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task HistoricalContainerWithoutFinishedProductCannotBeActivatedForNewOrders()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var shipment = await scope.CreateShipmentAsync();
        var type = new SampleShippingContainerType($"PACK-{scope.Suffix}-LEGACY");
        type.LinkSampleType(shipment.SampleType.Id, scope.PlatformUser.Id, DateTime.UtcNow);
        var draft = new SampleShippingContainerDefinition(type.Id, 1, null, "Earlier 20-tube container", 20,
            null, null, "Earlier packing notes", DateTime.UtcNow.AddDays(-1), null, true, 0);
        type.Definitions.Add(draft);
        scope.DbContext.SampleShippingContainerTypes.Add(type);
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();

        var error = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ContainerCatalog().ReviseAsync(draft.Id,
            new(draft.Version, draft.CommonName, 20, DateTime.UtcNow, IsActive: true,
                TemperatureControlInstructions: "Keep frozen."), default));
        Assert.Equal("shipping_container_invalid", error.ErrorCode);
        Assert.Contains("named Phaeno Transportation kit product", error.Message);
        var stockError = await Assert.ThrowsAsync<OrderManagementException>(() => scope.StockController().Create(
            new(draft.Id, Guid.NewGuid(), Guid.NewGuid(), null), default));
        Assert.Equal("stock_kit_invalid", stockError.ErrorCode);
        Assert.Equal(1, await scope.DbContext.SampleShippingContainerDefinitions.AsNoTracking()
            .CountAsync(item => item.ContainerTypeId == type.Id));
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
                with { Code = $"REF_{scope.Suffix}_OTHER" }, default);
        scope.ClearTrackedState();
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.ContainerCatalog()
            .LinkSampleTypeAsync(first.Id, other.Id, first.Version, scope.PlatformUser.Id, default));
        var unrelated = await scope.ContainerCatalog().ReadCompatibleAsync(
            [new ContainerSampleTypeContext(other.Id)], default);
        Assert.DoesNotContain(unrelated, kit => kit.DefinitionKey == first.DefinitionKey);
    }

    [PostgreSqlReferenceFact]
    public async Task KitBillOfMaterialsSnapshotSurvivesCatalogRename()
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
        var contents = saved.KitContents!.Select(value => new ShippingKitContentRequest(value.SupplierProductId, value.Quantity)).ToArray();
        var revised = await scope.ContainerCatalog().ReviseAsync(definition.Id,
            new(definition.Version, definition.CommonName, definition.TubeCapacity,
                DateTime.UtcNow.AddMinutes(1), IsActive: true, KitContents: contents,
                AssemblyWorkflowRevisionId: definition.AssemblyWorkflowRevisionId,
                PackingInstructions: definition.PackingInstructions,
                TemperatureControlInstructions: definition.TemperatureControlInstructions), default);

        Assert.Equal("Renamed tube", Assert.Single(revised.KitContents!, value => value.SupplierProductId == part.SupplierProductId).ProductDescription);
        Assert.Contains(part.ProductDescription, snapshot);
        Assert.DoesNotContain("Renamed tube", snapshot);
    }
}
