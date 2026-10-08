namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record SupplierShipmentAddressDto(Guid Id, Guid SupplierId, string Label, string? Recipient,
    string AddressLine1, string? AddressLine2, string City, string? Region, string? PostalCode,
    string CountryCode, string? Phone, string? Instructions, bool IsActive, long Version, string Destination);
public sealed record SaveSupplierShipmentAddressRequest(string Label, string? Recipient,
    string AddressLine1, string? AddressLine2, string City, string? Region, string? PostalCode,
    string CountryCode, string? Phone, string? Instructions, bool IsActive = true, long Version = 0);

public sealed partial class LabSupplierCatalogController
{
    internal static SupplierShipmentAddressDto Address(LabSupplierShipmentAddress a) => new(a.Id, a.SupplierId,
        a.Label, a.Recipient, a.AddressLine1, a.AddressLine2, a.City, a.Region, a.PostalCode,
        a.CountryCode, a.Phone, a.Instructions, a.IsActive, a.Version, a.DestinationText());

    private async Task RequireActiveShipmentAddress(Guid supplierId, CancellationToken ct)
    {
        if (!await db.LabSupplierShipmentAddresses.AnyAsync(a => a.SupplierId == supplierId && a.IsActive, ct))
            throw Invalid("Add an active shipment address to this supplier before activating a sequencing service.");
    }
    private async Task RequireSequencingAddress(Guid supplierId, CancellationToken ct)
    {
        if (await db.LabSupplierProducts.AnyAsync(p => p.SupplierId == supplierId && p.IsActive && p.ProductTypeId == LabProductType.SequencingServiceId, ct))
            await RequireActiveShipmentAddress(supplierId, ct);
    }

    [HttpPost("{supplierId:guid}/shipment-addresses")]
    public async Task<SupplierShipmentAddressDto> CreateAddress(Guid supplierId, [FromBody] SaveSupplierShipmentAddressRequest r, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"supplier-catalog:{supplierId}", ct);
        var supplier = await db.LabSuppliers.SingleOrDefaultAsync(s => s.Id == supplierId, ct) ?? throw Missing();
        if (supplier.IsInternalProducer || !supplier.IsActive) throw Invalid("Choose an active external supplier for this shipment address.");
        LabSupplierShipmentAddress address;
        try { address = new(supplierId, r.Label, r.Recipient, r.AddressLine1, r.AddressLine2, r.City, r.Region, r.PostalCode, r.CountryCode, r.Phone, r.Instructions);
            address.Update(r.Label, r.Recipient, r.AddressLine1, r.AddressLine2, r.City, r.Region, r.PostalCode, r.CountryCode, r.Phone, r.Instructions, r.IsActive); }
        catch (ArgumentException e) { throw Invalid(e.Message); }
        db.LabSupplierShipmentAddresses.Add(address);
        await Save(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Address(address);
    }

    [HttpPut("{supplierId:guid}/shipment-addresses/{addressId:guid}")]
    public async Task<SupplierShipmentAddressDto> UpdateAddress(Guid supplierId, Guid addressId, [FromBody] SaveSupplierShipmentAddressRequest r, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"supplier-catalog:{supplierId}", ct);
        var supplier = await db.LabSuppliers.SingleOrDefaultAsync(s => s.Id == supplierId, ct) ?? throw Missing();
        if (supplier.IsInternalProducer) throw Invalid("Phaeno is an internal producer, not an external sequencing vendor.");
        var address = await db.LabSupplierShipmentAddresses.SingleOrDefaultAsync(a => a.Id == addressId && a.SupplierId == supplierId, ct)
            ?? throw new OrderManagementException("supplier_address_not_found", "The shipment address was not found for this supplier.", 404);
        Version(address.Version, r.Version);
        if (!r.IsActive && address.IsActive && supplier.IsActive
            && !await db.LabSupplierShipmentAddresses.AnyAsync(a => a.SupplierId == supplierId && a.Id != addressId && a.IsActive, ct)
            && await db.LabSupplierProducts.AnyAsync(p => p.SupplierId == supplierId && p.IsActive && p.ProductTypeId == LabProductType.SequencingServiceId, ct))
            throw new OrderManagementException("sequencing_address_required", "Add another active address or deactivate this vendor's sequencing services before retiring its last address.", 409);
        try { address.Update(r.Label, r.Recipient, r.AddressLine1, r.AddressLine2, r.City, r.Region, r.PostalCode, r.CountryCode, r.Phone, r.Instructions, r.IsActive); }
        catch (ArgumentException e) { throw Invalid(e.Message); }
        await Save(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Address(address);
    }
}
