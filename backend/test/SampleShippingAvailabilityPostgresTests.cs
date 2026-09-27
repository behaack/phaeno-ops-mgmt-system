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
            scope.DestinationRequest(DateTime.UtcNow.AddDays(-3)) with { IsActive = false }, default);
        var firstActive = await controller.SetDestinationStatus(first.Id, new(true, first.Version), default);
        scope.ClearTrackedState();

        var draft = await controller.CreateDestination(
            scope.DestinationRequest(DateTime.UtcNow, firstActive.Id, firstActive.Version)
                with { IsActive = false }, default);
        scope.ClearTrackedState();

        Assert.True((await scope.DbContext.SampleShippingDestinations.AsNoTracking()
            .SingleAsync(value => value.Id == firstActive.Id)).IsActive);
        Assert.False(draft.IsActive);

        var active = await controller.SetDestinationStatus(draft.Id,
            new(true, draft.Version), default);
        scope.ClearTrackedState();

        Assert.True(active.IsActive);
        var predecessor = await scope.DbContext.SampleShippingDestinations.AsNoTracking()
            .SingleAsync(value => value.Id == firstActive.Id);
        Assert.False(predecessor.IsEffectiveAt(DateTime.UtcNow));
    }
}
