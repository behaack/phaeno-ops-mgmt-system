namespace PhaenoPortal.App.Features.Website.Entities;

public sealed class WebNotificationProcessingControl
{
    public static readonly Guid SingletonId = Guid.Parse("526a3498-feb3-4a94-a5f2-9277c2bc9c97");
    public static readonly Guid InitialVersion = Guid.Parse("a6d4f4cc-c523-4a08-86f7-5d2bb44a1099");

    public Guid Id { get; set; } = SingletonId;
    public bool IsPaused { get; set; }
    public Guid Version { get; set; } = InitialVersion;
    public DateTimeOffset? UpdatedAtUtc { get; set; }
    public Guid? UpdatedByUserId { get; set; }
    public string? Reason { get; set; }
}
