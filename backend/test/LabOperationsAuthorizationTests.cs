namespace PhaenoPortal.Test;

using System.Reflection;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.LabOperations.Services;

public class LabOperationsAuthorizationTests
{
    public static TheoryData<LabRole, bool, bool, bool, bool, bool> RoleCapabilities =>
        new()
        {
            { LabRole.Operator, true, false, false, false, false },
            { LabRole.Supervisor, true, true, false, false, false },
            { LabRole.ProtocolAdministrator, false, false, true, false, false },
            { LabRole.ScientificReviewer, false, false, false, true, false },
            { LabRole.OperationsAdministrator, true, true, true, true, true }
        };

    [Theory]
    [MemberData(nameof(RoleCapabilities))]
    public void EachAdditiveRoleProjectsOnlyItsIntendedCapabilities(
        LabRole role,
        bool canOperate,
        bool canSupervise,
        bool canManageProtocols,
        bool canReview,
        bool canManageAccess)
    {
        var (user, _) = CreatePhaenoUser(isPlatformAdmin: false);
        var roles = new HashSet<LabRole> { role };

        var policy = LabOperationsAuthorization.Evaluate(user, roles);
        var session = SessionEndpoints.ToSession(user, roles, "ready", null);

        Assert.True(policy.CanManageLabOperations);
        Assert.Equal(canOperate, policy.CanOperateLabWork);
        Assert.Equal(canSupervise, policy.CanSuperviseLabWork);
        Assert.Equal(canManageProtocols, policy.CanManageLabProtocols);
        Assert.Equal(canReview, policy.CanReviewLabWork);
        Assert.Equal(canManageAccess, policy.CanManageLabAccess);
        Assert.Equal(policy.CanManageLabOperations, session.Capabilities.CanManageLabOperations);
        Assert.Equal(policy.CanOperateLabWork, session.Capabilities.CanOperateLabWork);
        Assert.Equal(policy.CanSuperviseLabWork, session.Capabilities.CanSuperviseLabWork);
        Assert.Equal(policy.CanManageLabProtocols, session.Capabilities.CanManageLabProtocols);
        Assert.Equal(policy.CanReviewLabWork, session.Capabilities.CanReviewLabWork);
        Assert.Equal(policy.CanManageLabAccess, session.Capabilities.CanManageLabAccess);
    }

    [Fact]
    public void PlatformAdministratorBootstrapsEveryLabCapabilityWithoutAnAssignment()
    {
        var (user, _) = CreatePhaenoUser(isPlatformAdmin: true);

        var capabilities = LabOperationsAuthorization.Evaluate(user, []);
        var actor = new LabOperationsActor(user, new HashSet<LabRole>());

        Assert.True(capabilities.CanManageLabOperations);
        Assert.True(capabilities.CanOperateLabWork);
        Assert.True(capabilities.CanSuperviseLabWork);
        Assert.True(capabilities.CanManageLabProtocols);
        Assert.True(capabilities.CanReviewLabWork);
        Assert.True(capabilities.CanManageLabAccess);
        Assert.True(actor.HasAny(
            LabRole.Operator,
            LabRole.Supervisor,
            LabRole.ProtocolAdministrator,
            LabRole.ScientificReviewer,
            LabRole.OperationsAdministrator));
    }

    [Fact]
    public void OrdinaryPhaenoMemberWithoutALabRoleHasNoLabCapability()
    {
        var (user, _) = CreatePhaenoUser(isPlatformAdmin: false);

        var capabilities = LabOperationsAuthorization.Evaluate(user, []);
        var session = SessionEndpoints.ToSession(user, [], "ready", null);

        Assert.False(capabilities.CanManageLabOperations);
        Assert.False(capabilities.CanOperateLabWork);
        Assert.False(capabilities.CanSuperviseLabWork);
        Assert.False(capabilities.CanManageLabProtocols);
        Assert.False(capabilities.CanReviewLabWork);
        Assert.False(capabilities.CanManageLabAccess);
        Assert.False(session.Capabilities.CanManageLabOperations);
    }

