namespace PhaenoPortal.App.Features.Accounts.Endpoints;

using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Application;
using PhaenoPortal.App.Common.Exceptions.Accounts;
using PhaenoPortal.App.Common.Exceptions.Conflict;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

public static class InvitationEndpoints
{
    public static async Task<IResult> CreateInvitation(
        [FromBody] CreateInvitationRequest request,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        InvitationTokenService tokenService,
        IInvitationEmailSender emailSender,
        IInvitationDeliveryPayloadProtector deliveryPayloadProtector,
        IExternalIdentityContext externalIdentityContext,
        IOptions<InvitationOptions> invitationOptions,
        IOptions<PSeqOrderToCashOptions> orderToCashOptions,
        CancellationToken cancellationToken)
    {
        var utcNow = DateTime.UtcNow;
        var options = invitationOptions.Value;
        var organization = await dbContext.Organizations.FindAsync([request.OrganizationId], cancellationToken);
        if (organization == null)
        {
            throw new OrganizationNotFoundException(request.OrganizationId);
        }

        if (!organization.IsActive)
        {
            throw new BadRequestException("Cannot invite users to an inactive organization.");
        }

        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
        if (actor == null)
        {
            return TypedResults.Forbid();
        }

        if (!AccountAuthorization.CanInviteToOrganization(actor, organization.Id, organization.Kind))
        {
            return TypedResults.Forbid();
        }

        var firstName = request.FirstName.Trim();
        var lastName = request.LastName.Trim();
        if (firstName.Length is 0 or > 100 || lastName.Length is 0 or > 100)
        {
            throw new BadRequestException(
                "First and last name are required and cannot exceed 100 characters.");
        }

        var intendedLabRoles = request.LabRoles.Distinct().ToArray();
        if (intendedLabRoles.Length != request.LabRoles.Count)
        {
            throw new BadRequestException("A laboratory role cannot appear more than once.");
        }

        var intendedBusinessRoles = request.BusinessRoles.Distinct().ToArray();
        if (intendedBusinessRoles.Length != request.BusinessRoles.Count)
        {
            throw new BadRequestException("A business role cannot appear more than once.");
        }

        if (!organization.IsPhaeno() && intendedLabRoles.Length > 0)
        {
            throw new BadRequestException(
                "Laboratory roles can be assigned only through a Phaeno organization invitation.");
        }

        if (!organization.IsPhaeno() && intendedBusinessRoles.Length > 0)
        {
            throw new BadRequestException(
                "Business roles can be assigned only through a Phaeno organization invitation.");
        }

        if (organization.IsPhaeno()
            && !request.IsOrganizationAdmin
            && intendedLabRoles.Length == 0
            && intendedBusinessRoles.Length == 0)
        {
            throw new BadRequestException(
                "A Phaeno invitation requires at least one platform, laboratory, or business role.");
        }

        var duplicateDepartmentIntent = request.Departments
            .GroupBy(value => value.DepartmentId)
            .Any(group => group.Count() > 1);
        if (duplicateDepartmentIntent)
        {
            throw new BadRequestException("A department cannot appear more than once.");
        }

        var intendedDepartments = request.Departments.Count > 0
            ? await dbContext.OrganizationDepartments
                .Where(value => request.Departments.Select(item => item.DepartmentId).Contains(value.Id)
                    && value.OrganizationId == organization.Id
                    && value.IsActive)
                .OrderByDescending(value => value.IsDefault)
                .ThenBy(value => value.Name)
                .ToListAsync(cancellationToken)
            : await dbContext.OrganizationDepartments
                .Where(value => value.OrganizationId == organization.Id && value.IsDefault && value.IsActive)
                .ToListAsync(cancellationToken);
        if (intendedDepartments.Count != Math.Max(1, request.Departments.Count))
        {
            throw new BadRequestException("Select one or more active departments in this organization.");
        }

        var normalizedEmail = User.NormalizeEmail(request.Email);
        if (request.CrmContactId.HasValue)
        {
            var contact = await dbContext.CrmContacts.AsNoTracking()
                .SingleOrDefaultAsync(value => value.Id == request.CrmContactId.Value && value.IsActive, cancellationToken)
                ?? throw new BadRequestException("The active CRM Contact was not found.");
            var belongsToCompany = await dbContext.CrmCompanyContacts.AsNoTracking().AnyAsync(value =>
                value.ContactId == contact.Id
                && value.IsActive
                && value.Company.AccessOrganizationId == organization.Id,
                cancellationToken);
            if (!belongsToCompany)
            {
                throw new BadRequestException("The CRM Contact is not actively associated with this Company.");
            }

            if (contact.NormalizedEmail is null
                || !string.Equals(contact.NormalizedEmail, normalizedEmail, StringComparison.Ordinal))
            {
                throw new BadRequestException("The invitation email must match the CRM Contact email.");
            }

            var hasActiveContactLink = await dbContext.CrmContactUserLinks.AsNoTracking()
                .AnyAsync(value => value.ContactId == contact.Id && value.IsActive, cancellationToken);
            if (hasActiveContactLink)
            {
                throw new BadRequestException("The CRM Contact is already linked to a Portal user.");
            }
        }
        var existingUser = await dbContext.Users
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail, cancellationToken);

        if (existingUser?.Status == UserAccountStatus.Disabled)
        {
            throw new BadRequestException("Cannot invite a disabled user.");
        }

        if (existingUser != null)
        {
            var hasActiveMembership = await dbContext.OrganizationMemberships
                .AnyAsync(
                    membership => membership.UserId == existingUser.Id
                        && membership.OrganizationId == organization.Id
                        && membership.IsActive,
                    cancellationToken);

            if (hasActiveMembership)
            {
                throw new BadRequestException("User already has active membership in this organization.");
            }
        }

