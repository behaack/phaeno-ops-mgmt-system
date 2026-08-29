namespace PhaenoPortal.App.Features.Accounts.Endpoints;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.LabOperations.Services;
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
        IOptions<PSeqOrderToCashOptions> orderToCashOptions,
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

        var labRoles = await LabOperationsAuthorization.ActiveAssignmentsFor(
                dbContext.LabRoleAssignments.AsNoTracking(), user.Id)
            .Select(assignment => assignment.Role)
            .ToListAsync(cancellationToken);
        var businessRoles = await dbContext.BusinessRoleAssignments
            .AsNoTracking()
            .Where(assignment => assignment.UserId == user.Id && assignment.IsActive)
            .Select(assignment => assignment.Role)
            .ToListAsync(cancellationToken);

        if (!user.IsActive || user.Status != UserAccountStatus.Active)
        {
            return TypedResults.Ok(ToSession(
                user,
                labRoles,
                state: "disabled",
                selectedMembership: null,
                businessRoles,
                orderToCashOptions.Value.BusinessRoles,
                orderToCashOptions.Value.DualControlEnforced));
        }

        var activeMemberships = GetActiveMemberships(user).ToList();
        if (activeMemberships.Count == 0)
        {
            return TypedResults.Ok(ToSession(
                user,
                labRoles,
                state: "no_active_memberships",
                selectedMembership: null,
                businessRoles,
                orderToCashOptions.Value.BusinessRoles,
                orderToCashOptions.Value.DualControlEnforced));
        }

        var selectedOrganizationId = ReadSelectedOrganizationId(httpContext);
        OrganizationMembership? selectedMembership = null;

        if (selectedOrganizationId.HasValue)
        {
            selectedMembership = activeMemberships
                .FirstOrDefault(m => m.OrganizationId == selectedOrganizationId.Value);

            if (selectedMembership == null)
            {
                return TypedResults.Ok(ToSession(
                    user,
                    labRoles,
                    state: "organization_unavailable",
                    selectedMembership: null,
                    businessRoles,
                    orderToCashOptions.Value.BusinessRoles,
                    orderToCashOptions.Value.DualControlEnforced));
            }
        }

        return TypedResults.Ok(ToSession(
            user,
            labRoles,
            state: "ready",
            selectedMembership,
            businessRoles,
            orderToCashOptions.Value.BusinessRoles,
            orderToCashOptions.Value.DualControlEnforced));
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
        return AccountAuthorization.IsPlatformAdmin(user);
    }

    internal static bool CanInviteToOrganization(User user, Guid organizationId, OrganizationKind organizationKind)
    {
        return AccountAuthorization.CanInviteToOrganization(user, organizationId, organizationKind);
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

    internal static SessionDto ToSession(
        User user,
        IReadOnlyCollection<LabRole> labRoles,
        string state,
        OrganizationMembership? selectedMembership,
        IReadOnlyCollection<BusinessRole>? businessRoles = null,
        bool businessRolesEnabled = false,
        bool labRolesEnforced = false)
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
        var labCapabilities = LabOperationsAuthorization.Evaluate(
            user, labRoles, labRolesEnforced);
        var effectiveBusinessRoles = businessRoles ?? [];
        var canOperateCommercialWork = businessRolesEnabled
            ? effectiveBusinessRoles.Contains(BusinessRole.CommercialOperator)
            : isPlatformAdmin;
        var canReleasePSeqResults = businessRolesEnabled
            ? effectiveBusinessRoles.Contains(BusinessRole.ResultReleaseManager)
            : isPlatformAdmin;
        var canManagePSeqBilling = businessRolesEnabled
            ? effectiveBusinessRoles.Contains(BusinessRole.BillingOperator)
            : isPlatformAdmin;
        var canManagePSeqCash = businessRolesEnabled
            ? effectiveBusinessRoles.Contains(BusinessRole.CashOperator)
            : isPlatformAdmin;
        var canReconcilePSeqCash = businessRolesEnabled
            ? effectiveBusinessRoles.Contains(BusinessRole.CashReconciler)
            : isPlatformAdmin;
        var canPerformCommercialOperations = canOperateCommercialWork
            || canReleasePSeqResults
            || canManagePSeqBilling
            || canManagePSeqCash
            || canReconcilePSeqCash;

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
                CanViewAllOperationalOrders = isPlatformAdmin || canPerformCommercialOperations,
                CanManageOrderConfiguration = isPlatformAdmin,
                CanQuoteLabServiceWork = canOperateCommercialWork,
                CanManageLabOperations = labCapabilities.CanManageLabOperations,
                CanOperateLabWork = labCapabilities.CanOperateLabWork,
                CanSuperviseLabWork = labCapabilities.CanSuperviseLabWork,
                CanManageLabProtocols = labCapabilities.CanManageLabProtocols,
                CanReviewLabWork = labCapabilities.CanReviewLabWork,
                CanManageLabAccess = labCapabilities.CanManageLabAccess,
                CanManageReagentFulfillment = canOperateCommercialWork,
                CanManageDataAssembly = canOperateCommercialWork,
                CanManageOrderIntegrations = canOperateCommercialWork || canManagePSeqBilling,
                CanViewOrderAudit = isPlatformAdmin || canPerformCommercialOperations,
                CanOperateCommercialWork = canOperateCommercialWork,
                CanReleasePSeqResults = canReleasePSeqResults,
                CanManagePSeqBilling = canManagePSeqBilling,
                CanManagePSeqCash = canManagePSeqCash,
                CanReconcilePSeqCash = canReconcilePSeqCash
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
            CanOperateLabWork = false,
            CanSuperviseLabWork = false,
            CanManageLabProtocols = false,
            CanReviewLabWork = false,
            CanManageLabAccess = false,
            CanManageReagentFulfillment = false,
            CanManageDataAssembly = false,
            CanManageOrderIntegrations = false,
            CanViewOrderAudit = false,
            CanOperateCommercialWork = false,
            CanReleasePSeqResults = false,
            CanManagePSeqBilling = false,
            CanManagePSeqCash = false,
            CanReconcilePSeqCash = false
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
