namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task StockEntryRequiresExpirationForAdditionalProductsAndFreezesPastDates()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var shipment = await scope.CreateShipmentAsync();
        var initial = await scope.KitContentsAsync(10);
        var supplier = await scope.SupplierCatalog().Create(new($"TEST-CATALOG-{scope.Suffix}-expiry"), default);
        var extra = await scope.SupplierCatalog().CreateProduct(supplier.Id,
            new("EXPIRES", "TEST additional expiring supply", LabProductType.ReagentId, CanExpire: true), default);
        Assert.True(extra.CanExpire);
        var definition = await scope.ContainerCatalog().CreateAsync(new($"PACK-{scope.Suffix}-EXPIRY", "Expiry contents", 10,
            DateTime.UtcNow.AddDays(-1), await scope.ContainerContextsAsync(shipment), IsActive: true,
            KitContents: initial.Concat([new ShippingKitContentRequest(extra.Id, 3)]).ToArray()), default);
        var request = await scope.CatalogKitRequestAsync(definition.Id);
        var stock = scope.StockController();
        await Assert.ThrowsAsync<OrderManagementException>(() => stock.Create(request, default));
        Assert.False(await scope.DbContext.SampleShippingStockKits.AnyAsync(kit => kit.ContainerDefinitionId == definition.Id));
        var pastDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-1);
        await Assert.ThrowsAsync<OrderManagementException>(() => stock.Create(request with
            { ProductExpirations = [new(extra.Id, pastDate), new(extra.Id, pastDate)] }, default));
        await Assert.ThrowsAsync<OrderManagementException>(() => stock.Create(request with
            { ProductExpirations = [new(Guid.NewGuid(), pastDate)] }, default));
        await Assert.ThrowsAsync<OrderManagementException>(() => stock.Create(request with
            { ProductExpirations = [new(extra.Id, DateOnly.MinValue)] }, default));
        var result = await stock.Create(request with { ProductExpirations = [new(extra.Id, pastDate)] }, default);
        var created = Assert.IsType<StockKitDto>(Assert.IsType<CreatedResult>(result.Result).Value);
        var saved = Assert.Single(created.ProductExpirations!, item => item.SupplierProductId == extra.Id);
        Assert.True(saved.CanExpire);
        Assert.Equal(pastDate, saved.ExpirationDate);
        Assert.Equal(initial.Count + 3, created.ProductExpirations!.Count); // Configured products plus actual tube and shipper.
        scope.ClearTrackedState();
        extra = (await scope.SupplierCatalog().List(default)).Single(s => s.Id == supplier.Id).Products.Single();
        await scope.SupplierCatalog().UpdateProduct(supplier.Id, extra.Id,
            new("RENAMED", extra.Description, extra.ProductTypeId, true, extra.Version, false), default);
        scope.ClearTrackedState();
        var history = Assert.Single((await stock.Read(created.Id, default)).ProductExpirations!, item => item.SupplierProductId == extra.Id);
        Assert.Equal("EXPIRES", history.ProductNumber);
        Assert.True(history.CanExpire);
        Assert.Equal(pastDate, history.ExpirationDate);
    }

    [PostgreSqlReferenceFact]
    public async Task KitContentsAllowAnyCatalogTypeAndQuantityAndPreserveRevisionSnapshots()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var shipment = await scope.CreateShipmentAsync();
        var initial = await scope.KitContentsAsync(10);
        var supplier = new LabSupplier($"TEST-CATALOG-{scope.Suffix}-{Guid.NewGuid():N}");
        var other = new LabSupplierProduct(supplier.Id, "EXTRA", "Synthetic additional product", LabProductType.ReagentId);
        scope.DbContext.AddRange(supplier, other);
        await scope.DbContext.SaveChangesAsync();
        var parts = initial.Concat([new ShippingKitContentRequest(other.Id, 3)]).ToArray();
        var catalog = scope.ContainerCatalog();
        var definition = await catalog.CreateAsync(new($"PACK-{scope.Suffix}-CONTENTS", "Flexible contents", 20,
            DateTime.UtcNow.AddDays(-1), await scope.ContainerContextsAsync(shipment), IsActive: true, KitContents: parts), default);
        var savedContents = Assert.IsAssignableFrom<IReadOnlyList<ShippingKitContentDto>>(definition.KitContents);
        Assert.Equal(new[] { 1, 10, 3 }, savedContents.Select(item => item.Quantity));
        Assert.Equal("Other", savedContents[2].Kind);
        Assert.NotEqual(savedContents[0].SupplierId, savedContents[2].SupplierId);
        var snapshot = SampleShippingContainerCatalogService.Snapshot(definition);
        other.Update("EXTRA-RENAMED", "Changed catalog description", other.ProductTypeId, true);
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        var saved = await catalog.ReadAsync(definition.Id, default);
        Assert.Equal("EXTRA", saved.KitContents![2].ProductNumber);
        var revised = await catalog.ReviseAsync(definition.Id, new(definition.Version, definition.CommonName, 20,
            DateTime.UtcNow, definition.Compatibilities, IsActive: true, KitContents: parts), default);
        Assert.Equal("EXTRA-RENAMED", revised.KitContents![2].ProductNumber);
        Assert.Contains("EXTRA", snapshot);
        Assert.DoesNotContain("EXTRA-RENAMED", snapshot);
        Assert.Equal("EXTRA", (await catalog.ReadAsync(definition.Id, default)).KitContents![2].ProductNumber);
    }

    [PostgreSqlReferenceFact]
    public async Task KitContentsRejectMissingDuplicateInactiveAndInvalidQuantityProducts()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var shipment = await scope.CreateShipmentAsync();
        var parts = await scope.KitContentsAsync(10);
        var request = new CreateSampleShippingContainerRequest($"PACK-{scope.Suffix}-VALIDATION", "Contents validation", 10,
            DateTime.UtcNow.AddDays(-1), await scope.ContainerContextsAsync(shipment), IsActive: true);
        var catalog = scope.ContainerCatalog();
        foreach (var invalid in new IReadOnlyList<ShippingKitContentRequest>[] { [], [parts[0], parts[0]], [new(parts[0].SupplierProductId, 0)], [new(Guid.NewGuid(), 1)] })
        {
            await Assert.ThrowsAsync<OrderManagementException>(() => catalog.CreateAsync(request with { KitContents = invalid }, default));
            scope.ClearTrackedState();
        }
        var product = await scope.DbContext.LabSupplierProducts.SingleAsync(item => item.Id == parts[0].SupplierProductId);
        product.Update(product.ProductNumber, product.Description, product.ProductTypeId, false);
        await scope.DbContext.SaveChangesAsync();
        await Assert.ThrowsAsync<OrderManagementException>(() => catalog.CreateAsync(request with { KitContents = parts }, default));
        scope.ClearTrackedState();
        var draft = await catalog.CreateAsync(request with { IsActive = false, KitContents = [] }, default);
        Assert.Empty(draft.KitContents!);
    }
}
