namespace PhaenoPortal.App.Features.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class DataAssemblyRequest : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public string RequestNumber { get; private set; } = null!;
    public string ProjectReference { get; private set; } = null!;
    public Guid AssemblyProfileId { get; private set; }
    public int AssemblyProfileVersion { get; private set; }
    public string ProfileNameSnapshot { get; private set; } = null!;
    public string ProfileInstructionsSnapshot { get; private set; } = null!;
    public string MetadataJson { get; private set; } = "{}";
    public string RequestedOutput { get; private set; } = null!;
    public string? ProcessingNotes { get; private set; }
    public bool ProhibitedDataConfirmed { get; private set; }
    public AssemblyRequestStatus Status { get; private set; } = AssemblyRequestStatus.Draft;
    public AssemblyRequestStatus? ResumeStatus { get; private set; }
    public int InputRevision { get; private set; }
    public Guid? CurrentInputRevisionId { get; private set; }
    public Guid? CurrentQuoteId { get; private set; }
    public Guid? AcceptedQuoteId { get; private set; }
    public string? PurchaseOrderNumber { get; private set; }
    public DateTime? SubmittedAt { get; private set; }
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
    public ICollection<AssemblyInputRevision> InputRevisions { get; } = [];
    public ICollection<DataAssemblyQuote> Quotes { get; } = [];
    public ICollection<AssemblyProcessingRun> ProcessingRuns { get; } = [];
    public ICollection<AssemblyOutputRelease> OutputReleases { get; } = [];

    private DataAssemblyRequest() { }

    public DataAssemblyRequest(
        Guid organizationId,
        string requestNumber,
        string projectReference,
        Guid assemblyProfileId,
        int assemblyProfileVersion,
        string profileNameSnapshot,
        string profileInstructionsSnapshot,
        string metadataJson,
        string requestedOutput,
        string? processingNotes,
        bool prohibitedDataConfirmed)
    {
        OrganizationId = organizationId;
        RequestNumber = OrderText.Required(requestNumber, nameof(requestNumber), 50);
        AssemblyProfileId = assemblyProfileId;
        AssemblyProfileVersion = assemblyProfileVersion;
        ProfileNameSnapshot = OrderText.Required(profileNameSnapshot, nameof(profileNameSnapshot), 255);
        ProfileInstructionsSnapshot = OrderText.Required(profileInstructionsSnapshot, nameof(profileInstructionsSnapshot), 4000);
        UpdateDraft(projectReference, metadataJson, requestedOutput, processingNotes, prohibitedDataConfirmed);
    }

    public void UpdateDraft(
        string projectReference,
        string metadataJson,
        string requestedOutput,
        string? processingNotes,
        bool prohibitedDataConfirmed)
    {
        EnsureStatus(AssemblyRequestStatus.Draft, AssemblyRequestStatus.ChangesRequested);
        ProjectReference = OrderText.Required(projectReference, nameof(projectReference), 255);
        MetadataJson = OrderText.Json(metadataJson);
        RequestedOutput = OrderText.Required(requestedOutput, nameof(requestedOutput), 2000);
        ProcessingNotes = OrderText.Optional(processingNotes, 4000);
        ProhibitedDataConfirmed = prohibitedDataConfirmed;
    }

    public void Submit(Guid inputRevisionId, DateTime utcNow)
    {
        EnsureStatus(AssemblyRequestStatus.Draft, AssemblyRequestStatus.ChangesRequested);
        if (!ProhibitedDataConfirmed) throw new InvalidOperationException("The prohibited-data confirmation is required.");
        InputRevision++;
        CurrentInputRevisionId = inputRevisionId;
        SubmittedAt = utcNow;
        SetStatus(AssemblyRequestStatus.Submitted, null, null);
    }

    public void BeginIntakeValidation() => Transition(AssemblyRequestStatus.Submitted, AssemblyRequestStatus.IntakeValidation);

    public void RequestChanges(string reason, string? internalNote)
    {
        EnsureStatus(AssemblyRequestStatus.IntakeValidation, AssemblyRequestStatus.QuoteInPreparation);
        SetStatus(AssemblyRequestStatus.ChangesRequested, reason, internalNote);
    }

    public void BeginQuotePreparation() => Transition(AssemblyRequestStatus.IntakeValidation, AssemblyRequestStatus.QuoteInPreparation);

    public void MarkQuoteIssued(Guid quoteId)
    {
        EnsureStatus(AssemblyRequestStatus.QuoteInPreparation, AssemblyRequestStatus.QuoteIssued);
        CurrentQuoteId = quoteId;
        SetStatus(AssemblyRequestStatus.QuoteIssued, null, null);
    }

    public void AcceptQuote(Guid quoteId, string purchaseOrderNumber, DateTime utcNow)
    {
        EnsureStatus(AssemblyRequestStatus.QuoteIssued);
        if (CurrentQuoteId != quoteId) throw new InvalidOperationException("Only the current quote can be accepted.");
        PurchaseOrderNumber = OrderText.Required(purchaseOrderNumber, nameof(purchaseOrderNumber), 255);
        AcceptedQuoteId = quoteId;
        PlacedAt = utcNow;
        SetStatus(AssemblyRequestStatus.PlacedQueued, null, null);
    }

    public void StartProcessing() => Transition(AssemblyRequestStatus.PlacedQueued, AssemblyRequestStatus.Processing);
    public void BeginOutputReview() => Transition(AssemblyRequestStatus.Processing, AssemblyRequestStatus.OutputReview);
    public void MarkOutputAvailable() => Transition(AssemblyRequestStatus.OutputReview, AssemblyRequestStatus.OutputAvailable);

    public void Complete(DateTime utcNow)
    {
        EnsureStatus(AssemblyRequestStatus.OutputAvailable);
        CompletedAt = utcNow;
        SetStatus(AssemblyRequestStatus.Completed, null, null);
    }

    public void PutOnHold(string reason, string? internalNote)
    {
        if (IsTerminal() || Status == AssemblyRequestStatus.OnHold) throw new InvalidOperationException("This assembly request cannot be held.");
        ResumeStatus = Status;
        SetStatus(AssemblyRequestStatus.OnHold, reason, internalNote);
    }

    public void ReleaseHold(string reason, string? internalNote)
    {
        EnsureStatus(AssemblyRequestStatus.OnHold);
        var resume = ResumeStatus ?? AssemblyRequestStatus.IntakeValidation;
        ResumeStatus = null;
        SetStatus(resume, reason, internalNote);
    }

    public void RequestCancellation()
    {
        EnsureStatus(AssemblyRequestStatus.PlacedQueued, AssemblyRequestStatus.Processing, AssemblyRequestStatus.OutputReview, AssemblyRequestStatus.OutputAvailable, AssemblyRequestStatus.OnHold);
        ResumeStatus = Status;
        SetStatus(AssemblyRequestStatus.CancellationRequested, null, null);
    }

    public void ResolveCancellation(bool cancelled, string reason, string? internalNote)
    {
        EnsureStatus(AssemblyRequestStatus.CancellationRequested);
        if (cancelled)
        {
            SetStatus(AssemblyRequestStatus.Cancelled, reason, internalNote);
            ResumeStatus = null;
            return;
        }
        var resume = ResumeStatus ?? AssemblyRequestStatus.Processing;
        ResumeStatus = null;
        SetStatus(resume, reason, internalNote);
    }

    public void Withdraw(string reason)
    {
        EnsureStatus(AssemblyRequestStatus.Draft, AssemblyRequestStatus.Submitted, AssemblyRequestStatus.IntakeValidation,
            AssemblyRequestStatus.ChangesRequested, AssemblyRequestStatus.QuoteInPreparation, AssemblyRequestStatus.QuoteIssued);
        SetStatus(AssemblyRequestStatus.Cancelled, reason, null);
    }

    public void Reject(string reason, string? internalNote)
    {
        EnsureStatus(AssemblyRequestStatus.IntakeValidation, AssemblyRequestStatus.QuoteInPreparation, AssemblyRequestStatus.OnHold);
        SetStatus(AssemblyRequestStatus.Rejected, reason, internalNote);
    }

    public void DiscardDraft() { EnsureStatus(AssemblyRequestStatus.Draft); IsDiscarded = true; }
    public void Assign(Guid? userId, DateTime? dueAt) { AssignedToUserId = userId; DueAt = userId.HasValue ? dueAt : null; }
    public bool IsTerminal() => Status is AssemblyRequestStatus.Completed or AssemblyRequestStatus.Cancelled or AssemblyRequestStatus.Rejected;
    private void Transition(AssemblyRequestStatus from, AssemblyRequestStatus to) { EnsureStatus(from); SetStatus(to, null, null); }
    private void SetStatus(AssemblyRequestStatus status, string? reason, string? internalNote) { Status = status; TenantSafeReason = OrderText.Optional(reason, 2000); InternalNote = OrderText.Optional(internalNote, 4000); }
    private void EnsureStatus(params AssemblyRequestStatus[] allowed) { if (!allowed.Contains(Status)) throw new InvalidOperationException($"Assembly request cannot transition from {Status}."); }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class AssemblyInputRevision
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid DataAssemblyRequestId { get; private set; }
    public int Revision { get; private set; }
    public Guid? PreviousRevisionId { get; private set; }
    public string ManifestJson { get; private set; } = "{}";
    public string? CorrectionReason { get; private set; }
    public string ValidationSummaryJson { get; private set; } = "{}";
    public Guid SubmittedByUserId { get; private set; }
    public DateTime SubmittedAt { get; private set; }

    private AssemblyInputRevision() { }
    public AssemblyInputRevision(Guid requestId, int revision, Guid? previousRevisionId, string manifestJson, string? correctionReason, string validationSummaryJson, Guid actorUserId, DateTime submittedAt)
    {
        if (revision <= 0) throw new ArgumentOutOfRangeException(nameof(revision));
        DataAssemblyRequestId = requestId;
        Revision = revision;
        PreviousRevisionId = previousRevisionId;
        ManifestJson = OrderText.Json(manifestJson);
        CorrectionReason = OrderText.Optional(correctionReason, 2000);
        ValidationSummaryJson = OrderText.Json(validationSummaryJson);
        SubmittedByUserId = actorUserId;
        SubmittedAt = submittedAt;
    }
}

