namespace PhaenoPortal.App.Features.Accounts.Endpoints;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

public static class SessionEndpoints
{
    private const string SelectedOrganizationHeader = "X-Organization-Id";

    public static async Task<IResult> GetSession(
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        IOptions<BootstrapOptions> bootstrapOptions,
        CancellationToken cancellationToken)
    {
        var identity = externalIdentityContext.Read(httpContext);
        if (identity == null)
        {
            return TypedResults.Ok(UnauthorizedSession());
        }

        var user = await dbContext.Users
            .Include(u => u.Memberships)
            .ThenInclude(m => m.Organization)
            .FirstOrDefaultAsync(
                u => u.ExternalIdentityProvider == identity.Provider
                    && u.ExternalSubjectId == identity.SubjectId,
                cancellationToken);

        if (user == null)
        {
            user = await TryLinkBootstrapUserAsync(
                identity,
                dbContext,
                bootstrapOptions.Value,
                cancellationToken);

            if (user == null)
            {
                return TypedResults.Ok(UnauthorizedSession());
            }
        }

        if (!user.IsActive || user.Status != UserAccountStatus.Active)
        {
            return TypedResults.Ok(ToSession(user, state: "disabled", selectedMembership: null));
        }

        var activeMemberships = GetActiveMemberships(user).ToList();
        if (activeMemberships.Count == 0)
        {
            return TypedResults.Ok(ToSession(user, state: "no_active_memberships", selectedMembership: null));
        }

        var selectedOrganizationId = ReadSelectedOrganizationId(httpContext);
        OrganizationMembership? selectedMembership = null;

        if (selectedOrganizationId.HasValue)
        {
            selectedMembership = activeMemberships
                .FirstOrDefault(m => m.OrganizationId == selectedOrganizationId.Value);

            if (selectedMembership == null)
            {
                return TypedResults.Ok(ToSession(user, state: "organization_unavailable", selectedMembership: null));
            }
        }

        return TypedResults.Ok(ToSession(user, state: "ready", selectedMembership));
    }

