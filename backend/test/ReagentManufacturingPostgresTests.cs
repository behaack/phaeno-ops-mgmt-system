namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.LabOperations.DTOs;
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
            var outputDefinition = new LabMaterialDefinition($"output-{scope.Suffix}",
                "TEST prepared buffer", LabMaterialLotKind.PreparedReagent);
            var supplier = new LabSupplier($"TEST source supplier {scope.Suffix}");
            var location = new LabStorageLocation($"TEST reagent shelf {scope.Suffix}");
            var source = new LabMaterialLot(LabMaterialLotKind.SupplierLot,
                sourceDefinition.Id, $"SOURCE-{scope.Suffix}", supplier.Id,
                DateOnly.FromDateTime(DateTime.UtcNow).AddDays(60), location.Id, 10, "mL");
            source.RecordQc(LabQcDisposition.Passed, DateOnly.FromDateTime(DateTime.UtcNow),
                null, "{}", scope.PlatformUser.Id, DateTime.UtcNow);
            db.AddRange(sourceDefinition, outputDefinition, supplier, location, source);
            await db.SaveChangesAsync();

            var workflow = await controller.CreateReagentWorkflow(new(
                $"TEST reagent production {scope.Suffix}", outputDefinition.Id, null,
                [new LabReagentStep("mix", "Mix", "Combine source lots")],
                OutputUnit: "mL"), default);
            var duplicate = await Assert.ThrowsAsync<OrderManagementException>(() =>
                controller.CreateReagentWorkflow(new(
                    $"TEST duplicate workflow {scope.Suffix}", outputDefinition.Id, null,
                    [new LabReagentStep("mix", "Mix", "Combine source lots")],
                    OutputUnit: "mL"), default));
            Assert.Equal("reagent_already_has_workflow", duplicate.ErrorCode);
            workflow = await controller.ApproveReagentWorkflow(workflow.Id,
                new(workflow.Version, "Reference test uses one platform administrator"), default);
            Assert.Equal("Approved", workflow.Status);
            var run = await controller.StartReagentRun(new(outputDefinition.Id, location.Id), default);
            Assert.StartsWith("PH-REAG-", run.LotNumber);
            Assert.Equal("Pending", run.QcDisposition);
            Assert.Equal(0, run.AvailableQuantity);
            Assert.Equal(await db.LabSuppliers.Where(item => item.IsInternalProducer)
                .Select(item => item.Id).SingleAsync(),
                (await db.LabMaterialLots.SingleAsync(item => item.Id == run.MaterialLotId)).SupplierId);

            var beforeUseVersion = run.Version;
            run = await controller.RecordReagentMaterialUse(run.Id,
                new(source.Id, 3, "mL", false, run.Version), default);
            Assert.Single(run.MaterialUses);
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
            var abandonedLotVersion = (await db.LabMaterialLots.AsNoTracking()
                .SingleAsync(item => item.Id == run.MaterialLotId)).Version;
            var blockedQc = await Assert.ThrowsAsync<OrderManagementException>(() =>
                controller.RecordMaterialQc(run.MaterialLotId,
                    new MaterialQcRequest("Passed", DateOnly.FromDateTime(DateTime.UtcNow),
                        null, "{}", abandonedLotVersion), default));
            Assert.Equal("reagent_run_not_complete", blockedQc.ErrorCode);

            var completed = await controller.StartReagentRun(new(outputDefinition.Id, location.Id), default);
            completed = await controller.RecordReagentMaterialUse(completed.Id,
                new(source.Id, 2, "mL", false, completed.Version), default);
            completed = await controller.RecordReagentStep(completed.Id,
                new(0, "Mixed according to the procedure", completed.Version), default);
            completed = await controller.CompleteReagentRun(completed.Id,
                new(5, DateOnly.FromDateTime(DateTime.UtcNow).AddDays(30), completed.Version), default);
            Assert.Equal("Completed", completed.Status);
            Assert.Equal(5, completed.AvailableQuantity);
            Assert.Equal("Pending", completed.QcDisposition);
            Assert.Equal(5, (await db.LabMaterialLots.AsNoTracking()
                .SingleAsync(item => item.Id == source.Id)).AvailableQuantity);
            var component = await db.LabPreparedReagentComponents.AsNoTracking()
                .SingleAsync(item => item.PreparedMaterialLotId == completed.MaterialLotId);
            Assert.Equal(source.Id, component.ComponentMaterialLotId);
            Assert.Equal(2, component.Quantity);
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }
}
