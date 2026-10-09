namespace PhaenoPortal.Test;

using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Storage;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task FastqDeliveryReceiptsRecoveryVersionsDispatchQcAndWithdrawalRemainConsistent()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext;
        await using var transaction = await db.Database.BeginTransactionAsync();
        var root = Path.Combine(Path.GetTempPath(), "phaeno-fastq-regression-" + Guid.NewGuid().ToString("N"));
        try {
            var storage = RestoreFiles(Path.Combine(root, "files")); var fixture = await SeedRestoreEvidence(scope, storage, includeResult: false);
            var library = await db.LabLibraries.SingleAsync(l => l.LabWorkOrderId == fixture.WorkId);
            var now = LabEvidenceTime.UtcNow; var actor = scope.PlatformUser.Id;
            var batch = new LabOperationalBatch("FASTQ-" + scope.Suffix, "SIMULATED FASTQ intake", null); batch.Start(now);
            var member = new LabBatchMember(batch.Id, fixture.WorkId, library.Id, now);
            var container = await db.LabContainers.SingleAsync(c => c.Id == library.LibraryContainerId);
            var sendout = new LabNgsSendout(batch.Id, "SIMULATED FASTQ vendor", "SIMULATED-JOB", JsonSerializer.Serialize(new {
                members = new[] { new { libraryId = library.Id, libraryKey = library.LibraryKey, containerBarcode = container.Barcode } }
            }), null);
            sendout.SetStatus(LabNgsSendoutStatus.Shipped, now); sendout.SetStatus(LabNgsSendoutStatus.ReceivedByProvider, now);
            db.AddRange(batch, member, sendout); await db.SaveChangesAsync();
            var api = scope.CreateLabController(); var limits = Options.Create(new LabFastqOptions()); var scan = Options.Create(new FileScanningOptions()); var scanner = new GapScanner();
            var r1 = Encoding.ASCII.GetBytes("@SIMULATED/1\nACGT\n+\nIIII\n"); var r2 = Encoding.ASCII.GetBytes("@SIMULATED/2\nTGCA\n+\nIIII\n");
            async Task<Guid> Draft(string payload = "{}") {
                var id = Guid.NewGuid(); await api.SaveResultsDraft(sendout.Id, new(id, sendout.Version, null, JsonSerializer.Deserialize<JsonElement>(payload)), limits, default); return id;
            }
            async Task<Guid> Set(Guid draft, string layout = "PairedEnd") {
                var id = Guid.NewGuid(); await api.BeginFastqSet(sendout.Id, new(id, draft, member.Id, 1, "NewPreparation", layout), limits, default); return id;
            }
            async Task<Guid> Raw(Guid set, byte[] bytes, int read) {
                var id = Guid.NewGuid(); var request = new LabOperationsController.FastqUploadRequest(id, $"SIMULATED_R{read}.fastq", bytes.Length, FastqFixtureFingerprint(bytes), 1, read, 1, "SIMULATED lane");
                await api.BeginFastqUpload(set, request, scan, default);
                api.Request.Body = new MemoryStream(bytes); api.Request.ContentLength = bytes.Length;
                await api.UploadFastqChunk(id, 0, storage, default);
                api.Request.Body = new MemoryStream(bytes); await api.UploadFastqChunk(id, 0, storage, default);
                scanner.Clean = false;
                await Assert.ThrowsAsync<OrderManagementException>(() => api.CompleteFastqUpload(id, storage, scanner, scan, default));
                scanner.Clean = true;
                var completed = GapJson(await api.CompleteFastqUpload(id, storage, scanner, scan, default));
                Assert.Equal(completed.GetProperty("fileId").GetGuid(), GapJson(await api.CompleteFastqUpload(id, storage, scanner, scan, default)).GetProperty("fileId").GetGuid());
                var file = await db.LabScientificFiles.SingleAsync(f => f.Id == completed.GetProperty("fileId").GetGuid());
                await using var verified = await LabScientificFiles.OpenVerifiedAsync(storage, file.StorageKey, file.Sha256, file.SizeBytes, default);
                Assert.Equal(Convert.ToHexString(SHA256.HashData(bytes)), Convert.ToHexString(await SHA256.HashDataAsync(verified)));
                return id;
            }
            RecordVendorResultsRequest Request(Guid id, Guid set, string note) => new(id, sendout.Version, "SIMULATED-JOB", false, now, now, now,
                "Success", [], [set], note, DraftId: id, DraftVersion: db.Set<LabVendorResultsDraft>().Single(d => d.Id == id).Version, FilesConfirmed: true);
            async Task<VendorResultsSnapshot> Snapshot() => JsonSerializer.Deserialize<VendorResultsSnapshot>((await db.LabVendorResultsVersions
                .Where(v => v.LabNgsSendoutId == sendout.Id).OrderByDescending(v => v.ResultVersion).FirstAsync()).SnapshotJson, LabAssemblyService.Json)!;

            // Connected ZIP receipt, partial entry import, exact replay and duplicate mapping rejection.
            var firstDraft = await Draft(); var zipSet = await Set(firstDraft); var archiveId = Guid.NewGuid();
            using var zipBytes = new MemoryStream();
            using (var zip = new ZipArchive(zipBytes, ZipArchiveMode.Create, true)) {
                using (var entry = zip.CreateEntry("library/SIMULATED_R1.fastq").Open()) entry.Write(r1);
                using (var entry = zip.CreateEntry("library/SIMULATED_R2.fastq").Open()) entry.Write(r2);
            }
            var bytes = zipBytes.ToArray(); await api.BeginFastqArchive(firstDraft, new(archiveId, "SIMULATED.zip", bytes.Length, FastqFixtureFingerprint(bytes)), limits, scan, default);
            api.Request.Body = new MemoryStream(bytes); api.Request.ContentLength = bytes.Length; await api.UploadFastqArchiveChunk(archiveId, 0, storage, default);
            await api.InspectFastqArchive(archiveId, limits, scan, storage, scanner, default);
            var mapping = new LabOperationsController.FastqArchiveImport(Guid.NewGuid(), zipSet, 0, 1, 1, 1, "SIMULATED lane");
            var imported = GapJson(await api.ImportFastqArchiveEntry(archiveId, mapping, limits, scan, storage, scanner, default));
            Assert.Equal(imported.GetProperty("fileId").GetGuid(), GapJson(await api.ImportFastqArchiveEntry(archiveId, mapping, limits, scan, storage, scanner, default)).GetProperty("fileId").GetGuid());
            await Assert.ThrowsAsync<OrderManagementException>(() => api.ImportFastqArchiveEntry(archiveId, mapping with { UploadId = Guid.NewGuid() }, limits, scan, storage, scanner, default));
            await Assert.ThrowsAsync<OrderManagementException>(() => api.RecordVendorResults(sendout.Id, Request(firstDraft, zipSet, "SIMULATED first receipt"), default));
            await api.ImportFastqArchiveEntry(archiveId, mapping with { UploadId = Guid.NewGuid(), EntryIndex = 1, ReadNumber = 2 }, limits, scan, storage, scanner, default);
            // A concurrent admission lock must delay sealing. Then saved sets reject new uploads.
            var pendingSet = await Set(firstDraft);
            await using (var blocker = scope.CreateAdditionalContext()) {
                await using var blocked = await blocker.Database.BeginTransactionAsync();
                await SampleShippingPackingData.LockAsync(blocker, "fastq-set:" + pendingSet, default);
                var saving = api.RecordVendorResults(sendout.Id, Request(firstDraft, pendingSet, "SIMULATED pending receipt"), default);
                await Task.Delay(100); Assert.False(saving.IsCompleted);
                await blocked.CommitAsync(); await Assert.ThrowsAsync<OrderManagementException>(() => saving);
            }
            await api.RecordVendorResults(sendout.Id, Request(firstDraft, zipSet, "SIMULATED first receipt"), default);
            await Assert.ThrowsAsync<OrderManagementException>(() => api.BeginFastqUpload(zipSet,
                new(Guid.NewGuid(), "SIMULATED_extra.fastq", r1.Length, FastqFixtureFingerprint(r1), 2, 1, 1, "SIMULATED other lane"), scan, default));
            var first = await Snapshot(); var firstOutputs = first.FastqSets!.Single().Files.Select(f => f.OutputId).ToArray();
            var provider = new FastqFixtureProvider(); var clock = TimeProvider.System; var cache = new LabAssemblyProgress(clock);
            var assembly = new LabAssemblyService(db, provider, cache, Options.Create(new LabAssemblyOptions { WorkerEnabled = true }), Options.Create(new PSeqOrderToCashOptions()), clock, storage);
            var queued = await assembly.StartAsync(fixture.WorkId, new(Guid.NewGuid(), fixture.SpecimenId, 1, "SIMULATED", firstOutputs), actor, default);

            // Individual files replace the ZIP set; the queued old inputs must never dispatch.
            var rawDraft = await Draft(); var rawSet = await Set(rawDraft); await Raw(rawSet, r1, 1); await Raw(rawSet, r2, 2);
            await api.RecordVendorResults(sendout.Id, Request(rawDraft, rawSet, "SIMULATED replacement vendor files"), default);
            var second = await Snapshot(); var secondOutputs = second.FastqSets!.Single().Files.Select(f => f.OutputId).ToArray();
            var processor = new LabAssemblyProcessor(db, assembly, provider, cache, clock, new LabAssemblyDelivery(db, assembly, Options.Create(new LabAssemblyOptions()), clock));
            await processor.ProcessAsync(queued.Id, default);
            Assert.Equal(0, provider.StartCalls); Assert.Contains("superseded", (await db.Set<LabAssemblyJob>().SingleAsync(j => j.Id == queued.Id)).AttentionReason);
            sendout = await db.LabNgsSendouts.SingleAsync(s => s.Id == sendout.Id);

            // A note-only revision preserves inputs and does not create correction outputs.
            var orphan = await Draft(); var recoveredSet = await Set(orphan, "SingleEnd"); await Raw(recoveredSet, r1, 1);
            await api.RecordVendorResults(sendout.Id, new(Guid.NewGuid(), sendout.Version, "SIMULATED-JOB", false, now, now, now,
                "Success", [], [rawSet], "SIMULATED notes-only correction", FilesConfirmed: true), default);
            Assert.Equal(secondOutputs, (await Snapshot()).FastqSets!.Single().Files.Select(f => f.OutputId));
            Assert.Equal(4, await db.LabSequencingOutputs.CountAsync(o => o.LabNgsSendoutId == sendout.Id));
            var currentSource = await db.Set<LabVendorResultsDraft>().SingleAsync(d => d.Id == orphan);
            var restartedId = Guid.NewGuid(); var payload = JsonSerializer.SerializeToElement(new { notes = "SIMULATED preserve notes", files = new[] { new { memberId = member.Id, setId = recoveredSet } } });
            var restartRequest = new LabOperationsController.RestartResultsDraftRequest(restartedId, orphan, currentSource.Version, sendout.Version, payload);
            await api.RestartResultsDraft(sendout.Id, restartRequest, limits, default);
            await api.RestartResultsDraft(sendout.Id, restartRequest, limits, default);
            await Assert.ThrowsAsync<OrderManagementException>(() => api.RestartResultsDraft(sendout.Id,
                restartRequest with { Payload = JsonSerializer.SerializeToElement(new { notes = "Different instructions" }) }, limits, default));
            var restarted = await db.Set<LabVendorResultsDraft>().SingleAsync(d => d.Id == restartedId);
            Assert.Contains(recoveredSet.ToString(), restarted.PayloadJson);
            await api.SaveResultsDraft(sendout.Id, new(restarted.Id, sendout.Version, restarted.Version, JsonSerializer.SerializeToElement(new { notes = "SIMULATED reviewed notes" })), limits, default);
            Assert.Contains(recoveredSet.ToString(), restarted.PayloadJson);
            await api.RecordVendorResults(sendout.Id, Request(restartedId, recoveredSet, "SIMULATED explicitly reviewed recovered file"), default);
            Assert.Equal(JsonValueKind.Null, GapJson(await api.ResultsIntake(sendout.Id, limits, scan, default)).GetProperty("draft").ValueKind);
            var current = await Snapshot(); var ids = current.FastqSets!.Single().Files.Select(f => f.OutputId).ToArray();
            Assert.False(await LabScientificReviewQueueQuery.PendingPackages(db).AnyAsync(p => p.LabWorkOrderId == fixture.WorkId));
            var lineage = new LabResultLineageService(db);
            var analysis = await lineage.RegisterAnalysisAsync(new(Guid.NewGuid(), fixture.WorkId, fixture.SpecimenId, "SIMULATED", "SIMULATED-EXECUTION", ids), actor, "SIMULATED test fixture", default);
            var job = new LabAssemblyJob(Guid.NewGuid(), fixture.WorkId, fixture.SpecimenId, scope.CustomerOrganization.Id, 1, actor, "SIMULATED", "{}",
                JsonSerializer.Serialize(new AssemblyFrozenInputs(ids.Select(id => new AssemblyInput(id, "SIMULATED", new string('A', 64), r1.Length)).ToArray(), new("SIMULATED", now, []), 1), LabAssemblyService.Json), new string('A', 64), now);
            job.BeginDispatch(now); job.Observe("SIMULATED-EXECUTION", "Succeeded", now, now, now, null, "{}", false, DateTime.UtcNow); job.LinkAnalysis(analysis.Id);
            var owningWork = await db.LabWorkOrders.SingleAsync(w => w.Id == fixture.WorkId);
            var owningSample = await db.LabSpecimens.SingleAsync(s => s.Id == fixture.SpecimenId);
            var package = new ResultOutputPackage(scope.CustomerOrganization.Id, owningWork.AuthorizationSourceId, fixture.WorkId, owningSample.SubmittedSpecimenId, 1, null,
                "SIMULATED", "SIMULATED transfer", "fastq-qc-" + scope.Suffix, "{}", new string('A', 64), 1, labAnalysisRunId: analysis.Id);
            package.BeginScanning(); package.MarkReadyForReview(1, true, true);
            var report = new LabScientificFile(fixture.WorkId, fixture.SpecimenId, "SIMULATED-QC.pdf", fixture.StorageKey, fixture.FileSha256, Encoding.UTF8.GetByteCount("%PDF-TEST ONLY restoration evidence"), actor, DateTime.UtcNow);
            await using var resultBytes = new MemoryStream(Encoding.ASCII.GetBytes("SIMULATED assembly output"));
            var resultFile = await storage.SaveAsync(resultBytes, ".txt", 1024, default);
            var artifact = new ResultArtifact(package.Id, "result", "SIMULATED-result.txt", "text/plain", resultFile.SizeBytes, resultFile.Sha256, resultFile.StorageKey, "*");
            artifact.BeginScan(); artifact.CompleteScan(true, "SIMULATED clean", DateTime.UtcNow);
            db.AddRange(job, package, report, artifact); await db.SaveChangesAsync();
            var policy = new PSeqOrderToCashOptions { RequireScientificEvidence = false, RequireResultTraceability = false };
            await Assert.ThrowsAsync<OrderManagementException>(() => lineage.RequirePackageAsync(package, default, policy));
            Assert.False(await LabScientificReviewQueueQuery.PendingPackages(db).AnyAsync(p => p.Id == package.Id));
            var version = 0;
            foreach (var decision in new[] { "Fail", "Hold", "Pass", "Hold", "Pass" }) {
                await api.RecordAssemblyQc(job.Id, new(Guid.NewGuid(), job.Version, package.Id, package.Version, version++, decision, "SIMULATED QC decision", report.Id, [], true), default);
                Assert.Equal(decision == "Pass", await LabScientificReviewQueueQuery.PendingPackages(db).AnyAsync(p => p.Id == package.Id));
                if (decision != "Pass") await Assert.ThrowsAsync<OrderManagementException>(() => lineage.RequirePackageAsync(package, default, policy));
            }
            await lineage.RequirePackageAsync(package, default, policy);
            package.RecordScientificApproval(Guid.NewGuid(), scope.CustomerUser.Id, DateTime.UtcNow); package.MarkReadyForRelease(package.ScientificApprovalId!.Value); package.Release(actor, DateTime.UtcNow); await db.SaveChangesAsync();
            Assert.False(await LabScientificReviewQueueQuery.PendingPackages(db).AnyAsync(p => p.Id == package.Id));
            var failed = new RecordVendorResultsRequest(Guid.NewGuid(), sendout.Version, "SIMULATED-JOB", false, now, now, now, "Failure", [], [], "SIMULATED corrected failure");
            var protectedError = await Assert.ThrowsAsync<OrderManagementException>(() => api.RecordVendorResults(sendout.Id, failed, default));
            Assert.Equal("vendor_results_withdrawal_required", protectedError.ErrorCode);
            package.Withdraw(actor, DateTime.UtcNow, "SIMULATED withdrawal before correction"); await db.SaveChangesAsync();
            await api.RecordVendorResults(sendout.Id, failed, default);
            var oldInputs = await db.LabSequencingOutputs.Where(o => ids.Contains(o.Id)).ToListAsync();
            await Assert.ThrowsAsync<OrderManagementException>(() => lineage.RequireCurrentFastqInputsAsync(oldInputs, default));
        }
        finally {
            await transaction.RollbackAsync(); scope.ClearTrackedState();
            var absolute = Path.GetFullPath(root);
            if (absolute.StartsWith(Path.GetFullPath(Path.GetTempPath()), StringComparison.OrdinalIgnoreCase) && Path.GetFileName(absolute).StartsWith("phaeno-fastq-regression-", StringComparison.Ordinal) && Directory.Exists(absolute)) Directory.Delete(absolute, true);
        }
    }

    private static string FastqFixtureFingerprint(byte[] bytes) => Convert.ToHexString(SHA256.HashData(Encoding.ASCII.GetBytes(Convert.ToHexString(SHA256.HashData(bytes)))));
    private sealed class FastqFixtureProvider : ILabAssemblyProvider
    {
        public string Key => "SIMULATED";
        public AssemblyProviderAvailability Availability => new(true, "SIMULATED verification fixture", true, [new("SIMULATED", "SIMULATED", "1", "{}")]);
        public bool SupportsIdempotentStart => true;
        public int StartCalls { get; private set; }
        public Task<AssemblyInputVerification> VerifyInputsAsync(IReadOnlyList<AssemblyInput> inputs, CancellationToken ct) => Task.FromResult(new AssemblyInputVerification(new string('A', 64), DateTime.UtcNow,
            inputs.Select(i => new VerifiedAssemblyInput(i.SequencingOutputId, "", "", null, i.Sha256, i.SizeBytes, StorageKind: "ManagedLocal", ManagedFileId: Guid.Parse(i.ExternalFileReference[LabScientificFiles.Prefix.Length..]))).ToArray()));
        public Task<AssemblyProviderSnapshot?> FindAsync(Guid id, CancellationToken ct) => Task.FromResult<AssemblyProviderSnapshot?>(null);
        public Task<AssemblyProviderSnapshot> StartAsync(LabAssemblyJob job, CancellationToken ct) { StartCalls++; throw new InvalidOperationException("Superseded inputs must never dispatch."); }
        public Task<AssemblyProviderSnapshot?> CancelAsync(Guid id, string reason, CancellationToken ct) => Task.FromResult<AssemblyProviderSnapshot?>(null);
    }
}
