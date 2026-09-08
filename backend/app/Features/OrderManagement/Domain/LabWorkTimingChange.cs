namespace PhaenoPortal.App.Features.OrderManagement.Domain;

public sealed class LabWorkTimingChange
{
    public static readonly IReadOnlySet<string> Reasons = new HashSet<string>(StringComparer.Ordinal) {
        "Laboratory scheduling adjustment", "Additional processing or quality review", "Equipment or supply interruption",
        "Specimen or shipping issue", "Customer action required", "Other operational delay" };
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public DateTime PreviousExpectedAtUtc { get; private set; }
    public DateTime ExpectedAtUtc { get; private set; }
    public string Reason { get; private set; } = null!;
    public string? CustomerSafeNote { get; private set; }
    public string? InternalNote { get; private set; }
    public Guid TimingChangedByUserId { get; private set; }
    public DateTime OccurredAtUtc { get; private set; }
    public Guid? NotificationId { get; private set; }
    private LabWorkTimingChange() { }
    public LabWorkTimingChange(Guid workOrderId, DateTime previousAt, DateTime expectedAt, string reason,
        string? customerSafeNote, string? internalNote, Guid actorId, DateTime now, Guid? notificationId)
    {
        if (workOrderId == Guid.Empty || actorId == Guid.Empty || !Reasons.Contains(reason))
            throw new ArgumentException("Choose a controlled timing reason.");
        CustomerSafeNote = Optional(customerSafeNote, 2000);
        InternalNote = Optional(internalNote, 4000);
        if (reason == "Other operational delay" && CustomerSafeNote is null)
            throw new ArgumentException("Other operational delay requires a customer-safe explanation.");
        LabWorkOrderId = workOrderId; PreviousExpectedAtUtc = previousAt; ExpectedAtUtc = expectedAt;
        Reason = reason; TimingChangedByUserId = actorId; OccurredAtUtc = now; NotificationId = notificationId;
    }
    private static string? Optional(string? text, int maximum) => string.IsNullOrWhiteSpace(text) ? null
        : text.Trim().Length > maximum ? throw new ArgumentException($"The note cannot exceed {maximum} characters.") : text.Trim();
}
