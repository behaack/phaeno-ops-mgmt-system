namespace PhaenoPortal.Test;

using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task CompletionFinalSaveFailureRollsBackInvoiceAndSafeRetryReplaysOnePdf()
    {
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!);
        if (connection.Host is not ("localhost" or "127.0.0.1"))
            throw new InvalidOperationException("Completion verification requires disposable local PostgreSQL.");
        var name = $"pseq_handoff_test_{Guid.NewGuid():N}";
        await using var admin = new NpgsqlConnection(connection.ConnectionString);
        await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin)) await create.ExecuteNonQueryAsync();
        connection.Database = name;
        connection.Pooling = false;
        try
        {
            await using var scope = await HandoffTestScope.CreateAsync(isolatedConnection: connection.ConnectionString);
            var fixture = await scope.CreateQuotedOrderAsync("completion-transaction-only");
            var accepted = await scope.AcceptQuoteAsync(fixture);
            await scope.AddReferenceSampleAsync(fixture.OrderId, accepted.Version);
            scope.DbContext.ChangeTracker.Clear();
            var order = await scope.DbContext.LabServiceOrders.Include(value => value.Samples).SingleAsync(value => value.Id == fixture.OrderId);
            var sample = Assert.Single(order.Samples);
            sample.Receive(DateTime.UtcNow, "Synthetic completion transaction fixture");
            sample.Accession("COMPLETION-TRANSACTION");
            foreach (var status in new[] { LabSampleStatus.LabAnalysis, LabSampleStatus.DataProcessing, LabSampleStatus.DataAvailable, LabSampleStatus.Completed })
                sample.TransitionTo(status, null, null);
            order.MarkWorkStarted();
            var profile = new OrganizationCommercialProfile(order.OrganizationId);
            profile.UpdateBillingConfiguration("Test billing", "billing@example.invalid", "{\"line1\":\"Test address\"}", 30, EffectiveTaxDecision.Taxable, .1m, null);
            profile.ApproveTaxDecision(scope.PlatformUser.Id, DateTime.UtcNow, "Synthetic transaction verification");
            scope.DbContext.Add(profile);
            await scope.DbContext.SaveChangesAsync();
            var version = order.Version;
            var eventsBefore = await scope.DbContext.OrderStatusEvents.CountAsync();
            var noticesBefore = await scope.DbContext.OrderNotifications.CountAsync();
            var key = Guid.NewGuid().ToString("N");
            var storage = new CompletionPdfStorage();
            var controller = scope.CompletionController(key, storage);
            await scope.DbContext.Database.ExecuteSqlRawAsync("""
                CREATE FUNCTION public.fail_completion_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN RAISE EXCEPTION 'Injected completion receipt failure'; END $$;
                CREATE TRIGGER fail_completion_receipt BEFORE INSERT ON commercial_ops.order_idempotency_records
                FOR EACH ROW EXECUTE FUNCTION public.fail_completion_receipt();
                """);
            await Assert.ThrowsAsync<DbUpdateException>(() => controller.Complete(order.Id, new(version), default));
            scope.DbContext.ChangeTracker.Clear();
            Assert.Empty(await scope.DbContext.Invoices.ToListAsync());
            Assert.Equal(LabServiceOrderStatus.InProgress, (await scope.DbContext.LabServiceOrders.SingleAsync(value => value.Id == order.Id)).Status);
            Assert.Equal(eventsBefore, await scope.DbContext.OrderStatusEvents.CountAsync());
            Assert.Equal(noticesBefore, await scope.DbContext.OrderNotifications.CountAsync());
            Assert.Empty(storage.Files);
            Assert.Single(storage.Deleted);
            await scope.DbContext.Database.ExecuteSqlRawAsync("DROP TRIGGER fail_completion_receipt ON commercial_ops.order_idempotency_records; DROP FUNCTION public.fail_completion_receipt();");
            scope.DbContext.ChangeTracker.Clear();
            var completed = await scope.CompletionController(key, storage).Complete(order.Id, new(version), default);
            Assert.Equal("Completed", completed.Status);
            var invoice = Assert.Single(await scope.DbContext.Invoices.AsNoTracking().ToListAsync());
            Assert.Equal(110m, invoice.Total);
            Assert.Equal(invoice.IssuedOn.AddDays(30), invoice.DueOn);
            var pdf = Assert.Single(storage.Files).Value;
            Assert.StartsWith("%PDF-", Encoding.ASCII.GetString(pdf));
            Assert.Equal(invoice.PdfSha256, Convert.ToHexString(SHA256.HashData(pdf)));
            scope.DbContext.ChangeTracker.Clear();
            var replayController = scope.CompletionController(key, storage);
            var replay = await replayController.Complete(order.Id, new(version), default);
            Assert.Equal(completed.Version, replay.Version);
            Assert.Equal(StatusCodes.Status201Created, replayController.Response.StatusCode);
            Assert.Single(await scope.DbContext.Invoices.ToListAsync());
            Assert.Single(storage.Files);
            Assert.Equal(2, storage.SaveCount);
        }
        finally
        {
            await using var drop = new NpgsqlCommand($"DROP DATABASE {name} WITH (FORCE)", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private sealed partial class HandoffTestScope
    {
        public PhaenoPortal.App.Features.OrderManagement.Controllers.PlatformLabServiceOrdersController CompletionController(string key, IOperationalFileStorage storage)
            => CreatePlatformController(new InternalLabOperationsProvider(DbContext), key, storage: storage);
    }

    private sealed class CompletionPdfStorage : IOperationalFileStorage
    {
        public Dictionary<string, byte[]> Files { get; } = [];
        public List<string> Deleted { get; } = [];
        public int SaveCount { get; private set; }
        public async Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maximumBytes, CancellationToken cancellationToken)
        {
            using var bytes = new MemoryStream();
            await content.CopyToAsync(bytes, cancellationToken);
            Assert.InRange(bytes.Length, 1, maximumBytes);
            var data = bytes.ToArray();
            var key = Guid.NewGuid().ToString("N") + extension;
            Files.Add(key, data); SaveCount++;
            return new(key, data.Length, Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant());
        }
        public Task<Stream> OpenReadAsync(string storageKey, CancellationToken cancellationToken) => Task.FromResult<Stream>(new MemoryStream(Files[storageKey]));
        public Task DeleteIfExistsAsync(string storageKey, CancellationToken cancellationToken)
        { Files.Remove(storageKey); Deleted.Add(storageKey); return Task.CompletedTask; }
    }
}
