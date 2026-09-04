namespace PhaenoPortal.App.Features.Accounts.DTOs;

public sealed record DepartmentDto
{
    public required Guid Id { get; init; }
    public required Guid OrganizationId { get; init; }
    public required string Code { get; init; }
    public required string Name { get; init; }
    public string? Description { get; init; }
    public required bool IsDefault { get; init; }
    public required bool IsActive { get; init; }
    public bool? PurchaseOrderRequired { get; init; }
    public string? BillingContactEmail { get; init; }
    public string? NotificationEmail { get; init; }
    public string? ShippingInstructions { get; init; }
    public string? ResultDeliveryInstructions { get; init; }
    public required int ActiveMemberCount { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }
    public required long Version { get; init; }
}

public sealed record UpsertDepartmentRequest(
    string Code,
    string Name,
    string? Description,
    bool? PurchaseOrderRequired,
    string? BillingContactEmail,
    string? NotificationEmail,
    string? ShippingInstructions,
    string? ResultDeliveryInstructions,
    long? Version);

public sealed record ChangeDepartmentLifecycleRequest(long Version);

public sealed record SetDefaultDepartmentRequest(long Version);

public sealed record DepartmentMembershipDto
{
    public required Guid Id { get; init; }
    public required Guid OrganizationMembershipId { get; init; }
    public required Guid UserId { get; init; }
    public required string UserName { get; init; }
    public required string UserEmail { get; init; }
    public required Guid DepartmentId { get; init; }
    public required string DepartmentName { get; init; }
    public required bool IsDepartmentAdmin { get; init; }
    public required bool IsActive { get; init; }
    public required long Version { get; init; }
}

public sealed record UpsertDepartmentMembershipRequest(
    bool IsDepartmentAdmin,
    long? Version);

public sealed record DepartmentInvitationAccessRequest(
    Guid DepartmentId,
    bool IsDepartmentAdmin);
