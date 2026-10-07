namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    [HttpGet("batches/{batchId:guid}")]
    public async Task<object> BatchDetail(Guid batchId, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, Enum.GetValues<LabRole>());
        var batch = await dbContext.LabOperationalBatches.AsNoTracking().SingleOrDefaultAsync(item => item.Id == batchId, ct) ?? throw Missing();
        var sendout = await dbContext.LabNgsSendouts.AsNoTracking().SingleOrDefaultAsync(item => item.LabOperationalBatchId == batchId, ct);
        var tubes = await ReadSequencingTubesAsync(batchId, ct);
        var events = sendout is null ? [] : await dbContext.LabCustodyEvents.AsNoTracking()
            .Where(item => item.LabNgsSendoutId == sendout.Id).OrderBy(item => item.OccurredAtUtc).ThenBy(item => item.Id).ToListAsync(ct);
        var references = sendout is null ? [] : await dbContext.LabVendorResultReferences.AsNoTracking().Where(r => r.LabNgsSendoutId == sendout.Id).OrderBy(r => r.RecordedAtUtc).ToListAsync(ct);
        var actorIds = events.Select(item => item.RecordedByUserId).Concat(references.Select(r => r.RecordedByUserId)).Distinct().ToArray();
        var actors = await dbContext.Users.AsNoTracking().Where(item => actorIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.FirstName + " " + item.LastName, ct);
        var exceptions = sendout is null ? [] : await dbContext.LabVendorLibraryExceptions.AsNoTracking().Where(e => e.LabNgsSendoutId == sendout.Id).ToListAsync(ct);
        var resultsVersion = sendout is null ? null : await dbContext.LabVendorResultsVersions.AsNoTracking().Where(version => version.LabNgsSendoutId == sendout.Id)
            .Select(version => (int?)version.ResultVersion).MaxAsync(ct);
        return new { batch = MapBatch(batch, tubes.Members.Count, sendout?.Status.ToString(), sendout?.Id, sendout?.Version, sendout, exceptions.Count, resultsVersion), tubes,
            sendout = sendout is null ? null : new { sendout.Id, sendout.ProviderName, sendout.ProviderReference, sendout.ManifestJson,
                sendout.ExpectedCompletionAtUtc, sendout.ShippedAtUtc, sendout.ProviderReceivedAtUtc, sendout.Destination,
                sendout.Carrier, sendout.TrackingReference, sendout.SequencingStartedAtUtc, sendout.SequencingCompletedAtUtc,
                sendout.RunNotPerformed, sendout.ResultsReceivedAtUtc,
                sendout.VendorSupplierId, sendout.VendorProductId, sendout.VendorProductName, sendout.VendorShipmentAddressId,
                sendout.VendorShipmentAddressLabel, sendout.VendorShipmentAddressVersion,
                outcome = sendout.Outcome?.ToString(), sendout.OutcomeAtUtc, sendout.OutcomeNote },
            resultReferences = references.Select(r => new { r.Id, memberId = r.LabBatchMemberId, r.Label, r.StorageReference, r.Notes, r.RecordedAtUtc, r.RecordedByUserId,
                recordedBy = actors.GetValueOrDefault(r.RecordedByUserId, "Phaeno operator") }),
            libraryExceptions = exceptions.Select(e => new { memberId = e.LabBatchMemberId, outcome = e.Outcome.ToString(), e.Reason }),
            custody = events.Select(item => new { item.Id, item.EventCode, item.LocationOrParty, item.LabContainerId,
                item.DetailsJson, item.OccurredAtUtc, item.RecordedByUserId, recordedBy = actors.GetValueOrDefault(item.RecordedByUserId, "Phaeno operator") }) };
    }
}
