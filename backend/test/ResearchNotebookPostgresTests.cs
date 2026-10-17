namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using Npgsql;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Research;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using PSeq.Operations.Laboratory.Research;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ResearchNotebookRetainsHistoryRejectsStaleAndCompletedWritesAndCopiesOnlySetup()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var controller = scope.CreateResearchController();
            var project = await controller.CreateProject(new("Research " + scope.Suffix, null), default);
            var projectId = Data(project).GetProperty("id").GetGuid();
            var localDate = new DateOnly(2026, 10, 16);
            var created = Data(await controller.CreateExperiment(new(projectId, "Method exploration", null, InitialEntryDate: localDate), default));
            var experiment = created.GetProperty("experiment"); var id = experiment.GetProperty("id").GetGuid();
            Assert.False(created.TryGetProperty("entries", out _));
            var first = Data(await controller.Entries(id)).GetProperty("items")[0]; var entryId = first.GetProperty("id").GetGuid();
            Assert.Equal("2026-10-16", first.GetProperty("entryDate").GetString());
            var blocks = ResearchContent.Initial().Select(b => b with { Text = "saved " + b.Section }).ToArray();
            var request = new EntryRequest("Measured yield", new DateOnly(2026, 10, 16), blocks, 1, 1);
            await controller.UpdateEntry(id, entryId, request, default); scope.ClearTrackedState();
            var stale = await Assert.ThrowsAsync<OrderManagementException>(() => controller.UpdateEntry(id, entryId, request, default));
            Assert.Contains("changed", stale.Message);
            await controller.Transition(id, new("complete", 2), default); scope.ClearTrackedState();
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.UpdateEntry(id, entryId, request with { Version = 2, ExperimentVersion = 3 }, default));
            await controller.Transition(id, new("reopen", 3), default); scope.ClearTrackedState();
            var copy = Data(await controller.Copy(id, new(projectId, "Repeat", null, 4, localDate), default));
            var copyId = copy.GetProperty("experiment").GetProperty("id").GetGuid();
            var copiedSummary = Data(await controller.Entries(copyId)).GetProperty("items")[0];
            Assert.Equal("2026-10-16", copiedSummary.GetProperty("entryDate").GetString());
            var copiedEntry = Data(await controller.GetEntry(copyId, copiedSummary.GetProperty("id").GetGuid(), default)).GetProperty("entry");
            var copiedBlocks = ResearchContent.Read(copiedEntry.GetProperty("blocks").GetRawText());
            Assert.Equal("saved method", copiedBlocks.Single(b => b.Section == "method").Text);
            Assert.Equal("", copiedBlocks.Single(b => b.Section == "results").Text);
            Assert.Equal(2, await scope.DbContext.Set<ResearchRevision>().CountAsync(r => r.RecordKind == "entry" && r.RecordId == entryId));
            var source = await scope.DbContext.Set<ResearchEntry>().SingleAsync(e => e.Id == entryId);
            Assert.Contains("saved results", source.ContentJson);
            controller.HttpContext.Request.Headers["X-Organization-Id"] = scope.CustomerOrganization.Id.ToString();
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.GetExperiment(id, default));
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.Entries(id));
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.GetEntry(id, entryId, default));
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    [PostgreSqlReferenceFact]
    public async Task ResearchEntryListsAreBoundedAndContentLoadsOnlyForTheSelectedEntry()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var controller = scope.CreateResearchController();
            var projectId = Data(await controller.CreateProject(new("Paged research " + scope.Suffix, null), default)).GetProperty("id").GetGuid();
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.CreateExperiment(new(projectId, "Missing local date", null), default));
            scope.ClearTrackedState();
            var created = Data(await controller.CreateExperiment(new(projectId, "Large notebook", null, InitialEntryDate: new(2026, 10, 16)), default));
            var id = created.GetProperty("experiment").GetProperty("id").GetGuid();
            var entries = Enumerable.Range(1, 56).Select(index => new ResearchEntry(scope.PlatformOrganization.Id, id,
                "Recorded work " + index, new(2026, 10, 16), [new(Guid.NewGuid(), "text", "observations", "Observation", new string('x', 50000), null, null, null)])).ToArray();
            scope.DbContext.AddRange(entries); await scope.DbContext.SaveChangesAsync(); scope.ClearTrackedState();
            var metadata = Data(await controller.GetExperiment(id, default));
            Assert.Equal(57, metadata.GetProperty("entryCount").GetInt32());
            Assert.False(metadata.TryGetProperty("entries", out _));
            var firstPage = Data(await controller.Entries(id)); var lastPage = Data(await controller.Entries(id, 3));
            Assert.Equal(57, firstPage.GetProperty("totalCount").GetInt32());
            Assert.Equal(25, firstPage.GetProperty("items").GetArrayLength());
            Assert.Equal(7, lastPage.GetProperty("items").GetArrayLength());
            Assert.All(firstPage.GetProperty("items").EnumerateArray(), entry => Assert.False(entry.TryGetProperty("blocks", out _)));
            Assert.True(firstPage.GetRawText().Length < 30000);
            var selected = Data(await controller.GetEntry(id, entries[0].Id, default));
            Assert.Equal(50000, selected.GetProperty("entry").GetProperty("blocks")[0].GetProperty("text").GetString()!.Length);
            Assert.False(selected.TryGetProperty("entries", out _));
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    [PostgreSqlReferenceFact]
    public async Task ResearchSnapshotsUseFinalAuditStampsAndRevisionFailureRollsBackTheRecord()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var failRevision = new RejectResearchRevisionInterceptor();
        await using var db = scope.CreateResearchAuditDb(failRevision);
        await using var transaction = await db.Database.BeginTransactionAsync();
        var controller = scope.CreateResearchController(db);
        try
        {
            var projectId = Data(await controller.CreateProject(new("Audited research " + scope.Suffix, null), default)).GetProperty("id").GetGuid();
            var created = Data(await controller.CreateExperiment(new(projectId, "Audit stamps", null, InitialEntryDate: new(2026, 10, 16)), default));
            var id = created.GetProperty("experiment").GetProperty("id").GetGuid();
            var entryId = Data(await controller.Entries(id)).GetProperty("items")[0].GetProperty("id").GetGuid();
            await AssertSnapshotMatchesStoredEntry();
            await controller.UpdateEntry(id, entryId, new("Corrected observation", new(2026, 10, 16), [], 1, 1), default);
            await AssertSnapshotMatchesStoredEntry();
            failRevision.Enabled = true;
            await Assert.ThrowsAsync<InvalidOperationException>(() => controller.CreateProject(new("Rejected revision " + scope.Suffix, null), default));
            Assert.False(await db.Set<ResearchProject>().AsNoTracking().AnyAsync(p => p.Name == "Rejected revision " + scope.Suffix));

            async Task AssertSnapshotMatchesStoredEntry()
            {
                var stored = await db.Set<ResearchEntry>().AsNoTracking().SingleAsync(e => e.Id == entryId);
                var revision = await db.Set<ResearchRevision>().AsNoTracking().Where(r => r.RecordKind == "entry" && r.RecordId == entryId).OrderByDescending(r => r.Revision).FirstAsync();
                using var json = JsonDocument.Parse(revision.SnapshotJson); var snapshot = json.RootElement;
                Assert.Equal(scope.PlatformUser.Id, stored.CreatedByUserId); Assert.Equal(scope.PlatformUser.Id, stored.UpdatedByUserId);
                Assert.Equal(stored.CreatedByUserId, snapshot.GetProperty("createdByUserId").GetGuid());
                Assert.Equal(stored.UpdatedByUserId, snapshot.GetProperty("updatedByUserId").GetGuid());
                Assert.Equal(stored.Version, snapshot.GetProperty("version").GetInt64());
                Assert.Equal(stored.Version, revision.Revision);
                Assert.InRange((stored.CreatedAt - snapshot.GetProperty("createdAt").GetDateTime()).Duration(), TimeSpan.Zero, TimeSpan.FromMicroseconds(1));
                Assert.InRange((stored.UpdatedAt - snapshot.GetProperty("updatedAt").GetDateTime()).Duration(), TimeSpan.Zero, TimeSpan.FromMicroseconds(1));
            }
        }
        finally { await transaction.RollbackAsync(); }
    }

    [PostgreSqlReferenceFact]
    public async Task ResearchRecoveryManifestIncludesRetainedUnattachedUploads()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var controller = scope.CreateResearchController();
            var projectId = Data(await controller.CreateProject(new("Recovery research " + scope.Suffix, null), default)).GetProperty("id").GetGuid();
            var experiment = Data(await controller.CreateExperiment(new(projectId, "Retained uploads", null, InitialEntryDate: new(2026, 10, 17)), default));
            var experimentId = experiment.GetProperty("experiment").GetProperty("id").GetGuid();
            var entryId = Data(await controller.Entries(experimentId)).GetProperty("items")[0].GetProperty("id").GetGuid();
            var key = $"research/{scope.PlatformOrganization.Id:N}/{experimentId:N}/{entryId:N}/retained.bin";
            var receipt = new ResearchAttachment(scope.PlatformOrganization.Id, experimentId, entryId, "demo.txt", "application/octet-stream", key, new string('a', 64), 10, scope.PlatformUser.Id);
            scope.DbContext.Add(receipt); await scope.DbContext.SaveChangesAsync();
            var repository = new DirectoryInfo(AppContext.BaseDirectory);
            while (repository is not null && !File.Exists(Path.Combine(repository.FullName, "deployment/hetzner/green/backup/file-references.sql"))) repository = repository.Parent;
            Assert.NotNull(repository);
            await using var command = new NpgsqlCommand(await File.ReadAllTextAsync(Path.Combine(repository.FullName, "deployment/hetzner/green/backup/file-references.sql")),
                (NpgsqlConnection)scope.DbContext.Database.GetDbConnection(), (NpgsqlTransaction)transaction.GetDbTransaction());
            await using var reader = await command.ExecuteReaderAsync();
            var found = false;
            do { while (await reader.ReadAsync()) if (reader.FieldCount == 1 && reader.GetString(0) == $"order-files/{key}\t{receipt.Sha256}\t10\trequired") found = true; }
            while (await reader.NextResultAsync());
            Assert.True(found, "The recovery manifest must include retained research bytes even before notebook attachment.");
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    private sealed class RejectResearchRevisionInterceptor : SaveChangesInterceptor
    {
        public bool Enabled { get; set; }
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (Enabled && eventData.Context!.ChangeTracker.Entries<ResearchRevision>().Any(e => e.State == EntityState.Added))
                throw new InvalidOperationException("Simulated revision write failure.");
            return ValueTask.FromResult(result);
        }
    }

    private sealed class ResearchAuditUser(Guid userId) : ICurrentUserContext
    {
        public Guid? UserId => userId;
        public Guid? OrganizationId => null;
        public string? RequestId => "research-audit-regression";
    }
    private static JsonElement Data(object value) => JsonSerializer.SerializeToElement(value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
    private sealed partial class ShippingTestScope
    {
        public PSeqOperationsDbContext CreateResearchAuditDb(ISaveChangesInterceptor failure) => new(
            new DbContextOptionsBuilder<PSeqOperationsDbContext>().UseNpgsql(connectionString)
                .AddInterceptors(new AuditSaveChangesInterceptor(new ResearchAuditUser(PlatformUser.Id)), failure).Options,
            Options.Create(persistenceOptions));
        public ResearchController CreateResearchController(PSeqOperationsDbContext? context = null)
        {
            var http = new DefaultHttpContext(); http.Request.Headers["X-Organization-Id"] = PlatformOrganization.Id.ToString();
            return new(context ?? DbContext, new FixedIdentityContext(platformIdentity)) { ControllerContext = new() { HttpContext = http } };
        }
    }
}
