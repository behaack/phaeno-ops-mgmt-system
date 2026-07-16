namespace PhaenoPortal.App.Features.Accounts.DTOs;

using PSeq.Operations.Commercial.Accounts.Domain;

public sealed record SessionDto
{
    public required string State { get; init; }

    public SessionUserDto? User { get; init; }

    public required IReadOnlyList<SessionMembershipDto> Memberships { get; init; }

    public required bool IsPlatformAdmin { get; init; }

    public SessionSelectedOrganizationDto? SelectedOrganization { get; init; }

    public required SessionCapabilitiesDto Capabilities { get; init; }
}

public sealed record SessionUserDto
{
    public required Guid Id { get; init; }

    public required string Email { get; init; }

    public required string FirstName { get; init; }

    public required string LastName { get; init; }

    public required UserAccountStatus Status { get; init; }
}

public sealed record SessionMembershipDto
{
    public required Guid MembershipId { get; init; }

    public required Guid OrganizationId { get; init; }

    public required string OrganizationName { get; init; }

    public required OrganizationKind OrganizationKind { get; init; }

    public required bool IsOrganizationAdmin { get; init; }
}

public sealed record SessionSelectedOrganizationDto
{
    public required Guid OrganizationId { get; init; }

    public required Guid MembershipId { get; init; }

    public required bool IsAvailable { get; init; }
}

public sealed record SessionCapabilitiesDto
{
    public required bool CanInviteUsers { get; init; }

    public required bool CanManageMembers { get; init; }

    public required bool CanChangeMemberRoles { get; init; }

    public required bool CanLeaveOrganization { get; init; }

    public required bool CanManageOrganizations { get; init; }

    public required bool CanManageAllUsers { get; init; }

    public required bool CanDisableUsers { get; init; }

    public required bool CanViewDatasetConfiguration { get; init; }

    public required bool CanManageDatasetDrafts { get; init; }

    public required bool CanPublishDatasets { get; init; }

    public required bool CanProvisionOrganizationData { get; init; }

    public required bool CanViewOrganizationDatasets { get; init; }

    public required bool CanViewLabServiceOrders { get; init; }

    public required bool CanCreateLabServiceRequests { get; init; }

    public required bool CanSubmitLabServiceRequests { get; init; }

    public required bool CanAcceptLabServiceQuotes { get; init; }

    public required bool CanRequestLabServiceCancellation { get; init; }

    public required bool CanViewSampleProgress { get; init; }

    public required bool CanDownloadLabResults { get; init; }

    public required bool CanViewReagentOrders { get; init; }

    public required bool CanCreateReagentOrders { get; init; }

    public required bool CanPlaceReagentOrders { get; init; }

    public required bool CanApproveReagentSubstitutions { get; init; }

    public required bool CanRequestReagentCancellation { get; init; }

    public required bool CanViewDataAssemblyRequests { get; init; }

    public required bool CanCreateDataAssemblyRequests { get; init; }

    public required bool CanSubmitDataAssemblyRequests { get; init; }

    public required bool CanAcceptDataAssemblyQuotes { get; init; }

    public required bool CanRequestDataAssemblyCancellation { get; init; }

    public required bool CanDownloadDataAssemblyOutputs { get; init; }

    public required bool CanViewAllOperationalOrders { get; init; }

    public required bool CanManageOrderConfiguration { get; init; }

    public required bool CanQuoteLabServiceWork { get; init; }

    public required bool CanManageLabOperations { get; init; }

    public required bool CanManageReagentFulfillment { get; init; }

    public required bool CanManageDataAssembly { get; init; }

    public required bool CanManageOrderIntegrations { get; init; }

    public required bool CanViewOrderAudit { get; init; }
}
