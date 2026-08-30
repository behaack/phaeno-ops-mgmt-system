namespace PSeq.Operations.Commercial.OrderToCash.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public enum TaxDecision { Taxable = 1, Exempt = 2, NonTaxable = 3 }
public enum InvoiceStatus { Issued = 1, PartiallyPaid = 2, Paid = 3, Voided = 4, WrittenOff = 5 }
public enum InvoiceAdjustmentKind { Credit = 1, Debit = 2, WriteOff = 3 }
public enum PaymentReceiptStatus { Unapplied = 1, PartiallyApplied = 2, Applied = 3, Reversed = 4 }
public enum ReconciliationStatus { Draft = 1, OutOfBalance = 2, ReadyForApproval = 3, Approved = 4 }

public sealed class Invoice : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid LabServiceOrderId { get; private set; }
    public Guid AcceptedQuoteId { get; private set; }
    public string InvoiceNumber { get; private set; } = null!;
    public InvoiceStatus Status { get; private set; } = InvoiceStatus.Issued;
    public string Currency { get; private set; } = "USD";
    public decimal Subtotal { get; private set; }
    public decimal Tax { get; private set; }
    public decimal AdjustmentTotal { get; private set; }
    public decimal Total { get; private set; }
    public decimal Balance { get; private set; }
    public string BillingSnapshotJson { get; private set; } = null!;
    public DateTime IssuedAtUtc { get; private set; }
    public DateTime DueAtUtc { get; private set; }
    public DateTime? ClosedAtUtc { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<InvoiceLine> Lines { get; } = [];
    public ICollection<InvoiceAdjustment> Adjustments { get; } = [];

    private Invoice() { }

    public Invoice(Guid organizationId, Guid orderId, Guid acceptedQuoteId,
        string invoiceNumber, decimal subtotal, decimal tax, string currency,
        string billingSnapshotJson, DateTime issuedAtUtc, DateTime dueAtUtc)
    {
        if (organizationId == Guid.Empty || orderId == Guid.Empty || acceptedQuoteId == Guid.Empty)
            throw new ArgumentException("Organization, order, and accepted quote are required.");
        if (subtotal < 0 || tax < 0) throw new ArgumentOutOfRangeException(nameof(subtotal));
        if (dueAtUtc < issuedAtUtc) throw new ArgumentException("The due date cannot precede invoice issue.");
        OrganizationId = organizationId;
        LabServiceOrderId = orderId;
        AcceptedQuoteId = acceptedQuoteId;
        InvoiceNumber = ArText.Required(invoiceNumber, nameof(invoiceNumber), 100);
        Currency = ArText.Usd(currency);
        Subtotal = Money(subtotal);
        Tax = Money(tax);
        Total = Money(Subtotal + Tax);
        Balance = Total;
        BillingSnapshotJson = ArText.Json(billingSnapshotJson);
        IssuedAtUtc = issuedAtUtc;
        DueAtUtc = dueAtUtc;
    }

    public void ApplyAllocation(decimal amount, DateTime utcNow)
    {
        EnsureOpen();
        amount = PositiveMoney(amount, nameof(amount));
        if (amount > Balance) throw new InvalidOperationException("An allocation cannot exceed the invoice balance.");
        Balance = Money(Balance - amount);
        Status = Balance == 0 ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;
        if (Balance == 0) ClosedAtUtc = utcNow;
    }

    public void ReverseAllocation(decimal amount)
    {
        if (Status is InvoiceStatus.Voided or InvoiceStatus.WrittenOff)
            throw new InvalidOperationException("Allocations cannot be reversed on a closed invoice.");
        amount = PositiveMoney(amount, nameof(amount));
        Balance = Money(Balance + amount);
        if (Balance > Total) throw new InvalidOperationException("A reversal cannot make the balance exceed the invoice total.");
        Status = Balance == Total ? InvoiceStatus.Issued : InvoiceStatus.PartiallyPaid;
        ClosedAtUtc = null;
    }

    public void ApplyAdjustment(InvoiceAdjustmentKind kind, decimal amount, DateTime utcNow)
    {
        EnsureOpen();
        amount = PositiveMoney(amount, nameof(amount));
        var signed = kind == InvoiceAdjustmentKind.Debit ? amount : -amount;
        if (Balance + signed < 0) throw new InvalidOperationException("An adjustment cannot create a negative invoice balance.");
        AdjustmentTotal = Money(AdjustmentTotal + signed);
        Total = Money(Subtotal + Tax + AdjustmentTotal);
        Balance = Money(Balance + signed);
        if (kind == InvoiceAdjustmentKind.WriteOff && Balance == 0)
        {
            Status = InvoiceStatus.WrittenOff;
            ClosedAtUtc = utcNow;
        }
        else if (Balance == 0)
        {
            Status = InvoiceStatus.Paid;
            ClosedAtUtc = utcNow;
        }
    }

    public void Void(DateTime utcNow)
    {
        if (Balance != Total) throw new InvalidOperationException("An invoice with cash allocations cannot be voided.");
        Status = InvoiceStatus.Voided;
        Balance = 0;
        ClosedAtUtc = utcNow;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
    private void EnsureOpen() { if (Status is InvoiceStatus.Voided or InvoiceStatus.WrittenOff) throw new InvalidOperationException("The invoice is closed."); }
    internal static decimal Money(decimal value) => decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    internal static decimal PositiveMoney(decimal value, string name) => value > 0 ? Money(value) : throw new ArgumentOutOfRangeException(name);
}

public sealed class InvoiceLine
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid InvoiceId { get; private set; }
    public int LineNumber { get; private set; }
    public string Description { get; private set; } = null!;
    public decimal Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal LineTotal { get; private set; }
    public string SourceSnapshotJson { get; private set; } = "{}";
    private InvoiceLine() { }
    public InvoiceLine(Guid invoiceId, int lineNumber, string description, decimal quantity,
        decimal unitPrice, string sourceSnapshotJson)
    {
        if (invoiceId == Guid.Empty || lineNumber < 1 || quantity <= 0 || unitPrice < 0)
            throw new ArgumentException("A valid invoice line is required.");
        InvoiceId = invoiceId; LineNumber = lineNumber;
        Description = ArText.Required(description, nameof(description), 1000);
        Quantity = quantity; UnitPrice = Invoice.Money(unitPrice);
        LineTotal = Invoice.Money(quantity * unitPrice);
        SourceSnapshotJson = ArText.Json(sourceSnapshotJson);
    }
}

