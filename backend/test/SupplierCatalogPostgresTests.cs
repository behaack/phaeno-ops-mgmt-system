namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task PhaenoCatalogKeepsDistinctReagentProductsAndFixedType()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var catalog = scope.SupplierCatalog();
            var producer = (await catalog.List(default)).Single(item => item.IsInternalProducer);
            var first = await catalog.CreateProduct(producer.Id,
                new($"TEST buffer {scope.Suffix}", "Buffer for testing", LabProductType.ReagentId,
                    DefaultQuantityUnit: "mL"), default);
            var second = await catalog.CreateProduct(producer.Id,
                new($"TEST enzyme {scope.Suffix}", "Enzyme for testing", LabProductType.ReagentId,
                    DefaultQuantityUnit: "µL"), default);
            Assert.NotEqual(first.Id, second.Id);
            Assert.NotEqual(first.MaterialDefinitionId, second.MaterialDefinitionId);
            Assert.Equal("Reagent", first.ProductTypeName);
            Assert.Equal("mL", (await scope.DbContext.LabMaterialDefinitions.SingleAsync(
                item => item.Id == first.MaterialDefinitionId)).DefaultQuantityUnit);

            var wrongType = await Assert.ThrowsAsync<OrderManagementException>(() =>
                catalog.CreateProduct(producer.Id, new("TEST wrong type", "Invalid", LabProductType.TubeId,
                    DefaultQuantityUnit: "each"), default));
            Assert.Equal("supplier_catalog_invalid", wrongType.ErrorCode);
            var changedUnit = await Assert.ThrowsAsync<OrderManagementException>(() =>
                catalog.UpdateProduct(producer.Id, first.Id,
                    new(first.ProductNumber, first.Description, LabProductType.ReagentId,
                        Version: first.Version, DefaultQuantityUnit: "µL"), default));
            Assert.Equal("reagent_unit_conflict", changedUnit.ErrorCode);

            var renamed = await catalog.UpdateProduct(producer.Id, first.Id,
                new($"TEST revised buffer {scope.Suffix}", first.Description, LabProductType.ReagentId,
                    Version: first.Version), default);
            Assert.Equal(renamed.ProductNumber, (await scope.DbContext.LabMaterialDefinitions.SingleAsync(
                item => item.Id == first.MaterialDefinitionId)).Name);
            var inactive = await catalog.UpdateProduct(producer.Id, first.Id,
                new(renamed.ProductNumber, renamed.Description, LabProductType.ReagentId,
                    IsActive: false, Version: renamed.Version), default);
            Assert.False((await scope.DbContext.LabMaterialDefinitions.SingleAsync(
                item => item.Id == inactive.MaterialDefinitionId)).IsActive);
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    [PostgreSqlReferenceFact]
    public async Task SupplierCatalogEnforcesAccessUniquenessSelectionAndFrozenKitHistory()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var catalog = scope.SupplierCatalog();
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.SupplierCatalog(customer: true).List(default));
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.SupplierCatalog(customer: true).Create(new("Forbidden"), default));
        var supplier = await catalog.Create(new($"TEST-CATALOG-{scope.Suffix}-catalog"), default);
        scope.ClearTrackedState();
        await Assert.ThrowsAsync<OrderManagementException>(() => catalog.Create(new(supplier.Name.ToLowerInvariant()), default));
        scope.ClearTrackedState();
        var missingUnit = await Assert.ThrowsAsync<OrderManagementException>(() =>
            catalog.CreateProduct(supplier.Id, new("NO-UNIT", "Missing inventory unit", LabProductType.TubeId), default));
        Assert.Equal("supplier_catalog_invalid", missingUnit.ErrorCode);
        var tube = await catalog.CreateProduct(supplier.Id, new("T-1", "Original tube description", LabProductType.TubeId, DefaultQuantityUnit: "each"), default);
        Assert.Equal("each", tube.DefaultQuantityUnit);
        var shipper = await catalog.CreateProduct(supplier.Id, new("B-1", "Original container description", LabProductType.ShippingContainerId, DefaultQuantityUnit: "each"), default);
        scope.ClearTrackedState();
        await Assert.ThrowsAsync<OrderManagementException>(() => catalog.CreateProduct(supplier.Id, new("t-1", "Duplicate", LabProductType.TubeId, DefaultQuantityUnit: "each"), default));
        scope.ClearTrackedState();
        await Assert.ThrowsAsync<OrderManagementException>(() => catalog.CreateProduct(supplier.Id, new("T-2", " ", LabProductType.TubeId, DefaultQuantityUnit: "each"), default));
        var fixture = await scope.CreateShipmentAsync(1);
        var size = await scope.CreateContainerAsync(fixture, 20);
        var stock = scope.StockController();
        await Assert.ThrowsAsync<OrderManagementException>(() => stock.Create(new(size.Id, shipper.Id, tube.Id, null), default));
        await Assert.ThrowsAsync<OrderManagementException>(() => stock.Create(new(size.Id, Guid.NewGuid(), shipper.Id, null), default));
        var result = await stock.Create(new(size.Id, tube.Id, shipper.Id, "LOT-A"), default);
        var kit = Assert.IsType<StockKitDto>(Assert.IsType<CreatedResult>(result.Result).Value);
        Assert.Equal("Original tube description", kit.TubeProductDescription);
        Assert.Equal("Original container description", kit.ShipperProductDescription);
        scope.ClearTrackedState();
        tube = (await catalog.List(default)).Single(s => s.Id == supplier.Id).Products.Single(p => p.Id == tube.Id);
        var changed = await catalog.UpdateProduct(supplier.Id, tube.Id, new("T-NEW", "Changed description", LabProductType.TubeId, false, tube.Version), default);
        scope.ClearTrackedState();
        await Assert.ThrowsAsync<OrderManagementException>(() => catalog.UpdateProduct(supplier.Id, tube.Id, new("T-OLD", "Stale edit", LabProductType.TubeId, true, tube.Version), default));
        scope.ClearTrackedState();
        await Assert.ThrowsAsync<OrderManagementException>(() => stock.Create(new(size.Id, tube.Id, shipper.Id, null), default));
        await catalog.UpdateProduct(supplier.Id, tube.Id, new(changed.ProductNumber, changed.Description, LabProductType.TubeId, true, changed.Version), default);
        scope.ClearTrackedState();
        await catalog.Update(supplier.Id, new(supplier.Name, false, supplier.Version), default);
        scope.ClearTrackedState();
        await Assert.ThrowsAsync<OrderManagementException>(() => stock.Create(new(size.Id, tube.Id, shipper.Id, null), default));
        var history = await stock.Read(kit.Id, default);
        Assert.Equal("T-1", history.TubeProductNumber);
        Assert.Equal("Original tube description", history.TubeProductDescription);
        Assert.Equal("LOT-A", history.TubeLotNumber);
        Assert.False((await catalog.List(default)).Single(s => s.Id == supplier.Id).IsActive);
    }

    [PostgreSqlReferenceFact]
    public async Task ProductTypesSupportReagentsWithoutEnablingTransportationUse()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var types = scope.ProductTypes();
        var seededReagent = (await types.List(default)).Single(type => type.Id == LabProductType.ReagentId);
        var protectedType = await Assert.ThrowsAsync<OrderManagementException>(() =>
            types.Update(seededReagent.Id, new("Other", seededReagent.Description, "Other", true,
                seededReagent.Version), default));
        Assert.Equal("reagent_type_protected", protectedType.ErrorCode);
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.ProductTypes(customer: true).Create(new("Forbidden", "Test", "Other"), default));
        var created = await types.Create(new($"TEST-TYPE-{scope.Suffix}", "TEST ONLY reagent category", "Other"), default);
        var supplier = await scope.SupplierCatalog().Create(new($"TEST-CATALOG-{scope.Suffix}-reagent"), default);
        try
        {
            scope.ClearTrackedState();
            await Assert.ThrowsAsync<OrderManagementException>(() => types.Create(new(created.Name.ToLowerInvariant(), "Duplicate", "Other"), default));
            scope.ClearTrackedState();
            var product = await scope.SupplierCatalog().CreateProduct(supplier.Id, new("R-1", "TEST ONLY reagent", created.Id, DefaultQuantityUnit: "mL"), default);
            Assert.Equal("Other", product.Kind);
            Assert.Equal(created.Name, product.ProductTypeName);
            scope.ClearTrackedState();
            await Assert.ThrowsAsync<OrderManagementException>(() => types.Update(created.Id, new(created.Name, created.Description, "Tube", true, created.Version), default));
            scope.ClearTrackedState();
            var inactive = await types.Update(created.Id, new(created.Name, "Updated description", "Other", false, created.Version), default);
            scope.ClearTrackedState();
            await Assert.ThrowsAsync<OrderManagementException>(() => scope.SupplierCatalog().CreateProduct(supplier.Id, new("R-2", "New reagent", created.Id, DefaultQuantityUnit: "mL"), default));
            scope.ClearTrackedState();
            var existing = await scope.SupplierCatalog().UpdateProduct(supplier.Id, product.Id, new("R-1", "Corrected reagent", created.Id, true, product.Version), default);
            Assert.False(existing.ProductTypeIsActive);
            await Assert.ThrowsAsync<OrderManagementException>(() => types.Update(created.Id, new(created.Name, "Stale", "Other", true, created.Version), default));
            scope.ClearTrackedState();
            await types.Update(created.Id, new(created.Name, inactive.Description, "Other", true, inactive.Version), default);
            var fixture = await scope.CreateShipmentAsync(1);
            var size = await scope.CreateContainerAsync(fixture, 20);
            await Assert.ThrowsAsync<OrderManagementException>(() => scope.StockController().Create(new(size.Id, product.Id, product.Id, null), default));
        }
        finally
        {
            scope.ClearTrackedState();
            await scope.DbContext.LabSupplierProducts.Where(p => p.SupplierId == supplier.Id).ExecuteDeleteAsync();
            await scope.DbContext.LabProductTypes.Where(t => t.Id == created.Id).ExecuteDeleteAsync();
        }
    }

    private sealed partial class ShippingTestScope
    {
        public LabProductTypesController ProductTypes(bool customer = false) => new(DbContext,
            new OrderRequestContext(DbContext, new FixedIdentityContext(customer ? customerIdentity : platformIdentity)))
            { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
        public LabSupplierCatalogController SupplierCatalog(bool customer = false) => new(DbContext,
            new OrderRequestContext(DbContext, new FixedIdentityContext(customer ? customerIdentity : platformIdentity)))
            { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
    }
}
