namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Crm.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.DataProvisioning.Application;
using PSeq.Operations.Commercial.DataProvisioning.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class InvitationAcceptancePostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task CompanyAndMembershipRestorationRetainWorkGrantsAndIdentityWithoutRestoringAccessEarly()
    {
        await using var scope = await Scope.Create();
        var contact = await scope.Contact();
        var invitation = await scope.Invite(contact);
        var identity = scope.Invited(contact);
        await scope.Accept(await scope.Token(invitation.Id), identity);
        scope.Db.ChangeTracker.Clear();
        var user = await scope.Db.Users.SingleAsync(item => item.NormalizedEmail == contact.NormalizedEmail);
        var actor = (await AccountAccess.ReadActiveActorAsync(scope.Http, scope.Db, scope.AdminIdentity, default))!;
        var membership = await scope.Db.OrganizationMemberships.SingleAsync(item => item.UserId == user.Id);
        var assignment = await scope.Db.OrganizationDepartmentMemberships.SingleAsync(item => item.OrganizationMembershipId == membership.Id);
        var company = await scope.Db.CrmCompanies.SingleAsync(item => item.AccessOrganizationId == scope.Organization.Id);
        var order = new LabServiceOrder(scope.Organization.Id, scope.Research.Id, "SIMULATED-ACCESS-HISTORY", "SIMULATED retained work", null, 1, false, "RNA", "Frozen", "No hazard", "TEST ONLY");
        var grant = LifecycleGrant(scope, actor.Id);
        var other = new Organization("SIMULATED independent relationship", OrganizationKind.Customer);
        var otherMembership = new OrganizationMembership(user.Id, other.Id, false);
        var otherAssignment = new OrganizationDepartmentMembership(otherMembership.Id, other.Departments.Single().Id, false);
        scope.Db.AddRange(order, other, otherMembership, otherAssignment);
        await scope.Db.SaveChangesAsync();
        var history = await History();
        var controller = new CrmCompaniesController(scope.Db, scope.AdminIdentity) { ControllerContext = new() { HttpContext = scope.Http } };
        var disabled = await controller.DeactivateCompany(company.Id, new() { Version = company.Version }, default);
        Assert.False(disabled.IsActive);
        Assert.False((await scope.Db.Organizations.AsNoTracking().SingleAsync(item => item.Id == scope.Organization.Id)).IsActive);
        await AssertTargetUnavailable();
        Assert.Equal(history, await History());
        Assert.True((await scope.Db.OrganizationMemberships.AsNoTracking().SingleAsync(item => item.Id == membership.Id)).IsActive);
        var restored = await controller.ReactivateCompany(company.Id, new() { Version = disabled.Version }, default);
        Assert.Equal(company.Id, restored.Id);
        Assert.True(restored.IsActive);
        await AssertTargetAvailable();
        Assert.Equal(history, await History());

        await MembershipEndpoints.DeactivateMembership(membership.Id, scope.Http, scope.Db, scope.AdminIdentity, default);
        await AssertTargetUnavailable();
        Assert.False((await scope.Db.OrganizationDepartmentMemberships.AsNoTracking().SingleAsync(item => item.Id == assignment.Id)).IsActive);
        Assert.True((await scope.Db.OrganizationMemberships.AsNoTracking().SingleAsync(item => item.Id == otherMembership.Id)).IsActive);
        Assert.Equal(history, await History());
        // Existing-user invitations retain the already-established CRM identity link.
        var fresh = await scope.Invite(contact, linkContact: false);
        Assert.NotEqual(invitation.Id, fresh.Id);
        Assert.Equal(InvitationStatus.Pending, fresh.Status);
        await AssertTargetUnavailable();
        await scope.Accept(await scope.Token(fresh.Id), identity);
        await AssertTargetAvailable();
        Assert.Equal(membership.Id, (await scope.Db.OrganizationMemberships.AsNoTracking().SingleAsync(item => item.UserId == user.Id && item.OrganizationId == scope.Organization.Id)).Id);
        Assert.True((await scope.Db.OrganizationDepartmentMemberships.AsNoTracking().SingleAsync(item => item.Id == assignment.Id)).IsActive);
        Assert.Single(await scope.Db.Users.Where(item => item.NormalizedEmail == contact.NormalizedEmail).ToListAsync());
        Assert.Equal(user.Id, (await scope.Db.CrmContactUserLinks.SingleAsync(item => item.ContactId == contact.Id)).UserId);
        Assert.Equal(history, await History());
        var membershipAudit = await scope.Db.AuditEvents.Where(item => item.EntityId == membership.Id.ToString()).ToListAsync();
        Assert.Contains(membershipAudit, item => item.Operation == AccountAudit.MembershipDeactivated);
        Assert.Contains(membershipAudit, item => item.Operation == AccountAudit.MembershipReactivatedByInvite);
        Assert.Equal(2, await scope.Db.AuditEvents.CountAsync(item => item.EntityId == company.Id.ToString() && item.Operation == "Updated"));

        async Task AssertTargetUnavailable()
        {
            var session = await scope.Session(identity);
            Assert.DoesNotContain(session.Memberships, item => item.OrganizationId == scope.Organization.Id);
            Assert.Contains(session.Memberships, item => item.OrganizationId == other.Id);
            scope.Db.ChangeTracker.Clear();
            var http = TenantHttp();
            Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => new OrderRequestContext(scope.Db, new IdentityContext(identity)).RequireTenantAsync(http, OrganizationKind.Customer, false, default))).StatusCode);
        }
        async Task AssertTargetAvailable()
        {
            var session = await scope.Session(identity);
            Assert.Equal("ready", session.State);
            Assert.Equal(scope.Research.Id, session.SelectedDepartment!.DepartmentId);
            Assert.Contains(session.Memberships, item => item.OrganizationId == other.Id);
            scope.Db.ChangeTracker.Clear();
            var tenant = await new OrderRequestContext(scope.Db, new IdentityContext(identity)).RequireTenantAsync(TenantHttp(), OrganizationKind.Customer, false, default);
            Assert.Equal(membership.Id, tenant.Membership.Id);
        }
        DefaultHttpContext TenantHttp()
        {
            var http = new DefaultHttpContext(); http.Request.Headers["X-Organization-Id"] = scope.Organization.Id.ToString(); http.Request.Headers["X-Department-Id"] = scope.Research.Id.ToString(); return http;
        }
        async Task<string> History()
        {
            var savedOrder = await scope.Db.LabServiceOrders.AsNoTracking().SingleAsync(item => item.Id == order.Id);
            var savedGrant = await scope.Db.OrganizationDatasetGrants.AsNoTracking().SingleAsync(item => item.Id == grant.Id);
            var originalInvite = await scope.Db.OrganizationInvitations.AsNoTracking().SingleAsync(item => item.Id == invitation.Id);
            return JsonSerializer.Serialize(new { Order = new { savedOrder.Id, savedOrder.Version, savedOrder.Status }, Grant = new { savedGrant.Id, savedGrant.Version, savedGrant.Status, savedGrant.CuratedDatasetVersionId, savedGrant.GrantedAt }, Invitation = new { originalInvite.Id, originalInvite.Version, originalInvite.Status, originalInvite.AcceptedAt } });
        }
    }

    [PostgreSqlReferenceFact]
    public async Task EmployeeDisableRestorePreservesMembershipAndRolesAndRejectsAdministratorSelfDisable()
    {
        await using var scope = await Scope.Create();
        var actor = (await AccountAccess.ReadActiveActorAsync(scope.Http, scope.Db, scope.AdminIdentity, default))!;
        var staff = await scope.Db.Organizations.SingleAsync(item => item.Kind == OrganizationKind.Phaeno);
        var identity = Scope.Identity("employee@example.test");
        var employee = new User(identity.Email, "SIMULATED", "Operator"); employee.Activate(); employee.LinkExternalIdentity(identity.Provider, identity.SubjectId);
        var membership = new OrganizationMembership(employee.Id, staff.Id, false);
        var assignment = new OrganizationDepartmentMembership(membership.Id, staff.Departments.Single().Id, false);
        var role = new LabRoleAssignment(employee.Id, LabRole.Operator);
        scope.Db.AddRange(employee, membership, assignment, role); await scope.Db.SaveChangesAsync();
        Assert.True((await scope.Session(identity, staff.Id, assignment.DepartmentId)).Capabilities.CanOperateLabWork);
        scope.Db.ChangeTracker.Clear();
        await UserEndpoints.DisableUser(employee.Id, scope.Http, scope.Db, scope.AdminIdentity, default);
        var disabled = await scope.Session(identity, staff.Id, assignment.DepartmentId);
        Assert.Equal("disabled", disabled.State);
        Assert.False(disabled.Capabilities.CanOperateLabWork);
        Assert.Null(await AccountAccess.ReadActiveActorAsync(scope.Http, scope.Db, new IdentityContext(identity), default));
        Assert.True((await scope.Db.OrganizationMemberships.AsNoTracking().SingleAsync(item => item.Id == membership.Id)).IsActive);
        Assert.True((await scope.Db.LabRoleAssignments.AsNoTracking().SingleAsync(item => item.Id == role.Id)).IsActive);
        await UserEndpoints.ReactivateUser(employee.Id, scope.Http, scope.Db, scope.AdminIdentity, default);
        var restored = await scope.Session(identity, staff.Id, assignment.DepartmentId);
        Assert.True(restored.Capabilities.CanOperateLabWork);
        Assert.False(restored.IsPlatformAdmin);
        Assert.False(restored.Capabilities.CanManageAllUsers);
        Assert.Single(await scope.Db.LabRoleAssignments.Where(item => item.UserId == employee.Id).ToListAsync());
        var audit = await scope.Db.AuditEvents.Where(item => item.EntityId == employee.Id.ToString()).ToListAsync();
        Assert.Contains(audit, item => item.Operation == AccountAudit.UserDisabled);
        Assert.Contains(audit, item => item.Operation == AccountAudit.UserReactivated);
        Assert.IsType<ForbidHttpResult>(await UserEndpoints.DisableUser(actor.Id, scope.Http, scope.Db, scope.AdminIdentity, default));
        scope.Db.ChangeTracker.Clear();
        Assert.True(AccountAuthorization.IsPlatformAdmin((await AccountAccess.ReadActiveActorAsync(scope.Http, scope.Db, scope.AdminIdentity, default))!));
    }

    private static OrganizationDatasetGrant LifecycleGrant(Scope scope, Guid actorId)
    {
        var now = DateTime.UtcNow;
        var source = new SourceSample("SIMULATED retained source", true);
        source.UpdateMetadata(source.Label, "Fixture", "Synthetic context", "Synthetic assay", "Synthetic analysis", "Passed", "Automated fixture");
        source.ConfirmOwnership("Synthetic fixture", "TEST ONLY", actorId, now);
        source.ConfirmDeidentification("Synthetic only", null, actorId, now);
        var file = new ManagedFile(source.Id, "fixture.json", "structured_fixture", "application/json", 2, new string('a', 64), "simulated/access-history.json");
        file.RecordScan(ManagedFileScanStatus.Clean, "Simulated metadata only"); source.Files.Add(file); source.MarkReady(actorId, now);
        var dataset = new CuratedDataset("SIMULATED retained grant", "Metadata-only preservation fixture");
        var version = new CuratedDatasetVersion(dataset.Id, 1, source, "SIMULATED", now);
        version.Files.Add(new CuratedDatasetVersionFile(version.Id, file));
        var manifest = DatasetManifestService.Build(version); version.SetManifest(manifest.ManifestJson, manifest.ContentChecksum); version.Publish(actorId, now);
        var organization = scope.Db.Organizations.Single(item => item.Id == scope.Organization.Id);
        var department = scope.Db.OrganizationDepartments.Single(item => item.Id == scope.Research.Id);
        var grant = new OrganizationDatasetGrant(organization, dataset, version, actorId, now, department);
        scope.Db.AddRange(source, dataset, version, grant); return grant;
    }
}
