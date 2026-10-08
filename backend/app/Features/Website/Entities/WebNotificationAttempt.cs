namespace PhaenoPortal.App.Features.Website.Entities;

public sealed class WebNotificationAttempt
{
    public Guid Id { get; set; }
    public Guid WebNotificationDeliveryId { get; set; }
    public int AttemptNumber { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset? FinishedAtUtc { get; set; }
    public string Outcome { get; set; } = "Processing";
    public string? Error { get; set; }
    public Guid? RecoveryByUserId { get; set; }
}
