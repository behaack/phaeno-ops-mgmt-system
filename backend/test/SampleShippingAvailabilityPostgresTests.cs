namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task SavedAssignmentCanActivateAfterItsDestinationWithoutCreatingRevisions()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var controller = scope.CreateConfigurationController();
        var now = DateTime.UtcNow;
        // Preserve exact record comparisons across PostgreSQL's microsecond timestamp precision.
        now = now.AddTicks(-(now.Ticks % 10));
        var destination = await controller.CreateDestination(scope.DestinationRequest(now.AddDays(-1)) with { IsActive = false }, default);
        scope.ClearTrackedState();
        var sample = await controller.CreateSampleType(scope.SampleTypeRequest(now.AddDays(-3)), default);
        scope.ClearTrackedState();
        // The draft began before the destination. Activation must validate today's prerequisites.
        var assignment = await controller.CreateInstructionRule(scope.RuleRequest(destination.Id, sample.Id, now.AddDays(-2)) with { IsActive = false }, default);
        scope.ClearTrackedState();
        var blocked = await Assert.ThrowsAsync<OrderManagementException>(() => controller.SetInstructionRuleStatus(assignment.Id, new(true, assignment.Version), default));
        Assert.Equal("shipping_destination_not_effective", blocked.ErrorCode);
        Assert.Contains(destination.Name, blocked.Message);
        Assert.Contains("inactive", blocked.Message);
        scope.ClearTrackedState();
        var deniedDestination = await Assert.ThrowsAsync<OrderManagementException>(() => scope.CustomerSampleTypeController().SetDestinationStatus(destination.Id, new(true, destination.Version), default));
        var deniedAssignment = await Assert.ThrowsAsync<OrderManagementException>(() => scope.CustomerSampleTypeController().SetInstructionRuleStatus(assignment.Id, new(true, assignment.Version), default));
        Assert.Equal(403, deniedDestination.StatusCode);
        Assert.Equal(403, deniedAssignment.StatusCode);
        scope.ClearTrackedState();

        var activeDestination = await controller.SetDestinationStatus(destination.Id, new(true, destination.Version), default);
        scope.ClearTrackedState();
        Assert.Equal(destination with { IsActive = true, Version = destination.Version + 1 }, activeDestination);
        var activeAssignment = await controller.SetInstructionRuleStatus(assignment.Id, new(true, assignment.Version), default);
        scope.ClearTrackedState();
        Assert.Equal(assignment with { IsActive = true, Version = assignment.Version + 1 }, activeAssignment);
        Assert.Single((await controller.Preview(new(destination.Id, [sample.Id], DateTime.UtcNow), default)).SampleRules);
        var stale = await Assert.ThrowsAsync<OrderManagementException>(() => controller.SetInstructionRuleStatus(assignment.Id, new(false, assignment.Version), default));
        Assert.Equal("sample_shipping_version_conflict", stale.ErrorCode);
        scope.ClearTrackedState();
        var staleDestination = await Assert.ThrowsAsync<OrderManagementException>(() => controller.SetDestinationStatus(destination.Id, new(false, destination.Version), default));
        Assert.Equal("sample_shipping_version_conflict", staleDestination.ErrorCode);
        scope.ClearTrackedState();

        await controller.SetDestinationStatus(destination.Id, new(false, activeDestination.Version), default);
        scope.ClearTrackedState();
        // Missing prerequisites must never prevent an administrator from deactivating a rule.
        var inactive = await controller.SetInstructionRuleStatus(assignment.Id, new(false, activeAssignment.Version), default);
        Assert.False(inactive.IsActive);
        scope.ClearTrackedState();
        Assert.Equal(1, await scope.DbContext.SampleShippingDestinations.CountAsync(value => value.DefinitionKey == destination.DefinitionKey));
        Assert.Equal(1, await scope.DbContext.SampleShippingInstructionRules.CountAsync(value => value.DefinitionKey == assignment.DefinitionKey));
    }

    [PostgreSqlReferenceFact]
    public async Task DestinationAndAssignmentDraftsPreserveActivePredecessorsUntilActivation()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var controller = scope.CreateConfigurationController();
        var now = DateTime.UtcNow;
        var destination = await controller.CreateDestination(scope.DestinationRequest(now.AddDays(-4)), default);
        scope.ClearTrackedState();
        var sample = await controller.CreateSampleType(scope.SampleTypeRequest(now.AddDays(-4)), default);
        scope.ClearTrackedState();
        var assignment = await controller.CreateInstructionRule(scope.RuleRequest(destination.Id, sample.Id, now.AddDays(-3)), default);
        scope.ClearTrackedState();
        var destinationDraft = await controller.CreateDestination(scope.DestinationRequest(now.AddDays(-2), destination.Id, destination.Version) with { IsActive = false }, default);
        scope.ClearTrackedState();
        var assignmentDraft = await controller.CreateInstructionRule(scope.RuleRequest(destination.Id, sample.Id, now.AddDays(-2), assignment.Id, assignment.Version) with { IsActive = false }, default);
        scope.ClearTrackedState();
        Assert.Null((await scope.DbContext.SampleShippingDestinations.AsNoTracking().SingleAsync(value => value.Id == destination.Id)).EffectiveTo);
        Assert.Null((await scope.DbContext.SampleShippingInstructionRules.AsNoTracking().SingleAsync(value => value.Id == assignment.Id)).EffectiveTo);
        var beforeActivation = DateTime.UtcNow;
        var active = await controller.SetInstructionRuleStatus(assignmentDraft.Id, new(true, assignmentDraft.Version), default);
        scope.ClearTrackedState();
        Assert.Equal(2, active.Revision);
        Assert.True((await scope.DbContext.SampleShippingInstructionRules.AsNoTracking().SingleAsync(value => value.Id == assignment.Id)).EffectiveTo >= beforeActivation.AddMilliseconds(-1));
        var otherFamily = await controller.CreateInstructionRule(scope.RuleRequest(destination.Id, sample.Id, now.AddDays(-1)) with { IsActive = false }, default);
        scope.ClearTrackedState();
        var overlap = await Assert.ThrowsAsync<OrderManagementException>(() => controller.SetInstructionRuleStatus(otherFamily.Id, new(true, otherFamily.Version), default));
        Assert.Equal("shipping_instruction_period_overlap", overlap.ErrorCode);
        scope.ClearTrackedState();
        await controller.SetInstructionRuleStatus(active.Id, new(false, active.Version), default);
        scope.ClearTrackedState();
        var unavailable = await Assert.ThrowsAsync<OrderManagementException>(() => controller.Preview(new(destination.Id, [sample.Id], DateTime.UtcNow), default));
        Assert.Equal("sample_shipping_incompatible", unavailable.ErrorCode);
        scope.ClearTrackedState();

        await controller.SetDestinationStatus(destinationDraft.Id, new(true, destinationDraft.Version), default);
        scope.ClearTrackedState();
        var ended = await scope.DbContext.SampleShippingDestinations.AsNoTracking().SingleAsync(value => value.Id == destination.Id);
        Assert.True(ended.EffectiveTo >= beforeActivation.AddMilliseconds(-1));
        var historical = await Assert.ThrowsAsync<OrderManagementException>(() => controller.SetDestinationStatus(destination.Id, new(true, ended.Version), default));
        Assert.Equal("shipping_destination_already_superseded", historical.ErrorCode);
        scope.ClearTrackedState();
        var exactDestination = await Assert.ThrowsAsync<OrderManagementException>(() => controller.SetInstructionRuleStatus(otherFamily.Id, new(true, otherFamily.Version), default));
        Assert.Equal("shipping_destination_not_effective", exactDestination.ErrorCode);
        Assert.Contains("has ended", exactDestination.Message);
    }
}
