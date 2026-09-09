namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task LabOwnedShippingSampleRejectsLegacyReceiptAccessionAndTransitionWithoutChanges()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync($"lab-owned-guard-{Guid.NewGuid():N}");
        await scope.AuthorizeSampleRosterAsync(fixture, new InternalLabOperationsProvider(scope.DbContext));
        scope.DbContext.ChangeTracker.Clear();
        var sample = await scope.DbContext.LabSamples.AsNoTracking()
            .SingleAsync(value => value.LabServiceOrderId == fixture.OrderId);
        var before = await ReadStateAsync();
        var controller = scope.LegacySampleOperationsController();

        var receive = await Assert.ThrowsAsync<OrderManagementException>(() => controller.Receive(
            fixture.OrderId, sample.Id, new(sample.Version, DateTime.UtcNow, "Intact"), CancellationToken.None));
        var accession = await Assert.ThrowsAsync<OrderManagementException>(() => controller.Accession(
            fixture.OrderId, sample.Id, new(sample.Version, "legacy-bypass"), CancellationToken.None));
        var transition = await Assert.ThrowsAsync<OrderManagementException>(() => controller.TransitionSample(
            fixture.OrderId, sample.Id, new(sample.Version, "OnHold", "Review required", null), CancellationToken.None));

        foreach (var error in new[] { receive, accession, transition })
        {
            Assert.Equal(StatusCodes.Status409Conflict, error.StatusCode);
            Assert.Equal("lab_owned_sample_operation_required", error.ErrorCode);
            Assert.Contains("Lab operations", error.Message);
        }
        Assert.False(scope.DbContext.ChangeTracker.HasChanges());
        scope.DbContext.ChangeTracker.Clear();
        Assert.Equal(before, await ReadStateAsync());

        async Task<string> ReadStateAsync()
        {
            var savedSample = await scope.DbContext.LabSamples.AsNoTracking().SingleAsync(value => value.Id == sample.Id);
            var order = await scope.DbContext.LabServiceOrders.AsNoTracking().SingleAsync(value => value.Id == fixture.OrderId);
            var work = await scope.DbContext.LabWorkOrders.AsNoTracking().SingleAsync(value => value.AuthorizationSourceId == fixture.OrderId);
            var specimen = await scope.DbContext.LabSpecimens.AsNoTracking().SingleAsync(value => value.SubmittedSpecimenId == sample.Id);
            var shipment = await scope.DbContext.SampleShipments.AsNoTracking().SingleAsync(value => value.AuthorizationSourceId == fixture.OrderId);
            return System.Text.Json.JsonSerializer.Serialize(new
            {
                Sample = new { savedSample.Status, savedSample.Version, savedSample.ReceivedAt, savedSample.ReceiptCondition,
                    savedSample.AccessionId, savedSample.ResumeStatus, savedSample.TenantSafeReason, savedSample.InternalNote },
                Order = new { order.Status, order.Version },
                Work = new { work.Status, work.Version },
                Specimen = new { specimen.IntakeDisposition, specimen.Version, specimen.ReceivedAtUtc, specimen.AccessionNumber },
                Shipment = new { shipment.Status, shipment.Version, shipment.ReceivedAt },
                EventCount = await scope.DbContext.OrderStatusEvents.CountAsync(),
                NoticeCount = await scope.DbContext.OrderNotifications.CountAsync()
            });
        }
    }

    [PostgreSqlReferenceFact]
    public async Task LegacySampleWithoutLabOwnedShippingRetainsReceiptAccessionAndTransition()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var order = await scope.CreateSampleCapacityOrderAsync();
        var sample = await scope.AddLegacyCapacitySampleAsync(order.Id, "legacy-unowned", "Human PBMCs");
        var controller = scope.LegacySampleOperationsController();
        var receivedAt = DateTime.UtcNow.AddMinutes(-1);

        await controller.Receive(order.Id, sample.Id, new(sample.Version, receivedAt, "Intact"), CancellationToken.None);
        Assert.Equal(LabSampleStatus.Received, sample.Status);
        await controller.Accession(order.Id, sample.Id, new(sample.Version, "LEGACY-01"), CancellationToken.None);
        Assert.Equal(LabSampleStatus.Accessioned, sample.Status);
        await controller.TransitionSample(order.Id, sample.Id,
            new(sample.Version, "OnHold", "Awaiting review", null), CancellationToken.None);

        scope.DbContext.ChangeTracker.Clear();
        var persisted = await scope.DbContext.LabSamples.AsNoTracking().SingleAsync(value => value.Id == sample.Id);
        Assert.Equal(LabSampleStatus.OnHold, persisted.Status);
        Assert.Equal(LabSampleStatus.Accessioned, persisted.ResumeStatus);
        Assert.NotNull(persisted.ReceivedAt);
        Assert.Equal("Intact", persisted.ReceiptCondition);
        Assert.Equal("LEGACY-01", persisted.AccessionId);
        Assert.Equal("Awaiting review", persisted.TenantSafeReason);
        Assert.False(await scope.DbContext.LabWorkOrders.AnyAsync(value => value.AuthorizationSourceId == order.Id));
    }

    private sealed partial class HandoffTestScope
    {
        public PlatformLabServiceOrdersController LegacySampleOperationsController()
            => CreatePlatformController(new InternalLabOperationsProvider(DbContext));
    }
}
