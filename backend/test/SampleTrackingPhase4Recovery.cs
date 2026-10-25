namespace PhaenoPortal.Test;

using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [SampleTrackingPhase4Fact("run")]
    public async Task Phase4ConnectedJourneySurvivesIndependentRestoreAndRecoveryFailures()
    {
        await SampleTrackingPhase4Support.RunAsync(CapturePhase4Journey, VerifyPhase4Recovery);
        await SampleTrackingPhase4Support.VerifyCleanupFailureAsync();
        await SampleTrackingPhase4Support.VerifyUncertainCreationAsync();
    }

    private static LabOperationsController Phase4Controller(PSeqOperationsDbContext db, ExternalIdentity identity)
    {
        var options = Options.Create(new PSeqOrderToCashOptions { GovernedPSeqResults = true, DualControlEnforced = true });
        return new(db, new(db, new FixedIdentityContext(identity), options, NullLogger<LabOperationsRequestContext>.Instance), options)
            { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
    }

    private static async Task VerifyPhase4Recovery()
    {
        var checkpoint = JsonSerializer.Deserialize<Phase4Checkpoint>(await File.ReadAllTextAsync(Path.Combine(SampleTrackingPhase4Support.Artifacts(), "checkpoint.json")), JsonSerializerOptions.Web)!;
        Assert.False(Directory.Exists(Path.Combine(Environment.GetEnvironmentVariable("PSEQ_PHASE4_PRIVATE_ROOT")!, "source")));
        var meter = new Phase4QueryMeter();
        await using var db = SampleTrackingPhase4Support.Context("restored", meter);
        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
        var lab = Phase4Controller(db, checkpoint.OperatorIdentity);
        var reviewer = Phase4Controller(db, checkpoint.ReviewerIdentity);
        var files = SampleTrackingPhase4Support.Files("restored");
        var package = await db.ResultOutputPackages.SingleAsync(p => p.Id == checkpoint.PackageId);
        await using (var validation = await db.Database.BeginTransactionAsync())
        {
            await new LabResultLineageService(db).RequirePackageAsync(package, default, new PSeqOrderToCashOptions());
            await validation.CommitAsync();
        }
        var trace = await reviewer.ResultLineage(checkpoint.WorkId, checkpoint.SpecimenId, package.Id, default);
        Assert.Equal(checkpoint.SourceContainerId, trace.SourceContainerId);
        Assert.Equal(checkpoint.SourceBarcode, trace.SourceBarcode);
        Assert.Equal(checkpoint.AnalysisId, trace.AnalysisRunId);
        Assert.Equal(checkpoint.OutputIds.Order(), await db.LabAnalysisInputs.Where(i => i.LabAnalysisRunId == checkpoint.AnalysisId).Select(i => i.LabSequencingOutputId).Order().ToArrayAsync());
        foreach (var receipt in checkpoint.Files)
        {
            await using var content = await files.OpenReadAsync(receipt.StorageKey, default);
            Assert.Equal(receipt.SizeBytes, content.Length);
            Assert.Equal(receipt.Sha256, Convert.ToHexString(await SHA256.HashDataAsync(content)), ignoreCase: true);
        }
        var report = await db.LabInvestigationReports.AsNoTracking().SingleAsync(r => r.Id == checkpoint.ReportId);
        var downloaded = Assert.IsType<FileContentResult>(await reviewer.DownloadInvestigationReport(checkpoint.WorkId, checkpoint.SpecimenId, report.Id, default));
        Assert.Equal(Encoding.UTF8.GetBytes(report.BodyJson), downloaded.FileContents);
        Assert.Equal(checkpoint.ReportSha256, Convert.ToHexString(SHA256.HashData(downloaded.FileContents)), ignoreCase: true);
        var scientific = await db.LabScientificFiles.AsNoTracking().SingleAsync();
        async Task VerifyRaw()
        {
            var response = Assert.IsType<FileStreamResult>(await reviewer.DownloadScientificFile(checkpoint.WorkId, checkpoint.SpecimenId, scientific.Id, files, default));
            await using var stream = response.FileStream;
            Assert.Equal(scientific.Sha256, Convert.ToHexString(await SHA256.HashDataAsync(stream)), ignoreCase: true);
        }
        await VerifyRaw();

        // Replay uncertain commands with their original actor and immutable request identity after recovery.
        var quantity = (await db.LabContainers.AsNoTracking().SingleAsync(c => c.Id == checkpoint.SourceContainerId)).Quantity;
        var stock = await db.LabMaterialLots.AsNoTracking().Select(l => new { l.Id, l.AvailableQuantity }).ToArrayAsync();
        var physicalCount = await db.Set<LabPhysicalEvent>().CountAsync();
        var outputCount = await db.LabSequencingOutputs.CountAsync();
        await lab.RecordPhysicalContainer(checkpoint.SourceContainerId, checkpoint.PhysicalRequest, default);
        await lab.RecordVendorResults(checkpoint.SendoutId, checkpoint.VendorRequest, default);
        await reviewer.GenerateInvestigationReport(checkpoint.WorkId, checkpoint.SpecimenId, new(report.Id), default);
        Assert.Equal(physicalCount, await db.Set<LabPhysicalEvent>().CountAsync());
        Assert.Equal(outputCount, await db.LabSequencingOutputs.CountAsync());
        Assert.Equal(report.BodyJson, (await db.LabInvestigationReports.AsNoTracking().SingleAsync(r => r.Id == report.Id)).BodyJson);
        foreach (var before in stock) Assert.Equal(before.AvailableQuantity, (await db.LabMaterialLots.AsNoTracking().SingleAsync(l => l.Id == before.Id)).AvailableQuantity);
        var conflicting = await Assert.ThrowsAsync<OrderManagementException>(() => lab.RecordPhysicalContainer(checkpoint.SourceContainerId, checkpoint.PhysicalRequest with { Reason = "conflicting replay" }, default));
        Assert.Equal("physical_request_reused", conflicting.ErrorCode);
        db.ChangeTracker.Clear();
        var tube = await db.LabContainers.SingleAsync(c => c.Id == checkpoint.SourceContainerId);
        Assert.NotNull(tube.PhysicalHoldReason);
        await lab.RecordPhysicalContainer(tube.Id, new(Guid.NewGuid(), tube.Version, "RetentionSet", tube.Barcode, "TEST agreed terms", RetainUntilUtc: DateTime.UtcNow.AddDays(-1)), default);
        var stale = await Assert.ThrowsAsync<OrderManagementException>(() => lab.RecordPhysicalContainer(tube.Id,
            new(Guid.NewGuid(), tube.Version - 1, "HoldReleased", tube.Barcode, "TEST stale action"), default));
        Assert.Equal("concurrency_conflict", stale.ErrorCode);
        db.ChangeTracker.Clear(); tube = await db.LabContainers.SingleAsync(c => c.Id == tube.Id);
        var held = await Assert.ThrowsAsync<OrderManagementException>(() => lab.RecordPhysicalContainer(tube.Id,
            new(Guid.NewGuid(), tube.Version, "Destroyed", tube.Barcode, "TEST blocked disposition", Method: "TEST destruction"), default));
        Assert.Contains("hold", held.Message, StringComparison.OrdinalIgnoreCase);
        db.ChangeTracker.Clear();
        Assert.Equal(quantity, (await db.LabContainers.AsNoTracking().SingleAsync(c => c.Id == tube.Id)).Quantity);
        Assert.Equal(physicalCount + 1, await db.Set<LabPhysicalEvent>().CountAsync());

        // Deliberate offline corruption only in the independently restored disposable fixture.
        var rawPath = SampleTrackingPhase4Support.PrivateFile("restored", scientific.StorageKey);
        var original = await File.ReadAllBytesAsync(rawPath);
        var altered = (byte[])original.Clone(); altered[0] ^= 1;
        try
        {
            await File.WriteAllBytesAsync(rawPath, altered);
            var corrupt = await Assert.ThrowsAsync<OrderManagementException>(() => reviewer.DownloadScientificFile(checkpoint.WorkId, checkpoint.SpecimenId, scientific.Id, files, default));
            Assert.Equal("scientific_file_integrity_failed", corrupt.ErrorCode);
        }
        finally { await File.WriteAllBytesAsync(rawPath, original); }
        File.Move(rawPath, rawPath + ".offline");
        try { await Assert.ThrowsAsync<OrderManagementException>(() => reviewer.DownloadScientificFile(checkpoint.WorkId, checkpoint.SpecimenId, scientific.Id, files, default)); }
        finally { File.Move(rawPath + ".offline", rawPath); }
        await VerifyRaw();
        try
        {
            var alteredBody = report.BodyJson + " ";
            await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE lab_ops.lab_investigation_reports SET body_json = {alteredBody} WHERE id = {report.Id}");
            Assert.Equal("report_integrity_failed", (await Assert.ThrowsAsync<OrderManagementException>(() => reviewer.DownloadInvestigationReport(checkpoint.WorkId, checkpoint.SpecimenId, report.Id, default))).ErrorCode);
        }
        finally { await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE lab_ops.lab_investigation_reports SET body_json = {report.BodyJson} WHERE id = {report.Id}"); }
        await Assert.ThrowsAsync<OrderManagementException>(() => new InvestigationPreservingFileStorage(files, db).DeleteIfExistsAsync(scientific.StorageKey, default));
        var artifact = await db.ResultArtifacts.SingleAsync(a => a.ResultOutputPackageId == package.Id);
        await files.DeleteIfExistsAsync(artifact.ObjectStorageKey, default);
        await Assert.ThrowsAsync<OrderManagementException>(() => files.OpenReadAsync(artifact.ObjectStorageKey, default));
        Assert.Equal(checkpoint.SourceBarcode, (await reviewer.ResultLineage(checkpoint.WorkId, checkpoint.SpecimenId, package.Id, default)).SourceBarcode);
        Assert.IsType<FileContentResult>(await reviewer.DownloadInvestigationReport(checkpoint.WorkId, checkpoint.SpecimenId, report.Id, default));
        await VerifyRaw();
        await VerifyPhase4LongHistory(db, reviewer, checkpoint, meter);
        if (Environment.GetEnvironmentVariable("PSEQ_PHASE4_BROWSER_VERIFICATION") == "1")
            await VerifyPhase4Browser(db, checkpoint);
        await SampleTrackingPhase4Support.WriteAsync("recovery.json", new
        {
            result = "passed", checkpoint.ReportSha256, checkpoint.SourceBarcode, originalStorageUnavailable = true,
            currentScientificProfile = true, exactReportBytes = true, managedFileHashes = true,
            restoredReplayWithoutDuplicateOrQuantityChange = true, conflictingReplayRejected = true, stalePhysicalCommandRejected = true,
            preservationHoldSurvives = true, corruptRawRejected = true, missingRawRejected = true, corruptReportRejected = true,
            resultByteCleanupPreservesInternalEvidence = true,
            scope = "Synthetic local software recovery; no physical/provider/scientific/hosted or scheduled backup qualification"
        });
    }

    private static async Task VerifyPhase4LongHistory(PSeqOperationsDbContext db, LabOperationsController reviewer, Phase4Checkpoint checkpoint, Phase4QueryMeter meter)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        var boundary = LabEvidenceTime.UtcNow;
        // Equal timestamps intentionally exercise the UUID tie-breaker over more than 200 pages.
        var inserted = Enumerable.Range(0, 10007).Select(_ => new LabWorkEvent(checkpoint.WorkId, checkpoint.SpecimenId, "TESTScaleEvent", boundary.AddMinutes(-1), null, "{}")).ToArray();
        db.AddRange(inserted); await db.SaveChangesAsync(); db.ChangeTracker.Clear();
        var expected = await db.LabWorkEvents.Where(e => e.LabWorkOrderId == checkpoint.WorkId && e.LabSpecimenId == checkpoint.SpecimenId && e.OccurredAtUtc <= boundary).Select(e => e.Id).ToArrayAsync();
        var seen = new HashSet<Guid>(); var pages = 0; var maximumRows = 0; double firstMs = 0;
        var totalPageQueries = 0; var maximumPageQueries = 0;
        DateTime? before = null; Guid? beforeId = null; var timer = Stopwatch.StartNew();
        do
        {
            var pageTimer = Stopwatch.StartNew();
            meter.Commands = 0;
            var response = JsonSerializer.SerializeToElement(await reviewer.InvestigationEvents(checkpoint.WorkId, checkpoint.SpecimenId, default, boundary, before, beforeId), JsonSerializerOptions.Web);
            maximumPageQueries = Math.Max(maximumPageQueries, meter.Commands); totalPageQueries += meter.Commands;
            if (pages == 0)
            {
                firstMs = pageTimer.Elapsed.TotalMilliseconds;
                // A separately committed writer appends while the cursor session remains open.
                await using var writer = SampleTrackingPhase4Support.Context("restored");
                var appendTime = LabEvidenceTime.UtcNow; Assert.True(appendTime > boundary);
                writer.Add(new LabWorkEvent(checkpoint.WorkId, checkpoint.SpecimenId, "TESTLateAppend", appendTime, null, "{}"));
                await writer.SaveChangesAsync();
            }
            var rows = response.GetProperty("rows"); maximumRows = Math.Max(maximumRows, rows.GetArrayLength()); Assert.InRange(rows.GetArrayLength(), 1, 50);
            foreach (var row in rows.EnumerateArray()) Assert.True(seen.Add(row.GetProperty("id").GetGuid()), "History paging duplicated an event.");
            pages++; var next = response.GetProperty("next");
            if (next.ValueKind == JsonValueKind.Null) break;
            before = next.GetProperty("before").GetDateTime(); beforeId = next.GetProperty("beforeId").GetGuid();
            Assert.True(pages < 1000, "History cursor did not advance.");
        } while (true);
        Assert.Equal(expected.Order(), seen.Order());
        var reportCount = await db.LabInvestigationReports.CountAsync();
        var limited = await Assert.ThrowsAsync<OrderManagementException>(() => reviewer.GenerateInvestigationReport(checkpoint.WorkId, checkpoint.SpecimenId, new(Guid.NewGuid()), default));
        Assert.Equal("report_history_limit", limited.ErrorCode);
        Assert.Equal(reportCount, await db.LabInvestigationReports.CountAsync());
        Assert.InRange(maximumPageQueries, 1, 12);
        await SampleTrackingPhase4Support.WriteAsync("long-history.json", new { result = "passed", insertedEvents = inserted.Length, totalEvents = expected.Length, pages, maximumRows, maximumPageQueries, totalPageQueries, firstPageMilliseconds = firstMs,
            totalPagingMilliseconds = timer.Elapsed.TotalMilliseconds, noMissingOrDuplicateEvents = true, laterAppendExcluded = true, partialReportRejected = true,
            timingScope = "Local API/controller/database measurement; not browser first-usable time or a production SLA" });
        await transaction.RollbackAsync(); db.ChangeTracker.Clear();
    }
}
