namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class KitBundlePostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task PartnerSavesAndReplaysLotBeforeAssemblyWithoutFilesOrUseDate()
    {
        await using var scope = await Scope.Create();
        var order = await scope.ShipAndFulfill(1, submitLot: false);
        var included = Assert.Single(order.AssemblyCases!);
        var key = Guid.NewGuid().ToString();
        var request = new SubmitPartnerKitLotRequest(included.Version, null, " lot ", null);
        var saved = await scope.Lots(key).Submit(order.Id, included.Id, request, default);
        var replay = await scope.Lots(key).Submit(order.Id, included.Id, request, default);
        Assert.Equal(saved.Id, replay.Id); Assert.Null(saved.UsedOn);
        Assert.Equal(1, await scope.Db.PartnerKitLotSubmissions.CountAsync());
        Assert.Empty(await scope.Db.DataAssemblyRequests.ToListAsync());
        Assert.Empty(await scope.Db.ManagedOperationalFiles.ToListAsync());
        Assert.Equal(KitAssemblyCaseStatus.AwaitingSubmission, (await scope.Db.KitAssemblyCases.AsNoTracking().SingleAsync()).Status);
        var wrongDepartment = await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Lots(department: scope.OtherDepartment.Id).Submit(order.Id, included.Id, request, default));
        Assert.Equal(404, wrongDepartment.StatusCode);
        var wrongLot = await Assert.ThrowsAsync<OrderManagementException>(() => scope.Lots().Submit(order.Id, included.Id,
            new(included.Version, saved.Version, "OTHER LOT", null), default));
        Assert.Equal("kit_lot_mismatch", wrongLot.ErrorCode);
        var refreshed = await scope.TenantController().Get(order.Id, default);
        Assert.Equal(saved.Id, Assert.Single(refreshed.AssemblyCases!).LotSubmission!.Id);
    }

    [PostgreSqlReferenceFact]
    public async Task LaterRecallIsRecheckedAtSubmissionAndAnalysisWithoutRewritingSnapshots()
    {
        await using var scope = await Scope.Create();
        var order = await scope.ShipAndFulfill(1, submitLot: false);
        var included = Assert.Single(order.AssemblyCases!);
        var early = await scope.SubmitLot(order);
        var draft = await scope.Assembly().PrepareIncludedCase(order.Id, included.Id,
            new(included.Version, "Lot check", "{}", "Included outputs", null, true), default);
        var file = await scope.AddFile(draft.Id, null, OperationalFilePurpose.AssemblyInput);
        var manifest = JsonSerializer.Serialize(new { files = new[] { new { id = file.Id } } });
        var missingDate = await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Assembly().Submit(draft.Id, new(draft.Version, manifest, KitLotVersion: 1), default));
        Assert.Equal("kit_use_date_required", missingDate.ErrorCode);
        order = await scope.TenantController().Get(order.Id, default);
        await scope.SubmitLot(order, DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)));
        var recalled = await scope.LotAdmin().Recall(early.CurrentAssessment.LotId, new(1, true, "SIMULATED recall"), default);
        Assert.Equal("kit_lot_changed", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Assembly().Submit(draft.Id, new(draft.Version, manifest, KitLotVersion: 1), default))).ErrorCode);
        Assert.Empty(await scope.Db.AssemblyInputRevisions.ToListAsync());
        var submitted = await scope.Assembly().Submit(draft.Id, new(draft.Version, manifest, KitLotVersion: recalled.Version), default);
        var frozen = Assert.Single(submitted.InputRevisions).KitLotAssessmentJson!;
        Assert.Contains("SIMULATED recall", frozen);
        var intake = await scope.Scientific().BeginIntake(draft.Id, new(submitted.Version), default);
        var queued = await scope.Scientific().AcceptIntake(draft.Id, new(intake.Version), default);
        var restored = await scope.LotAdmin().Recall(recalled.Id, new(recalled.Version, false, "SIMULATED recall lifted"), default);
        Assert.Equal("kit_lot_changed", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Scientific().StartProcessing(draft.Id, new(queued.Version, "1", "fixture", "Fixture", recalled.Version), default))).ErrorCode);
        Assert.Empty(await scope.Db.AssemblyProcessingRuns.ToListAsync());
        var started = await scope.Scientific().StartProcessing(draft.Id, new(queued.Version, "1", "fixture", "Fixture", restored.Version), default);
        Assert.True(JsonElement.DeepEquals(JsonDocument.Parse(frozen).RootElement,
            JsonDocument.Parse(Assert.Single(started.InputRevisions).KitLotAssessmentJson!).RootElement));
        var runEvidence = Assert.Single(started.ProcessingRuns).KitLotAssessmentJson!;
        Assert.False(JsonDocument.Parse(runEvidence).RootElement.GetProperty("isRecalled").GetBoolean());
    }

    [PostgreSqlReferenceFact]
    public async Task MissingOrRecalledRegisteredLotCannotBeShipped()
    {
        await using var scope = await Scope.Create();
        var order = await scope.PlaceOrder(1);
        order = await scope.Platform().Accept(order.Id, new(order.Version), default);
        var line = Assert.Single(order.Lines);
        var request = new CreateShipmentRequest(order.Version, "Carrier", null, "Tracking", DateTime.UtcNow, [new(line.Id, 1, "RECALLED")]);
        Assert.Equal("kit_lot_required", (await Assert.ThrowsAsync<OrderManagementException>(() => scope.Platform().CreateShipment(order.Id, request, default))).ErrorCode);
        var lot = await scope.RegisterLot("RECALLED");
        await scope.LotAdmin().Recall(lot.Id, new(lot.Version, true, "SIMULATED recall"), default);
        Assert.Equal("kit_lot_recalled", (await Assert.ThrowsAsync<OrderManagementException>(() => scope.Platform().CreateShipment(order.Id, request, default))).ErrorCode);
        Assert.Empty(await scope.Db.ReagentShipments.ToListAsync());
        Assert.Null((await scope.Db.PartnerKitUnits.AsNoTracking().SingleAsync()).KitLotId);
    }
}
