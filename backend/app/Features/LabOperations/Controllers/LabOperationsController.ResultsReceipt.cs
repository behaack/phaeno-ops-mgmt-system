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
    [HttpPost("sendouts/{sendoutId:guid}/results")]
    public async Task<LabBatchDto> RecordVendorResults(Guid sendoutId, [FromBody] RecordVendorResultsRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        if (request.RequestId == Guid.Empty || string.IsNullOrWhiteSpace(request.VendorJobReference) || request.Exceptions is null || request.FastqSetIds is null
            || !Enum.TryParse<LabVendorOutcome>(request.Outcome, true, out var outcome) || !Enum.IsDefined(outcome))
            throw Invalid("vendor_results_invalid", "Review the library outcomes and results details.");
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(request, JsonOptions))));
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"lab-sendout:{sendoutId}", ct);
        var sendout = await dbContext.LabNgsSendouts.SingleOrDefaultAsync(s => s.Id == sendoutId, ct) ?? throw Missing();
        var priorCommand = await dbContext.LabCustodyEvents.AsNoTracking().SingleOrDefaultAsync(e => e.Id == request.RequestId, ct);
        if (priorCommand is not null)
        {
            using var details = JsonDocument.Parse(priorCommand.DetailsJson);
            if (priorCommand.LabNgsSendoutId != sendoutId || priorCommand.EventCode is not ("VENDOR_RESULTS" or "VENDOR_RUN_NOT_PERFORMED" or "VENDOR_RESULTS_CORRECTED")
                || !details.RootElement.TryGetProperty("requestHash", out var savedHash) || savedHash.GetString() != hash)
                throw Conflict("vendor_results_replay_conflict", "This results command was reused with different details.");
            return (await ReadBatchesAsync(ct)).Single(b => b.Id == sendout.LabOperationalBatchId);
        }
        EnsureVersion(sendout.Version, request.Version);
        await SampleShippingPackingData.LockAsync(dbContext, $"lab-sequencing-batch:{sendout.LabOperationalBatchId}", ct);
        var batch = await dbContext.LabOperationalBatches.SingleAsync(b => b.Id == sendout.LabOperationalBatchId, ct);
        var firstReceipt = sendout.Status == LabNgsSendoutStatus.ReceivedByProvider && batch.Status == LabBatchStatus.InProgress;
        var currentResultVersion = await dbContext.LabVendorResultsVersions.Where(version => version.LabNgsSendoutId == sendout.Id)
            .Select(version => (int?)version.ResultVersion).MaxAsync(ct) ?? 0;
        if (!firstReceipt && (sendout.Status != LabNgsSendoutStatus.Complete || batch.Status != LabBatchStatus.Complete))
            throw Conflict("batch_not_active", "Record results after vendor receipt, or modify an existing recorded result with a note.");
        if (!firstReceipt && string.IsNullOrWhiteSpace(request.Notes))
            throw Invalid("vendor_results_change_note_required", "Explain the change to the recorded result in results notes.");
        if (!firstReceipt && currentResultVersion == 0)
            throw Conflict("vendor_result_version_missing", "No saved result version is available to edit.");
        if (batch.StartedAtUtc.HasValue && (request.ResultsReceivedAtUtc.HasValue && request.ResultsReceivedAtUtc.Value < batch.StartedAtUtc.Value
            || request.RunStartedAtUtc.HasValue && request.RunStartedAtUtc.Value < batch.StartedAtUtc.Value))
            throw Invalid("vendor_results_time_invalid", "Results and the run cannot precede batch preparation.");
        var members = await dbContext.LabBatchMembers.AsNoTracking().Where(m => m.LabOperationalBatchId == batch.Id).Select(m => m.Id).ToListAsync(ct);
        if (request.Exceptions.Any(e => e is null) || request.Exceptions.Count > members.Count
            || request.Exceptions.Select(e => e.MemberId).Distinct().Count() != request.Exceptions.Count)
            throw Invalid("vendor_exceptions_invalid", "Choose each library exception once.");
        var exceptions = new List<LabVendorLibraryException>();
        foreach (var entry in request.Exceptions)
        {
            if (!members.Contains(entry.MemberId) || !Enum.TryParse<LabVendorOutcome>(entry.Outcome, true, out var memberOutcome)
                || !Enum.IsDefined(memberOutcome) || memberOutcome == outcome)
                throw Invalid("vendor_exception_invalid", "Each exception must name this batch's library and the opposite outcome.");
            exceptions.Add(VendorValue(() => new LabVendorLibraryException(sendout.Id, entry.MemberId, memberOutcome, entry.Reason)));
        }
        var failedCount = outcome == LabVendorOutcome.Failure ? members.Count - exceptions.Count : exceptions.Count;
        if (request.RunNotPerformed && failedCount != members.Count)
            throw Invalid("vendor_run_not_performed_invalid", "Run not performed requires every library to have failed.");
        if (request.RunNotPerformed && (request.RunStartedAtUtc.HasValue || request.RunCompletedAtUtc.HasValue
            || request.ResultsReceivedAtUtc.HasValue))
            throw Invalid("vendor_run_not_performed_invalid", "A run not performed has no run times or results receipt.");
        if (outcome == LabVendorOutcome.Failure && (exceptions.Count != 0 || request.FastqSetIds.Count != 0))
            throw Invalid("vendor_failure_details_invalid", "A failed batch has no Success exceptions or FASTQ input sets.");
        var oldExceptions = await dbContext.LabVendorLibraryExceptions.AsNoTracking().Where(e => e.LabNgsSendoutId == sendout.Id).ToListAsync(ct);
        if (request.RunNotPerformed && await dbContext.LabSequencingOutputs.AnyAsync(output => output.LabNgsSendoutId == sendout.Id, ct))
            throw Conflict("vendor_run_has_scientific_output", "This run has registered scientific outputs and cannot be changed to Run not performed.");
        if (outcome == LabVendorOutcome.Failure && members.Count > exceptions.Count && !sendout.Outcome.HasValue && string.IsNullOrWhiteSpace(request.Notes))
            throw Invalid("vendor_failure_reason_required", "Record the common failure reason in results notes.");
        var successfulMembers = outcome == LabVendorOutcome.Success ? members.Except(exceptions.Select(e => e.LabBatchMemberId)).ToArray() : [];
        var fastqSnapshots = await PrepareResultFiles(sendout, request, successfulMembers, ct);
        var recordedAt = DateTime.UtcNow;
        var previous = new { sendout.ProviderReference, sendout.RunNotPerformed, sendout.SequencingStartedAtUtc,
            sendout.SequencingCompletedAtUtc, sendout.ResultsReceivedAtUtc, outcome = sendout.Outcome?.ToString(), sendout.OutcomeAtUtc,
            sendout.OutcomeNote, batchCompletedAtUtc = batch.CompletedAtUtc,
            exceptions = oldExceptions.Select(exception => new { memberId = exception.LabBatchMemberId, outcome = exception.Outcome.ToString(), exception.Reason }).ToArray() };
        try { sendout.RecordResults(request.VendorJobReference, request.RunNotPerformed, request.RunStartedAtUtc,
            request.RunCompletedAtUtc, request.ResultsReceivedAtUtc, outcome, request.Notes, recordedAt); }
        catch (ArgumentException ex) { throw Invalid("vendor_results_invalid", ex.Message); }
        catch (InvalidOperationException ex) { throw Conflict("vendor_results_conflict", ex.Message); }
        if (firstReceipt)
        {
            batch.Complete(request.RunNotPerformed ? recordedAt : request.ResultsReceivedAtUtc!.Value);
        }
        else
        {
            if (previous.RunNotPerformed != request.RunNotPerformed || previous.ResultsReceivedAtUtc != request.ResultsReceivedAtUtc)
                batch.CorrectResultCompletion(request.RunNotPerformed ? recordedAt : request.ResultsReceivedAtUtc!.Value);
            var replacedExceptions = await dbContext.LabVendorLibraryExceptions.Where(exception => exception.LabNgsSendoutId == sendout.Id).ToListAsync(ct);
            dbContext.LabVendorLibraryExceptions.RemoveRange(replacedExceptions);
        }
        dbContext.LabVendorLibraryExceptions.AddRange(exceptions);
        var snapshotMembers = await (from member in dbContext.LabBatchMembers.AsNoTracking()
            join library in dbContext.LabLibraries.AsNoTracking() on member.LabLibraryId equals library.Id
            where member.LabOperationalBatchId == batch.Id
            orderby library.LibraryKey, member.Id
            select new { member.Id, member.LabLibraryId, library.LibraryKey }).ToListAsync(ct);
        var resultVersion = checked(currentResultVersion + 1);
        var snapshot = new VendorResultsSnapshot(batch.Id, batch.BatchNumber, batch.Name, sendout.Id,
            sendout.ProviderName, sendout.ProviderReference!, request.RunNotPerformed, sendout.SequencingStartedAtUtc,
            sendout.SequencingCompletedAtUtc, sendout.ResultsReceivedAtUtc, outcome.ToString(), sendout.OutcomeNote,
            batch.CompletedAtUtc, sendout.ManifestJson,
            snapshotMembers.Select(member => {
                var exception = exceptions.SingleOrDefault(exception => exception.LabBatchMemberId == member.Id);
                return new VendorResultsLibrarySnapshot(member.Id, member.LabLibraryId, member.LibraryKey,
                    (exception?.Outcome ?? outcome).ToString(), exception?.Reason ?? (outcome == LabVendorOutcome.Failure ? sendout.OutcomeNote : null));
            }).ToList(),
            [], fastqSnapshots);
        var actorName = (actor.User.FirstName + " " + actor.User.LastName).Trim();
        dbContext.LabVendorResultsVersions.Add(new LabVendorResultsVersion(request.RequestId, sendout.Id, resultVersion,
            JsonSerializer.Serialize(snapshot, JsonOptions), request.Notes, actor.User.Id,
            string.IsNullOrWhiteSpace(actorName) ? "Phaeno operator" : actorName, recordedAt));
        var eventCode = !firstReceipt ? "VENDOR_RESULTS_CORRECTED" : request.RunNotPerformed ? "VENDOR_RUN_NOT_PERFORMED" : "VENDOR_RESULTS";
        dbContext.LabCustodyEvents.Add(LabCustodyEvent.ForCommand(request.RequestId, sendout.Id, eventCode, sendout.ProviderName,
            JsonSerializer.Serialize(new { requestHash = hash, resultVersion, resultVersionId = request.RequestId,
                isCorrection = !firstReceipt, previous = firstReceipt ? null : previous,
                request.VendorJobReference, request.RunNotPerformed,
                request.RunStartedAtUtc, request.RunCompletedAtUtc, request.ResultsReceivedAtUtc, request.Outcome,
                request.Exceptions, request.FastqSetIds, notes = request.Notes, recordedAtUtc = recordedAt }, JsonOptions),
            actor.User.Id, !firstReceipt || request.RunNotPerformed ? recordedAt : request.ResultsReceivedAtUtc!.Value));
        if ((firstReceipt || previous.RunNotPerformed == true) && !request.RunNotPerformed)
        {
            var workIds = await dbContext.LabBatchMembers.Where(m => m.LabOperationalBatchId == batch.Id).Select(m => m.LabWorkOrderId).Distinct().ToListAsync(ct);
            foreach (var work in await dbContext.LabWorkOrders.Where(w => workIds.Contains(w.Id)).ToListAsync(ct))
            {
                work.RecordSendoutProgress(LabNgsSendoutStatus.ResultsReceived);
                await EmitProjectionAsync(work, actor.User.Id, "SequencingStatusChanged", ct, sendout.ExpectedCompletionAtUtc);
            }
        }
        await dbContext.SaveChangesAsync(ct);
        await RegisterResultFiles(sendout, request, fastqSnapshots, actor.User.Id, ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await ReadBatchesAsync(ct)).Single(b => b.Id == batch.Id);
    }
}
