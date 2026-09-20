namespace PhaenoPortal.Test;

using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Npgsql;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Storage;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    private static JsonElement GapJson(object value) => JsonSerializer.SerializeToElement(value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
    private sealed class GapScanner : IOperationalFileScanner
    {
        public bool Clean { get; set; } = true;
        public Task<OperationalScanResult> ScanAsync(string key, CancellationToken ct) => Task.FromResult(new OperationalScanResult(
            Clean ? OperationalFileScanStatus.Clean : OperationalFileScanStatus.Pending, null));
    }

    [PostgreSqlReferenceFact]
    public async Task ScientificUploadResumesFiftyMiBVerifiesAllBytesAndRetainsAdmittedFile()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var files = RestoreFiles(Path.Combine(Path.GetTempPath(), "phaeno-upload-test-" + Guid.NewGuid(), "files"));
            var fixture = await SeedRestoreEvidence(scope, files);
            var controller = scope.CreateLabController(); var scanner = new GapScanner();
            var scanOptions = Options.Create(new FileScanningOptions());
            var content = new byte[50 * 1024 * 1024]; Random.Shared.NextBytes(content);
            var request = new LabOperationsController.BeginScientificUpload(Guid.NewGuid(), "reads.fastq.gz", content.Length, Convert.ToHexString(SHA256.HashData(content)));
            var begin = GapJson(await controller.BeginScientificFileUpload(fixture.WorkId, fixture.SpecimenId, request, scanOptions, default));
            var chunk = begin.GetProperty("chunkBytes").GetInt32();
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.CompleteScientificFileUpload(fixture.WorkId, fixture.SpecimenId, request.Id, files, scanner, scanOptions, default));
            for (var offset = 0; offset < content.Length; offset += chunk)
            {
                var count = Math.Min(chunk, content.Length - offset);
                controller.Request.Body = new MemoryStream(content, offset, count); controller.Request.ContentLength = count;
                await controller.UploadScientificChunk(fixture.WorkId, fixture.SpecimenId, request.Id, offset, files, default);
                if (offset == 0)
                {
                    // A lost acknowledgment replays the same chunk without duplicating its bytes.
                    controller.Request.Body = new MemoryStream(content, 0, count);
                    await controller.UploadScientificChunk(fixture.WorkId, fixture.SpecimenId, request.Id, 0, files, default);
                    var resumed = GapJson(await controller.BeginScientificFileUpload(fixture.WorkId, fixture.SpecimenId, request, scanOptions, default));
                    Assert.Equal(chunk, resumed.GetProperty("receivedBytes").GetInt32());
                    controller.Request.Body = new MemoryStream(new byte[count]);
                    await Assert.ThrowsAsync<OrderManagementException>(() => controller.UploadScientificChunk(fixture.WorkId, fixture.SpecimenId, request.Id, 0, files, default));
                }
            }
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.BeginScientificFileUpload(fixture.WorkId, fixture.SpecimenId,
                request with { FileName = "changed.bin" }, scanOptions, default));
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.UploadScientificChunk(fixture.WorkId, Guid.NewGuid(), request.Id, 0, files, default));
            await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreatePreparationController(scope.DbContext, true)
                .BeginScientificFileUpload(fixture.WorkId, fixture.SpecimenId, request, scanOptions, default));
            scanner.Clean = false;
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.CompleteScientificFileUpload(fixture.WorkId, fixture.SpecimenId, request.Id, files, scanner, scanOptions, default));
            Assert.Null((await scope.DbContext.LabScientificUploads.SingleAsync(u => u.Id == request.Id)).CompletedFileId);
            scanner.Clean = true;
            var completed = GapJson(await controller.CompleteScientificFileUpload(fixture.WorkId, fixture.SpecimenId, request.Id, files, scanner, scanOptions, default));
            var fileId = completed.GetProperty("file").GetProperty("id").GetGuid();
            var retry = GapJson(await controller.CompleteScientificFileUpload(fixture.WorkId, fixture.SpecimenId, request.Id, files, scanner, scanOptions, default));
            Assert.Equal(fileId, retry.GetProperty("file").GetProperty("id").GetGuid());
            var receipt = await scope.DbContext.LabScientificFiles.SingleAsync(f => f.Id == fileId);
            Assert.Equal(content.LongLength, receipt.SizeBytes); Assert.Equal(request.Sha256, receipt.Sha256, ignoreCase: true);
            await LabScientificUploadCleanup.CleanAsync(scope.DbContext, files, DateTime.UtcNow.AddDays(2), default);
            Assert.False(await scope.DbContext.LabScientificUploads.AnyAsync(u => u.Id == request.Id));
            await using var downloaded = await LabScientificFiles.OpenVerifiedAsync(files, receipt.StorageKey, receipt.Sha256, receipt.SizeBytes, default);
            Assert.Equal(request.Sha256, Convert.ToHexString(await SHA256.HashDataAsync(downloaded)));
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    [PostgreSqlReferenceFact]
    public async Task CustomerHoldBlocksNewAttemptsAnalysisAndReleaseUntilExplicitStaffResumption()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var files = RestoreFiles(Path.Combine(Path.GetTempPath(), "phaeno-hold-test-" + Guid.NewGuid(), "files"));
            var fixture = await SeedRestoreEvidence(scope, files); var db = scope.DbContext;
            var specimen = await db.LabSpecimens.SingleAsync(s => s.Id == fixture.SpecimenId);
            var state = specimen.ProcessingState;
            var orderId = (await db.LabWorkOrders.SingleAsync(w => w.Id == fixture.WorkId)).AuthorizationSourceId;
            var customer = scope.CreateHoldCustomerController();
            await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreateHoldCustomerController(true).CustomerSpecimenHolds(orderId, default));
            await customer.RequestSpecimenHold(orderId, new(specimen.Id, null, 0, "TEST pause"), default);
            var hold = await db.LabCustomerHolds.SingleAsync(h => h.LabSpecimenId == specimen.Id);
            await Assert.ThrowsAsync<OrderManagementException>(() => customer.RequestSpecimenHold(orderId, new(specimen.Id, null, 0, "TEST duplicate"), default));
            var first = await db.LabSpecimenAttempts.SingleAsync(a => a.LabSpecimenId == specimen.Id);
            var attempt = new LabSpecimenAttempt(fixture.WorkId, specimen.Id, first.SourceContainerId, first.LabServiceWorkflowVersionId, 2, first.Id);
            db.Add(attempt);
            var blocked = await Assert.ThrowsAsync<OrderManagementException>(() => db.SaveChangesAsync()); Assert.Equal("customer_hold_active", blocked.ErrorCode);
            db.Entry(attempt).State = EntityState.Detached;
            var analysis = new LabAnalysisRun(Guid.NewGuid(), fixture.WorkId, specimen.Id, first.Id, "TEST", "TEST new analysis", null, null, new string('A',64), scope.PlatformUser.Id, "test", DateTime.UtcNow);
            db.Add(analysis); await Assert.ThrowsAsync<OrderManagementException>(() => db.SaveChangesAsync()); db.Entry(analysis).State = EntityState.Detached;
            var package = await db.ResultOutputPackages.SingleAsync(p => p.Id == fixture.PackageId);
            package.BeginScanning(); package.MarkReadyForReview(1, true, true);
            var approval = Guid.NewGuid(); package.RecordScientificApproval(approval, scope.PlatformUser.Id, DateTime.UtcNow); package.MarkReadyForRelease(approval);
            await db.SaveChangesAsync();
            package.Release(scope.PlatformUser.Id, DateTime.UtcNow);
            await Assert.ThrowsAsync<OrderManagementException>(() => db.SaveChangesAsync());
            await db.Entry(package).ReloadAsync();
            // Other samples remain eligible; this does not turn into a job-wide pause.
            await LabCustomerHolds.RequireUnblockedAsync(db, [Guid.NewGuid()], default);
            Assert.Equal(state, specimen.ProcessingState);
            var staff = scope.CreateLabController();
            await Assert.ThrowsAsync<OrderManagementException>(() => staff.ResolveCustomerHold(fixture.WorkId, hold.Id, new(hold.Version, "apply", "TEST boundary", false), default));
            await staff.ResolveCustomerHold(fixture.WorkId, hold.Id, new(hold.Version, "unable", "TEST procedure already underway", true), default);
            await Assert.ThrowsAsync<OrderManagementException>(() => LabCustomerHolds.RequireUnblockedAsync(db, [specimen.Id], default));
            await customer.RequestSpecimenHold(orderId, new(specimen.Id, hold.Id, hold.Version, "TEST resume requested"), default);
            await Assert.ThrowsAsync<OrderManagementException>(() => staff.ResolveCustomerHold(fixture.WorkId, hold.Id, new(0, "resume", "TEST safe", true), default));
            await staff.ResolveCustomerHold(fixture.WorkId, hold.Id, new(hold.Version, "resume", "TEST safe", true), default);
            await LabCustomerHolds.RequireUnblockedAsync(db, [specimen.Id], default);
            db.Add(attempt); await db.SaveChangesAsync();
            Assert.Equal("Released", hold.State);
            Assert.Equal(4, GapJson(await staff.ReadCustomerHolds(fixture.WorkId, default)).GetProperty("history").GetArrayLength());
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    [PostgreSqlReferenceFact]
    public async Task OnlineBackupLeaseBlocksDeletionWithoutBlockingIndependentReads()
    {
        var connection = Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!;
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?> { ["ConnectionStrings:DefaultConnection"] = connection }).Build();
        var lease = new BackupDeletionLease(configuration);
        await using var snapshot = new NpgsqlConnection(connection); await snapshot.OpenAsync();
        await using (var acquire = new NpgsqlCommand("SELECT pg_advisory_lock(650320260920)", snapshot)) await acquire.ExecuteNonQueryAsync();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        var waiting = lease.AcquireAsync(timeout.Token);
        await Task.Delay(100); Assert.False(waiting.IsCompleted);
        await using (var read = new NpgsqlCommand("SELECT 1", snapshot)) Assert.Equal(1, await read.ExecuteScalarAsync());
        await using (var release = new NpgsqlCommand("SELECT pg_advisory_unlock(650320260920)", snapshot)) await release.ExecuteNonQueryAsync();
        await using (await waiting) { }
        await using (var check = new NpgsqlCommand("SELECT pg_try_advisory_lock(650320260920)", snapshot)) Assert.Equal(true, await check.ExecuteScalarAsync());
        await using (var release = new NpgsqlCommand("SELECT pg_advisory_unlock(650320260920)", snapshot)) await release.ExecuteNonQueryAsync();
    }
    private sealed partial class ShippingTestScope
    {
        public LabServiceOrdersController CreateHoldCustomerController(bool other = false)
        {
            var http = new DefaultHttpContext();
            http.Request.Headers["X-Organization-Id"] = (other ? OtherCustomerOrganization : CustomerOrganization).Id.ToString();
            return new LabServiceOrdersController(DbContext, new OrderRequestContext(DbContext, new FixedIdentityContext(other ? otherCustomerIdentity : customerIdentity)),
                null!, null!, null!, null!, null!, null!, null!, null!) { ControllerContext = new ControllerContext { HttpContext = http } };
        }
    }

}
