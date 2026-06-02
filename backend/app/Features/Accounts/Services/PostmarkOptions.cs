namespace PhaenoPortal.App.Features.Accounts.Services;

public sealed class PostmarkOptions
{
    public const string SectionName = "Postmark";

    public string ApiBaseUrl { get; init; } = "https://api.postmarkapp.com";

    public string ServerToken { get; init; } = string.Empty;

    public string FromEmail { get; init; } = string.Empty;

    public string FromName { get; init; } = "Phaeno Portal";

    public string MessageStream { get; init; } = "outbound";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ServerToken)
        && !string.IsNullOrWhiteSpace(FromEmail);
}
