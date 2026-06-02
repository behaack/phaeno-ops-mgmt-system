namespace PhaenoPortal.App.Features.Accounts.Services;

public sealed class ClerkOptions
{
    public const string SectionName = "Clerk";

    public string Authority { get; init; } = "";

    public string Audience { get; init; } = "";

    public bool RequireHttpsMetadata { get; init; } = true;
}
