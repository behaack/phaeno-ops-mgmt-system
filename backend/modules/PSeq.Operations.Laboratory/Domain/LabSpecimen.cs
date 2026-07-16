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
    public LabSpecimenIntakeDisposition IntakeDisposition { get; private set; } = LabSpecimenIntakeDisposition.AwaitingReceipt;
    public string? ReceiptCondition { get; private set; }
    public string? IntakeReasonCode { get; private set; }
    public string? CurrentLocation { get; private set; }
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

    public void RecordIntakeDisposition(LabSpecimenIntakeDisposition disposition, string? reasonCode)
    {
        if (ReceivedAtUtc is null)
        {
            throw new InvalidOperationException("A specimen must be received before intake disposition.");
        }

        if (disposition is LabSpecimenIntakeDisposition.AwaitingReceipt
            or LabSpecimenIntakeDisposition.Received
            or LabSpecimenIntakeDisposition.Cancelled)
        {
            throw new ArgumentOutOfRangeException(nameof(disposition));
        }

        if (string.IsNullOrWhiteSpace(AccessionNumber))
        {
            throw new InvalidOperationException("A specimen must be accessioned before intake disposition.");
        }

        if ((disposition is LabSpecimenIntakeDisposition.OnHold or LabSpecimenIntakeDisposition.Rejected)
            && string.IsNullOrWhiteSpace(reasonCode))
        {
            throw new ArgumentException("A controlled reason code is required for a hold or rejection.", nameof(reasonCode));
        }

        IntakeDisposition = disposition;
        IntakeReasonCode = Optional(reasonCode);
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
