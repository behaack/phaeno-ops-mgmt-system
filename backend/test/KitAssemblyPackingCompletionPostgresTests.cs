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
        Assert.Equal(run.Steps[0].StepKey, step.StepKey);
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
    public async Task KitProcedureOwnsMultipleInstructionsAndRejectsDuplicateOccurrences()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var controller = scope.CreateLabController();
            var first = new LabKitAssemblyStep(Guid.NewGuid(), "Pack", "Pack the specified contents.");
            var second = new LabKitAssemblyStep(Guid.NewGuid(), "Seal", "Inspect and seal the kit.");
            var invalid = await Assert.ThrowsAsync<OrderManagementException>(() => controller.SaveKitAssemblyWorkflow(new("TEST procedure", [first, first]), default));
            Assert.Equal("kit_steps_invalid", invalid.ErrorCode);
            var saved = await controller.SaveKitAssemblyWorkflow(new($"TEST complete procedure {scope.Suffix}", [first, second]), default);
            var draft = Assert.Single(saved.Revisions);
            Assert.Equal(new[] { first.StepKey, second.StepKey }, draft.Steps.Select(s => s.StepKey));
            var approved = await controller.ApproveKitAssemblyWorkflow(saved.Id, draft.Id, new(saved.Version, "TEST ONLY explicit whole-procedure override"), default);
            Assert.Equal("Approved", Assert.Single(approved.Revisions).Status);
            var replacement = first with { Instructions = "Revised draft instruction." };
            var revised = await controller.SaveKitAssemblyWorkflow(new(saved.Name, [replacement, second], approved.Version, saved.Id), default);
            Assert.Equal(first.Instructions, revised.Revisions.Single(v => v.Status == "Approved").Steps[0].Instructions);
            Assert.Equal(replacement.Instructions, revised.Revisions.Single(v => v.Status == "Draft").Steps[0].Instructions);
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }
}