public sealed class InvoiceAdjustment
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid InvoiceId { get; private set; }
    public InvoiceAdjustmentKind Kind { get; private set; }
    public decimal Amount { get; private set; }
    public string Reason { get; private set; } = null!;
    public Guid RecordedByUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    private InvoiceAdjustment() { }
    public InvoiceAdjustment(Guid invoiceId, InvoiceAdjustmentKind kind, decimal amount,
        string reason, Guid actorUserId, DateTime utcNow)
    {
        if (invoiceId == Guid.Empty || actorUserId == Guid.Empty) throw new ArgumentException("Invoice and actor are required.");
        InvoiceId = invoiceId; Kind = kind; Amount = Invoice.PositiveMoney(amount, nameof(amount));
        Reason = ArText.Required(reason, nameof(reason), 2000); RecordedByUserId = actorUserId; RecordedAtUtc = utcNow;
    }
}

public sealed class InvoiceDocument
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid InvoiceId { get; private set; }
    public string StorageObjectKey { get; private set; } = null!;
    public string Sha256 { get; private set; } = null!;
    public long SizeBytes { get; private set; }
    public DateTime GeneratedAtUtc { get; private set; }
    private InvoiceDocument() { }
    public InvoiceDocument(Guid invoiceId, string storageObjectKey, string sha256, long sizeBytes, DateTime utcNow)
    {
        if (invoiceId == Guid.Empty || sizeBytes < 1) throw new ArgumentException("A valid invoice document is required.");
        InvoiceId = invoiceId; StorageObjectKey = ArText.Required(storageObjectKey, nameof(storageObjectKey), 2000);
        Sha256 = ResultText.Sha256(sha256, nameof(sha256)); SizeBytes = sizeBytes; GeneratedAtUtc = utcNow;
    }
}

