namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Security.Cryptography;
using System.Text;
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

    [HttpPost("sendouts/{sendoutId:guid}/result-references")]
    public async Task<LabBatchDto> AddVendorResultReference(Guid sendoutId, [FromBody] AddVendorResultReferenceRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"lab-sendout:{sendoutId}", ct);
        var sendout = await dbContext.LabNgsSendouts.SingleOrDefaultAsync(s => s.Id == sendoutId, ct) ?? throw Missing();
        var existing = await dbContext.LabVendorResultReferences.AsNoTracking().SingleOrDefaultAsync(r => r.Id == request.RequestId, ct);
        if (existing is not null)
        {
            if (existing.LabNgsSendoutId != sendoutId || existing.LabBatchMemberId != request.MemberId ||
                existing.Label != request.Label?.Trim() || existing.StorageReference != request.StorageReference?.Trim() || existing.Notes != (string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim()))
                throw Conflict("result_reference_replay_conflict", "This saved reference request was reused with different details.");
            return (await ReadBatchesAsync(ct)).Single(b => b.Id == sendout.LabOperationalBatchId);
        }
        EnsureVersion(sendout.Version, request.Version);
        if (sendout.Status is not (LabNgsSendoutStatus.ResultsReceived or LabNgsSendoutStatus.Complete))
            throw Conflict("results_not_received", "Record Results received before adding returned-data references.");
        if (request.MemberId.HasValue && !await dbContext.LabBatchMembers.AnyAsync(m => m.Id == request.MemberId && m.LabOperationalBatchId == sendout.LabOperationalBatchId, ct))
            throw Invalid("result_member_invalid", "Choose a library from this batch's frozen manifest.");
        dbContext.LabVendorResultReferences.Add(VendorValue(() => new LabVendorResultReference(request.RequestId, sendout.Id, request.MemberId,
            request.Label, request.StorageReference, request.Notes, actor.User.Id, DateTime.UtcNow)));
        dbContext.Entry(sendout).Property(s => s.UpdatedAt).IsModified = true;
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await ReadBatchesAsync(ct)).Single(b => b.Id == sendout.LabOperationalBatchId);
    }

    [HttpPost("sendouts/{sendoutId:guid}/outcome")]
    public async Task<LabBatchDto> FinalizeVendorOutcome(Guid sendoutId, [FromBody] FinalizeVendorOutcomeRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        if (request.RequestId == Guid.Empty || !Enum.TryParse<LabVendorOutcome>(request.Outcome, true, out var outcome) || !Enum.IsDefined(outcome) || request.Exceptions is null)
            throw Invalid("vendor_outcome_invalid", "Choose Success or Failure and record any library exceptions.");
        var requestHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(request, JsonOptions))));
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"lab-sendout:{sendoutId}", ct);
        var sendout = await dbContext.LabNgsSendouts.SingleOrDefaultAsync(s => s.Id == sendoutId, ct) ?? throw Missing();
        if (sendout.Outcome.HasValue)
        {
            var finalEvent = await dbContext.LabCustodyEvents.AsNoTracking().SingleOrDefaultAsync(e => e.LabNgsSendoutId == sendoutId && e.EventCode == "VENDOR_OUTCOME", ct);
            if (finalEvent is null) throw Conflict("vendor_outcome_finalized", "The final outcome is already recorded. Refresh to review the saved decision.");
            using var saved = JsonDocument.Parse(finalEvent.DetailsJson);
            if (saved.RootElement.GetProperty("requestId").GetGuid() != request.RequestId || saved.RootElement.GetProperty("requestHash").GetString() != requestHash)
                throw Conflict("vendor_outcome_finalized", "The final outcome is already recorded. Refresh to review the saved decision.");
            return (await ReadBatchesAsync(ct)).Single(b => b.Id == sendout.LabOperationalBatchId);
        }
        EnsureVersion(sendout.Version, request.Version);
        if (sendout.Status != LabNgsSendoutStatus.ResultsReceived)
            throw Conflict("results_not_received", "Record Results received before finalizing the batch outcome.");
        await SampleShippingPackingData.LockAsync(dbContext, $"lab-sequencing-batch:{sendout.LabOperationalBatchId}", ct);
        var batch = await dbContext.LabOperationalBatches.SingleAsync(b => b.Id == sendout.LabOperationalBatchId, ct);
        if (batch.Status != LabBatchStatus.InProgress) throw Conflict("batch_not_active", "Only an active batch can record a final vendor outcome.");
        if (batch.StartedAtUtc.HasValue && request.OccurredAtUtc < batch.StartedAtUtc)
            throw Invalid("vendor_outcome_time_invalid", "The final outcome cannot precede batch preparation.");
        var memberIds = await dbContext.LabBatchMembers.AsNoTracking().Where(m => m.LabOperationalBatchId == batch.Id).Select(m => m.Id).ToListAsync(ct);
        if (request.Exceptions.Count > memberIds.Count || request.Exceptions.Select(e => e.MemberId).Distinct().Count() != request.Exceptions.Count)
            throw Invalid("vendor_exceptions_invalid", "Each library may have at most one exception.");
        foreach (var exception in request.Exceptions)
        {
            if (!memberIds.Contains(exception.MemberId) || !Enum.TryParse<LabVendorOutcome>(exception.Outcome, true, out var memberOutcome) || !Enum.IsDefined(memberOutcome) || memberOutcome == outcome)
                throw Invalid("vendor_exception_invalid", "Each exception must name a batch library and the opposite outcome, with its reason.");
            dbContext.LabVendorLibraryExceptions.Add(VendorValue(() => new LabVendorLibraryException(sendout.Id, exception.MemberId, memberOutcome, exception.Reason)));
        }
        VendorWrite(() => sendout.FinalizeOutcome(outcome, request.OccurredAtUtc, request.Evidence));
        batch.Complete(request.OccurredAtUtc);
        dbContext.LabCustodyEvents.Add(new LabCustodyEvent(sendout.Id, null, "VENDOR_OUTCOME", sendout.ProviderName,
            JsonSerializer.Serialize(new { requestId = request.RequestId, requestHash, outcome = outcome.ToString(), evidence = request.Evidence.Trim(),
                exceptions = request.Exceptions, memberIds, recordedAtUtc = DateTime.UtcNow }, JsonOptions), actor.User.Id, request.OccurredAtUtc));
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await ReadBatchesAsync(ct)).Single(b => b.Id == batch.Id);
    }
}
