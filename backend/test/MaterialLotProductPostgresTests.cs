namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
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
            var wrongProduct = new LabSupplierProduct(otherSupplier.Id, "OTHER", "TEST wrong vendor", type.Id);
            var definition = new LabMaterialDefinition($"material-{scope.Suffix}", "TEST material", LabMaterialLotKind.SupplierLot);
            var location = new LabStorageLocation($"TEST storage {scope.Suffix}");
            var legacy = new LabMaterialLot(LabMaterialLotKind.SupplierLot, definition.Id, "LEGACY", supplier.Id, null, location.Id, 25, "mL");
            db.AddRange(supplier, otherSupplier, type, product, wrongProduct, definition, location, legacy); await db.SaveChangesAsync();
            var request = new CreateMaterialLotRequest("SupplierLot", definition.Id, null, "NEW", supplier.Id, null, location.Id, null, null, 50, "mL", null, product.Id);
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.CreateMaterialLot(request with { SupplierProductId = null }, default));
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.CreateMaterialLot(request with { SupplierProductId = wrongProduct.Id }, default));
            var created = await controller.CreateMaterialLot(request, default);
            Assert.Equal(product.Id, created.SupplierProductId);
            Assert.Equal(product.ProductNumber, created.ProductName);
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
