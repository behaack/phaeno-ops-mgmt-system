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
        var destinationDraft = await controller.CreateDestination(scope.DestinationRequest(now.AddDays(-4)) with { IsActive = false }, default);
        var destination = await controller.SetDestinationStatus(destinationDraft.Id, new(true, destinationDraft.Version), default);
        scope.ClearTrackedState();
        var firstDraft = await controller.CreateSampleType(scope.SampleTypeRequest(now.AddDays(-3)) with { IsActive = false }, default);
        var first = await controller.SetSampleTypeStatus(firstDraft.Id, new(true, firstDraft.Version), default);
        scope.ClearTrackedState();
        var draft = await controller.CreateSampleType(
            scope.SampleTypeRequest(DateTime.UtcNow, first.Id, first.Version)
                with { IsActive = false }, default);
        scope.ClearTrackedState();

        var before = await controller.Preview(new(destination.Id, [first.Id], DateTime.UtcNow), default);
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