        var pendingInvitation = await dbContext.OrganizationInvitations
            .FirstOrDefaultAsync(
                invitation => invitation.OrganizationId == organization.Id
                    && invitation.NormalizedEmail == normalizedEmail
                    && invitation.Status == InvitationStatus.Pending,
                cancellationToken);

        if (pendingInvitation?.LastSentAt is DateTime lastSentAt
            && lastSentAt.AddMinutes(options.ResendCooldownMinutes) > utcNow)
        {
            throw new BadRequestException("Invitation was sent recently. Wait before resending.");
        }

        if (pendingInvitation != null
            && orderToCashOptions.Value.InvitationDelivery
            && await HasRecentDeliveryAttemptAsync(
                dbContext,
                pendingInvitation.Id,
                utcNow.AddMinutes(-options.ResendCooldownMinutes),
                cancellationToken))
        {
            throw new BadRequestException("Invitation was queued recently. Wait before resending.");
        }

        var token = tokenService.CreateToken();
        var expiresAt = utcNow.AddDays(options.TokenLifetimeDays);
        var isNewInvitation = pendingInvitation == null;
        OrganizationInvitation invitation;

        if (pendingInvitation == null)
        {
            invitation = new OrganizationInvitation(
                organization.Id,
                request.Email,
                firstName,
                lastName,
                request.IsOrganizationAdmin,
                token.TokenHash,
                expiresAt,
                request.CrmContactId);
            dbContext.OrganizationInvitations.Add(invitation);
        }
        else
        {
            invitation = pendingInvitation;
            invitation.UpdateIntent(
                firstName,
                lastName,
                request.IsOrganizationAdmin,
                request.CrmContactId);
            invitation.RotateToken(token.TokenHash, expiresAt);
        }

        var existingLabRoleIntents = isNewInvitation
            ? []
            : await dbContext.LabRoleInvitationIntents
                .Where(intent => intent.OrganizationInvitationId == invitation.Id)
                .ToListAsync(cancellationToken);
        foreach (var staleIntent in existingLabRoleIntents
                     .Where(intent => !intendedLabRoles.Contains(intent.Role)))
        {
            dbContext.LabRoleInvitationIntents.Remove(staleIntent);
        }

        foreach (var role in intendedLabRoles
                     .Where(role => existingLabRoleIntents.All(intent => intent.Role != role)))
        {
            dbContext.LabRoleInvitationIntents.Add(
                new LabRoleInvitationIntent(invitation.Id, role));
        }

        var existingBusinessRoleIntents = isNewInvitation
            ? []
            : await dbContext.BusinessRoleInvitationIntents
                .Where(intent => intent.OrganizationInvitationId == invitation.Id)
                .ToListAsync(cancellationToken);
        foreach (var staleIntent in existingBusinessRoleIntents
                     .Where(intent => !intendedBusinessRoles.Contains(intent.Role)))
        {
            dbContext.BusinessRoleInvitationIntents.Remove(staleIntent);
        }

        foreach (var role in intendedBusinessRoles
                     .Where(role => existingBusinessRoleIntents.All(intent => intent.Role != role)))
        {
            dbContext.BusinessRoleInvitationIntents.Add(
                new BusinessRoleInvitationIntent(invitation.Id, role));
        }

        var existingDepartmentIntents = isNewInvitation
            ? []
            : await dbContext.OrganizationInvitationDepartments
                .Where(intent => intent.OrganizationInvitationId == invitation.Id)
                .ToListAsync(cancellationToken);
        foreach (var staleIntent in existingDepartmentIntents
                     .Where(intent => intendedDepartments.All(department => department.Id != intent.DepartmentId)))
        {
            dbContext.OrganizationInvitationDepartments.Remove(staleIntent);
        }

        foreach (var department in intendedDepartments)
        {
            var requested = request.Departments.SingleOrDefault(value => value.DepartmentId == department.Id);
            var isDepartmentAdmin = requested?.IsDepartmentAdmin == true;
            var existing = existingDepartmentIntents.SingleOrDefault(value => value.DepartmentId == department.Id);
            if (existing is null)
            {
                dbContext.OrganizationInvitationDepartments.Add(
                    new OrganizationInvitationDepartment(invitation.Id, department.Id, isDepartmentAdmin));
            }
            else
            {
                existing.SetDepartmentAdmin(isDepartmentAdmin);
            }
        }

