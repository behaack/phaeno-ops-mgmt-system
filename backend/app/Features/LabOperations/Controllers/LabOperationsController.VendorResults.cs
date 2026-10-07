namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabOperationsController
{
    private static T VendorValue<T>(Func<T> create)
    {
        try { return create(); }
        catch (ArgumentException ex) { throw Invalid("vendor_details_invalid", ex.Message); }
    }

    private static void VendorWrite(Action write)
    {
        try { write(); }
        catch (ArgumentException ex) { throw Invalid("vendor_details_invalid", ex.Message); }
    }

    private static void ValidateVendorEta(DateTime? eta, DateTime earliest)
    {
        if (eta.HasValue && (eta.Value.Kind != DateTimeKind.Utc || eta.Value < earliest))
            throw Invalid("vendor_eta_invalid", "The expected completion time must be UTC and on or after the recorded event.");
    }

    [HttpPost("sendouts/{sendoutId:guid}/shipment")]
    public async Task<LabBatchDto> UpdateVendorShipment(Guid sendoutId, [FromBody] UpdateVendorShipmentRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"lab-sendout:{sendoutId}", ct);
        var sendout = await dbContext.LabNgsSendouts.SingleOrDefaultAsync(s => s.Id == sendoutId, ct) ?? throw Missing();
        EnsureVersion(sendout.Version, request.Version);
        if (sendout.Status == LabNgsSendoutStatus.Complete) throw Conflict("shipment_finalized", "This shipment has been finalized.");
        LabSupplierShipmentAddress? changedAddress = null;
        if (request.VendorShipmentAddressId.HasValue)
        {
            if (sendout.Status != LabNgsSendoutStatus.Preparing || !sendout.VendorSupplierId.HasValue)
                throw Conflict("destination_frozen", "Only a prepared catalog shipment can select another address before dispatch.");
            await SampleShippingPackingData.LockAsync(dbContext, $"supplier-catalog:{sendout.VendorSupplierId}", ct);
            if (!await dbContext.LabSuppliers.AnyAsync(s => s.Id == sendout.VendorSupplierId && s.IsActive, ct))
                throw Invalid("sequencing_vendor_invalid", "The vendor is inactive.");
            changedAddress = await dbContext.LabSupplierShipmentAddresses.AsNoTracking().SingleOrDefaultAsync(a => a.Id == request.VendorShipmentAddressId
                && a.SupplierId == sendout.VendorSupplierId && a.IsActive, ct)
                ?? throw Invalid("sequencing_address_invalid", "Choose an active address belonging to the saved vendor.");
            if (!request.VendorShipmentAddressVersion.HasValue) throw Invalid("sequencing_address_version_required", "Review the selected address before saving.");
            EnsureVersion(changedAddress.Version, request.VendorShipmentAddressVersion.Value);
        }
        var evidence = request.Evidence?.Trim();
        if (string.IsNullOrEmpty(evidence) || evidence.Length > 4000) throw Invalid("shipment_evidence_required", "Record update evidence of 1 to 4,000 characters.");
        if (request.ExpectedCompletionAtUtc != sendout.ExpectedCompletionAtUtc) ValidateVendorEta(request.ExpectedCompletionAtUtc, DateTime.UtcNow);
        if (sendout.ProviderReceivedAtUtc.HasValue && request.ExpectedCompletionAtUtc is null)
            throw Invalid("vendor_eta_required", "Retain an expected completion time after vendor receipt.");
        if (changedAddress is not null) VendorWrite(() => sendout.SelectShipmentAddress(changedAddress));
        VendorWrite(() => sendout.UpdateShipment(sendout.Destination!, request.Carrier, request.TrackingReference, request.ProviderReference, request.ExpectedCompletionAtUtc));
        dbContext.LabCustodyEvents.Add(new LabCustodyEvent(sendout.Id, null, "SHIPMENT_UPDATED", sendout.ProviderName,
            JsonSerializer.Serialize(new { evidence, sendout.Destination, sendout.VendorShipmentAddressId, sendout.VendorShipmentAddressVersion,
                shipmentAddress = changedAddress is null ? null : LabSupplierCatalogController.Address(changedAddress), sendout.Carrier, sendout.TrackingReference,
                sendout.ProviderReference, sendout.ExpectedCompletionAtUtc, recordedAtUtc = DateTime.UtcNow }, JsonOptions), actor.User.Id, DateTime.UtcNow));
        dbContext.Entry(sendout).Property(s => s.UpdatedAt).IsModified = true;
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await ReadBatchesAsync(ct)).Single(b => b.Id == sendout.LabOperationalBatchId);
    }

}
