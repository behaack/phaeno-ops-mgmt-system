namespace PhaenoPortal.App.Features.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class LabServiceOrder : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public string OrderNumber { get; private set; } = null!;
    public string? CustomerReference { get; private set; }
    public string SubmissionInstructionsSnapshot { get; private set; } = string.Empty;
    public LabServiceOrderStatus Status { get; private set; } = LabServiceOrderStatus.DraftRequest;
    public LabServiceOrderStatus? ResumeStatus { get; private set; }
    public int RequestRevision { get; private set; }
    public Guid? SubmittedByUserId { get; private set; }
    public DateTime? SubmittedAt { get; private set; }
    public Guid? CurrentQuoteId { get; private set; }
    public Guid? AcceptedQuoteId { get; private set; }
    public DateTime? PlacedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public bool IsDiscarded { get; private set; }
    public string? TenantSafeReason { get; private set; }
    public string? InternalNote { get; private set; }
    public Guid? AssignedToUserId { get; private set; }
    public DateTime? DueAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<LabSample> Samples { get; } = [];
    public ICollection<LabServiceQuote> Quotes { get; } = [];
    public ICollection<LabServiceRequestRevision> Revisions { get; } = [];

    private LabServiceOrder() { }

    public LabServiceOrder(
        Guid organizationId,
        string orderNumber,
        string? customerReference,
        string submissionInstructionsSnapshot)
    {
        OrganizationId = organizationId;
        OrderNumber = OrderText.Required(orderNumber, nameof(orderNumber), 50);
        CustomerReference = OrderText.Optional(customerReference, 255);
        SubmissionInstructionsSnapshot = OrderText.Optional(submissionInstructionsSnapshot, 8000) ?? string.Empty;
    }

    public void UpdateDraft(string? customerReference)
    {
        EnsureStatus(LabServiceOrderStatus.DraftRequest, LabServiceOrderStatus.ChangesRequested);
        CustomerReference = OrderText.Optional(customerReference, 255);
    }

    public void Submit(Guid actorUserId, DateTime utcNow)
    {
        EnsureStatus(LabServiceOrderStatus.DraftRequest, LabServiceOrderStatus.ChangesRequested);
        if (Samples.Count == 0) throw new InvalidOperationException("At least one sample is required.");
        RequestRevision++;
        SubmittedByUserId = actorUserId;
        SubmittedAt = utcNow;
        SetStatus(LabServiceOrderStatus.SubmittedForQuote, null, null);
    }

    public void BeginQuotePreparation() => Transition(LabServiceOrderStatus.SubmittedForQuote, LabServiceOrderStatus.QuoteInPreparation);

    public void RequestChanges(string tenantSafeReason, string? internalNote)
    {
        EnsureStatus(LabServiceOrderStatus.SubmittedForQuote, LabServiceOrderStatus.QuoteInPreparation);
        SetStatus(LabServiceOrderStatus.ChangesRequested, tenantSafeReason, internalNote);
    }

    public void Decline(string tenantSafeReason, string? internalNote)
    {
        EnsureStatus(LabServiceOrderStatus.SubmittedForQuote, LabServiceOrderStatus.QuoteInPreparation);
        SetStatus(LabServiceOrderStatus.Declined, tenantSafeReason, internalNote);
    }

    public void MarkQuoteIssued(Guid quoteId)
    {
        EnsureStatus(LabServiceOrderStatus.QuoteInPreparation, LabServiceOrderStatus.QuoteIssued);
        CurrentQuoteId = quoteId;
        SetStatus(LabServiceOrderStatus.QuoteIssued, null, null);
    }

    public void AcceptQuote(Guid quoteId, DateTime utcNow)
    {
        EnsureStatus(LabServiceOrderStatus.QuoteIssued);
        if (CurrentQuoteId != quoteId) throw new InvalidOperationException("Only the current quote can be accepted.");
        AcceptedQuoteId = quoteId;
        PlacedAt = utcNow;
        SetStatus(LabServiceOrderStatus.PlacedAwaitingSamples, null, null);
    }

    public void MarkWorkStarted()
    {
        EnsureStatus(LabServiceOrderStatus.PlacedAwaitingSamples, LabServiceOrderStatus.InProgress, LabServiceOrderStatus.ResultsAvailable);
        if (Status != LabServiceOrderStatus.ResultsAvailable) SetStatus(LabServiceOrderStatus.InProgress, null, null);
    }

    public void MarkResultsAvailable()
    {
        EnsureStatus(LabServiceOrderStatus.PlacedAwaitingSamples, LabServiceOrderStatus.InProgress, LabServiceOrderStatus.ResultsAvailable);
        SetStatus(LabServiceOrderStatus.ResultsAvailable, null, null);
    }

    public void RequestCancellation()
    {
        EnsureStatus(LabServiceOrderStatus.PlacedAwaitingSamples, LabServiceOrderStatus.InProgress, LabServiceOrderStatus.ResultsAvailable);
        ResumeStatus = Status;
        SetStatus(LabServiceOrderStatus.CancellationRequested, null, null);
    }

    public void ResolveCancellation(bool cancelled, string tenantSafeReason, string? internalNote)
    {
        EnsureStatus(LabServiceOrderStatus.CancellationRequested);
        if (cancelled)
        {
            SetStatus(LabServiceOrderStatus.Cancelled, tenantSafeReason, internalNote);
            ResumeStatus = null;
            return;
        }

        var resume = ResumeStatus ?? LabServiceOrderStatus.InProgress;
        ResumeStatus = null;
        SetStatus(resume, tenantSafeReason, internalNote);
    }

    public void PutOnHold(string tenantSafeReason, string? internalNote)
    {
        if (IsTerminal()) throw new InvalidOperationException("A terminal lab order cannot be held.");
        ResumeStatus = Status;
        SetStatus(LabServiceOrderStatus.OnHold, tenantSafeReason, internalNote);
    }

    public void ReleaseHold(string tenantSafeReason, string? internalNote)
    {
        EnsureStatus(LabServiceOrderStatus.OnHold);
        var resume = ResumeStatus ?? LabServiceOrderStatus.InProgress;
        ResumeStatus = null;
        SetStatus(resume, tenantSafeReason, internalNote);
    }

    public void Complete(DateTime utcNow)
    {
        EnsureStatus(LabServiceOrderStatus.InProgress, LabServiceOrderStatus.ResultsAvailable);
        if (Samples.Any(sample => !sample.IsTerminal()))
            throw new InvalidOperationException("Every sample must be terminal before the job can be completed.");
        CompletedAt = utcNow;
        SetStatus(LabServiceOrderStatus.Completed, null, null);
    }

    public void WithdrawOrCancel(string reason)
    {
        if (Status is not (LabServiceOrderStatus.DraftRequest or LabServiceOrderStatus.SubmittedForQuote
            or LabServiceOrderStatus.ChangesRequested or LabServiceOrderStatus.QuoteInPreparation
            or LabServiceOrderStatus.QuoteIssued))
            throw new InvalidOperationException("This lab request requires a cancellation decision.");
        SetStatus(LabServiceOrderStatus.Cancelled, reason, null);
    }

    public void DiscardDraft()
    {
        EnsureStatus(LabServiceOrderStatus.DraftRequest);
        IsDiscarded = true;
    }

    public void Assign(Guid? userId, DateTime? dueAt) { AssignedToUserId = userId; DueAt = userId.HasValue ? dueAt : null; }

    public bool IsTerminal() => Status is LabServiceOrderStatus.Completed or LabServiceOrderStatus.Cancelled or LabServiceOrderStatus.Declined;

    private void Transition(LabServiceOrderStatus from, LabServiceOrderStatus to)
    {
        EnsureStatus(from);
        SetStatus(to, null, null);
    }

    private void SetStatus(LabServiceOrderStatus status, string? tenantSafeReason, string? internalNote)
    {
        Status = status;
        TenantSafeReason = OrderText.Optional(tenantSafeReason, 2000);
        InternalNote = OrderText.Optional(internalNote, 4000);
    }

    private void EnsureStatus(params LabServiceOrderStatus[] allowed)
    {
        if (!allowed.Contains(Status)) throw new InvalidOperationException($"Lab order cannot transition from {Status}.");
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

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

public sealed class LabSample : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabServiceOrderId { get; private set; }
    public string CustomerSampleId { get; private set; } = null!;
    public string MaterialType { get; private set; } = null!;
    public string BiologicalSource { get; private set; } = null!;
    public decimal Quantity { get; private set; }
    public string QuantityUnit { get; private set; } = null!;
    public string StorageRequirements { get; private set; } = null!;
    public string SafetyDeclaration { get; private set; } = null!;
    public DateTime? CollectionDate { get; private set; }
    public decimal? Concentration { get; private set; }
    public string? Notes { get; private set; }
    public string AnalysisDefinitionIdsJson { get; private set; } = "[]";
    public string? AccessionId { get; private set; }
    public LabSampleStatus Status { get; private set; } = LabSampleStatus.Expected;
    public LabSampleStatus? ResumeStatus { get; private set; }
    public Guid? ReplacementForSampleId { get; private set; }
    public DateTime? ReceivedAt { get; private set; }
    public string? ReceiptCondition { get; private set; }
    public string? Carrier { get; private set; }
    public string? TrackingNumber { get; private set; }
    public DateTime? CustomerShippedAt { get; private set; }
    public string? TenantSafeReason { get; private set; }
    public string? InternalNote { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private LabSample() { }

    public LabSample(
        Guid labServiceOrderId,
        string customerSampleId,
        string materialType,
        string biologicalSource,
        decimal quantity,
        string quantityUnit,
        string storageRequirements,
        string safetyDeclaration,
        DateTime? collectionDate,
        decimal? concentration,
        string? notes,
        string analysisDefinitionIdsJson,
        Guid? replacementForSampleId = null)
    {
        LabServiceOrderId = labServiceOrderId;
        ReplacementForSampleId = replacementForSampleId;
        UpdateMetadata(customerSampleId, materialType, biologicalSource, quantity, quantityUnit, storageRequirements, safetyDeclaration, collectionDate, concentration, notes, analysisDefinitionIdsJson);
    }

    public void UpdateMetadata(
        string customerSampleId,
        string materialType,
        string biologicalSource,
        decimal quantity,
        string quantityUnit,
        string storageRequirements,
        string safetyDeclaration,
        DateTime? collectionDate,
        decimal? concentration,
        string? notes,
        string analysisDefinitionIdsJson)
    {
        if (Status != LabSampleStatus.Expected) throw new InvalidOperationException("Only an expected sample can be edited.");
        if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity));
        if (concentration is < 0) throw new ArgumentOutOfRangeException(nameof(concentration));
        CustomerSampleId = OrderText.Required(customerSampleId, nameof(customerSampleId), 255);
        MaterialType = OrderText.Required(materialType, nameof(materialType), 255);
        BiologicalSource = OrderText.Required(biologicalSource, nameof(biologicalSource), 500);
        Quantity = quantity;
        QuantityUnit = OrderText.Required(quantityUnit, nameof(quantityUnit), 100);
        StorageRequirements = OrderText.Required(storageRequirements, nameof(storageRequirements), 2000);
        SafetyDeclaration = OrderText.Required(safetyDeclaration, nameof(safetyDeclaration), 2000);
        CollectionDate = collectionDate;
        Concentration = concentration;
        Notes = OrderText.Optional(notes, 4000);
        AnalysisDefinitionIdsJson = OrderText.Json(analysisDefinitionIdsJson);
    }

    public void RecordCustomerShipment(string? carrier, string? trackingNumber, DateTime? shippedAt)
    {
        Carrier = OrderText.Optional(carrier, 255);
        TrackingNumber = OrderText.Optional(trackingNumber, 255);
        CustomerShippedAt = shippedAt;
    }

    public void Receive(DateTime receivedAt, string receiptCondition)
    {
        EnsureStatus(LabSampleStatus.Expected);
        ReceivedAt = receivedAt;
        ReceiptCondition = OrderText.Required(receiptCondition, nameof(receiptCondition), 1000);
        Status = LabSampleStatus.Received;
    }

    public void Accession(string accessionId)
    {
        EnsureStatus(LabSampleStatus.Received);
        AccessionId = OrderText.Required(accessionId, nameof(accessionId), 100);
        Status = LabSampleStatus.Accessioned;
    }

    public void TransitionTo(LabSampleStatus target, string? tenantSafeReason, string? internalNote)
    {
        if (target is LabSampleStatus.OnHold or LabSampleStatus.Rejected && string.IsNullOrWhiteSpace(tenantSafeReason))
            throw new ArgumentException("A tenant-safe reason is required for hold or rejection.", nameof(tenantSafeReason));

        if (target == LabSampleStatus.OnHold)
        {
            if (IsTerminal()) throw new InvalidOperationException("A terminal sample cannot be held.");
            ResumeStatus = Status;
            Status = target;
        }
        else if (target == LabSampleStatus.Rejected)
        {
            if (IsTerminal()) throw new InvalidOperationException("A terminal sample cannot be rejected.");
            Status = target;
            ResumeStatus = null;
        }
        else if (Status == LabSampleStatus.OnHold)
        {
            if (target != ResumeStatus) throw new InvalidOperationException("A held sample must resume its prior status or be rejected.");
            Status = target;
            ResumeStatus = null;
        }
        else if (!IsAllowed(Status, target))
        {
            throw new InvalidOperationException($"Sample cannot transition from {Status} to {target}.");
        }
        else
        {
            Status = target;
        }

        TenantSafeReason = OrderText.Optional(tenantSafeReason, 2000);
        InternalNote = OrderText.Optional(internalNote, 4000);
    }

    public bool IsTerminal() => Status is LabSampleStatus.Completed or LabSampleStatus.Rejected;

    private static bool IsAllowed(LabSampleStatus from, LabSampleStatus to) =>
        (from, to) switch
        {
            (LabSampleStatus.Accessioned, LabSampleStatus.LabAnalysis) => true,
            (LabSampleStatus.LabAnalysis, LabSampleStatus.DataProcessing) => true,
            (LabSampleStatus.DataProcessing, LabSampleStatus.DataAvailable) => true,
            (LabSampleStatus.DataAvailable, LabSampleStatus.Completed) => true,
            (LabSampleStatus.DataAvailable, LabSampleStatus.DataProcessing) => true,
            _ => false
        };

    private void EnsureStatus(LabSampleStatus expected)
    {
        if (Status != expected) throw new InvalidOperationException($"Sample must be {expected}.");
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
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

public sealed class LabResultRelease : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid LabServiceOrderId { get; private set; }
    public Guid LabSampleId { get; private set; }
    public int ReleaseVersion { get; private set; }
    public string AnalysisProfile { get; private set; } = null!;
    public string PipelineVersion { get; private set; } = null!;
    public string Provenance { get; private set; } = null!;
    public string QcStatus { get; private set; } = null!;
    public string ManifestJson { get; private set; } = "{}";
    public FileReleaseStatus ReleaseStatus { get; private set; } = FileReleaseStatus.Internal;
    public DateTime GeneratedAt { get; private set; }
    public DateTime? ReleasedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private LabResultRelease() { }

    public LabResultRelease(
        Guid organizationId,
        Guid labServiceOrderId,
        Guid labSampleId,
        int releaseVersion,
        string analysisProfile,
        string pipelineVersion,
        string provenance,
        string qcStatus,
        string manifestJson,
        DateTime generatedAt)
    {
        if (releaseVersion <= 0) throw new ArgumentOutOfRangeException(nameof(releaseVersion));
        OrganizationId = organizationId;
        LabServiceOrderId = labServiceOrderId;
        LabSampleId = labSampleId;
        ReleaseVersion = releaseVersion;
        AnalysisProfile = OrderText.Required(analysisProfile, nameof(analysisProfile), 255);
        PipelineVersion = OrderText.Required(pipelineVersion, nameof(pipelineVersion), 255);
        Provenance = OrderText.Required(provenance, nameof(provenance), 4000);
        QcStatus = OrderText.Required(qcStatus, nameof(qcStatus), 500);
        ManifestJson = OrderText.Json(manifestJson);
        GeneratedAt = generatedAt;
    }

    public void MarkReady(bool holdForPayment)
        => ReleaseStatus = holdForPayment ? FileReleaseStatus.PaymentHold : FileReleaseStatus.Ready;

    public void Release(DateTime utcNow) { ReleaseStatus = FileReleaseStatus.Released; ReleasedAt = utcNow; }
    public void Withdraw() => ReleaseStatus = FileReleaseStatus.Withdrawn;
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