        InvitationDeliveryAttempt? deliveryAttempt = null;
        string? providerMessageId = null;
        if (orderToCashOptions.Value.InvitationDelivery)
        {
            deliveryAttempt = QueueDelivery(
                dbContext,
                deliveryPayloadProtector,
                invitation,
                organization.Name,
                BuildInviteUrl(options.PublicBaseUrl, token.RawToken),
                utcNow);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        if (!orderToCashOptions.Value.InvitationDelivery)
        {
            var sendResult = await emailSender.SendInvitationAsync(
                new InvitationEmailMessage(
                    invitation.Id,
                    invitation.Email,
                    organization.Name,
                    BuildInviteUrl(options.PublicBaseUrl, token.RawToken)),
                cancellationToken);
            providerMessageId = sendResult.ProviderMessageId;
            invitation.RecordSend(utcNow, actor.Id, providerMessageId);
        }

        AccountAudit.Add(
            dbContext,
            httpContext,
            nameof(OrganizationInvitation),
            invitation.Id,
            isNewInvitation ? AccountAudit.InviteCreated : AccountAudit.InviteResent,
            invitation.OrganizationId,
            actor.Id,
            new
            {
                invitation.Email,
                invitation.NormalizedEmail,
                invitation.FirstName,
                invitation.LastName,
                invitation.IsOrganizationAdmin,
                invitation.CrmContactId,
                Departments = intendedDepartments.Select(department => new
                {
                    DepartmentId = department.Id,
                    department.Name,
                    IsDepartmentAdmin = request.Departments
                        .SingleOrDefault(value => value.DepartmentId == department.Id)?.IsDepartmentAdmin == true
                }),
                LabRoles = intendedLabRoles,
                BusinessRoles = intendedBusinessRoles,
                DeliveryAttemptId = deliveryAttempt?.Id,
                DeliveryStatus = deliveryAttempt?.State,
                ProviderMessageId = providerMessageId,
                invitation.SendCount
            });
        await dbContext.SaveChangesAsync(cancellationToken);

        invitation = await dbContext.OrganizationInvitations
            .Include(i => i.Organization)
            .FirstAsync(i => i.Id == invitation.Id, cancellationToken);

        return TypedResults.Created(
            $"/api/invitations/{invitation.Id}",
            ToDto(
                invitation,
                utcNow,
                intendedLabRoles,
                deliveryAttempt,
                intendedBusinessRoles,
                intendedDepartments.Select(department => new InvitationDepartmentDto(
                    department.Id,
                    department.Name,
                    request.Departments.SingleOrDefault(value => value.DepartmentId == department.Id)?.IsDepartmentAdmin == true)).ToList()));
    }

    public static async Task<IResult> ResendInvitation(
        Guid id,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        InvitationTokenService tokenService,
        IInvitationEmailSender emailSender,
        IInvitationDeliveryPayloadProtector deliveryPayloadProtector,
        IExternalIdentityContext externalIdentityContext,
        IOptions<InvitationOptions> invitationOptions,
        IOptions<PSeqOrderToCashOptions> orderToCashOptions,
        CancellationToken cancellationToken)
    {
        var utcNow = DateTime.UtcNow;
        var options = invitationOptions.Value;
        var invitation = await dbContext.OrganizationInvitations
            .Include(i => i.Organization)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (invitation == null)
        {
            throw new BadRequestException("Invitation not found.");
        }

        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
        if (actor == null)
        {
            return TypedResults.Forbid();
        }

        if (invitation.Organization == null
            || !AccountAuthorization.CanInviteToOrganization(actor, invitation.OrganizationId, invitation.Organization.Kind))
        {
            return TypedResults.Forbid();
        }

        if (invitation.Status != InvitationStatus.Pending)
        {
            throw new BadRequestException("Only pending invitations can be resent.");
        }

        if (invitation.Organization?.IsActive != true)
        {
            throw new BadRequestException("Cannot resend invitation for an inactive organization.");
        }

        await ValidateDepartmentIntentAsync(dbContext, invitation, cancellationToken);

        if (invitation.LastSentAt is DateTime lastSentAt
            && lastSentAt.AddMinutes(options.ResendCooldownMinutes) > utcNow)
        {
            throw new BadRequestException("Invitation was sent recently. Wait before resending.");
        }

        if (orderToCashOptions.Value.InvitationDelivery
            && await HasRecentDeliveryAttemptAsync(
                dbContext,
                invitation.Id,
                utcNow.AddMinutes(-options.ResendCooldownMinutes),
                cancellationToken))
        {
            throw new BadRequestException("Invitation was queued recently. Wait before resending.");
        }

        var token = tokenService.CreateToken();
        invitation.RotateToken(token.TokenHash, utcNow.AddDays(options.TokenLifetimeDays));
        InvitationDeliveryAttempt? deliveryAttempt = null;
        string? providerMessageId = null;
        if (orderToCashOptions.Value.InvitationDelivery)
        {
            deliveryAttempt = QueueDelivery(
                dbContext,
                deliveryPayloadProtector,
                invitation,
                invitation.Organization.Name,
                BuildInviteUrl(options.PublicBaseUrl, token.RawToken),
                utcNow);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        if (!orderToCashOptions.Value.InvitationDelivery)
        {
            var sendResult = await emailSender.SendInvitationAsync(
                new InvitationEmailMessage(
                    invitation.Id,
                    invitation.Email,
                    invitation.Organization.Name,
                    BuildInviteUrl(options.PublicBaseUrl, token.RawToken)),
                cancellationToken);
            providerMessageId = sendResult.ProviderMessageId;
            invitation.RecordSend(utcNow, actor.Id, providerMessageId);
        }
        var intendedLabRoles = await ReadIntendedLabRolesAsync(
            dbContext,
            invitation.Id,
            cancellationToken);
        var intendedBusinessRoles = await ReadIntendedBusinessRolesAsync(
            dbContext,
            invitation.Id,
            cancellationToken);
        var intendedDepartments = await dbContext.OrganizationInvitationDepartments
            .Include(value => value.Department)
            .Where(value => value.OrganizationInvitationId == invitation.Id
                && value.Department.IsActive
                && value.Department.OrganizationId == invitation.OrganizationId)
            .OrderByDescending(value => value.Department.IsDefault)
            .ThenBy(value => value.Department.Name)
            .ToListAsync(cancellationToken);
        AccountAudit.Add(
            dbContext,
            httpContext,
            nameof(OrganizationInvitation),
            invitation.Id,
            AccountAudit.InviteResent,
            invitation.OrganizationId,
            actor.Id,
            new
            {
                invitation.Email,
                invitation.NormalizedEmail,
                invitation.FirstName,
                invitation.LastName,
                invitation.IsOrganizationAdmin,
                LabRoles = intendedLabRoles,
                BusinessRoles = intendedBusinessRoles,
                DeliveryAttemptId = deliveryAttempt?.Id,
                DeliveryStatus = deliveryAttempt?.State,
                ProviderMessageId = providerMessageId,
                invitation.SendCount
            });
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToDto(
            invitation,
            utcNow,
            intendedLabRoles,
            deliveryAttempt,
            intendedBusinessRoles,
            intendedDepartments.Select(value => new InvitationDepartmentDto(
                value.DepartmentId,
                value.Department?.Name ?? string.Empty,
                value.IsDepartmentAdmin)).ToList()));
    }

