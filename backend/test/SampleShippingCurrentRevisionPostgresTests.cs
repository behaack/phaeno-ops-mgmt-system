namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ShippingPreviewFollowsCurrentSampleTypeAndProcedureRevisions()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var controller = scope.CreateConfigurationController();
        var now = DateTime.UtcNow;
        var destination = await controller.CreateDestination(scope.DestinationRequest(now.AddDays(-4)), default);
        scope.ClearTrackedState();
        var first = await controller.CreateSampleType(scope.SampleTypeRequest(now.AddDays(-3)), default);
        scope.ClearTrackedState();
        var draft = await controller.CreateSampleType(
            scope.SampleTypeRequest(now.AddDays(-2), first.Id, first.Version)
                with { IsActive = false, ShippingProcedureId = null }, default);
        scope.ClearTrackedState();

        var before = await controller.Preview(new(destination.Id, [first.Id], now), default);
        Assert.Equal(first.Id, Assert.Single(before.SampleRules).SampleType.Id);
        Assert.Equal(scope.DefaultProcedureId, Assert.Single(before.SampleRules).ShippingProcedureId);

        var active = await controller.SetSampleTypeStatus(draft.Id, new(true, draft.Version), default);
        scope.ClearTrackedState();
        var after = await controller.Preview(new(destination.Id, [first.Id], DateTime.UtcNow), default);
        Assert.Equal(active.Id, Assert.Single(after.SampleRules).SampleType.Id);

        var saved = await scope.DbContext.SampleTypeDefinitions.AsNoTracking()
            .SingleAsync(value => value.Id == first.Id);
        Assert.False(saved.IsEffectiveAt(DateTime.UtcNow));
    }
}
