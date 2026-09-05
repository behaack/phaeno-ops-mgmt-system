namespace PhaenoPortal.App.Features.Website.Entities;

public enum WebNotificationKind { MailingListAlert, TechnicalBrief, DemoRequestAlert }
public enum WebNotificationState { Pending, Processing, Accepted, Failed, Cancelled }

// An intake record and its requested messages are saved in one database transaction.
// Accepted means the email provider accepted the request, not confirmed inbox delivery.
public sealed class WebNotificationDelivery
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? WebContactId { get; set; }
    public Guid? WebOrderId { get; set; }
    public WebNotificationKind Kind { get; set; }
    public WebNotificationState State { get; set; } = WebNotificationState.Pending;
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset NextAttemptAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastAttemptAtUtc { get; set; }
    public DateTimeOffset? AcceptedAtUtc { get; set; }
    public DateTimeOffset? LeaseExpiresAtUtc { get; set; }
    public Guid? LeaseToken { get; set; }
    public int AttemptCount { get; set; }
    public int AttemptsSinceRecovery { get; set; }
    public string? LastError { get; set; }
    public Guid? LastRecoveryByUserId { get; set; }
    public DateTimeOffset? LastRecoveryAtUtc { get; set; }
    public Guid Version { get; set; } = Guid.NewGuid();
}
