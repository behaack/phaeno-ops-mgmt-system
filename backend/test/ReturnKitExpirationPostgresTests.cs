namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ShipmentSpecificKitRequiresCatalogProductsAndRetainsExpirationEvidence()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync();
        var controller = scope.CreatePlatformWorkflowController();
        var legacy = new CreateSampleReturnKitRequest(1, "Reference tubes", "TUBE", null, "Reference shipper", "SHIPPER");
        var missingCatalog = await Assert.ThrowsAsync<OrderManagementException>(() => controller.CreateReturnKit(fixture.Shipment.Id, legacy, default));
        Assert.Equal("sample_return_kit_catalog_required", missingCatalog.ErrorCode);
        scope.ClearTrackedState();
        var request = await scope.CatalogReturnKitRequestAsync(legacy, canExpire: true);
        var missingDate = await Assert.ThrowsAsync<OrderManagementException>(() => controller.CreateReturnKit(fixture.Shipment.Id, request, default));
        Assert.Equal("sample_return_kit_expiration_required", missingDate.ErrorCode);
        scope.ClearTrackedState();
        var expires = new DateOnly(2028, 1, 31);
        await controller.CreateReturnKit(fixture.Shipment.Id, request with { ProductExpirations = [new(request.TubeSupplierProductId!.Value, expires)] }, default);
        scope.ClearTrackedState();
        var saved = await controller.Shipment(fixture.Shipment.Id, default);
        Assert.Equal(expires, saved.ReturnKit!.ProductExpirations!.Single(p => p.SupplierProductId == request.TubeSupplierProductId).ExpirationDate);
        var product = await scope.DbContext.LabSupplierProducts.SingleAsync(p => p.Id == request.TubeSupplierProductId);
        product.Update(product.ProductNumber, product.Description, product.ProductTypeId, true, false);
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        var retained = await controller.Shipment(fixture.Shipment.Id, default);
        Assert.True(retained.ReturnKit!.ProductExpirations!.Single(p => p.SupplierProductId == product.Id).CanExpire);
    }
}
