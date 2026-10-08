namespace PSeq.Operations.Laboratory.Domain;

public enum LabVendorOutcome { Success, Failure }

// The batch outcome applies to every manifest member except the explicitly recorded exceptions.
public sealed class LabVendorLibraryException
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabNgsSendoutId { get; private set; }
    public Guid LabBatchMemberId { get; private set; }
    public Guid LabVendorResultsVersionId { get; private set; }
    public LabVendorOutcome Outcome { get; private set; }
    public string Reason { get; private set; } = null!;
    private LabVendorLibraryException() { }
    public LabVendorLibraryException(Guid sendoutId, Guid memberId, Guid resultVersionId, LabVendorOutcome outcome, string reason)
    {
        if (sendoutId == Guid.Empty || memberId == Guid.Empty || resultVersionId == Guid.Empty || !Enum.IsDefined(outcome)) throw new ArgumentException("Sendout, member, result version and outcome are required.");
        LabNgsSendoutId = sendoutId;
        LabBatchMemberId = memberId;
        LabVendorResultsVersionId = resultVersionId;
        Outcome = outcome;
        Reason = LabAuditedEntity.Required(reason, nameof(reason), 4000);
    }
}

// A declared storage location is evidence, not a verified sequencing output or a download capability.
public sealed class LabVendorResultReference
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabNgsSendoutId { get; private set; }
    public Guid? LabBatchMemberId { get; private set; }
    public string Label { get; private set; } = null!;
    public string StorageReference { get; private set; } = null!;
    public string? Notes { get; private set; }
    public Guid RecordedByUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    private LabVendorResultReference() { }
    public LabVendorResultReference(Guid id, Guid sendoutId, Guid? memberId, string label, string reference,
        string? notes, Guid actorId, DateTime recordedAtUtc)
    {
        if (id == Guid.Empty || sendoutId == Guid.Empty || actorId == Guid.Empty || memberId == Guid.Empty) throw new ArgumentException("Valid reference, sendout, member and actor identities are required.");
        Id = id;
        LabNgsSendoutId = sendoutId;
        LabBatchMemberId = memberId;
        Label = LabAuditedEntity.Required(label, nameof(label), 255);
        StorageReference = LabAuditedEntity.Required(reference, nameof(reference), 2000);
        if (StorageReference.Contains('?') || StorageReference.Contains('#') ||
            Uri.TryCreate(StorageReference, UriKind.Absolute, out var uri) && !string.IsNullOrEmpty(uri.UserInfo))
            throw new ArgumentException("Use a permanent storage location without credentials, query strings or fragments.");
        Notes = LabAuditedEntity.Optional(notes, 4000);
        RecordedByUserId = actorId;
        RecordedAtUtc = recordedAtUtc;
    }
}
