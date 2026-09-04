namespace PhaenoPortal.App.Features.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;

public sealed class LabServiceOrder : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid? SourceRequestId { get; private set; }
    public PortalIntegrationRequest? SourceRequest { get; private set; }
    public string OrderNumber { get; private set; } = null!;
    public string CustomerReference { get; private set; } = null!;
    public string NormalizedJobName { get; private set; } = null!;
    public string? Description { get; private set; }
    public bool HasMixedBiologicalSources { get; private set; }
    public string? SharedBiologicalSource { get; private set; }
    public int RequestedSpecimenCount { get; private set; }
    public string StorageRequirements { get; private set; } = null!;
    public string SafetyDeclaration { get; private set; } = null!;
    public string SubmissionInstructionsSnapshot { get; private set; } = string.Empty;
    public string? PlacementSnapshotJson { get; private set; }
    public decimal? ProposedUnitPrice { get; private set; }
    public string? PriceProposalNote { get; private set; }
    public Guid? PriceProposedByUserId { get; private set; }
    public DateTime? PriceProposedAt { get; private set; }
    public LabServiceOrderStatus Status { get; private set; } = LabServiceOrderStatus.DraftRequest;
    public LabServiceOrderStatus? ResumeStatus { get; private set; }
    public int RequestRevision { get; private set; }
    public Guid? SubmittedByUserId { get; private set; }
    public DateTime? SubmittedAt { get; private set; }
    public Guid? CurrentQuoteId { get; private set; }
    public Guid? AcceptedQuoteId { get; private set; }
    public DateTime? PlacedAt { get; private set; }
    public DateTime? SampleRosterFinalizedAt { get; private set; }
    public Guid? SampleRosterFinalizedByUserId { get; private set; }
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
    public ICollection<LabServiceSourceGroup> SourceGroups { get; } = [];
    public ICollection<LabServiceQuote> Quotes { get; } = [];
    public ICollection<LabServiceRequestRevision> Revisions { get; } = [];

    private LabServiceOrder() { }

    public LabServiceOrder(
        Guid organizationId,
        string orderNumber,
        string? customerReference,
        string? description,
        int requestedSpecimenCount,
        bool hasMixedBiologicalSources,
        string? sharedBiologicalSource,
        string storageRequirements,
        string safetyDeclaration,
        string submissionInstructionsSnapshot,
        Guid? sourceRequestId = null)
    {
        OrganizationId = organizationId;
        SourceRequestId = sourceRequestId;
        OrderNumber = OrderText.Required(orderNumber, nameof(orderNumber), 50);
        CustomerReference = OrderText.Required(customerReference, "Job name", 255);
        NormalizedJobName = NormalizeJobName(CustomerReference);
        Description = OrderText.Optional(description, 2000);
        SetRequestedSpecimenCount(requestedSpecimenCount);
        SetBiologicalSourceProfile(hasMixedBiologicalSources, sharedBiologicalSource);
        StorageRequirements = OrderText.Required(storageRequirements, "Storage requirements", 2000);
        SafetyDeclaration = OrderText.Required(safetyDeclaration, "Safety declaration", 2000);
        SubmissionInstructionsSnapshot = OrderText.Optional(submissionInstructionsSnapshot, 8000) ?? string.Empty;
    }

    public LabServiceOrder(
        Guid organizationId,
        string orderNumber,
        string? customerReference,
        string? description,
        bool hasMixedBiologicalSources,
        string? sharedBiologicalSource,
        string storageRequirements,
        string safetyDeclaration,
        string submissionInstructionsSnapshot)
        : this(organizationId, orderNumber, customerReference, description, 1,
            hasMixedBiologicalSources, sharedBiologicalSource, storageRequirements,
            safetyDeclaration, submissionInstructionsSnapshot) { }

    public static string NormalizeJobName(string? jobName)
        => OrderText.Required(jobName, "Job name", 255).ToUpperInvariant();

    public void UpdateDraft(
        string? customerReference,
        string? description,
        int requestedSpecimenCount,
        bool hasMixedBiologicalSources,
        string? sharedBiologicalSource,
        string storageRequirements,
        string safetyDeclaration)
    {
        EnsureStatus(LabServiceOrderStatus.DraftRequest, LabServiceOrderStatus.ChangesRequested);
        CustomerReference = OrderText.Required(customerReference, "Job name", 255);
        NormalizedJobName = NormalizeJobName(CustomerReference);
        Description = OrderText.Optional(description, 2000);
        SetRequestedSpecimenCount(requestedSpecimenCount);
        SetBiologicalSourceProfile(hasMixedBiologicalSources, sharedBiologicalSource);
        StorageRequirements = OrderText.Required(storageRequirements, "Storage requirements", 2000);
        SafetyDeclaration = OrderText.Required(safetyDeclaration, "Safety declaration", 2000);
    }

    public void UpdatePriceProposal(decimal? proposedUnitPrice, string? proposalNote, Guid actorUserId, DateTime utcNow)
    {
        EnsureStatus(LabServiceOrderStatus.DraftRequest, LabServiceOrderStatus.ChangesRequested);
        if (actorUserId == Guid.Empty) throw new ArgumentException("A price proposer is required.", nameof(actorUserId));
        if (utcNow.Kind != DateTimeKind.Utc) throw new ArgumentException("Price proposal time must be UTC.", nameof(utcNow));

        if (!proposedUnitPrice.HasValue)
        {
            if (!string.IsNullOrWhiteSpace(proposalNote))
                throw new ArgumentException("A pricing note requires a proposed price.", nameof(proposalNote));
            if (!ProposedUnitPrice.HasValue) return;
            ProposedUnitPrice = null;
            PriceProposalNote = null;
            PriceProposedByUserId = null;
            PriceProposedAt = null;
            return;
        }

        var normalizedPrice = decimal.Round(proposedUnitPrice.Value, 2, MidpointRounding.AwayFromZero);
        if (normalizedPrice <= 0 || normalizedPrice != proposedUnitPrice.Value)
            throw new ArgumentOutOfRangeException(nameof(proposedUnitPrice), "Proposed unit price must be greater than zero with no more than two decimal places.");
        var normalizedNote = OrderText.Optional(proposalNote, 1000);
        if (ProposedUnitPrice == normalizedPrice && PriceProposalNote == normalizedNote) return;
        ProposedUnitPrice = normalizedPrice;
        PriceProposalNote = normalizedNote;
        PriceProposedByUserId = actorUserId;
        PriceProposedAt = utcNow;
    }

    public void UpdateDraft(
        string? customerReference,
        string? description,
        bool hasMixedBiologicalSources,
        string? sharedBiologicalSource,
        string storageRequirements,
        string safetyDeclaration)
        => UpdateDraft(customerReference, description, RequestedSpecimenCount == 0 ? 1 : RequestedSpecimenCount,
            hasMixedBiologicalSources, sharedBiologicalSource, storageRequirements, safetyDeclaration);

    public void Submit(Guid actorUserId, DateTime utcNow)
    {
        EnsureStatus(LabServiceOrderStatus.DraftRequest, LabServiceOrderStatus.ChangesRequested);
        if (RequestedSpecimenCount < 1) throw new InvalidOperationException("A requested specimen count is required.");
        if (SourceGroups.Count == 0 || SourceGroups.Sum(group => group.SpecimenCount) != RequestedSpecimenCount)
            throw new InvalidOperationException("Biological-source counts must equal the requested specimen count.");
        if (Samples.Count != 0) throw new InvalidOperationException("Samples cannot be entered before pricing is accepted.");
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

    public void AcceptQuote(Guid quoteId, DateTime utcNow, string placementSnapshotJson)
    {
        EnsureStatus(LabServiceOrderStatus.QuoteIssued);
        if (CurrentQuoteId != quoteId) throw new InvalidOperationException("Only the current quote can be accepted.");
        AcceptedQuoteId = quoteId;
        PlacementSnapshotJson = OrderText.Json(placementSnapshotJson);
        PlacedAt = utcNow;
        SetStatus(LabServiceOrderStatus.PlacedAwaitingSamples, null, null);
    }

    public void AcceptQuote(Guid quoteId, DateTime utcNow)
        => AcceptQuote(quoteId, utcNow, "{}");

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

    public bool CanEditSampleRoster => Status == LabServiceOrderStatus.PlacedAwaitingSamples && !SampleRosterFinalizedAt.HasValue;

    public void EnsureSampleRosterEditable()
    {
        if (!CanEditSampleRoster)
            throw new InvalidOperationException("Samples can be changed only after price acceptance and before the sample list is finalized.");
    }

    public void FinalizeSampleRoster(Guid actorUserId, DateTime utcNow)
    {
        EnsureSampleRosterEditable();
        if (Samples.Count != RequestedSpecimenCount)
            throw new InvalidOperationException($"Enter exactly {RequestedSpecimenCount} samples before finalizing the sample list.");
        var duplicate = Samples.GroupBy(sample => sample.CustomerSampleId.Trim(), StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault(group => group.Count() > 1);
        if (duplicate is not null)
            throw new InvalidOperationException($"Customer sample ID '{duplicate.Key}' is used more than once.");
        if (Samples.Any(sample => sample.Quantity <= 0 || decimal.Truncate(sample.Quantity) != sample.Quantity))
            throw new InvalidOperationException("Every sample must declare a positive whole-number tube count.");
        foreach (var group in SourceGroups)
        {
            var actual = Samples.Count(sample => string.Equals(
                LabServiceSourceGroup.Normalize(sample.BiologicalSource),
                group.NormalizedBiologicalSource,
                StringComparison.Ordinal));
            if (actual != group.SpecimenCount)
                throw new InvalidOperationException(
                    $"Biological source '{group.BiologicalSource}' requires {group.SpecimenCount} samples; {actual} are entered.");
        }
        SampleRosterFinalizedByUserId = actorUserId;
        SampleRosterFinalizedAt = utcNow;
    }

    private void SetBiologicalSourceProfile(bool hasMixedBiologicalSources, string? sharedBiologicalSource)
    {
        HasMixedBiologicalSources = hasMixedBiologicalSources;
        SharedBiologicalSource = hasMixedBiologicalSources
            ? null
            : OrderText.Required(sharedBiologicalSource, "Biological source", 500);
    }

    private void SetRequestedSpecimenCount(int requestedSpecimenCount)
    {
        if (requestedSpecimenCount is < 1 or > 100)
            throw new ArgumentOutOfRangeException(nameof(requestedSpecimenCount), "Requested specimen count must be between 1 and 100.");
        RequestedSpecimenCount = requestedSpecimenCount;
    }

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

public sealed class LabServiceSourceGroup : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabServiceOrderId { get; private set; }
    public string BiologicalSource { get; private set; } = null!;
    public string NormalizedBiologicalSource { get; private set; } = null!;
    public int SpecimenCount { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private LabServiceSourceGroup() { }

    public LabServiceSourceGroup(Guid labServiceOrderId, string biologicalSource, int specimenCount)
    {
        if (labServiceOrderId == Guid.Empty) throw new ArgumentException("A lab-service order is required.", nameof(labServiceOrderId));
        LabServiceOrderId = labServiceOrderId;
        Update(biologicalSource, specimenCount);
    }

    public void Update(string biologicalSource, int specimenCount)
    {
        BiologicalSource = OrderText.Required(biologicalSource, "Biological source", 500);
        NormalizedBiologicalSource = Normalize(BiologicalSource);
        if (specimenCount < 1) throw new ArgumentOutOfRangeException(nameof(specimenCount));
        SpecimenCount = specimenCount;
    }

    public static string Normalize(string value) => OrderText.Required(value, "Biological source", 500).ToUpperInvariant();
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class LabSampleImportPreview : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabServiceOrderId { get; private set; }
    public Guid OrganizationId { get; private set; }
    public Guid ActorUserId { get; private set; }
    public string FileSha256 { get; private set; } = null!;
    public string RowsJson { get; private set; } = "[]";
    public string ErrorsJson { get; private set; } = "[]";
    public int ValidRowCount { get; private set; }
    public int BlankRowCount { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime? ConfirmedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private LabSampleImportPreview() { }

    public LabSampleImportPreview(Guid labServiceOrderId, Guid organizationId, Guid actorUserId,
        string fileSha256, string rowsJson, string errorsJson, int validRowCount, int blankRowCount, DateTime expiresAt)
    {
        if (labServiceOrderId == Guid.Empty || organizationId == Guid.Empty || actorUserId == Guid.Empty)
            throw new ArgumentException("Order, organization, and actor are required.");
        LabServiceOrderId = labServiceOrderId;
        OrganizationId = organizationId;
        ActorUserId = actorUserId;
        FileSha256 = OrderText.Required(fileSha256, nameof(fileSha256), 64);
        RowsJson = OrderText.Json(rowsJson);
        ErrorsJson = OrderText.Json(errorsJson);
        ValidRowCount = validRowCount;
        BlankRowCount = blankRowCount;
        ExpiresAt = expiresAt;
    }

    public void Confirm(DateTime utcNow)
    {
        if (ConfirmedAt.HasValue) throw new InvalidOperationException("This sample import has already been confirmed.");
        if (ExpiresAt <= utcNow) throw new InvalidOperationException("This sample import preview has expired.");
        ConfirmedAt = utcNow;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
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
    {
        if (ReleaseStatus is FileReleaseStatus.Released or FileReleaseStatus.Withdrawn) return;
        ReleaseStatus = holdForPayment ? FileReleaseStatus.PaymentHold : FileReleaseStatus.Ready;
    }

    public bool Release(DateTime utcNow)
    {
        if (ReleaseStatus == FileReleaseStatus.Released) return false;
        if (ReleaseStatus == FileReleaseStatus.Withdrawn)
            throw new InvalidOperationException("A withdrawn result release cannot be released again.");
        if (utcNow.Kind != DateTimeKind.Utc)
            throw new ArgumentException("Release timestamps must use UTC.", nameof(utcNow));
        ReleaseStatus = FileReleaseStatus.Released;
        ReleasedAt = utcNow;
        return true;
    }
    public void Withdraw() => ReleaseStatus = FileReleaseStatus.Withdrawn;
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
