namespace PhaenoPortal.Test;

using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.LabOperations.Domain;
using PSeq.Operations.Commercial.OrderManagement.Application;
using PSeq.Operations.Laboratory.Domain;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class PSeqResultRegistrationConcurrencyPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task OverlappingRegistrationsRecoverIdenticalRequestsAndRejectChangedRequests()
    {
        // Independent connections need committed data, so use a disposable local database.
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!);
        if (connection.Host is not ("localhost" or "127.0.0.1"))
            throw new InvalidOperationException("Concurrent registration verification requires local PostgreSQL.");
        var databaseName = $"pseq_registration_test_{Guid.NewGuid():N}";
        await using var admin = new NpgsqlConnection(connection.ConnectionString);
        await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE {databaseName}", admin))
            await create.ExecuteNonQueryAsync();
        connection.Database = databaseName;
        connection.Pooling = false;
        try
        {
            await using var setup = Db(connection.ConnectionString);
            await setup.Database.MigrateAsync();
            var organization = new Organization("TEST ONLY registration concurrency", OrganizationKind.Phaeno);
            var order = new LabServiceOrder(organization.Id, organization.Departments.Single().Id,
                "TEST-RACE", "TEST ONLY registration race", null, 1, false, "RNA", "Frozen", "Safe", "Synthetic setup");
            var sample = new LabSample(order.Id, "TEST-RACE-A", "RNA", "Synthetic", 1, "tube", "Frozen", "Safe", null, null, null, "[]");
            var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder,
                order.Id, organization.Id, "test-only", 1, "test-only", "TEST-RACE");
            var authorization = new CommercialLabAuthorization(work.AuthorizationId, order.Id, organization.Id, 1, Guid.NewGuid(), "{}");
            authorization.RecordOutcome(work.Id, "Accepted", "TEST_ONLY");
            setup.AddRange(organization, order, sample, work, authorization);
            await setup.SaveChangesAsync();
            var request = new RegisterResultPackageRequest(organization.Id, order.Id, work.Id, sample.Id,
                null, "{}", Hash("{}"), 1, "identical");

            await using var first = Db(connection.ConnectionString);
            await using var second = Db(connection.ConnectionString);
            var identicalGate = new OverlapAdapter();
            var identical = await Task.WhenAll(
                Controller(first, identicalGate).RegisterPackage(request, default),
                Controller(second, identicalGate).RegisterPackage(request, default));
            Assert.Equal(identical[0].Package.Id, identical[1].Package.Id);
            Assert.Single(identical, result => result.ObjectStorageUploadTargets.Count > 0);
            Assert.Equal(1, await setup.ResultOutputPackages.CountAsync());
            Assert.DoesNotContain(first.ChangeTracker.Entries(), entry => entry.State == EntityState.Added);
            Assert.DoesNotContain(second.ChangeTracker.Entries(), entry => entry.State == EntityState.Added);

            var replay = Controller(first, new ImmediateAdapter());
            foreach (var changed in new[] {
                request with { ExpectedArtifactCount = 2 },
                request with { CorrectsPackageId = Guid.NewGuid() },
                request with { OrganizationId = Guid.NewGuid() },
                request with { ManifestJson = "{\"changed\":true}", ManifestSha256 = Hash("{\"changed\":true}") }
            })
                Assert.Equal("result_idempotency_conflict", (await Assert.ThrowsAsync<OrderManagementException>(
                    () => replay.RegisterPackage(changed, default))).ErrorCode);

            var changedGate = new OverlapAdapter();
            var changedRequest = request with { IdempotencyKey = "changed-overlap" };
            var changedResults = await Task.WhenAll(
                Capture(Controller(first, changedGate), changedRequest),
                Capture(Controller(second, changedGate), changedRequest with { ManifestJson = "{\"changed\":true}", ManifestSha256 = Hash("{\"changed\":true}") }));
            Assert.Single(changedResults, result => result.Package is not null);
            Assert.Equal("result_idempotency_conflict", Assert.Single(changedResults, result => result.Error is not null).Error);
            Assert.Equal(2, await setup.ResultOutputPackages.CountAsync());

            // Different keys for one sample can collide on the allocated package version.
            var versionGate = new OverlapAdapter();
            var versionRequests = new[] { request with { IdempotencyKey = "version-a" }, request with { IdempotencyKey = "version-b" } };
            var versionResults = await Task.WhenAll(
                Capture(Controller(first, versionGate), versionRequests[0]),
                Capture(Controller(second, versionGate), versionRequests[1]));
            Assert.Single(versionResults, result => result.Package is not null);
            var losingIndex = Array.FindIndex(versionResults, result => result.Error is not null);
            Assert.Equal("result_package_registration_conflict", versionResults[losingIndex].Error);
            var retried = await Controller(losingIndex == 0 ? first : second, new ImmediateAdapter())
                .RegisterPackage(versionRequests[losingIndex], default);
            Assert.Equal(4, retried.Package.PackageVersion);
            var packages = await setup.ResultOutputPackages.AsNoTracking().ToListAsync();
            Assert.Equal(4, packages.Count);
            Assert.Equal(4, packages.Select(package => package.PackageVersion).Distinct().Count());
            Assert.All(packages, package => { Assert.Null(package.ScientificApprovalId); Assert.Null(package.ReleasedAtUtc); });
        }
        finally
        {
            await using var drop = new NpgsqlCommand($"DROP DATABASE {databaseName} WITH (FORCE)", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private static async Task<(ResultPackageDto? Package, string? Error)> Capture(
        PSeqResultPipelineController controller, RegisterResultPackageRequest request)
    {
        try { return ((await controller.RegisterPackage(request, default)).Package, null); }
        catch (OrderManagementException error) { return (null, error.ErrorCode); }
    }

    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    private static PSeqOperationsDbContext Db(string connection) => new(
        new DbContextOptionsBuilder<PSeqOperationsDbContext>().UseNpgsql(connection).Options, Options.Create(new PersistenceOptions()));
    private static PSeqResultPipelineController Controller(PSeqOperationsDbContext db, IPSeqResultPipelineAdapter adapter)
    {
        const string secret = "test-only-registration-secret-not-a-credential";
        var options = Options.Create(new PSeqOrderToCashOptions {
            GovernedPSeqResults = true, PipelineServiceSecret = secret,
            PipelineProviderKey = "test-only", ObjectStorageTransferBaseUrl = "https://example.test/upload"
        });
        var context = new DefaultHttpContext();
        context.Request.Headers[options.Value.PipelineServiceSecretHeaderName] = secret;
        return new(db, adapter, options) { ControllerContext = new ControllerContext { HttpContext = context } };
    }

    private sealed class ImmediateAdapter : IPSeqResultPipelineAdapter
    {
        public Task<PSeqResultTransferRegistration> RegisterManifestAsync(PSeqResultManifestRegistration registration, CancellationToken cancellationToken) =>
            Task.FromResult(new PSeqResultTransferRegistration("test-only", Hash(registration.IdempotencyKey), ["https://example.test/upload"]));
    }

    private sealed class OverlapAdapter : IPSeqResultPipelineAdapter
    {
        private readonly TaskCompletionSource ready = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private int arrivals;
        public async Task<PSeqResultTransferRegistration> RegisterManifestAsync(PSeqResultManifestRegistration registration, CancellationToken cancellationToken)
        {
            // Both requests must pass their lookup and version count before either insert can run.
            if (Interlocked.Increment(ref arrivals) == 2) ready.TrySetResult();
            await ready.Task.WaitAsync(TimeSpan.FromSeconds(10), cancellationToken);
            return await new ImmediateAdapter().RegisterManifestAsync(registration, cancellationToken);
        }
    }
}
