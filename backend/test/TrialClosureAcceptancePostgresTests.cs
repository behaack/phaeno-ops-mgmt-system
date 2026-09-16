namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.RelationshipManagement.Controllers;
using PhaenoPortal.App.Features.Trials.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Trials.Domain;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class TrialProjectPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task TrialAcceptanceReplacementCompletenessAndConversionPreserveFrozenReleaseAndMembership()
    {
        await using var scope = await Fixture.Create();
        var db = scope.Db; var trial = await scope.CreateApprovedTrial();
        await scope.Submit(trial, "SIMULATED-READY"); await scope.Submit(trial, "SIMULATED-FAILED");
        var first = trial.Samples.Single(value => value.Reference == "SIMULATED-READY");
        var failed = trial.Samples.Single(value => value.Reference == "SIMULATED-FAILED");
        var firstPackage = await scope.ReadyPackage(first);
        await scope.Results.ReleaseAsync(trial, scope.Scientific, new(trial.Version, [firstPackage.Id], false, "SIMULATED partial release"), default);
        await db.SaveChangesAsync();
        var partial = await db.TrialResultReleases.SingleAsync(value => value.TrialProjectId == trial.Id);
        Assert.False(await db.ReleasedDeliverableRetentionSnapshots.AnyAsync(value => value.TrialResultReleaseId == partial.Id));
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.Results.ReleaseAsync(trial, scope.Scientific,
            new(trial.Version, [firstPackage.Id], true, "SIMULATED incomplete selection"), default));
        await scope.Workflow.ActAsync(trial, scope.Scientific, "replacement",
            new(trial.Version, "SIMULATED Phaeno-caused failure", SampleId: failed.Id, PhaenoCausedFailure: true), default);
        await db.SaveChangesAsync();
        var replacement = await db.TrialReplacementAuthorizations.SingleAsync(value => value.OriginalSampleId == failed.Id);
        var submission = scope.Submission(trial, "SIMULATED-REPLACEMENT");
        submission = submission with { Samples = [submission.Samples.Single() with { ReplacesSampleId = failed.Id, ReplacementAuthorizationId = replacement.Id }] };
        await scope.Workflow.SubmitAsync(trial, scope.Prospect, submission, default); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.Results.ReleaseAsync(trial, scope.Scientific,
            new(trial.Version, [firstPackage.Id], true, "SIMULATED replacement still missing"), default));
        var replacementPackage = await scope.ReadyPackage(trial.Samples.Single(value => value.ReplacesSampleId == failed.Id));
        await scope.Results.ReleaseAsync(trial, scope.Scientific,
            new(trial.Version, [firstPackage.Id, replacementPackage.Id], true, "SIMULATED complete approved selection"), default);
        await db.SaveChangesAsync();
        Assert.Equal(TrialStatus.Completed, trial.Status);
        var completeId = trial.CompleteReleaseId;
        var retention = await db.ReleasedDeliverableRetentionSnapshots.SingleAsync(value => value.TrialResultReleaseId == completeId);
        await db.Entry(retention).ReloadAsync(); // Compare persisted PostgreSQL precision before and after conversion.
        var deadline = retention.StandardDeletionAtUtc;
        await WorkflowNoticeAcceptance.VerifyRetry(db, trial.Id, scope.Customer.Email);
        await db.Entry(retention).ReloadAsync(); Assert.Equal(deadline, retention.StandardDeletionAtUtc);
        var memberships = await db.OrganizationMemberships.Where(value => value.OrganizationId == scope.Organization.Id).Select(value => value.Id).ToArrayAsync();
        scope.Commercial.User.LinkExternalIdentity("test", "trial-conversion-" + scope.Commercial.User.Id); await db.SaveChangesAsync();
        var identity = new TrialClosureIdentity(new("test", scope.Commercial.User.ExternalSubjectId!, scope.Commercial.User.Email, true));
        var controller = new RelationshipManagementController(db, identity) { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
        var request = new PortalIntegrationRequest(scope.Organization.Id, scope.Organization.Name, PortalIntegrationRequestType.RelationshipChange,
            PortalIntegrationRequestSource.FirstPartyCrm, OrganizationKind.Customer, null, "SIMULATED conversion", null, scope.Commercial.User.Id, []);
        db.Add(request); await db.SaveChangesAsync();
        var approved = await controller.DecideRequest(request.Id, new() { Version = request.Version, Approved = true, Reason = "SIMULATED reviewed conversion" }, default);
        await controller.ApplyRequest(request.Id, new() { Version = approved.Version, Notes = "SIMULATED retain Trial history" }, default);
        Assert.Equal(OrganizationKind.Customer, scope.Organization.Kind);
        Assert.Equal(memberships, await db.OrganizationMemberships.Where(value => value.OrganizationId == scope.Organization.Id).Select(value => value.Id).ToArrayAsync());
        await db.Entry(retention).ReloadAsync();
        Assert.Equal(deadline, retention.StandardDeletionAtUtc);
        Assert.Equal(completeId, trial.CompleteReleaseId);
        Assert.Equal(TrialStatus.Completed, trial.Status);
        Assert.Equal(3, trial.Samples.Count);
        Assert.False(await db.LabServiceOrders.AnyAsync(value => value.OrganizationId == scope.Organization.Id));
        var detail = await scope.Reader.DetailAsync(trial, scope.Prospect, default);
        Assert.False(detail.Releases.Single(value => value.Id == partial.Id).IsDownloadAvailable);
        Assert.True(detail.Releases.Single(value => value.IsCompletePackage).IsDownloadAvailable);
    }

    [PostgreSqlReferenceFact]
    public async Task TrialAcceptanceClosureRequestsCancellationAndMaterialActionsKeepSafeCrmHistory()
    {
        await using var scope = await Fixture.Create();
        var db = scope.Db; var trial = await scope.CreateApprovedTrial();
        await scope.Submit(trial, "SIMULATED-PRIVATE-SAMPLE");
        var workId = trial.Samples.Single().LabWorkOrderId;
        await scope.Workflow.ActAsync(trial, scope.Scientific, "close",
            new(trial.Version, "Evaluation ended safely", ClosureStatus: TrialStatus.ClosedIncomplete), default); await db.SaveChangesAsync();
        Assert.Equal(TrialStatus.ClosedIncomplete, trial.Status);
        Assert.Equal(LabWorkOrderStatus.Cancelled, (await db.LabWorkOrders.SingleAsync(value => value.Id == workId)).Status);
        Assert.Equal(trial.ClosedAtUtc!.Value.AddDays(30), trial.ResidualRetainUntilUtc);
        Assert.Null(trial.MaterialDisposedAtUtc);
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.Workflow.SubmitAsync(trial, scope.Prospect, scope.Submission(trial, "SIMULATED-LATE"), default));
        await Assert.ThrowsAsync<InvalidOperationException>(() => scope.Workflow.ActAsync(trial, scope.Scientific, "material",
            new(trial.Version, "SIMULATED premature destruction", MaterialDisposition: "Destroyed"), default));
        await scope.Workflow.ActAsync(trial, scope.Scientific, "hold", new(trial.Version, "SIMULATED material hold", Hold: true), default); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => scope.Workflow.ActAsync(trial, scope.Scientific, "material",
            new(trial.Version, "SIMULATED blocked disposition", MaterialDisposition: "Exhausted"), default));
        await scope.Workflow.ActAsync(trial, scope.Scientific, "hold", new(trial.Version, "SIMULATED hold resolved", Hold: false), default); await db.SaveChangesAsync();
        await scope.Workflow.ActAsync(trial, scope.Scientific, "material", new(trial.Version, "SIMULATED operator-reported exhausted material", MaterialDisposition: "Exhausted"), default); await db.SaveChangesAsync();
        var disposedAt = trial.MaterialDisposedAtUtc;
        await Assert.ThrowsAsync<InvalidOperationException>(() => scope.Workflow.ActAsync(trial, scope.Scientific, "material",
            new(trial.Version, "SIMULATED duplicate", MaterialDisposition: "Exhausted"), default));
        Assert.Equal(disposedAt, trial.MaterialDisposedAtUtc);
        await scope.Workflow.ActAsync(trial, scope.Commercial, "commercial-outcome", new(trial.Version,
            "SIMULATED follow-up", CommercialOutcome: TrialCommercialOutcome.FollowUpScheduled,
            FollowUpOwnerUserId: scope.Commercial.User.Id, FollowUpAtUtc: DateTime.UtcNow.AddDays(7)), default); await db.SaveChangesAsync();
        var publication = new TrialCrmProjection(db);
        Assert.True(await publication.PublishAsync(trial.Id, default) > 0);
        Assert.Equal(0, await publication.PublishAsync(trial.Id, default));
        var events = await db.TrialEvents.Where(value => value.TrialProjectId == trial.Id).Select(value => value.Id).ToArrayAsync();
        var activities = await db.CrmActivities.Where(value => events.Contains(value.Id)).ToArrayAsync();
        Assert.Equal(events.Length, activities.Length);
        var safe = System.Text.Json.JsonSerializer.Serialize(activities.Select(value => new { value.Subject, value.Body }));
        Assert.DoesNotContain("SIMULATED-PRIVATE-SAMPLE", safe);
        Assert.Contains("/trial-projects/" + trial.Id, safe);
        Assert.Equal(trial.ClosedAtUtc.Value.AddDays(30), trial.ResidualRetainUntilUtc);
    }

    private sealed class TrialClosureIdentity(ExternalIdentity value) : IExternalIdentityContext
    { public ExternalIdentity? Read(HttpContext context) => value; }
}
