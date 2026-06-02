namespace PhaenoPortal.App.Features.Accounts.Services;

public sealed class InvitationOptions
{
    public const string SectionName = "Invitations";

    public int TokenLifetimeDays { get; init; } = 7;

    public int ResendCooldownMinutes { get; init; } = 5;

    public string PublicBaseUrl { get; init; } = "https://localhost:3000";
}
