namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task CompletedReceivedKitWithoutSecondScanIsUsableForPhasePreparation()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync("one-pass-phase-stock", 2, separateSamplePhases: true);
        var phases = await scope.DbContext.Set<LabJobPhase>().Where(p => p.LabServiceOrderId == fixture.OrderId)
            .OrderBy(p => p.Position).ToArrayAsync();
        foreach (var phase in phases) phase.SetScope(new([new("synthetic_reference", 1)], 1, 1));
        await scope.DbContext.SaveChangesAsync();
        var accepted = await scope.AcceptQuoteAsync(fixture);
        var paired = await scope.AddReferenceSampleAsync(fixture.OrderId, accepted.Version);
        var selection = await scope.DbContext.LabSampleTubeKitSelections.SingleAsync(s => s.LabServiceOrderId == fixture.OrderId);
        var kit = await scope.DbContext.SampleShippingStockKits.SingleAsync(k => k.Id == selection.StockKitId);
        Assert.NotNull(kit.AssemblyCompletedAt);
        Assert.NotNull(kit.CustomerReceivedAt);
        scope.DbContext.Entry(kit).Property(k => k.TubesVerifiedAt).CurrentValue = null;
        scope.DbContext.Entry(kit).Property(k => k.TubesVerifiedByUserId).CurrentValue = null;
        await scope.DbContext.SaveChangesAsync();
        var controller = scope.CreateCustomerController(new InternalLabOperationsProvider(scope.DbContext), Guid.NewGuid().ToString("N"));
        var saved = await controller.SaveSampleTubeKit(fixture.OrderId, new(paired.Version, kit.KitNumber, phases[0].Id), default);
        Assert.True(Assert.Single(saved.Kits).IsUsable);
        var supply = await controller.ReadPhaseKitSupply(fixture.OrderId, scope.DeliveryLocationId, default);
        Assert.Equal(0, Assert.Single(supply.Phases, p => p.PhaseId == phases[0].Id).Recommendation.ContainerCount);
    }

    [PostgreSqlReferenceFact]
    public async Task AllocatedKitWithoutPhysicalReceiptCannotCoverPhaseOrBecomeUsable()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync("unreceived-phase-stock", 2, separateSamplePhases: true);
        var phases = await scope.DbContext.Set<LabJobPhase>().Where(p => p.LabServiceOrderId == fixture.OrderId)
            .OrderBy(p => p.Position).ToArrayAsync();
        foreach (var phase in phases) phase.SetScope(new([new("synthetic_reference", 1)], 1, 1));
        await scope.DbContext.SaveChangesAsync();
        var accepted = await scope.AcceptQuoteAsync(fixture);
        await scope.AddReferenceSampleAsync(fixture.OrderId, accepted.Version);
        var selection = await scope.DbContext.LabSampleTubeKitSelections.SingleAsync(s => s.LabServiceOrderId == fixture.OrderId);
        var kit = await scope.DbContext.SampleShippingStockKits.SingleAsync(k => k.Id == selection.StockKitId);
        var controller = scope.CreateCustomerController(new InternalLabOperationsProvider(scope.DbContext), Guid.NewGuid().ToString("N"));
        Assert.True(Assert.Single((await controller.ReadSampleTubePairs(fixture.OrderId, default)).Kits).IsUsable);

        // Simulate an inconsistent allocation; allocation alone is not a physical receipt.
        scope.DbContext.Entry(kit).Property(k => k.CustomerReceivedAt).CurrentValue = null;
        await scope.DbContext.SaveChangesAsync();
        var workspace = await controller.ReadSampleTubePairs(fixture.OrderId, default);
        var unavailable = Assert.Single(workspace.Kits);
        Assert.False(unavailable.IsUsable);
        Assert.Equal(0, unavailable.AvailableTubeCount);
        var supply = await controller.ReadPhaseKitSupply(fixture.OrderId, scope.DeliveryLocationId, default);
        Assert.Equal(1, Assert.Single(supply.Phases, p => p.PhaseId == phases[0].Id).Recommendation.ContainerCount);
    }

    [PostgreSqlReferenceFact]
    public async Task OnDemandRequestsAllowOnlyCurrentPhaseAndReplayWithoutDuplicates()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync("on-demand-phases", 2, separateSamplePhases: true);
        var phases = await scope.DbContext.Set<LabJobPhase>().Where(p => p.LabServiceOrderId == fixture.OrderId)
            .OrderBy(p => p.Position).ToArrayAsync();
        foreach (var p in phases) p.SetScope(new([new("synthetic_reference", 1)], 1, 1));
        await scope.DbContext.SaveChangesAsync();
        var accepted = await scope.AcceptQuoteAsync(fixture);
        Assert.Empty(await scope.DbContext.TransportationKitRequests.Where(r => r.LabServiceOrderId == fixture.OrderId).ToArrayAsync());
        var provider = new InternalLabOperationsProvider(scope.DbContext);
        var controller = scope.CreateCustomerController(provider, Guid.NewGuid().ToString("N"));
        var supply = await controller.ReadPhaseKitSupply(fixture.OrderId, scope.DeliveryLocationId, default);
        Assert.Equal(2, supply.Phases.Count);
        Assert.All(supply.Phases, p => Assert.Equal(1, p.Recommendation.ContainerCount));
        Assert.True(supply.Phases[0].CanRequest);
        Assert.False(supply.Phases[1].CanRequest);
        var location = Assert.Single(supply.Locations, l => l.Id == scope.DeliveryLocationId);
        var future = await Assert.ThrowsAsync<OrderManagementException>(() => controller.RequestPhaseKits(fixture.OrderId,
            new(accepted.Version, [phases[1].Id], location.Id, location.Version), default));
        Assert.Equal("phase_shipping_out_of_sequence", future.ErrorCode);
        scope.DbContext.ChangeTracker.Clear();
        controller = scope.CreateCustomerController(provider, Guid.NewGuid().ToString("N"));
        var body = new RequestLabPhaseKitsRequest(accepted.Version, [phases[0].Id], location.Id, location.Version);
        var requested = await controller.RequestPhaseKits(fixture.OrderId, body, default);
        var replay = await controller.RequestPhaseKits(fixture.OrderId, body, default);
        Assert.Equal(requested.Requests.Select(r => r.Id), replay.Requests.Select(r => r.Id));
        Assert.Single(requested.Requests);
        Assert.Equal(phases[0].Id, requested.Requests.Single().PhaseId);
        Assert.All(requested.Requests, r => Assert.Equal(1, r.Lines.Sum(l => l.RequestedQuantity)));
        Assert.All(requested.Phases, p => Assert.False(p.CanRequest));
        var stale = scope.CreateCustomerController(provider, Guid.NewGuid().ToString("N"));
        await Assert.ThrowsAsync<OrderManagementException>(() => stale.RequestPhaseKits(fixture.OrderId, body, default));
        Assert.Single(await scope.DbContext.TransportationKitRequests.Where(r => r.LabServiceOrderId == fixture.OrderId).ToArrayAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task FirstPhaseCanAuthorizeAndShipBeforeFutureSampleIdsExist()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync("independent-preparation", 2, separateSamplePhases: true);
        var phases = await scope.DbContext.Set<LabJobPhase>().Where(p => p.LabServiceOrderId == fixture.OrderId)
            .OrderBy(p => p.Position).ToArrayAsync();
        foreach (var p in phases) p.SetScope(new([new("synthetic_reference", 1)], 1, 1));
        await scope.DbContext.SaveChangesAsync();
        var accepted = await scope.AcceptQuoteAsync(fixture);
        var paired = await scope.AddReferenceSampleAsync(fixture.OrderId, accepted.Version);
        var firstKit = await scope.DbContext.LabSampleTubeKitSelections.AsNoTracking().SingleAsync(s => s.LabServiceOrderId == fixture.OrderId);
        var provider = new InternalLabOperationsProvider(scope.DbContext);
        var controller = scope.CreateCustomerController(provider, Guid.NewGuid().ToString("N"));
        var kit = await scope.DbContext.SampleShippingStockKits.AsNoTracking().SingleAsync(k => k.Id == firstKit.StockKitId);
        var wrongPhase = await Assert.ThrowsAsync<OrderManagementException>(() => controller.SaveSampleTubeKit(fixture.OrderId,
            new(paired.Version, kit.KitNumber, phases[1].Id), default));
        Assert.Equal("phase_shipping_out_of_sequence", wrongPhase.ErrorCode);
        scope.DbContext.ChangeTracker.Clear();
        var first = await controller.FinalizeSampleRoster(fixture.OrderId, new(paired.Version, true, phases[0].Id), default);
        Assert.Null(first.SampleRosterFinalizedAt);
        Assert.Single(first.Samples);
        Assert.Equal(phases[0].Id, Assert.Single(first.Samples).PhaseId);
        var workspace = await controller.ReadSampleTubePairs(fixture.OrderId, default);
        Assert.Equal(phases[0].Id, Assert.Single(workspace.PreparedPhaseIds!));
        Assert.Single(await scope.DbContext.SampleShipments.Where(s => s.AuthorizationSourceId == fixture.OrderId).ToArrayAsync());
        var later = await Assert.ThrowsAsync<OrderManagementException>(() => scope.AddReferenceSampleAsync(fixture.OrderId, first.Version));
        Assert.Equal("phase_shipping_out_of_sequence", later.ErrorCode);
        scope.DbContext.ChangeTracker.Clear();
        var finalizeLater = await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreateCustomerController(provider, Guid.NewGuid().ToString("N"))
            .FinalizeSampleRoster(fixture.OrderId, new(first.Version, true, phases[1].Id), default));
        Assert.Equal("phase_shipping_out_of_sequence", finalizeLater.ErrorCode);
        Assert.Single(await scope.DbContext.SampleShipments.Where(s => s.AuthorizationSourceId == fixture.OrderId).ToArrayAsync());
        var authorization = await scope.DbContext.CommercialLabAuthorizations.SingleAsync(a => a.CommercialOrderId == fixture.OrderId);
        Assert.Equal(1, authorization.AuthorizationVersion);
    }
}
