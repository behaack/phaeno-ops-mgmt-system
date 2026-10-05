namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

internal static class VendorSendoutFixture
{
    public static async Task<CreateSendoutRequest> RequestAsync(PSeqOperationsDbContext db, long batchVersion,
        string manifest = "{}", DateTime? eta = null, string? providerReference = null)
    {
        var supplier = new LabSupplier($"SIMULATED sequencing vendor {Guid.NewGuid():N}");
        var product = new LabSupplierProduct(supplier.Id, "SIMULATED-SEQUENCING", "Synthetic test service", LabProductType.SequencingServiceId);
        var address = new LabSupplierShipmentAddress(supplier.Id, "SIMULATED receiving dock", null,
            "1 Synthetic Test Way", null, "Synthetic City", null, null, "US", null, null);
        db.AddRange(supplier, product, address);
        await db.SaveChangesAsync();
        return new(supplier.Id, product.Id, address.Id, supplier.Version, product.Version, address.Version,
            providerReference, manifest, eta, batchVersion, "SIMULATED carrier", "SIMULATED tracking");
    }

    public static void Complete(LabNgsSendout sendout, DateTime occurredAt)
    {
        foreach (var status in new[] { LabNgsSendoutStatus.Shipped, LabNgsSendoutStatus.ReceivedByProvider,
            LabNgsSendoutStatus.Sequencing, LabNgsSendoutStatus.ResultsReceived }) sendout.SetStatus(status, occurredAt);
        sendout.FinalizeOutcome(LabVendorOutcome.Success, occurredAt, "SIMULATED vendor outcome for test fixture");
    }
}
