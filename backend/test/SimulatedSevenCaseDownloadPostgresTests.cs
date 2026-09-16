namespace PhaenoPortal.Test;

using System.IO.Compression;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.FileManagement.Controllers;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.FileManagement.Services;

public sealed partial class ManagedReleaseRetentionPostgresTests
{
    [PostgreSqlReferenceFact]
    public Task SimulatedUnmonitoredQuarantineIsUnavailableWithoutSavingAHold() => InDatabase(async connection =>
    {
        foreach (var assembly in new[] { false, true })
        {
            await using var fixture = await Fixture.Create(connection, assembly, DateTime.UtcNow);
            var identity = await PlatformIdentity(fixture.Db);
            var storage = new CleanupStorage();
            var controller = new ReleasedDeliverableLifecycleController(fixture.Db, identity,
                Lifecycle(fixture.Db, storage), Options.Create(new OrderManagementOptions()), Options.Create(new PSeqOrderToCashOptions()))
                { ControllerContext = new() { HttpContext = ReceiptHttp(fixture) } };
            var version = fixture.Snapshot!.Version;
            var error = await Assert.ThrowsAsync<FileManagementException>(() => controller.PlaceHold(fixture.Snapshot.Id,
                new(version, ReleasedDeliverableHoldKind.Quarantine, "SIMULATED monitoring-disabled variant"), default));
            Assert.Equal("release_monitoring_required", error.ErrorCode);
            Assert.False(await fixture.Db.ReleasedDeliverablePreservationHolds.AnyAsync(value => value.RetentionSnapshotId == fixture.Snapshot.Id));
            await fixture.Db.Entry(fixture.Snapshot).ReloadAsync();
            Assert.Equal(version, fixture.Snapshot.Version); Assert.False(fixture.Snapshot.IsQuarantined);
        }
    });

    [PostgreSqlReferenceFact]
    public Task SimulatedReleasedFileAndArchiveBytesMatchEveryManifestEntry() => InDatabase(async connection =>
    {
        foreach (var assembly in new[] { false, true })
        {
            await using var fixture = await Fixture.Create(connection, assembly, DateTime.UtcNow);
            await fixture.Execute(await fixture.Download(false));
            var bytes = ((MemoryStream)fixture.Http.Response.Body).ToArray();
            Assert.Equal(fixture.Files[0].SizeBytes, bytes.LongLength);
            Assert.Equal(fixture.Files[0].Sha256.ToUpperInvariant(), Convert.ToHexString(SHA256.HashData(bytes)));
            Assert.Equal(1, (await fixture.Projection()).DownloadedFileCount);

            var external = new ExternalIdentity("test", Guid.NewGuid().ToString("N"), $"simulated-member-{Guid.NewGuid():N}@example.test", true);
            var member = new User(external.Email, "Simulated", "Member"); member.Activate(); member.LinkExternalIdentity(external.Provider, external.SubjectId);
            var membership = new OrganizationMembership(member.Id, fixture.Organization.Id, false);
            fixture.Db.AddRange(member, membership, new OrganizationDepartmentMembership(membership.Id, fixture.Organization.Departments.Single().Id));
            await fixture.Db.SaveChangesAsync();
            fixture.ResetResponse();
            await fixture.Execute(await fixture.Download(true, downloadIdentity: new Identity(external)));
            using var zip = new ZipArchive(new MemoryStream(((MemoryStream)fixture.Http.Response.Body).ToArray()));
            Assert.Equal(fixture.Files.Length, zip.Entries.Count);
            foreach (var file in fixture.Files)
            {
                var entry = Assert.Single(zip.Entries, entry => entry.Name == file.FileName);
                await using var contents = entry.Open(); using var buffer = new MemoryStream();
                await contents.CopyToAsync(buffer);
                Assert.Equal(file.SizeBytes, buffer.Length);
                Assert.Equal(file.Sha256.ToUpperInvariant(), Convert.ToHexString(SHA256.HashData(buffer.ToArray())));
            }
            Assert.Equal(2, (await fixture.Projection()).DownloadedFileCount);
            Assert.Equal(2, (await fixture.Attempts()).Count(value => value.UserId == member.Id && value.CountsForReleasedPackageRetention));

            var foreign = new Organization($"SIMULATED other tenant {Guid.NewGuid():N}", assembly ? OrganizationKind.Partner : OrganizationKind.Customer);
            fixture.Db.Add(foreign); await fixture.Db.SaveChangesAsync();
            fixture.Http.Request.Headers["X-Organization-Id"] = foreign.Id.ToString();
            fixture.Http.Request.Headers["X-Department-Id"] = foreign.Departments.Single().Id.ToString();
            var reads = fixture.Storage.Reads;
            await Assert.ThrowsAsync<OrderManagementException>(() => fixture.Download(false));
            await Assert.ThrowsAsync<OrderManagementException>(() => fixture.Download(true));
            Assert.Equal(reads, fixture.Storage.Reads);
        }
    });

    [PostgreSqlReferenceFact]
    public Task SimulatedMembershipAndDepartmentRevocationStopStreamsAndCannotReviveOldAttempts() => InDatabase(async connection =>
    {
        foreach (var assembly in new[] { false, true })
        foreach (var removeDepartment in new[] { false, true })
        {
            await using var fixture = await Fixture.Create(connection, assembly, DateTime.UtcNow);
            var member = await fixture.Db.OrganizationMemberships.SingleAsync(value => value.UserId == fixture.Actor.Id);
            member.SetOrganizationAdmin(false);
            var assignment = new OrganizationDepartmentMembership(member.Id, fixture.Organization.Departments.Single().Id);
            fixture.Db.Add(assignment); await fixture.Db.SaveChangesAsync();
            fixture.Storage.Block = true;
            await using var serving = Db(connection);
            var streaming = fixture.Execute(await fixture.Download(removeDepartment, serving));
            await fixture.Storage.Started.Task.WaitAsync(TimeSpan.FromSeconds(5));
            if (removeDepartment) assignment.Deactivate(); else member.Deactivate();
            await fixture.Db.SaveChangesAsync();
            try { await streaming.WaitAsync(TimeSpan.FromSeconds(10)); } catch (OperationCanceledException) { }
            var attempts = await fixture.Attempts(); Assert.NotEmpty(attempts);
            Assert.All(attempts, attempt => Assert.Equal(OperationalFileDownloadOutcome.Revoked, attempt.Outcome));
            Assert.Equal(0, fixture.Http.Response.Body.Length);
            await Assert.ThrowsAsync<OrderManagementException>(() => fixture.Download(false));
            if (removeDepartment) assignment.Reactivate(); else member.Activate();
            await fixture.Db.SaveChangesAsync();
            var service = new ReleasedDeliverableDownloadAttemptService(fixture.Db, Enabled,
                NullLogger<ReleasedDeliverableDownloadAttemptService>.Instance);
            Assert.False(await service.CompleteAsync(attempts.Select(value => value.Id).ToArray(),
                OperationalFileDownloadOutcome.Succeeded, DateTime.UtcNow, null, true, default));
            fixture.Storage.Block = false; fixture.ResetResponse();
            await fixture.Execute(await fixture.Download(false));
            var after = await fixture.Attempts();
            Assert.All(after.Where(value => attempts.Any(old => old.Id == value.Id)),
                attempt => Assert.Equal(OperationalFileDownloadOutcome.Revoked, attempt.Outcome));
            Assert.Single(after, value => value.Outcome == OperationalFileDownloadOutcome.Succeeded);
            Assert.Equal(1, (await fixture.Projection()).DownloadedFileCount);
        }
    });
}
