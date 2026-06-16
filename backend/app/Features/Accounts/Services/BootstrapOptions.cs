namespace PhaenoPortal.App.Features.Accounts.Services;

public sealed class BootstrapOptions
{
    public const string SectionName = "Bootstrap";

    public string PhaenoOrganizationName { get; init; } = "Phaeno";

    public string AdminEmail { get; init; } = "";

    public string AdminFirstName { get; init; } = "Phaeno";

    public string AdminLastName { get; init; } = "Admin";

    public string AdminPassword { get; init; } = "";
}
