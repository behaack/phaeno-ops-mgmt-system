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

    [PostgreSqlReferenceFact]
    public Task PreparationAutomaticallySkipsReviewOnlyWhenNoContinuingTubeMeetsCondition() => VerifyPreparationJourneyAsync(false, true);

    [PostgreSqlReferenceFact]
    public Task PreparationSharedOutputsAreAtomicAndIdempotentWithSeparateLineage() => VerifyPreparationJourneyAsync(false, false, true);

    private async Task VerifyPreparationJourneyAsync(bool skipFinal, bool automaticReview = false, bool bulkOutputs = false)
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext; var lab = scope.CreateLabController(); var now = DateTime.UtcNow;
        var workflow = new LabServiceWorkflow($"prep-{scope.Suffix}", "TEST ONLY preparation", null);
        var protocol = new LabProtocol($"prep-{scope.Suffix}", "TEST ONLY scoped preparation", null);
        var preparationDefinition = LabPreparationBatchTests.Definition();
        if (!automaticReview) preparationDefinition = preparationDefinition with { Steps = preparationDefinition.Steps.Select(s => s.Key == "review"
            ? s with { Captures = [new() { Key = "preparation-record-reference", Label = "Preparation record reference", Type = "text", Required = true, Scope = "shared" }] } : s).ToArray() };
        if (automaticReview) preparationDefinition = preparationDefinition with { Steps = [
            preparationDefinition.Steps[1] with { Key = "identity" }, preparationDefinition.Steps[0],
            preparationDefinition.Steps[1] with { Required = false, RequiredRole = "Supervisor", Condition = LabPreparationConditionalReview.Condition,
                Captures = [new() { Key = "review-rationale", Label = "Review rationale", Type = "text", Required = true, Scope = "shared" }] }] };
        preparationDefinition = preparationDefinition with { Steps = preparationDefinition.Steps.Select(s => s with
        {
            Captures = [.. s.Captures, new() { Key = "specimen-reference", Label = "Specimen reference", Type = "text", Required = true, Scope = "shared" }]
        }).ToArray() };
        if (bulkOutputs) preparationDefinition = preparationDefinition with { Steps = preparationDefinition.Steps.Select(s => s.Key == "review" ? s with { PreparedOutputs = ["TEST ONLY library"] } : s).ToArray() };
        var pv = new LabProtocolVersion(protocol.Id, 1, preparationDefinition.ToJson(), scope.PlatformUser.Id, now);
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
            var declaration = new { specimens = new[] { new { submittedSpecimenId = specimen.SubmittedSpecimenId, submitterSpecimenReference = $"SAMPLE-{i}",
                declaredBiologicalSource = i == 0 ? "Human liver" : "Human kidney",
                declaredSafetyInformation = i == 0 ? "TEST ONLY safety declaration.\nHandle according to recorded instructions." : (string?)null } } };
            var snapshot = skipFinal ? JsonSerializer.Serialize(new { replacementAuthorization = declaration }) : JsonSerializer.Serialize(declaration);
            db.Add(new LabWorkAuthorizationVersion(work.Id, Guid.NewGuid(), Guid.NewGuid(), 1, 1, snapshot, new string('a', 64), now));
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
            batch = Json(await lab.ApplyPreparation(id, new(Guid.NewGuid(), batch.GetProperty("version").GetInt64(), "assign-tray", Barcode: $"TRAY-{scope.Suffix}-1"), default));
            other = Json(await lab.ApplyPreparation(otherId, new(Guid.NewGuid(), other.GetProperty("version").GetInt64(), "assign-tray", Barcode: $"TRAY-{scope.Suffix}-2"), default));
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
            Assert.True(batch.GetProperty("automaticSpecimenReferences").GetBoolean());
            Assert.Equal("SAMPLE-0", batch.GetProperty("members")[0].GetProperty("customerSampleId").GetString());
            Assert.Equal("Human liver", batch.GetProperty("members")[0].GetProperty("biologicalSource").GetString());
            Assert.Equal("TEST ONLY safety declaration.\nHandle according to recorded instructions.", batch.GetProperty("members")[0].GetProperty("safetyInformation").GetString());
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
            var secondDetails = batch.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("id").GetGuid() == second);
            Assert.Equal("SAMPLE-1", secondDetails.GetProperty("customerSampleId").GetString());
            Assert.Equal("Human kidney", secondDetails.GetProperty("biologicalSource").GetString());
            Assert.Equal(JsonValueKind.Null, secondDetails.GetProperty("safetyInformation").ValueKind);
            await using (var deniedDb = scope.CreateAdditionalContext())
            {
                var denied = scope.CreatePreparationController(deniedDb, true);
                var before = Json(await lab.ReadPreparation(id, default)).GetRawText();
                foreach (var action in new[] { "confirm-tray", "reopen-tray", "start", "move", "remove", "cancel", "output", "outputs", "step" })
                {
                    var rejected = await Assert.ThrowsAsync<OrderManagementException>(() => denied.ApplyPreparation(id,
                        new(Guid.NewGuid(), batch.GetProperty("version").GetInt64(), action,
                            MemberId: first, Position: "B1", Confirmed: true, Reason: "TEST ONLY unauthorized Customer"), default));
                    Assert.Equal("lab_capability_required", rejected.ErrorCode);
                    Assert.Equal(StatusCodes.Status403Forbidden, rejected.StatusCode);
                    Assert.Equal(before, Json(await lab.ReadPreparation(id, default)).GetRawText());
                }
            }
            // A job can be held or closed after its tube was added to a draft tray.
            // Reject representative commands before changing the tray or its reserved work.
            foreach (var blockedStatus in new[] { LabWorkOrderStatus.OnHold, LabWorkOrderStatus.Cancelled, LabWorkOrderStatus.ReadyForRelease })
            {
                scope.ClearTrackedState();
                // Arrange each terminal state only on this test's generated job;
                // this is guard coverage, not a real completion/resumption journey.
                await db.LabWorkOrders.Where(w => w.Id == workIds[0])
                    .ExecuteUpdateAsync(s => s.SetProperty(w => w.Status, blockedStatus));
                scope.ClearTrackedState();
                var before = Json(await lab.ReadPreparation(id, default)).GetRawText();
                var workVersion = await db.LabWorkOrders.Where(w => w.Id == workIds[0]).Select(w => w.Version).SingleAsync();
                var attemptVersions = await db.LabSpecimenAttempts.Where(a => workIds.Contains(a.LabWorkOrderId)).OrderBy(a => a.Id).Select(a => a.Version).ToArrayAsync();
                foreach (var action in new[] { "confirm-tray", "reopen-tray", "start", "move", "remove", "cancel", "output", "outputs" })
                {
                    scope.ClearTrackedState();
                    var rejected = await Assert.ThrowsAsync<OrderManagementException>(() => Command(action,
                        v => new(Guid.NewGuid(), v, action, MemberId: first, Position: "B1", Confirmed: true, Reason: "TEST ONLY blocked job command")));
                    Assert.Equal("execution_work_unavailable", rejected.ErrorCode);
                    scope.ClearTrackedState();
                    Assert.Equal(before, Json(await lab.ReadPreparation(id, default)).GetRawText());
                    Assert.Equal(workVersion, await db.LabWorkOrders.Where(w => w.Id == workIds[0]).Select(w => w.Version).SingleAsync());
                    Assert.Equal(attemptVersions, await db.LabSpecimenAttempts.Where(a => workIds.Contains(a.LabWorkOrderId)).OrderBy(a => a.Id).Select(a => a.Version).ToArrayAsync());
                    Assert.False(await db.LabProtocolExecutions.AnyAsync(e => workIds.Contains(e.LabWorkOrderId) && e.StartedAtUtc != null));
                    Assert.False(await db.LabLibraries.AnyAsync(l => workIds.Contains(l.LabWorkOrderId)));
                }
            }
            scope.ClearTrackedState();
            await db.LabWorkOrders.Where(w => w.Id == workIds[0])
                .ExecuteUpdateAsync(s => s.SetProperty(w => w.Status, LabWorkOrderStatus.Received));
            scope.ClearTrackedState();
            batch = Json(await lab.ReadPreparation(id, default));
            var unconfirmed = await Assert.ThrowsAsync<OrderManagementException>(() => Command("start", v => new(Guid.NewGuid(), v, "start", Confirmed: true)));
            Assert.Equal("preparation_tray_confirmation_required", unconfirmed.ErrorCode);
            batch = await Command("confirm-tray", v => new(Guid.NewGuid(), v, "confirm-tray", Confirmed: true));
            Assert.True(batch.GetProperty("trayConfirmed").GetBoolean());
            scope.ClearTrackedState();
            Assert.True(Json(await lab.ReadPreparation(id, default)).GetProperty("trayConfirmed").GetBoolean());
            foreach (var lockedAction in new[] { "assign-tray", "add", "move", "remove" })
            {
                var locked = await Assert.ThrowsAsync<OrderManagementException>(() => Command(lockedAction,
                    v => new(Guid.NewGuid(), v, lockedAction, MemberId: first, Position: "B1", Barcode: $"TEST-PREP-{scope.Suffix}-0-0", Reason: "TEST ONLY locked edit")));
                Assert.Equal("preparation_tray_confirmed", locked.ErrorCode);
            }
            await Assert.ThrowsAsync<OrderManagementException>(() => Command("reopen-tray"));
            batch = await Command("reopen-tray", v => new(Guid.NewGuid(), v, "reopen-tray", Reason: "TEST ONLY review correction"));
            Assert.False(batch.GetProperty("trayConfirmed").GetBoolean());
            await Assert.ThrowsAsync<OrderManagementException>(() => Command("start", v => new(Guid.NewGuid(), v, "start", Confirmed: true)));
            var confirmRequest = new LabPreparationCommand(Guid.NewGuid(), batch.GetProperty("version").GetInt64(), "confirm-tray", Confirmed: true);
            batch = await Command("confirm-tray", _ => confirmRequest);
            scope.ClearTrackedState();
            await lab.ApplyPreparation(id, confirmRequest, default);
            Assert.Equal(1, await db.LabPreparationRecords.CountAsync(r => r.Id == confirmRequest.RequestId));
            var startRequest = new LabPreparationCommand(Guid.NewGuid(), batch.GetProperty("version").GetInt64(), "start", Confirmed: true);
            batch = await Command("start", _ => startRequest);
            await Assert.ThrowsAsync<OrderManagementException>(() => Command("reopen-tray", v => new(Guid.NewGuid(), v, "reopen-tray", Reason: "TEST ONLY started tray")));
            scope.ClearTrackedState(); await lab.ApplyPreparation(id, startRequest, default); // uncertain response retry, no duplicate start
            Assert.Equal(2, await db.LabSpecimenAttempts.CountAsync(a => workIds.Contains(a.LabWorkOrderId)));
            await Assert.ThrowsAsync<OrderManagementException>(() => Command("move", v => new(Guid.NewGuid(), v, "move", MemberId: first, Position: "B1")));
            scope.ClearTrackedState();
            if (bulkOutputs)
            {
                batch = Json(await lab.ReadPreparation(id, default));
                Assert.True(batch.GetProperty("bulkOutputs").GetBoolean());
                var version = batch.GetProperty("version").GetInt64();
                var inputs = new LabPreparationOutputInput[] { new(first, 10, "uL", "TEST-BOX"), new(second, 12, "mL", "TEST-OTHER") };
                var beforeContainers = await db.LabContainers.CountAsync(c => workIds.Contains(c.LabWorkOrderId));
                var invalidRows = new LabPreparationOutputInput[][] { [], [null!], [inputs[0], inputs[0]], [inputs[0], inputs[1] with { MemberId = Guid.NewGuid() }],
                    [inputs[0], inputs[1] with { Quantity = 0 }], [inputs[0], inputs[1] with { Location = " " }], [inputs[0], inputs[1] with { QuantityUnit = " " }] };
                foreach (var invalid in invalidRows)
                {
                    await Assert.ThrowsAsync<OrderManagementException>(() => Command("outputs", v => new(Guid.NewGuid(), v, "outputs", StageId: stage.Id, Outputs: invalid)));
                    scope.ClearTrackedState();
                    Assert.Equal(beforeContainers, await db.LabContainers.CountAsync(c => workIds.Contains(c.LabWorkOrderId)));
                    Assert.All(await db.LabPreparationMembers.Where(m => m.LabPreparationBatchId == id).ToListAsync(), m => Assert.Null(m.OutputContainerId));
                    Assert.Equal(version, (await db.LabPreparationBatches.SingleAsync(b => b.Id == id)).Version);
                }
                var bulkCommand = new LabPreparationCommand(Guid.NewGuid(), version, "outputs", StageId: stage.Id, Outputs: inputs);
                await Assert.ThrowsAsync<OrderManagementException>(() => lab.ApplyPreparation(id, bulkCommand with { Version = version - 1 }, default));
                scope.ClearTrackedState();
                batch = Json(await lab.ApplyPreparation(id, bulkCommand, default));
                scope.ClearTrackedState();
                await lab.ApplyPreparation(id, bulkCommand, default);
                Assert.Equal(beforeContainers + 2, await db.LabContainers.CountAsync(c => workIds.Contains(c.LabWorkOrderId)));
                Assert.Equal(1, await db.LabPreparationRecords.CountAsync(r => r.Id == bulkCommand.RequestId));
                var results = batch.GetProperty("records").EnumerateArray().Single(r => r.GetProperty("id").GetGuid() == bulkCommand.RequestId).GetProperty("details").GetProperty("outputResults");
                Assert.Equal(2, results.GetArrayLength());
                Assert.Equal(2, results.EnumerateArray().Select(r => r.GetProperty("barcode").GetString()).Distinct().Count());
                foreach (var input in inputs)
                {
                    var member = await db.LabPreparationMembers.SingleAsync(m => m.Id == input.MemberId);
                    var output = await db.LabContainers.SingleAsync(c => c.Id == member.OutputContainerId);
                    var attempt = await db.LabSpecimenAttempts.SingleAsync(a => a.Id == member.LabSpecimenAttemptId);
                    Assert.Equal(attempt.Id, output.LabSpecimenAttemptId);
                    Assert.Equal(attempt.SourceContainerId, output.ParentContainerId);
                    Assert.Equal(input.Quantity, output.Quantity);
                    Assert.Equal(input.QuantityUnit, output.QuantityUnit);
                    Assert.Equal(input.Location, output.Location);
                    Assert.False(member.OutputConfirmed);
                }
                await Assert.ThrowsAsync<OrderManagementException>(() => Command("outputs", v => bulkCommand with { RequestId = Guid.NewGuid(), Version = v }));
                scope.ClearTrackedState();
            }
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
            if (automaticReview) await Command("step", v => new(Guid.NewGuid(), v, "step", Step: new(stage.Id, "identity", "record", "recorded", [first, second], new Dictionary<string, JsonElement>(), [], null, null, true, false, false)));
            if (skipFinal) batch = await Command("step", v => new(Guid.NewGuid(), v, "step", Step: step));
            else
            {
                scope.ClearTrackedState();
                batch = Json(await lab.ReadPreparation(id, default));
                var reportCommand = new LabPreparationCommand(Guid.NewGuid(), batch.GetProperty("version").GetInt64(), "step", Step: step);
                var payload = JsonSerializer.Serialize(reportCommand, new JsonSerializerOptions(JsonSerializerDefaults.Web));
                var files = new PreparationReportTestFiles();
                var beforeReport = await db.LabPreparationRecords.CountAsync(r => r.LabPreparationBatchId == id);
                await Assert.ThrowsAsync<OrderManagementException>(() => lab.ApplyPreparationWithQcReport(id, payload, files.Upload("not a PDF"), files, files, default));
                Assert.Equal(0, files.Saves);
                files.Clean = false;
                await Assert.ThrowsAsync<OrderManagementException>(() => lab.ApplyPreparationWithQcReport(id, payload, files.Upload(), files, files, default));
                Assert.Empty(files.Objects);
                scope.ClearTrackedState();
                Assert.Equal(beforeReport, await db.LabPreparationRecords.CountAsync(r => r.LabPreparationBatchId == id));
                files.Clean = true;
                batch = Json(await lab.ApplyPreparationWithQcReport(id, payload, files.Upload(), files, files, default));
                var saved = files.Saves;
                scope.ClearTrackedState();
                await lab.ApplyPreparationWithQcReport(id, payload, files.Upload(), files, files, default);
                Assert.Equal(saved, files.Saves);
                Assert.Single(files.Objects);
                Assert.Equal(beforeReport + 1, await db.LabPreparationRecords.CountAsync(r => r.LabPreparationBatchId == id));
                var details = batch.GetProperty("records").EnumerateArray().Single(r => r.GetProperty("id").GetGuid() == reportCommand.RequestId).GetProperty("details");
                Assert.Equal("qc.pdf", details.GetProperty("qcReport").GetProperty("fileName").GetString());
                Assert.False(details.GetProperty("qcReport").TryGetProperty("storageKey", out _));
                Assert.Equal(2, details.GetProperty("step").GetProperty("coveredMemberIds").GetArrayLength());
                var downloaded = Assert.IsType<FileStreamResult>(await lab.DownloadPreparationQcReport(id, reportCommand.RequestId, files, default));
                using (downloaded.FileStream) Assert.Equal("%PDF-TEST ONLY", await new StreamReader(downloaded.FileStream).ReadToEndAsync());
                await Assert.ThrowsAsync<OrderManagementException>(() => lab.DownloadPreparationQcReport(Guid.NewGuid(), reportCommand.RequestId, files, default));
                await using var deniedDb = scope.CreateAdditionalContext();
                await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreatePreparationController(deniedDb, true).DownloadPreparationQcReport(id, reportCommand.RequestId, files, default));
                await Assert.ThrowsAsync<OrderManagementException>(() => lab.ApplyPreparationWithQcReport(id, payload, files.Upload("%PDF-DIFFERENT"), files, files, default));
                scope.ClearTrackedState();
            }
            Assert.Contains(batch.GetProperty("members").EnumerateArray(), m => m.GetProperty("state").GetString() == "OnHold");
            if (automaticReview) Assert.DoesNotContain(batch.GetProperty("records").EnumerateArray(), r => r.GetProperty("details").TryGetProperty("automatic", out _));
            await Assert.ThrowsAsync<OrderManagementException>(() => Command("advance", v => new(Guid.NewGuid(), v, "advance", StageId: stage.Id)));
            batch = await Command("fail", v => new(Guid.NewGuid(), v, "fail", MemberId: second, ReasonCode: "analysis_failed", Reason: "TEST ONLY unrecoverable failure"));
            await Assert.ThrowsAsync<OrderManagementException>(() => Command("step", v => new(Guid.NewGuid(), v, "step", Step: step with { Action = "repeat", Reason = "Cannot revive failed tube" })));
            if (automaticReview)
            {
                var automatic = Assert.Single(batch.GetProperty("records").EnumerateArray(), r => r.GetProperty("details").TryGetProperty("automatic", out var flag) && flag.GetBoolean());
                Assert.Equal("skipped", automatic.GetProperty("details").GetProperty("step").GetProperty("outcome").GetString());
                Assert.Equal(first, Assert.Single(automatic.GetProperty("details").GetProperty("step").GetProperty("coveredMemberIds").EnumerateArray()).GetGuid());
                Assert.False(batch.GetProperty("automaticSkipAvailable").GetBoolean());
                batch = await Command("evaluate-conditions", v => new(Guid.NewGuid(), v, "evaluate-conditions"));
                Assert.Single(batch.GetProperty("records").EnumerateArray(), r => r.GetProperty("details").TryGetProperty("automatic", out var flag) && flag.GetBoolean());
            }
            else
            {
                var preparationStep = new LabPreparationStepInput(stage.Id, "review", "record", "recorded", [first], new Dictionary<string, JsonElement>(), [], null, null, true, false, bulkOutputs);
                if (skipFinal) await Command("step", v => new(Guid.NewGuid(), v, "step", Step: preparationStep));
                else
                {
                    scope.ClearTrackedState();
                    batch = Json(await lab.ReadPreparation(id, default));
                    Assert.True(batch.GetProperty("optionalPreparationReports").GetBoolean());
                    var preparationCommand = new LabPreparationCommand(Guid.NewGuid(), batch.GetProperty("version").GetInt64(), "step", Step: preparationStep);
                    var payload = JsonSerializer.Serialize(preparationCommand, new JsonSerializerOptions(JsonSerializerDefaults.Web));
                    var files = new PreparationReportTestFiles();
                    batch = Json(await lab.ApplyPreparationWithQcReport(id, payload, files.Upload(), files, files, default));
                    scope.ClearTrackedState();
                    await lab.ApplyPreparationWithQcReport(id, payload, files.Upload(), files, files, default);
                    Assert.Equal(1, files.Saves);
                    var details = batch.GetProperty("records").EnumerateArray().Single(r => r.GetProperty("id").GetGuid() == preparationCommand.RequestId).GetProperty("details");
                    Assert.True(details.TryGetProperty("preparationReport", out var report));
                    Assert.False(details.TryGetProperty("qcReport", out _));
                    Assert.False(report.TryGetProperty("storageKey", out _));
                    Assert.Equal(1, details.GetProperty("step").GetProperty("coveredMemberIds").GetArrayLength());
                    var download = Assert.IsType<FileStreamResult>(await lab.DownloadPreparationQcReport(id, preparationCommand.RequestId, files, default));
                    using (download.FileStream) Assert.Equal("%PDF-TEST ONLY", await new StreamReader(download.FileStream).ReadToEndAsync());
                    await Assert.ThrowsAsync<OrderManagementException>(() => lab.DownloadPreparationQcReport(Guid.NewGuid(), preparationCommand.RequestId, files, default));
                }
            }
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
                batch = bulkOutputs ? Json(await lab.ReadPreparation(id, default)) : await Command("output", v => new(Guid.NewGuid(), v, "output", MemberId: first, Quantity: 10, QuantityUnit: "uL", Location: "TEST-BOX"));
                var outputBarcode = batch.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("id").GetGuid() == first).GetProperty("output").GetProperty("barcode").GetString();
                await Assert.ThrowsAsync<OrderManagementException>(() => Command("advance", v => new(Guid.NewGuid(), v, "advance", StageId: stage.Id)));
                await Command("confirm-output", v => new(Guid.NewGuid(), v, "confirm-output", MemberId: first, Barcode: outputBarcode));
                await Command("advance", v => new(Guid.NewGuid(), v, "advance", StageId: stage.Id));
            }
            batch = await Command("complete", v => new(Guid.NewGuid(), v, "complete", Confirmed: true));
            Assert.Equal("Complete", batch.GetProperty("status").GetString());
            var library = await db.LabLibraries.AsNoTracking().SingleAsync(l => workIds.Contains(l.LabWorkOrderId));
            foreach (var execution in await db.LabProtocolExecutions.AsNoTracking().Where(e => workIds.Contains(e.LabWorkOrderId)).ToListAsync())
            {
                var specimen = await db.LabSpecimens.AsNoTracking().SingleAsync(s => s.Id == execution.LabSpecimenId);
                foreach (var record in LabProtocolEvidence.Read(execution.CapturedResultsJson).Records.Where(r => r.Outcome == "recorded"))
                    Assert.Equal(specimen.AccessionNumber, record.Captures["specimen-reference"].GetString());
            }
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
            await db.LabWorkAuthorizationVersions.Where(a => workIds.Contains(a.LabWorkOrderId)).ExecuteDeleteAsync();
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

    private sealed class PreparationReportTestFiles : IOperationalFileStorage, IOperationalFileScanner
    {
        public bool Clean { get; set; } = true;
        public int Saves { get; private set; }
        public Dictionary<string, byte[]> Objects { get; } = [];
        public IFormFile Upload(string text = "%PDF-TEST ONLY")
        {
            var bytes = System.Text.Encoding.UTF8.GetBytes(text);
            return new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", "qc.pdf");
        }
        public async Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maximumBytes, CancellationToken cancellationToken)
        {
            using var copy = new MemoryStream(); await content.CopyToAsync(copy, cancellationToken);
            var bytes = copy.ToArray(); Assert.True(bytes.Length <= maximumBytes); Assert.Equal(".pdf", extension);
            var key = Guid.NewGuid() + extension; Objects.Add(key, bytes); Saves++;
            return new(key, bytes.Length, Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(bytes)).ToLowerInvariant());
        }
        public Task<Stream> OpenReadAsync(string key, CancellationToken cancellationToken) => Task.FromResult<Stream>(new MemoryStream(Objects[key]));
        public Task DeleteIfExistsAsync(string key, CancellationToken cancellationToken) { Objects.Remove(key); return Task.CompletedTask; }
        public Task<OperationalScanResult> ScanAsync(string key, CancellationToken cancellationToken) => Task.FromResult(new OperationalScanResult(Clean ? PhaenoPortal.App.Features.OrderManagement.Domain.OperationalFileScanStatus.Clean : PhaenoPortal.App.Features.OrderManagement.Domain.OperationalFileScanStatus.Pending, null));
    }

    private sealed partial class ShippingTestScope
    {
        public LabOperationsController CreatePreparationController(PSeqOperationsDbContext context, bool customer = false) => new(context,
            new LabOperationsRequestContext(context, new FixedIdentityContext(customer ? customerIdentity : platformIdentity)))
        { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };
    }
}