public sealed class PaymentReceipt : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public string ReceiptNumber { get; private set; } = null!;
    public string Payer { get; private set; } = null!;
    public decimal Amount { get; private set; }
    public decimal UnappliedAmount { get; private set; }
    public string Currency { get; private set; } = "USD";
    public DateTime ReceivedAtUtc { get; private set; }
    public string Method { get; private set; } = null!;
    public string BankReference { get; private set; } = null!;
    public string? EvidenceReference { get; private set; }
    public string ExternalId { get; private set; } = null!;
    public string? Memo { get; private set; }
    public PaymentReceiptStatus Status { get; private set; } = PaymentReceiptStatus.Unapplied;
    public Guid RecordedByUserId { get; private set; }
    public DateTime? ReversedAtUtc { get; private set; }
    public Guid? ReversedByUserId { get; private set; }
    public string? ReversalReason { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private PaymentReceipt() { }
    public PaymentReceipt(Guid organizationId, string receiptNumber, string payer,
        decimal amount, string currency, DateTime receivedAtUtc, string method,
        string bankReference, string? evidenceReference, string externalId,
        string? memo, Guid actorUserId)
    {
        if (organizationId == Guid.Empty || actorUserId == Guid.Empty) throw new ArgumentException("Organization and actor are required.");
        OrganizationId = organizationId; ReceiptNumber = ArText.Required(receiptNumber, nameof(receiptNumber), 100);
        Payer = ArText.Required(payer, nameof(payer), 500); Amount = Invoice.PositiveMoney(amount, nameof(amount));
        UnappliedAmount = Amount; Currency = ArText.Usd(currency); ReceivedAtUtc = receivedAtUtc;
        Method = ArText.Required(method, nameof(method), 100); BankReference = ArText.Required(bankReference, nameof(bankReference), 255);
        EvidenceReference = ArText.Optional(evidenceReference, 2000); ExternalId = ArText.Required(externalId, nameof(externalId), 255);
        Memo = ArText.Optional(memo, 2000); RecordedByUserId = actorUserId;
    }
    public void Allocate(decimal amount)
    {
        if (Status == PaymentReceiptStatus.Reversed) throw new InvalidOperationException("A reversed receipt cannot be allocated.");
        amount = Invoice.PositiveMoney(amount, nameof(amount));
        if (amount > UnappliedAmount) throw new InvalidOperationException("Allocation exceeds unapplied cash.");
        UnappliedAmount = Invoice.Money(UnappliedAmount - amount);
        Status = UnappliedAmount == 0 ? PaymentReceiptStatus.Applied : PaymentReceiptStatus.PartiallyApplied;
    }
    public void RestoreAllocation(decimal amount)
    {
        amount = Invoice.PositiveMoney(amount, nameof(amount));
        UnappliedAmount = Invoice.Money(UnappliedAmount + amount);
        if (UnappliedAmount > Amount) throw new InvalidOperationException("Receipt unapplied cash cannot exceed its amount.");
        Status = UnappliedAmount == Amount ? PaymentReceiptStatus.Unapplied : PaymentReceiptStatus.PartiallyApplied;
    }
    public void Reverse(Guid actorUserId, DateTime utcNow, string reason)
    {
        if (UnappliedAmount != Amount) throw new InvalidOperationException("Reverse allocations before reversing a receipt.");
        Status = PaymentReceiptStatus.Reversed; ReversedByUserId = actorUserId; ReversedAtUtc = utcNow;
        ReversalReason = ArText.Required(reason, nameof(reason), 2000);
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class PaymentAllocation
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PaymentReceiptId { get; private set; }
    public Guid InvoiceId { get; private set; }
    public decimal Amount { get; private set; }
    public Guid AllocatedByUserId { get; private set; }
    public DateTime AllocatedAtUtc { get; private set; }
    public Guid? ReversedByUserId { get; private set; }
    public DateTime? ReversedAtUtc { get; private set; }
    public string? ReversalReason { get; private set; }
    public bool IsReversed => ReversedAtUtc.HasValue;
    private PaymentAllocation() { }
    public PaymentAllocation(Guid receiptId, Guid invoiceId, decimal amount, Guid actorUserId, DateTime utcNow)
    {
        if (receiptId == Guid.Empty || invoiceId == Guid.Empty || actorUserId == Guid.Empty) throw new ArgumentException("Receipt, invoice, and actor are required.");
        PaymentReceiptId = receiptId; InvoiceId = invoiceId; Amount = Invoice.PositiveMoney(amount, nameof(amount));
        AllocatedByUserId = actorUserId; AllocatedAtUtc = utcNow;
    }
    public void Reverse(Guid actorUserId, DateTime utcNow, string reason)
    {
        if (IsReversed) throw new InvalidOperationException("The allocation has already been reversed.");
        ReversedByUserId = actorUserId; ReversedAtUtc = utcNow; ReversalReason = ArText.Required(reason, nameof(reason), 2000);
    }
}

public sealed class PaymentImportBatch : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Source { get; private set; } = null!;
    public string FileSha256 { get; private set; } = null!;
    public string PreviewRowsJson { get; private set; } = "[]";
    public string ValidationErrorsJson { get; private set; } = "[]";
    public int ValidRowCount { get; private set; }
    public DateTime ExpiresAtUtc { get; private set; }
    public DateTime? ConfirmedAtUtc { get; private set; }
    public Guid CreatedByCashOperatorUserId { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    private PaymentImportBatch() { }
    public PaymentImportBatch(string source, string fileSha256, string previewRowsJson,
        string validationErrorsJson, int validRowCount, DateTime expiresAtUtc, Guid actorUserId)
    {
        Source = ArText.Required(source, nameof(source), 255); FileSha256 = ResultText.Sha256(fileSha256, nameof(fileSha256));
        PreviewRowsJson = ArText.Json(previewRowsJson); ValidationErrorsJson = ArText.Json(validationErrorsJson);
        if (validRowCount < 0) throw new ArgumentOutOfRangeException(nameof(validRowCount));
        ValidRowCount = validRowCount; ExpiresAtUtc = expiresAtUtc; CreatedByCashOperatorUserId = actorUserId;
    }
    public void Confirm(DateTime utcNow)
    {
        if (ConfirmedAtUtc.HasValue || ExpiresAtUtc <= utcNow) throw new InvalidOperationException("The payment import preview is unavailable.");
        ConfirmedAtUtc = utcNow;
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class ReconciliationBatch : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string BatchNumber { get; private set; } = null!;
    public DateTime PeriodStartUtc { get; private set; }
    public DateTime PeriodEndUtc { get; private set; }
    public decimal ExpectedAmount { get; private set; }
    public decimal ReconciledAmount { get; private set; }
    public decimal Difference { get; private set; }
    public ReconciliationStatus Status { get; private set; } = ReconciliationStatus.Draft;
    public Guid PreparedByUserId { get; private set; }
    public string IncludedActivityActorIdsJson { get; private set; } = "[]";
    public Guid? ApprovedByUserId { get; private set; }
    public DateTime? ApprovedAtUtc { get; private set; }
    public string? ApprovalNotes { get; private set; }
    public string? CloseoutReportSha256 { get; private set; }
    public string? CloseoutReportJson { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    private ReconciliationBatch() { }
    public ReconciliationBatch(string batchNumber, DateTime periodStartUtc, DateTime periodEndUtc,
        decimal expectedAmount, decimal reconciledAmount, IEnumerable<Guid> activityActorIds,
        Guid preparedByUserId)
    {
        if (periodEndUtc <= periodStartUtc || preparedByUserId == Guid.Empty) throw new ArgumentException("A valid period and preparer are required.");
        BatchNumber = ArText.Required(batchNumber, nameof(batchNumber), 100); PeriodStartUtc = periodStartUtc; PeriodEndUtc = periodEndUtc;
        ExpectedAmount = Invoice.Money(expectedAmount); ReconciledAmount = Invoice.Money(reconciledAmount);
        Difference = Invoice.Money(ReconciledAmount - ExpectedAmount); PreparedByUserId = preparedByUserId;
        IncludedActivityActorIdsJson = System.Text.Json.JsonSerializer.Serialize(activityActorIds.Distinct().Order().ToArray());
        Status = Difference == 0 ? ReconciliationStatus.ReadyForApproval : ReconciliationStatus.OutOfBalance;
    }
    public bool IncludesActivityBy(Guid actorUserId)
    {
        var values = System.Text.Json.JsonSerializer.Deserialize<Guid[]>(IncludedActivityActorIdsJson) ?? [];
        return values.Contains(actorUserId);
    }
    public void Approve(Guid actorUserId, DateTime utcNow, string notes, string closeoutReportJson, string closeoutReportSha256)
    {
        if (Status != ReconciliationStatus.ReadyForApproval || Difference != 0) throw new InvalidOperationException("Only a balanced reconciliation can be approved.");
        if (actorUserId == PreparedByUserId || IncludesActivityBy(actorUserId)) throw new InvalidOperationException("The reconciler must be independent of included cash activity.");
        ApprovedByUserId = actorUserId; ApprovedAtUtc = utcNow; ApprovalNotes = ArText.Required(notes, nameof(notes), 4000);
        CloseoutReportJson = ArText.Json(closeoutReportJson); CloseoutReportSha256 = ResultText.Sha256(closeoutReportSha256, nameof(closeoutReportSha256));
        Status = ReconciliationStatus.Approved;
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class ExternalPaymentLink
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string ProviderKey { get; private set; } = null!;
    public string ExternalObjectType { get; private set; } = null!;
    public string ExternalObjectId { get; private set; } = null!;
    public Guid LocalRecordId { get; private set; }
    public DateTime LinkedAtUtc { get; private set; }
    private ExternalPaymentLink() { }
    public ExternalPaymentLink(string providerKey, string externalObjectType, string externalObjectId, Guid localRecordId, DateTime linkedAtUtc)
    {
        ProviderKey = ArText.Required(providerKey, nameof(providerKey), 100); ExternalObjectType = ArText.Required(externalObjectType, nameof(externalObjectType), 100);
        ExternalObjectId = ArText.Required(externalObjectId, nameof(externalObjectId), 255); LocalRecordId = localRecordId; LinkedAtUtc = linkedAtUtc;
    }
}

public interface IPaymentProcessorAdapter
{
    string ProviderKey { get; }
}

internal static class ArText
{
    public static string Required(string? value, string name, int maxLength) => ResultText.Required(value, name, maxLength);
    public static string? Optional(string? value, int maxLength) => ResultText.Optional(value, maxLength);
    public static string Json(string? value) => ResultText.Json(value);
    public static string Usd(string? currency)
    {
        var normalized = Required(currency, nameof(currency), 3).ToUpperInvariant();
        return normalized == "USD" ? normalized : throw new ArgumentException("PSeq accounts receivable supports USD only.", nameof(currency));
    }
}