    public static async Task<IResult> CreateDevelopmentInvitationLink(
        Guid id,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        InvitationTokenService tokenService,
        IExternalIdentityContext externalIdentityContext,
        IOptions<InvitationOptions> invitationOptions,
        IHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
        {
            return TypedResults.NotFound();
        }

        var utcNow = DateTime.UtcNow;
        var options = invitationOptions.Value;
        var invitation = await dbContext.OrganizationInvitations
            .Include(value => value.Organization)
            .FirstOrDefaultAsync(value => value.Id == id, cancellationToken);

        if (invitation == null)
        {
            throw new BadRequestException("Invitation not found.");
        }

        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
        if (actor == null)
        {
            return TypedResults.Forbid();
        }

        if (invitation.Organization == null
            || !AccountAuthorization.CanInviteToOrganization(
                actor,
                invitation.OrganizationId,
                invitation.Organization.Kind))
        {
            return TypedResults.Forbid();
        }

        if (invitation.Status != InvitationStatus.Pending)
        {
            throw new BadRequestException("Only pending invitations can create a development sign-in link.");
        }

        if (!invitation.Organization.IsActive)
        {
            throw new BadRequestException("Cannot create a sign-in link for an inactive organization.");
        }

        var token = tokenService.CreateToken();
        invitation.RotateToken(token.TokenHash, utcNow.AddDays(options.TokenLifetimeDays));
        AccountAudit.Add(
            dbContext,
            httpContext,
            nameof(OrganizationInvitation),
            invitation.Id,
            AccountAudit.DevelopmentInviteLinkCreated,
            invitation.OrganizationId,
            actor.Id,
            new
            {
                invitation.Email,
                invitation.NormalizedEmail,
                invitation.ExpiresAt
            });
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(new DevelopmentInvitationLinkDto
        {
            InvitationId = invitation.Id,
            InviteUrl = BuildInviteUrl(options.PublicBaseUrl, token.RawToken),
            ExpiresAt = invitation.ExpiresAt
        });
    }

    public static async Task<IResult> AcceptInvitation(
        [FromBody] AcceptInvitationRequest request,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        InvitationTokenService tokenService,
        IExternalIdentityContext externalIdentityContext,
        IVerifiedExternalEmailResolver verifiedEmailResolver,
        CancellationToken cancellationToken)
    {
        var identity = externalIdentityContext.Read(httpContext);
        if (identity == null)
        {
            return TypedResults.Unauthorized();
        }

        var utcNow = DateTime.UtcNow;
        var tokenHash = tokenService.HashToken(request.Token);
        var invitation = await dbContext.OrganizationInvitations
            .Include(i => i.Organization)
            .FirstOrDefaultAsync(i => i.TokenHash == tokenHash, cancellationToken);

        if (invitation == null)
        {
            throw new BadRequestException("Invitation cannot be accepted.");
        }

        if (!await verifiedEmailResolver.IsVerifiedAsync(
                identity,
                invitation.Email,
                cancellationToken))
        {
            throw new BadRequestException("Invitation email must match a verified authenticated email.");
        }

        identity = identity with { Email = invitation.Email, IsEmailVerified = true };
        ValidateInvitationForAuthenticatedEmail(invitation, identity, utcNow);
        await ValidateDepartmentIntentAsync(dbContext, invitation, cancellationToken);
        var intendedLabRoles = await ReadIntendedLabRolesAsync(
            dbContext,
            invitation.Id,
            cancellationToken);
        var intendedBusinessRoles = await ReadIntendedBusinessRolesAsync(
            dbContext,
            invitation.Id,
            cancellationToken);
        var intendedDepartments = await dbContext.OrganizationInvitationDepartments
            .Include(value => value.Department)
            .Where(value => value.OrganizationInvitationId == invitation.Id
                && value.Department.IsActive
                && value.Department.OrganizationId == invitation.OrganizationId)
            .OrderByDescending(value => value.Department.IsDefault)
            .ThenBy(value => value.Department.Name)
            .ToListAsync(cancellationToken);
        var firstName = InvitationName(
            invitation.FirstName,
            request.FirstName,
            "first name");
        var lastName = InvitationName(
            invitation.LastName,
            request.LastName,
            "last name");

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.NormalizedEmail == invitation.NormalizedEmail, cancellationToken);

        if (user?.Status == UserAccountStatus.Disabled)
        {
            throw new BadRequestException("Invitation cannot be accepted for a disabled user.");
        }

