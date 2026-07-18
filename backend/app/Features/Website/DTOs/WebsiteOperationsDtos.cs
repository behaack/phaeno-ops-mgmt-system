namespace PhaenoPortal.App.Features.Website.DTOs;

public sealed record WebOpsDashboardDto(
    int MailingListCount,
    int DemoRequestCount,
    IReadOnlyList<WebOpsMailingListContactDto> MailingListContacts,
    IReadOnlyList<WebOpsDemoRequestDto> DemoRequests);

public sealed record WebOpsMailingListContactDto(
    Guid Id,
    string FirstName,
    string LastName,
    string OrganizationName,
    string Email,
    bool TechnicalBriefRequested,
    DateTimeOffset CreatedAtUtc);

public sealed record WebOpsDemoRequestDto(
    Guid Id,
    string FirstName,
    string LastName,
    string OrganizationName,
    string Email,
    string Description);
