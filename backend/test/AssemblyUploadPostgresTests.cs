namespace PhaenoPortal.Test;

using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class AssemblyUploadPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task FailedIdempotencySaveRemovesUnreferencedBytesAndRetryStoresOneInput()
    {
        await using var scope = await Scope.Create();
        scope.Failures.Enabled = true;
        await Assert.ThrowsAsync<InvalidOperationException>(() => scope.Upload());
        Assert.Empty(scope.Storage.Files);
        Assert.Equal(1, scope.Storage.DeleteCount);
        Assert.False(await scope.Db.ManagedOperationalFiles.AsNoTracking().AnyAsync(item => item.WorkflowId == scope.Request.Id));
        scope.Db.ChangeTracker.Clear();
        scope.Failures.Enabled = false;
        var uploaded = await scope.Upload();
        scope.Db.ChangeTracker.Clear();
        var retry = await scope.Upload();
        Assert.Equal(uploaded.Id, retry.Id);
        Assert.Equal(2, scope.Storage.SaveCount);
        Assert.Single(scope.Storage.Files);
        Assert.Single(await scope.Db.ManagedOperationalFiles.AsNoTracking().Where(item => item.WorkflowId == scope.Request.Id).ToListAsync());
    }

    private sealed class Scope : IAsyncDisposable
    {
        public PSeqOperationsDbContext Db { get; private set; } = null!;
        private Organization Partner { get; } = new($"Upload fixture {Guid.NewGuid():N}", OrganizationKind.Partner);
        private ExternalIdentity Identity { get; } = new("test", Guid.NewGuid().ToString("N"), $"upload-{Guid.NewGuid():N}@example.test", true);
        private User Actor { get; set; } = null!;
        private QboCatalogItem Catalog { get; } = new($"upload-{Guid.NewGuid():N}", "Upload fixture", "Fixture", "specimen", 1, "USD", true, DateTime.UtcNow);
        private AssemblyProfile Profile { get; set; } = null!;
        public DataAssemblyRequest Request { get; private set; } = null!;
        public Storage Storage { get; } = new();
        public SaveFailure Failures { get; } = new();
        private string AuditRequestId { get; } = "assembly-upload-" + Guid.NewGuid().ToString("N");
        private string IdempotencyKey { get; } = Guid.NewGuid().ToString();

        public static async Task<Scope> Create()
        {
            var scope = new Scope();
            var persistence = new PersistenceOptions
            {
                CommercialSchema = Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_COMMERCIAL_SCHEMA") ?? "commercial_ops",
                LaboratorySchema = Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_LABORATORY_SCHEMA") ?? "lab_ops",
                MigrationsHistorySchema = Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_MIGRATIONS_HISTORY_SCHEMA") ?? "public"
            }.Validate();
            var options = new DbContextOptionsBuilder<PSeqOperationsDbContext>()
                .UseNpgsql(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!)
                .AddInterceptors(new AuditSaveChangesInterceptor(new AuditContext(scope.AuditRequestId)), scope.Failures).Options;
            scope.Db = new(options, Options.Create(persistence));
            scope.Actor = new(scope.Identity.Email, "Upload", "Fixture");
            scope.Actor.LinkExternalIdentity(scope.Identity.Provider, scope.Identity.SubjectId);
            scope.Actor.Activate();
            scope.Profile = new(scope.Catalog.Id, "Upload profile", 1, "Fixture", "Instructions", "{}", "[\".txt\"]", "{}", 1000, 2000, true, false);
            scope.Request = new(scope.Partner.Id, scope.Partner.Departments.Single(item => item.IsDefault).Id,
                $"ASM-{Guid.NewGuid():N}", "Fixture", scope.Profile.Id, 1, scope.Profile.Name, "Instructions", "{}", "Fixture output", null, true);
            scope.Db.AddRange(scope.Partner, scope.Actor, scope.Catalog, scope.Profile, scope.Request,
                new OrganizationMembership(scope.Actor.Id, scope.Partner.Id, true));
            await scope.Db.SaveChangesAsync();
            return scope;
        }

        public async Task<OperationalFileDto> Upload()
        {
            var http = new DefaultHttpContext();
            http.Request.Headers["Idempotency-Key"] = IdempotencyKey;
            http.Request.Headers["X-Organization-Id"] = Partner.Id.ToString();
            http.Request.Headers["X-Department-Id"] = Request.DepartmentId.ToString();
            var controller = new DataAssemblyRequestsController(Db, new(Db, new IdentityContext(Identity)), new(Db), Storage,
                new Scanner(), Options.Create(new OrderManagementOptions { AllowedFileKinds = new() { [".txt"] = "text/plain" } }),
                null!, null!, NullLogger<CompletionTrackedFileStreamResult>.Instance, NullLogger<CompletionTrackedArchiveResult>.Instance)
                { ControllerContext = new() { HttpContext = http } };
            await using var bytes = new MemoryStream(Encoding.UTF8.GetBytes("Assembly input fixture"));
            var file = new FormFile(bytes, 0, bytes.Length, "file", "fixture.txt")
                { Headers = new HeaderDictionary(), ContentType = "text/plain" };
            return await controller.UploadInput(Request.Id, file, default);
        }

        public async ValueTask DisposeAsync()
        {
            try
            {
                Db.ChangeTracker.Clear();
                await Db.ManagedOperationalFiles.Where(item => item.WorkflowId == Request.Id).ExecuteDeleteAsync();
                await Db.OrderIdempotencyRecords.Where(item => item.ActorUserId == Actor.Id).ExecuteDeleteAsync();
                await Db.DataAssemblyRequests.Where(item => item.Id == Request.Id).ExecuteDeleteAsync();
                await Db.AssemblyProfiles.Where(item => item.Id == Profile.Id).ExecuteDeleteAsync();
                await Db.QboCatalogItems.Where(item => item.Id == Catalog.Id).ExecuteDeleteAsync();
                await Db.AuditEvents.Where(item => item.RequestId == AuditRequestId).ExecuteDeleteAsync();
                await Db.OrganizationDepartmentMemberships.Where(item => item.Department.OrganizationId == Partner.Id).ExecuteDeleteAsync();
                await Db.OrganizationDepartments.Where(item => item.OrganizationId == Partner.Id).ExecuteDeleteAsync();
                await Db.OrganizationMemberships.Where(item => item.OrganizationId == Partner.Id).ExecuteDeleteAsync();
                await Db.Users.Where(item => item.Id == Actor.Id).ExecuteDeleteAsync();
                await Db.Organizations.Where(item => item.Id == Partner.Id).ExecuteDeleteAsync();
            }
            finally { await Db.DisposeAsync(); }
        }
    }

    private sealed class IdentityContext(ExternalIdentity identity) : IExternalIdentityContext
    { public ExternalIdentity? Read(HttpContext context) => identity; }
    private sealed class AuditContext(string requestId) : ICurrentUserContext
    { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => requestId; }
    private sealed class Scanner : IOperationalFileScanner
    {
        public Task<OperationalScanResult> ScanAsync(string storageKey, CancellationToken cancellationToken)
            => Task.FromResult(new OperationalScanResult(OperationalFileScanStatus.Clean, "Fixture scan"));
    }
    private sealed class Storage : IOperationalFileStorage
    {
        public Dictionary<string, byte[]> Files { get; } = [];
        public int SaveCount { get; private set; }
        public int DeleteCount { get; private set; }
        public async Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maximumBytes, CancellationToken cancellationToken)
        {
            using var bytes = new MemoryStream();
            await content.CopyToAsync(bytes, cancellationToken);
            var key = Guid.NewGuid().ToString("N") + extension;
            var value = bytes.ToArray();
            Files.Add(key, value);
            SaveCount++;
            return new(key, value.Length, Convert.ToHexString(SHA256.HashData(value)));
        }
        public Task<Stream> OpenReadAsync(string storageKey, CancellationToken cancellationToken) => Task.FromResult<Stream>(new MemoryStream(Files[storageKey]));
        public Task DeleteIfExistsAsync(string storageKey, CancellationToken cancellationToken)
        { DeleteCount++; Files.Remove(storageKey); return Task.CompletedTask; }
    }
    private sealed class SaveFailure : SaveChangesInterceptor
    {
        public bool Enabled { get; set; }
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (Enabled && eventData.Context!.ChangeTracker.Entries<OrderIdempotencyRecord>().Any(entry => entry.State == EntityState.Added))
                throw new InvalidOperationException("Simulated idempotency save failure.");
            return ValueTask.FromResult(result);
        }
    }
}