        if (user == null)
        {
            user = new User(invitation.Email, firstName, lastName);
            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        user.AcceptInvitation(
            firstName,
            lastName,
            identity.Provider,
            identity.SubjectId,
            utcNow);

        var membership = await dbContext.OrganizationMemberships
            .FirstOrDefaultAsync(
                m => m.UserId == user.Id && m.OrganizationId == invitation.OrganizationId,
                cancellationToken);
        var createdMembershipByInvite = membership == null;
        var reactivatedMembershipByInvite = membership is { IsActive: false };

        if (membership == null)
        {
            membership = new OrganizationMembership(
                user.Id,
                invitation.OrganizationId,
                invitation.IsOrganizationAdmin);
            dbContext.OrganizationMemberships.Add(membership);
        }
        else
        {
            if (membership.IsActive)
            {
                throw new BadRequestException("User already has active membership in this organization.");
            }

            membership.SetOrganizationAdmin(invitation.IsOrganizationAdmin);
            membership.Activate();
        }

        var existingDepartmentMemberships = await dbContext.OrganizationDepartmentMemberships
            .Where(value => value.OrganizationMembershipId == membership.Id)
            .ToListAsync(cancellationToken);
        foreach (var staleAssignment in existingDepartmentMemberships.Where(value =>
                     intendedDepartments.All(intent => intent.DepartmentId != value.DepartmentId)))
        {
            staleAssignment.Deactivate();
        }

        foreach (var intent in intendedDepartments)
        {
            var assignment = existingDepartmentMemberships
                .SingleOrDefault(value => value.DepartmentId == intent.DepartmentId);
            if (assignment is null)
            {
                dbContext.OrganizationDepartmentMemberships.Add(
                    new OrganizationDepartmentMembership(
                        membership.Id,
                        intent.DepartmentId,
                        intent.IsDepartmentAdmin));
            }
            else
            {
                assignment.SetDepartmentAdmin(intent.IsDepartmentAdmin);
                assignment.Reactivate();
            }
        }

        CrmContactUserLink? contactUserLink = null;
        if (invitation.CrmContactId.HasValue)
        {
            var contactId = invitation.CrmContactId.Value;
            var conflictingLink = await dbContext.CrmContactUserLinks.AsNoTracking().AnyAsync(value =>
                value.IsActive
                && (value.ContactId == contactId || value.UserId == user.Id)
                && !(value.ContactId == contactId && value.UserId == user.Id),
                cancellationToken);
            if (conflictingLink)
            {
                throw new BadRequestException(
                    "Portal access was not accepted because the Contact or User already has a different active identity link.");
            }

            contactUserLink = await dbContext.CrmContactUserLinks
                .Where(value => value.ContactId == contactId && value.UserId == user.Id)
                .OrderByDescending(value => value.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
            if (contactUserLink is null)
            {
                contactUserLink = new CrmContactUserLink(
                    contactId,
                    user.Id,
                    $"Created by accepted Organization invitation {invitation.Id}.");
                dbContext.CrmContactUserLinks.Add(contactUserLink);
            }
            else if (!contactUserLink.IsActive)
            {
                contactUserLink.Reactivate($"Reactivated by accepted Organization invitation {invitation.Id}.");
            }
        }

        if (invitation.Organization?.IsPhaeno() == true
            && intendedLabRoles.Count > 0)
        {
            var existingAssignments = await dbContext.LabRoleAssignments
                .Where(assignment => assignment.UserId == user.Id)
                .ToListAsync(cancellationToken);
            foreach (var role in intendedLabRoles)
            {
                var assignment = existingAssignments
                    .SingleOrDefault(value => value.Role == role);
                if (assignment == null)
                {
                    dbContext.LabRoleAssignments.Add(
                        new LabRoleAssignment(user.Id, role));
                }
                else
                {
                    assignment.SetActive(true);
                }
            }
        }

        if (invitation.Organization?.IsPhaeno() == true
            && intendedBusinessRoles.Count > 0)
        {
            var existingAssignments = await dbContext.BusinessRoleAssignments
                .Where(assignment => assignment.UserId == user.Id)
                .ToListAsync(cancellationToken);
            foreach (var role in intendedBusinessRoles)
            {
                var assignment = existingAssignments.SingleOrDefault(value => value.Role == role);
                if (assignment == null)
                    dbContext.BusinessRoleAssignments.Add(new BusinessRoleAssignment(user.Id, role));
                else
                    assignment.SetActive(true);
            }
        }

        invitation.Accept(user.Id, utcNow);
        AccountAudit.Add(
            dbContext,
            httpContext,
            nameof(OrganizationInvitation),
            invitation.Id,
            AccountAudit.InviteAccepted,
            invitation.OrganizationId,
            user.Id,
            new
            {
                invitation.Email,
                invitation.NormalizedEmail,
                invitation.FirstName,
                invitation.LastName,
                invitation.IsOrganizationAdmin,
                invitation.CrmContactId,
                Departments = intendedDepartments.Select(value => new
                {
                    value.DepartmentId,
                    DepartmentName = value.Department?.Name,
                    value.IsDepartmentAdmin
                }),
                LabRoles = intendedLabRoles,
                BusinessRoles = intendedBusinessRoles,
                AcceptedByUserId = user.Id
            });
        AccountAudit.Add(
            dbContext,
            httpContext,
            nameof(OrganizationMembership),
            membership.Id,
            createdMembershipByInvite
                ? AccountAudit.MembershipCreatedByInvite
                : AccountAudit.MembershipReactivatedByInvite,
            membership.OrganizationId,
            user.Id,
            new
            {
                membership.UserId,
                membership.OrganizationId,
                membership.IsOrganizationAdmin,
                InvitationId = invitation.Id,
                WasReactivated = reactivatedMembershipByInvite
            });
        if (contactUserLink is not null)
        {
            AccountAudit.Add(
                dbContext,
                httpContext,
                nameof(CrmContactUserLink),
                contactUserLink.Id,
                AccountAudit.ContactUserLinked,
                invitation.OrganizationId,
                user.Id,
                new
                {
                    contactUserLink.ContactId,
                    contactUserLink.UserId,
                    InvitationId = invitation.Id
                });
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return TypedResults.Ok(ToDto(
            invitation,
            utcNow,
            intendedLabRoles,
            businessRoles: intendedBusinessRoles,
            departments: intendedDepartments.Select(value => new InvitationDepartmentDto(
                value.DepartmentId,
                value.Department?.Name ?? string.Empty,
                value.IsDepartmentAdmin)).ToList()));
    }

    public static async Task<IResult> DeclineInvitation(
        [FromBody] DeclineInvitationRequest request,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        InvitationTokenService tokenService,
        IExternalIdentityContext externalIdentityContext,
        IVerifiedExternalEmailResolver verifiedEmailResolver,
        CancellationToken cancellationToken)
    {
        var identity = externalIdentityContext.Read(httpContext);
        if (identity == null)
        {
            return TypedResults.Unauthorized();
        }

        var utcNow = DateTime.UtcNow;
        var tokenHash = tokenService.HashToken(request.Token);
        var invitation = await dbContext.OrganizationInvitations
            .Include(i => i.Organization)
            .FirstOrDefaultAsync(i => i.TokenHash == tokenHash, cancellationToken);

        if (invitation == null)
        {
            throw new BadRequestException("Invitation cannot be declined.");
        }

        if (!await verifiedEmailResolver.IsVerifiedAsync(
                identity,
                invitation.Email,
                cancellationToken))
        {
            throw new BadRequestException("Invitation email must match a verified authenticated email.");
        }

        identity = identity with { Email = invitation.Email, IsEmailVerified = true };
        ValidateInvitationForAuthenticatedEmail(invitation, identity, utcNow);

        var declinedByUserId = await dbContext.Users
            .Where(u => u.NormalizedEmail == invitation.NormalizedEmail)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync(cancellationToken);

        invitation.Decline(declinedByUserId, utcNow);
        var intendedLabRoles = await ReadIntendedLabRolesAsync(
            dbContext,
            invitation.Id,
            cancellationToken);
        var intendedBusinessRoles = await ReadIntendedBusinessRolesAsync(
            dbContext,
            invitation.Id,
            cancellationToken);
        AccountAudit.Add(
            dbContext,
            httpContext,
            nameof(OrganizationInvitation),
            invitation.Id,
            AccountAudit.InviteDeclined,
            invitation.OrganizationId,
            declinedByUserId,
            new
            {
                invitation.Email,
                invitation.NormalizedEmail,
                DeclinedByUserId = declinedByUserId
            });
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToDto(
            invitation,
            utcNow,
            intendedLabRoles,
            businessRoles: intendedBusinessRoles));
    }

    public static async Task<IResult> RevokeInvitation(
        Guid id,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var utcNow = DateTime.UtcNow;
        var invitation = await dbContext.OrganizationInvitations
            .Include(i => i.Organization)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (invitation == null)
        {
            throw new BadRequestException("Invitation not found.");
        }

        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
        if (actor == null)
        {
            return TypedResults.Forbid();
        }

        if (invitation.Organization == null
            || !AccountAuthorization.CanInviteToOrganization(actor, invitation.OrganizationId, invitation.Organization.Kind))
        {
            return TypedResults.Forbid();
        }

        invitation.Revoke(actor.Id, utcNow);
        var intendedLabRoles = await ReadIntendedLabRolesAsync(
            dbContext,
            invitation.Id,
            cancellationToken);
        var intendedBusinessRoles = await ReadIntendedBusinessRolesAsync(
            dbContext,
            invitation.Id,
            cancellationToken);
        AccountAudit.Add(
            dbContext,
            httpContext,
            nameof(OrganizationInvitation),
            invitation.Id,
            AccountAudit.InviteRevoked,
            invitation.OrganizationId,
            actor.Id,
            new
            {
                invitation.Email,
                invitation.NormalizedEmail,
                RevokedByUserId = actor.Id
            });
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToDto(
            invitation,
            utcNow,
            intendedLabRoles,
            businessRoles: intendedBusinessRoles));
    }

