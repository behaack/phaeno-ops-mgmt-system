namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Domain;

public class LabApprovalOverridePostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task BothApprovalEndpointsRequireAdministratorAndPersistActualActorAndReason()
    {
        var auditActor = new AuditActor();
        await using var db = new PSeqOperationsDbContext(new DbContextOptionsBuilder<PSeqOperationsDbContext>()
            .UseNpgsql(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!)
            .AddInterceptors(new AuditSaveChangesInterceptor(auditActor)).Options, Options.Create(new PersistenceOptions()));
        await using var transaction = await db.Database.BeginTransactionAsync();
        var suffix = Guid.NewGuid().ToString("N");
        var org = new Organization("TEST ONLY approval override " + suffix, OrganizationKind.Phaeno);
        var admin = new User("override-admin-" + suffix + "@example.test", "Override", "Administrator");
        var reviewer = new User("override-reviewer-" + suffix + "@example.test", "Independent", "Reviewer");
        foreach (var user in new[] { admin, reviewer })
        {
            user.LinkExternalIdentity("clerk", user.Email);
            user.Activate();
            db.AddRange(user, new OrganizationMembership(user.Id, org.Id, user == admin), new LabRoleAssignment(user.Id, LabRole.ProtocolAdministrator));
        }
        var protocol = new LabProtocol("override-" + suffix, "TEST ONLY override protocol", null);
        protocol.RecordVersion(1);
        var version = new LabProtocolVersion(protocol.Id, 1, LabProtocolTestData.Definition(), admin.Id, DateTime.UtcNow);
        var workflow = new LabServiceWorkflow("override-" + suffix, "TEST ONLY override workflow", null);
        workflow.RecordVersion(1);
        var candidate = new LabServiceWorkflowVersion(workflow.Id, 1, admin.Id, DateTime.UtcNow);
        db.AddRange(org, protocol, version, workflow, candidate,
            new LabServiceWorkflowStage(candidate.Id, 1, "Preparation", version.Id, LabServiceWorkflowStageRequirement.Required, null, null));
        await db.SaveChangesAsync();
        LabOperationsController Controller(User user) => new(db, new LabOperationsRequestContext(db,
            new Identity(new ExternalIdentity("clerk", user.ExternalSubjectId!, user.Email, true)),
            Options.Create(new PSeqOrderToCashOptions { DualControlEnforced = true }), NullLogger<LabOperationsRequestContext>.Instance))
            { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };
        var administrator = Controller(admin);
        var ordinary = Controller(reviewer);
        var forbidden = await Assert.ThrowsAsync<OrderManagementException>(() => ordinary.TransitionProtocol(version.Id, new("approve", protocol.Version, "Attempt override"), default));
        Assert.Equal("approval_override_forbidden", forbidden.ErrorCode);
        var conflict = await Assert.ThrowsAsync<OrderManagementException>(() => administrator.TransitionProtocol(version.Id, new("approve", protocol.Version), default));
        Assert.Equal("protocol_author_approval_conflict", conflict.ErrorCode);
        await Assert.ThrowsAsync<OrderManagementException>(() => administrator.TransitionProtocol(version.Id, new("approve", protocol.Version, "   "), default));
        Assert.Equal(LabProtocolStatus.Draft, version.Status);
        auditActor.UserId = admin.Id;
        var oldProtocolVersion = protocol.Version;
        var result = await administrator.TransitionProtocol(version.Id, new("approve", protocol.Version, "  TEST ONLY reviewed by administrator  "), default);
        Assert.Equal("TEST ONLY reviewed by administrator", result.Versions.Single(x => x.Id == version.Id).ApprovalOverrideReason);
        Assert.Equal(admin.Id, version.ApprovedByUserId);
        Assert.NotNull(version.ApprovedAtUtc);
        await Assert.ThrowsAsync<OrderManagementException>(() => administrator.TransitionProtocol(version.Id, new("approve", oldProtocolVersion, "Retry stale"), default));
        forbidden = await Assert.ThrowsAsync<OrderManagementException>(() => ordinary.TransitionServiceWorkflow(candidate.Id, new("approve", workflow.Version, "Attempt override"), default));
        Assert.Equal("approval_override_forbidden", forbidden.ErrorCode);
        conflict = await Assert.ThrowsAsync<OrderManagementException>(() => administrator.TransitionServiceWorkflow(candidate.Id, new("approve", workflow.Version), default));
        Assert.Equal("service_workflow_author_approval_conflict", conflict.ErrorCode);
        await Assert.ThrowsAsync<OrderManagementException>(() => administrator.TransitionServiceWorkflow(candidate.Id, new("approve", workflow.Version, "  "), default));
        var saved = await administrator.TransitionServiceWorkflow(candidate.Id, new("approve", workflow.Version, "TEST ONLY workflow reviewed"), default);
        Assert.Equal("TEST ONLY workflow reviewed", saved.Versions.Single(x => x.Id == candidate.Id).ApprovalOverrideReason);
        await administrator.TransitionServiceWorkflow(candidate.Id, new("withdraw", workflow.Version), default);
        Assert.Null(candidate.ApprovalOverrideReason);
        Assert.Null(candidate.ApprovedByUserId);
        var audit = await db.AuditEvents.Where(x => x.EntityId == candidate.Id.ToString() || x.EntityId == version.Id.ToString()).ToListAsync();
        Assert.Contains(audit, x => x.ActorUserId == admin.Id && x.ChangesJson.Contains("TEST ONLY reviewed by administrator"));
        Assert.Contains(audit, x => x.ActorUserId == admin.Id && x.ChangesJson.Contains("TEST ONLY workflow reviewed"));
        await administrator.TransitionServiceWorkflow(candidate.Id, new("approve", workflow.Version, "TEST ONLY fresh approval"), default);
        await administrator.TransitionServiceWorkflow(candidate.Id, new("promote", workflow.Version), default);
        Assert.Equal(LabServiceWorkflowStatus.Production, candidate.Status);
        Assert.Equal(LabProtocolStatus.Active, version.Status);
        await transaction.RollbackAsync();
    }

    private sealed class Identity(ExternalIdentity identity) : IExternalIdentityContext
    {
        public ExternalIdentity? Read(HttpContext context) => identity;
    }
    private sealed class AuditActor : ICurrentUserContext
    {
        public Guid? UserId { get; set; }
        public Guid? OrganizationId => null;
        public string? RequestId => "TEST-ONLY-APPROVAL-OVERRIDE";
    }
}
