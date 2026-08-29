namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using System.ComponentModel.DataAnnotations.Schema;
using PSeq.Operations.Commercial.Common.Persistence;

[NotMapped]
public abstract class CommercialReceivableEntity : IAudit, IConcurrency
{
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;

    protected static string Required(string? value, string parameterName, int maximumLength = 4000) =>
        OrderText.Required(value, parameterName, maximumLength);
    protected static string? Optional(string? value, int maximumLength = 4000) =>
        OrderText.Optional(value, maximumLength);
    protected static decimal Money(decimal value) =>
        decimal.Round(value, 2, MidpointRounding.AwayFromZero);
}

public enum InvoiceStatus
{
    Issued,
    PartiallyPaid,
    Paid,
    Voided,
    WrittenOff
}

public sealed class Invoice : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid LabServiceOrderId { get; private set; }
    public Guid AcceptedQuoteId { get; private set; }
    public string InvoiceNumber { get; private set; } = null!;
    public InvoiceStatus Status { get; private set; } = InvoiceStatus.Issued;
    public string Currency { get; private set; } = "USD";
    public DateOnly IssuedOn { get; private set; }
    public DateOnly DueOn { get; private set; }
    public int PaymentTermsDays { get; private set; }
    public string BillingContactSnapshotJson { get; private set; } = null!;
    public string BillingAddressSnapshotJson { get; private set; } = null!;
    public string TaxDecisionSnapshotJson { get; private set; } = null!;
    public decimal Subtotal { get; private set; }
    public decimal TaxTotal { get; private set; }
    public decimal AdjustmentTotal { get; private set; }
    public decimal Total { get; private set; }
    public decimal AppliedTotal { get; private set; }
    public decimal Balance { get; private set; }
    public string PdfStorageKey { get; private set; } = null!;
    public string PdfSha256 { get; private set; } = null!;
    public Guid IssuedByUserId { get; private set; }
    public DateTime IssuedAtUtc { get; private set; }
    public DateTime? VoidedAtUtc { get; private set; }
    public Guid? VoidedByUserId { get; private set; }
    public string? VoidReason { get; private set; }

    private Invoice() { }

    public Invoice(
        Guid organizationId,
        Guid labServiceOrderId,
        Guid acceptedQuoteId,
        string invoiceNumber,
        DateOnly issuedOn,
        int paymentTermsDays,
        string billingContactSnapshotJson,
        string billingAddressSnapshotJson,
        string taxDecisionSnapshotJson,
        decimal subtotal,
        decimal taxTotal,
        string pdfStorageKey,
        string pdfSha256,
        Guid issuedByUserId,
        DateTime issuedAtUtc)
    {
        if (organizationId == Guid.Empty || labServiceOrderId == Guid.Empty
            || acceptedQuoteId == Guid.Empty || issuedByUserId == Guid.Empty)
            throw new ArgumentException("Organization, order, quote, and issuer identifiers are required.");
        if (paymentTermsDays is < 0 or > 365) throw new ArgumentOutOfRangeException(nameof(paymentTermsDays));
        if (subtotal < 0 || taxTotal < 0) throw new ArgumentOutOfRangeException(nameof(subtotal));

        OrganizationId = organizationId;
        LabServiceOrderId = labServiceOrderId;
        AcceptedQuoteId = acceptedQuoteId;
        InvoiceNumber = Required(invoiceNumber, nameof(invoiceNumber), 100);
        IssuedOn = issuedOn;
        PaymentTermsDays = paymentTermsDays;
        DueOn = issuedOn.AddDays(paymentTermsDays);
        BillingContactSnapshotJson = OrderText.Json(billingContactSnapshotJson);
        BillingAddressSnapshotJson = OrderText.Json(billingAddressSnapshotJson);
        TaxDecisionSnapshotJson = OrderText.Json(taxDecisionSnapshotJson);
        Subtotal = Money(subtotal);
        TaxTotal = Money(taxTotal);
        Total = Money(Subtotal + TaxTotal);
        Balance = Total;
        PdfStorageKey = Required(pdfStorageKey, nameof(pdfStorageKey), 1000);
        PdfSha256 = Required(pdfSha256, nameof(pdfSha256), 64).ToUpperInvariant();
        IssuedByUserId = issuedByUserId;
        IssuedAtUtc = issuedAtUtc;
    }

    public void ApplyPayment(decimal amount)
    {
        EnsureOpen();
        amount = Money(amount);
        if (amount <= 0 || amount > Balance)
            throw new InvalidOperationException("Payment allocation must be positive and cannot exceed the invoice balance.");
        AppliedTotal = Money(AppliedTotal + amount);
        Recalculate();
    }

    public void ReversePayment(decimal amount)
    {
        EnsureOpen();
        amount = Money(amount);
        if (amount <= 0 || amount > AppliedTotal)
            throw new InvalidOperationException("The reversed amount exceeds applied payment.");
        AppliedTotal = Money(AppliedTotal - amount);
        Recalculate();
    }

    public void ApplyAdjustment(InvoiceAdjustmentKind kind, decimal amount)
    {
        EnsureOpen();
        amount = Money(amount);
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        AdjustmentTotal = Money(AdjustmentTotal + (kind == InvoiceAdjustmentKind.Debit ? amount : -amount));
        Total = Money(Subtotal + TaxTotal + AdjustmentTotal);
        if (Total < 0) throw new InvalidOperationException("Invoice credits cannot reduce the total below zero.");
        Recalculate();
        if (kind == InvoiceAdjustmentKind.WriteOff && Balance == 0) Status = InvoiceStatus.WrittenOff;
    }

    public void Void(Guid actorUserId, DateTime utcNow, string reason)
    {
        if (Status is InvoiceStatus.Voided or InvoiceStatus.WrittenOff)
            throw new InvalidOperationException("The invoice is already terminal.");
        if (AppliedTotal != 0)
            throw new InvalidOperationException("Reverse all payment allocations before voiding the invoice.");
        Status = InvoiceStatus.Voided;
        Balance = 0;
        VoidedByUserId = actorUserId != Guid.Empty ? actorUserId : throw new ArgumentException("An actor is required.");
        VoidedAtUtc = utcNow;
        VoidReason = Required(reason, nameof(reason), 2000);
    }

    private void Recalculate()
    {
        Balance = Money(Math.Max(0, Total - AppliedTotal));
        Status = Balance == 0
            ? InvoiceStatus.Paid
            : AppliedTotal > 0
                ? InvoiceStatus.PartiallyPaid
                : InvoiceStatus.Issued;
    }

    private void EnsureOpen()
    {
        if (Status is InvoiceStatus.Voided or InvoiceStatus.WrittenOff)
            throw new InvalidOperationException("A terminal invoice cannot be changed.");
    }
}

