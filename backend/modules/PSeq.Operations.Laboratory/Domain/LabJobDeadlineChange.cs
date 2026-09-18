namespace PSeq.Operations.Laboratory.Domain;

public sealed class LabJobDeadlineChange
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public DateTime? PreviousDueAtUtc { get; private set; }
    public DateTime DueAtUtc { get; private set; }
    public string Reason { get; private set; } = null!;
    public Guid ActorUserId { get; private set; }
    public DateTime OccurredAtUtc { get; private set; }
    private LabJobDeadlineChange() { }
    public LabJobDeadlineChange(Guid workId, DateTime? previous, DateTime due, string reason, Guid actor, DateTime now)
    {
        if (workId == Guid.Empty || actor == Guid.Empty || due.Kind != DateTimeKind.Utc || now.Kind != DateTimeKind.Utc)
            throw new ArgumentException("A job, employee and UTC dates are required.");
        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length > 2000)
            throw new ArgumentException("Enter a customer-safe reason of up to 2,000 characters.");
        LabWorkOrderId = workId; PreviousDueAtUtc = previous; DueAtUtc = due;
        Reason = reason.Trim(); ActorUserId = actor; OccurredAtUtc = now;
    }
}
