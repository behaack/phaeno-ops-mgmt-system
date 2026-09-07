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
    public async Task AllocationHistoryReversalUsesAllVersionsAndMatchingPagesRemainCustomerScoped()
    {
        await using var scope = await Scope.Create(); var controller = scope.Controller();
        var receipt = await scope.Upload(controller, scope.ReceiptRequest());
        var invoices = new List<Invoice>();
        for (var index = 0; index < 31; index++) invoices.Add(await scope.AddInvoice($"MATCH-{index:D3}"));
        await scope.AddInvoice("MATCH-OTHER", scope.OtherCustomer);
        var page = await controller.MatchingSuggestions(receipt.Id, default, page: 1);
        Assert.Equal(6, page.Count); Assert.All(page, item => Assert.Equal(scope.Customer.Id, item.OrganizationId));
        Assert.Equal(invoices[30].Id, Assert.Single(await controller.MatchingSuggestions(receipt.Id, default, "MATCH-030")).Id);
        Assert.Empty(await controller.MatchingSuggestions(receipt.Id, default, "MATCH-OTHER"));
        var allocation = await controller.Allocate(receipt.Id, new(invoices[30].Id, 10, receipt.Version, invoices[30].Version), default);
        var history = Assert.Single(await controller.AllocationHistory(receipt.Id, default));
        Assert.Equal(allocation.Id, history.Allocation.Id); Assert.Equal(90, history.Invoice.Balance); Assert.Equal(2.5m, history.Receipt.UnappliedAmount);
        var stale = await Assert.ThrowsAsync<OrderManagementException>(() => controller.ReverseAllocation(allocation.Id,
            new("Wrong match", allocation.Version - 1, history.Receipt.Version, history.Invoice.Version), default));
        Assert.Equal(StatusCodes.Status409Conflict, stale.StatusCode);
        await controller.ReverseAllocation(allocation.Id, new("Wrong match", history.Allocation.Version, history.Receipt.Version, history.Invoice.Version), default);
        var reversed = Assert.Single(await controller.AllocationHistory(receipt.Id, default));
        Assert.True(reversed.Allocation.IsReversed); Assert.Equal("Wrong match", reversed.Allocation.ReversalReason);
        Assert.Equal(100, reversed.Invoice.Balance); Assert.Equal(12.5m, reversed.Receipt.UnappliedAmount);
        Assert.Equal(StatusCodes.Status403Forbidden, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.Controller(scope.UnassignedIdentity).AllocationHistory(receipt.Id, default))).StatusCode);
    }

    [PostgreSqlReferenceFact]
    public async Task DraftCorrectionAndCancellationPersistHistoryAndPreserveFinancialSources()
    {
        await using var scope = await Scope.Create(); var controller = scope.Controller();
        var receipt = await scope.Upload(controller, scope.ReceiptRequest()); var invoice = await scope.AddInvoice("DRAFT-SOURCE");
        var allocation = await controller.Allocate(receipt.Id, new(invoice.Id, 10, receipt.Version, invoice.Version), default);
        var adjustment = new InvoiceAdjustment(invoice.Id, InvoiceAdjustmentKind.Credit, 1, "Fixture adjustment source", scope.Operator.Id, DateTime.UtcNow);
        scope.Db.Add(adjustment); await scope.Db.SaveChangesAsync();
        var batch = await controller.CreateReconciliation(new(new(2026, 9, 7), 10, [receipt.Id], [allocation.Id], [adjustment.Id]), default);
        var attention = new OperationalAttentionItem(OperationalAttentionCategory.ReconciliationDifference, scope.Customer.Id, "ReconciliationBatch", batch.Id, 0, "Bank difference", "Correct the draft");
        attention.Assign(scope.Operator.Id); scope.Db.Add(attention); await scope.Db.SaveChangesAsync();
        var edited = await scope.Controller(scope.SecondOperatorIdentity).EditReconciliationDraft(batch.Id,
            new(batch.Version, "Correct the bank total", batch.PeriodEnd, 12.5m, [receipt.Id], [allocation.Id], [adjustment.Id]), default);
        Assert.Equal(0, edited.Batch.Difference); Assert.True(edited.Batch.Version > batch.Version);
        Assert.Equal(OperationalAttentionStatus.Resolved, attention.Status); Assert.Equal(scope.Operator.Id, attention.OwnerUserId);
        Assert.Equal("Correct the bank total", attention.Resolution); Assert.NotEqual(scope.Operator.Id, attention.ResolvedByUserId);
        var change = Assert.Single(edited.Changes).Change;
        Assert.Equal(allocation.Id, Assert.Single(change.Before.PaymentAllocationIds)); Assert.Equal(adjustment.Id, Assert.Single(change.After.InvoiceAdjustmentIds));
        Assert.Equal(10, change.Before.BankTotal); Assert.Equal(12.5m, change.After.BankTotal);
        Assert.Equal(3, edited.Items.Count);
        await Assert.ThrowsAsync<OrderManagementException>(() => controller.CancelReconciliationDraft(batch.Id, new(batch.Version, "Stale request"), default));
        var cancelled = await controller.CancelReconciliationDraft(batch.Id, new(edited.Batch.Version, "Duplicate working batch"), default);
        Assert.Equal("Cancelled", cancelled.Batch.Status); Assert.Equal(2, cancelled.Changes.Count);
        Assert.Equal(3, cancelled.Items.Count); Assert.Equal("Duplicate working batch", cancelled.Changes[1].Change.Reason);
        Assert.False((await scope.Db.PaymentAllocations.SingleAsync(item => item.Id == allocation.Id)).IsReversed);
        Assert.Equal(2.5m, (await scope.Db.PaymentReceipts.SingleAsync(item => item.Id == receipt.Id)).UnappliedAmount);
        await Assert.ThrowsAsync<OrderManagementException>(() => controller.SubmitReconciliation(batch.Id, new(cancelled.Batch.Version), default));
        Assert.Equal("Cancelled", (await controller.ReconciliationDetail(batch.Id, default)).Batch.Status);
        var another = await controller.CreateReconciliation(new(new(2026, 9, 7), 0, [receipt.Id], [], []), default);
        var cancelAttention = new OperationalAttentionItem(OperationalAttentionCategory.ReconciliationDifference, scope.Customer.Id, "ReconciliationBatch", another.Id, 0, "Duplicate batch difference", "Review the draft");
        cancelAttention.Assign(scope.Operator.Id); scope.Db.Add(cancelAttention); await scope.Db.SaveChangesAsync();
        await controller.CancelReconciliationDraft(another.Id, new(another.Version, "Duplicate reconciliation"), default);
        Assert.Equal(OperationalAttentionStatus.Resolved, cancelAttention.Status); Assert.Equal(scope.Operator.Id, cancelAttention.OwnerUserId);
        Assert.Equal(scope.Operator.Id, cancelAttention.ResolvedByUserId); Assert.Equal("Duplicate reconciliation", cancelAttention.Resolution);
    }
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
        public async Task<Invoice> AddInvoice(string suffix, Organization? customer = null)
        {
            customer ??= Customer; var now = DateTime.UtcNow; var reference = Guid.NewGuid().ToString("N");
            var order = new LabServiceOrder(customer.Id, customer.Departments.Single().Id, "FIN-" + reference, reference, "Finance source fixture", 1, false, "Synthetic RNA", "Frozen", "Research only", "Fixture");
            var quote = new LabServiceQuote(order.Id, 1, QuotePurpose.Initial, "[]", 100, 0, "USD", now, now.AddDays(30));
            var invoice = new Invoice(customer.Id, order.Id, quote.Id, Source + "-" + suffix, new(2026, 9, 7), 30,
                "{}", "{}", "{}", 100, 0, "fixture.pdf", new string('A', 64), Operator.Id, now);
            Db.AddRange(order, quote, invoice); await Db.SaveChangesAsync(); return invoice;
        }
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
                var batchIds = Db.ReconciliationBatches.Where(item => users.Contains(item.CreatedByUserIdValue)).Select(item => item.Id);
                await Db.OperationalAttentionItems.Where(item => item.OrganizationId != null && organizations.Contains(item.OrganizationId.Value)).ExecuteDeleteAsync();
                await Db.ReconciliationBatchItems.Where(item => batchIds.Contains(item.ReconciliationBatchId)).ExecuteDeleteAsync();
                await Db.ReconciliationBatches.Where(item => users.Contains(item.CreatedByUserIdValue)).ExecuteDeleteAsync();
                var invoiceIds = Db.Invoices.Where(item => organizations.Contains(item.OrganizationId)).Select(item => item.Id);
                await Db.PaymentAllocations.Where(item => invoiceIds.Contains(item.InvoiceId)).ExecuteDeleteAsync();
                await Db.InvoiceAdjustments.Where(item => invoiceIds.Contains(item.InvoiceId)).ExecuteDeleteAsync();
                await Db.Invoices.Where(item => organizations.Contains(item.OrganizationId)).ExecuteDeleteAsync();
                var orderIds = Db.LabServiceOrders.Where(item => organizations.Contains(item.OrganizationId)).Select(item => item.Id);
                await Db.LabServiceQuotes.Where(item => orderIds.Contains(item.LabServiceOrderId)).ExecuteDeleteAsync();
                await Db.LabServiceOrders.Where(item => organizations.Contains(item.OrganizationId)).ExecuteDeleteAsync();
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
