namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class ShippingJobPinning
{
    public static async Task PinAtPlacementAsync(PSeqOperationsDbContext db, LabServiceOrder order,
        CancellationToken ct)
    {
        await SampleShippingPackingData.LockAsync(db, "sample-shipping-default-destination", ct);
        var sampleKey = await db.SampleTypeDefinitions.AsNoTracking()
            .Where(item => item.Id == order.SampleTypeDefinitionId)
            .Select(item => (Guid?)item.DefinitionKey).SingleOrDefaultAsync(ct)
            ?? throw new OrderManagementException("sample_type_unavailable",
                "Select an active PSeq sample type for this Job.");
        await SampleShippingPackingData.LockAsync(db, $"sample-type:{sampleKey}", ct);
        var sampleType = await LabOrderSampleTypeChoices.RequireAsync(db, order.SampleTypeDefinitionId, ct);
        if (!sampleType.ShippingProcedureId.HasValue)
            throw new OrderManagementException("shipping_procedure_required",
                "The selected Sample type needs an active Shipping procedure before this Job can be placed.", 409);
        var key = await db.SampleShippingProcedures.AsNoTracking()
            .Where(item => item.Id == sampleType.ShippingProcedureId.Value)
            .Select(item => (Guid?)item.DefinitionKey).SingleOrDefaultAsync(ct)
            ?? throw new OrderManagementException("shipping_procedure_unavailable",
                "The selected Shipping procedure is unavailable.", 409);
        await SampleShippingPackingData.LockAsync(db, $"shipping-procedure:{key}", ct);
        var revisionId = await db.SampleShippingProcedures.AsNoTracking()
            .Where(item => item.DefinitionKey == key && item.IsActive)
            .OrderByDescending(item => item.Revision).Select(item => (Guid?)item.Id)
            .FirstOrDefaultAsync(ct)
            ?? throw new OrderManagementException("shipping_procedure_unavailable",
                "Activate the selected Shipping procedure before this Job can be placed.", 409);
        order.PinShippingProcedure(revisionId);
    }
}