public sealed class AssemblyProcessingRun : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid DataAssemblyRequestId { get; private set; }
    public Guid InputRevisionId { get; private set; }
    public int RunNumber { get; private set; }
    public string ProfileVersion { get; private set; } = null!;
    public string PipelineVersion { get; private set; } = null!;
    public string Provenance { get; private set; } = null!;
    public string? QcStatus { get; private set; }
    public DateTime StartedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public string? FailureReason { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private AssemblyProcessingRun() { }
    public AssemblyProcessingRun(Guid requestId, Guid inputRevisionId, int runNumber, string profileVersion, string pipelineVersion, string provenance, DateTime startedAt)
    {
        DataAssemblyRequestId = requestId;
        InputRevisionId = inputRevisionId;
        if (runNumber <= 0) throw new ArgumentOutOfRangeException(nameof(runNumber));
        RunNumber = runNumber;
        ProfileVersion = OrderText.Required(profileVersion, nameof(profileVersion), 255);
        PipelineVersion = OrderText.Required(pipelineVersion, nameof(pipelineVersion), 255);
        Provenance = OrderText.Required(provenance, nameof(provenance), 4000);
        StartedAt = startedAt;
    }
    public void Complete(string qcStatus, DateTime utcNow) { QcStatus = OrderText.Required(qcStatus, nameof(qcStatus), 500); CompletedAt = utcNow; FailureReason = null; }
    public void Fail(string reason, DateTime utcNow) { FailureReason = OrderText.Required(reason, nameof(reason), 2000); CompletedAt = utcNow; }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class AssemblyOutputRelease : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid DataAssemblyRequestId { get; private set; }
    public Guid InputRevisionId { get; private set; }
    public Guid ProcessingRunId { get; private set; }
    public int ReleaseVersion { get; private set; }
    public string ManifestJson { get; private set; } = "{}";
    public string PipelineVersion { get; private set; } = null!;
    public string Provenance { get; private set; } = null!;
    public string QcStatus { get; private set; } = null!;
    public FileReleaseStatus ReleaseStatus { get; private set; } = FileReleaseStatus.Internal;
    public DateTime GeneratedAt { get; private set; }
    public DateTime? ReleasedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private AssemblyOutputRelease() { }
    public AssemblyOutputRelease(Guid organizationId, Guid requestId, Guid inputRevisionId, Guid processingRunId, int releaseVersion, string manifestJson, string pipelineVersion, string provenance, string qcStatus, DateTime generatedAt)
    {
        if (releaseVersion <= 0) throw new ArgumentOutOfRangeException(nameof(releaseVersion));
        OrganizationId = organizationId;
        DataAssemblyRequestId = requestId;
        InputRevisionId = inputRevisionId;
        ProcessingRunId = processingRunId;
        ReleaseVersion = releaseVersion;
        ManifestJson = OrderText.Json(manifestJson);
        PipelineVersion = OrderText.Required(pipelineVersion, nameof(pipelineVersion), 255);
        Provenance = OrderText.Required(provenance, nameof(provenance), 4000);
        QcStatus = OrderText.Required(qcStatus, nameof(qcStatus), 500);
        GeneratedAt = generatedAt;
    }
    public void MarkReady(bool holdForPayment) => ReleaseStatus = holdForPayment ? FileReleaseStatus.PaymentHold : FileReleaseStatus.Ready;
    public void Release(DateTime utcNow) { ReleaseStatus = FileReleaseStatus.Released; ReleasedAt = utcNow; }
    public void Withdraw() => ReleaseStatus = FileReleaseStatus.Withdrawn;
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
