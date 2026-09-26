namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task SampleTypeStatusPreservesRevisionAuditsChangesAndBlocksNewResolution()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var controller = scope.CreateConfigurationController();
        var now = DateTime.UtcNow;
        // Preserve exact record comparisons across PostgreSQL's microsecond timestamp precision.
        now = now.AddTicks(-(now.Ticks % 10));
        var destination = await controller.CreateDestination(scope.DestinationRequest(now.AddDays(-3)), default);
        scope.ClearTrackedState();
        var first = await controller.CreateSampleType(scope.SampleTypeRequest(now.AddDays(-2)), default);
        scope.ClearTrackedState();
        var denied = await Assert.ThrowsAsync<OrderManagementException>(() => scope.CustomerSampleTypeController()
            .SetSampleTypeStatus(first.Id, new(false, first.Version), default));
        Assert.Equal(403, denied.StatusCode);
        scope.ClearTrackedState();

        var inactive = await controller.SetSampleTypeStatus(first.Id, new(false, first.Version), default);
        scope.ClearTrackedState();
        Assert.Equal(first with { IsActive = false, Version = inactive.Version }, inactive);
        Assert.Equal(first.Version + 1, inactive.Version);
        var unavailable = await Assert.ThrowsAsync<OrderManagementException>(() => controller.Preview(new(destination.Id, [first.Id], DateTime.UtcNow), default));
        Assert.Equal("sample_type_not_effective", unavailable.ErrorCode);
        var stale = await Assert.ThrowsAsync<OrderManagementException>(() => controller.SetSampleTypeStatus(first.Id, new(true, first.Version), default));
        Assert.Equal("sample_shipping_version_conflict", stale.ErrorCode);
        scope.ClearTrackedState();

        var reactivated = await controller.SetSampleTypeStatus(first.Id, new(true, inactive.Version), default);
        scope.ClearTrackedState();
        Assert.Equal(first with { Version = reactivated.Version }, reactivated);
        Assert.Equal(first.Id, Assert.Single((await controller.Preview(new(destination.Id, [first.Id], DateTime.UtcNow), default)).SampleRules).SampleType.Id);
        Assert.Equal(1, await scope.DbContext.SampleTypeDefinitions.CountAsync(value => value.DefinitionKey == first.DefinitionKey));
        var audits = await scope.DbContext.AuditEvents.AsNoTracking().Where(value => value.EntityId == first.Id.ToString() && value.Operation == "Updated").ToListAsync();
        Assert.Equal(2, audits.Count);
        Assert.All(audits, audit => {
            using var changes = JsonDocument.Parse(audit.ChangesJson);
            Assert.True(changes.RootElement.TryGetProperty("IsActive", out var status));
            Assert.NotEqual(status.GetProperty("old").GetBoolean(), status.GetProperty("new").GetBoolean());
            Assert.False(changes.RootElement.TryGetProperty("Revision", out _));
            Assert.True(audit.OccurredAt >= now);
        });
    }

    [PostgreSqlReferenceFact]
    public async Task ActivatingSavedDraftClosesPreviousAtActivationWithoutFallbackOrExtraRevision()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var controller = scope.CreateConfigurationController();
        var now = DateTime.UtcNow;
        var destination = await controller.CreateDestination(scope.DestinationRequest(now.AddDays(-4)), default);
        scope.ClearTrackedState();
        var first = await controller.CreateSampleType(scope.SampleTypeRequest(now.AddDays(-3)), default);
        scope.ClearTrackedState();
        var draft = await controller.CreateSampleType(scope.SampleTypeRequest(now.AddDays(-2), first.Id, first.Version) with { IsActive = false, ShippingProcedureId = null }, default);
        scope.ClearTrackedState();
        var beforeActivation = DateTime.UtcNow;
        var active = await controller.SetSampleTypeStatus(draft.Id, new(true, draft.Version), default);
        scope.ClearTrackedState();
        Assert.Equal(draft.Id, active.Id);
        Assert.Equal(2, active.Revision);
        var previous = await scope.DbContext.SampleTypeDefinitions.AsNoTracking().SingleAsync(value => value.Id == first.Id);
        Assert.True(previous.EffectiveTo >= beforeActivation.AddMilliseconds(-1));
        var inactive = await controller.SetSampleTypeStatus(active.Id, new(false, active.Version), default);
        scope.ClearTrackedState();
        var unavailable = await Assert.ThrowsAsync<OrderManagementException>(() => controller.Preview(new(destination.Id, [first.Id], DateTime.UtcNow), default));
        Assert.Equal("sample_type_not_effective", unavailable.ErrorCode);
        var historical = await Assert.ThrowsAsync<OrderManagementException>(() => controller.SetSampleTypeStatus(first.Id, new(true, previous.Version), default));
        Assert.Equal("sample_type_already_superseded", historical.ErrorCode);
        scope.ClearTrackedState();
        await controller.SetSampleTypeStatus(active.Id, new(true, inactive.Version), default);
        scope.ClearTrackedState();
        Assert.Equal(active.Id, Assert.Single((await controller.Preview(new(destination.Id, [first.Id], DateTime.UtcNow), default)).SampleRules).SampleType.Id);
        Assert.Equal(2, await scope.DbContext.SampleTypeDefinitions.CountAsync(value => value.DefinitionKey == first.DefinitionKey));

        var current = await scope.DbContext.SampleTypeDefinitions.AsNoTracking().SingleAsync(value => value.Id == active.Id);
        var future = await controller.CreateSampleType(scope.SampleTypeRequest(now.AddDays(2), active.Id, current.Version) with { IsActive = false, ShippingProcedureId = null }, default);
        scope.ClearTrackedState();
        await controller.SetSampleTypeStatus(future.Id, new(true, future.Version), default);
        scope.ClearTrackedState();
        Assert.Equal(active.Id, Assert.Single((await controller.Preview(new(destination.Id, [first.Id], DateTime.UtcNow), default)).SampleRules).SampleType.Id);
        Assert.Equal(future.Id, Assert.Single((await controller.Preview(new(destination.Id, [first.Id], now.AddDays(3)), default)).SampleRules).SampleType.Id);
    }

    private sealed partial class ShippingTestScope
    {
        public SampleShippingAdminController CustomerSampleTypeController() => new(DbContext,
            new OrderRequestContext(DbContext, new FixedIdentityContext(customerIdentity)), new SampleShippingWorkflowReader(DbContext))
            { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };
    }
}
