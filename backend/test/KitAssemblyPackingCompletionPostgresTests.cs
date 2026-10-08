namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task KitPackingOptionalNotesAreAtomicAndMissingStepCanBeRecordedWithoutMoreConsumption()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var definition = await scope.CreateContainerAsync(await scope.CreateShipmentAsync(20), 20);
        var stock = scope.StockController();
        var created = await stock.Create(await scope.CatalogKitRequestAsync(definition.Id), default);
        var kit = Assert.IsType<StockKitDto>(Assert.IsType<CreatedResult>(created.Result).Value);
        scope.ClearTrackedState();
        var lab = scope.CreateLabController();
        var run = await lab.ReadKitAssemblyRun(kit.Id, default);
        var codes = Enumerable.Range(1, 20).Select(index => $"NOTES-{scope.Suffix}-{index:00}").ToArray();
        var request = new KitPackedContentsRequest(run.Version, kit.Version, codes,
            run.Components.Select(item => new KitAssemblyComponentUseRequest(item.SupplierProductId, item.Quantity)).ToArray());
        foreach (var notes in new string?[] { new('x', 4001) })
        {
            var error = await Assert.ThrowsAsync<OrderManagementException>(() => lab.RecordKitPackedContents(kit.Id, request with { AssemblyNotes = notes }, default));
            Assert.StartsWith("kit_assembly_notes_", error.ErrorCode);
            scope.ClearTrackedState();
            var unchanged = await lab.ReadKitAssemblyRun(kit.Id, default);
            Assert.Equal(run.Version, unchanged.Version);
            Assert.Empty(unchanged.Uses);
            Assert.Empty(unchanged.StepRecords);
            Assert.Empty((await stock.Read(kit.Id, default)).Tubes);
        }
        var saved = await lab.RecordKitPackedContents(kit.Id, request with { AssemblyNotes = "Packed and sealed according to instructions." }, default);
        Assert.Equal(2, saved.Uses.Count);
        var step = Assert.Single(saved.StepRecords);
        Assert.Equal(run.Steps[0].LabStepVersionId, step.LabStepVersionId);
        Assert.Equal(scope.PlatformUser.Id, step.PerformedByUserId);
        Assert.Equal("Packed and sealed according to instructions.", step.Notes);
        scope.ClearTrackedState();
        var stale = await Assert.ThrowsAsync<OrderManagementException>(() => lab.RecordKitPackedContents(kit.Id, request with { AssemblyNotes = step.Notes }, default));
        Assert.Equal(409, stale.StatusCode);
        scope.ClearTrackedState();
        Assert.Single((await lab.ReadKitAssemblyRun(kit.Id, default)).StepRecords);

        // Exercise the valid state where component use exists but step evidence is absent.
        var secondCreated = await stock.Create(await scope.CatalogKitRequestAsync(definition.Id), default);
        var secondKit = Assert.IsType<StockKitDto>(Assert.IsType<CreatedResult>(secondCreated.Result).Value);
        scope.ClearTrackedState();
        var secondRun = await lab.ReadKitAssemblyRun(secondKit.Id, default);
        secondKit = await stock.Register(secondKit.Id, new(codes.Select(code => code + "-SECOND").ToArray(), secondKit.Version), default);
        scope.DbContext.LabKitAssemblyUses.AddRange(secondRun.Components.Select(item => new LabKitAssemblyUse(secondRun.Id,
            item.SupplierProductId, null, item.Quantity, "each", scope.PlatformUser.Id, DateTime.UtcNow)));
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        var notesOnly = await lab.RecordKitPackedContents(secondKit.Id,
            new(secondRun.Version, secondKit.Version, [], []), default);
        Assert.Equal(2, notesOnly.Uses.Count);
        Assert.Empty(Assert.Single(notesOnly.StepRecords).Notes);
        Assert.Equal(20, (await stock.Read(secondKit.Id, default)).Tubes.Count);
    }

    [PostgreSqlReferenceFact]
    public async Task TransportationKitWorkflowSaveAndApprovalRequireExactlyOneStep()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var definition = await scope.CreateContainerAsync(await scope.CreateShipmentAsync(20), 20);
        var lab = scope.CreateLabController();
        var source = (await lab.ReadKitAssemblyWorkflows(default)).Single(item => item.Id == definition.AssemblyWorkflowId);
        var step = Assert.Single(source.Revisions[0].Steps);
        var name = $"TEST single-step workflow {scope.Suffix}";
        foreach (var ids in new Guid[][] { [], [step.LabStepVersionId, Guid.NewGuid()] })
        {
            var error = await Assert.ThrowsAsync<OrderManagementException>(() => lab.SaveKitAssemblyWorkflow(new(name, ids), default));
            Assert.Equal("kit_steps_invalid", error.ErrorCode);
            scope.ClearTrackedState();
        }
        var saved = await lab.SaveKitAssemblyWorkflow(new(name, [step.LabStepVersionId]), default);
        try
        {
            Assert.Single(saved.Revisions[0].Steps);
            var error = await Assert.ThrowsAsync<OrderManagementException>(() => lab.SaveKitAssemblyWorkflow(new(name,
                [step.LabStepVersionId, Guid.NewGuid()], saved.Version, saved.Id), default));
            Assert.Equal("kit_steps_invalid", error.ErrorCode);
            scope.ClearTrackedState();
            var draft = await scope.DbContext.LabKitAssemblyWorkflowRevisions.SingleAsync(item => item.WorkflowId == saved.Id);
            draft.UpdateDraft([step, new(Guid.NewGuid(), "Second step", "Instructions.")], scope.PlatformUser.Id, DateTime.UtcNow);
            await scope.DbContext.SaveChangesAsync();
            scope.ClearTrackedState();
            var invalidApproval = await Assert.ThrowsAsync<OrderManagementException>(() => lab.ApproveKitAssemblyWorkflow(saved.Id,
                draft.Id, new(saved.Version, "TEST approval override"), default));
            Assert.Equal("kit_steps_invalid", invalidApproval.ErrorCode);
        }
        finally
        {
            scope.ClearTrackedState();
            await scope.DbContext.LabKitAssemblyWorkflowRevisions.Where(item => item.WorkflowId == saved.Id).ExecuteDeleteAsync();
            await scope.DbContext.LabKitAssemblyWorkflows.Where(item => item.Id == saved.Id).ExecuteDeleteAsync();
        }
    }
}
