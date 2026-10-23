namespace PhaenoPortal.Test;

using System.Text;
using System.Text.Json;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Storage;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task DpsScientificAdmissionRetriesAfterScanFailureWithoutChangingExecutionOrStartingAgain()
    {
        // Admission must own real commit/rollback boundaries. The entire fixture database is disposable.
        await InAdmissionDatabase(async scope => {
        var root = Path.Combine(Path.GetTempPath(), "dps-admission-" + Guid.NewGuid().ToString("N"));
        var db = scope.DbContext;
        try {
            var fixture = await SeedRestoreEvidence(scope, RestoreFiles(Path.Combine(root, "files")));
            var input = await db.LabSequencingOutputs.SingleAsync(o => o.LabWorkOrderId == fixture.WorkId);
            var orderId = (await db.LabWorkOrders.SingleAsync(w => w.Id == fixture.WorkId)).AuthorizationSourceId;
            var now = DateTime.UtcNow.AddMinutes(-1); now = new(now.Ticks - now.Ticks % 10, DateTimeKind.Utc);
            var clock = new AssemblyTestClock(now.AddMinutes(1));
            var recipe = new DpsRecipe("pseq_scientific_assembly", "0.1.0", JsonSerializer.SerializeToElement(new { threads = 1 }), ["assembly_output"]);
            var id = Guid.NewGuid(); var prefix = "dps-fixture/" + id + "/";
            using var client = new AdmissionObjects();
            var parameters = client.Add(prefix + "parameters.json", "{\"threads\":1}");
            var source = client.Add(prefix + "input.json", "{}");
            var output = client.Add(prefix + "outputs/assembly.fasta", ">transcript\nACGTACGT\n");
            var instructions = new DpsInputManifest(DpsContract.Version, "local", "input_manifest", id, now,
                new(scope.CustomerOrganization.Id, orderId, fixture.WorkId, fixture.SpecimenId, input.LabLibraryId, Guid.NewGuid(), 1, Guid.NewGuid(), 1, 1),
                "SingleEnd", recipe, [new(Guid.NewGuid(), input.Id, "read.fastq", "read.fastq", 1, 1, 1, "TEST ONLY", 1, "none", source)],
                new("fixture-bucket", "us-east-2", prefix + "outputs/"));
            var frozen = new AssemblyFrozenInputs([new(input.Id, input.ExternalFileReference, input.Sha256, input.SizeBytes)],
                new("TEST ONLY admission fixture", now, []), 1, new("fixture-bucket", "us-east-2", prefix, id), new(source, instructions, parameters));
            var manifest = new DpsOutputManifest(DpsContract.Version, "local", "output_manifest", id, "dps-" + id, instructions.Scope, recipe,
                source.Sha256, now, now.AddSeconds(10), now.AddSeconds(11), new("TEST ONLY engine", "test-1", [new("TEST ONLY tool", "test-1")], [],
                    [new("TEST ONLY reference", "test-v1", new string('a', 64))], null), [new(Guid.NewGuid(), "assembly_output", "FASTA", "assembly.fasta", output)]);
            var job = new LabAssemblyJob(id, fixture.WorkId, fixture.SpecimenId, scope.CustomerOrganization.Id, 1, scope.PlatformUser.Id,
                DpsContract.Provider, JsonSerializer.Serialize(new AssemblyRecipe(recipe.Key, "TEST ONLY", recipe.Version, "{\"threads\":1}", recipe.RequiredOutputRoles), LabAssemblyService.Json),
                JsonSerializer.Serialize(frozen, LabAssemblyService.Json), new string('A', 64), now.AddSeconds(-1));
            job.BeginDispatch(now);
            job.Observe(manifest.ProviderJobId, "Succeeded", manifest.StartedAtUtc, manifest.StoppedAtUtc, manifest.CreatedAtUtc, null,
                JsonSerializer.Serialize(manifest, DpsContract.Json), false, now.AddSeconds(12));
            var run = new LabAssemblyCommand(id, "Run", now); run.Attempt(now, 5, 60);
            var receipt = new LabAssemblyReceipt(id, DpsContract.Provider, "test-final", 2, now.AddSeconds(11), now.AddSeconds(12),
                new string('B', 64), JsonSerializer.Serialize(new { fixture = "TEST ONLY original final receipt" }), "Applied");
            db.AddRange(job, run, receipt); await db.SaveChangesAsync();
            await db.Entry(job).ReloadAsync(); await db.Entry(receipt).ReloadAsync(); await db.Entry(run).ReloadAsync();
            var original = Execution(job); var receiptJson = JsonSerializer.Serialize(receipt); var commandJson = JsonSerializer.Serialize(run);
            var filesBefore = await db.LabScientificFiles.CountAsync();
            using var storage = new DpsStorage(new S3FileStorageOptions { BucketName = "fixture-bucket", Region = "us-east-2", KeyPrefix = "dps-fixture" }, client);
            var scanner = new AdmissionScanner { RejectCall = 2 }; // The first file row must roll back too.
            DpsOutputAdmission Admission() => new(db, new(storage), scanner, Options.Create(new DpsOptions()),
                MessagingService(db, clock, new(clock)), clock, Options.Create(new FileScanningOptions()));
            Assert.Equal("dps_output_scan_required", (await Assert.ThrowsAsync<OrderManagementException>(() => Admission().AdmitAsync(id, default))).ErrorCode);
            db.ChangeTracker.Clear();
            Assert.Equal(filesBefore, await db.LabScientificFiles.CountAsync());
            Assert.Equal(original, Execution(await db.Set<LabAssemblyJob>().SingleAsync(j => j.Id == id)));
            scanner.RejectCall = 0;
            await Admission().AdmitAsync(id, default); db.ChangeTracker.Clear();
            var admitted = await db.Set<LabAssemblyJob>().SingleAsync(j => j.Id == id);
            Assert.NotNull(admitted.LabAnalysisRunId); Assert.Equal(id, admitted.LabAnalysisRunId);
            Assert.Equal(original, Execution(admitted)); Assert.Equal(filesBefore + 2, await db.LabScientificFiles.CountAsync());
            Assert.Single(await db.LabAnalysisRuns.Where(a => a.Id == id).ToArrayAsync());
            var science = await db.LabAnalysisRuns.SingleAsync(a => a.Id == id);
            Assert.Contains("TEST ONLY reference", science.ScientificEvidenceJson); Assert.Contains("assembly_output", science.ScientificEvidenceJson);
            var scans = scanner.Calls; var gets = client.Reads;
            await Admission().AdmitAsync(id, default);
            Assert.Equal(scans, scanner.Calls); Assert.Equal(gets, client.Reads);
            Assert.Equal(receiptJson, JsonSerializer.Serialize(await db.Set<LabAssemblyReceipt>().SingleAsync(r => r.Id == receipt.Id)));
            Assert.Equal(commandJson, JsonSerializer.Serialize(await db.Set<LabAssemblyCommand>().SingleAsync(c => c.Id == run.Id)));
            Assert.Single(await db.Set<LabAssemblyCommand>().Where(c => c.LabAssemblyJobId == id).ToArrayAsync());
            Assert.Single(await db.Set<LabAssemblyEvent>().Where(e => e.LabAssemblyJobId == id && e.Kind == "DpsOutputsAdmitted").ToArrayAsync());
        } finally { if (Directory.Exists(root)) Directory.Delete(root, true); }
        static string Execution(LabAssemblyJob job) => JsonSerializer.Serialize(new { job.State, job.ProviderJobId, job.StartedAtUtc, job.StoppedAtUtc, job.DispositionAtUtc, job.DispositionReason, job.OutputManifestJson });
        });
    }

    private static async Task InAdmissionDatabase(Func<ShippingTestScope, Task> test)
    {
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!);
        if (connection.Host is not ("127.0.0.1" or "localhost")) throw new InvalidOperationException("DPS admission fixtures require local PostgreSQL.");
        const string prefix = "pseq_dps_admission_test_";
        var name = prefix + Guid.NewGuid().ToString("N");
        await using var admin = new NpgsqlConnection(connection.ConnectionString); await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin)) await create.ExecuteNonQueryAsync();
        connection.Database = name; connection.Pooling = false;
        try {
            await using (var setup = RestoreContext(connection.ConnectionString)) await setup.Database.MigrateAsync();
            var scope = await ShippingTestScope.CreateAsync(connection.ConnectionString);
            try { await test(scope); }
            finally { await scope.DbContext.DisposeAsync(); } // Whole-database cleanup also removes scientific FK chains.
        } finally {
            if (!name.StartsWith(prefix, StringComparison.Ordinal) || !Guid.TryParseExact(name[prefix.Length..], "N", out _)) throw new InvalidOperationException("Unsafe fixture cleanup target.");
            await using var drop = new NpgsqlCommand($"DROP DATABASE {name} WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync();
        }
    }

    private sealed class AdmissionScanner : IOperationalFileScanner
    {
        internal int Calls, RejectCall;
        public Task<OperationalScanResult> ScanAsync(string key, CancellationToken ct) {
            Calls++; return Task.FromResult(new OperationalScanResult(Calls == RejectCall ? OperationalFileScanStatus.Unavailable : OperationalFileScanStatus.Clean, "ISOLATED TEST SCANNER"));
        }
    }

    // Real DpsS3Objects verification/admission code; synthetic pinned object transport and scan verdicts.
    private sealed class AdmissionObjects() : AmazonS3Client(new AnonymousAWSCredentials(), new AmazonS3Config { RegionEndpoint = Amazon.RegionEndpoint.USEast2 })
    {
        private readonly Dictionary<string, byte[]> content = [];
        internal int Reads;
        internal DpsObject Add(string key, string text) { var bytes = Encoding.UTF8.GetBytes(text); content[key] = bytes; return new("fixture-bucket", "us-east-2", key, "test-version", DpsS3Objects.Hash(bytes), bytes.Length); }
        public override Task<GetObjectMetadataResponse> GetObjectMetadataAsync(GetObjectMetadataRequest request, CancellationToken ct = default) {
            Assert.Equal("test-version", request.VersionId);
            var result = new GetObjectMetadataResponse { VersionId = "test-version", ETag = "fixture-etag" };
            result.Headers.ContentLength = content[request.Key].Length; return Task.FromResult(result);
        }
        public override Task<GetObjectResponse> GetObjectAsync(GetObjectRequest request, CancellationToken ct = default) {
            Reads++; Assert.Equal("test-version", request.VersionId);
            return Task.FromResult(new GetObjectResponse { VersionId = "test-version", ContentLength = content[request.Key].Length, ResponseStream = new MemoryStream(content[request.Key], writable: false) });
        }
    }
}
