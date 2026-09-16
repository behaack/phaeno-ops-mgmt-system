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
    public async Task PartialCancellationPreservesReceivedWorkQuoteAndSelectedOutcomeWithReplayProtection()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync("partial-cancellation", 2);
        var accepted = await scope.AcceptQuoteAsync(fixture);
        var first = await scope.AddReferenceSampleAsync(fixture.OrderId, accepted.Version);
        var second = await scope.AddReferenceSampleAsync(fixture.OrderId, first.Version);
        var authorized = await scope.FinalizeSampleRosterAsync(fixture.OrderId, second.Version, new InternalLabOperationsProvider(scope.DbContext));
        await scope.SeparateSyntheticShipmentContents(fixture.OrderId);
        var authorization = await scope.DbContext.CommercialLabAuthorizations.SingleAsync(value => value.CommercialOrderId == fixture.OrderId);
        var specimens = await scope.DbContext.LabSpecimens.Where(value => value.LabWorkOrderId == authorization.LabWorkOrderId).OrderBy(value => value.Id).ToArrayAsync();
        specimens[0].RecordReceipt(DateTime.UtcNow, "Intact", "SIMULATED receipt");
        await scope.DbContext.SaveChangesAsync();
        var request = await scope.RequestCancellationAsync(fixture.OrderId, authorized.Version);
        var quote = await scope.DbContext.LabServiceQuotes.AsNoTracking().SingleAsync(value => value.Id == fixture.QuoteId);
        var snapshot = (quote.LinesJson, quote.Total, quote.AcceptedAt);
        var receiptCount = await scope.DbContext.LabProviderCommandReceipts.CountAsync(value => value.AuthorizationId == authorization.AuthorizationId);
        // Commercial still shows Expected for the received specimen: authoritative Lab read must veto it.
        foreach (var ids in new[] { Array.Empty<Guid>(), new[] { Guid.NewGuid() }, new[] { specimens[0].SubmittedSpecimenId },
            new[] { specimens[1].SubmittedSpecimenId, specimens[1].SubmittedSpecimenId }, specimens.Select(value => value.SubmittedSpecimenId).ToArray() })
        {
            scope.DbContext.ChangeTracker.Clear();
            await Assert.ThrowsAsync<OrderManagementException>(() => scope.DecidePartial(fixture.OrderId, request.Id, request.OrderVersion, ids));
            scope.DbContext.ChangeTracker.Clear();
            Assert.Equal(CancellationRequestStatus.Pending, (await scope.DbContext.OrderCancellationRequests.SingleAsync(value => value.Id == request.Id)).Status);
            Assert.Equal(receiptCount, await scope.DbContext.LabProviderCommandReceipts.CountAsync(value => value.AuthorizationId == authorization.AuthorizationId));
            Assert.Equal(LabSpecimenIntakeDisposition.AwaitingReceipt, (await scope.DbContext.LabSpecimens.SingleAsync(value => value.Id == specimens[1].Id)).IntakeDisposition);
        }
        scope.DbContext.ChangeTracker.Clear();
        var result = await scope.DecidePartial(fixture.OrderId, request.Id, request.OrderVersion, [specimens[1].SubmittedSpecimenId]);
        Assert.Equal("PlacedAwaitingSamples", result.Status);
        scope.DbContext.ChangeTracker.Clear();
        var order = await scope.DbContext.LabServiceOrders.Include(value => value.Samples).SingleAsync(value => value.Id == fixture.OrderId);
        Assert.Equal(LabSampleStatus.Cancelled, order.Samples.Single(value => value.Id == specimens[1].SubmittedSpecimenId).Status);
        Assert.NotEqual(LabSampleStatus.Cancelled, order.Samples.Single(value => value.Id == specimens[0].SubmittedSpecimenId).Status);
        Assert.Equal(CommercialLabAuthorizationStatus.Accepted, (await scope.DbContext.CommercialLabAuthorizations.SingleAsync(value => value.Id == authorization.Id)).Status);
        Assert.Equal(LabSpecimenIntakeDisposition.Cancelled, (await scope.DbContext.LabSpecimens.SingleAsync(value => value.Id == specimens[1].Id)).IntakeDisposition);
        Assert.NotNull((await scope.DbContext.LabSpecimens.SingleAsync(value => value.Id == specimens[0].Id)).ReceivedAtUtc);
        quote = await scope.DbContext.LabServiceQuotes.SingleAsync(value => value.Id == fixture.QuoteId);
        Assert.Equal(snapshot, (quote.LinesJson, quote.Total, quote.AcceptedAt));
        Assert.All(await scope.DbContext.SampleShipments.Include(value => value.Items).Where(value => value.AuthorizationSourceId == fixture.OrderId).ToListAsync(),
            shipment => Assert.Equal(shipment.Items.All(value => value.SubmittedSpecimenId == specimens[1].SubmittedSpecimenId), shipment.Status == SampleShipmentStatus.Cancelled));
        Assert.Equal(1, await scope.DbContext.OrderStatusEvents.CountAsync(value => value.ChildRecordId == specimens[1].SubmittedSpecimenId && value.ToStatus == "Cancelled"));
        Assert.Equal(1, await scope.DbContext.OrderNotifications.CountAsync(value => value.WorkflowId == fixture.OrderId && value.EventType == "lab-cancellation-partially-approved"));
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => scope.DecidePartial(fixture.OrderId, request.Id, request.OrderVersion, [specimens[1].SubmittedSpecimenId]));
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
        public async Task SeparateSyntheticShipmentContents(Guid orderId)
        {
            // Arrange the same unscanned one-specimen containers produced by packing; no physical dispatch is claimed.
            var source = await DbContext.SampleShipments.Include(value => value.Items).ThenInclude(value => value.TubeSlots)
                .SingleAsync(value => value.AuthorizationSourceId == orderId);
            foreach (var original in source.Items.ToArray())
            {
                var shipment = new SampleShipment($"SHP-{Guid.NewGuid():N}"[..24], source.OrganizationId, source.DepartmentId,
                    source.AuthorizationSource, source.AuthorizationSourceId, source.AuthorizationReference, source.AuthorizationName,
                    source.LabWorkOrderId, source.DestinationId);
                shipment.MarkPackingPool();
                var target = new SampleShipmentItem(shipment.Id, original.SubmittedSpecimenId, original.SampleTypeDefinitionId,
                    original.CustomerSampleId, original.SampleName, original.Quantity, original.QuantityUnit);
                foreach (var slot in original.TubeSlots.ToArray())
                { original.TubeSlots.Remove(slot); slot.MoveTo(target.Id); target.TubeSlots.Add(slot); }
                shipment.Items.Add(target); DbContext.SampleShipments.Add(shipment);
                source.Items.Remove(original); DbContext.SampleShipmentItems.Remove(original);
            }
            source.Cancel(); await DbContext.SaveChangesAsync();
        }

        public Task<LabServiceOrderDto> AttemptChangeQuote(Guid orderId, long version)
            => CreatePlatformController(new InternalLabOperationsProvider(DbContext), Guid.NewGuid().ToString("N"))
                .IssueQuote(orderId, new(version, [new(Guid.NewGuid(), "PSeq Lab Service", 3, 100m)], 0, "USD", null, "Change"), default);

        public Task<LabServiceOrderDto> DecidePartial(Guid orderId, Guid requestId, long version, IReadOnlyList<Guid> ids)
            => CreatePlatformController(new InternalLabOperationsProvider(DbContext), Guid.NewGuid().ToString("N"))
                .DecideCancellation(orderId, requestId, new(version, "PartiallyApproved", "Cancel only the selected unreceived samples.", SampleIds: ids), default);
    }
}
