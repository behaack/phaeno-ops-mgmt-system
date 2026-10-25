namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ReagentRunsDeductEachUseAndRetainItAfterAbandonment()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var db = scope.DbContext;
            var controller = scope.CreateLabController();
            var sourceDefinition = new LabMaterialDefinition($"source-{scope.Suffix}",
                "TEST source buffer", LabMaterialLotKind.SupplierLot);
            var supplier = new LabSupplier($"TEST source supplier {scope.Suffix}");
            var location = new LabStorageLocation($"TEST reagent shelf {scope.Suffix}");
            var source = new LabMaterialLot(LabMaterialLotKind.SupplierLot,
                sourceDefinition.Id, $"SOURCE-{scope.Suffix}", supplier.Id,
                DateOnly.FromDateTime(DateTime.UtcNow).AddDays(60), location.Id, 10, "mL");
            source.RecordQc(LabQcDisposition.Passed, DateOnly.FromDateTime(DateTime.UtcNow),
                null, "{}", scope.PlatformUser.Id, DateTime.UtcNow);
            db.AddRange(sourceDefinition, supplier, location, source);
            await db.SaveChangesAsync();

            var producerId = await db.LabSuppliers.Where(item => item.IsInternalProducer)
                .Select(item => item.Id).SingleAsync();
            var product = await scope.SupplierCatalog().CreateProduct(producerId,
                new($"TEST prepared buffer {scope.Suffix}", "TEST prepared buffer",
                    LabProductType.ReagentId, CanExpire: true, DefaultQuantityUnit: "mL"), default);
            var outputDefinitionId = product.MaterialDefinitionId!.Value;

            var workflow = await controller.CreateReagentWorkflow(new(
                $"TEST reagent production {scope.Suffix}", outputDefinitionId, null,
                [new LabReagentStep("mix", "Mix", "Combine source lots")],
                OutputUnit: "mL"), default);
            var duplicate = await Assert.ThrowsAsync<OrderManagementException>(() =>
                controller.CreateReagentWorkflow(new(
                    $"TEST duplicate workflow {scope.Suffix}", outputDefinitionId, null,
                    [new LabReagentStep("mix", "Mix", "Combine source lots")],
                    OutputUnit: "mL"), default));
            Assert.Equal("reagent_already_has_workflow", duplicate.ErrorCode);
            workflow = await controller.ApproveReagentWorkflow(workflow.Id,
                new(workflow.Version, "Reference test uses one platform administrator"), default);
            Assert.Equal("Approved", workflow.Status);
            var inactiveProduct = await scope.SupplierCatalog().UpdateProduct(producerId, product.Id,
                new(product.ProductNumber, product.Description, LabProductType.ReagentId,
                    IsActive: false, Version: product.Version), default);
            var blockedRun = await Assert.ThrowsAsync<OrderManagementException>(() =>
                controller.StartReagentRun(new(outputDefinitionId, location.Id), default));
            Assert.Equal("reagent_material_unavailable", blockedRun.ErrorCode);
            await scope.SupplierCatalog().UpdateProduct(producerId, product.Id,
                new(inactiveProduct.ProductNumber, inactiveProduct.Description, LabProductType.ReagentId,
                    IsActive: true, Version: inactiveProduct.Version), default);
            var run = await controller.StartReagentRun(new(outputDefinitionId, location.Id), default);
            Assert.StartsWith("PH-REAG-", run.LotNumber);
            Assert.Equal("Pending", run.QcDisposition);
            Assert.Equal(0, run.AvailableQuantity);
            var outputLot = await db.LabMaterialLots.SingleAsync(item => item.Id == run.MaterialLotId);
            Assert.Equal(producerId, outputLot.SupplierId);
            Assert.Equal(product.Id, outputLot.SupplierProductId);

            var beforeUseVersion = run.Version;
            run = await controller.RecordReagentMaterialUse(run.Id,
                new(source.Id, 3, "mL", false, run.Version), default);
            Assert.Single(run.MaterialUses);
            var frozenWithdrawal = run.MaterialUses[0].ResourceSnapshotJson;
            using (var snapshot = JsonDocument.Parse(frozenWithdrawal!)) {
                Assert.Equal("Passed", snapshot.RootElement.GetProperty("qcDisposition").GetString());
                Assert.Equal(supplier.Name, snapshot.RootElement.GetProperty("supplier").GetProperty("name").GetString());
            }
            Assert.Equal(7, (await db.LabMaterialLots.AsNoTracking()
                .SingleAsync(item => item.Id == source.Id)).AvailableQuantity);
            var stale = await Assert.ThrowsAsync<OrderManagementException>(() =>
                controller.RecordReagentMaterialUse(run.Id,
                    new(source.Id, 3, "mL", false, beforeUseVersion), default));
            Assert.Equal("concurrency_conflict", stale.ErrorCode);

            run = await controller.AbandonReagentRun(run.Id,
                new("Spill during mixing", run.Version), default);
            Assert.Equal("Abandoned", run.Status);
            Assert.Equal(7, (await db.LabMaterialLots.AsNoTracking()
                .SingleAsync(item => item.Id == source.Id)).AvailableQuantity);
            Assert.Equal(0, run.AvailableQuantity);
            source.RecordQc(LabQcDisposition.Failed, DateOnly.FromDateTime(DateTime.UtcNow), "TEST ONLY later QC", "{}", scope.PlatformUser.Id, DateTime.UtcNow);
            await db.SaveChangesAsync();
            Assert.Equal(frozenWithdrawal, (await controller.ReadReagentRun(run.Id, default)).MaterialUses[0].ResourceSnapshotJson);
            source.RecordQc(LabQcDisposition.Passed, DateOnly.FromDateTime(DateTime.UtcNow), null, "{}", scope.PlatformUser.Id, DateTime.UtcNow);
            await db.SaveChangesAsync();
            var abandonedLotVersion = (await db.LabMaterialLots.AsNoTracking()
                .SingleAsync(item => item.Id == run.MaterialLotId)).Version;
            var blockedQc = await Assert.ThrowsAsync<OrderManagementException>(() =>
                controller.RecordMaterialQc(run.MaterialLotId,
                    new MaterialQcRequest("Passed", DateOnly.FromDateTime(DateTime.UtcNow),
                        null, "{}", abandonedLotVersion), default));
            Assert.Equal("reagent_run_not_complete", blockedQc.ErrorCode);

            var completed = await controller.StartReagentRun(new(outputDefinitionId, location.Id), default);
            completed = await controller.RecordReagentMaterialUse(completed.Id,
                new(source.Id, 1, "mL", false, completed.Version), default);
            var firstCompletedWithdrawal = completed.MaterialUses[0].ResourceSnapshotJson;
            var trackedWithdrawal = await db.LabReagentMaterialUses.SingleAsync(u => u.RunId == completed.Id);
            db.Entry(trackedWithdrawal).Property(u => u.ResourceSnapshotJson).CurrentValue = "{}";
            await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
            db.Entry(trackedWithdrawal).Property(u => u.ResourceSnapshotJson).CurrentValue = firstCompletedWithdrawal;
            db.Entry(trackedWithdrawal).State = EntityState.Unchanged;
            supplier.Rename(supplier.Name + " updated");
            source.RecordQc(LabQcDisposition.Passed, DateOnly.FromDateTime(DateTime.UtcNow), null, "{\"capture\":2}", scope.PlatformUser.Id, DateTime.UtcNow);
            await db.SaveChangesAsync();
            completed = await controller.RecordReagentMaterialUse(completed.Id,
                new(source.Id, 1, "mL", false, completed.Version), default);
            completed = await controller.RecordReagentStep(completed.Id,
                new(0, "Mixed according to the procedure", completed.Version), default);
            var missingExpiry = await Assert.ThrowsAsync<OrderManagementException>(() =>
                controller.CompleteReagentRun(completed.Id,
                    new(5, null, completed.Version), default));
            Assert.Equal("reagent_expiration_required", missingExpiry.ErrorCode);
            completed = await controller.CompleteReagentRun(completed.Id,
                new(5, DateOnly.FromDateTime(DateTime.UtcNow).AddDays(30), completed.Version), default);
            Assert.Equal("Completed", completed.Status);
            Assert.Equal(5, completed.AvailableQuantity);
            Assert.Equal("Pending", completed.QcDisposition);
            var workflowRecord = await db.LabReagentWorkflows.SingleAsync(item => item.Id == workflow.Id);
            for (var index = 0; index < 260; index++)
            {
                var syntheticLot = new LabMaterialLot(LabMaterialLotKind.PreparedReagent, outputDefinitionId,
                    $"TEST-PAGE-{scope.Suffix}-{index}", null, null, location.Id, 0, "mL");
                syntheticLot.AssignInternalProduct(producerId, product.Id);
                db.AddRange(syntheticLot, new LabReagentManufacturingRun(workflowRecord, syntheticLot.Id, scope.PlatformUser.Id, DateTime.UtcNow.AddMinutes(-index)));
            }
            await db.SaveChangesAsync();
            var older = await controller.ReagentRunsPage(default, workflow.Name, page: 11);
            Assert.Equal(262, older.TotalCount);
            Assert.Equal(12, older.Items.Count);
            var activeRuns = await controller.ReagentRunsPage(default, workflow.Name, "InProgress");
            Assert.Equal(260, activeRuns.TotalCount);
            Assert.Equal(1, (await controller.ReagentRunsPage(default, $"TEST-PAGE-{scope.Suffix}-259")).TotalCount);
            Assert.Equal(5, (await db.LabMaterialLots.AsNoTracking()
                .SingleAsync(item => item.Id == source.Id)).AvailableQuantity);
            var component = await db.LabPreparedReagentComponents.AsNoTracking()
                .SingleAsync(item => item.PreparedMaterialLotId == completed.MaterialLotId);
            Assert.Equal(source.Id, component.ComponentMaterialLotId);
            Assert.Equal(2, component.Quantity);
            var prepared = await db.LabMaterialLots.SingleAsync(l => l.Id == completed.MaterialLotId);
            var preparationSnapshot = await LabResourceSnapshot.MaterialAsync(db, prepared, default);
            using (var snapshot = JsonDocument.Parse(preparationSnapshot))
                Assert.Equal(2, snapshot.RootElement.GetProperty("components")[0].GetProperty("withdrawalIds").GetArrayLength());
            source.RecordQc(LabQcDisposition.Failed, DateOnly.FromDateTime(DateTime.UtcNow), "TEST ONLY later condition", "{}", scope.PlatformUser.Id, DateTime.UtcNow);
            var fixture = await SeedRestoreEvidence(scope, new PreparationReportTestFiles(), includeResult: false);
            var execution = await db.LabProtocolExecutions.AsNoTracking().SingleAsync(e => e.LabWorkOrderId == fixture.WorkId);
            db.LabMaterialConsumptions.Add(new(execution.Id, prepared.Id, null, 1, "mL", scope.PlatformUser.Id, LabEvidenceTime.UtcNow, resourceSnapshotJson: preparationSnapshot));
            await db.SaveChangesAsync();
            var investigation = await controller.Investigation(fixture.WorkId, fixture.SpecimenId, default);
            var projected = JsonSerializer.SerializeToElement(investigation.Evidence["reagentComponents"], JsonSerializerOptions.Web);
            var withdrawals = Assert.Single(projected.EnumerateArray()).GetProperty("withdrawals");
            Assert.Equal(2, withdrawals.GetArrayLength());
            Assert.All(withdrawals.EnumerateArray(), use => Assert.Equal("Passed", JsonDocument.Parse(use.GetProperty("resourceSnapshotJson").GetString()!).RootElement.GetProperty("qcDisposition").GetString()));
            Assert.Equal(2, withdrawals.EnumerateArray().Select(use => JsonDocument.Parse(use.GetProperty("resourceSnapshotJson").GetString()!).RootElement.GetProperty("supplier").GetProperty("name").GetString()).Distinct().Count());
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }
}
