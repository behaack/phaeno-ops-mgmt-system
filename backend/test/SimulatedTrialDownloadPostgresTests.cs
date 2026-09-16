namespace PhaenoPortal.Test;

using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Trials.Controllers;
using PhaenoPortal.App.Features.Trials.Services;

public sealed partial class TrialProjectPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task SimulatedTrialDownloadsVerifyBytesFailedZipMemberCreditAndStaffDenial()
    {
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!);
        if (connection.Host is not ("localhost" or "127.0.0.1")) throw new InvalidOperationException("Local test server required.");
        var name = $"pseq_trial_preparation_test_{Guid.NewGuid():N}";
        await using var admin = new NpgsqlConnection(connection.ConnectionString); await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin)) await create.ExecuteNonQueryAsync();
        connection.Database = name; connection.Pooling = false;
        try
        {
            await using var fixture = await Fixture.Create(connection.ConnectionString);
            var db = fixture.Db; var trial = await fixture.CreateApprovedTrial();
            await fixture.Submit(trial, "TEST-FILE-ONE"); await fixture.Submit(trial, "TEST-FILE-TWO");
            var packages = new List<Guid>();
            foreach (var sample in trial.Samples.ToArray()) packages.Add((await fixture.ReadyPackage(sample)).Id);
            await fixture.Results.ReleaseAsync(trial, fixture.Scientific, new(trial.Version, [packages[0]], false, "SIMULATED partial software acceptance release"), default);
            await db.SaveChangesAsync();
            var partial = await db.TrialResultReleases.SingleAsync(value => value.TrialProjectId == trial.Id);
            var options = Options.Create(new OrderManagementOptions { ReleasedDeliverableRetentionEnforcement = true });
            var storage = new SimulatedTrialContent();
            using var services = new ServiceCollection().AddLogging().AddControllers().Services.BuildServiceProvider();
            var http = new DefaultHttpContext { RequestServices = services };
            http.Request.Method = "GET";
            http.Request.Headers["X-Organization-Id"] = fixture.Organization.Id.ToString();
            http.Request.Headers["X-Department-Id"] = fixture.Department.Id.ToString();
            TrialResultsController Controller(User user)
            {
                var identity = new SimulatedDownloadIdentity(new("test", user.ExternalSubjectId!, user.Email, true));
                var context = new OrderRequestContext(db, identity);
                return new(db, new TrialAccess(db, identity, context), fixture.Workflow, fixture.Reader, fixture.Results,
                    context, null!, Options.Create(new PSeqOrderToCashOptions()), options, storage,
                    new(db, options, NullLogger<ReleasedDeliverableDownloadAttemptService>.Instance),
                    NullLogger<CompletionTrackedFileStreamResult>.Instance, NullLogger<CompletionTrackedArchiveResult>.Instance)
                    { ControllerContext = new() { HttpContext = http } };
            }
            async Task Execute(IActionResult result)
            { http.Response.Body = new MemoryStream(); await result.ExecuteResultAsync(new(http, new RouteData(), new ActionDescriptor())); }
            fixture.Customer.LinkExternalIdentity("test", "simulated-download-" + fixture.Customer.Id); await db.SaveChangesAsync();
            var controller = Controller(fixture.Customer);
            var member = new User($"simulated-member-{Guid.NewGuid():N}@example.test", "Simulated", "Member"); member.Activate(); member.LinkExternalIdentity("test", "simulated-" + member.Id);
            var membership = new OrganizationMembership(member.Id, fixture.Organization.Id, false);
            db.AddRange(member, membership, new OrganizationDepartmentMembership(membership.Id, fixture.Department.Id)); await db.SaveChangesAsync();
            await Execute(await Controller(member).DownloadPackage(trial.Id, partial.Id, default));
            using (var partialArchive = new ZipArchive(new MemoryStream(((MemoryStream)http.Response.Body).ToArray())))
            {
                Assert.Equal(2, partialArchive.Entries.Count);
                var partialFile = await db.ManagedOperationalFiles.SingleAsync(value => value.WorkflowId == trial.Id);
                using var contentReader = new StreamReader(Assert.Single(partialArchive.Entries, value => value.Name == partialFile.FileName).Open());
                Assert.Equal("TEST ONLY\n", await contentReader.ReadToEndAsync());
                using var manifestReader = new StreamReader(Assert.Single(partialArchive.Entries, value => value.Name == "TRIAL-MANIFEST.json").Open());
                Assert.True(System.Text.Json.Nodes.JsonNode.DeepEquals(System.Text.Json.Nodes.JsonNode.Parse(partial.ManifestJson),
                    System.Text.Json.Nodes.JsonNode.Parse(await manifestReader.ReadToEndAsync())));
            }
            Assert.False(await db.ReleasedDeliverableRetentionSnapshots.AnyAsync(value => value.TrialResultReleaseId == partial.Id));
            await fixture.Results.ReleaseAsync(trial, fixture.Scientific, new(trial.Version, packages, true, "SIMULATED complete software acceptance release"), default);
            await db.SaveChangesAsync();
            await Assert.ThrowsAsync<OrderManagementException>(() => Controller(member).DownloadPackage(trial.Id, partial.Id, default));
            var files = await db.ManagedOperationalFiles.Where(value => value.WorkflowId == trial.Id).OrderBy(value => value.FileName).ToArrayAsync();
            Assert.Equal(2, files.Length);
            await Execute(await controller.Download(trial.Id, files[0].Id, default));
            var content = ((MemoryStream)http.Response.Body).ToArray();
            Assert.Equal(files[0].SizeBytes, content.LongLength);
            Assert.Equal(files[0].Sha256.ToUpperInvariant(), Convert.ToHexString(SHA256.HashData(content)));
            storage.FailKey = files[1].StorageKey;
            await Assert.ThrowsAsync<IOException>(async () => await Execute(await controller.DownloadPackage(trial.Id, trial.CompleteReleaseId!.Value, default)));
            var failed = await db.OperationalFileDownloads.AsNoTracking().Where(value => value.ReleasedPackageId == trial.CompleteReleaseId && value.Scope == OperationalFileDownloadScope.PackageArchive).ToListAsync();
            Assert.Equal(2, failed.Count); Assert.All(failed, value => Assert.False(value.CountsForReleasedPackageRetention));
            Assert.Single(await db.OperationalFileDownloads.AsNoTracking().Where(value => value.ReleasedPackageId == trial.CompleteReleaseId && value.CountsForReleasedPackageRetention).ToListAsync());
            storage.FailKey = null;
            await Execute(await Controller(member).DownloadPackage(trial.Id, trial.CompleteReleaseId!.Value, default));
            using var archive = new ZipArchive(new MemoryStream(((MemoryStream)http.Response.Body).ToArray()));
            Assert.Equal(3, archive.Entries.Count);
            using (var manifest = new StreamReader(Assert.Single(archive.Entries, value => value.Name == "TRIAL-MANIFEST.json").Open()))
                Assert.True(System.Text.Json.Nodes.JsonNode.DeepEquals(
                    System.Text.Json.Nodes.JsonNode.Parse((await db.TrialResultReleases.SingleAsync(value => value.Id == trial.CompleteReleaseId)).ManifestJson),
                    System.Text.Json.Nodes.JsonNode.Parse(await manifest.ReadToEndAsync())));
            foreach (var file in files)
            {
                var entry = Assert.Single(archive.Entries, value => value.Name == file.FileName);
                using var buffer = new MemoryStream(); await using var source = entry.Open(); await source.CopyToAsync(buffer);
                Assert.Equal(file.SizeBytes, buffer.Length);
                Assert.Equal(file.Sha256.ToUpperInvariant(), Convert.ToHexString(SHA256.HashData(buffer.ToArray())));
            }
            Assert.Equal(2, await db.OperationalFileDownloads.CountAsync(value => value.UserId == member.Id && value.ReleasedPackageId == trial.CompleteReleaseId && value.CountsForReleasedPackageRetention));
            fixture.Commercial.User.LinkExternalIdentity("test", "simulated-staff-" + fixture.Commercial.User.Id); await db.SaveChangesAsync();
            var reads = storage.Reads;
            await Assert.ThrowsAsync<OrderManagementException>(() => Controller(fixture.Commercial.User).DownloadPackage(trial.Id, trial.CompleteReleaseId.Value, default));
            Assert.Equal(reads, storage.Reads);
            Assert.False(await db.OperationalFileDownloads.AnyAsync(value => value.UserId == fixture.Commercial.User.Id));
        }
        finally
        {
            if (!System.Text.RegularExpressions.Regex.IsMatch(name, "^pseq_trial_preparation_test_[0-9a-f]{32}$")) throw new InvalidOperationException("Unsafe cleanup target.");
            await using var drop = new NpgsqlCommand($"DROP DATABASE {name} WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync();
        }
    }

    private sealed class SimulatedDownloadIdentity(ExternalIdentity identity) : IExternalIdentityContext
    { public ExternalIdentity? Read(HttpContext context) => identity; }

    private sealed class SimulatedTrialContent : IOperationalFileStorage
    {
        public string? FailKey { get; set; }
        public int Reads { get; private set; }
        public Task<Stream> OpenReadAsync(string key, CancellationToken token)
        { Reads++; if (key == FailKey) throw new IOException("SIMULATED provider interruption"); return Task.FromResult<Stream>(new MemoryStream(Encoding.UTF8.GetBytes("TEST ONLY\n"))); }
        public Task DeleteIfExistsAsync(string key, CancellationToken token) => throw new NotSupportedException();
        public Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maximum, CancellationToken token) => throw new NotSupportedException();
    }
}
