namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public Task PreparationMixedTrayEnforcesReservationsEvidenceFailureAndQcHandoff() => VerifyPreparationJourneyAsync(false);

    [PostgreSqlReferenceFact]
    public Task PreparationOptionalFinalStageAndExistingOutputPreserveQcHandoff() => VerifyPreparationJourneyAsync(true);

    private async Task VerifyPreparationJourneyAsync(bool skipFinal)
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext; var lab = scope.CreateLabController(); var now = DateTime.UtcNow;
        var workflow = new LabServiceWorkflow($"prep-{scope.Suffix}", "TEST ONLY preparation", null);
        var protocol = new LabProtocol($"prep-{scope.Suffix}", "TEST ONLY scoped preparation", null);
        var pv = new LabProtocolVersion(protocol.Id, 1, LabPreparationBatchTests.Definition().ToJson(), scope.PlatformUser.Id, now);
        pv.Approve(scope.CustomerUser.Id, now);
        var wv = new LabServiceWorkflowVersion(workflow.Id, 1, scope.PlatformUser.Id, now); wv.Approve(scope.CustomerUser.Id, now);
        var stage = new LabServiceWorkflowStage(wv.Id, 1, "Preparation", pv.Id, LabServiceWorkflowStageRequirement.Required, null, null);
        var optionalStage = skipFinal ? new LabServiceWorkflowStage(wv.Id, 2, "Optional finishing", pv.Id, LabServiceWorkflowStageRequirement.Optional, null, null) : null;
        if (optionalStage is not null) db.Add(optionalStage);
        workflow.RecordVersion(1); protocol.RecordVersion(1);
        var format = new LabTrayFormat(new("TEST ONLY 2 × 3", 2, 3, "grid", ["B3"]));
        var workIds = new List<Guid>(); var tubeIds = new List<Guid>();
        var material = new LabMaterialDefinition($"prep-{scope.Suffix}", "TEST ONLY reagent", LabMaterialLotKind.PreparedReagent);
        var storage = new LabStorageLocation($"TEST-PREP-{scope.Suffix}");
        var lot = new LabMaterialLot(LabMaterialLotKind.PreparedReagent, material.Id, $"TEST-PREP-{scope.Suffix}", null, null, storage.Id, 100, "mL");
        lot.RecordQc(LabQcDisposition.Passed, DateOnly.FromDateTime(now), null, "{}", scope.PlatformUser.Id, now);
        db.AddRange(workflow, protocol, pv, wv, stage, format, material, storage, lot);
        for (var i = 0; i < 2; i++)
        {
            var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, Guid.NewGuid(), scope.CustomerOrganization.Id,
                workflow.ServiceKey, 1, "test", $"TEST-PREP-{scope.Suffix}-{i}", wv.Id);
            work.SetTubeUsePolicy(LabTubeUsePolicy.RunOneWithFailureFallback, 1); work.RecordMilestone(LabWorkOrderStatus.Received);
            var specimen = new LabSpecimen(work.Id, Guid.NewGuid()); specimen.RecordReceipt(now, "TEST ONLY", "TEST-BOX"); specimen.AssignAccession($"TEST-PREP-{scope.Suffix}-{i}");
            work.Specimens.Add(specimen); var tubes = new List<LabContainer>();
            for (var j = 0; j < 2; j++)
            {
                var tube = new LabContainer(work.Id, specimen.Id, null, LabContainerKind.SubmittedSpecimen, $"TEST-PREP-{scope.Suffix}-{i}-{j}", "TEST ONLY", "TEST-BOX", 20, "uL", null);
                tube.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, scope.PlatformUser.Id, now); tubes.Add(tube); tubeIds.Add(tube.Id); db.Add(tube);
            }
            specimen.RefreshIntakeFromTubes(tubes, now); db.Add(work); workIds.Add(work.Id);
        }
        await db.SaveChangesAsync(); scope.ClearTrackedState();
        var prepIds = new List<Guid>(); var sequencingId = Guid.Empty;
        try
        {
            var createRequest = new CreateLabPreparationRequest(Guid.NewGuid(), null, format.Id, wv.Id, "TEST ONLY mixed tray notes");
            var batch = Json(await lab.CreatePreparation(createRequest, default)); var id = batch.GetProperty("id").GetGuid(); prepIds.Add(id);
            Assert.StartsWith(workflow.ServiceKey + "-", batch.GetProperty("name").GetString());
            Assert.Equal("TEST ONLY mixed tray notes", batch.GetProperty("notes").GetString());
            scope.ClearTrackedState();
            var replay = Json(await lab.CreatePreparation(createRequest, default));
            Assert.Equal(id, replay.GetProperty("id").GetGuid());
            Assert.Equal(batch.GetProperty("name").GetString(), replay.GetProperty("name").GetString());
            var other = Json(await lab.CreatePreparation(new(Guid.NewGuid(), "TEST ONLY reserve tray", format.Id, wv.Id), default)); var otherId = other.GetProperty("id").GetGuid(); prepIds.Add(otherId);
            Assert.NotEqual(batch.GetProperty("name").GetString(), other.GetProperty("name").GetString());
            Assert.NotEqual("TEST ONLY reserve tray", other.GetProperty("name").GetString());
            async Task<JsonElement> Command(string action, Func<long, LabPreparationCommand>? make = null)
            {
                scope.ClearTrackedState(); var version = await db.LabPreparationBatches.Where(b => b.Id == id).Select(b => b.Version).SingleAsync();
                return Json(await lab.ApplyPreparation(id, make?.Invoke(version) ?? new(Guid.NewGuid(), version, action), default));
            }
            await using (var leftDb = scope.CreateAdditionalContext())
            await using (var rightDb = scope.CreateAdditionalContext())
            {
                var left = scope.CreatePreparationController(leftDb); var right = scope.CreatePreparationController(rightDb);
                var leftTask = CaptureAsync(() => left.ApplyPreparation(id, new(Guid.NewGuid(), batch.GetProperty("version").GetInt64(), "add", Position: "A1", Barcode: $"TEST-PREP-{scope.Suffix}-0-0"), default));
                var rightTask = CaptureAsync(() => right.ApplyPreparation(otherId, new(Guid.NewGuid(), other.GetProperty("version").GetInt64(), "add", Position: "A1", Barcode: $"TEST-PREP-{scope.Suffix}-0-0"), default));
                var results = await Task.WhenAll(leftTask, rightTask);
                Assert.Single(results, error => error is null); Assert.Single(results, error => error is not null);
                if (results[0] is not null) (id, otherId) = (otherId, id);
                scope.ClearTrackedState();
                batch = Json(await lab.ReadPreparation(id, default)); other = Json(await lab.ReadPreparation(otherId, default));
            }
            var first = batch.GetProperty("members")[0].GetProperty("id").GetGuid();
            await using (var deniedDb = scope.CreateAdditionalContext())
            {
                var denied = scope.CreatePreparationController(deniedDb, true);
                await Assert.ThrowsAsync<OrderManagementException>(() => denied.ReadPreparation(id, default));
                await Assert.ThrowsAsync<OrderManagementException>(() => denied.ApplyPreparation(id, new(Guid.NewGuid(), batch.GetProperty("version").GetInt64(), "cancel", Reason: "Unauthorised"), default));
            }
            await Assert.ThrowsAsync<OrderManagementException>(() => Command("move", _ => new(Guid.NewGuid(), 0, "move", MemberId: first, Position: "B1")));
            await Assert.ThrowsAsync<OrderManagementException>(() => Command("add", v => new(Guid.NewGuid(), v, "add", Position: "A1", Barcode: $"TEST-PREP-{scope.Suffix}-1-0")));
            scope.ClearTrackedState();
            await Assert.ThrowsAsync<OrderManagementException>(() => lab.ApplyPreparation(otherId, new(Guid.NewGuid(), other.GetProperty("version").GetInt64(), "add", Position: "A1", Barcode: $"TEST-PREP-{scope.Suffix}-0-0"), default));
            batch = await Command("add", v => new(Guid.NewGuid(), v, "add", Position: "A2", Barcode: $"TEST-PREP-{scope.Suffix}-1-0"));
            var second = batch.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("id").GetGuid() != first).GetProperty("id").GetGuid();
            var startRequest = new LabPreparationCommand(Guid.NewGuid(), batch.GetProperty("version").GetInt64(), "start", Confirmed: true);
            batch = await Command("start", _ => startRequest);
            scope.ClearTrackedState(); await lab.ApplyPreparation(id, startRequest, default); // uncertain response retry, no duplicate start
            Assert.Equal(2, await db.LabSpecimenAttempts.CountAsync(a => workIds.Contains(a.LabWorkOrderId)));
            await Assert.ThrowsAsync<OrderManagementException>(() => Command("move", v => new(Guid.NewGuid(), v, "move", MemberId: first, Position: "B1")));
            scope.ClearTrackedState();
            var materialRequest = new LabPreparationCommand(Guid.NewGuid(), (await db.LabPreparationBatches.SingleAsync(b => b.Id == id)).Version, "material", StageId: stage.Id,
                Confirmed: true, ResourceId: lot.Id, ResourceVersion: (await db.LabMaterialLots.SingleAsync(l => l.Id == lot.Id)).Version, Quantity: 2, QuantityUnit: "mL", CoveredMemberIds: [first, second]);
            var historyBeforeConflict = await db.LabPreparationRecords.CountAsync(r => r.LabPreparationBatchId == id);
            var stale = await Assert.ThrowsAsync<OrderManagementException>(() => lab.ApplyPreparation(id,
                materialRequest with { RequestId = Guid.NewGuid(), Version = startRequest.Version }, default));
            Assert.Equal("concurrency_conflict", stale.ErrorCode);
            scope.ClearTrackedState();
            Assert.Equal(historyBeforeConflict, await db.LabPreparationRecords.CountAsync(r => r.LabPreparationBatchId == id));
            Assert.Equal(100, (await db.LabMaterialLots.AsNoTracking().SingleAsync(l => l.Id == lot.Id)).AvailableQuantity);
            Assert.Equal(0, await db.LabMaterialConsumptions.CountAsync(c => c.LabMaterialLotId == lot.Id));
            await lab.ApplyPreparation(id, materialRequest, default); scope.ClearTrackedState(); await lab.ApplyPreparation(id, materialRequest, default);
            Assert.Equal(98, (await db.LabMaterialLots.AsNoTracking().SingleAsync(l => l.Id == lot.Id)).AvailableQuantity);
            Assert.Equal(1, await db.LabMaterialConsumptions.CountAsync(c => c.LabMaterialLotId == lot.Id));
            var step = new LabPreparationStepInput(stage.Id, "qc", "record", "recorded", [first, second], new Dictionary<string, JsonElement> { ["value"] = JsonSerializer.SerializeToElement(20) },
                [new(second, new Dictionary<string, JsonElement> { ["value"] = JsonSerializer.SerializeToElement(2) }, "hold", "TEST ONLY hold")], "pass", null, true, true, false);
            batch = await Command("step", v => new(Guid.NewGuid(), v, "step", Step: step));
            Assert.Contains(batch.GetProperty("members").EnumerateArray(), m => m.GetProperty("state").GetString() == "OnHold");
            await Assert.ThrowsAsync<OrderManagementException>(() => Command("advance", v => new(Guid.NewGuid(), v, "advance", StageId: stage.Id)));
            batch = await Command("fail", v => new(Guid.NewGuid(), v, "fail", MemberId: second, ReasonCode: "analysis_failed", Reason: "TEST ONLY unrecoverable failure"));
            await Assert.ThrowsAsync<OrderManagementException>(() => Command("step", v => new(Guid.NewGuid(), v, "step", Step: step with { Action = "repeat", Reason = "Cannot revive failed tube" })));
            await Command("step", v => new(Guid.NewGuid(), v, "step", Step: new(stage.Id, "review", "record", "recorded", [first], new Dictionary<string, JsonElement>(), [], null, null, true, false, false)));
            if (skipFinal)
            {
                scope.ClearTrackedState();
                var existingAttemptId = batch.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("id").GetGuid() == first).GetProperty("attemptId").GetGuid();
                var attempt = await db.LabSpecimenAttempts.SingleAsync(a => a.Id == existingAttemptId);
                var existingOutput = new LabContainer(attempt.LabWorkOrderId, attempt.LabSpecimenId, attempt.SourceContainerId, LabContainerKind.Library,
                    $"TEST-OUTPUT-{scope.Suffix}", "TEST ONLY existing output", "TEST-BOX", 10, "uL", null);
                existingOutput.AttachAttempt(attempt); db.Add(existingOutput); await db.SaveChangesAsync();
                batch = Json(await lab.ReadPreparation(id, default));
                Assert.Single(batch.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("id").GetGuid() == first).GetProperty("availableOutputs").EnumerateArray());
                await Command("output", v => new(Guid.NewGuid(), v, "output", MemberId: first, OutputContainerId: existingOutput.Id, Barcode: existingOutput.Barcode, Quantity: 10, QuantityUnit: "uL"));
                await Command("advance", v => new(Guid.NewGuid(), v, "advance", StageId: stage.Id));
                await Command("skip-stage", v => new(Guid.NewGuid(), v, "skip-stage", StageId: optionalStage!.Id, Reason: "TEST ONLY finishing not applicable"));
            }
            else
            {
                batch = await Command("output", v => new(Guid.NewGuid(), v, "output", MemberId: first, Quantity: 10, QuantityUnit: "uL", Location: "TEST-BOX"));
                var outputBarcode = batch.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("id").GetGuid() == first).GetProperty("output").GetProperty("barcode").GetString();
                await Assert.ThrowsAsync<OrderManagementException>(() => Command("advance", v => new(Guid.NewGuid(), v, "advance", StageId: stage.Id)));
                await Command("confirm-output", v => new(Guid.NewGuid(), v, "confirm-output", MemberId: first, Barcode: outputBarcode));
                await Command("advance", v => new(Guid.NewGuid(), v, "advance", StageId: stage.Id));
            }
            batch = await Command("complete", v => new(Guid.NewGuid(), v, "complete", Confirmed: true));
            Assert.Equal("Complete", batch.GetProperty("status").GetString());
            var library = await db.LabLibraries.AsNoTracking().SingleAsync(l => workIds.Contains(l.LabWorkOrderId));
            Assert.Equal(LabLibraryStatus.QcPassed, library.Status); Assert.Contains("preparation", library.QcResultsJson);
            await Assert.ThrowsAsync<OrderManagementException>(() => lab.RecordLibraryQc(library.Id, new(true, "{}", library.Version), default));
            scope.ClearTrackedState();
            var sequencing = await lab.CreateBatch(new("TEST ONLY sequencing", "Synthetic test only"), default); sequencingId = sequencing.Id;
            await lab.AddBatchMember(sequencing.Id, new(library.LabWorkOrderId, library.Id), default);
            scope.ClearTrackedState();
            var duplicate = await Assert.ThrowsAsync<OrderManagementException>(() => lab.AddBatchMember(sequencing.Id, new(library.LabWorkOrderId, library.Id), default));
            Assert.Equal("batch_member_duplicate", duplicate.ErrorCode);
            scope.ClearTrackedState();
            var reserve = Json(await lab.ApplyPreparation(otherId, new(Guid.NewGuid(), other.GetProperty("version").GetInt64(), "add", Position: "A1", Barcode: $"TEST-PREP-{scope.Suffix}-1-1"), default));
            Assert.Equal(2, reserve.GetProperty("members")[0].GetProperty("sequence").GetInt32());
        }
        finally
        {
            scope.ClearTrackedState();
            var attemptIds = await db.LabSpecimenAttempts.Where(a => workIds.Contains(a.LabWorkOrderId)).Select(a => a.Id).ToArrayAsync();
            var executionIds = await db.LabProtocolExecutions.Where(e => workIds.Contains(e.LabWorkOrderId)).Select(e => e.Id).ToArrayAsync();
            await db.LabBatchMembers.Where(m => workIds.Contains(m.LabWorkOrderId)).ExecuteDeleteAsync();
            await db.LabOperationalBatches.Where(b => b.Id == sequencingId).ExecuteDeleteAsync();
            await db.LabPreparationMembers.Where(m => prepIds.Contains(m.LabPreparationBatchId)).ExecuteDeleteAsync();
            await db.LabLibraries.Where(l => workIds.Contains(l.LabWorkOrderId)).ExecuteDeleteAsync();
            await db.LabMaterialConsumptions.Where(c => executionIds.Contains(c.LabProtocolExecutionId)).ExecuteDeleteAsync();
            await db.LabEquipmentUsages.Where(c => executionIds.Contains(c.LabProtocolExecutionId)).ExecuteDeleteAsync();
            await db.LabPreparationRecords.Where(r => prepIds.Contains(r.LabPreparationBatchId)).ExecuteDeleteAsync();
            await db.LabPreparationBatches.Where(b => prepIds.Contains(b.Id)).ExecuteDeleteAsync();
            await db.LabExceptions.Where(e => workIds.Contains(e.LabWorkOrderId)).ExecuteDeleteAsync();
            await db.LabSpecimenAttempts.Where(a => attemptIds.Contains(a.Id)).ExecuteUpdateAsync(s => s.SetProperty(a => a.FailedExecutionId, (Guid?)null).SetProperty(a => a.PreviousAttemptId, (Guid?)null));
            await db.LabProtocolExecutions.Where(e => executionIds.Contains(e.Id)).ExecuteDeleteAsync();
            await db.LabContainers.Where(c => workIds.Contains(c.LabWorkOrderId) && c.LabSpecimenAttemptId != null).ExecuteDeleteAsync();
            await db.LabSpecimenAttempts.Where(a => attemptIds.Contains(a.Id)).ExecuteDeleteAsync();
            await db.LabTrayFormats.Where(f => f.Id == format.Id).ExecuteDeleteAsync();
            await db.LabMaterialLots.Where(l => l.Id == lot.Id).ExecuteDeleteAsync();
            await db.LabMaterialDefinitions.Where(m => m.Id == material.Id).ExecuteDeleteAsync();
            await db.LabStorageLocations.Where(s => s.Id == storage.Id).ExecuteDeleteAsync();
            await db.LabWorkOrders.Where(w => workIds.Contains(w.Id)).ExecuteUpdateAsync(s => s.SetProperty(w => w.LabServiceWorkflowVersionId, (Guid?)null));
            await db.LabServiceWorkflowStages.Where(s => s.LabServiceWorkflowVersionId == wv.Id).ExecuteDeleteAsync();
            await db.LabServiceWorkflowVersions.Where(w => w.Id == wv.Id).ExecuteDeleteAsync();
            await db.LabServiceWorkflows.Where(w => w.Id == workflow.Id).ExecuteDeleteAsync();
            await db.LabProtocolVersions.Where(p => p.Id == pv.Id).ExecuteDeleteAsync();
            await db.LabProtocols.Where(p => p.Id == protocol.Id).ExecuteDeleteAsync();
        }
        static JsonElement Json(object value) => JsonSerializer.SerializeToElement(value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
    }

    private sealed partial class ShippingTestScope
    {
        public LabOperationsController CreatePreparationController(PSeqOperationsDbContext context, bool customer = false) => new(context,
            new LabOperationsRequestContext(context, new FixedIdentityContext(customer ? customerIdentity : platformIdentity)))
        { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };
    }
}