    public static void MapSessionEndpoints(this WebApplication app)
    {
        app.MapGet("/api/session", GetSession)
            .WithName("GetSession")
            .WithSummary("Get the current local Phaeno session state")
            .RequireAuthorization()
            .Produces<SessionDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);
    }

    internal static IReadOnlyList<OrganizationMembership> GetActiveMemberships(User user)
    {
        return user.Memberships
            .Where(m => m.IsActive && m.Organization?.IsActive == true)
            .OrderBy(m => m.Organization!.Name)
            .ToList();
    }

    internal static bool IsPlatformAdmin(User user)
    {
        return AccountAccess.IsPlatformAdmin(user);
    }

    internal static bool CanInviteToOrganization(User user, Guid organizationId, OrganizationKind organizationKind)
    {
        return AccountAccess.CanInviteToOrganization(user, organizationId, organizationKind);
    }

    private static SessionDto UnauthorizedSession()
    {
        return new SessionDto
        {
            State = "unauthorized",
            User = null,
            Memberships = [],
            IsPlatformAdmin = false,
            SelectedOrganization = null,
            Capabilities = EmptyCapabilities()
        };
    }

    private static SessionDto ToSession(
        User user,
        string state,
        OrganizationMembership? selectedMembership)
    {
        var memberships = GetActiveMemberships(user);
        var isPlatformAdmin = IsPlatformAdmin(user);
        var canManageSelectedMembers = selectedMembership?.IsOrganizationAdmin == true || isPlatformAdmin;
        var canViewOrganizationDatasets = selectedMembership?.Organization is
        {
            IsActive: true
        } selectedOrganization && selectedOrganization.IsExternalOrganization();
        var selectedKind = selectedMembership?.Organization?.Kind;
        var isSelectedOrganizationAdmin = selectedMembership?.IsOrganizationAdmin == true;
        var canViewLabOrders = selectedKind == OrganizationKind.Customer;
        var canManageLabOrders = canViewLabOrders && isSelectedOrganizationAdmin;
        var canViewPartnerOrders = selectedKind == OrganizationKind.Partner;
        var canManagePartnerOrders = canViewPartnerOrders && isSelectedOrganizationAdmin;

        return new SessionDto
        {
            State = state,
            User = new SessionUserDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Status = user.Status
            },
            Memberships = memberships.Select(m => new SessionMembershipDto
            {
                MembershipId = m.Id,
                OrganizationId = m.OrganizationId,
                OrganizationName = m.Organization!.Name,
                OrganizationKind = m.Organization.Kind,
                IsOrganizationAdmin = m.IsOrganizationAdmin
            }).ToList(),
            IsPlatformAdmin = isPlatformAdmin,
            SelectedOrganization = selectedMembership == null
                ? null
                : new SessionSelectedOrganizationDto
                {
                    OrganizationId = selectedMembership.OrganizationId,
                    MembershipId = selectedMembership.Id,
                    IsAvailable = true
                },
            Capabilities = new SessionCapabilitiesDto
            {
                CanInviteUsers = canManageSelectedMembers,
                CanManageMembers = canManageSelectedMembers,
                CanChangeMemberRoles = canManageSelectedMembers,
                CanLeaveOrganization = selectedMembership != null,
                CanManageOrganizations = isPlatformAdmin,
                CanManageAllUsers = isPlatformAdmin,
                CanDisableUsers = isPlatformAdmin,
                CanViewDatasetConfiguration = isPlatformAdmin,
                CanManageDatasetDrafts = isPlatformAdmin,
                CanPublishDatasets = isPlatformAdmin,
                CanProvisionOrganizationData = isPlatformAdmin,
                CanViewOrganizationDatasets = canViewOrganizationDatasets,
                CanViewLabServiceOrders = canViewLabOrders,
                CanCreateLabServiceRequests = canManageLabOrders,
                CanSubmitLabServiceRequests = canManageLabOrders,
                CanAcceptLabServiceQuotes = canManageLabOrders,
                CanRequestLabServiceCancellation = canManageLabOrders,
                CanViewSampleProgress = canViewLabOrders,
                CanDownloadLabResults = canViewLabOrders,
                CanViewReagentOrders = canViewPartnerOrders,
                CanCreateReagentOrders = canManagePartnerOrders,
                CanPlaceReagentOrders = canManagePartnerOrders,
                CanApproveReagentSubstitutions = canManagePartnerOrders,
                CanRequestReagentCancellation = canManagePartnerOrders,
                CanViewDataAssemblyRequests = canViewPartnerOrders,
                CanCreateDataAssemblyRequests = canManagePartnerOrders,
                CanSubmitDataAssemblyRequests = canManagePartnerOrders,
                CanAcceptDataAssemblyQuotes = canManagePartnerOrders,
                CanRequestDataAssemblyCancellation = canManagePartnerOrders,
                CanDownloadDataAssemblyOutputs = canViewPartnerOrders,
                CanViewAllOperationalOrders = isPlatformAdmin,
                CanManageOrderConfiguration = isPlatformAdmin,
                CanQuoteLabServiceWork = isPlatformAdmin,
                CanManageLabOperations = isPlatformAdmin,
                CanManageReagentFulfillment = isPlatformAdmin,
                CanManageDataAssembly = isPlatformAdmin,
                CanManageOrderIntegrations = isPlatformAdmin,
                CanViewOrderAudit = isPlatformAdmin
            }
        };
    }

    private static SessionCapabilitiesDto EmptyCapabilities()
    {
        return new SessionCapabilitiesDto
        {
            CanInviteUsers = false,
            CanManageMembers = false,
            CanChangeMemberRoles = false,
            CanLeaveOrganization = false,
            CanManageOrganizations = false,
            CanManageAllUsers = false,
            CanDisableUsers = false,
            CanViewDatasetConfiguration = false,
            CanManageDatasetDrafts = false,
            CanPublishDatasets = false,
            CanProvisionOrganizationData = false,
            CanViewOrganizationDatasets = false,
            CanViewLabServiceOrders = false,
            CanCreateLabServiceRequests = false,
            CanSubmitLabServiceRequests = false,
            CanAcceptLabServiceQuotes = false,
            CanRequestLabServiceCancellation = false,
            CanViewSampleProgress = false,
            CanDownloadLabResults = false,
            CanViewReagentOrders = false,
            CanCreateReagentOrders = false,
            CanPlaceReagentOrders = false,
            CanApproveReagentSubstitutions = false,
            CanRequestReagentCancellation = false,
            CanViewDataAssemblyRequests = false,
            CanCreateDataAssemblyRequests = false,
            CanSubmitDataAssemblyRequests = false,
            CanAcceptDataAssemblyQuotes = false,
            CanRequestDataAssemblyCancellation = false,
            CanDownloadDataAssemblyOutputs = false,
            CanViewAllOperationalOrders = false,
            CanManageOrderConfiguration = false,
            CanQuoteLabServiceWork = false,
            CanManageLabOperations = false,
            CanManageReagentFulfillment = false,
            CanManageDataAssembly = false,
            CanManageOrderIntegrations = false,
            CanViewOrderAudit = false
        };
    }

    private static Guid? ReadSelectedOrganizationId(HttpContext httpContext)
    {
        if (!httpContext.Request.Headers.TryGetValue(SelectedOrganizationHeader, out var values))
        {
            return null;
        }

        return Guid.TryParse(values.FirstOrDefault(), out var organizationId)
            ? organizationId
            : null;
    }

    private static async Task<User?> TryLinkBootstrapUserAsync(
        ExternalIdentity identity,
        PSeqOperationsDbContext dbContext,
        BootstrapOptions bootstrapOptions,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(bootstrapOptions.AdminEmail)
            || !identity.IsEmailVerified)
        {
            return null;
        }

        var normalizedBootstrapEmail = User.NormalizeEmail(bootstrapOptions.AdminEmail);
        if (!string.Equals(
            User.NormalizeEmail(identity.Email),
            normalizedBootstrapEmail,
            StringComparison.Ordinal))
        {
            return null;
        }

        var user = await dbContext.Users
            .Include(u => u.Memberships)
            .ThenInclude(m => m.Organization)
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedBootstrapEmail, cancellationToken);

        if (user == null || user.HasLinkedExternalIdentity())
        {
            return null;
        }

        user.LinkExternalIdentity(identity.Provider, identity.SubjectId);
        user.Activate();
        dbContext.AuditEvents.Add(new AuditEvent(
            entityName: nameof(User),
            entityId: user.Id.ToString(),
            operation: "BootstrapIdentityLinked",
            organizationId: null,
            actorUserId: user.Id,
            requestId: null,
            occurredAt: DateTime.UtcNow,
            changesJson: JsonSerializer.Serialize(new
            {
                externalIdentityProvider = identity.Provider,
                externalSubjectId = identity.SubjectId
            }, new JsonSerializerOptions(JsonSerializerDefaults.Web))));

        await dbContext.SaveChangesAsync(cancellationToken);

        return user;
    }
}