public sealed class InvoiceLine
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid InvoiceId { get; private set; }
    public int LineNumber { get; private set; }
    public Guid? SourceQuoteLineId { get; private set; }
    public string Description { get; private set; } = null!;
    public decimal Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal TaxRate { get; private set; }
    public decimal Subtotal { get; private set; }
    public decimal TaxAmount { get; private set; }
    public decimal Total { get; private set; }

    private InvoiceLine() { }

    public InvoiceLine(Guid invoiceId, int lineNumber, Guid? sourceQuoteLineId,
        string description, decimal quantity, decimal unitPrice, decimal taxRate)
    {
        if (invoiceId == Guid.Empty) throw new ArgumentException("An invoice is required.");
        if (lineNumber < 1) throw new ArgumentOutOfRangeException(nameof(lineNumber));
        if (quantity <= 0 || unitPrice < 0 || taxRate is < 0 or > 1)
            throw new ArgumentOutOfRangeException(nameof(quantity));
        InvoiceId = invoiceId;
        LineNumber = lineNumber;
        SourceQuoteLineId = sourceQuoteLineId;
        Description = OrderText.Required(description, nameof(description), 1000);
        Quantity = quantity;
        UnitPrice = Money(unitPrice);
        TaxRate = decimal.Round(taxRate, 6, MidpointRounding.AwayFromZero);
        Subtotal = Money(quantity * UnitPrice);
        TaxAmount = Money(Subtotal * TaxRate);
        Total = Money(Subtotal + TaxAmount);
    }

    private static decimal Money(decimal value) => decimal.Round(value, 2, MidpointRounding.AwayFromZero);
}

public enum InvoiceAdjustmentKind
{
    Credit,
    Debit,
    WriteOff
}

