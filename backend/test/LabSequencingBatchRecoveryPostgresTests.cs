namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task EmptySequencingBatchRecoveryRequiresCurrentVersionAndReasonAndRetainsAudit()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var lab = scope.CreatePlatformLabController();
        var created = await lab.CreateBatch(new CreateBatchRequest(Notes: "TEST ONLY recovery"), default);
        var cleanupIds = new List<Guid> { created.Id };
        try
        {
            var batch = await scope.DbContext.LabOperationalBatches.SingleAsync(item => item.Id == created.Id);
            var originalStart = DateTime.UtcNow;
            // Reproduce the previously permitted empty start, without bypassing the new API guard.
            batch.Start(originalStart);
            await scope.DbContext.SaveChangesAsync();
            var version = batch.Version;
            var stale = await Assert.ThrowsAsync<OrderManagementException>(() => lab.TransitionBatch(
                batch.Id, new("return-to-draft", version - 1, Reason: "TEST ONLY correction"), default));
            Assert.Equal("concurrency_conflict", stale.ErrorCode);
            foreach (var reason in new[] { " ", new string('x', 4001) })
            {
                var missingReason = await Assert.ThrowsAsync<OrderManagementException>(() => lab.TransitionBatch(
                    batch.Id, new("return-to-draft", version, Reason: reason), default));
                Assert.Equal("batch_recovery_reason_required", missingReason.ErrorCode);
            }
            var emptyComplete = await Assert.ThrowsAsync<OrderManagementException>(() => lab.TransitionBatch(
                batch.Id, new("complete", version), default));
            Assert.Equal("batch_libraries_required", emptyComplete.ErrorCode);
            var emptySendout = await Assert.ThrowsAsync<OrderManagementException>(() => lab.CreateSendout(
                batch.Id, new("TEST ONLY provider", null, "{}", null), default));
            Assert.Equal("batch_libraries_required", emptySendout.ErrorCode);
            var sentBatchDto = await lab.CreateBatch(new CreateBatchRequest(Notes: "TEST ONLY retained sendout"), default);
            cleanupIds.Add(sentBatchDto.Id);
            var sentBatch = await scope.DbContext.LabOperationalBatches.SingleAsync(item => item.Id == sentBatchDto.Id);
            sentBatch.Start(originalStart);
            await scope.DbContext.SaveChangesAsync();
            var priorSendout = new LabNgsSendout(sentBatch.Id, "TEST ONLY prior sendout", null, "{}", null);
            scope.DbContext.LabNgsSendouts.Add(priorSendout);
            await scope.DbContext.SaveChangesAsync();
            var sentOutRecovery = await Assert.ThrowsAsync<OrderManagementException>(() => lab.TransitionBatch(
                sentBatch.Id, new("return-to-draft", sentBatch.Version, Reason: "TEST ONLY correction"), default));
            Assert.Equal("batch_recovery_unavailable", sentOutRecovery.ErrorCode);
            var recovered = await lab.TransitionBatch(batch.Id,
                new("return-to-draft", version, Reason: "  TEST ONLY accidental empty start  "), default);
            Assert.Equal(created.BatchNumber, recovered.BatchNumber);
            Assert.Equal(created.Name, recovered.Name);
            Assert.Equal(created.Notes, recovered.Notes);
            Assert.Equal("Draft", recovered.Status);
            Assert.Equal(0, recovered.MemberCount);
            Assert.Null(recovered.StartedAtUtc);
            Assert.Null(recovered.CompletedAtUtc);
            Assert.True(recovered.Version > version);
            var audit = await scope.DbContext.AuditEvents.SingleAsync(item => item.EntityId == batch.Id.ToString()
                && item.Operation == "EmptySequencingBatchReturnedToDraft");
            Assert.Equal(scope.PlatformUser.Id, audit.ActorUserId);
            var details = JsonDocument.Parse(audit.ChangesJson).RootElement;
            Assert.Equal("TEST ONLY accidental empty start", details.GetProperty("reason").GetString());
            Assert.Equal(originalStart, details.GetProperty("previousStartedAtUtc").GetDateTime());
            var emptyStart = await Assert.ThrowsAsync<OrderManagementException>(() => lab.TransitionBatch(
                batch.Id, new("start", recovered.Version), default));
            Assert.Equal("batch_libraries_required", emptyStart.ErrorCode);
            var repeatedRecovery = await Assert.ThrowsAsync<OrderManagementException>(() => lab.TransitionBatch(
                batch.Id, new("return-to-draft", recovered.Version, Reason: "TEST ONLY replay"), default));
            Assert.Equal("batch_recovery_unavailable", repeatedRecovery.ErrorCode);
        }
        finally
        {
            scope.DbContext.ChangeTracker.Clear();
            await scope.DbContext.LabNgsSendouts.Where(item => cleanupIds.Contains(item.LabOperationalBatchId)).ExecuteDeleteAsync();
            var entityIds = cleanupIds.Select(id => id.ToString()).ToArray();
            await scope.DbContext.AuditEvents.Where(item => entityIds.Contains(item.EntityId)).ExecuteDeleteAsync();
            await scope.DbContext.LabOperationalBatches.Where(item => cleanupIds.Contains(item.Id)).ExecuteDeleteAsync();
        }
    }
}
