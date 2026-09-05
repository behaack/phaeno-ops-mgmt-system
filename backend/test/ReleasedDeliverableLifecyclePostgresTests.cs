namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Controllers;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed partial class ManagedReleaseRetentionPostgresTests
{
    private static ReleasedDeliverableLifecycleService Lifecycle(PSeqOperationsDbContext db, IOperationalFileStorage storage) => new(db, storage, new(db, NoticeLinks), Checkpoints(db));
    private static ReleasedDeliverableLifecycleController LifecycleController(Fixture fixture, IExternalIdentityContext identity, IOperationalFileStorage storage, HttpContext? http = null, PSeqOperationsDbContext? database = null) => new(database ?? fixture.Db,
        identity, Lifecycle(database ?? fixture.Db, storage), Enabled, Options.Create(new PSeqOrderToCashOptions { GovernedPSeqResults = true }))
        { ControllerContext = new() { HttpContext = http ?? ReceiptHttp(fixture) } };
    private static HttpContext ReceiptHttp(Fixture fixture) { var http = new DefaultHttpContext { RequestServices = fixture.Http.RequestServices }; foreach (var header in fixture.Http.Request.Headers) http.Request.Headers[header.Key] = header.Value; return http; }

    [Fact]
    public void LifecycleDomainRequiresDueDeletionAndPreservesHoldReleaseEvidence()
    {
        var now = DateTime.UtcNow; var actor = Guid.NewGuid();
        var hold = new ReleasedDeliverablePreservationHold(Guid.NewGuid(), ReleasedDeliverableHoldKind.Quarantine, actor, "Investigation", now);
        hold.Release(actor, "Investigation complete", now.AddMinutes(1));
        Assert.Equal("Investigation", hold.Reason); Assert.Equal("Investigation complete", hold.ReleaseReason);
        Assert.Throws<InvalidOperationException>(() => hold.Release(actor, "Again", now.AddMinutes(2)));
        Assert.Throws<ArgumentException>(() => new ReleasedDeliverableReissue(actor, actor, actor, "Same package", now));
        Assert.False(new OrderManagementOptions().ReleasedDeliverableByteDeletion);
    }

    [PostgreSqlReferenceFact]
    public Task CleanupWaitsForLeasesAndHoldsThenRetriesPartialDeletionWithoutMovingDates() => InDatabase(async connection =>
    {
        foreach (var assembly in new[] { false, true })
        {
            await using var fixture = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-36));
            var snapshot = fixture.Snapshot!; var final = snapshot.PotentialFinalDeletionAtUtc;
            var storage = new CleanupStorage(); var lifecycle = Lifecycle(fixture.Db, storage);
            var attempt = new OperationalFileDownload(Guid.NewGuid(), fixture.Files[0].Id, fixture.Organization.Id, fixture.Actor.Id,
                fixture.Type, fixture.ReleaseId, OperationalFileDownloadScope.IndividualFile, final.AddMinutes(-10), final.AddMinutes(10), null, null);
            fixture.Db.Add(attempt); await fixture.Db.SaveChangesAsync();
            await lifecycle.ProcessCleanupAsync(snapshot.Id, default, final);
            Assert.Equal("WaitingForLease", snapshot.DeletionOutcome); Assert.Empty(storage.Deleted);
            var hold = new ReleasedDeliverablePreservationHold(snapshot.Id, ReleasedDeliverableHoldKind.Preservation, fixture.Actor.Id, "Synthetic preservation", DateTime.UtcNow);
            fixture.Db.Add(hold); await fixture.Db.SaveChangesAsync();
            await lifecycle.ProcessCleanupAsync(snapshot.Id, default);
            Assert.Equal("Preserved", snapshot.DeletionOutcome); Assert.Empty(storage.Deleted);
            hold.Release(fixture.Actor.Id, "Synthetic release", DateTime.UtcNow); await fixture.Db.SaveChangesAsync();
            storage.FailKey = fixture.Files[1].StorageKey;
            await lifecycle.ProcessCleanupAsync(snapshot.Id, default);
            Assert.Equal("DeletionFailed", snapshot.DeletionOutcome); Assert.Null(snapshot.ByteDeletedAtUtc);
            Assert.Equal(final, snapshot.DownloadAccessClosedAtUtc); Assert.NotNull(snapshot.NextDeletionAttemptAtUtc);
            storage.FailKey = null;
            await lifecycle.ProcessCleanupAsync(snapshot.Id, default);
            Assert.Equal("Deleted", snapshot.DeletionOutcome); Assert.Equal(2, snapshot.DeletionAttemptCount);
            Assert.Equal(2, storage.Deleted.Count); Assert.NotNull(snapshot.ByteDeletedAtUtc);
            var calls = storage.Calls; await lifecycle.ProcessCleanupAsync(snapshot.Id, default); Assert.Equal(calls, storage.Calls);
            var denied = await Assert.ThrowsAsync<OrderManagementException>(() => fixture.Download(true, enforce: false));
            Assert.Equal("released_deliverable_access_unavailable", denied.ErrorCode);
        }
    });

    [PostgreSqlReferenceFact]
    public Task CleanupPreservesSharedObjectsAndGovernedArtifactsKeepTheirAuditRows() => InDatabase(async connection =>
    {
        await using var fixture = await Fixture.Create(connection, false, DateTime.UtcNow.AddDays(-36));
        var original = await fixture.Db.LabResultReleases.SingleAsync(value => value.Id == fixture.ReleaseId);
        var shared = new LabResultRelease(fixture.Organization.Id, fixture.WorkflowId, original.LabSampleId, 2, "PSeq", "synthetic", "fixture", "Passed", original.ManifestJson, DateTime.UtcNow);
        fixture.Db.Add(shared); await fixture.Db.SaveChangesAsync();
        var storage = new CleanupStorage();
        await Lifecycle(fixture.Db, storage).ProcessCleanupAsync(fixture.Snapshot!.Id, default);
        Assert.Equal("SharedSource", fixture.Snapshot.DeletionOutcome); Assert.Empty(storage.Deleted);
        await using var governed = await GovernedResultRetentionPostgresTests.Scope.Create(connection);
        var snapshot = await governed.Release(DateTime.UtcNow.AddDays(-36)); await governed.CommitFixtureAsync();
        await Lifecycle(governed.Db, storage).ProcessCleanupAsync(snapshot.Id, default);
        Assert.NotNull(snapshot.ByteDeletedAtUtc);
        await governed.Db.Entry(governed.Artifact).ReloadAsync(); Assert.NotNull(governed.Artifact.DeletedAtUtc);
        Assert.True(await governed.Db.ResultArtifacts.AnyAsync(value => value.Id == governed.Artifact.Id));
        Assert.Equal(1, await governed.Db.ResultRetentionSchedules.CountAsync(value => value.RetentionSnapshotId == snapshot.Id));
    });

    [PostgreSqlReferenceFact]
    public Task QuarantineStopsActiveZipAndReceiptAuthorizationKeepsInvestigationAndAuditScoped() => InDatabase(async connection =>
    {
        foreach (var assembly in new[] { false, true })
        {
            await using var fixture = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-26));
            var storage = new CleanupStorage(); var adminIdentity = await PlatformIdentity(fixture.Db);
            await using var controlDb = Db(connection);
            var platform = LifecycleController(fixture, adminIdentity, storage, database: controlDb);
            var initial = await platform.Read(fixture.Snapshot!.Id, default);
            fixture.Storage.Block = true;
            var streaming = fixture.Execute(await fixture.Download(true));
            await fixture.Storage.Started.Task.WaitAsync(TimeSpan.FromSeconds(5));
            var held = await platform.PlaceHold(fixture.Snapshot.Id, new(initial.Version, ReleasedDeliverableHoldKind.Quarantine, "Internal investigation details"), default);
            try { await streaming.WaitAsync(TimeSpan.FromSeconds(10)); } catch (OperationCanceledException) { }
            Assert.True(held.Retention.IsQuarantined);
            Assert.All(await fixture.Attempts(), value => Assert.Equal(OperationalFileDownloadOutcome.Revoked, value.Outcome));
            Assert.Equal(409, (await Assert.ThrowsAsync<FileManagementException>(() => platform.PlaceHold(fixture.Snapshot.Id,
                new(initial.Version, ReleasedDeliverableHoldKind.Preservation, "Stale state"), default))).StatusCode);
            var external = LifecycleController(fixture, fixture.IdentityContext, storage);
            var receipt = await external.Read(fixture.Snapshot.Id, default);
            Assert.False(receipt.CanManage); Assert.Empty(receipt.Holds); Assert.Equal(2, receipt.Downloads.Count);
            await Assert.ThrowsAsync<FileManagementException>(() => external.List(null, null, token: default));
            var member = await fixture.Db.OrganizationMemberships.SingleAsync(value => value.UserId == fixture.Actor.Id && value.OrganizationId == fixture.Organization.Id);
            member.SetOrganizationAdmin(false);
            fixture.Db.Add(new OrganizationDepartmentMembership(member.Id, fixture.Organization.Departments.Single().Id)); await fixture.Db.SaveChangesAsync();
            Assert.Empty((await external.Read(fixture.Snapshot.Id, default)).Downloads);
            var other = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-26));
            await using (other) { await Assert.ThrowsAsync<FileManagementException>(() => external.Read(other.Snapshot!.Id, default)); }
            var hold = Assert.Single(held.Holds);
            var released = await platform.ReleaseHold(fixture.Snapshot.Id, hold.Id, new(hold.Version, "Cleared"), default);
            Assert.False(released.Retention.IsQuarantined); Assert.Equal(fixture.Snapshot.StandardDeletionAtUtc, released.Retention.StandardDeletionAtUtc);
        }
    });

    [PostgreSqlReferenceFact]
    public Task ReissueLinksOnlyNewSameWorkflowObjectsAndRetainsDeletedOriginalDates() => InDatabase(async connection =>
    {
        foreach (var assembly in new[] { false, true })
        {
            await using var fixture = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-36));
            var storage = new CleanupStorage(); var actor = await PlatformIdentity(fixture.Db);
            await Lifecycle(fixture.Db, storage).ProcessCleanupAsync(fixture.Snapshot!.Id, default);
            var originalLineage = fixture.Snapshot.ReceiptLineageJson;
            Assert.NotNull(originalLineage);
            Assert.Throws<InvalidOperationException>(() => fixture.Snapshot.CaptureReceiptLineage("{}"));
            var deletion = fixture.Snapshot.ByteDeletedAtUtc; var originalDate = fixture.Snapshot.StandardDeletionAtUtc;
            var replacement = await Replacement(fixture);
            var controller = LifecycleController(fixture, actor, storage);
            if (!assembly)
            {
                var priorSample = await fixture.Db.LabSamples.SingleAsync(value => value.LabServiceOrderId == fixture.WorkflowId);
                var otherSample = new LabSample(fixture.WorkflowId, "OTHER-SAMPLE", priorSample.MaterialType, priorSample.BiologicalSource, priorSample.Quantity, priorSample.QuantityUnit, priorSample.StorageRequirements, priorSample.SafetyDeclaration, null, null, null, priorSample.AnalysisDefinitionIdsJson);
                fixture.Db.Add(otherSample); await fixture.Db.SaveChangesAsync();
                var wrongSample = await Replacement(fixture, otherSample.Id);
                Assert.Equal("invalid_release_reissue", (await Assert.ThrowsAsync<FileManagementException>(() => controller.LinkReissue(fixture.Snapshot.Id, new(fixture.Snapshot.Version, wrongSample.Id, "Wrong sample"), default))).ErrorCode);
            }
            var candidates = await controller.Candidates(fixture.Snapshot.Id, default); Assert.Equal(replacement.Id, Assert.Single(candidates).Id);
            var receipt = await controller.LinkReissue(fixture.Snapshot.Id, new(fixture.Snapshot.Version, replacement.Id, "Approved regeneration"), default);
            Assert.Single(receipt.Reissues); Assert.Equal(deletion, receipt.Retention.ByteDeletedAtUtc);
            Assert.Equal(originalDate, receipt.Retention.StandardDeletionAtUtc); Assert.True(replacement.StandardDeletionAtUtc > originalDate);
            await Assert.ThrowsAsync<FileManagementException>(() => controller.LinkReissue(fixture.Snapshot.Id, new(receipt.Version, replacement.Id, "Duplicate"), default));
            var external = await LifecycleController(fixture, fixture.IdentityContext, storage).Read(fixture.Snapshot.Id, default);
            Assert.Null(Assert.Single(external.Reissues).Reason);
            Assert.Equal(originalLineage, fixture.Snapshot.ReceiptLineageJson);
            Assert.Equal(assembly ? "Project" : "Sample", external.Lineage!.Scope);
        }
    });

    private static async Task<IExternalIdentityContext> PlatformIdentity(PSeqOperationsDbContext db)
    {
        var org = await db.Organizations.SingleOrDefaultAsync(value => value.Kind == OrganizationKind.Phaeno);
        if (org is null) { org = new Organization("Synthetic Phaeno", OrganizationKind.Phaeno); db.Add(org); }
        var identity = new ExternalIdentity("test", Guid.NewGuid().ToString("N"), $"operator-{Guid.NewGuid():N}@example.test", true);
        var user = new User(identity.Email, "Synthetic", "Operator"); user.Activate(); user.LinkExternalIdentity(identity.Provider, identity.SubjectId);
        db.AddRange(user, new OrganizationMembership(user.Id, org.Id, true)); await db.SaveChangesAsync(); return new Identity(identity);
    }

    private static async Task<ReleasedDeliverableRetentionSnapshot> Replacement(Fixture fixture, Guid? sampleId = null)
    {
        var db = fixture.Db; var now = DateTime.UtcNow; Guid parent; AssemblyOutputRelease? assembly = null; LabResultRelease? lab = null;
        if (fixture.Assembly)
        {
            var previous = await db.AssemblyOutputReleases.SingleAsync(value => value.Id == fixture.ReleaseId);
            var run = new AssemblyProcessingRun(fixture.WorkflowId, previous.InputRevisionId, 2, "1", "synthetic", "synthetic", now);
            assembly = new(fixture.Organization.Id, fixture.WorkflowId, previous.InputRevisionId, run.Id, 2, "{}", "synthetic", "synthetic", "Passed", now);
            db.AddRange(run, assembly); parent = assembly.Id;
        }
        else parent = sampleId ?? (await db.LabResultReleases.SingleAsync(value => value.Id == fixture.ReleaseId)).LabSampleId;
        var files = fixture.Files.Select(value => new ManagedOperationalFile(fixture.Organization.Id, value.WorkflowType, fixture.WorkflowId, parent,
            value.Purpose, value.FileName, value.FileKind, value.ContentType, value.SizeBytes, value.Sha256, $"new-object/{Guid.NewGuid():N}")).ToArray();
        foreach (var file in files) { file.RecordScan(OperationalFileScanStatus.Clean, null); file.Release(now); } db.AddRange(files);
        if (!fixture.Assembly)
        {
            lab = new(fixture.Organization.Id, fixture.WorkflowId, parent, 2, "PSeq", "synthetic", "fixture", "Passed", JsonSerializer.Serialize(new { files = files.Select(value => new { id = value.Id }) }), now);
            lab.MarkReady(false); lab.Release(now); db.Add(lab);
        }
        else { assembly!.MarkReady(false); assembly.Release(now); }
        var snapshots = new ReleasedDeliverableRetentionSnapshotService(db);
        var snapshot = fixture.Assembly ? await snapshots.CaptureAssemblyOutputAsync(assembly!, now, default) : await snapshots.CaptureLabResultAsync(lab!, now, default);
        await db.SaveChangesAsync(); await db.Entry(snapshot).ReloadAsync(); return snapshot;
    }

    private sealed class CleanupStorage : IOperationalFileStorage
    {
        public string? FailKey { get; set; }
        public HashSet<string> Deleted { get; } = [];
        public int Calls { get; private set; }
        public Task DeleteIfExistsAsync(string key, CancellationToken token) { Calls++; if (key == FailKey) throw new IOException("Synthetic delete interruption"); Deleted.Add(key); return Task.CompletedTask; }
        public Task<Stream> OpenReadAsync(string key, CancellationToken token) => throw new NotSupportedException();
        public Task<StoredOperationalFile> SaveAsync(Stream source, string extension, long maximum, CancellationToken token) => throw new NotSupportedException();
    }
}
