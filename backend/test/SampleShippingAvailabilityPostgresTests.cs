namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task DestinationDraftLeavesEarlierRevisionAvailableUntilActivation()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var controller = scope.CreateConfigurationController();
        var first = await controller.CreateDestination(
            scope.DestinationRequest(DateTime.UtcNow.AddDays(-3)), default);
        scope.ClearTrackedState();

        var draft = await controller.CreateDestination(
            scope.DestinationRequest(DateTime.UtcNow.AddDays(-1), first.Id, first.Version)
                with { IsActive = false }, default);
        scope.ClearTrackedState();

        Assert.True((await scope.DbContext.SampleShippingDestinations.AsNoTracking()
            .SingleAsync(value => value.Id == first.Id)).IsActive);
        Assert.False(draft.IsActive);

        var active = await controller.SetDestinationStatus(draft.Id,
            new(true, draft.Version), default);
        scope.ClearTrackedState();

        Assert.True(active.IsActive);
        var predecessor = await scope.DbContext.SampleShippingDestinations.AsNoTracking()
            .SingleAsync(value => value.Id == first.Id);
        Assert.False(predecessor.IsEffectiveAt(DateTime.UtcNow));
    }
}
