namespace PhaenoPortal.App.Features.Website.Entities;

public sealed class WebContact
{
    public Guid Id { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string OrganizationName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string NormalizedEmail { get; set; } = string.Empty;

    public bool? SendBrochure { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; }
}
