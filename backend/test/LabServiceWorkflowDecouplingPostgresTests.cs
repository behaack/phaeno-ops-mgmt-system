namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task PreparationSelectsWorkflowByServiceAndPreservesAttemptVersions()
    {
        static JsonElement Json(object value) => JsonSerializer.SerializeToElement(value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext;
        await using var transaction = await db.Database.BeginTransactionAsync();
        var lab = scope.CreateLabController();
        var now = DateTime.UtcNow;
        var workflow = new LabServiceWorkflow("decouple-" + scope.Suffix, "TEST ONLY service workflow", null);
        workflow.RecordVersion(2);
        var protocol = new LabProtocol("decouple-" + scope.Suffix, "TEST ONLY preparation", null);
        protocol.RecordVersion(1);
        var protocolVersion = new LabProtocolVersion(protocol.Id, 1, LabPreparationBatchTests.Definition().ToJson(), scope.PlatformUser.Id, now);
        protocolVersion.Approve(scope.CustomerUser.Id, now);
        var oldVersion = new LabServiceWorkflowVersion(workflow.Id, 1, scope.PlatformUser.Id, now);
        oldVersion.Approve(scope.CustomerUser.Id, now);
        oldVersion.PromoteToProduction(scope.PlatformUser.Id, now);
        var newVersion = new LabServiceWorkflowVersion(workflow.Id, 2, scope.PlatformUser.Id, now);
        newVersion.Approve(scope.CustomerUser.Id, now);
        var oldStage = new LabServiceWorkflowStage(oldVersion.Id, 1, "Original procedure", protocolVersion.Id, LabServiceWorkflowStageRequirement.Required, null, null);
        var newStage = new LabServiceWorkflowStage(newVersion.Id, 1, "Revised procedure", protocolVersion.Id, LabServiceWorkflowStageRequirement.Required, null, null);
        var format = new LabTrayFormat(new("TEST ONLY decoupled tray", 2, 3, "grid", []));
        db.AddRange(workflow, protocol, protocolVersion, oldVersion, newVersion, oldStage, newStage, format);
        (Guid Work, Guid Specimen, string Barcode) AddJob(string service, string suffix, bool accepted = true)
        {
            var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, Guid.NewGuid(), scope.CustomerOrganization.Id,
                service, 1, "test", "TEST ONLY " + suffix, oldVersion.Id);
            work.SetTubeUsePolicy(LabTubeUsePolicy.RunOneWithFailureFallback, 1);
            work.RecordMilestone(LabWorkOrderStatus.Received);
            var specimen = new LabSpecimen(work.Id, Guid.NewGuid());
            specimen.RecordReceipt(now, "TEST ONLY", "TEST-BOX");
            specimen.AssignAccession("TEST-DECOUPLE-" + scope.Suffix + suffix);
            work.Specimens.Add(specimen);
            var tube = new LabContainer(work.Id, specimen.Id, null, LabContainerKind.SubmittedSpecimen,
                "DECOUPLE-" + scope.Suffix + suffix, "TEST ONLY", "TEST-BOX-" + suffix, 20, "uL", null);
            if (accepted) tube.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, scope.PlatformUser.Id, now);
            specimen.RefreshIntakeFromTubes([tube], now);
            db.AddRange(work, tube);
            return (work.Id, specimen.Id, tube.Barcode);
        }
        var compatible = AddJob(workflow.ServiceKey, "compatible");
        var otherService = AddJob("another-service-" + scope.Suffix, "other");
        var undecided = AddJob(workflow.ServiceKey, "undecided", false);
        var standalone = AddJob(workflow.ServiceKey, "standalone");
        await db.SaveChangesAsync(); scope.ClearTrackedState();
        // A historical commercial job pin alone is no longer a retirement dependency.
        var impact = await lab.ProtocolRetirementImpact(protocol.Id, default);
        Assert.DoesNotContain(impact.QueuedWork, w => w.Id == compatible.Work);
        var batch = Json(await lab.CreatePreparation(new(Guid.NewGuid(), null, format.Id, newVersion.Id), default));
        var batchId = batch.GetProperty("id").GetGuid();
        batch = Json(await lab.ApplyPreparation(batchId, new(Guid.NewGuid(), batch.GetProperty("version").GetInt64(), "assign-tray", Barcode: "TRAY-" + scope.Suffix), default));
        var candidates = Json(await lab.FindPreparationTubes(batchId, scope.Suffix, default));
        Assert.Contains(candidates.EnumerateArray(), t => t.GetProperty("barcode").GetString() == compatible.Barcode);
        Assert.DoesNotContain(candidates.EnumerateArray(), t => t.GetProperty("barcode").GetString() == otherService.Barcode || t.GetProperty("barcode").GetString() == undecided.Barcode);
        var boxCandidates = Json(await lab.FindPreparationTubes(batchId, scope.Suffix, default, "  BOX-compatible  "));
        Assert.Equal(compatible.Barcode, Assert.Single(boxCandidates.EnumerateArray()).GetProperty("barcode").GetString());
        Assert.Empty(Json(await lab.FindPreparationTubes(batchId, standalone.Barcode, default, "BOX-compatible")).EnumerateArray());
        Assert.Empty(Json(await lab.FindPreparationTubes(batchId, scope.Suffix, default, "BOX-undecided")).EnumerateArray());
        Assert.Equal(candidates.GetArrayLength(), Json(await lab.FindPreparationTubes(batchId, scope.Suffix, default, "  ")).GetArrayLength());
        var firstPage = Json(await lab.FindPreparationTubes(batchId, scope.Suffix, default, page: 1, pageSize: 1));
        var secondPage = Json(await lab.FindPreparationTubes(batchId, scope.Suffix, default, page: 2, pageSize: 1));
        Assert.Equal(2, firstPage.GetProperty("totalCount").GetInt32());
        Assert.Equal(2, firstPage.GetProperty("totalPages").GetInt32());
        Assert.NotEqual(Assert.Single(firstPage.GetProperty("items").EnumerateArray()).GetProperty("id").GetGuid(),
            Assert.Single(secondPage.GetProperty("items").EnumerateArray()).GetProperty("id").GetGuid());
        var filteredPage = Json(await lab.FindPreparationTubes(batchId, scope.Suffix, default, "BOX-compatible", page: 99, pageSize: 10));
        Assert.Equal(1, filteredPage.GetProperty("page").GetInt32());
        Assert.Equal(1, filteredPage.GetProperty("totalCount").GetInt32());
        Assert.Equal(compatible.Barcode, Assert.Single(filteredPage.GetProperty("items").EnumerateArray()).GetProperty("barcode").GetString());
        async Task<JsonElement> Add(string barcode)
        {
            scope.ClearTrackedState();
            var version = await db.LabPreparationBatches.Where(b => b.Id == batchId).Select(b => b.Version).SingleAsync();
            return Json(await lab.ApplyPreparation(batchId, new(Guid.NewGuid(), version, "add", Position: "A1", Barcode: barcode), default));
        }
        var wrongService = await Assert.ThrowsAsync<OrderManagementException>(() => Add(otherService.Barcode));
        Assert.Equal("execution_service_mismatch", wrongService.ErrorCode);
        batch = await Add(compatible.Barcode);
        scope.ClearTrackedState();
        var attempt = await db.LabSpecimenAttempts.AsNoTracking().SingleAsync(a => a.LabWorkOrderId == compatible.Work);
        Assert.Equal(newVersion.Id, attempt.LabServiceWorkflowVersionId);
        Assert.Equal(oldVersion.Id, await db.LabWorkOrders.Where(w => w.Id == compatible.Work).Select(w => w.LabServiceWorkflowVersionId).SingleAsync());
        Assert.Equal(newStage.Id, await db.LabProtocolExecutions.Where(e => e.LabSpecimenAttemptId == attempt.Id).Select(e => e.LabServiceWorkflowStageId).SingleAsync());
        var workspace = await lab.ReadAttempts(compatible.Work, default);
        Assert.Equal(2, Assert.Single(Assert.Single(workspace.Specimens).Attempts).WorkflowVersion);
        Assert.Contains(workspace.Stages, s => s.Id == newStage.Id && s.WorkflowVersionId == newVersion.Id);
        impact = await lab.ProtocolRetirementImpact(protocol.Id, default);
        Assert.Contains(impact.QueuedWork, w => w.Id == compatible.Work);
        var oldBatch = Json(await lab.CreatePreparation(new(Guid.NewGuid(), null, format.Id, oldVersion.Id), default));
        var oldBatchId = oldBatch.GetProperty("id").GetGuid();
        Assert.DoesNotContain(Json(await lab.FindPreparationTubes(oldBatchId, scope.Suffix, default)).EnumerateArray(), t => t.GetProperty("barcode").GetString() == compatible.Barcode);
        var trayConflict = await Assert.ThrowsAsync<OrderManagementException>(() => lab.ApplyPreparation(oldBatchId,
            new(Guid.NewGuid(), oldBatch.GetProperty("version").GetInt64(), "assign-tray", Barcode: "TRAY-" + scope.Suffix), default));
        Assert.Equal("preparation_tray_in_use", trayConflict.ErrorCode);
        // A standalone selection resolves Production when selected, not when the order was placed.
        scope.ClearTrackedState();
        var savedOld = await db.LabServiceWorkflowVersions.SingleAsync(v => v.Id == oldVersion.Id);
        var savedNew = await db.LabServiceWorkflowVersions.SingleAsync(v => v.Id == newVersion.Id);
        savedOld.Retire(); savedNew.PromoteToProduction(scope.PlatformUser.Id, now);
        await db.SaveChangesAsync(); scope.ClearTrackedState();
        var tubeId = await db.LabContainers.Where(t => t.Barcode == standalone.Barcode).Select(t => t.Id).SingleAsync();
        var jobVersion = await db.LabWorkOrders.Where(w => w.Id == standalone.Work).Select(w => w.Version).SingleAsync();
        await lab.ApplyAttemptCommand(standalone.Work, new(Guid.NewGuid(), jobVersion, "select", SpecimenId: standalone.Specimen, SourceContainerId: tubeId, Barcode: standalone.Barcode), default);
        Assert.Equal(newVersion.Id, await db.LabSpecimenAttempts.Where(a => a.LabWorkOrderId == standalone.Work).Select(a => a.LabServiceWorkflowVersionId).SingleAsync());
        scope.ClearTrackedState();
        var versionToStart = await db.LabPreparationBatches.Where(b => b.Id == batchId).Select(b => b.Version).SingleAsync();
        await lab.ApplyPreparation(batchId, new(Guid.NewGuid(), versionToStart, "confirm-tray", Confirmed: true), default);
        scope.ClearTrackedState();
        versionToStart = await db.LabPreparationBatches.Where(b => b.Id == batchId).Select(b => b.Version).SingleAsync();
        await lab.ApplyPreparation(batchId, new(Guid.NewGuid(), versionToStart, "start", Confirmed: true), default);
        scope.ClearTrackedState();
        Assert.Equal(newVersion.Id, await db.LabSpecimenAttempts.Where(a => a.Id == attempt.Id).Select(a => a.LabServiceWorkflowVersionId).SingleAsync());
        impact = await lab.ProtocolRetirementImpact(protocol.Id, default);
        Assert.Contains(impact.ActiveWork, w => w.Id == compatible.Work);
        await transaction.RollbackAsync(); scope.ClearTrackedState();
    }
}
