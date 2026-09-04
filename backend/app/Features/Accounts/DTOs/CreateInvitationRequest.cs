namespace PhaenoPortal.App.Features.Accounts.DTOs;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Domain;

public sealed record CreateInvitationRequest
{
    public required Guid OrganizationId { get; init; }

    public required string FirstName { get; init; }

    public required string LastName { get; init; }

    public required string Email { get; init; }

    public bool IsOrganizationAdmin { get; init; }

    public Guid? CrmContactId { get; init; }

    public IReadOnlyList<DepartmentInvitationAccessRequest> Departments { get; init; } = [];

    public IReadOnlyList<LabRole> LabRoles { get; init; } = [];

    public IReadOnlyList<BusinessRole> BusinessRoles { get; init; } = [];
}
