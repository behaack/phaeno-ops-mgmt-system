namespace PhaenoPortal.Test;

using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ConcurrentPreparationCreatesResolveNameCollisionsAndRetainRetryIdentity()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext;
        var now = DateTime.UtcNow;
        var workflow = new LabServiceWorkflow($"race-{scope.Suffix}", "TEST ONLY creation race", null);
        var protocol = new LabProtocol($"race-{scope.Suffix}", "TEST ONLY preparation", null);
        var protocolVersion = new LabProtocolVersion(protocol.Id, 1, LabPreparationBatchTests.Definition().ToJson(), scope.PlatformUser.Id, now);
        protocolVersion.Approve(scope.CustomerUser.Id, now);
        var workflowVersion = new LabServiceWorkflowVersion(workflow.Id, 1, scope.PlatformUser.Id, now);
        workflowVersion.Approve(scope.CustomerUser.Id, now);
        var stage = new LabServiceWorkflowStage(workflowVersion.Id, 1, "Preparation", protocolVersion.Id, LabServiceWorkflowStageRequirement.Required, null, null);
        var format = new LabTrayFormat(new("TEST ONLY race tray", 1, 2, "grid", []));
        workflow.RecordVersion(1);
        protocol.RecordVersion(1);
        db.AddRange(workflow, protocol, protocolVersion, workflowVersion, stage, format);
        // Cover a bounded wall-clock window so both requests must resolve an existing
        // base-name collision without changing the application or machine clock.
        var reservedNames = Enumerable.Range(-1, 122).Select(offset =>
            $"{workflow.ServiceKey}-{now.AddSeconds(offset).ToString("yyyyMMdd-HHmmss", CultureInfo.InvariantCulture)}").ToHashSet();
        db.AddRange(reservedNames.Select(name => new LabPreparationBatch(name, format, workflowVersion.Id)));
        await db.SaveChangesAsync();
        scope.ClearTrackedState();
        try
        {
            await using var leftDb = scope.CreateAdditionalContext();
            await using var rightDb = scope.CreateAdditionalContext();
            await using var blockerDb = scope.CreateAdditionalContext();
            await leftDb.Database.OpenConnectionAsync();
            await rightDb.Database.OpenConnectionAsync();
            var leftPid = ((NpgsqlConnection)leftDb.Database.GetDbConnection()).ProcessID;
            var rightPid = ((NpgsqlConnection)rightDb.Database.GetDbConnection()).ProcessID;
            var leftRequest = new CreateLabPreparationRequest(Guid.NewGuid(), null, format.Id, workflowVersion.Id, "TEST ONLY left request");
            var rightRequest = new CreateLabPreparationRequest(Guid.NewGuid(), null, format.Id, workflowVersion.Id, "TEST ONLY right request");
            var left = scope.CreatePreparationController(leftDb);
            var right = scope.CreatePreparationController(rightDb);
            await using var blocker = await blockerDb.Database.BeginTransactionAsync();
            await SampleShippingPackingData.LockAsync(blockerDb, "lab-preparation-name", default);
            var leftTask = left.CreatePreparation(leftRequest, default);
            var rightTask = right.CreatePreparation(rightRequest, default);
            var bothWaiting = false;
            try
            {
                for (var attempt = 0; attempt < 100; attempt++)
                {
                    var count = await db.Database.SqlQuery<int>($"SELECT count(DISTINCT pid)::integer AS \"Value\" FROM pg_locks WHERE locktype = 'advisory' AND NOT granted AND pid IN ({leftPid}, {rightPid})").SingleAsync();
                    if (count == 2) { bothWaiting = true; break; }
                    await Task.Delay(50);
                }
            }
            finally { await blocker.CommitAsync(); }
            var batches = (await Task.WhenAll(leftTask, rightTask)).Select(Json).ToArray();
            Assert.True(bothWaiting, "Both connections must be waiting on the held allocation lock before release.");
            var names = batches.Select(batch => batch.GetProperty("name").GetString()!).ToArray();
            var ids = batches.Select(batch => batch.GetProperty("id").GetGuid()).ToArray();
            Assert.NotEqual(ids[0], ids[1]);
            Assert.NotEqual(names[0], names[1]);
            Assert.All(names, name => Assert.Contains(name[..name.LastIndexOf('-')], reservedNames));
            Assert.All(batches, batch => Assert.Equal("Draft", batch.GetProperty("status").GetString()));
            Assert.Equal("TEST ONLY left request", batches[0].GetProperty("notes").GetString());
            Assert.Equal("TEST ONLY right request", batches[1].GetProperty("notes").GetString());
            leftDb.ChangeTracker.Clear();
            rightDb.ChangeTracker.Clear();
            var replays = (await Task.WhenAll(left.CreatePreparation(leftRequest, default), right.CreatePreparation(rightRequest, default))).Select(Json).ToArray();
            Assert.Equal(ids, replays.Select(batch => batch.GetProperty("id").GetGuid()));
            Assert.Equal(names, replays.Select(batch => batch.GetProperty("name").GetString()));
            Assert.Equal(reservedNames.Count + 2, await db.LabPreparationBatches.CountAsync(batch => batch.LabServiceWorkflowVersionId == workflowVersion.Id));
            Assert.Equal(2, await db.LabPreparationRecords.CountAsync(record => ids.Contains(record.LabPreparationBatchId)));
            Assert.Equal(0, await db.LabPreparationMembers.CountAsync(member => ids.Contains(member.LabPreparationBatchId)));
        }
        finally
        {
            scope.ClearTrackedState();
            var ids = await db.LabPreparationBatches.Where(batch => batch.LabServiceWorkflowVersionId == workflowVersion.Id).Select(batch => batch.Id).ToArrayAsync();
            await db.LabPreparationRecords.Where(record => ids.Contains(record.LabPreparationBatchId)).ExecuteDeleteAsync();
            await db.LabPreparationBatches.Where(batch => ids.Contains(batch.Id)).ExecuteDeleteAsync();
            await db.LabTrayFormats.Where(item => item.Id == format.Id).ExecuteDeleteAsync();
            await db.LabServiceWorkflowStages.Where(item => item.Id == stage.Id).ExecuteDeleteAsync();
            await db.LabServiceWorkflowVersions.Where(item => item.Id == workflowVersion.Id).ExecuteDeleteAsync();
            await db.LabServiceWorkflows.Where(item => item.Id == workflow.Id).ExecuteDeleteAsync();
            await db.LabProtocolVersions.Where(item => item.Id == protocolVersion.Id).ExecuteDeleteAsync();
            await db.LabProtocols.Where(item => item.Id == protocol.Id).ExecuteDeleteAsync();
        }
        static JsonElement Json(object value) => JsonSerializer.SerializeToElement(value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
    }
}