public sealed class InvoiceAdjustment : CommercialReceivableEntity
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
        string reason, Guid recordedByUserId, DateTime recordedAtUtc)
    {
        if (invoiceId == Guid.Empty || recordedByUserId == Guid.Empty)
            throw new ArgumentException("Invoice and actor identifiers are required.");
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        InvoiceId = invoiceId;
        Kind = kind;
        Amount = Money(amount);
        Reason = Required(reason, nameof(reason), 2000);
        RecordedByUserId = recordedByUserId;
        RecordedAtUtc = recordedAtUtc;
    }
}

public enum PaymentReceiptStatus
{
    Unapplied,
    PartiallyApplied,
    Applied,
    Reversed
}

public sealed class PaymentReceipt : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public string ReceiptNumber { get; private set; } = null!;
    public string Source { get; private set; } = null!;
    public string ExternalId { get; private set; } = null!;
    public string Payer { get; private set; } = null!;
    public decimal Amount { get; private set; }
    public string Currency { get; private set; } = "USD";
    public DateOnly ReceivedOn { get; private set; }
    public string Method { get; private set; } = null!;
    public string BankReference { get; private set; } = null!;
    public string? EvidenceStorageKey { get; private set; }
    public string? Memo { get; private set; }
    public decimal AppliedAmount { get; private set; }
    public decimal UnappliedAmount { get; private set; }
    public PaymentReceiptStatus Status { get; private set; } = PaymentReceiptStatus.Unapplied;
    public Guid RecordedByUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    public Guid? ReversedByUserId { get; private set; }
    public DateTime? ReversedAtUtc { get; private set; }
    public string? ReversalReason { get; private set; }

    private PaymentReceipt() { }

    public PaymentReceipt(Guid organizationId, string receiptNumber, string source,
        string externalId, string payer, decimal amount, string currency,
        DateOnly receivedOn, string method, string bankReference,
        string? evidenceStorageKey, string? memo, Guid recordedByUserId, DateTime recordedAtUtc)
    {
        if (organizationId == Guid.Empty || recordedByUserId == Guid.Empty)
            throw new ArgumentException("Organization and actor identifiers are required.");
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        if (!string.Equals(OrderText.Currency(currency), "USD", StringComparison.Ordinal))
            throw new ArgumentException("PSeq accounts receivable supports USD only.", nameof(currency));
        OrganizationId = organizationId;
        ReceiptNumber = Required(receiptNumber, nameof(receiptNumber), 100);
        Source = Required(source, nameof(source), 100);
        ExternalId = Required(externalId, nameof(externalId), 255);
        Payer = Required(payer, nameof(payer), 255);
        Amount = Money(amount);
        UnappliedAmount = Amount;
        Currency = "USD";
        ReceivedOn = receivedOn;
        Method = Required(method, nameof(method), 100);
        BankReference = Required(bankReference, nameof(bankReference), 255);
        EvidenceStorageKey = Optional(evidenceStorageKey, 1000);
        Memo = Optional(memo, 2000);
        RecordedByUserId = recordedByUserId;
        RecordedAtUtc = recordedAtUtc;
    }

    public void Allocate(decimal amount)
    {
        EnsureNotReversed();
        amount = Money(amount);
        if (amount <= 0 || amount > UnappliedAmount)
            throw new InvalidOperationException("Allocation must be positive and cannot exceed unapplied cash.");
        AppliedAmount = Money(AppliedAmount + amount);
        UnappliedAmount = Money(Amount - AppliedAmount);
        Status = UnappliedAmount == 0 ? PaymentReceiptStatus.Applied : PaymentReceiptStatus.PartiallyApplied;
    }

    public void ReverseAllocation(decimal amount)
    {
        EnsureNotReversed();
        amount = Money(amount);
        if (amount <= 0 || amount > AppliedAmount)
            throw new InvalidOperationException("The reversed allocation exceeds applied cash.");
        AppliedAmount = Money(AppliedAmount - amount);
        UnappliedAmount = Money(Amount - AppliedAmount);
        Status = AppliedAmount == 0 ? PaymentReceiptStatus.Unapplied : PaymentReceiptStatus.PartiallyApplied;
    }

    public void Reverse(Guid actorUserId, DateTime utcNow, string reason)
    {
        EnsureNotReversed();
        if (AppliedAmount != 0)
            throw new InvalidOperationException("Reverse allocations before reversing the receipt.");
        Status = PaymentReceiptStatus.Reversed;
        UnappliedAmount = 0;
        ReversedByUserId = actorUserId != Guid.Empty ? actorUserId : throw new ArgumentException("An actor is required.");
        ReversedAtUtc = utcNow;
        ReversalReason = Required(reason, nameof(reason), 2000);
    }

    private void EnsureNotReversed()
    {
        if (Status == PaymentReceiptStatus.Reversed)
            throw new InvalidOperationException("A reversed receipt cannot be changed.");
    }
}

