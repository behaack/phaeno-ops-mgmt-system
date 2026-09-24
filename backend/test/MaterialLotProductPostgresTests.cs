namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task LegacyProductCanSetFutureUnitWithoutRewritingHistoricalLots()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var db = scope.DbContext;
            var supplier = new LabSupplier($"TEST legacy-unit vendor {scope.Suffix}");
            var product = new LabSupplierProduct(supplier.Id, "LEGACY-UNIT", "TEST legacy reagent", LabProductType.ReagentId);
            var definition = new LabMaterialDefinition($"legacy-unit-{scope.Suffix}", "TEST legacy material", LabMaterialLotKind.SupplierLot);
            var location = new LabStorageLocation($"TEST legacy-unit shelf {scope.Suffix}");
            var historical = new LabMaterialLot(LabMaterialLotKind.SupplierLot, definition.Id,
                $"OLD-{scope.Suffix}", supplier.Id, null, location.Id, 10, "uL");
            historical.AssignProduct(product.Id, supplier.Id);
            db.AddRange(supplier, product, definition, location, historical);
            await db.SaveChangesAsync();

            var controller = scope.CreateLabController();
            var request = new CreateMaterialLotRequest("SupplierLot", null, null,
                $"NEW-{scope.Suffix}", supplier.Id, null, location.Id, null,
                null, 5, "mL", null, product.Id);
            var unconfigured = await Assert.ThrowsAsync<OrderManagementException>(() =>
                controller.CreateMaterialLot(request, default));
            Assert.Equal("material_product_unit_unconfigured", unconfigured.ErrorCode);

            var catalog = scope.SupplierCatalog();
            var configured = await catalog.UpdateProduct(supplier.Id, product.Id,
                new(product.ProductNumber, product.Description, product.ProductTypeId,
                    Version: product.Version, DefaultQuantityUnit: "mL"), default);
            Assert.Equal("mL", configured.DefaultQuantityUnit);
            var received = await controller.CreateMaterialLot(request, default);
            Assert.Equal("mL", received.QuantityUnit);
            Assert.Equal("uL", (await db.LabMaterialLots.AsNoTracking()
                .SingleAsync(item => item.Id == historical.Id)).QuantityUnit);
            var currentProductVersion = await db.LabSupplierProducts.AsNoTracking()
                .Where(item => item.Id == product.Id).Select(item => item.Version).SingleAsync();
            var conflict = await Assert.ThrowsAsync<OrderManagementException>(() =>
                catalog.UpdateProduct(supplier.Id, product.Id,
                    new(product.ProductNumber, product.Description, product.ProductTypeId,
                        Version: currentProductVersion, DefaultQuantityUnit: "uL"), default));
            Assert.Equal("product_unit_conflicts_with_lots", conflict.ErrorCode);
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    [PostgreSqlReferenceFact]
    public async Task ExpiringProductRequiresANewLotDateAndFlagChangesPreserveExistingLots()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var db = scope.DbContext;
            var supplier = new LabSupplier($"TEST expiry vendor {scope.Suffix}");
            var product = new LabSupplierProduct(supplier.Id, "EXPIRING", "TEST reagent", LabProductType.ReagentId, true);
            product.SetDefaultQuantityUnit("mL");
            var definition = new LabMaterialDefinition($"expiry-{scope.Suffix}", "TEST expiry material", LabMaterialLotKind.SupplierLot);
            var location = new LabStorageLocation($"TEST expiry storage {scope.Suffix}");
            var legacy = new LabMaterialLot(LabMaterialLotKind.SupplierLot, definition.Id, "LEGACY-UNKNOWN", supplier.Id, null, location.Id, 25, "mL");
            db.AddRange(supplier, product, definition, location, legacy);
            await db.SaveChangesAsync();
            var request = new CreateMaterialLotRequest("SupplierLot", definition.Id, null, "DATED", supplier.Id, null, location.Id, null, null, 50, "mL", null, product.Id);
            var controller = scope.CreateLabController();
            var directReagent = await Assert.ThrowsAsync<OrderManagementException>(() =>
                controller.CreateMaterialLot(request with { Kind = "PreparedReagent" }, default));
            Assert.Equal("reagent_manufacturing_run_required", directReagent.ErrorCode);
            var missing = await Assert.ThrowsAsync<OrderManagementException>(() => controller.CreateMaterialLot(request, default));
            Assert.Equal("material_expiration_required", missing.ErrorCode);
            var expiry = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(30);
            var dated = await controller.CreateMaterialLot(request with { ExpirationOrRetestDate = expiry }, default);
            Assert.Equal(expiry, dated.ExpirationOrRetestDate);
            var assigned = await controller.AssignLotProduct(legacy.Id, new(product.Id, legacy.Version), default);
            Assert.Null(assigned.ExpirationOrRetestDate);
            product.Update(product.ProductNumber, product.Description, product.ProductTypeId, true, false);
            await db.SaveChangesAsync();
            var undated = await controller.CreateMaterialLot(request with { LotNumber = "OPTIONAL" }, default);
            Assert.Null(undated.ExpirationOrRetestDate);
            Assert.Equal(expiry, (await db.LabMaterialLots.AsNoTracking().SingleAsync(lot => lot.Id == dated.Id)).ExpirationOrRetestDate);
            Assert.Null((await db.LabMaterialLots.AsNoTracking().SingleAsync(lot => lot.Id == legacy.Id)).ExpirationOrRetestDate);
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    [PostgreSqlReferenceFact]
    public async Task MaterialLotProductAssignmentValidatesCatalogAndPreservesStock()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var db = scope.DbContext; var controller = scope.CreateLabController();
            var supplier = new LabSupplier($"TEST material vendor {scope.Suffix}");
            var otherSupplier = new LabSupplier($"TEST other vendor {scope.Suffix}");
            var type = new LabProductType($"TEST material type {scope.Suffix}", "TEST ONLY", LabSupplierProductKind.Other);
            var product = new LabSupplierProduct(supplier.Id, "REAGENT", "TEST reagent", type.Id);
            product.SetDefaultQuantityUnit("mL");
            var wrongProduct = new LabSupplierProduct(otherSupplier.Id, "OTHER", "TEST wrong vendor", type.Id);
            var definition = new LabMaterialDefinition($"material-{scope.Suffix}", "TEST material", LabMaterialLotKind.SupplierLot);
            var location = new LabStorageLocation($"TEST storage {scope.Suffix}");
            var legacy = new LabMaterialLot(LabMaterialLotKind.SupplierLot, definition.Id, "LEGACY", supplier.Id, null, location.Id, 25, "mL");
            db.AddRange(supplier, otherSupplier, type, product, wrongProduct, definition, location, legacy); await db.SaveChangesAsync();
            var request = new CreateMaterialLotRequest("SupplierLot", null, null, "NEW", supplier.Id, null, location.Id, null, null, 50, "mL", null, product.Id);
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.CreateMaterialLot(request with { SupplierProductId = null }, default));
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.CreateMaterialLot(request with { SupplierProductId = wrongProduct.Id }, default));
            var wrongUnit = await Assert.ThrowsAsync<OrderManagementException>(() =>
                controller.CreateMaterialLot(request with { QuantityUnit = "uL" }, default));
            Assert.Equal("material_product_unit_mismatch", wrongUnit.ErrorCode);
            var created = await controller.CreateMaterialLot(request, default);
            Assert.Equal(product.Id, created.SupplierProductId);
            Assert.Equal(product.ProductNumber, created.ProductName);
            Assert.NotEqual(definition.Id, created.MaterialDefinitionId);
            Assert.Equal($"product-{product.Id:N}", created.MaterialKey);
            var next = await controller.CreateMaterialLot(request with { LotNumber = "NEXT" }, default);
            Assert.Equal(created.MaterialDefinitionId, next.MaterialDefinitionId);
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.AssignLotProduct(legacy.Id, new(product.Id, legacy.Version - 1), default));
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.AssignLotProduct(legacy.Id, new(wrongProduct.Id, legacy.Version), default));
            var assigned = await controller.AssignLotProduct(legacy.Id, new(product.Id, legacy.Version), default);
            Assert.Equal(product.Id, assigned.SupplierProductId);
            Assert.Equal(25, assigned.AvailableQuantity);
            Assert.Equal("Pending", assigned.QcDisposition);
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.AssignLotProduct(legacy.Id, new(product.Id, assigned.Version), default));
            Assert.False(await db.LabMaterialConsumptions.AnyAsync(c => c.LabMaterialLotId == legacy.Id));
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    [PostgreSqlReferenceFact]
    public async Task StorageLocationSettingsPreserveReferencedNamesAndExcludeInactiveLocations()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var db = scope.DbContext;
            var controller = scope.CreateLabController();
            var location = await controller.CreateStorageLocation(new($"TEST storage settings {scope.Suffix}"), default);
            Assert.Contains(await controller.ListStorageLocations(default), item => item.Id == location.Id);
            var renamed = await controller.UpdateStorageLocation(location.Id,
                new($"TEST renamed storage {scope.Suffix}", true, location.Version), default);
            var stale = await Assert.ThrowsAsync<OrderManagementException>(() =>
                controller.UpdateStorageLocation(location.Id, new("Stale name", true, location.Version), default));
            Assert.Equal("concurrency_conflict", stale.ErrorCode);
            var supplier = new LabSupplier($"TEST storage supplier {scope.Suffix}");
            var product = new LabSupplierProduct(supplier.Id, "STORAGE", "TEST reagent", LabProductType.ReagentId);
            product.SetDefaultQuantityUnit("mL");
            db.AddRange(supplier, product);
            await db.SaveChangesAsync();
            var lot = await controller.CreateMaterialLot(new("SupplierLot", null, null, "STORAGE-LOT",
                supplier.Id, null, location.Id, null, null, 1, "mL", null, product.Id), default);
            var inUse = await Assert.ThrowsAsync<OrderManagementException>(() =>
                controller.UpdateStorageLocation(location.Id, new("Changed", true, renamed.Version), default));
            Assert.Equal("storage_location_in_use", inUse.ErrorCode);
            var inactive = await controller.UpdateStorageLocation(location.Id,
                new(renamed.Name, false, renamed.Version), default);
            Assert.Equal(1, inactive.MaterialLotCount);
            Assert.False(inactive.IsActive);
            Assert.Equal(renamed.Name, (await db.LabStorageLocations.AsNoTracking()
                .SingleAsync(item => item.Id == lot.StorageLocationId)).Name);
            var rejected = await Assert.ThrowsAsync<OrderManagementException>(() =>
                controller.CreateMaterialLot(new("SupplierLot", null, null, "SECOND",
                    supplier.Id, null, location.Id, null, null, 1, "mL", null, product.Id), default));
            Assert.Equal("material_storage_invalid", rejected.ErrorCode);
            var active = await controller.UpdateStorageLocation(location.Id,
                new(renamed.Name, true, inactive.Version), default);
            Assert.True(active.IsActive);
            var duplicate = await Assert.ThrowsAsync<OrderManagementException>(() =>
                controller.CreateStorageLocation(new(renamed.Name.ToLowerInvariant()), default));
            Assert.Equal("storage_location_duplicate", duplicate.ErrorCode);
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    [PostgreSqlReferenceFact]
    public async Task PreparedMaterialConfigurationResolvesIdentityAndRejectsManualTracking()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var controller = scope.CreateLabController();
            var definition = new LabMaterialDefinition($"prepared-{scope.Suffix}", "TEST prepared buffer", LabMaterialLotKind.PreparedReagent);
            scope.DbContext.Add(definition); await scope.DbContext.SaveChangesAsync();
            var step = await controller.CreateLabStep(new($"TEST prepared {scope.Suffix}", null), default);
            var source = LabStepTests.Definition();
            var capture = new LabProtocolCaptureDefinition { Key = "buffer", Label = "Buffer", Type = "material", Unit = "µL", Required = true, Scope = "batch", IncludeTracking = true, Material = new("Wrong client name", MaterialDefinitionId: definition.Id) };
            var configured = source with { Steps = [source.Steps[0] with { Captures = [capture] }] };
            var saved = await controller.SaveLabStepVersion(step.Id, new(configured.ToJson(), step.Version), default);
            var material = LabProtocolDefinition.Parse(saved.Versions.Single().DefinitionJson).Steps[0].Captures[0].Material!;
            Assert.Equal(definition.Name, material.Name); Assert.Equal(definition.Id, material.MaterialDefinitionId); Assert.Null(material.ProductId);
            var manual = configured with { Steps = [source.Steps[0] with { Captures = [capture with { Material = new("Manual") }] }] };
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.SaveLabStepVersion(step.Id, new(manual.ToJson(), saved.Version), default));
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }
}
