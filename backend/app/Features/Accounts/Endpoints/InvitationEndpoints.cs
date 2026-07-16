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
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class InvitationEndpoints
{
    public static async Task<IResult> CreateInvitation(
        [FromBody] CreateInvitationRequest request,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        InvitationTokenService tokenService,
        IInvitationEmailSender emailSender,
        IExternalIdentityContext externalIdentityContext,
        IOptions<InvitationOptions> invitationOptions,
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
                request.IsOrganizationAdmin,
                token.TokenHash,
                expiresAt);
            dbContext.OrganizationInvitations.Add(invitation);
        }
        else
        {
            invitation = pendingInvitation;
            invitation.UpdateIntendedMembership(request.IsOrganizationAdmin);
            invitation.RotateToken(token.TokenHash, expiresAt);
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
                invitation.IsOrganizationAdmin,
                ProviderMessageId = sendResult.ProviderMessageId,
                invitation.SendCount
            });
        await dbContext.SaveChangesAsync(cancellationToken);

        invitation = await dbContext.OrganizationInvitations
            .Include(i => i.Organization)
            .FirstAsync(i => i.Id == invitation.Id, cancellationToken);

        return TypedResults.Created($"/api/invitations/{invitation.Id}", ToDto(invitation, utcNow));
    }

    public static async Task<IResult> ResendInvitation(
        Guid id,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        InvitationTokenService tokenService,
        IInvitationEmailSender emailSender,
        IExternalIdentityContext externalIdentityContext,
        IOptions<InvitationOptions> invitationOptions,
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

        var token = tokenService.CreateToken();
        invitation.RotateToken(token.TokenHash, utcNow.AddDays(options.TokenLifetimeDays));
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
                invitation.IsOrganizationAdmin,
                ProviderMessageId = sendResult.ProviderMessageId,
                invitation.SendCount
            });
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToDto(invitation, utcNow));
    }

    public static async Task<IResult> AcceptInvitation(
        [FromBody] AcceptInvitationRequest request,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        InvitationTokenService tokenService,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var identity = externalIdentityContext.Read(httpContext);
        if (identity == null)
        {
            return TypedResults.Unauthorized();
        }

        if (!identity.IsEmailVerified)
        {
            throw new BadRequestException("Invitation email must match a verified authenticated email.");
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

        ValidateInvitationForAuthenticatedEmail(invitation, identity, utcNow);

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.NormalizedEmail == invitation.NormalizedEmail, cancellationToken);

        if (user?.Status == UserAccountStatus.Disabled)
        {
            throw new BadRequestException("Invitation cannot be accepted for a disabled user.");
        }

        if (user == null)
        {
            user = new User(invitation.Email, request.FirstName, request.LastName);
            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        user.AcceptInvitation(
            request.FirstName,
            request.LastName,
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
                invitation.IsOrganizationAdmin,
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

        return TypedResults.Ok(ToDto(invitation, utcNow));
    }

    public static async Task<IResult> DeclineInvitation(
        [FromBody] DeclineInvitationRequest request,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        InvitationTokenService tokenService,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var identity = externalIdentityContext.Read(httpContext);
        if (identity == null)
        {
            return TypedResults.Unauthorized();
        }

        if (!identity.IsEmailVerified)
        {
            throw new BadRequestException("Invitation email must match a verified authenticated email.");
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

        ValidateInvitationForAuthenticatedEmail(invitation, identity, utcNow);

        var declinedByUserId = await dbContext.Users
            .Where(u => u.NormalizedEmail == invitation.NormalizedEmail)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync(cancellationToken);

        invitation.Decline(declinedByUserId, utcNow);
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

        return TypedResults.Ok(ToDto(invitation, utcNow));
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

        return TypedResults.Ok(ToDto(invitation, utcNow));
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

        return TypedResults.Ok(invitations.Select(invitation => ToDto(invitation, utcNow)).ToList());
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

    private static InvitationDto ToDto(OrganizationInvitation invitation, DateTime utcNow)
    {
        return new InvitationDto
        {
            Id = invitation.Id,
            OrganizationId = invitation.OrganizationId,
            OrganizationName = invitation.Organization?.Name,
            Email = invitation.Email,
            NormalizedEmail = invitation.NormalizedEmail,
            IsOrganizationAdmin = invitation.IsOrganizationAdmin,
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
