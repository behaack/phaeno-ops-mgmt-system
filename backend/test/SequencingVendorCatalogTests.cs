namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Services;

public class SequencingVendorSnapshotTests
{
    [Fact]
    public void VendorAddressOwnershipAndSnapshotArePreservedThroughDispatch()
    {
        var vendor = new LabSupplier("SIMULATED vendor");
        var service = new LabSupplierProduct(vendor.Id, "SIMULATED service", "Test service", LabProductType.SequencingServiceId);
        var address = Address(vendor.Id, "Dock A", "1 Test Street");
        var sendout = new LabNgsSendout(Guid.NewGuid(), vendor.Name, null, "{}", null);
        Assert.Throws<ArgumentException>(() => sendout.SelectVendor(vendor, service, Address(Guid.NewGuid(), "Wrong vendor", "Wrong street")));
        sendout.SelectVendor(vendor, service, address);
        var original = sendout.Destination;
        address.Update("Renamed dock", null, "2 Changed Street", null, "Test City", null, null, "US", null, null, true);
        vendor.Rename("Changed vendor");
        Assert.Equal(original, sendout.Destination);
        Assert.Equal("Dock A", sendout.VendorShipmentAddressLabel);
        Assert.Equal("SIMULATED vendor", sendout.ProviderName);
        Assert.Equal(service.Id, sendout.VendorProductId);
        Assert.Throws<ArgumentException>(() => sendout.SelectShipmentAddress(Address(Guid.NewGuid(), "Wrong", "Wrong street")));
        sendout.SelectShipmentAddress(address);
        sendout.UpdateShipment(sendout.Destination!, "SIMULATED carrier", "SIM-1", null, null);
        sendout.SetStatus(LabNgsSendoutStatus.Shipped, DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() => sendout.SelectShipmentAddress(Address(vendor.Id, "Dock B", "3 Test Street")));
        Assert.Contains("2 Changed Street", sendout.Destination);
    }

    [Fact]
    public void InactiveAddressAndPhysicalProductCannotPrepareSequencingShipment()
    {
        var vendor = new LabSupplier("SIMULATED vendor");
        var address = Address(vendor.Id, "Dock", "1 Test Street");
        var physical = new LabSupplierProduct(vendor.Id, "Tube", "Physical tube", LabProductType.TubeId);
        var service = new LabSupplierProduct(vendor.Id, "Service", "Test service", LabProductType.SequencingServiceId);
        var sendout = new LabNgsSendout(Guid.NewGuid(), vendor.Name, null, "{}", null);
        Assert.Throws<ArgumentException>(() => sendout.SelectVendor(vendor, physical, address));
        address.Update("Dock", null, "1 Test Street", null, "Test City", null, null, "US", null, null, false);
        Assert.Throws<ArgumentException>(() => sendout.SelectVendor(vendor, service, address));
        Assert.Null(sendout.VendorSupplierId);
    }

    private static LabSupplierShipmentAddress Address(Guid supplierId, string label, string street)
        => new(supplierId, label, null, street, null, "Test City", null, null, "US", null, null);
}

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task SequencingServicesRequireOwnedVersionedAddressesAndRetainAtLeastOne()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var catalog = scope.SupplierCatalog();
            var supplier = await catalog.Create(new($"SIMULATED sequencing {scope.Suffix}"), default);
            var missingAddress = await Assert.ThrowsAsync<OrderManagementException>(() => catalog.CreateProduct(supplier.Id,
                new("Service", "Test sequencing", LabProductType.SequencingServiceId), default));
            Assert.Equal("supplier_catalog_invalid", missingAddress.ErrorCode);
            var first = await catalog.CreateAddress(supplier.Id, Request("Dock A"), default);
            var service = await catalog.CreateProduct(supplier.Id, new("Service", "Test sequencing", LabProductType.SequencingServiceId), default);
            Assert.Null(service.DefaultQuantityUnit);
            Assert.False(service.CanExpire);
            var blocked = await Assert.ThrowsAsync<OrderManagementException>(() => catalog.UpdateAddress(supplier.Id, first.Id, Request(first.Label, false, first.Version), default));
            Assert.Equal("sequencing_address_required", blocked.ErrorCode);
            var second = await catalog.CreateAddress(supplier.Id, Request("Dock B"), default);
            var retired = await catalog.UpdateAddress(supplier.Id, first.Id, Request(first.Label, false, first.Version), default);
            Assert.False(retired.IsActive);
            var stale = await Assert.ThrowsAsync<OrderManagementException>(() => catalog.UpdateAddress(supplier.Id, first.Id, Request(first.Label, true, first.Version), default));
            Assert.Equal("supplier_catalog_changed", stale.ErrorCode);
            var other = await catalog.Create(new($"SIMULATED other {scope.Suffix}"), default);
            var wrongOwner = await Assert.ThrowsAsync<OrderManagementException>(() => catalog.UpdateAddress(other.Id, second.Id, Request(second.Label, false, second.Version), default));
            Assert.Equal(404, wrongOwner.StatusCode);
            var listed = (await catalog.List(default)).Single(s => s.Id == supplier.Id);
            Assert.Equal(2, listed.ShipmentAddresses.Count);
            Assert.Single(listed.ShipmentAddresses, a => a.IsActive);
            await Assert.ThrowsAsync<OrderManagementException>(() => scope.SupplierCatalog(customer: true).CreateAddress(supplier.Id, Request("Forbidden"), default));
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    private static SaveSupplierShipmentAddressRequest Request(string label, bool active = true, long version = 0)
        => new(label, "SIMULATED receiving", "1 Test Street", null, "Test City", null, null, "US", null, null, active, version);
}
