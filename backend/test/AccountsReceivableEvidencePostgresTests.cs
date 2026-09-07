namespace PhaenoPortal.Test;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class AccountsReceivableEvidencePostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task IdempotencySaveFailureRollsBackCashAndRemovesUnreferencedEvidence()
    {
        await using var scope = await Scope.Create();
        scope.Failures.FailIdempotencySave = true;
        var controller = scope.Controller();
        var request = scope.ReceiptRequest();
        await Assert.ThrowsAsync<InvalidOperationException>(() => scope.Upload(controller, request));
        Assert.Equal(1, scope.Storage.DeleteCount);
        Assert.Empty(scope.Storage.Files);
        Assert.False(await scope.Db.PaymentReceipts.AsNoTracking().AnyAsync(item => item.OrganizationId == scope.Customer.Id));
        scope.Db.ChangeTracker.Clear();
        scope.Failures.FailIdempotencySave = false;
        await scope.Upload(controller, request);
        Assert.Single(await scope.Db.PaymentReceipts.Where(item => item.OrganizationId == scope.Customer.Id).ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task UploadStoresOnlyScannedEvidenceAndExactRetryReusesReceiptAndAttachment()
    {
        await using var scope = await Scope.Create();
        var request = scope.ReceiptRequest() with { EvidenceStorageKey = "untrusted/customer-file.pdf" };
        var controller = scope.Controller();
        var first = await scope.Upload(controller, request);
        Assert.Equal(StatusCodes.Status201Created, controller.Response.StatusCode);
        scope.Db.ChangeTracker.Clear();
        controller.Response.StatusCode = StatusCodes.Status200OK;
        var retry = await scope.Upload(controller, request with { EvidenceStorageKey = "another/arbitrary-file.pdf" });
        Assert.Equal(first.Id, retry.Id);
        Assert.Equal(StatusCodes.Status201Created, controller.Response.StatusCode);
        Assert.Equal(1, scope.Storage.SaveCount);
        Assert.Equal(1, scope.Scanner.ScanCount);
        var persisted = await scope.Db.PaymentReceipts.AsNoTracking().SingleAsync(item => item.OrganizationId == scope.Customer.Id);
        Assert.Equal("receipt-evidence:" + scope.Storage.LastKey, persisted.EvidenceStorageKey);
        Assert.Equal(12.50m, persisted.UnappliedAmount);
        Assert.Equal(0, persisted.AppliedAmount);
        var evidence = Assert.IsType<FileStreamResult>(await controller.DownloadReceiptEvidence(first.Id, scope.Storage, default));
        using var reader = new StreamReader(evidence.FileStream);
        Assert.Equal("Receipt evidence", await reader.ReadToEndAsync());
        var changed = await Assert.ThrowsAsync<OrderManagementException>(() => scope.Upload(controller, request with { Amount = 15m }));
        Assert.Equal("idempotency_key_reused", changed.ErrorCode);
        Assert.Equal(1, scope.Storage.SaveCount);
    }

    [PostgreSqlReferenceFact]
    public async Task UncleanEvidenceCreatesNoReceiptAndIsRemovedBeforeRetry()
    {
        await using var scope = await Scope.Create();
        scope.Scanner.Status = OperationalFileScanStatus.Unavailable;
        var controller = scope.Controller();
        var request = scope.ReceiptRequest();
        var rejected = await Assert.ThrowsAsync<OrderManagementException>(() => scope.Upload(controller, request));
        Assert.Equal("receipt_evidence_not_clean", rejected.ErrorCode);
        Assert.Equal(1, scope.Storage.DeleteCount);
        Assert.Empty(scope.Storage.Files);
        Assert.False(await scope.Db.PaymentReceipts.AnyAsync(item => item.OrganizationId == scope.Customer.Id));
        Assert.False(await scope.Db.OrderIdempotencyRecords.AnyAsync(item => item.ActorUserId == scope.Operator.Id));
        scope.Db.ChangeTracker.Clear();
        scope.Scanner.Status = OperationalFileScanStatus.Clean;
        await scope.Upload(controller, request);
        Assert.Single(await scope.Db.PaymentReceipts.Where(item => item.OrganizationId == scope.Customer.Id).ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task RetiredWritesAndProtectedReadsCannotUseArbitraryEvidenceKeys()
    {
        await using var scope = await Scope.Create();
        var controller = scope.Controller();
        var gone = await Assert.ThrowsAsync<OrderManagementException>(() => controller.RecordReceipt(scope.ReceiptRequest(), default));
        Assert.Equal(StatusCodes.Status410Gone, gone.StatusCode);
        Assert.Equal("receipt_evidence_upload_required", gone.ErrorCode);
        Assert.False(await scope.Db.PaymentReceipts.AnyAsync(item => item.OrganizationId == scope.Customer.Id));
        var legacy = new PaymentReceipt(scope.Customer.Id, "LEGACY-" + Guid.NewGuid().ToString("N"), "Historical", Guid.NewGuid().ToString(),
            "Payer", 10m, "USD", new(2026, 9, 7), "Transfer", "Bank reference", "other-workflow/file.pdf", null, scope.Operator.Id, DateTime.UtcNow);
        scope.Db.Add(legacy);
        await scope.Db.SaveChangesAsync();
        var unavailable = await Assert.ThrowsAsync<OrderManagementException>(() => controller.DownloadReceiptEvidence(legacy.Id, scope.Storage, default));
        Assert.Equal("receipt_evidence_legacy", unavailable.ErrorCode);
        var unauthorized = scope.Controller(scope.UnassignedIdentity);
        Assert.Equal(StatusCodes.Status403Forbidden, (await Assert.ThrowsAsync<OrderManagementException>(() => unauthorized.DownloadReceiptEvidence(legacy.Id, scope.Storage, default))).StatusCode);
        Assert.Equal(StatusCodes.Status403Forbidden, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.Upload(unauthorized, scope.ReceiptRequest()))).StatusCode);
        Assert.Equal(0, scope.Storage.ReadCount);
        Assert.Equal(0, scope.Storage.SaveCount);
    }

    [PostgreSqlReferenceFact]
    public async Task RepreviewCorrectsCustomerWithConcurrencyAndConfirmedRetryNeverDuplicatesCash()
    {
        await using var scope = await Scope.Create();
        var controller = scope.Controller();
        var csv = scope.Csv();
        var first = await controller.PreviewImport(new(scope.Customer.Id, " " + scope.Source + " ", csv), default);
        scope.Db.ChangeTracker.Clear();
        var unchanged = await controller.PreviewImport(new(scope.Customer.Id, scope.Source, csv), default);
        Assert.Equal(first.Id, unchanged.Id);
        Assert.Equal(first.Version, unchanged.Version);
        var corrected = await controller.PreviewImport(new(scope.OtherCustomer.Id, scope.Source, csv), default);
        Assert.Equal(first.Id, corrected.Id);
        Assert.True(corrected.Version > first.Version);
        scope.Db.ChangeTracker.Clear();
        var stale = await Assert.ThrowsAsync<OrderManagementException>(() => controller.ConfirmImport(first.Id, new(first.Version), default));
        Assert.Equal("concurrency_conflict", stale.ErrorCode);
        var otherOperator = scope.Controller(scope.SecondOperatorIdentity);
        var ownership = await Assert.ThrowsAsync<OrderManagementException>(() => otherOperator.ConfirmImport(corrected.Id, new(corrected.Version), default));
        Assert.Equal("payment_import_preview_owned", ownership.ErrorCode);
        var confirmed = await controller.ConfirmImport(corrected.Id, new(corrected.Version), default);
        scope.Db.ChangeTracker.Clear();
        var retry = await controller.ConfirmImport(corrected.Id, new(first.Version), default);
        Assert.Equal(confirmed.Version, retry.Version);
        Assert.Equal("Confirmed", retry.Status);
        var receipt = Assert.Single(await scope.Db.PaymentReceipts.AsNoTracking().Where(item => item.Source == scope.Source).ToListAsync());
        Assert.Equal(scope.OtherCustomer.Id, receipt.OrganizationId);
        Assert.Equal(receipt.Amount, receipt.UnappliedAmount);
        var evidence = Assert.IsType<FileContentResult>(await controller.DownloadReceiptEvidence(receipt.Id, scope.Storage, default));
        Assert.Contains(scope.OtherCustomer.Id.ToString(), Encoding.UTF8.GetString(evidence.FileContents));
        Assert.DoesNotContain(scope.Customer.Id.ToString(), Encoding.UTF8.GetString(evidence.FileContents));
        var duplicate = await Assert.ThrowsAsync<OrderManagementException>(() => controller.PreviewImport(new(scope.OtherCustomer.Id, scope.Source, csv), default));
        Assert.Equal("payment_import_duplicate", duplicate.ErrorCode);
        Assert.Equal(0, scope.Storage.ReadCount);
    }

    [PostgreSqlReferenceFact]
    public async Task ConfirmRechecksCustomerAndInvalidCsvCannotBecomeAReview()
    {
        await using var scope = await Scope.Create();
        var controller = scope.Controller();
        var duplicateHeaders = scope.Csv().Replace("memo\n", "memo,amount\n");
        Assert.Equal("payment_import_columns_invalid", (await Assert.ThrowsAsync<OrderManagementException>(() => controller.PreviewImport(new(scope.Customer.Id, scope.Source, duplicateHeaders), default))).ErrorCode);
        Assert.Equal("payment_import_row_invalid", (await Assert.ThrowsAsync<OrderManagementException>(() => controller.PreviewImport(new(scope.Customer.Id, scope.Source, scope.Csv("0.001")), default))).ErrorCode);
        var preview = await controller.PreviewImport(new(scope.Customer.Id, scope.Source, scope.Csv()), default);
        scope.Customer.Deactivate();
        await scope.Db.SaveChangesAsync();
        var changed = await Assert.ThrowsAsync<OrderManagementException>(() => controller.ConfirmImport(preview.Id, new(preview.Version), default));
        Assert.Equal("payment_import_preview_stale", changed.ErrorCode);
        Assert.False(await scope.Db.PaymentReceipts.AnyAsync(item => item.Source == scope.Source));
    }

    private sealed class Scope : IAsyncDisposable
    {
        public PSeqOperationsDbContext Db { get; private set; } = null!;
        public Organization Customer { get; } = new($"Finance fixture {Guid.NewGuid():N}", OrganizationKind.Customer);
        public Organization OtherCustomer { get; } = new($"Other Finance fixture {Guid.NewGuid():N}", OrganizationKind.Customer);
        private Organization Phaeno { get; } = new($"Finance staff fixture {Guid.NewGuid():N}", OrganizationKind.Phaeno);
        public User Operator { get; private set; } = null!;
        private User SecondOperator { get; set; } = null!;
        private User Unassigned { get; set; } = null!;
        private ExternalIdentity OperatorIdentity { get; } = Identity();
        public ExternalIdentity SecondOperatorIdentity { get; } = Identity();
        public ExternalIdentity UnassignedIdentity { get; } = Identity();
        public string Source { get; } = "Finance-" + Guid.NewGuid().ToString("N");
        private string RequestId { get; } = "finance-evidence-" + Guid.NewGuid().ToString("N");
        public Storage Storage { get; } = new();
        public Scanner Scanner { get; } = new();
        public SaveFailure Failures { get; } = new();
        private string IdempotencyKey { get; } = Guid.NewGuid().ToString();

        public static async Task<Scope> Create()
        {
            var scope = new Scope();
            var persistence = new PersistenceOptions
            {
                CommercialSchema = Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_COMMERCIAL_SCHEMA") ?? "commercial_ops",
                LaboratorySchema = Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_LABORATORY_SCHEMA") ?? "lab_ops",
                MigrationsHistorySchema = Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_MIGRATIONS_HISTORY_SCHEMA") ?? "public"
            }.Validate();
            var options = new DbContextOptionsBuilder<PSeqOperationsDbContext>()
                .UseNpgsql(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!)
                .AddInterceptors(new AuditSaveChangesInterceptor(new AuditContext(scope.RequestId)), scope.Failures).Options;
            scope.Db = new PSeqOperationsDbContext(options, Options.Create(persistence));
            scope.Operator = CreateUser(scope.OperatorIdentity);
            scope.SecondOperator = CreateUser(scope.SecondOperatorIdentity);
            scope.Unassigned = CreateUser(scope.UnassignedIdentity);
            scope.Db.AddRange(scope.Customer, scope.OtherCustomer, scope.Phaeno, scope.Operator, scope.SecondOperator, scope.Unassigned,
                new OrganizationMembership(scope.Operator.Id, scope.Phaeno.Id, false),
                new OrganizationMembership(scope.SecondOperator.Id, scope.Phaeno.Id, false),
                new OrganizationMembership(scope.Unassigned.Id, scope.Phaeno.Id, false),
                new BusinessRoleAssignment(scope.Operator.Id, BusinessRole.CashOperator),
                new BusinessRoleAssignment(scope.SecondOperator.Id, BusinessRole.CashOperator));
            await scope.Db.SaveChangesAsync();
            return scope;
        }

        public AccountsReceivableController Controller(ExternalIdentity? identity = null)
        {
            var http = new DefaultHttpContext();
            http.Request.Headers["Idempotency-Key"] = IdempotencyKey;
            return new(Db, new OrderRequestContext(Db, new IdentityContext(identity ?? OperatorIdentity)),
                Options.Create(new PSeqOrderToCashOptions { BusinessRoles = true }), NullLogger<AccountsReceivableController>.Instance)
            { ControllerContext = new() { HttpContext = http } };
        }

        public RecordPaymentReceiptRequest ReceiptRequest() => new(Customer.Id, Guid.NewGuid().ToString(), "Fixture payer", 12.50m,
            "USD", new(2026, 9, 7), "Transfer", "Bank reference", "untrusted", "Fixture evidence");
        public string Csv(string amount = "12.50") => $"source,external_id,date,amount,currency,payer,reference,memo\n{Source},external-1,2026-09-07,{amount},USD,Fixture payer,Bank reference,Fixture memo";
        public async Task<PaymentReceiptDto> Upload(AccountsReceivableController controller, RecordPaymentReceiptRequest request)
        {
            await using var bytes = new MemoryStream(Encoding.UTF8.GetBytes("Receipt evidence"));
            var file = new FormFile(bytes, 0, bytes.Length, "file", "receipt.txt");
            return await controller.RecordReceiptWithEvidence(JsonSerializer.Serialize(request), file, Storage, Scanner, new OrderIdempotencyService(Db), default);
        }

        public async ValueTask DisposeAsync()
        {
            try
            {
                Db.ChangeTracker.Clear();
                var users = new[] { Operator.Id, SecondOperator.Id, Unassigned.Id };
                var organizations = new[] { Customer.Id, OtherCustomer.Id, Phaeno.Id };
                await Db.PaymentReceipts.Where(item => organizations.Contains(item.OrganizationId)).ExecuteDeleteAsync();
                await Db.PaymentImportBatches.Where(item => item.Source == Source).ExecuteDeleteAsync();
                await Db.OrderIdempotencyRecords.Where(item => users.Contains(item.ActorUserId)).ExecuteDeleteAsync();
                await Db.BusinessRoleAssignments.Where(item => users.Contains(item.UserId)).ExecuteDeleteAsync();
                await Db.AuditEvents.Where(item => item.RequestId == RequestId).ExecuteDeleteAsync();
                await Db.OrganizationDepartmentMemberships.Where(item => organizations.Contains(item.Department.OrganizationId)).ExecuteDeleteAsync();
                await Db.OrganizationDepartments.Where(item => organizations.Contains(item.OrganizationId)).ExecuteDeleteAsync();
                await Db.OrganizationMemberships.Where(item => organizations.Contains(item.OrganizationId)).ExecuteDeleteAsync();
                await Db.Users.Where(item => users.Contains(item.Id)).ExecuteDeleteAsync();
                await Db.Organizations.Where(item => organizations.Contains(item.Id)).ExecuteDeleteAsync();
            }
            finally { await Db.DisposeAsync(); }
        }

        private static ExternalIdentity Identity() => new("test", Guid.NewGuid().ToString("N"), $"finance-{Guid.NewGuid():N}@example.test", true);
        private static User CreateUser(ExternalIdentity identity)
        {
            var user = new User(identity.Email, "Finance", "Fixture");
            user.LinkExternalIdentity(identity.Provider, identity.SubjectId);
            user.Activate();
            return user;
        }
    }

    private sealed class Storage : IOperationalFileStorage
    {
        public Dictionary<string, byte[]> Files { get; } = [];
        public int SaveCount { get; private set; }
        public int ReadCount { get; private set; }
        public int DeleteCount { get; private set; }
        public string? LastKey { get; private set; }
        public async Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maximumBytes, CancellationToken cancellationToken)
        {
            using var bytes = new MemoryStream();
            await content.CopyToAsync(bytes, cancellationToken);
            var value = bytes.ToArray();
            Assert.True(value.Length <= maximumBytes);
            LastKey = Guid.NewGuid().ToString("N") + extension;
            Files.Add(LastKey, value);
            SaveCount++;
            return new(LastKey, value.Length, Convert.ToHexString(SHA256.HashData(value)));
        }
        public Task<Stream> OpenReadAsync(string storageKey, CancellationToken cancellationToken)
        { ReadCount++; return Task.FromResult<Stream>(new MemoryStream(Files[storageKey])); }
        public Task DeleteIfExistsAsync(string storageKey, CancellationToken cancellationToken)
        { DeleteCount++; Files.Remove(storageKey); return Task.CompletedTask; }
    }
    private sealed class Scanner : IOperationalFileScanner
    {
        public OperationalFileScanStatus Status { get; set; } = OperationalFileScanStatus.Clean;
        public int ScanCount { get; private set; }
        public Task<OperationalScanResult> ScanAsync(string storageKey, CancellationToken cancellationToken)
        { ScanCount++; return Task.FromResult(new OperationalScanResult(Status, "Fixture scan")); }
    }
    private sealed class IdentityContext(ExternalIdentity identity) : IExternalIdentityContext
    { public ExternalIdentity? Read(HttpContext httpContext) => identity; }
    private sealed class AuditContext(string requestId) : ICurrentUserContext
    { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => requestId; }
    private sealed class SaveFailure : SaveChangesInterceptor
    {
        public bool FailIdempotencySave { get; set; }
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (FailIdempotencySave && eventData.Context!.ChangeTracker.Entries<OrderIdempotencyRecord>()
                .Any(entry => entry.State == EntityState.Added))
                throw new InvalidOperationException("Simulated idempotency persistence failure.");
            return ValueTask.FromResult(result);
        }
    }
}