public sealed class PaymentAllocation : CommercialReceivableEntity
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

    public PaymentAllocation(Guid paymentReceiptId, Guid invoiceId, decimal amount,
        Guid allocatedByUserId, DateTime allocatedAtUtc)
    {
        if (paymentReceiptId == Guid.Empty || invoiceId == Guid.Empty || allocatedByUserId == Guid.Empty)
            throw new ArgumentException("Receipt, invoice, and actor identifiers are required.");
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        PaymentReceiptId = paymentReceiptId;
        InvoiceId = invoiceId;
        Amount = Money(amount);
        AllocatedByUserId = allocatedByUserId;
        AllocatedAtUtc = allocatedAtUtc;
    }

    public void Reverse(Guid actorUserId, DateTime utcNow, string reason)
    {
        if (IsReversed) throw new InvalidOperationException("The allocation is already reversed.");
        ReversedByUserId = actorUserId != Guid.Empty ? actorUserId : throw new ArgumentException("An actor is required.");
        ReversedAtUtc = utcNow;
        ReversalReason = Required(reason, nameof(reason), 2000);
    }
}

public enum PaymentImportBatchStatus
{
    Preview,
    Confirmed,
    Rejected
}

public sealed class PaymentImportBatch : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Source { get; private set; } = null!;
    public string PayloadSha256 { get; private set; } = null!;
    public string PreviewJson { get; private set; } = null!;
    public int RowCount { get; private set; }
    public decimal TotalAmount { get; private set; }
    public PaymentImportBatchStatus Status { get; private set; } = PaymentImportBatchStatus.Preview;
    public Guid PreviewedByUserId { get; private set; }
    public DateTime PreviewedAtUtc { get; private set; }
    public Guid? ConfirmedByUserId { get; private set; }
    public DateTime? ConfirmedAtUtc { get; private set; }

    private PaymentImportBatch() { }

    public PaymentImportBatch(string source, string payloadSha256, string previewJson,
        int rowCount, decimal totalAmount, Guid actorUserId, DateTime utcNow)
    {
        if (rowCount < 1 || totalAmount <= 0) throw new ArgumentOutOfRangeException(nameof(rowCount));
        Source = Required(source, nameof(source), 100);
        PayloadSha256 = Required(payloadSha256, nameof(payloadSha256), 64).ToUpperInvariant();
        PreviewJson = OrderText.Json(previewJson);
        RowCount = rowCount;
        TotalAmount = Money(totalAmount);
        PreviewedByUserId = actorUserId != Guid.Empty ? actorUserId : throw new ArgumentException("An actor is required.");
        PreviewedAtUtc = utcNow;
    }

    public void Confirm(Guid actorUserId, DateTime utcNow)
    {
        if (Status != PaymentImportBatchStatus.Preview)
            throw new InvalidOperationException("Only a preview batch can be confirmed.");
        Status = PaymentImportBatchStatus.Confirmed;
        ConfirmedByUserId = actorUserId;
        ConfirmedAtUtc = utcNow;
    }
}

public enum ReconciliationBatchStatus
{
    Draft,
    Submitted,
    Approved,
    Rejected
}

