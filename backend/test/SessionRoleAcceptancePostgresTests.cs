namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using PhaenoPortal.App.Features.Crm.Controllers;
using PhaenoPortal.App.Features.Crm.Services;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class InvitationAcceptancePostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task PendingLabRoleIntentGrantsNothingAndAcceptedRoleChangesApplyToFreshRequests()
    {
        await using var scope = await Scope.Create();
        var staff = await scope.Db.Organizations.Include(item => item.Departments).SingleAsync(item => item.Kind == OrganizationKind.Phaeno);
        var department = staff.Departments.Single();
        var identity = Scope.Identity("simulated-lab-roles@example.test") with { Provider = "clerk" };
        var labeledHttp = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim("sub", identity.SubjectId), new Claim("email", identity.Email), new Claim("email_verified", "true"),
            new Claim(ClaimTypes.Role, "ScientificReviewer"), new Claim("job_title", "Scientific Reviewer"),
            new Claim("org_role", "admin")], "Simulated")) };
        Assert.Equal(identity, new ClaimsExternalIdentityContext().Read(labeledHttp));
        var invitation = Assert.IsType<Created<InvitationDto>>(await InvitationEndpoints.CreateInvitation(
            new() { OrganizationId = staff.Id, FirstName = "SIMULATED", LastName = "Scientific Reviewer", Email = identity.Email,
                Departments = [new(department.Id, false)], LabRoles = [LabRole.Operator, LabRole.ProtocolAdministrator] },
            scope.Http, scope.Db, scope.Tokens, scope.Sender, scope.Protector, scope.AdminIdentity,
            Options.Create(new InvitationOptions { PublicBaseUrl = "https://portal.example.test" }),
            Options.Create(new PSeqOrderToCashOptions { InvitationDelivery = true }), default)).Value!;
        Assert.Equal(InvitationStatus.Pending, invitation.Status);
        Assert.False(await scope.Db.Users.AnyAsync(item => item.NormalizedEmail == identity.Email.ToUpperInvariant()));
        Assert.Empty(await scope.Db.LabRoleAssignments.ToListAsync());
        var pending = await scope.Session(identity, staff.Id, department.Id);
        Assert.False(pending.Capabilities.CanOperateLabWork);
        Assert.False(pending.Capabilities.CanManageLabProtocols);
        await RequireDenied(LabRole.Operator, "active_actor_required");

        await scope.Accept(await scope.Token(invitation.Id), identity);
        var accepted = await scope.Session(identity, staff.Id, department.Id);
        Assert.True(accepted.Capabilities.CanOperateLabWork);
        Assert.True(accepted.Capabilities.CanManageLabProtocols);
        Assert.False(accepted.Capabilities.CanReviewLabWork);
        Assert.False(accepted.Capabilities.CanSuperviseLabWork);
        Assert.False(accepted.Capabilities.CanManageLabAccess);
        Assert.False(accepted.IsPlatformAdmin);
        Assert.False(accepted.Capabilities.CanManageAllUsers);
        await RequireAllowed(LabRole.Operator);
        await RequireAllowed(LabRole.ProtocolAdministrator);
        await RequireDenied(LabRole.ScientificReviewer, "lab_capability_required");
        var labeledError = await Assert.ThrowsAsync<OrderManagementException>(() =>
            new LabOperationsRequestContext(scope.Db, new ClaimsExternalIdentityContext()).RequireAsync(labeledHttp, default, LabRole.ScientificReviewer));
        Assert.Equal("lab_capability_required", labeledError.ErrorCode);

        scope.Db.ChangeTracker.Clear();
        var user = await scope.Db.Users.SingleAsync(item => item.Email == identity.Email);
        var membership = await scope.Db.OrganizationMemberships.SingleAsync(item => item.UserId == user.Id);
        var beforeRoles = await scope.Db.LabRoleAssignments.Where(item => item.UserId == user.Id).ToListAsync();
        var request = new UpdatePhaenoUserRequest
        {
            FirstName = user.FirstName, LastName = user.LastName, IsPlatformAdministrator = false,
            UserVersion = user.Version, MembershipVersion = membership.Version,
            LabRoles = Enum.GetValues<LabRole>().Select(role => new PhaenoLabRoleUpdateDto
            { Role = role, IsActive = role is LabRole.ProtocolAdministrator or LabRole.ScientificReviewer,
                Version = beforeRoles.SingleOrDefault(item => item.Role == role)?.Version }).ToList()
        };
        Assert.IsType<ForbidHttpResult>(await UserEndpoints.UpdatePhaenoUser(user.Id, request, scope.Http, scope.Db, new IdentityContext(identity), default));
        Assert.IsType<ForbidHttpResult>(await UserEndpoints.UpdatePhaenoUser(user.Id, request, scope.Http, scope.Db, new MissingSessionIdentity(), default));
        scope.Db.ChangeTracker.Clear();
        Assert.Equal(2, await scope.Db.LabRoleAssignments.CountAsync(item => item.UserId == user.Id && item.IsActive));
        Assert.True((await scope.Db.LabRoleAssignments.SingleAsync(item => item.UserId == user.Id && item.Role == LabRole.Operator)).IsActive);

        Assert.IsAssignableFrom<IValueHttpResult>(await UserEndpoints.UpdatePhaenoUser(user.Id, request, scope.Http, scope.Db, scope.AdminIdentity, default));
        var changed = await scope.Session(identity, staff.Id, department.Id);
        Assert.False(changed.Capabilities.CanOperateLabWork);
        Assert.True(changed.Capabilities.CanManageLabProtocols);
        Assert.True(changed.Capabilities.CanReviewLabWork);
        Assert.False(changed.Capabilities.CanSuperviseLabWork);
        Assert.False(changed.Capabilities.CanManageLabAccess);
        Assert.False(changed.IsPlatformAdmin);
        await RequireDenied(LabRole.Operator, "lab_capability_required");
        await RequireAllowed(LabRole.ScientificReviewer);
        await RequireAllowed(LabRole.ProtocolAdministrator);
        Assert.Equal(InvitationStatus.Accepted, (await scope.Db.OrganizationInvitations.AsNoTracking().SingleAsync(item => item.Id == invitation.Id)).Status);
        var retainedOperator = await scope.Db.LabRoleAssignments.AsNoTracking().SingleAsync(item => item.UserId == user.Id && item.Role == LabRole.Operator);
        Assert.Equal(beforeRoles.Single(item => item.Role == LabRole.Operator).Id, retainedOperator.Id);
        Assert.False(retainedOperator.IsActive);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => UserEndpoints.UpdatePhaenoUser(user.Id, request, scope.Http, scope.Db, scope.AdminIdentity, default));
        Assert.True((await scope.Session(identity, staff.Id, department.Id)).Capabilities.CanReviewLabWork);

        async Task RequireAllowed(LabRole role)
        {
            scope.Db.ChangeTracker.Clear();
            var actor = await new LabOperationsRequestContext(scope.Db, new IdentityContext(identity)).RequireAsync(scope.Http, default, role);
            Assert.True(actor.HasAny(role));
        }
        async Task RequireDenied(LabRole role, string code)
        {
            scope.Db.ChangeTracker.Clear();
            var error = await Assert.ThrowsAsync<OrderManagementException>(() => new LabOperationsRequestContext(scope.Db, new IdentityContext(identity)).RequireAsync(scope.Http, default, role));
            Assert.Equal(code, error.ErrorCode);
        }
    }

    [PostgreSqlReferenceFact]
    public async Task MissingSessionCannotSaveAssociationAndAuthenticatedRetryCommitsExactlyOnce()
    {
        await using var scope = await Scope.Create();
        var existingContact = await scope.Contact();
        var companyId = (await scope.Db.CrmCompanyContacts.SingleAsync(item => item.ContactId == existingContact.Id)).CompanyId;
        var actorId = (await scope.Db.CrmContacts.SingleAsync(item => item.Id == existingContact.Id)).OwnerUserId;
        var contact = new CrmContact("SIMULATED", "Unassociated", actorId, "simulated-association@example.test");
        scope.Db.Add(contact); await scope.Db.SaveChangesAsync();
        var request = new PhaenoPortal.App.Features.Crm.DTOs.AssociateCrmContactRequest(
            contact.Id, "SIMULATED unsaved title", null, true, DateOnly.FromDateTime(DateTime.UtcNow));
        var denied = new CrmContactRelationshipsController(scope.Db, new ClaimsExternalIdentityContext()) { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
        var error = await Assert.ThrowsAsync<CrmException>(() => denied.Associate(companyId, request, default));
        Assert.Equal("crm_access_forbidden", error.ErrorCode);
        scope.Db.ChangeTracker.Clear();
        Assert.False(await scope.Db.CrmCompanyContacts.AnyAsync(item => item.ContactId == contact.Id));
        var allowed = new CrmContactRelationshipsController(scope.Db, scope.AdminIdentity) { ControllerContext = new() { HttpContext = scope.Http } };
        await allowed.Associate(companyId, request, default);
        scope.Db.ChangeTracker.Clear();
        var saved = Assert.Single(await scope.Db.CrmCompanyContacts.AsNoTracking().Where(item => item.ContactId == contact.Id).ToListAsync());
        Assert.Equal(request.JobTitle, saved.JobTitle);
        Assert.Equal(companyId, saved.CompanyId);
        await Assert.ThrowsAsync<CrmException>(() => allowed.Associate(companyId, request, default));
        Assert.Single(await scope.Db.CrmCompanyContacts.AsNoTracking().Where(item => item.ContactId == contact.Id).ToListAsync());
    }

    private sealed class MissingSessionIdentity : IExternalIdentityContext
    {
        public ExternalIdentity? Read(HttpContext context) => null;
    }
}
