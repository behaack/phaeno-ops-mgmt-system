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
    public string? BillingContactSnapshotJson { get; private set; }
    public string? BillingAddressSnapshotJson { get; private set; }
    public int? PaymentTermsDaysSnapshot { get; private set; }
    public string? TaxDecisionSnapshotJson { get; private set; }
    public int? CommercialConfigurationVersion { get; private set; }
    public int? SourceRequestRevision { get; private set; }
    public decimal? ProposedUnitPriceSnapshot { get; private set; }
    public QuotePricingDecision? PricingDecision { get; private set; }
    public string? PricingDecisionReason { get; private set; }
    public Guid? PricingDecidedByUserId { get; private set; }
    public DateTime? PricingDecidedAt { get; private set; }
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

    public void FreezeCommercialTerms(
        string billingContactSnapshotJson,
        string billingAddressSnapshotJson,
        int paymentTermsDays,
        string taxDecisionSnapshotJson,
        int commercialConfigurationVersion)
    {
        if (Status != QuoteStatus.SyncPending)
            throw new InvalidOperationException("Commercial terms must be frozen before quote issuance.");
        if (paymentTermsDays is < 0 or > 365 || commercialConfigurationVersion < 1)
            throw new ArgumentOutOfRangeException(nameof(paymentTermsDays));
        BillingContactSnapshotJson = OrderText.Json(billingContactSnapshotJson);
        BillingAddressSnapshotJson = OrderText.Json(billingAddressSnapshotJson);
        PaymentTermsDaysSnapshot = paymentTermsDays;
        TaxDecisionSnapshotJson = OrderText.Json(taxDecisionSnapshotJson);
        CommercialConfigurationVersion = commercialConfigurationVersion;
    }

    public void RecordPricingDecision(
        int sourceRequestRevision,
        decimal? proposedUnitPrice,
        decimal finalUnitPrice,
        string? amendmentReason,
        Guid actorUserId,
        DateTime utcNow)
    {
        if (Status != QuoteStatus.SyncPending)
            throw new InvalidOperationException("Pricing must be decided before quote issuance.");
        if (sourceRequestRevision < 1) throw new ArgumentOutOfRangeException(nameof(sourceRequestRevision));
        if (actorUserId == Guid.Empty) throw new ArgumentException("A pricing reviewer is required.", nameof(actorUserId));
        if (utcNow.Kind != DateTimeKind.Utc) throw new ArgumentException("Pricing decision time must be UTC.", nameof(utcNow));

        SourceRequestRevision = sourceRequestRevision;
        ProposedUnitPriceSnapshot = proposedUnitPrice;
        PricingDecision = !proposedUnitPrice.HasValue
            ? QuotePricingDecision.PricedWithoutProposal
            : proposedUnitPrice.Value == finalUnitPrice
                ? QuotePricingDecision.ApprovedAsProposed
                : QuotePricingDecision.AmendedProposal;
        if (PricingDecision == QuotePricingDecision.AmendedProposal)
            PricingDecisionReason = OrderText.Required(amendmentReason, "Price amendment reason", 2000);
        else
            PricingDecisionReason = null;
        PricingDecidedByUserId = actorUserId;
        PricingDecidedAt = utcNow;
    }
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