    public static async Task<IResult> ListInvitations(
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        [FromQuery] Guid? organizationId,
        [FromQuery] InvitationStatus? status,
        [FromQuery] bool includeExpired,
        CancellationToken cancellationToken)
    {
        var utcNow = DateTime.UtcNow;
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
        if (actor == null)
        {
            return TypedResults.Forbid();
        }

        var isPlatformAdmin = AccountAuthorization.IsPlatformAdmin(actor);
        if (!isPlatformAdmin)
        {
            if (!organizationId.HasValue)
            {
                return TypedResults.Forbid();
            }

            var organization = await dbContext.Organizations
                .FirstOrDefaultAsync(o => o.Id == organizationId.Value, cancellationToken);
            if (organization == null)
            {
                throw new OrganizationNotFoundException(organizationId.Value);
            }

            if (!AccountAuthorization.CanInviteToOrganization(actor, organization.Id, organization.Kind))
            {
                return TypedResults.Forbid();
            }
        }

        var query = dbContext.OrganizationInvitations
            .Include(i => i.Organization)
            .AsQueryable();

        if (organizationId.HasValue)
        {
            query = query.Where(i => i.OrganizationId == organizationId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(i => i.Status == status.Value);
        }
        else
        {
            query = query.Where(i => i.Status == InvitationStatus.Pending);
        }

        if (!includeExpired)
        {
            query = query.Where(i => i.Status != InvitationStatus.Pending || i.ExpiresAt > utcNow);
        }

        var invitations = await query
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(cancellationToken);
        var invitationIds = invitations.Select(invitation => invitation.Id).ToArray();
        var roleIntents = await dbContext.LabRoleInvitationIntents
            .AsNoTracking()
            .Where(intent => invitationIds.Contains(intent.OrganizationInvitationId))
            .OrderBy(intent => intent.Role)
            .ToListAsync(cancellationToken);
        var roleLookup = roleIntents
            .GroupBy(intent => intent.OrganizationInvitationId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<LabRole>)group
                    .Select(intent => intent.Role)
                    .ToArray());
        var businessRoleIntents = await dbContext.BusinessRoleInvitationIntents
            .AsNoTracking()
            .Where(intent => invitationIds.Contains(intent.OrganizationInvitationId))
            .OrderBy(intent => intent.Role)
            .ToListAsync(cancellationToken);
        var businessRoleLookup = businessRoleIntents
            .GroupBy(intent => intent.OrganizationInvitationId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<BusinessRole>)group
                    .Select(intent => intent.Role)
                    .ToArray());
        var departmentIntents = await dbContext.OrganizationInvitationDepartments
            .AsNoTracking()
            .Include(intent => intent.Department)
            .Where(intent => invitationIds.Contains(intent.OrganizationInvitationId))
            .OrderByDescending(intent => intent.Department.IsDefault)
            .ThenBy(intent => intent.Department.Name)
            .ToListAsync(cancellationToken);
        var departmentLookup = departmentIntents
            .GroupBy(intent => intent.OrganizationInvitationId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<InvitationDepartmentDto>)group
                    .Select(intent => new InvitationDepartmentDto(
                        intent.DepartmentId,
                        intent.Department.Name,
                        intent.IsDepartmentAdmin))
                    .ToArray());
        var deliveryAttempts = await dbContext.InvitationDeliveryAttempts
            .AsNoTracking()
            .Where(attempt => invitationIds.Contains(attempt.OrganizationInvitationId))
            .OrderByDescending(attempt => attempt.QueuedAtUtc)
            .ToListAsync(cancellationToken);
        var deliveryLookup = deliveryAttempts
            .GroupBy(attempt => attempt.OrganizationInvitationId)
            .ToDictionary(group => group.Key, group => group.First());

        return TypedResults.Ok(
            invitations
                .Select(invitation => ToDto(
                    invitation,
                    utcNow,
                    roleLookup.GetValueOrDefault(invitation.Id, []),
                    deliveryLookup.GetValueOrDefault(invitation.Id),
                    businessRoleLookup.GetValueOrDefault(invitation.Id, []),
                    departmentLookup.GetValueOrDefault(invitation.Id, [])))
                .ToList());
    }

    public static void MapInvitationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/invitations")
            .WithTags("Invitations")
            .RequireAuthorization();

        group.MapPost("/", CreateInvitation)
            .WithName("CreateInvitation")
            .WithSummary("Create or replace a pending organization invitation")
            .Produces<InvitationDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapPost("/{id}/resend", ResendInvitation)
            .WithName("ResendInvitation")
            .WithSummary("Resend a pending organization invitation")
            .Produces<InvitationDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        if (app.Environment.IsDevelopment())
        {
            group.MapPost("/{id}/development-link", CreateDevelopmentInvitationLink)
                .WithName("CreateDevelopmentInvitationLink")
                .WithSummary("Create a local-development sign-in link for a pending invitation")
                .Produces<DevelopmentInvitationLinkDto>(StatusCodes.Status200OK)
                .Produces(StatusCodes.Status401Unauthorized)
                .Produces(StatusCodes.Status403Forbidden)
                .Produces(StatusCodes.Status404NotFound)
                .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);
        }

        group.MapPost("/{id}/revoke", RevokeInvitation)
            .WithName("RevokeInvitation")
            .WithSummary("Revoke a pending organization invitation")
            .Produces<InvitationDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapPost("/accept", AcceptInvitation)
            .WithName("AcceptInvitation")
            .WithSummary("Accept a pending organization invitation")
            .Produces<InvitationDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapPost("/decline", DeclineInvitation)
            .WithName("DeclineInvitation")
            .WithSummary("Decline a pending organization invitation")
            .Produces<InvitationDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapGet("/", ListInvitations)
            .WithName("ListInvitations")
            .WithSummary("List organization invitations")
            .Produces<List<InvitationDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);
    }

    private static InvitationDto ToDto(
        OrganizationInvitation invitation,
        DateTime utcNow,
        IReadOnlyList<LabRole> labRoles,
        InvitationDeliveryAttempt? deliveryAttempt = null,
        IReadOnlyList<BusinessRole>? businessRoles = null,
        IReadOnlyList<InvitationDepartmentDto>? departments = null)
    {
        return new InvitationDto
        {
            Id = invitation.Id,
            OrganizationId = invitation.OrganizationId,
            OrganizationName = invitation.Organization?.Name,
            Email = invitation.Email,
            NormalizedEmail = invitation.NormalizedEmail,
            FirstName = invitation.FirstName,
            LastName = invitation.LastName,
            IsOrganizationAdmin = invitation.IsOrganizationAdmin,
            CrmContactId = invitation.CrmContactId,
            Departments = departments ?? [],
            LabRoles = labRoles,
            BusinessRoles = businessRoles ?? [],
            Status = invitation.Status,
            IsExpired = invitation.IsExpired(utcNow),
            ExpiresAt = invitation.ExpiresAt,
            AcceptedAt = invitation.AcceptedAt,
            AcceptedByUserId = invitation.AcceptedByUserId,
            RevokedAt = invitation.RevokedAt,
            RevokedByUserId = invitation.RevokedByUserId,
            DeclinedAt = invitation.DeclinedAt,
            DeclinedByUserId = invitation.DeclinedByUserId,
            LastSentAt = invitation.LastSentAt,
            LastSentByUserId = invitation.LastSentByUserId,
            SendCount = invitation.SendCount,
            LastEmailProviderMessageId = invitation.LastEmailProviderMessageId,
            LastSendError = invitation.LastSendError,
            DeliveryStatus = deliveryAttempt?.State,
            DeliveryAttemptCount = deliveryAttempt?.AttemptCount ?? 0,
            DeliveryQueuedAt = deliveryAttempt?.QueuedAtUtc,
            DeliveryUpdatedAt = deliveryAttempt?.UpdatedAt,
            DeliveredAt = deliveryAttempt?.DeliveredAtUtc,
            BouncedAt = deliveryAttempt?.BouncedAtUtc,
            HasHardBounce = deliveryAttempt?.IsHardBounce == true,
            CreatedAt = invitation.CreatedAt,
            UpdatedAt = invitation.UpdatedAt,
            Version = invitation.Version
        };
    }

    private static InvitationDeliveryAttempt QueueDelivery(
        PSeqOperationsDbContext dbContext,
        IInvitationDeliveryPayloadProtector payloadProtector,
        OrganizationInvitation invitation,
        string organizationName,
        string inviteUrl,
        DateTime utcNow)
    {
        var protectedPayload = payloadProtector.Protect(new InvitationDeliveryPayload(
            invitation.Id,
            invitation.Email,
            organizationName,
            inviteUrl));
        var attempt = new InvitationDeliveryAttempt(invitation.Id, protectedPayload, utcNow);
        dbContext.InvitationDeliveryAttempts.Add(attempt);
        return attempt;
    }

    private static Task<bool> HasRecentDeliveryAttemptAsync(
        PSeqOperationsDbContext dbContext,
        Guid invitationId,
        DateTime notBeforeUtc,
        CancellationToken cancellationToken) =>
        dbContext.InvitationDeliveryAttempts.AsNoTracking().AnyAsync(
            attempt => attempt.OrganizationInvitationId == invitationId
                && attempt.QueuedAtUtc > notBeforeUtc,
            cancellationToken);

    private static string BuildInviteUrl(string publicBaseUrl, string rawToken)
    {
        var baseUrl = publicBaseUrl.TrimEnd('/');
        var escapedToken = Uri.EscapeDataString(rawToken);
        return $"{baseUrl}/accept-invite?token={escapedToken}";
    }

    private static async Task<IReadOnlyList<LabRole>> ReadIntendedLabRolesAsync(
        PSeqOperationsDbContext dbContext,
        Guid invitationId,
        CancellationToken cancellationToken)
    {
        return await dbContext.LabRoleInvitationIntents
            .AsNoTracking()
            .Where(intent => intent.OrganizationInvitationId == invitationId)
            .OrderBy(intent => intent.Role)
            .Select(intent => intent.Role)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<BusinessRole>> ReadIntendedBusinessRolesAsync(
        PSeqOperationsDbContext dbContext,
        Guid invitationId,
        CancellationToken cancellationToken)
    {
        return await dbContext.BusinessRoleInvitationIntents
            .AsNoTracking()
            .Where(intent => intent.OrganizationInvitationId == invitationId)
            .OrderBy(intent => intent.Role)
            .Select(intent => intent.Role)
            .ToListAsync(cancellationToken);
    }

    private static string InvitationName(
        string storedValue,
        string? legacyRequestValue,
        string fieldLabel)
    {
        var value = string.IsNullOrWhiteSpace(legacyRequestValue)
            ? storedValue.Trim()
            : legacyRequestValue.Trim();
        if (string.IsNullOrWhiteSpace(value) || value.Length > 100)
        {
            throw new BadRequestException(
                $"Invitation {fieldLabel} is required and cannot exceed 100 characters.");
        }

        return value;
    }

    internal static async Task ValidateDepartmentIntentAsync(
        PSeqOperationsDbContext dbContext,
        OrganizationInvitation invitation,
        CancellationToken cancellationToken)
    {
        if (invitation.CrmContactId.HasValue)
        {
            var contactStillEligible = await dbContext.CrmCompanyContacts.AsNoTracking().AnyAsync(value =>
                value.ContactId == invitation.CrmContactId.Value && value.IsActive && value.Contact.IsActive
                && value.Contact.NormalizedEmail == invitation.NormalizedEmail
                && value.Company.IsActive && value.Company.AccessOrganizationId == invitation.OrganizationId,
                cancellationToken);
            if (!contactStillEligible)
            {
                throw new BadRequestException("The invited Contact or Company relationship changed. Ask an administrator to review and reissue the invitation.");
            }
        }

        var intents = await dbContext.OrganizationInvitationDepartments.AsNoTracking()
            .Include(value => value.Department)
            .Where(value => value.OrganizationInvitationId == invitation.Id)
            .ToListAsync(cancellationToken);
        if (intents.Count == 0 || intents.Any(value => !value.Department.IsActive
                || value.Department.OrganizationId != invitation.OrganizationId))
        {
            throw new BadRequestException("The invitation's department access is no longer available. Ask an organization administrator to review and reissue the invitation.");
        }
    }

    private static void ValidateInvitationForAuthenticatedEmail(
        OrganizationInvitation invitation,
        ExternalIdentity identity,
        DateTime utcNow)
    {
        if (!invitation.CanBeAccepted(utcNow))
        {
            throw new BadRequestException("Invitation cannot be accepted.");
        }

        if (invitation.Organization?.IsActive != true)
        {
            throw new BadRequestException("Invitation organization is inactive.");
        }

        var normalizedAuthenticatedEmail = User.NormalizeEmail(identity.Email);
        if (!string.Equals(invitation.NormalizedEmail, normalizedAuthenticatedEmail, StringComparison.Ordinal))
        {
            throw new BadRequestException("Invitation email must match authenticated email.");
        }
    }
}