public sealed class ReconciliationBatch : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string BatchNumber { get; private set; } = null!;
    public DateOnly PeriodEnd { get; private set; }
    public decimal LedgerReceiptTotal { get; private set; }
    public decimal BankTotal { get; private set; }
    public decimal Difference { get; private set; }
    public ReconciliationBatchStatus Status { get; private set; } = ReconciliationBatchStatus.Draft;
    public Guid CreatedByUserIdValue { get; private set; }
    public Guid? SubmittedByUserId { get; private set; }
    public DateTime? SubmittedAtUtc { get; private set; }
    public Guid? ApprovedByUserId { get; private set; }
    public DateTime? ApprovedAtUtc { get; private set; }
    public string? CloseoutReportJson { get; private set; }

    private ReconciliationBatch() { }

    public ReconciliationBatch(string batchNumber, DateOnly periodEnd,
        decimal ledgerReceiptTotal, decimal bankTotal, Guid createdByUserId)
    {
        if (ledgerReceiptTotal < 0 || bankTotal < 0) throw new ArgumentOutOfRangeException(nameof(ledgerReceiptTotal));
        BatchNumber = Required(batchNumber, nameof(batchNumber), 100);
        PeriodEnd = periodEnd;
        LedgerReceiptTotal = Money(ledgerReceiptTotal);
        BankTotal = Money(bankTotal);
        Difference = Money(BankTotal - LedgerReceiptTotal);
        CreatedByUserIdValue = createdByUserId != Guid.Empty ? createdByUserId : throw new ArgumentException("An actor is required.");
    }

    public void Submit(Guid actorUserId, DateTime utcNow)
    {
        if (Status != ReconciliationBatchStatus.Draft)
            throw new InvalidOperationException("Only a draft reconciliation can be submitted.");
        Status = ReconciliationBatchStatus.Submitted;
        SubmittedByUserId = actorUserId;
        SubmittedAtUtc = utcNow;
    }

    public void Approve(Guid actorUserId, IEnumerable<Guid> contributingActors,
        string closeoutReportJson, DateTime utcNow, bool enforceActorSeparation = true)
    {
        if (Status != ReconciliationBatchStatus.Submitted)
            throw new InvalidOperationException("Only a submitted reconciliation can be approved.");
        if (Difference != 0)
            throw new InvalidOperationException("Resolve reconciliation differences before approval.");
        if (enforceActorSeparation && (actorUserId == CreatedByUserIdValue
            || actorUserId == SubmittedByUserId
            || contributingActors.Contains(actorUserId)))
            throw new InvalidOperationException(
                "Reconciliation approval requires an actor who did not create, submit, receive, import, allocate, reverse, or adjust included cash.");
        Status = ReconciliationBatchStatus.Approved;
        ApprovedByUserId = actorUserId;
        ApprovedAtUtc = utcNow;
        CloseoutReportJson = OrderText.Json(closeoutReportJson);
    }
}

public sealed class ReconciliationBatchItem
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ReconciliationBatchId { get; private set; }
    public string SourceType { get; private set; } = null!;
    public Guid SourceId { get; private set; }
    public decimal Amount { get; private set; }
    public Guid ContributingActorUserId { get; private set; }

    private ReconciliationBatchItem() { }

    public ReconciliationBatchItem(Guid reconciliationBatchId, string sourceType,
        Guid sourceId, decimal amount, Guid contributingActorUserId)
    {
        if (reconciliationBatchId == Guid.Empty || sourceId == Guid.Empty || contributingActorUserId == Guid.Empty)
            throw new ArgumentException("Batch, source, and contributor identifiers are required.");
        ReconciliationBatchId = reconciliationBatchId;
        SourceType = OrderText.Required(sourceType, nameof(sourceType), 100);
        SourceId = sourceId;
        Amount = decimal.Round(amount, 2, MidpointRounding.AwayFromZero);
        ContributingActorUserId = contributingActorUserId;
    }
}

public sealed class PaymentProcessorExternalLink : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string ProviderKey { get; private set; } = null!;
    public string LocalEntityType { get; private set; } = null!;
    public Guid LocalEntityId { get; private set; }
    public string ExternalId { get; private set; } = null!;
    public string MetadataJson { get; private set; } = "{}";

    private PaymentProcessorExternalLink() { }

    public PaymentProcessorExternalLink(string providerKey, string localEntityType,
        Guid localEntityId, string externalId, string metadataJson)
    {
        ProviderKey = Required(providerKey, nameof(providerKey), 100);
        LocalEntityType = Required(localEntityType, nameof(localEntityType), 100);
        LocalEntityId = localEntityId != Guid.Empty ? localEntityId : throw new ArgumentException("A local entity is required.");
        ExternalId = Required(externalId, nameof(externalId), 255);
        MetadataJson = OrderText.Json(metadataJson);
    }
}
