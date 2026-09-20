namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.Relationships.Application;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ShippingFollowsActiveSampleIdentityAcrossDraftsAndScheduledRevisions()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var controller = scope.CreateConfigurationController();
        var now = DateTime.UtcNow;
        var destination = await controller.CreateDestination(scope.DestinationRequest(now.AddDays(-4)), CancellationToken.None);
        scope.ClearTrackedState();
        var first = await controller.CreateSampleType(scope.SampleTypeRequest(now.AddDays(-3)), CancellationToken.None);
        scope.ClearTrackedState();
        var rule = await controller.CreateInstructionRule(scope.RuleRequest(destination.Id, first.Id, now.AddDays(-3)), CancellationToken.None);
        scope.ClearTrackedState();
        var catalog = new SampleShippingContainerCatalogService(scope.DbContext);
        var container = await catalog.CreateAsync(new($"PACK-{scope.Suffix}-FOLLOW", "Current revision test", 5,
            now.AddDays(-3), [new(first.Id, rule.Id)], IsActive: true), CancellationToken.None);
        scope.ClearTrackedState();
        var draft = await controller.CreateSampleType(scope.SampleTypeRequest(now.AddDays(-2), first.Id, first.Version) with { IsActive = false }, CancellationToken.None);
        scope.ClearTrackedState();
        Assert.Equal(first.Id, Assert.Single((await controller.Preview(new(destination.Id, [first.Id], now), CancellationToken.None)).SampleRules).SampleType.Id);
        var active = await controller.CreateSampleType(scope.SampleTypeRequest(now.AddDays(-1), draft.Id, draft.Version, "Renamed RNA"), CancellationToken.None);
        scope.ClearTrackedState();
        var future = await controller.CreateSampleType(scope.SampleTypeRequest(now.AddDays(1), active.Id, active.Version), CancellationToken.None);
        scope.ClearTrackedState();
        foreach (var anchor in new[] { first.Id, draft.Id, active.Id, future.Id })
            Assert.Equal(active.Id, Assert.Single((await controller.Preview(new(destination.Id, [anchor], now), CancellationToken.None)).SampleRules).SampleType.Id);
        Assert.Equal(future.Id, Assert.Single((await controller.Preview(new(destination.Id, [first.Id], now.AddDays(2)), CancellationToken.None)).SampleRules).SampleType.Id);
        Assert.Equal(container.Id, Assert.Single(await catalog.ReadCompatibleAsync([new(active.Id, rule.Id)], CancellationToken.None)).Id);
        Assert.Equal(container.Id, Assert.Single(await catalog.ReadStockCompatibleAsync([new(active.Id, rule.Id)], [container.Id], CancellationToken.None)).Id);
        var readiness = await new OperationalReadinessService(scope.DbContext).EvaluateAsync(scope.CustomerOrganization.Id, CancellationToken.None);
        Assert.DoesNotContain(readiness.Evaluation.Blockers, value => value.Code == OperationalReadinessBlockerCode.ShippingConfigurationIncomplete);
        var overlap = await Assert.ThrowsAsync<OrderManagementException>(() => controller.CreateInstructionRule(
            scope.RuleRequest(destination.Id, active.Id, now), CancellationToken.None));
        Assert.Equal("shipping_instruction_period_overlap", overlap.ErrorCode);
        scope.ClearTrackedState();
        var duplicate = await Assert.ThrowsAsync<OrderManagementException>(() => controller.Preview(new(destination.Id, [first.Id, active.Id], now), CancellationToken.None));
        Assert.Equal("sample_type_duplicate", duplicate.ErrorCode);
        var last = await scope.DbContext.SampleTypeDefinitions.SingleAsync(value => value.Id == future.Id);
        last.EndAt(now.AddDays(3));
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        var unavailable = await Assert.ThrowsAsync<OrderManagementException>(() => controller.Preview(new(destination.Id, [first.Id], now.AddDays(4)), CancellationToken.None));
        Assert.Equal("sample_type_not_effective", unavailable.ErrorCode);
    }
}
