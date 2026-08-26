namespace PhaenoPortal.App.Features.Crm.DTOs;

using PSeq.Operations.Commercial.Crm.Domain;

public sealed record CrmCompanyDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public string? WebsiteUrl { get; init; }
    public string? DomainName { get; init; }
    public string? Phone { get; init; }
    public string? Industry { get; init; }
    public string? Description { get; init; }
    public string? AddressLine1 { get; init; }
    public string? AddressLine2 { get; init; }
    public string? City { get; init; }
    public string? Region { get; init; }
    public string? PostalCode { get; init; }
    public string? CountryCode { get; init; }
    public int? EmployeeCount { get; init; }
    public required CrmCompanyLifecycleState LifecycleState { get; init; }
    public string? Source { get; init; }
    public required IReadOnlyList<string> Tags { get; init; }
    public required IReadOnlyList<string> Aliases { get; init; }
    public Guid? MergedIntoCompanyId { get; init; }
    public required Guid OwnerUserId { get; init; }
    public required string OwnerName { get; init; }
    public required bool IsActive { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }
    public required long Version { get; init; }
}

public sealed record CrmCompanyListDto
{
    public required IReadOnlyList<CrmCompanyDto> Items { get; init; }
    public required int Page { get; init; }
    public required int PageSize { get; init; }
    public required int TotalCount { get; init; }
}

public sealed record CrmPageDto<T>
{
    public required IReadOnlyList<T> Items { get; init; }
    public required int Page { get; init; }
    public required int PageSize { get; init; }
    public required int TotalCount { get; init; }
}

public sealed record CreateCrmCompanyRequest
{
    public required string Name { get; init; }
    public string? WebsiteUrl { get; init; }
    public string? DomainName { get; init; }
    public string? Phone { get; init; }
    public string? Industry { get; init; }
    public string? Description { get; init; }
    public string? AddressLine1 { get; init; }
    public string? AddressLine2 { get; init; }
    public string? City { get; init; }
    public string? Region { get; init; }
    public string? PostalCode { get; init; }
    public string? CountryCode { get; init; }
    public int? EmployeeCount { get; init; }
    public CrmCompanyLifecycleState LifecycleState { get; init; } = CrmCompanyLifecycleState.Target;
    public string? Source { get; init; }
    public IReadOnlyList<string> Tags { get; init; } = [];
}

public sealed record UpdateCrmCompanyRequest
{
    public required string Name { get; init; }
    public string? WebsiteUrl { get; init; }
    public string? DomainName { get; init; }
    public string? Phone { get; init; }
    public string? Industry { get; init; }
    public string? Description { get; init; }
    public string? AddressLine1 { get; init; }
    public string? AddressLine2 { get; init; }
    public string? City { get; init; }
    public string? Region { get; init; }
    public string? PostalCode { get; init; }
    public string? CountryCode { get; init; }
    public int? EmployeeCount { get; init; }
    public CrmCompanyLifecycleState LifecycleState { get; init; } = CrmCompanyLifecycleState.Target;
    public string? Source { get; init; }
    public IReadOnlyList<string> Tags { get; init; } = [];
    public required long Version { get; init; }
}

public sealed record ChangeCrmCompanyActiveRequest
{
    public required long Version { get; init; }
}

public sealed record AssignCrmOwnerRequest
{
    public required Guid OwnerUserId { get; init; }
    public required long Version { get; init; }
}

public sealed record MergeCrmRecordRequest
{
    public required Guid TargetId { get; init; }
    public required string Reason { get; init; }
    public required long Version { get; init; }
}
