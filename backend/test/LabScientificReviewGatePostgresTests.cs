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
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public class LabScientificReviewGatePostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ScientificApprovalEnforcesGatesAndIndependentApprovalDoesNotPublish()
    {
        await using var db = new PSeqOperationsDbContext(new DbContextOptionsBuilder<PSeqOperationsDbContext>()
            .UseNpgsql(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!).Options,
            Options.Create(new PersistenceOptions()));
        await using var transaction = await db.Database.BeginTransactionAsync();
        var suffix = Guid.NewGuid().ToString("N");
        var organization = new Organization("TEST ONLY review gates " + suffix, OrganizationKind.Phaeno);
        var reviewer = new User($"review-{suffix}@example.test", "Independent", "Fixture");
        reviewer.LinkExternalIdentity("clerk", "review-" + suffix);
        reviewer.Activate();
        db.AddRange(organization, reviewer, new OrganizationMembership(reviewer.Id, organization.Id, false),
            new LabRoleAssignment(reviewer.Id, LabRole.ScientificReviewer));
        // Isolate approval guards on a legacy-compatible job. This does not prove specimen lineage readiness.
        var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder,
            Guid.NewGuid(), organization.Id, "test-review-gates", 1, "test-only", "TEST ONLY review gates " + suffix);
        work.RecordMilestone(LabWorkOrderStatus.Processing);
        db.Add(work);
        await db.SaveChangesAsync();
        var context = new LabOperationsRequestContext(db,
            new Identity(new("clerk", reviewer.ExternalSubjectId!, reviewer.Email, true)),
            Options.Create(new PSeqOrderToCashOptions { GovernedPSeqResults = true, DualControlEnforced = true }),
            NullLogger<LabOperationsRequestContext>.Instance);
        var controller = new LabOperationsController(db, context)
            { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };

        async Task Reject(string expected, ResultOutputPackage? package = null)
        {
            var version = work.Version;
            var status = work.Status;
            var events = await db.LabWorkEvents.CountAsync(x => x.LabWorkOrderId == work.Id);
            var packageState = package?.State;
            var packageVersion = package?.Version;
            var error = await Assert.ThrowsAsync<OrderManagementException>(() => controller.ApproveScientificReview(
                work.Id, new("test-only", 1, null, work.Version, package?.Id), default));
            Assert.Equal(expected, error.ErrorCode);
            await db.Entry(work).ReloadAsync();
            Assert.Equal(status, work.Status);
            Assert.Equal(version, work.Version);
            Assert.False(await db.LabScientificApprovals.AnyAsync(x => x.LabWorkOrderId == work.Id));
            Assert.Equal(events, await db.LabWorkEvents.CountAsync(x => x.LabWorkOrderId == work.Id));
            if (package is not null)
            {
                await db.Entry(package).ReloadAsync();
                Assert.Equal(packageState, package.State);
                Assert.Equal(packageVersion, package.Version);
                Assert.Null(package.ScientificApprovalId);
                Assert.Null(package.ReleasedAtUtc);
            }
        }

        await Reject("scientific_review_not_ready");
        work.RecordMilestone(LabWorkOrderStatus.ScientificReview);
        await db.SaveChangesAsync();
        await Reject("result_output_package_required");
        var order = new LabServiceOrder(organization.Id, organization.Departments.Single().Id,
            "TEST-REVIEW-" + suffix, "Synthetic package guards", null, 1, false, "RNA", "Frozen", "Safe", "TEST ONLY");
        var sample = new LabSample(order.Id, "Synthetic review sample", "RNA", "Synthetic source", 1, "tube", "Frozen", "Safe", null, null, null, "[]");
        var package = new ResultOutputPackage(organization.Id, order.Id, work.Id, sample.Id, 1, null,
            "test-only", suffix, suffix, "{}", new string('A', 64), 1);
        db.AddRange(order, sample, package);
        await db.SaveChangesAsync();
        await Reject("result_output_package_not_ready", package); // Upload incomplete.
        package.BeginScanning();
        await db.SaveChangesAsync();
        await Reject("result_output_package_not_ready", package); // Scan not finished.
        Assert.Throws<InvalidOperationException>(() => package.MarkReadyForReview(0, true, true));
        Assert.Throws<InvalidOperationException>(() => package.MarkReadyForReview(1, false, true));
        Assert.Throws<InvalidOperationException>(() => package.MarkReadyForReview(1, true, false));
        Assert.Equal(ResultOutputPackageState.Scanning, package.State);
        package.Fail("TEST_ONLY_UNCLEAN", "Synthetic scan failure; no malicious file used.");
        await db.SaveChangesAsync();
        await Reject("result_output_package_not_ready", package);
        db.Add(new LabWorkEvent(work.Id, null, "TEST_ONLY_CONTRIBUTION", DateTime.UtcNow, reviewer.Id, "{}"));
        await db.SaveChangesAsync();
        await Reject("scientific_approval_contributor_conflict");
        var exception = new LabException(work.Id, null, null, LabExceptionAudience.Internal, "TEST_ONLY",
            "TEST ONLY blocking exception", "Synthetic guard validation", null, true, null);
        db.Add(exception);
        await db.SaveChangesAsync();
        await Reject("blocking_exception_open");
        exception.Resolve(reviewer.Id, DateTime.UtcNow, "Synthetic exception resolved for independent approval test");
        var independent = new User($"independent-{suffix}@example.test", "Independent", "Approver");
        independent.LinkExternalIdentity("clerk", "independent-" + suffix);
        independent.Activate();
        var readyPackage = new ResultOutputPackage(organization.Id, order.Id, work.Id, sample.Id, 2, null,
            "test-only", suffix + "-ready", suffix + "-ready", "{}", new string('B', 64), 1);
        // Synthetic readiness fixture only: no physical scanner or file-transfer claim.
        var artifact = new ResultArtifact(readyPackage.Id, "report", "test-only.txt", "text/plain", 16,
            new string('B', 64), "test-only/" + suffix);
        artifact.BeginScan();
        artifact.CompleteScan(true, null, DateTime.UtcNow);
        readyPackage.BeginScanning();
        readyPackage.MarkReadyForReview(1, true, true);
        db.AddRange(independent, new OrganizationMembership(independent.Id, organization.Id, false),
            new LabRoleAssignment(independent.Id, LabRole.ScientificReviewer), readyPackage, artifact);
        await db.SaveChangesAsync();
        Assert.False(await db.LabWorkEvents.AnyAsync(x => x.ActorUserId == independent.Id));
        var independentContext = new LabOperationsRequestContext(db,
            new Identity(new("clerk", independent.ExternalSubjectId!, independent.Email, true)),
            Options.Create(new PSeqOrderToCashOptions { GovernedPSeqResults = true, DualControlEnforced = true }),
            NullLogger<LabOperationsRequestContext>.Instance);
        var independentController = new LabOperationsController(db, independentContext)
            { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };
        await independentController.ApproveScientificReview(work.Id,
            new("test-only", 1, null, work.Version, readyPackage.Id), default);
        await db.Entry(work).ReloadAsync();
        await db.Entry(readyPackage).ReloadAsync();
        var approval = await db.LabScientificApprovals.SingleAsync(x => x.LabWorkOrderId == work.Id);
        Assert.Equal(LabWorkOrderStatus.ReadyForRelease, work.Status);
        Assert.Equal(ResultOutputPackageState.ReadyForRelease, readyPackage.State);
        Assert.Equal(approval.Id, readyPackage.ScientificApprovalId);
        Assert.Equal(independent.Id, readyPackage.ScientificallyApprovedByUserId);
        Assert.Null(readyPackage.ReleasedAtUtc);
        Assert.Null(readyPackage.ReleasedByUserId);
        Assert.Equal(ResultOutputPackageState.Failed, package.State);
        Assert.Equal(1, await db.LabWorkEvents.CountAsync(x => x.LabWorkOrderId == work.Id && x.EventCode == "ScientificApprovalRecorded"));
        await transaction.RollbackAsync();
        db.ChangeTracker.Clear();
        Assert.False(await db.LabWorkOrders.AnyAsync(x => x.Id == work.Id));
        Assert.False(await db.Users.AnyAsync(x => x.Id == reviewer.Id));
        Assert.False(await db.ResultOutputPackages.AnyAsync(x => x.Id == package.Id));
        Assert.False(await db.ResultOutputPackages.AnyAsync(x => x.Id == readyPackage.Id));
        Assert.False(await db.Users.AnyAsync(x => x.Id == independent.Id));
    }

    private sealed class Identity(ExternalIdentity identity) : IExternalIdentityContext
    {
        public ExternalIdentity? Read(HttpContext context) => identity;
    }
}
