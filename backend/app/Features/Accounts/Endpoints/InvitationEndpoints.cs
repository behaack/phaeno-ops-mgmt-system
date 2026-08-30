namespace PhaenoPortal.App.Features.Accounts.Endpoints;

using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Application;
using PhaenoPortal.App.Common.Exceptions.Accounts;
using PhaenoPortal.App.Common.Exceptions.Conflict;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderToCash;
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
        InvitationDeliveryEnqueuer deliveryEnqueuer,
        IExternalIdentityContext externalIdentityContext,
        IOptions<InvitationOptions> invitationOptions,
        IOptions<OrderToCashOptions> orderToCashOptions,
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

        if (!organization.IsPhaeno() && intendedLabRoles.Length > 0)
        {
            throw new BadRequestException(
                "Laboratory roles can be assigned only through a Phaeno organization invitation.");
        }

        var intendedBusinessRoles = request.BusinessRoles.Distinct().ToArray();
        if (intendedBusinessRoles.Length != request.BusinessRoles.Count)
            throw new BadRequestException("A business role cannot appear more than once.");
        if (!organization.IsPhaeno() && intendedBusinessRoles.Length > 0)
            throw new BadRequestException("Business roles can be assigned only through a Phaeno organization invitation.");

        if (organization.IsPhaeno()
            && !request.IsOrganizationAdmin
            && intendedLabRoles.Length == 0
            && intendedBusinessRoles.Length == 0)
        {
            throw new BadRequestException(
                "A Phaeno invitation requires at least one platform or laboratory role.");
        }

        var normalizedEmail = User.NormalizeEmail(request.Email);
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
                expiresAt);
            dbContext.OrganizationInvitations.Add(invitation);
        }
        else
        {
            invitation = pendingInvitation;
            invitation.UpdateIntent(
                firstName,
                lastName,
                request.IsOrganizationAdmin);
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
            dbContext.BusinessRoleInvitationIntents.Remove(staleIntent);
        foreach (var role in intendedBusinessRoles
                     .Where(role => existingBusinessRoleIntents.All(intent => intent.Role != role)))
            dbContext.BusinessRoleInvitationIntents.Add(new BusinessRoleInvitationIntent(invitation.Id, role));

        if (orderToCashOptions.Value.Features.InvitationDelivery)
        {
            var delivery = deliveryEnqueuer.Enqueue(dbContext, invitation, organization.Name,
                BuildInviteUrl(options.PublicBaseUrl, token.RawToken), actor.Id, utcNow);
            AccountAudit.Add(dbContext, httpContext, nameof(OrganizationInvitation), invitation.Id,
                isNewInvitation ? AccountAudit.InviteCreated : AccountAudit.InviteResent,
                invitation.OrganizationId, actor.Id, new
                {
                    invitation.Email, invitation.NormalizedEmail, invitation.FirstName,
                    invitation.LastName, invitation.IsOrganizationAdmin,
                    LabRoles = intendedLabRoles, BusinessRoles = intendedBusinessRoles,
                    DeliveryAttemptId = delivery.Id, DeliveryState = delivery.State
                });
            await dbContext.SaveChangesAsync(cancellationToken);
            invitation = await dbContext.OrganizationInvitations.Include(i => i.Organization)
                .FirstAsync(i => i.Id == invitation.Id, cancellationToken);
            return TypedResults.Created($"/api/invitations/{invitation.Id}",
                ToDto(invitation, utcNow, intendedLabRoles, intendedBusinessRoles, delivery));
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var sendResult = await emailSender.SendInvitationAsync(
            new InvitationEmailMessage(
                invitation.Id,
                invitation.Email,
                organization.Name,
                BuildInviteUrl(options.PublicBaseUrl, token.RawToken)),
            cancellationToken);

        invitation.RecordSend(utcNow, actor.Id, sendResult.ProviderMessageId);
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
                LabRoles = intendedLabRoles,
                BusinessRoles = intendedBusinessRoles,
                ProviderMessageId = sendResult.ProviderMessageId,
                invitation.SendCount
            });
        await dbContext.SaveChangesAsync(cancellationToken);

        invitation = await dbContext.OrganizationInvitations
            .Include(i => i.Organization)
            .FirstAsync(i => i.Id == invitation.Id, cancellationToken);

        return TypedResults.Created(
            $"/api/invitations/{invitation.Id}",
            ToDto(invitation, utcNow, intendedLabRoles, intendedBusinessRoles));
    }

    public static async Task<IResult> ResendInvitation(
        Guid id,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        InvitationTokenService tokenService,
        IInvitationEmailSender emailSender,
        InvitationDeliveryEnqueuer deliveryEnqueuer,
        IExternalIdentityContext externalIdentityContext,
        IOptions<InvitationOptions> invitationOptions,
        IOptions<OrderToCashOptions> orderToCashOptions,
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

        if (invitation.LastSentAt is DateTime lastSentAt
            && lastSentAt.AddMinutes(options.ResendCooldownMinutes) > utcNow)
        {
            throw new BadRequestException("Invitation was sent recently. Wait before resending.");
        }

        var latestDelivery = orderToCashOptions.Value.Features.InvitationDelivery
            ? await dbContext.InvitationDeliveryAttempts
                .Where(value => value.OrganizationInvitationId == invitation.Id)
                .OrderByDescending(value => value.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken)
            : null;
        if (latestDelivery?.CreatedAt.AddMinutes(options.ResendCooldownMinutes) > utcNow)
            throw new BadRequestException("Invitation was queued recently. Wait before resending.");
        if (latestDelivery is { State: InvitationDeliveryState.NeedsAttention, BounceType: not null }
            && latestDelivery.BounceType.Contains("Hard", StringComparison.OrdinalIgnoreCase))
            throw new BadRequestException("A hard-bounced invitation must be revoked and replaced for the corrected email address.");

        var token = tokenService.CreateToken();
        invitation.RotateToken(token.TokenHash, utcNow.AddDays(options.TokenLifetimeDays));
        var intendedLabRoles = await ReadIntendedLabRolesAsync(
            dbContext, invitation.Id, cancellationToken);
        var intendedBusinessRoles = await ReadIntendedBusinessRolesAsync(
            dbContext, invitation.Id, cancellationToken);
        if (orderToCashOptions.Value.Features.InvitationDelivery)
        {
            var delivery = deliveryEnqueuer.Enqueue(dbContext, invitation, invitation.Organization.Name,
                BuildInviteUrl(options.PublicBaseUrl, token.RawToken), actor.Id, utcNow);
            AccountAudit.Add(dbContext, httpContext, nameof(OrganizationInvitation), invitation.Id,
                AccountAudit.InviteResent, invitation.OrganizationId, actor.Id, new
                {
                    invitation.Email, invitation.NormalizedEmail, invitation.FirstName,
                    invitation.LastName, invitation.IsOrganizationAdmin,
                    LabRoles = intendedLabRoles, BusinessRoles = intendedBusinessRoles,
                    DeliveryAttemptId = delivery.Id, DeliveryState = delivery.State
                });
            await dbContext.SaveChangesAsync(cancellationToken);
            return TypedResults.Ok(ToDto(invitation, utcNow, intendedLabRoles,
                intendedBusinessRoles, delivery));
        }
        await dbContext.SaveChangesAsync(cancellationToken);

        var sendResult = await emailSender.SendInvitationAsync(
            new InvitationEmailMessage(
                invitation.Id,
                invitation.Email,
                invitation.Organization.Name,
                BuildInviteUrl(options.PublicBaseUrl, token.RawToken)),
            cancellationToken);

        invitation.RecordSend(utcNow, actor.Id, sendResult.ProviderMessageId);
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
                ProviderMessageId = sendResult.ProviderMessageId,
                invitation.SendCount
            });
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToDto(invitation, utcNow, intendedLabRoles, intendedBusinessRoles));
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
        var intendedLabRoles = await ReadIntendedLabRolesAsync(
            dbContext,
            invitation.Id,
            cancellationToken);
        var intendedBusinessRoles = await ReadIntendedBusinessRolesAsync(
            dbContext,
            invitation.Id,
            cancellationToken);
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
        var deliveryAttempts = await dbContext.InvitationDeliveryAttempts
            .Where(value => value.OrganizationInvitationId == invitation.Id
                && value.State != InvitationDeliveryState.NeedsAttention)
            .ToListAsync(cancellationToken);
        foreach (var deliveryAttempt in deliveryAttempts)
            deliveryAttempt.RecordAccepted(utcNow);
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
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return TypedResults.Ok(ToDto(invitation, utcNow, intendedLabRoles,
            intendedBusinessRoles, deliveryAttempts.OrderByDescending(value => value.CreatedAt).FirstOrDefault()));
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

        return TypedResults.Ok(ToDto(invitation, utcNow, intendedLabRoles));
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

        return TypedResults.Ok(ToDto(invitation, utcNow, intendedLabRoles));
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
            .ToDictionary(group => group.Key,
                group => (IReadOnlyList<BusinessRole>)group.Select(intent => intent.Role).ToArray());
        var deliveries = await dbContext.InvitationDeliveryAttempts.AsNoTracking()
            .Where(value => invitationIds.Contains(value.OrganizationInvitationId))
            .OrderByDescending(value => value.CreatedAt)
            .ToListAsync(cancellationToken);
        var deliveryLookup = deliveries.GroupBy(value => value.OrganizationInvitationId)
            .ToDictionary(group => group.Key, group => group.First());

        return TypedResults.Ok(
            invitations
                .Select(invitation => ToDto(
                    invitation,
                    utcNow,
                    roleLookup.GetValueOrDefault(invitation.Id, []),
                    businessRoleLookup.GetValueOrDefault(invitation.Id, []),
                    deliveryLookup.GetValueOrDefault(invitation.Id)))
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
        IReadOnlyList<BusinessRole>? businessRoles = null,
        InvitationDeliveryAttempt? delivery = null)
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
            LatestDeliveryAttemptId = delivery?.Id,
            DeliveryState = delivery?.State,
            DeliveryAttemptCount = delivery?.AttemptCount ?? 0,
            DeliveryError = delivery?.LastError,
            DeliveredAtUtc = delivery?.DeliveredAtUtc,
            BouncedAtUtc = delivery?.BouncedAtUtc,
            BounceType = delivery?.BounceType,
            CreatedAt = invitation.CreatedAt,
            UpdatedAt = invitation.UpdatedAt,
            Version = invitation.Version
        };
    }

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
        return await dbContext.BusinessRoleInvitationIntents.AsNoTracking()
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
