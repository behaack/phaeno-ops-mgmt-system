namespace PSeq.Operations.Laboratory.Domain;

using PSeq.Operations.Laboratory.Common.Persistence;

public enum LabSpecimenIntakeDisposition
{
    AwaitingReceipt,
    Received,
    Accepted,
    OnHold,
    Rejected,
    Cancelled
}

public sealed class LabSpecimen : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public Guid SubmittedSpecimenId { get; private set; }
    public string? AccessionNumber { get; private set; }
    public DateTime? ReceivedAtUtc { get; private set; }
    public DateTime? AcceptedAtUtc { get; private set; }
    public DateTime? OriginalTargetAtUtc { get; private set; }
    public DateTime? CompletedAtUtc { get; private set; }
    public LabSpecimenIntakeDisposition IntakeDisposition { get; private set; } = LabSpecimenIntakeDisposition.AwaitingReceipt;
    public string? ReceiptCondition { get; private set; }
    public string? IntakeReasonCode { get; private set; }
    public string? CurrentLocation { get; private set; }
    public LabSpecimenProcessingState? ProcessingState { get; private set; }
    public string? ProcessingReasonCode { get; private set; }
    public string? ProcessingNote { get; private set; }
    public Guid? ProcessingOwnerUserId { get; private set; }
    public string? ProcessingNextAction { get; private set; }
    public DateTime? ProcessingUpdatedAtUtc { get; private set; }

    public void RecordProcessingState(LabSpecimenProcessingState state, Guid actorId, DateTime utcNow,
        string? reasonCode = null, string? note = null, string? nextAction = null)
    {
        if (ProcessingState is LabSpecimenProcessingState.Failed or LabSpecimenProcessingState.Succeeded)
            throw new InvalidOperationException("The specimen processing outcome is final.");
        if (state == LabSpecimenProcessingState.Failed && reasonCode != "material_exhausted")
            throw new ArgumentException("Confirm material exhaustion before failing the specimen.");
        if (state is LabSpecimenProcessingState.Failed or LabSpecimenProcessingState.OnHold)
            LabAuditedEntity.Required(note!, "Processing evidence", 4000);
        if (state == LabSpecimenProcessingState.OnHold)
            LabAuditedEntity.Required(nextAction!, "Next action", 2000);
        ProcessingState = state; ProcessingReasonCode = reasonCode;
        ProcessingNote = LabAuditedEntity.Optional(note); ProcessingNextAction = LabAuditedEntity.Optional(nextAction, 2000);
        ProcessingOwnerUserId = actorId; ProcessingUpdatedAtUtc = utcNow;
    }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private LabSpecimen()
    {
    }

    public LabSpecimen(Guid labWorkOrderId, Guid submittedSpecimenId)
    {
        if (labWorkOrderId == Guid.Empty || submittedSpecimenId == Guid.Empty)
        {
            throw new ArgumentException("Work-order and submitted-specimen identifiers must be non-empty.");
        }

        LabWorkOrderId = labWorkOrderId;
        SubmittedSpecimenId = submittedSpecimenId;
    }

    public void RecordReceipt(DateTime receivedAtUtc, string? receiptCondition, string? currentLocation)
    {
        if (IntakeDisposition != LabSpecimenIntakeDisposition.AwaitingReceipt)
        {
            throw new InvalidOperationException("Specimen receipt has already been recorded.");
        }

        ReceivedAtUtc = receivedAtUtc;
        ReceiptCondition = Optional(receiptCondition);
        CurrentLocation = Optional(currentLocation);
        IntakeDisposition = LabSpecimenIntakeDisposition.Received;
    }

    public void AssignAccession(string accessionNumber)
    {
        if (ReceivedAtUtc is null)
        {
            throw new InvalidOperationException("A specimen must be received before accessioning.");
        }

        if (!string.IsNullOrWhiteSpace(AccessionNumber))
        {
            throw new InvalidOperationException("The specimen already has an accession number.");
        }

        AccessionNumber = string.IsNullOrWhiteSpace(accessionNumber)
            ? throw new ArgumentException("An accession number is required.", nameof(accessionNumber))
            : accessionNumber.Trim();
    }

    public void RefreshIntakeFromTubes(IReadOnlyCollection<LabContainer> tubes, DateTime utcNow)
    {
        if (IntakeDisposition == LabSpecimenIntakeDisposition.Cancelled)
            throw new InvalidOperationException("A cancelled specimen cannot receive an intake review.");
        if (ReceivedAtUtc is null || string.IsNullOrWhiteSpace(AccessionNumber))
            throw new InvalidOperationException("Receive and accession the specimen's tube before intake review.");
        if (tubes.Any(tube => tube.LabSpecimenId != Id || tube.LabWorkOrderId != LabWorkOrderId
            || tube.Kind != LabContainerKind.SubmittedSpecimen))
            throw new ArgumentException("Intake must be derived from this specimen's submitted tubes.");
        IntakeDisposition = tubes.Any(tube => tube.IntakeDisposition == LabSpecimenIntakeDisposition.Accepted)
            ? LabSpecimenIntakeDisposition.Accepted
            : tubes.Any(tube => tube.IntakeDisposition == LabSpecimenIntakeDisposition.OnHold)
                ? LabSpecimenIntakeDisposition.OnHold : LabSpecimenIntakeDisposition.Received;
        IntakeReasonCode = null;
        if (IntakeDisposition == LabSpecimenIntakeDisposition.Accepted) AcceptedAtUtc ??= utcNow;
    }

    public void SetOriginalTarget(int maximumTurnaroundDays)
    {
        if (AcceptedAtUtc is null || maximumTurnaroundDays is < 1 or > 365)
            throw new InvalidOperationException("A valid accepted specimen and turnaround range are required.");
        OriginalTargetAtUtc ??= AcceptedAtUtc.Value.AddDays(maximumTurnaroundDays);
    }

    public void Complete(DateTime utcNow)
    {
        if (AcceptedAtUtc.HasValue && IntakeDisposition != LabSpecimenIntakeDisposition.Rejected) CompletedAtUtc ??= utcNow;
    }

    public void CancelBeforeReceipt(string reasonCode)
    {
        if (IntakeDisposition != LabSpecimenIntakeDisposition.AwaitingReceipt)
        {
            throw new InvalidOperationException("Only an unreceived specimen can be cancelled automatically.");
        }

        IntakeDisposition = LabSpecimenIntakeDisposition.Cancelled;
        IntakeReasonCode = string.IsNullOrWhiteSpace(reasonCode)
            ? throw new ArgumentException("A controlled cancellation reason is required.", nameof(reasonCode))
            : reasonCode.Trim();
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId)
    {
        CreatedAt = utcNow;
        CreatedByUserId = actorUserId;
    }

    public void MarkUpdated(DateTime utcNow, Guid? actorUserId)
    {
        UpdatedAt = utcNow;
        UpdatedByUserId = actorUserId;
    }

    public void IncrementVersion() => Version++;

    private static string? Optional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
