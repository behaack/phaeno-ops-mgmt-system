namespace PhaenoPortal.App.Features.Accounts.Services;

public sealed class PostmarkOptions
{
    public const string SectionName = "Postmark";

    public string ApiBaseUrl { get; init; } = "https://api.postmarkapp.com";

    public string ServerToken { get; init; } = string.Empty;

    public string FromEmail { get; init; } = string.Empty;

    public string FromName { get; init; } = "Phaeno Portal";

    public string MessageStream { get; init; } = "outbound";

    public string WebhookUsername { get; init; } = string.Empty;

    public string WebhookPassword { get; init; } = string.Empty;

    public string WebhookSecretHeaderName { get; init; } = "X-Phaeno-Postmark-Secret";

    public string WebhookSecret { get; init; } = string.Empty;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ServerToken)
        && !string.IsNullOrWhiteSpace(FromEmail);

    public bool HasWebhookCredentials =>
        (!string.IsNullOrWhiteSpace(WebhookUsername)
            && !string.IsNullOrWhiteSpace(WebhookPassword))
        || (!string.IsNullOrWhiteSpace(WebhookSecretHeaderName)
            && !string.IsNullOrWhiteSpace(WebhookSecret));

    public IReadOnlyList<string> ValidateProduction(string invitationPublicBaseUrl)
    {
        var errors = new List<string>();
        if (!Uri.TryCreate(ApiBaseUrl, UriKind.Absolute, out var apiUri)
            || apiUri.Scheme != Uri.UriSchemeHttps)
            errors.Add("Postmark:ApiBaseUrl must be an absolute HTTPS URL.");
        if (string.IsNullOrWhiteSpace(ServerToken))
            errors.Add("Postmark:ServerToken is required.");
        if (!System.Net.Mail.MailAddress.TryCreate(FromEmail, out _))
            errors.Add("Postmark:FromEmail must be a valid verified sender address.");
        if (!Uri.TryCreate(invitationPublicBaseUrl, UriKind.Absolute, out var portalUri)
            || portalUri.Scheme != Uri.UriSchemeHttps)
            errors.Add("Invitations:PublicBaseUrl must be an absolute HTTPS URL.");
        if (!HasWebhookCredentials)
            errors.Add("Postmark webhook Basic Auth or custom secret-header credentials are required.");
        return errors;
    }
}
