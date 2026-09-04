namespace PhaenoPortal.App.Features.Crm.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Crm.DTOs;
using PhaenoPortal.App.Features.Crm.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using static PhaenoPortal.App.Features.Crm.Services.CrmAccess;

[ApiController]
[Authorize]
[Route("api/platform/crm/companies/{companyId:guid}/people")]
public sealed class CrmCompanyPeopleController(
    PSeqOperationsDbContext dbContext,
    IExternalIdentityContext externalIdentityContext) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<CrmCompanyPersonDto>> List(
        Guid companyId,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(HttpContext, dbContext, externalIdentityContext, cancellationToken);
        var company = await dbContext.CrmCompanies.AsNoTracking()
            .SingleOrDefaultAsync(value => value.Id == companyId, cancellationToken)
            ?? throw NotFound("crm_company_not_found", "The CRM company was not found.");

        var associations = await dbContext.CrmCompanyContacts.AsNoTracking()
            .Include(value => value.Contact)
            .Where(value => value.CompanyId == companyId)
            .OrderByDescending(value => value.IsActive)
            .ThenByDescending(value => value.IsPrimaryCompany)
            .ThenBy(value => value.Contact.LastName)
            .ThenBy(value => value.Contact.FirstName)
            .ToListAsync(cancellationToken);
        // Historical associations stay in CRM history, not as duplicate people.
        associations = associations.GroupBy(value => value.ContactId)
            .Select(group => group.OrderByDescending(value => value.IsActive)
                .ThenByDescending(value => value.UpdatedAt).First()).ToList();
        var contactIds = associations.Select(value => value.ContactId).Distinct().ToArray();
        var links = await dbContext.CrmContactUserLinks.AsNoTracking()
            .Where(value => value.IsActive && contactIds.Contains(value.ContactId))
            .ToListAsync(cancellationToken);

        var memberships = company.AccessOrganizationId.HasValue
            ? await dbContext.OrganizationMemberships.AsNoTracking()
                .Include(value => value.User)
                .Include(value => value.DepartmentMemberships)
                .ThenInclude(value => value.Department)
                .Where(value => value.OrganizationId == company.AccessOrganizationId.Value)
                .ToListAsync(cancellationToken)
            : [];
        var usersById = memberships
            .Where(value => value.User is not null)
            .ToDictionary(value => value.UserId, value => value);
        var linkedUserIds = links.Select(value => value.UserId).ToHashSet();

        var invitations = company.AccessOrganizationId.HasValue
            ? await dbContext.OrganizationInvitations.AsNoTracking()
                .Where(value => value.OrganizationId == company.AccessOrganizationId.Value
                    && value.Status == InvitationStatus.Pending)
                .OrderByDescending(value => value.CreatedAt)
                .ToListAsync(cancellationToken)
            : [];
        var invitationIds = invitations.Select(value => value.Id).ToArray();
        var invitationDepartments = await dbContext.OrganizationInvitationDepartments.AsNoTracking()
            .Include(value => value.Department)
            .Where(value => invitationIds.Contains(value.OrganizationInvitationId))
            .ToListAsync(cancellationToken);
        var invitationDepartmentLookup = invitationDepartments
            .GroupBy(value => value.OrganizationInvitationId)
            .ToDictionary(value => value.Key, value => (IReadOnlyList<CrmPersonDepartmentAccessDto>)value
                .OrderByDescending(item => item.Department.IsDefault)
                .ThenBy(item => item.Department.Name)
                .Select(item => new CrmPersonDepartmentAccessDto(
                    item.DepartmentId,
                    item.Department.Name,
                    item.IsDepartmentAdmin,
                    item.Department.IsActive))
                .ToList());

        var people = new List<CrmCompanyPersonDto>();
        foreach (var association in associations)
        {
            var contact = association.Contact;
            var link = links.SingleOrDefault(value => value.ContactId == contact.Id);
            usersById.TryGetValue(link?.UserId ?? Guid.Empty, out var membership);
            var linkedInvitation = invitations.FirstOrDefault(value => value.CrmContactId == contact.Id);
            var suggestedMembership = link is null && contact.NormalizedEmail is not null
                ? memberships.SingleOrDefault(value => value.User?.NormalizedEmail == contact.NormalizedEmail)
                : null;
            var suggestedInvitation = link is null && linkedInvitation is null && contact.NormalizedEmail is not null
                ? invitations.FirstOrDefault(value => value.NormalizedEmail == contact.NormalizedEmail)
                : null;
            people.Add(new CrmCompanyPersonDto(
                "Contact",
                association.Id,
                contact.Id,
                contact.Version,
                membership?.UserId,
                membership?.Id,
                linkedInvitation?.Id,
                link?.Id,
                link?.Version,
                contact.DisplayName,
                contact.FirstName,
                contact.LastName,
                contact.Email,
                association.JobTitle,
                association.RelationshipRole,
                association.IsPrimaryCompany,
                contact.IsActive && association.IsActive,
                PortalAccessState(membership, linkedInvitation),
                membership?.IsOrganizationAdmin ?? linkedInvitation?.IsOrganizationAdmin ?? false,
                DepartmentAccess(membership, invitationDepartmentLookup.GetValueOrDefault(linkedInvitation?.Id ?? Guid.Empty, [])),
                suggestedMembership?.UserId,
                suggestedInvitation?.Id,
                suggestedMembership is not null || suggestedInvitation is not null));
        }

        foreach (var membership in memberships.Where(value => !linkedUserIds.Contains(value.UserId)))
        {
            var user = membership.User!;
            people.Add(new CrmCompanyPersonDto(
                "PortalUser",
                null,
                null,
                null,
                user.Id,
                membership.Id,
                null,
                null,
                null,
                $"{user.FirstName} {user.LastName}".Trim(),
                user.FirstName,
                user.LastName,
                user.Email,
                null,
                null,
                false,
                false,
                PortalAccessState(membership, null),
                membership.IsOrganizationAdmin,
                DepartmentAccess(membership, []),
                null,
                null,
                true));
        }

        var attachedInvitationIds = people.Where(value => value.InvitationId.HasValue)
            .Select(value => value.InvitationId!.Value)
            .ToHashSet();
        foreach (var invitation in invitations.Where(value => !attachedInvitationIds.Contains(value.Id)))
        {
            people.Add(new CrmCompanyPersonDto(
                "Invitation",
                null,
                null,
                null,
                null,
                null,
                invitation.Id,
                null,
                null,
                $"{invitation.FirstName} {invitation.LastName}".Trim(),
                invitation.FirstName,
                invitation.LastName,
                invitation.Email,
                null,
                null,
                false,
                false,
                invitation.IsExpired(DateTime.UtcNow) ? "InvitationExpired" : "InvitationPending",
                invitation.IsOrganizationAdmin,
                invitationDepartmentLookup.GetValueOrDefault(invitation.Id, []),
                null,
                null,
                true));
        }

        return people
            .OrderByDescending(value => value.IsPrimaryCompany)
            .ThenBy(value => value.DisplayName)
            .ThenBy(value => value.RecordKind)
            .ToList();
    }

    [HttpPost("{contactId:guid}/link")]
    public async Task<CrmCompanyPersonDto> Link(
        Guid companyId,
        Guid contactId,
        [FromBody] LinkCrmContactUserRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(HttpContext, dbContext, externalIdentityContext, cancellationToken);
        var company = await RequireCompany(companyId, cancellationToken);
        if (!company.AccessOrganizationId.HasValue)
        {
            throw Conflict("crm_portal_access_required", "Enable Company Portal access before linking a Portal user.");
        }

        var contact = await dbContext.CrmContacts.SingleOrDefaultAsync(value => value.Id == contactId, cancellationToken)
            ?? throw NotFound("crm_contact_not_found", "The CRM Contact was not found.");
        EnsureVersion(contact.Version, request.ContactVersion);
        var isAssociated = await dbContext.CrmCompanyContacts.AsNoTracking().AnyAsync(value =>
            value.CompanyId == companyId && value.ContactId == contactId && value.IsActive, cancellationToken);
        if (!contact.IsActive || !company.IsActive || !isAssociated)
        {
            throw Conflict("crm_contact_company_required", "The Contact must have an active association with this Company.");
        }

        var membership = await dbContext.OrganizationMemberships
            .Include(value => value.User)
            .Include(value => value.DepartmentMemberships).ThenInclude(value => value.Department)
            .SingleOrDefaultAsync(value => value.UserId == request.UserId
                && value.OrganizationId == company.AccessOrganizationId.Value, cancellationToken)
            ?? throw NotFound("crm_portal_user_not_found", "The Portal user is not a member of this Company's access scope.");
        var conflictingLink = await dbContext.CrmContactUserLinks.AnyAsync(value => value.IsActive
            && (value.ContactId == contactId || value.UserId == request.UserId), cancellationToken);
        if (conflictingLink)
        {
            throw Conflict("crm_identity_link_conflict", "The Contact or Portal user already has an active identity link.");
        }

        var link = await dbContext.CrmContactUserLinks
            .Where(value => value.ContactId == contactId && value.UserId == request.UserId)
            .OrderByDescending(value => value.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (link is null)
        {
            link = Execute(() => new CrmContactUserLink(contactId, request.UserId, request.Reason));
            dbContext.CrmContactUserLinks.Add(link);
        }
        else
        {
            Execute(() => link.Reactivate(request.Reason));
        }

        AccountAudit.Add(dbContext, HttpContext, nameof(CrmContactUserLink), link.Id,
            AccountAudit.ContactUserLinked, company.AccessOrganizationId, actor.Id,
            new { ContactId = contactId, UserId = request.UserId, request.Reason });
        await dbContext.SaveChangesAsync(cancellationToken);
        return PersonForLinked(contact, membership, link);
    }

    [HttpPost("links/{linkId:guid}/deactivate")]
    public async Task<IActionResult> Unlink(
        Guid companyId,
        Guid linkId,
        [FromBody] UnlinkCrmContactUserRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(HttpContext, dbContext, externalIdentityContext, cancellationToken);
        var company = await RequireCompany(companyId, cancellationToken);
        var link = await dbContext.CrmContactUserLinks
            .Include(value => value.Contact)
            .Include(value => value.User)
            .SingleOrDefaultAsync(value => value.Id == linkId, cancellationToken)
            ?? throw NotFound("crm_identity_link_not_found", "The Contact/User identity link was not found.");
        EnsureVersion(link.Version, request.Version);
        var linkBelongsToCompany = await dbContext.CrmCompanyContacts.AsNoTracking().AnyAsync(value =>
            value.CompanyId == companyId && value.ContactId == link.ContactId, cancellationToken);
        var userBelongsToAccessScope = company.AccessOrganizationId.HasValue
            && await dbContext.OrganizationMemberships.AsNoTracking().AnyAsync(value =>
                value.OrganizationId == company.AccessOrganizationId.Value && value.UserId == link.UserId, cancellationToken);
        if (!linkBelongsToCompany || !userBelongsToAccessScope)
        {
            throw NotFound("crm_identity_link_not_found", "The Contact/User identity link was not found.");
        }

        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length > 500)
        {
            throw Conflict("crm_identity_link_reason_required", "Explain why this identity link is being removed.");
        }

        link.Deactivate();
        AccountAudit.Add(dbContext, HttpContext, nameof(CrmContactUserLink), link.Id,
            AccountAudit.ContactUserUnlinked, company.AccessOrganizationId, actor.Id,
            new { link.ContactId, link.UserId, Reason = request.Reason.Trim() });
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<CrmCompany> RequireCompany(Guid companyId, CancellationToken cancellationToken) =>
        await dbContext.CrmCompanies.SingleOrDefaultAsync(value => value.Id == companyId, cancellationToken)
        ?? throw NotFound("crm_company_not_found", "The CRM company was not found.");

    private static string PortalAccessState(
        OrganizationMembership? membership,
        OrganizationInvitation? invitation)
    {
        if (membership is not null)
        {
            if (membership.User?.Status == UserAccountStatus.Disabled || membership.User?.IsActive != true)
            {
                return "UserDisabled";
            }

            return membership.IsActive ? "Active" : "MembershipInactive";
        }

        if (invitation is not null)
        {
            return invitation.IsExpired(DateTime.UtcNow) ? "InvitationExpired" : "InvitationPending";
        }

        return "NotInvited";
    }

    private static IReadOnlyList<CrmPersonDepartmentAccessDto> DepartmentAccess(
        OrganizationMembership? membership,
        IReadOnlyList<CrmPersonDepartmentAccessDto> invitationDepartments)
    {
        if (membership is null)
        {
            return invitationDepartments;
        }

        return membership.DepartmentMemberships
            .OrderByDescending(value => value.Department.IsDefault)
            .ThenBy(value => value.Department.Name)
            .Select(value => new CrmPersonDepartmentAccessDto(
                value.DepartmentId,
                value.Department.Name,
                value.IsDepartmentAdmin,
                value.IsActive && value.Department.IsActive))
            .ToList();
    }

    private static CrmCompanyPersonDto PersonForLinked(
        CrmContact contact,
        OrganizationMembership membership,
        CrmContactUserLink link) => new(
            "Contact",
            null,
            contact.Id,
            contact.Version,
            membership.UserId,
            membership.Id,
            null,
            link.Id,
            link.Version,
            contact.DisplayName,
            contact.FirstName,
            contact.LastName,
            contact.Email,
            null,
            null,
            false,
            contact.IsActive,
            PortalAccessState(membership, null),
            membership.IsOrganizationAdmin,
            DepartmentAccess(membership, []),
            null,
            null,
            false);

    private static CrmException NotFound(string code, string message) => CrmAccess.NotFound(code, message);
    private static CrmException Conflict(string code, string message) => CrmAccess.Conflict(code, message);
}
