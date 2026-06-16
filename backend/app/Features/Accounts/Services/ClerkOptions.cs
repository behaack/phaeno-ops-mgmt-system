namespace PhaenoPortal.App.Features.Accounts.Services;

public sealed class ClerkOptions
{
    public const string SectionName = "Clerk";

    public string ApiBaseUrl { get; init; } = "https://api.clerk.com/v1";

    public string Authority { get; init; } = "";

    public string Audience { get; init; } = "";

    public string PublishableKey { get; init; } = "";

    public string SecretKey { get; init; } = "";

    public bool RequireHttpsMetadata { get; init; } = true;
}
