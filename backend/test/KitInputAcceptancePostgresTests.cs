namespace PhaenoPortal.Test;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class KitBundlePostgresTests
{
    // All purchase, shipment and scan prerequisites are simulated in a disposable
    // database. These checks do not attest to physical custody or scientific data.
    [PostgreSqlReferenceFact]
    public async Task IncludedInputsResumeWithoutDuplicatesAndFreezeOneValidatedRevision()
    {
        await using var scope = await Scope.Create();
        scope.Profile.Update("Frozen input rules", scope.Profile.Instructions, "{\"required\":[\"reference\"]}",
            "[\".fasta\"]", "{\"outputs\":[\"result.fasta\"]}", 32, 48, true, false);
        await scope.Db.SaveChangesAsync();
        var order = await scope.ShipAndFulfill(1);
        var included = Assert.Single(order.AssemblyCases!);
        var start = new KitAssemblyStartRequest(included.Version, "SIMULATED KIT04 INPUTS", "{}", "Unpurchased output", null, false);
        var prepareKey = Guid.NewGuid().ToString();
        var draft = await scope.Assembly(prepareKey).PrepareIncludedCase(order.Id, included.Id, start, default);
        Assert.Equal(draft.Id, (await scope.Assembly(prepareKey).PrepareIncludedCase(order.Id, included.Id, start, default)).Id);
        Assert.DoesNotContain("Unpurchased output", draft.RequestedOutput);
        var storage = new InputBytes();
        var scanner = new InputScanner();
        var firstKey = Guid.NewGuid().ToString();
        var first = await Upload(scope, draft.Id, storage, scanner, "first.fasta", new byte[24], firstKey);
        var firstAgain = await Upload(scope, draft.Id, storage, scanner, "first.fasta", new byte[24], firstKey);
        Assert.Equal(first.Id, firstAgain.Id);
        Assert.Single(storage.Files);

        // Interrupt after new bytes are stored; the prior successful input survives.
        scanner.Interrupt = true;
        var secondKey = Guid.NewGuid().ToString();
        await Assert.ThrowsAsync<IOException>(() => Upload(scope, draft.Id, storage, scanner, "second.fasta", new byte[24], secondKey));
        Assert.Single(storage.Files);
        Assert.Equal(1, storage.Deleted);
        Assert.Single(await scope.Db.ManagedOperationalFiles.AsNoTracking().Where(x => x.WorkflowId == draft.Id).ToListAsync());
        scanner.Interrupt = false;
        var second = await Upload(scope, draft.Id, storage, scanner, "second.fasta", new byte[24], secondKey);
        Assert.Equal(second.Id, (await Upload(scope, draft.Id, storage, scanner, "second.fasta", new byte[24], secondKey)).Id);

        async Task UploadDenied(string name, int size, string code)
        {
            Assert.Equal(code, (await Assert.ThrowsAsync<OrderManagementException>(() =>
                Upload(scope, draft.Id, storage, scanner, name, new byte[size]))).ErrorCode);
            Assert.Equal(2, storage.Files.Count);
            await AssertNoSubmission(scope, draft.Id);
        }
        await UploadDenied("unsupported.exe", 1, "file_kind_not_allowed");
        await UploadDenied("too-large.fasta", 33, "file_too_large");
        await UploadDenied("total-overflow.fasta", 1, "assembly_total_size_exceeded");

        var manifest = JsonSerializer.Serialize(new { files = new[] { new { id = first.Id }, new { id = second.Id } } });
        Assert.Equal("assembly_metadata_required", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Assembly().Submit(draft.Id, new(draft.Version, manifest), default))).ErrorCode);
        await AssertNoSubmission(scope, draft.Id);
        draft = await scope.Assembly().Update(draft.Id, new(draft.AssemblyProfileId, draft.ProjectReference,
            "{\"reference\":\"SIMULATED-ONLY\"}", draft.RequestedOutput, null, false, draft.Version), default);
        Assert.Equal("assembly_action_not_allowed", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Assembly().Submit(draft.Id, new(draft.Version, manifest), default))).ErrorCode);
        await AssertNoSubmission(scope, draft.Id);
        draft = await scope.Assembly().Update(draft.Id, new(draft.AssemblyProfileId, draft.ProjectReference,
            draft.MetadataJson, draft.RequestedOutput, null, true, draft.Version), default);
        Assert.Equal("assembly_manifest_invalid", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Assembly().Submit(draft.Id, new(draft.Version, "{\"files\":[]}"), default))).ErrorCode);
        await AssertNoSubmission(scope, draft.Id);

        // Later catalog edits cannot replace the scope purchased for this case.
        var profile = await scope.Db.AssemblyProfiles.SingleAsync(x => x.Id == scope.Profile.Id);
        profile.Update("Changed catalog", "Different instructions", "{\"required\":[\"newField\"]}", "[\".txt\"]", "{}", 1, 1, false, false);
        await scope.Db.SaveChangesAsync();
        var submitKey = Guid.NewGuid().ToString();
        var submit = new AssemblySubmitRequest(draft.Version, manifest);
        var submitted = await scope.Assembly(submitKey).Submit(draft.Id, submit, default);
        var replay = await scope.Assembly(submitKey).Submit(draft.Id, submit, default);
        Assert.Equal(submitted.Version, replay.Version);
        Assert.Equal("Submitted", replay.Status);
        scope.Db.ChangeTracker.Clear();
        var revision = Assert.Single(await scope.Db.AssemblyInputRevisions.AsNoTracking().Where(x => x.DataAssemblyRequestId == draft.Id).ToListAsync());
        Assert.Equal(included.CurrentKitUnitId, revision.KitUnitId);
        Assert.True(System.Text.Json.Nodes.JsonNode.DeepEquals(
            System.Text.Json.Nodes.JsonNode.Parse(manifest), System.Text.Json.Nodes.JsonNode.Parse(revision.ManifestJson)));
        var files = await scope.Db.ManagedOperationalFiles.AsNoTracking().Where(x => x.WorkflowId == draft.Id).ToListAsync();
        Assert.Equal(2, files.Count);
        Assert.All(files, file =>
        {
            Assert.Equal(revision.Id, file.ParentRecordId);
            Assert.Equal(Convert.ToHexString(SHA256.HashData(storage.Files[file.StorageKey])), file.Sha256, ignoreCase: true);
        });
        Assert.Single(await scope.Db.DataAssemblyRequests.Where(x => x.KitAssemblyCaseId == included.Id).ToListAsync());
        Assert.Equal("assembly_input_not_editable", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            Upload(scope, draft.Id, storage, scanner, "late.fasta", new byte[1]))).ErrorCode);
        Assert.Equal("assembly_input_not_editable", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Assembly().DeleteInput(draft.Id, first.Id, first.Version, default))).ErrorCode);
        Assert.False(await scope.Db.AssemblyProcessingRuns.AnyAsync(x => x.DataAssemblyRequestId == draft.Id));
        Assert.False(await scope.Db.CommercialDocumentLinks.AnyAsync(x => x.WorkflowId == draft.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task IncludedInputsRejectEveryNonCleanScanWithoutCreatingARevision()
    {
        await using var scope = await Scope.Create();
        var order = await scope.ShipAndFulfill(1);
        var included = Assert.Single(order.AssemblyCases!);
        var draft = await scope.Assembly().PrepareIncludedCase(order.Id, included.Id,
            new(included.Version, "SIMULATED SCAN STATES", "{}", "Included outputs", null, true), default);
        var storage = new InputBytes();
        foreach (var status in new[] { OperationalFileScanStatus.Pending, OperationalFileScanStatus.Scanning,
            OperationalFileScanStatus.Rejected, OperationalFileScanStatus.Failed, OperationalFileScanStatus.Unavailable })
        {
            var file = await Upload(scope, draft.Id, storage, new InputScanner { Status = status }, status + ".fasta", Encoding.UTF8.GetBytes(">TEST ONLY\nACGT\n"));
            Assert.Equal(status.ToString(), file.ScanStatus);
            var manifest = JsonSerializer.Serialize(new { files = new[] { new { id = file.Id } } });
            Assert.Equal("assembly_input_not_clean", (await Assert.ThrowsAsync<OrderManagementException>(() =>
                scope.Assembly().Submit(draft.Id, new(draft.Version, manifest), default))).ErrorCode);
            await AssertNoSubmission(scope, draft.Id);
            await scope.Assembly().DeleteInput(draft.Id, file.Id, file.Version, default);
        }
        Assert.Equal(5, await scope.Db.ManagedOperationalFiles.CountAsync(x => x.WorkflowId == draft.Id && x.ReleaseStatus == FileReleaseStatus.Withdrawn));
    }

    [PostgreSqlReferenceFact]
    public async Task ExpiredIncludedDraftRejectsUploadUpdateAndSubmissionWhileRetainingFiles()
    {
        await using var scope = await Scope.Create();
        var order = await scope.ShipAndFulfill(1);
        var included = Assert.Single(order.AssemblyCases!);
        var draft = await scope.Assembly().PrepareIncludedCase(order.Id, included.Id,
            new(included.Version, "SIMULATED EXPIRED INPUT", "{}", "Included outputs", null, true), default);
        var storage = new InputBytes(); var scanner = new InputScanner();
        var file = await Upload(scope, draft.Id, storage, scanner, "retained.fasta", new byte[4]);
        var entity = await scope.Db.KitAssemblyCases.SingleAsync(x => x.Id == included.Id);
        scope.Db.Entry(entity).Property(x => x.SubmissionDeadlineAt).CurrentValue = DateTime.UtcNow.AddDays(-1);
        await scope.Db.SaveChangesAsync();
        Assert.Equal("included_case_unavailable", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            Upload(scope, draft.Id, storage, scanner, "late.fasta", new byte[4]))).ErrorCode);
        Assert.Equal("included_case_unavailable", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Assembly().Update(draft.Id, new(draft.AssemblyProfileId, "Late change", "{}", draft.RequestedOutput, null, true, draft.Version), default))).ErrorCode);
        Assert.Equal("included_case_unavailable", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Assembly().Submit(draft.Id, new(draft.Version, JsonSerializer.Serialize(new { files = new[] { new { id = file.Id } } })), default))).ErrorCode);
        await AssertNoSubmission(scope, draft.Id);
        Assert.Single(storage.Files);
        Assert.Equal(draft.ProjectReference, (await scope.Assembly().Get(draft.Id, default)).ProjectReference);
    }

    private static async Task AssertNoSubmission(Scope scope, Guid id)
    {
        scope.Db.ChangeTracker.Clear();
        var current = await scope.Db.DataAssemblyRequests.AsNoTracking().SingleAsync(x => x.Id == id);
        Assert.Equal(AssemblyRequestStatus.Draft, current.Status);
        Assert.Null(current.CurrentInputRevisionId);
        Assert.False(await scope.Db.AssemblyInputRevisions.AnyAsync(x => x.DataAssemblyRequestId == id));
        Assert.False(await scope.Db.AssemblyProcessingRuns.AnyAsync(x => x.DataAssemblyRequestId == id));
    }

    private static async Task<OperationalFileDto> Upload(Scope scope, Guid id, InputBytes storage, InputScanner scanner,
        string name, byte[] value, string? key = null)
    {
        await using var bytes = new MemoryStream(value);
        var file = new FormFile(bytes, 0, bytes.Length, "file", name) { Headers = new HeaderDictionary(), ContentType = "text/plain" };
        return await scope.Assembly(key, storage, scanner).UploadInput(id, file, default);
    }

    private sealed class InputScanner : IOperationalFileScanner
    {
        public bool Interrupt { get; set; }
        public OperationalFileScanStatus Status { get; init; } = OperationalFileScanStatus.Clean;
        public Task<OperationalScanResult> ScanAsync(string storageKey, CancellationToken cancellationToken)
            => Interrupt ? throw new IOException("SIMULATED interruption after storage")
                : Task.FromResult(new OperationalScanResult(Status, "SIMULATED scan result"));
    }

    private sealed class InputBytes : IOperationalFileStorage
    {
        public Dictionary<string, byte[]> Files { get; } = [];
        public int Deleted { get; private set; }
        public async Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maximumBytes, CancellationToken cancellationToken)
        {
            using var target = new MemoryStream(); await content.CopyToAsync(target, cancellationToken);
            var bytes = target.ToArray(); Assert.True(bytes.LongLength <= maximumBytes);
            var key = Guid.NewGuid().ToString("N") + extension; Files.Add(key, bytes);
            return new(key, bytes.LongLength, Convert.ToHexString(SHA256.HashData(bytes)));
        }
        public Task<Stream> OpenReadAsync(string storageKey, CancellationToken cancellationToken)
            => Task.FromResult<Stream>(new MemoryStream(Files[storageKey], writable: false));
        public Task DeleteIfExistsAsync(string storageKey, CancellationToken cancellationToken)
        { if (Files.Remove(storageKey)) Deleted++; return Task.CompletedTask; }
    }
}
