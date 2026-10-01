namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.LabOperations.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task PhaseCancellationPreservesReceivedCohortQuoteAndCustodyWithReplayProtection()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync("phase-cancellation", 2, separateSamplePhases: true);
        var accepted = await scope.AcceptQuoteAsync(fixture);
        var first = await scope.AddReferenceSampleAsync(fixture.OrderId, accepted.Version);
        var finished = await scope.FinishCurrentReferenceKitAsync(fixture.OrderId, first.Version);
        var second = await scope.AddReferenceSampleAsync(fixture.OrderId, finished.Version);
        await scope.FinalizeSampleRosterAsync(fixture.OrderId, second.Version, new InternalLabOperationsProvider(scope.DbContext));
        var authorization = await scope.DbContext.CommercialLabAuthorizations.SingleAsync(value => value.CommercialOrderId == fixture.OrderId);
        var phases = await scope.DbContext.Set<LabJobPhase>().Where(value => value.LabServiceOrderId == fixture.OrderId)
            .OrderBy(value => value.Position).ToArrayAsync();
        var samples = await scope.DbContext.LabSamples.Where(value => value.LabServiceOrderId == fixture.OrderId).ToArrayAsync();
        var receivedSample = samples.Single(value => value.LabJobPhaseId == phases[0].Id);
        var cancelledSample = samples.Single(value => value.LabJobPhaseId == phases[1].Id);
        var receivedSpecimen = await scope.DbContext.LabSpecimens.SingleAsync(value => value.SubmittedSpecimenId == receivedSample.Id);
        var cancelledSpecimen = await scope.DbContext.LabSpecimens.SingleAsync(value => value.SubmittedSpecimenId == cancelledSample.Id);
        receivedSpecimen.RecordReceipt(DateTime.UtcNow, "Intact", "SIMULATED receipt");
        await scope.DbContext.SaveChangesAsync();
        var quote = await scope.DbContext.LabServiceQuotes.AsNoTracking().SingleAsync(value => value.Id == fixture.QuoteId);
        var snapshot = (quote.LinesJson, quote.Total, quote.AcceptedAt);
        var custody = await scope.DbContext.SampleShipments.AsNoTracking().Where(value => value.AuthorizationSourceId == fixture.OrderId)
            .OrderBy(value => value.Id).Select(value => new { value.Id, value.Status, value.ShippedAt, value.ReceivedAt }).ToArrayAsync();
        var receiptCount = await scope.DbContext.LabProviderCommandReceipts.CountAsync(value => value.AuthorizationId == authorization.AuthorizationId);
        var plan = await new LabPhaseFacts(scope.DbContext).ReadAsync(fixture.OrderId, default);
        // Laboratory receipt closes the entire first cohort, even while its commercial sample is Expected.
        var closed = await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreateCustomerController(
            new InternalLabOperationsProvider(scope.DbContext), Guid.NewGuid().ToString("N"))
            .RequestPhaseCancellation(fixture.OrderId, phases[0].Id, new(plan.Revision, "Unused cohort"), default));
        Assert.Equal("phase_cancellation_closed", closed.ErrorCode);
        Assert.Empty(await scope.DbContext.Set<LabPhaseCancellationRequest>()
            .Where(value => value.LabJobPhaseId == phases[0].Id).ToArrayAsync());
        scope.DbContext.ChangeTracker.Clear();
        plan = await scope.CreateCustomerController(new InternalLabOperationsProvider(scope.DbContext), Guid.NewGuid().ToString("N"))
            .RequestPhaseCancellation(fixture.OrderId, phases[1].Id, new(plan.Revision, "Unused future cohort"), default);
        var request = Assert.Single(plan.Cancellations);
        Assert.Equal("Pending", request.Status);
        Assert.Equal(receiptCount, await scope.DbContext.LabProviderCommandReceipts.CountAsync(value => value.AuthorizationId == authorization.AuthorizationId));
        var key = Guid.NewGuid().ToString("N");
        var decision = new LabPhaseDecisionRequest(request.Version, true, "Cancel the complete unreceived cohort");
        var result = await scope.CreatePlatformController(new InternalLabOperationsProvider(scope.DbContext), key)
            .DecidePhaseCancellation(fixture.OrderId, request.Id, decision, default);
        Assert.Equal("Cancelled", result.Phases.Single(value => value.Id == phases[1].Id).Lifecycle);
        Assert.Equal("Approved", Assert.Single(result.Cancellations).Status);
        scope.DbContext.ChangeTracker.Clear();
        var order = await scope.DbContext.LabServiceOrders.Include(value => value.Samples).SingleAsync(value => value.Id == fixture.OrderId);
        Assert.Equal(LabServiceOrderStatus.PlacedAwaitingSamples, order.Status);
        Assert.Equal(LabSampleStatus.Cancelled, order.Samples.Single(value => value.Id == cancelledSample.Id).Status);
        Assert.NotEqual(LabSampleStatus.Cancelled, order.Samples.Single(value => value.Id == receivedSample.Id).Status);
        Assert.Equal(CommercialLabAuthorizationStatus.Accepted, (await scope.DbContext.CommercialLabAuthorizations.SingleAsync(value => value.Id == authorization.Id)).Status);
        Assert.Equal(LabSpecimenIntakeDisposition.Cancelled, (await scope.DbContext.LabSpecimens.SingleAsync(value => value.Id == cancelledSpecimen.Id)).IntakeDisposition);
        Assert.NotNull((await scope.DbContext.LabSpecimens.SingleAsync(value => value.Id == receivedSpecimen.Id)).ReceivedAtUtc);
        quote = await scope.DbContext.LabServiceQuotes.SingleAsync(value => value.Id == fixture.QuoteId);
        Assert.Equal(snapshot, (quote.LinesJson, quote.Total, quote.AcceptedAt));
        Assert.Equal(custody, await scope.DbContext.SampleShipments.AsNoTracking().Where(value => value.AuthorizationSourceId == fixture.OrderId)
            .OrderBy(value => value.Id).Select(value => new { value.Id, value.Status, value.ShippedAt, value.ReceivedAt }).ToArrayAsync());
        Assert.Equal(1, await scope.DbContext.OrderNotifications.CountAsync(value => value.WorkflowId == fixture.OrderId && value.EventType == "lab-phase-cancellation-decided"));
        var replay = await scope.CreatePlatformController(new InternalLabOperationsProvider(scope.DbContext), key)
            .DecidePhaseCancellation(fixture.OrderId, request.Id, decision, default);
        Assert.Equal(result.Revision, replay.Revision);
        Assert.Equal("Approved", Assert.Single(replay.Cancellations).Status);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => scope.CreatePlatformController(
            new InternalLabOperationsProvider(scope.DbContext), Guid.NewGuid().ToString("N"))
            .DecidePhaseCancellation(fixture.OrderId, request.Id, decision, default));
        scope.DbContext.ChangeTracker.Clear();
        Assert.Equal(receiptCount + 1, await scope.DbContext.LabProviderCommandReceipts.CountAsync(value => value.AuthorizationId == authorization.AuthorizationId));
    }

    [PostgreSqlReferenceFact]
    public async Task AcceptedScopeRejectsChangeQuoteWithoutExplicitAdditionalScope()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync("ORD-03 change quote gap", 2);
        var accepted = await scope.AcceptQuoteAsync(fixture);
        var quote = await scope.DbContext.LabServiceQuotes.AsNoTracking().SingleAsync(value => value.Id == fixture.QuoteId);
        var snapshot = (quote.LinesJson, quote.Total, quote.AcceptedAt);
        var error = await Assert.ThrowsAsync<OrderManagementException>(() => scope.AttemptChangeQuote(fixture.OrderId, accepted.Version));
        Assert.Equal("change_scope_invalid", error.ErrorCode);
        scope.DbContext.ChangeTracker.Clear();
        quote = await scope.DbContext.LabServiceQuotes.AsNoTracking().SingleAsync(value => value.Id == fixture.QuoteId);
        Assert.Equal(snapshot, (quote.LinesJson, quote.Total, quote.AcceptedAt));
        Assert.Equal(1, await scope.DbContext.LabServiceQuotes.CountAsync(value => value.LabServiceOrderId == fixture.OrderId));
        Assert.Empty(await scope.DbContext.CommercialLabAuthorizations.Where(value => value.CommercialOrderId == fixture.OrderId).ToListAsync());
    }

    private sealed partial class HandoffTestScope
    {
        public Task<LabServiceOrderDto> AttemptChangeQuote(Guid orderId, long version)
            => CreatePlatformController(new InternalLabOperationsProvider(DbContext), Guid.NewGuid().ToString("N"))
                .IssueQuote(orderId, new(version, [new(Guid.NewGuid(), "PSeq Lab Service", 3, 100m)], 0, "USD", null, "Change"), default);

    }
}
