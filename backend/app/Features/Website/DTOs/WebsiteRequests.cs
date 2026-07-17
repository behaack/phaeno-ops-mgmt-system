using System.ComponentModel.DataAnnotations;

namespace PhaenoPortal.App.Features.Website.DTOs;

public sealed class WebContactRequest
{
    [Required]
    public required WebContactInput WebContact { get; init; }

    [Required]
    [MaxLength(100)]
    public string RecaptchaAction { get; init; } = string.Empty;

    [Required]
    public string RecaptchaCode { get; init; } = string.Empty;
}

public sealed class WebOrderRequest
{
    [Required]
    public required WebOrderInput WebOrder { get; init; }

    [Required]
    [MaxLength(100)]
    public string RecaptchaAction { get; init; } = string.Empty;

    [Required]
    public string RecaptchaCode { get; init; } = string.Empty;
}

public sealed class WebContactInput
{
    [Required]
    [MaxLength(60)]
    public string FirstName { get; init; } = string.Empty;

    [Required]
    [MaxLength(60)]
    public string LastName { get; init; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string OrganizationName { get; init; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; init; } = string.Empty;

    public bool? SendBrochure { get; init; }
}

public sealed class WebOrderInput
{
    [Required]
    [MaxLength(60)]
    public string FirstName { get; init; } = string.Empty;

    [Required]
    [MaxLength(60)]
    public string LastName { get; init; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string OrganizationName { get; init; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; init; } = string.Empty;

    [Required]
    public string Description { get; init; } = string.Empty;
}