    [Fact]
    public void DisabledPhaenoUserCannotRetainCapabilitiesFromAnActiveAssignment()
    {
        var (user, _) = CreatePhaenoUser(isPlatformAdmin: false);
        user.Deactivate();
        var roles = new HashSet<LabRole> { LabRole.OperationsAdministrator };

        var capabilities = LabOperationsAuthorization.Evaluate(user, roles);
        var actor = new LabOperationsActor(user, roles);
        var session = SessionEndpoints.ToSession(user, roles, "disabled", null);

        Assert.False(capabilities.CanManageLabOperations);
        Assert.False(capabilities.CanOperateLabWork);
        Assert.False(capabilities.CanSuperviseLabWork);
        Assert.False(capabilities.CanManageLabProtocols);
        Assert.False(capabilities.CanReviewLabWork);
        Assert.False(capabilities.CanManageLabAccess);
        Assert.False(actor.HasAny(LabRole.OperationsAdministrator));
        Assert.False(session.Capabilities.CanManageLabOperations);
    }

    [Fact]
    public void ExternalOrganizationMemberCannotReceiveLabCapabilities()
    {
        var (user, _) = CreateUser(OrganizationKind.Customer, isOrganizationAdmin: true);
        var roles = new HashSet<LabRole> { LabRole.OperationsAdministrator };

        var capabilities = LabOperationsAuthorization.Evaluate(user, roles);
        var actor = new LabOperationsActor(user, roles);

        Assert.False(LabOperationsAuthorization.IsEligibleLabStaff(user));
        Assert.False(capabilities.CanManageLabOperations);
        Assert.False(actor.HasAny(LabRole.OperationsAdministrator));
    }

    [Fact]
    public void ActiveAssignmentQueryExcludesInactiveAndOtherUsersRoles()
    {
        var userId = Guid.NewGuid();
        var active = new LabRoleAssignment(userId, LabRole.Operator);
        var inactive = new LabRoleAssignment(userId, LabRole.OperationsAdministrator);
        inactive.SetActive(false);
        var otherUser = new LabRoleAssignment(Guid.NewGuid(), LabRole.Supervisor);

        var assignments = LabOperationsAuthorization.ActiveAssignmentsFor(
                new[] { active, inactive, otherUser }.AsQueryable(),
                userId)
            .ToList();

        var assignment = Assert.Single(assignments);
        Assert.Equal(active.Id, assignment.Id);
    }

    [Fact]
    public void ActorRequiresOneOfTheExplicitlyAssignedRoles()
    {
        var (user, _) = CreatePhaenoUser(isPlatformAdmin: false);
        var actor = new LabOperationsActor(
            user,
            new HashSet<LabRole> { LabRole.ProtocolAdministrator });

        Assert.True(actor.HasAny(LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator));
        Assert.False(actor.HasAny(LabRole.Operator, LabRole.Supervisor));
    }

    private static (User User, OrganizationMembership Membership) CreatePhaenoUser(
        bool isPlatformAdmin) =>
        CreateUser(OrganizationKind.Phaeno, isPlatformAdmin);

    private static (User User, OrganizationMembership Membership) CreateUser(
        OrganizationKind organizationKind,
        bool isOrganizationAdmin)
    {
        var organization = new Organization(organizationKind.ToString(), organizationKind);
        var user = new User("lab.user@phaeno.com", "Lab", "User");
        user.Activate();
        var membership = new OrganizationMembership(
            user.Id,
            organization.Id,
            isOrganizationAdmin);
        typeof(OrganizationMembership)
            .GetProperty(
                nameof(OrganizationMembership.Organization),
                BindingFlags.Instance | BindingFlags.Public)!
            .SetValue(membership, organization);
        user.Memberships.Add(membership);
        return (user, membership);
    }
}
