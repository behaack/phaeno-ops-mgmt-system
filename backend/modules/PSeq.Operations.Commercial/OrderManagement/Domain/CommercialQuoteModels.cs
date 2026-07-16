namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class LabServiceRequestRevision
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabServiceOrderId { get; private set; }
    public int Revision { get; private set; }
    public Guid? PreviousRevisionId { get; private set; }
    public string SnapshotJson { get; private set; } = "{}";
    public string? CorrectionReason { get; private set; }
    public Guid SubmittedByUserId { get; private set; }
    public DateTime SubmittedAt { get; private set; }

    private LabServiceRequestRevision() { }

    public LabServiceRequestRevision(Guid orderId, int revision, Guid? previousRevisionId, string snapshotJson,
        string? correctionReason, Guid submittedByUserId, DateTime submittedAt)
    {
        if (revision <= 0) throw new ArgumentOutOfRangeException(nameof(revision));
        LabServiceOrderId = orderId;
        Revision = revision;
        PreviousRevisionId = previousRevisionId;
        SnapshotJson = OrderText.Json(snapshotJson);
        CorrectionReason = OrderText.Optional(correctionReason, 2000);
        SubmittedByUserId = submittedByUserId;
        SubmittedAt = submittedAt;
    }
}

public sealed class LabServiceQuote : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabServiceOrderId { get; private set; }
    public int Revision { get; private set; }
    public QuotePurpose Purpose { get; private set; }
    public QuoteStatus Status { get; private set; } = QuoteStatus.SyncPending;
    public string LinesJson { get; private set; } = "[]";
    public decimal Subtotal { get; private set; }
    public decimal Tax { get; private set; }
    public decimal Total { get; private set; }
    public string Currency { get; private set; } = "USD";
    public DateTime IssuedAt { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime? AcceptedAt { get; private set; }
    public Guid? AcceptedByUserId { get; private set; }
    public Guid? SupersededByQuoteId { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private LabServiceQuote() { }

    public LabServiceQuote(
        Guid labServiceOrderId,
        int revision,
        QuotePurpose purpose,
        string linesJson,
        decimal subtotal,
        decimal tax,
        string currency,
        DateTime issuedAt,
        DateTime expiresAt)
    {
        if (revision <= 0) throw new ArgumentOutOfRangeException(nameof(revision));
        if (subtotal < 0 || tax < 0) throw new ArgumentOutOfRangeException(nameof(subtotal));
        if (expiresAt <= issuedAt) throw new ArgumentException("Quote expiration must be after issue time.");
        LabServiceOrderId = labServiceOrderId;
        Revision = revision;
        Purpose = purpose;
        LinesJson = OrderText.Json(linesJson);
        Subtotal = decimal.Round(subtotal, 2, MidpointRounding.AwayFromZero);
        Tax = decimal.Round(tax, 2, MidpointRounding.AwayFromZero);
        Total = Subtotal + Tax;
        Currency = OrderText.Currency(currency);
        IssuedAt = issuedAt;
        ExpiresAt = expiresAt;
    }

    public void MarkIssued() { if (Status != QuoteStatus.SyncPending) throw new InvalidOperationException(); Status = QuoteStatus.Issued; }
    public void Supersede(Guid nextQuoteId) { if (Status is QuoteStatus.Accepted or QuoteStatus.Superseded) throw new InvalidOperationException(); Status = QuoteStatus.Superseded; SupersededByQuoteId = nextQuoteId; }

    public void Accept(Guid actorUserId, DateTime utcNow)
    {
        if (Status != QuoteStatus.Issued) throw new InvalidOperationException("Only an issued quote can be accepted.");
        if (ExpiresAt <= utcNow) { Status = QuoteStatus.Expired; throw new InvalidOperationException("The quote has expired."); }
        Status = QuoteStatus.Accepted;
        AcceptedByUserId = actorUserId;
        AcceptedAt = utcNow;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class DataAssemblyQuote : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid DataAssemblyRequestId { get; private set; }
    public int Revision { get; private set; }
    public QuotePurpose Purpose { get; private set; }
    public QuoteStatus Status { get; private set; } = QuoteStatus.SyncPending;
    public string LinesJson { get; private set; } = "[]";
    public decimal Subtotal { get; private set; }
    public decimal Tax { get; private set; }
    public decimal Total { get; private set; }
    public string Currency { get; private set; } = "USD";
    public DateTime IssuedAt { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime? AcceptedAt { get; private set; }
    public Guid? AcceptedByUserId { get; private set; }
    public Guid? SupersededByQuoteId { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private DataAssemblyQuote() { }
    public DataAssemblyQuote(Guid requestId, int revision, QuotePurpose purpose, string linesJson, decimal subtotal, decimal tax, string currency, DateTime issuedAt, DateTime expiresAt)
    {
        if (revision <= 0) throw new ArgumentOutOfRangeException(nameof(revision));
        if (subtotal < 0 || tax < 0) throw new ArgumentOutOfRangeException(nameof(subtotal));
        if (expiresAt <= issuedAt) throw new ArgumentException("Quote expiration must be after issue time.");
        DataAssemblyRequestId = requestId;
        Revision = revision;
        Purpose = purpose;
        LinesJson = OrderText.Json(linesJson);
        Subtotal = decimal.Round(subtotal, 2, MidpointRounding.AwayFromZero);
        Tax = decimal.Round(tax, 2, MidpointRounding.AwayFromZero);
        Total = Subtotal + Tax;
        Currency = OrderText.Currency(currency);
        IssuedAt = issuedAt;
        ExpiresAt = expiresAt;
    }
    public void MarkIssued() { if (Status != QuoteStatus.SyncPending) throw new InvalidOperationException(); Status = QuoteStatus.Issued; }
    public void Supersede(Guid nextQuoteId) { if (Status is QuoteStatus.Accepted or QuoteStatus.Superseded) throw new InvalidOperationException(); Status = QuoteStatus.Superseded; SupersededByQuoteId = nextQuoteId; }
    public void Accept(Guid actorUserId, DateTime utcNow)
    {
        if (Status != QuoteStatus.Issued) throw new InvalidOperationException("Only an issued quote can be accepted.");
        if (ExpiresAt <= utcNow) { Status = QuoteStatus.Expired; throw new InvalidOperationException("The quote has expired."); }
        Status = QuoteStatus.Accepted; AcceptedByUserId = actorUserId; AcceptedAt = utcNow;
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
