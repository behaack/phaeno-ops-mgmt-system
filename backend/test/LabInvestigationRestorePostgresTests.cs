namespace PhaenoPortal.Test;

using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Npgsql;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Storage;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [InvestigationRestoreFact]
    public async Task InvestigationBackupRestoresExactTubeChainReportAndPrivateAttachment()
    {
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION"));
        Assert.True(connection.Host is "localhost" or "127.0.0.1" or "::1", "The restore rehearsal only accepts a disposable loopback server.");
        var identity = Guid.NewGuid().ToString("N");
        var sourceName = "traceability_source_" + identity;
        var restoredName = "traceability_restored_" + identity;
        var created = new List<string>();
        var root = Path.Combine(Environment.GetEnvironmentVariable("PSEQ_INVESTIGATION_RESTORE_ARTIFACTS") ?? Path.GetTempPath(), "investigation-restore-" + identity);
        Directory.CreateDirectory(root);
        var privateRoot = Path.Combine(Path.GetTempPath(), "phaeno-restore-files-" + identity);
        connection.Database = "postgres"; connection.Pooling = false;
        await using var admin = new NpgsqlConnection(connection.ConnectionString);
        await admin.OpenAsync();
        PSeqOperationsDbContext? sourceDb = null;
        var timer = Stopwatch.StartNew();
        try
        {
            foreach (var name in new[] { sourceName, restoredName })
            {
                // Names are generated above; never restore into or drop a configured application database.
                await using var create = new NpgsqlCommand($"CREATE DATABASE \"{name}\" TEMPLATE template0", admin);
                await create.ExecuteNonQueryAsync(); created.Add(name);
            }
            connection.Database = sourceName;
            await using (var migrationDb = RestoreContext(connection.ConnectionString)) await migrationDb.Database.MigrateAsync();
            var scope = await ShippingTestScope.CreateAsync(connection.ConnectionString);
            sourceDb = scope.DbContext; // The entire disposable DB is removed below; normal per-fixture cleanup does not apply.
            var sourceFiles = RestoreFiles(Path.Combine(privateRoot, "source-files"));
            var fixture = await SeedRestoreEvidence(scope, sourceFiles);
            var sourceController = scope.CreatePreparationController(sourceDb);
            var frozen = await sourceDb.LabInvestigationReports.AsNoTracking().SingleAsync();
            var sourceEvidence = await new LabInvestigationService(sourceDb).ReadAsync(fixture.WorkId, fixture.SpecimenId, default);
            var counts = sourceEvidence.Evidence.ToDictionary(x => x.Key, x => JsonSerializer.SerializeToElement(x.Value).GetArrayLength());
            var migrations = (await sourceDb.Database.GetAppliedMigrationsAsync()).ToArray();
            var dump = Path.Combine(root, "database.dump");
            await RunPostgresTool("pg_dump", connection, "--format=custom", "--no-owner", "--no-acl", "--file", dump);
            CopyEvidenceFiles(Path.Combine(privateRoot, "source-files"), Path.Combine(privateRoot, "backup-files"));

            // Independent restore roots and database; the original file is then unavailable to the restored application.
            connection.Database = restoredName;
            await RunPostgresTool("pg_restore", connection, "--exit-on-error", "--no-owner", "--no-acl", "--dbname", restoredName, dump);
            CopyEvidenceFiles(Path.Combine(privateRoot, "backup-files"), Path.Combine(privateRoot, "restored-files"));
            await sourceFiles.DeleteIfExistsAsync(fixture.StorageKey, default);
            await Assert.ThrowsAsync<OrderManagementException>(() => sourceController.DownloadInvestigationAttachment(fixture.WorkId, fixture.SpecimenId, fixture.RecordId, "qcReport", sourceFiles, default));
            await using var restoredDb = RestoreContext(connection.ConnectionString);
            var restoredFiles = RestoreFiles(Path.Combine(privateRoot, "restored-files"));
            var restoredController = scope.CreatePreparationController(restoredDb);
            Assert.Empty(await restoredDb.Database.GetPendingMigrationsAsync());
            Assert.Equal(migrations, await restoredDb.Database.GetAppliedMigrationsAsync());
            var trace = JsonSerializer.SerializeToElement(await restoredController.ResultLineage(fixture.WorkId, fixture.SpecimenId, fixture.PackageId, default), new JsonSerializerOptions(JsonSerializerDefaults.Web));
            Assert.Equal(fixture.Barcode, trace.GetProperty("sourceBarcode").GetString());
            Assert.Equal(fixture.RunId, trace.GetProperty("analysisRunId").GetGuid());
            Assert.Single(trace.GetProperty("inputs").EnumerateArray());
            var restoredEvidence = await new LabInvestigationService(restoredDb).ReadAsync(fixture.WorkId, fixture.SpecimenId, default);
            foreach (var (key, count) in counts) Assert.Equal(count, JsonSerializer.SerializeToElement(restoredEvidence.Evidence[key]).GetArrayLength());
            var restoredReport = await restoredDb.LabInvestigationReports.AsNoTracking().SingleAsync();
            Assert.Equal(frozen.BodyJson, restoredReport.BodyJson); Assert.Equal(frozen.Sha256, restoredReport.Sha256);
            var manifest = Assert.IsType<FileContentResult>(await restoredController.DownloadInvestigationReport(fixture.WorkId, fixture.SpecimenId, frozen.Id, default));
            Assert.Equal(frozen.Sha256, Convert.ToHexString(SHA256.HashData(manifest.FileContents)));
            var attachment = Assert.IsType<FileContentResult>(await restoredController.DownloadInvestigationAttachment(fixture.WorkId, fixture.SpecimenId, fixture.RecordId, "qcReport", restoredFiles, default));
            Assert.Equal(fixture.FileSha256, Convert.ToHexString(SHA256.HashData(attachment.FileContents)), ignoreCase: true);
            // Simulate result-byte cleanup through the real deletion adapter. Investigation evidence must remain readable.
            var resultArtifact = await restoredDb.ResultArtifacts.SingleAsync(x => x.ResultOutputPackageId == fixture.PackageId);
            await restoredFiles.DeleteIfExistsAsync(resultArtifact.ObjectStorageKey, default);
            await Assert.ThrowsAsync<OrderManagementException>(() => restoredFiles.OpenReadAsync(resultArtifact.ObjectStorageKey, default));
            var afterCleanup = JsonSerializer.SerializeToElement(await restoredController.ResultLineage(fixture.WorkId, fixture.SpecimenId, fixture.PackageId, default), new JsonSerializerOptions(JsonSerializerDefaults.Web));
            Assert.Equal(fixture.Barcode, afterCleanup.GetProperty("sourceBarcode").GetString());
            Assert.Equal(frozen.BodyJson, (await restoredDb.LabInvestigationReports.AsNoTracking().SingleAsync()).BodyJson);
            Assert.IsType<FileContentResult>(await restoredController.DownloadInvestigationAttachment(fixture.WorkId, fixture.SpecimenId, fixture.RecordId, "qcReport", restoredFiles, default));
            // Simulate offline restore corruption, bypassing the normal immutable-write guard deliberately.
            var alteredBody = frozen.BodyJson + " ";
            await restoredDb.Database.ExecuteSqlInterpolatedAsync($"UPDATE lab_ops.lab_investigation_reports SET body_json = {alteredBody} WHERE id = {frozen.Id}");
            var corrupt = await Assert.ThrowsAsync<OrderManagementException>(() => restoredController.DownloadInvestigationReport(fixture.WorkId, fixture.SpecimenId, frozen.Id, default));
            Assert.Equal("report_integrity_failed", corrupt.ErrorCode);
            await File.WriteAllTextAsync(Path.Combine(root, "verification.json"), JsonSerializer.Serialize(new
            {
                evidence = "Synthetic local PostgreSQL and private-file restore; not hosted backup or scientific acceptance",
                result = "passed", completedAtUtc = DateTime.UtcNow, elapsedSeconds = timer.Elapsed.TotalSeconds,
                migrations, sectionCounts = counts, privateBackupPath = Path.Combine(privateRoot, "backup-files"), fixture.WorkId, fixture.SpecimenId, fixture.PackageId, fixture.RunId,
                fixture.Barcode, manifestSha256 = frozen.Sha256, attachmentSha256 = fixture.FileSha256,
                dumpSha256 = Convert.ToHexString(SHA256.HashData(await File.ReadAllBytesAsync(dump)))
            }, new JsonSerializerOptions { WriteIndented = true }));
        }
        finally
        {
            if (sourceDb is not null) await sourceDb.DisposeAsync();
            foreach (var name in created.AsEnumerable().Reverse())
            {
                Assert.True(name == sourceName || name == restoredName);
                await using var drop = new NpgsqlCommand($"DROP DATABASE \"{name}\" WITH (FORCE)", admin);
                await drop.ExecuteNonQueryAsync();
            }
        }
    }

    private sealed record RestoreFixture(Guid WorkId, Guid SpecimenId, Guid PackageId, Guid RunId, Guid RecordId, string Barcode, string StorageKey, string FileSha256);

    private static async Task<RestoreFixture> SeedRestoreEvidence(ShippingTestScope scope, IOperationalFileStorage files)
    {
        var db = scope.DbContext; var now = LabEvidenceTime.UtcNow; var actor = scope.PlatformUser.Id;
        var order = new LabServiceOrder(scope.CustomerOrganization.Id, scope.CustomerOrganization.Departments.Single(d => d.IsDefault).Id,
            "RESTORE-" + scope.Suffix, "TEST ONLY restore", null, 1, false, "TEST source", "Frozen", "TEST safe", "TEST instructions");
        var sample = new LabSample(order.Id, "TEST-RESTORE", "RNA", "TEST source", 1, "uL", "Frozen", "TEST safe", null, null, null, "[]");
        order.Samples.Add(sample);
        var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, order.Id, order.OrganizationId, "restore-test", 1, "test", null);
        work.RecordMilestone(LabWorkOrderStatus.Received); work.RecordMilestone(LabWorkOrderStatus.Processing); work.RecordMilestone(LabWorkOrderStatus.DataProcessing);
        var specimen = new LabSpecimen(work.Id, sample.Id); work.Specimens.Add(specimen);
        var protocol = new LabProtocol("restore-" + scope.Suffix, "TEST ONLY restore", null);
        var version = new LabProtocolVersion(protocol.Id, 1, LabProtocolTestData.Definition(), actor, now); version.Approve(scope.CustomerUser.Id, now);
        var workflow = new LabServiceWorkflow("restore-" + scope.Suffix, "TEST ONLY restore", null);
        var workflowVersion = new LabServiceWorkflowVersion(workflow.Id, 1, actor, now); workflowVersion.Approve(scope.CustomerUser.Id, now);
        var stage = new LabServiceWorkflowStage(workflowVersion.Id, 1, "Preparation", version.Id, LabServiceWorkflowStageRequirement.Required, null, null);
        var tray = new LabTrayFormat(new("TEST restore tray", 1, 1, "numeric", []));
        var preparation = new LabPreparationBatch("TEST restore batch", tray, workflowVersion.Id);
        db.AddRange(order, work, protocol, version, workflow, workflowVersion, stage, tray, preparation); await db.SaveChangesAsync();
        var source = new LabContainer(work.Id, specimen.Id, null, LabContainerKind.SubmittedSpecimen, "RESTORE-SOURCE-" + scope.Suffix, "TEST tube", "TEST freezer", 1, "uL", null);
        source.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, actor, now);
        var attempt = new LabSpecimenAttempt(work.Id, specimen.Id, source.Id, workflowVersion.Id, 1, null); attempt.Start(source.Barcode, source.Barcode, now);
        var output = new LabContainer(work.Id, specimen.Id, source.Id, LabContainerKind.Library, "RESTORE-LIB-" + scope.Suffix, "TEST library", "TEST freezer", 1, "uL", null); output.AttachAttempt(attempt);
        var execution = new LabProtocolExecution(work.Id, specimen.Id, version.Id, actor, stage.Id); execution.AttachAttempt(attempt); execution.Start(now);
        var reportId = Guid.NewGuid();
        await using var pdf = new MemoryStream(Encoding.UTF8.GetBytes("%PDF-TEST ONLY restoration evidence"));
        var stored = await files.SaveAsync(pdf, ".pdf", 10 * 1024 * 1024, default);
        var details = JsonSerializer.Serialize(new { qcReport = new { fileName = "restore-qc.pdf", contentType = "application/pdf", stored.SizeBytes, stored.Sha256, stored.StorageKey, scanStatus = "Clean" } }, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var record = new LabPreparationRecord(reportId, preparation.Id, actor, "step", new string('A', 64), details, now);
        execution.RecordStep(version, LabProtocolTestData.Input() with { PreparationRecordId = reportId, Performance = new("now", true) }, actor, new HashSet<LabRole> { LabRole.Operator }, now);
        execution.Complete(version, null, now);
        var library = new LabLibrary(work.Id, specimen.Id, source.Id, output.Id, execution.Id, "RESTORE-LIB-" + scope.Suffix); library.RecordQc(true, "{}");
        db.AddRange(source, attempt, output, execution, library, record); await db.SaveChangesAsync(); attempt.Refresh(false, true, actor, now); await db.SaveChangesAsync();
        var batch = new LabOperationalBatch("RESTORE-SEQ-" + scope.Suffix, "TEST sequencing", null); batch.Start(now);
        var sendout = new LabNgsSendout(batch.Id, "TEST provider", "TEST submission", JsonSerializer.Serialize(new { members = new[] { new { libraryId = library.Id, libraryKey = library.LibraryKey, containerBarcode = output.Barcode } } }), null);
        sendout.SetStatus(LabNgsSendoutStatus.Complete, now); db.AddRange(batch, sendout, new LabBatchMember(batch.Id, work.Id, library.Id, now)); await db.SaveChangesAsync();
        var lineage = new LabResultLineageService(db);
        var sequence = await lineage.RegisterOutputAsync(new(Guid.NewGuid(), work.Id, specimen.Id, library.Id, sendout.Id, "TEST provider", "TEST run", "TEST sample mapping", "TEST raw:v1", new string('B', 64), 100), actor, "lab-staff", default);
        var run = await lineage.RegisterAnalysisAsync(new(Guid.NewGuid(), work.Id, specimen.Id, "TEST analysis", "TEST analysis run", [sequence.Id]), actor, "lab-staff", default);
        var package = new ResultOutputPackage(order.OrganizationId, order.Id, work.Id, sample.Id, 1, null, "TEST analysis", "TEST transfer", "restore-" + scope.Suffix, "{}", new string('C', 64), 1, labAnalysisRunId: run.Id);
        await using var resultBytes = new MemoryStream(Encoding.UTF8.GetBytes("TEST ONLY result bytes"));
        var resultFile = await files.SaveAsync(resultBytes, ".txt", 1024, default);
        var artifact = new ResultArtifact(package.Id, "result", "result.txt", "text/plain", resultFile.SizeBytes, resultFile.Sha256, resultFile.StorageKey, "whole-file");
        db.AddRange(package, artifact); await db.SaveChangesAsync();
        await scope.CreatePreparationController(db).GenerateInvestigationReport(work.Id, specimen.Id, new(Guid.NewGuid()), default);
        return new(work.Id, specimen.Id, package.Id, run.Id, record.Id, source.Barcode, stored.StorageKey, stored.Sha256);
    }

    private static PSeqOperationsDbContext RestoreContext(string connection)
    {
        var persistence = new PersistenceOptions();
        return new(new DbContextOptionsBuilder<PSeqOperationsDbContext>().UseNpgsql(connection,
            postgres => postgres.MigrationsHistoryTable(persistence.MigrationsHistoryTable, persistence.MigrationsHistorySchema)).Options, Options.Create(persistence));
    }
    private static IOperationalFileStorage RestoreFiles(string root) => new OperationalFileStorageAdapter(
        new LocalFileStorage(new RestoreEnvironment(Path.Combine(Path.GetDirectoryName(root)!, "fixture-app")), Options.Create(new FileStorageOptions { LocalRootPath = root })));
    private static void CopyEvidenceFiles(string source, string destination)
    {
        foreach (var file in Directory.EnumerateFiles(source, "*", SearchOption.AllDirectories))
        {
            var target = Path.Combine(destination, Path.GetRelativePath(source, file));
            Directory.CreateDirectory(Path.GetDirectoryName(target)!); File.Copy(file, target);
        }
    }
    private static async Task RunPostgresTool(string tool, NpgsqlConnectionStringBuilder connection, params string[] arguments)
    {
        var directory = Environment.GetEnvironmentVariable("PSEQ_POSTGRES_TOOLS_DIRECTORY")!;
        var start = new ProcessStartInfo(Path.Combine(directory, tool + (OperatingSystem.IsWindows() ? ".exe" : "")))
        { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
        foreach (var argument in arguments) start.ArgumentList.Add(argument);
        start.Environment["PGHOST"] = connection.Host; start.Environment["PGPORT"] = connection.Port.ToString();
        start.Environment["PGDATABASE"] = connection.Database; start.Environment["PGUSER"] = connection.Username;
        start.Environment["PGPASSWORD"] = connection.Password ?? "";
        using var process = Process.Start(start)!;
        var output = process.StandardOutput.ReadToEndAsync(); var error = process.StandardError.ReadToEndAsync();
        using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(2));
        try { await process.WaitForExitAsync(timeout.Token); }
        catch { process.Kill(entireProcessTree: true); throw; }
        await output;
        Assert.True(process.ExitCode == 0, $"{tool} failed: {await error}");
    }
    private sealed class RestoreEnvironment(string root) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "PSeq.RestoreTest";
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; } = root;
        public string WebRootPath { get; set; } = root;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    }
}

internal sealed class InvestigationRestoreFactAttribute : FactAttribute
{
    public InvestigationRestoreFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION"))
            || string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PSEQ_POSTGRES_TOOLS_DIRECTORY")))
            Skip = "Set the disposable loopback PostgreSQL connection and PSEQ_POSTGRES_TOOLS_DIRECTORY to rehearse database and private-file restore.";
    }
}
