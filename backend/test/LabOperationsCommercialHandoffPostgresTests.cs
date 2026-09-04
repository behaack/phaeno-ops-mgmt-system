namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Commercial.LabOperations.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Relationships.Application;
using PSeq.Operations.Commercial.Relationships.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

[Collection(PostgreSqlReferenceCollection.Name)]
public class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task AuthorizedPhaenoUserInitiatesCustomerOrderBeforeCustomerAdministratorActivation()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        await scope.DbContext.OrganizationMemberships
            .Where(value => value.OrganizationId == scope.CustomerOrganization.Id)
            .ExecuteDeleteAsync();

        var response = await scope.InitiateCustomerOrderAsync();

        Assert.Equal(scope.CustomerOrganization.Id, response.OrganizationId);
        Assert.Equal(LabServiceOrderStatus.QuoteInPreparation.ToString(), response.Status);
        Assert.Equal(3, response.RequestedSpecimenCount);
        var sourceGroups = Assert.IsAssignableFrom<IReadOnlyList<LabServiceSourceGroupDto>>(response.SourceGroups);
        Assert.Equal(2, sourceGroups.Count);
        Assert.Empty(response.Samples);
        var requestRevision = Assert.Single(response.RequestRevisions ?? []);
        Assert.Equal(scope.PlatformUser.Id, requestRevision.SubmittedByUserId);

        scope.DbContext.ChangeTracker.Clear();
        var persisted = await scope.DbContext.LabServiceOrders.AsNoTracking()
            .Include(order => order.SourceGroups)
            .Include(order => order.Revisions)
            .SingleAsync(order => order.Id == response.Id);
        Assert.Equal(LabServiceOrderStatus.QuoteInPreparation, persisted.Status);
        Assert.Equal(3, persisted.SourceGroups.Sum(group => group.SpecimenCount));
        Assert.Single(persisted.Revisions);
        Assert.Equal(3, await scope.DbContext.OrderStatusEvents
            .CountAsync(item => item.WorkflowId == persisted.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task QuoteIssueStillRequiresCustomerAdministratorAfterPricingStarts()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        await scope.DbContext.OrganizationMemberships
            .Where(value => value.OrganizationId == scope.CustomerOrganization.Id)
            .ExecuteDeleteAsync();
        var order = await scope.InitiateCustomerOrderAsync();
        var catalogItem = await scope.DbContext.QboCatalogItems.AsNoTracking()
            .SingleAsync(item => item.IsActive
                && item.ExternalItemId == OrderServiceKeys.PSeqLabService
                && item.SalesUnit == OrderSalesUnits.Specimen);

        var exception = await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.IssueQuoteAsync(order, catalogItem, derivedReadiness: true));

        Assert.Equal("operational_readiness_incomplete", exception.ErrorCode);
        var blockers = Assert.IsAssignableFrom<IReadOnlyList<OperationalReadinessBlocker>>(exception.Details);
        Assert.Contains(blockers, blocker =>
            blocker.Code == OperationalReadinessBlockerCode.ActiveCustomerAdministratorRequired);
    }

    [PostgreSqlReferenceFact]
    public async Task ApprovedCrmHandoffStartsOneOrderAndBecomesAppliedAtomically()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var sourceRequest = await scope.CreateApprovedCrmOrderHandoffAsync();

        var response = await scope.InitiateCustomerOrderAsync(sourceRequestId: sourceRequest.Id);

        Assert.Equal(sourceRequest.Id, response.CommercialSource?.RequestId);
        Assert.NotNull(response.CommercialSource?.HandoffId);
        scope.DbContext.ChangeTracker.Clear();
        var persistedOrder = await scope.DbContext.LabServiceOrders.AsNoTracking()
            .SingleAsync(value => value.Id == response.Id);
        Assert.Equal(sourceRequest.Id, persistedOrder.SourceRequestId);
        var persistedRequest = await scope.DbContext.PortalIntegrationRequests.AsNoTracking()
            .SingleAsync(value => value.Id == sourceRequest.Id);
        Assert.Equal(PortalIntegrationRequestStatus.Applied, persistedRequest.Status);
        Assert.Contains(response.OrderNumber, persistedRequest.ApplicationNotes);
        Assert.Single(await scope.DbContext.CrmActivities.AsNoTracking()
            .Where(value => value.Subject == "Customer order started" && value.Body!.Contains(response.OrderNumber))
            .ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task CrmHandoffCannotStartASecondOrder()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var sourceRequest = await scope.CreateApprovedCrmOrderHandoffAsync();
        await scope.InitiateCustomerOrderAsync(sourceRequestId: sourceRequest.Id);
        scope.DbContext.ChangeTracker.Clear();

        var exception = await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.InitiateCustomerOrderAsync(sourceRequestId: sourceRequest.Id));

        Assert.Equal("crm_handoff_order_exists", exception.ErrorCode);
        Assert.Equal(1, await scope.DbContext.LabServiceOrders.AsNoTracking()
            .CountAsync(value => value.SourceRequestId == sourceRequest.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task ApprovedHandoffLinkedToOpenOpportunityCannotStartOrder()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var sourceRequest = await scope.CreateApprovedCrmOrderHandoffAsync(CrmPipelineStageCategory.Open);

        var exception = await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.InitiateCustomerOrderAsync(sourceRequestId: sourceRequest.Id));

        Assert.Equal("crm_handoff_opportunity_not_won", exception.ErrorCode);
        Assert.False(await scope.DbContext.LabServiceOrders.AsNoTracking()
            .AnyAsync(value => value.SourceRequestId == sourceRequest.Id));
        Assert.Equal(PortalIntegrationRequestStatus.Approved, await scope.DbContext.PortalIntegrationRequests.AsNoTracking()
            .Where(value => value.Id == sourceRequest.Id)
            .Select(value => value.Status)
            .SingleAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task PhaenoInitiationRequiresNoPhiConfirmation()
    {
        await using var scope = await HandoffTestScope.CreateAsync();

        var exception = await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.InitiateCustomerOrderAsync(prohibitedDataConfirmed: false));

        Assert.Equal("prohibited_data_confirmation_required", exception.ErrorCode);
        Assert.Empty(await scope.DbContext.LabServiceOrders
            .Where(order => order.OrganizationId == scope.CustomerOrganization.Id)
            .ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task PhaenoInitiationRequiresCurrentOrderingAuthorization()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        await scope.DbContext.OrganizationServiceEntitlements
            .Where(item => item.OrganizationId == scope.CustomerOrganization.Id
                && item.Service == PortalService.PSeqLabService)
            .ExecuteDeleteAsync();

        var exception = await Assert.ThrowsAsync<OrderManagementException>(
            () => scope.InitiateCustomerOrderAsync());

        Assert.Equal("lab_service_ordering_not_authorized", exception.ErrorCode);
        Assert.Empty(await scope.DbContext.LabServiceOrders
            .Where(order => order.OrganizationId == scope.CustomerOrganization.Id)
            .ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task PhaenoInitiationIsSilentUntilQuoteIssueThenFansOutToAdministrators()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var order = await scope.InitiateCustomerOrderAsync();

        Assert.Empty(await scope.DbContext.OrderNotifications
            .Where(item => item.WorkflowId == order.Id)
            .ToListAsync());

        var catalogItem = await scope.DbContext.QboCatalogItems.AsNoTracking()
            .SingleAsync(item => item.IsActive
                && item.ExternalItemId == OrderServiceKeys.PSeqLabService
                && item.SalesUnit == OrderSalesUnits.Specimen);
        await scope.IssueQuoteAsync(order, catalogItem);

        var notice = await scope.DbContext.OrderNotifications.AsNoTracking()
            .SingleAsync(item => item.WorkflowId == order.Id);
        Assert.Equal("lab-quote-issued", notice.EventType);
        Assert.Null(notice.RecipientUserId);
    }

    [PostgreSqlReferenceFact]
    public async Task QuoteIssueDoesNotRequireQuickBooksOrACompletedBillingProfile()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var order = await scope.InitiateCustomerOrderAsync();
        var catalogItem = await scope.DbContext.QboCatalogItems.AsNoTracking()
            .SingleAsync(item => item.IsActive
                && item.ExternalItemId == OrderServiceKeys.PSeqLabService
                && item.SalesUnit == OrderSalesUnits.Specimen);

        Assert.False(await scope.DbContext.OrganizationCommercialProfiles.AsNoTracking()
            .AnyAsync(item => item.OrganizationId == scope.CustomerOrganization.Id));

        var response = await scope.IssueQuoteAsync(order, catalogItem);

        var quote = Assert.Single(response.Quotes);
        Assert.Equal(LabServiceOrderStatus.QuoteIssued.ToString(), response.Status);
        Assert.Equal(QuoteStatus.Issued.ToString(), quote.Status);
        Assert.Equal(0m, quote.Tax);
        Assert.Empty(await scope.DbContext.CommercialDocumentLinks.AsNoTracking()
            .Where(item => item.WorkflowId == order.Id)
            .ToListAsync());
        Assert.Empty(await scope.DbContext.OrderOutboxMessages.AsNoTracking()
            .Where(item => item.WorkflowId == order.Id
                && item.Operation == IntegrationOperation.CreateEstimate)
            .ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task PhaenoInitiationReplaysOneAtomicIdempotentResult()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var idempotencyKey = Guid.NewGuid().ToString("N");
        var customerReference = $"Phaeno initiated {Guid.NewGuid():N}";

        var first = await scope.InitiateCustomerOrderAsync(
            idempotencyKey: idempotencyKey,
            customerReference: customerReference);
        scope.DbContext.ChangeTracker.Clear();
        var replay = await scope.InitiateCustomerOrderAsync(
            idempotencyKey: idempotencyKey,
            customerReference: customerReference);

        Assert.Equal(first.Id, replay.Id);
        Assert.Equal(first.Version, replay.Version);
        Assert.Equal(1, await scope.DbContext.LabServiceOrders
            .CountAsync(item => item.OrganizationId == scope.CustomerOrganization.Id
                && item.CustomerReference == customerReference));
        Assert.Equal(1, await scope.DbContext.OrderIdempotencyRecords
            .CountAsync(item => item.ActorUserId == scope.PlatformUser.Id
                && item.IdempotencyKey == idempotencyKey));
    }

    [PostgreSqlReferenceFact]
    public async Task SharedIdempotencyBoundaryReplaysStoredStatusAndRejectsMismatchedPayload()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var service = new OrderIdempotencyService(scope.DbContext);
        var key = Guid.NewGuid().ToString("N");
        var calls = 0;
        var payload = new { Value = "same-request" };

        var first = await service.ExecuteAsync(
            scope.PlatformUser.Id,
            "reference:idempotency",
            key,
            payload,
            _ =>
            {
                calls++;
                return Task.FromResult(new IdempotencyProbeResponse(Guid.NewGuid()));
            },
            StatusCodes.Status201Created,
            CancellationToken.None);
        scope.DbContext.ChangeTracker.Clear();
        var replay = await service.ExecuteAsync(
            scope.PlatformUser.Id,
            "reference:idempotency",
            key,
            payload,
            _ =>
            {
                calls++;
                return Task.FromResult(new IdempotencyProbeResponse(Guid.NewGuid()));
            },
            cancellationToken: CancellationToken.None);

        Assert.Equal(1, calls);
        Assert.False(first.IsReplay);
        Assert.True(replay.IsReplay);
        Assert.Equal(StatusCodes.Status201Created, replay.StatusCode);
        Assert.Equal(first.Response, replay.Response);
        var exception = await Assert.ThrowsAsync<OrderManagementException>(() =>
            service.ExecuteAsync(
                scope.PlatformUser.Id,
                "reference:idempotency",
                key,
                new { Value = "different-request" },
                _ => Task.FromResult(new IdempotencyProbeResponse(Guid.NewGuid())),
                cancellationToken: CancellationToken.None));
        Assert.Equal("idempotency_key_reused", exception.ErrorCode);
    }

    [PostgreSqlReferenceFact]
    public async Task SharedIdempotencyBoundaryRollsBackMutationSavedBeforeFailure()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var service = new OrderIdempotencyService(scope.DbContext);
        var key = Guid.NewGuid().ToString("N");
        var externalItemId = $"rollback-{Guid.NewGuid():N}";

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ExecuteAsync<IdempotencyProbeResponse>(
                scope.PlatformUser.Id,
                "reference:idempotency-rollback",
                key,
                new { externalItemId },
                async cancellationToken =>
                {
                    scope.DbContext.QboCatalogItems.Add(new QboCatalogItem(
                        externalItemId,
                        "Rollback probe",
                        "Must not survive the failed command.",
                        "item",
                        1m,
                        "USD",
                        isActive: true,
                        DateTime.UtcNow));
                    await scope.DbContext.SaveChangesAsync(cancellationToken);
                    throw new InvalidOperationException("Reference interruption after the business save.");
                },
                cancellationToken: CancellationToken.None));

        scope.DbContext.ChangeTracker.Clear();
        Assert.False(await scope.DbContext.QboCatalogItems
            .AnyAsync(item => item.ExternalItemId == externalItemId));
        Assert.False(await scope.DbContext.OrderIdempotencyRecords
            .AnyAsync(item => item.ActorUserId == scope.PlatformUser.Id
                && item.Scope == "reference:idempotency-rollback"
                && item.IdempotencyKey == key));
    }

    [PostgreSqlReferenceFact]
    public async Task UnrelatedSpecimenCatalogItemCannotSatisfyLabServicePricing()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var order = await scope.InitiateCustomerOrderAsync();
        var unrelatedItem = await scope.CreateCatalogItemAsync(
            $"handling-fee-{Guid.NewGuid():N}",
            "Specimen handling fee",
            OrderSalesUnits.Specimen);

        var exception = await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.IssueQuoteAsync(order, unrelatedItem));

        Assert.Equal("quote_lab_service_line_required", exception.ErrorCode);
        scope.DbContext.ChangeTracker.Clear();
        Assert.Empty(await scope.DbContext.LabServiceQuotes
            .Where(item => item.LabServiceOrderId == order.Id)
            .ToListAsync());
        Assert.Empty(await scope.DbContext.CommercialDocumentLinks
            .Where(item => item.WorkflowId == order.Id)
            .ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task QuoteAcceptanceOpensSampleRosterWithoutCreatingLabWork()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync();

        var response = await scope.AcceptQuoteAsync(fixture);

        scope.DbContext.ChangeTracker.Clear();
        Assert.Equal(LabServiceOrderStatus.PlacedAwaitingSamples.ToString(), response.Status);
        Assert.True(response.CanEditSamples);
        Assert.Empty(response.Samples);
        Assert.Null(response.SampleRosterFinalizedAt);
        Assert.Empty(await scope.DbContext.CommercialLabAuthorizations
            .Where(item => item.CommercialOrderId == fixture.OrderId)
            .ToListAsync());
        Assert.Empty(await scope.DbContext.LabWorkOrders
            .Where(item => item.AuthorizationSourceId == fixture.OrderId)
            .ToListAsync());
        Assert.Empty(await scope.DbContext.SampleShipments
            .Where(item => item.AuthorizationSourceId == fixture.OrderId)
            .ToListAsync());
        var persistedOrder = await scope.DbContext.LabServiceOrders.AsNoTracking()
            .SingleAsync(item => item.Id == fixture.OrderId);
        using var placement = JsonDocument.Parse(persistedOrder.PlacementSnapshotJson!);
        Assert.True(placement.RootElement.GetProperty("serviceEntitlementId").TryGetGuid(out _));
        Assert.True(placement.RootElement.GetProperty("serviceCatalogItemId").TryGetGuid(out _));
        var acceptedNotice = await scope.DbContext.OrderNotifications.AsNoTracking()
            .SingleAsync(item => item.WorkflowId == fixture.OrderId
                && item.EventType == "lab-quote-accepted");
        Assert.Equal(scope.CustomerUser.Id, acceptedNotice.RecipientUserId);
    }

    [PostgreSqlReferenceFact]
    public async Task SampleRosterFinalizationAtomicallyCreatesCommercialAuthorizationLabWorkAndShipping()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync();

        var response = await scope.AuthorizeSampleRosterAsync(
            fixture,
            new InternalLabOperationsProvider(scope.DbContext));

        scope.DbContext.ChangeTracker.Clear();
        var authorization = await scope.DbContext.CommercialLabAuthorizations
            .AsNoTracking()
            .SingleAsync(item => item.CommercialOrderId == fixture.OrderId);
        var work = await scope.DbContext.LabWorkOrders
            .AsNoTracking()
            .SingleAsync(item => item.AuthorizationId == authorization.AuthorizationId);
        var shipment = await scope.DbContext.SampleShipments
            .AsNoTracking()
            .SingleAsync(item => item.AuthorizationSourceId == fixture.OrderId);
        Assert.Equal(LabServiceOrderStatus.PlacedAwaitingSamples.ToString(), response.Status);
        Assert.NotNull(response.SampleRosterFinalizedAt);
        Assert.False(response.CanEditSamples);
        Assert.Equal(CommercialLabAuthorizationStatus.Accepted, authorization.Status);
        Assert.Equal(work.Id, authorization.LabWorkOrderId);
        Assert.Equal(scope.CustomerOrganization.Id, work.SubmittingOrganizationId);
        Assert.Equal(1, await scope.DbContext.LabSpecimens
            .CountAsync(item => item.LabWorkOrderId == work.Id));
        Assert.Equal(work.Id, shipment.LabWorkOrderId);
        Assert.Equal(1, await scope.DbContext.SampleShipmentItems
            .CountAsync(item => item.SampleShipmentId == shipment.Id));
        Assert.Equal(1, await scope.DbContext.LabOperationsOutboxEvents
            .CountAsync(item => item.AuthorizationId == authorization.AuthorizationId));
        Assert.Equal(1, await scope.DbContext.LabProviderCommandReceipts
            .CountAsync(item => item.AuthorizationId == authorization.AuthorizationId));
    }

    [PostgreSqlReferenceFact]
    public async Task SampleRosterFinalizationReplaysWithoutDuplicatingAuthorizationOrShipping()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync();
        var accepted = await scope.AcceptQuoteAsync(fixture);
        var roster = await scope.AddReferenceSampleAsync(fixture.OrderId, accepted.Version);
        var idempotencyKey = Guid.NewGuid().ToString("N");

        var first = await scope.FinalizeSampleRosterAsync(
            fixture.OrderId,
            roster.Version,
            new InternalLabOperationsProvider(scope.DbContext),
            idempotencyKey);
        scope.DbContext.ChangeTracker.Clear();
        var replay = await scope.FinalizeSampleRosterAsync(
            fixture.OrderId,
            roster.Version,
            new InternalLabOperationsProvider(scope.DbContext),
            idempotencyKey);

        Assert.Equal(first.Id, replay.Id);
        Assert.Equal(first.Version, replay.Version);
        Assert.Equal(first.SampleRosterFinalizedAt, replay.SampleRosterFinalizedAt);
        Assert.Equal(1, await scope.DbContext.CommercialLabAuthorizations
            .CountAsync(item => item.CommercialOrderId == fixture.OrderId));
        Assert.Equal(1, await scope.DbContext.LabWorkOrders
            .CountAsync(item => item.AuthorizationSourceId == fixture.OrderId));
        Assert.Equal(1, await scope.DbContext.SampleShipments
            .CountAsync(item => item.AuthorizationSourceId == fixture.OrderId));
        Assert.Equal(1, await scope.DbContext.OrderIdempotencyRecords
            .CountAsync(item => item.ActorUserId == scope.CustomerUser.Id
                && item.Scope == $"lab-order:{fixture.OrderId}:sample-roster:finalize"
                && item.IdempotencyKey == idempotencyKey));
    }

    [PostgreSqlReferenceFact]
    public async Task ProviderRejectionRollsBackAlreadyPersistedCommercialAndLabChanges()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync();
        var accepted = await scope.AcceptQuoteAsync(fixture);
        var roster = await scope.AddReferenceSampleAsync(fixture.OrderId, accepted.Version);

        var exception = await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.FinalizeSampleRosterAsync(
                fixture.OrderId,
                roster.Version,
                new PersistingRejectingProvider(scope.DbContext)));

        Assert.Equal("lab_authorization_failed", exception.ErrorCode);
        scope.DbContext.ChangeTracker.Clear();
        var order = await scope.DbContext.LabServiceOrders
            .AsNoTracking()
            .SingleAsync(item => item.Id == fixture.OrderId);
        var quote = await scope.DbContext.LabServiceQuotes
            .AsNoTracking()
            .SingleAsync(item => item.Id == fixture.QuoteId);
        Assert.Equal(LabServiceOrderStatus.PlacedAwaitingSamples, order.Status);
        Assert.Null(order.SampleRosterFinalizedAt);
        Assert.Equal(QuoteStatus.Accepted, quote.Status);
        Assert.Single(await scope.DbContext.LabSamples
            .Where(item => item.LabServiceOrderId == fixture.OrderId)
            .ToListAsync());
        Assert.Empty(await scope.DbContext.CommercialLabAuthorizations
            .Where(item => item.CommercialOrderId == fixture.OrderId)
            .ToListAsync());
        Assert.Empty(await scope.DbContext.LabWorkOrders
            .Where(item => item.AuthorizationSourceId == fixture.OrderId)
            .ToListAsync());
        Assert.Empty(await scope.DbContext.SampleShipments
            .Where(item => item.AuthorizationSourceId == fixture.OrderId)
            .ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task ApprovedCancellationCommitsOnlyAfterLabAcceptsTheHandoff()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync();
        var authorized = await scope.AuthorizeSampleRosterAsync(
            fixture,
            new InternalLabOperationsProvider(scope.DbContext));
        var cancellation = await scope.RequestCancellationAsync(
            fixture.OrderId,
            authorized.Version);

        await scope.DecideCancellationAsync(
            fixture.OrderId,
            cancellation.Id,
            cancellation.OrderVersion,
            new InternalLabOperationsProvider(scope.DbContext));

        scope.DbContext.ChangeTracker.Clear();
        var order = await scope.DbContext.LabServiceOrders
            .AsNoTracking()
            .SingleAsync(item => item.Id == fixture.OrderId);
        var request = await scope.DbContext.OrderCancellationRequests
            .AsNoTracking()
            .SingleAsync(item => item.Id == cancellation.Id);
        var authorization = await scope.DbContext.CommercialLabAuthorizations
            .AsNoTracking()
            .SingleAsync(item => item.CommercialOrderId == fixture.OrderId);
        var work = await scope.DbContext.LabWorkOrders
            .AsNoTracking()
            .SingleAsync(item => item.AuthorizationId == authorization.AuthorizationId);
        Assert.Equal(LabServiceOrderStatus.Cancelled, order.Status);
        Assert.Equal(CancellationRequestStatus.Approved, request.Status);
        Assert.Equal(CommercialLabAuthorizationStatus.Cancelled, authorization.Status);
        Assert.Equal(LabWorkOrderStatus.Cancelled, work.Status);
        Assert.All(
            await scope.DbContext.LabSpecimens
                .AsNoTracking()
                .Where(item => item.LabWorkOrderId == work.Id)
                .ToListAsync(),
            specimen => Assert.Equal(LabSpecimenIntakeDisposition.Cancelled, specimen.IntakeDisposition));
    }

    [PostgreSqlReferenceFact]
    public async Task StartedLabWorkVetoesCommercialCancellationWithoutPartialDecision()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync();
        var authorized = await scope.AuthorizeSampleRosterAsync(
            fixture,
            new InternalLabOperationsProvider(scope.DbContext));
        scope.DbContext.ChangeTracker.Clear();
        var authorization = await scope.DbContext.CommercialLabAuthorizations
            .SingleAsync(item => item.CommercialOrderId == fixture.OrderId);
        var specimen = await scope.DbContext.LabSpecimens
            .SingleAsync(item => item.LabWorkOrderId == authorization.LabWorkOrderId);
        specimen.RecordReceipt(DateTime.UtcNow, "Received intact", "Reference intake");
        await scope.DbContext.SaveChangesAsync();
        var receiptCountBefore = await scope.DbContext.LabProviderCommandReceipts
            .CountAsync(item => item.AuthorizationId == authorization.AuthorizationId);
        var cancellation = await scope.RequestCancellationAsync(
            fixture.OrderId,
            authorized.Version);

        var exception = await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.DecideCancellationAsync(
                fixture.OrderId,
                cancellation.Id,
                cancellation.OrderVersion,
                new InternalLabOperationsProvider(scope.DbContext)));

        Assert.Equal("lab_cancellation_requires_review", exception.ErrorCode);
        scope.DbContext.ChangeTracker.Clear();
        var order = await scope.DbContext.LabServiceOrders
            .AsNoTracking()
            .SingleAsync(item => item.Id == fixture.OrderId);
        var request = await scope.DbContext.OrderCancellationRequests
            .AsNoTracking()
            .SingleAsync(item => item.Id == cancellation.Id);
        authorization = await scope.DbContext.CommercialLabAuthorizations
            .AsNoTracking()
            .SingleAsync(item => item.CommercialOrderId == fixture.OrderId);
        var work = await scope.DbContext.LabWorkOrders
            .AsNoTracking()
            .SingleAsync(item => item.AuthorizationId == authorization.AuthorizationId);
        Assert.Equal(LabServiceOrderStatus.CancellationRequested, order.Status);
        Assert.Equal(CancellationRequestStatus.Pending, request.Status);
        Assert.Equal(CommercialLabAuthorizationStatus.Accepted, authorization.Status);
        Assert.NotEqual(LabWorkOrderStatus.Cancelled, work.Status);
        Assert.Equal(receiptCountBefore, await scope.DbContext.LabProviderCommandReceipts
            .CountAsync(item => item.AuthorizationId == authorization.AuthorizationId));
    }

    [PostgreSqlReferenceFact]
    public async Task AuthorizedOrderCompletesTheDatabaseBackedLabOperatorJourney()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync();
        await scope.AuthorizeSampleRosterAsync(
            fixture,
            new InternalLabOperationsProvider(scope.DbContext));

        scope.DbContext.ChangeTracker.Clear();
        var authorization = await scope.DbContext.CommercialLabAuthorizations
            .AsNoTracking()
            .SingleAsync(item => item.CommercialOrderId == fixture.OrderId);
        var workOrderId = authorization.LabWorkOrderId;
        Assert.NotNull(workOrderId);

        await using var journey = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var staff = await scope.CreateLabStaffAsync();
            var administrator = scope.CreatePlatformLabController();
            foreach (var role in new[]
            {
                LabRole.Operator,
                LabRole.Supervisor,
                LabRole.ProtocolAdministrator,
                LabRole.ScientificReviewer
            })
            {
                var assignment = await administrator.SetRole(
                    staff.User.Id,
                    role.ToString(),
                    new SetLabRoleRequest(true, null),
                    CancellationToken.None);
                Assert.True(assignment.IsActive);
            }
            var protocolApprover = await scope.CreateLabStaffAsync();
            await administrator.SetRole(
                protocolApprover.User.Id,
                LabRole.ProtocolAdministrator.ToString(),
                new SetLabRoleRequest(true, null),
                CancellationToken.None);

            var lab = scope.CreateLabController(staff.Identity);
            var approvalLab = scope.CreateLabController(protocolApprover.Identity);
            var protocolName = $"Reference library preparation {Guid.NewGuid():N}";
            var protocol = await lab.CreateProtocol(
                new CreateProtocolRequest(
                    protocolName,
                    "Database-backed verification protocol."),
                CancellationToken.None);
            Assert.Equal(
                LabIdentifierService.CreateProtocolKey(protocolName, Array.Empty<string>()),
                protocol.Key);
            var immutableProtocolKey = protocol.Key;
            protocol = await lab.UpdateProtocol(
                protocol.Id,
                new UpdateProtocolRequest(
                    $"{protocolName} updated",
                    "Updated database-backed verification protocol.",
                    protocol.Version),
                CancellationToken.None);
            Assert.Equal(immutableProtocolKey, protocol.Key);
            Assert.Equal($"{protocolName} updated", protocol.Name);
            Assert.Equal("Updated database-backed verification protocol.", protocol.Description);
            protocol = await lab.CreateProtocolVersion(
                protocol.Id,
                new CreateProtocolVersionRequest(
                    """{"steps":[{"key":"prepare-library","required":true}]}""",
                    protocol.Version),
                CancellationToken.None);
            var protocolVersion = Assert.Single(protocol.Versions);
            var duplicateCandidate = await Assert.ThrowsAsync<OrderManagementException>(() =>
                lab.CreateProtocolVersion(
                    protocol.Id,
                    new CreateProtocolVersionRequest(
                        """{"steps":[{"key":"parallel-draft","required":true}]}""",
                        protocol.Version),
                    CancellationToken.None));
            Assert.Equal("protocol_candidate_exists", duplicateCandidate.ErrorCode);
            protocol = await lab.UpdateProtocolVersion(
                protocolVersion.Id,
                new UpdateProtocolVersionRequest(
                    """{"steps":[{"key":"prepare-library-updated","required":true}]}""",
                    protocol.Version),
                CancellationToken.None);
            protocolVersion = Assert.Single(protocol.Versions);
            protocol = await approvalLab.TransitionProtocol(
                protocolVersion.Id,
                new ProtocolTransitionRequest("approve", protocol.Version),
                CancellationToken.None);
            protocolVersion = Assert.Single(protocol.Versions);
            Assert.Equal(LabProtocolStatus.Approved.ToString(), protocolVersion.Status);
            protocol = await lab.CreateProtocolVersion(
                protocol.Id,
                new CreateProtocolVersionRequest(
                    """{"steps":[{"key":"prepare-library-final","required":true}]}""",
                    protocol.Version),
                CancellationToken.None);
            protocolVersion = Assert.Single(
                protocol.Versions,
                item => item.Status == LabProtocolStatus.Draft.ToString());
            protocol = await approvalLab.TransitionProtocol(
                protocolVersion.Id,
                new ProtocolTransitionRequest("approve", protocol.Version),
                CancellationToken.None);
            Assert.Contains(
                protocol.Versions,
                item => item.ProtocolVersion == 1
                    && item.Status == LabProtocolStatus.Retired.ToString());
            protocolVersion = Assert.Single(
                protocol.Versions,
                item => item.Status == LabProtocolStatus.Approved.ToString());
            protocol = await lab.CreateProtocolVersion(
                protocol.Id,
                new CreateProtocolVersionRequest(
                    """{"steps":[{"key":"discarded-change","required":true}]}""",
                    protocol.Version),
                CancellationToken.None);
            var discardedCandidate = Assert.Single(
                protocol.Versions,
                item => item.Status == LabProtocolStatus.Draft.ToString());
            protocol = await lab.TransitionProtocol(
                discardedCandidate.Id,
                new ProtocolTransitionRequest("discard", protocol.Version),
                CancellationToken.None);
            Assert.Contains(
                protocol.Versions,
                item => item.Status == LabProtocolStatus.Discarded.ToString());
            protocolVersion = Assert.Single(
                protocol.Versions,
                item => item.Status == LabProtocolStatus.Approved.ToString());

            var material = await lab.CreateMaterialLot(
                new CreateMaterialLotRequest(
                    LabMaterialLotKind.SupplierLot.ToString(),
                    null,
                    $"Reference preparation kit {Guid.NewGuid():N}",
                    $"lot-{Guid.NewGuid():N}",
                    null,
                    $"Reference supplier {Guid.NewGuid():N}",
                    null,
                    $"Freezer A {Guid.NewGuid():N}",
                    DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(6)),
                    100,
                    "uL",
                    null),
                CancellationToken.None);
            material = await lab.RecordMaterialQc(
                material.Id,
                new MaterialQcRequest(
                    LabQcDisposition.Passed.ToString(),
                    DateOnly.FromDateTime(DateTime.UtcNow),
                    null,
                    """{"inspection":"passed"}""",
                    material.Version),
                CancellationToken.None);

            var equipment = await lab.CreateEquipment(
                new CreateEquipmentRequest(
                    "Reference thermal cycler",
                    "ThermalCycler",
                    "Bench 1",
                    DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)),
                    DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(6))),
                CancellationToken.None);
            Assert.Matches(
                "^PH-EQP-[0-9]{8}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$",
                equipment.AssetCode);

            var work = await lab.WorkOrder(workOrderId.Value, CancellationToken.None);
            var specimen = Assert.Single(work.Specimens);
            work = await lab.ReceiveSpecimen(
                workOrderId.Value,
                specimen.Id,
                new SpecimenReceiptRequest(
                    DateTime.UtcNow,
                    "Received intact and frozen",
                    "Intake freezer",
                    specimen.Version),
                CancellationToken.None);
            specimen = Assert.Single(work.Specimens);

            var accessionNumber = $"ACC-{Guid.NewGuid():N}";
            work = await lab.AccessionSpecimen(
                workOrderId.Value,
                specimen.Id,
                new SpecimenAccessionRequest(
                    accessionNumber,
                    $"Submitted specimen {accessionNumber}",
                    "Intake rack A",
                    25,
                    "uL",
                    DateTime.UtcNow.AddYears(1),
                    specimen.Version),
                CancellationToken.None);
            specimen = Assert.Single(work.Specimens);
            work = await lab.SetSpecimenDisposition(
                workOrderId.Value,
                specimen.Id,
                new SpecimenDispositionRequest(
                    LabSpecimenIntakeDisposition.Accepted.ToString(),
                    null,
                    specimen.Version),
                CancellationToken.None);
            Assert.Equal(LabWorkOrderStatus.Received.ToString(), work.WorkOrder.Status);

            var submittedContainer = Assert.Single(work.Containers);
            Assert.StartsWith("PH-S-", submittedContainer.Barcode);
            Assert.Equal(0, submittedContainer.LabelPrintCount);
            var initialLabel = await lab.ContainerLabel(
                submittedContainer.Id,
                CancellationToken.None);
            Assert.Empty(initialLabel.PrintHistory);
            var initialPrint = await lab.PrintContainerLabel(
                submittedContainer.Id,
                new RecordLabelPrintRequest(
                    "Initial accession label",
                    "Succeeded",
                    null),
                CancellationToken.None);
            submittedContainer = initialPrint.Container;
            Assert.Equal(1, submittedContainer.LabelPrintCount);
            Assert.Single(initialPrint.PrintHistory);
            var reprint = await lab.PrintContainerLabel(
                submittedContainer.Id,
                new RecordLabelPrintRequest(
                    "Original label damaged during handling",
                    "Succeeded",
                    null),
                CancellationToken.None);
            submittedContainer = reprint.Container;
            Assert.Equal(2, submittedContainer.LabelPrintCount);
            var failedPrint = await lab.PrintContainerLabel(
                submittedContainer.Id,
                new RecordLabelPrintRequest(
                    "Replace damaged label",
                    "Failed",
                    "Printer was offline."),
                CancellationToken.None);
            Assert.Equal(2, failedPrint.Container.LabelPrintCount);
            Assert.Equal(3, failedPrint.PrintHistory.Count);
            Assert.Equal("Failed", failedPrint.PrintHistory[0].Outcome);
            Assert.Equal("Printer was offline.", failedPrint.PrintHistory[0].FailureDetails);
            var scannedSubmittedContainer = await lab.ScanContainer(
                $"*{submittedContainer.Barcode.ToLowerInvariant()}*",
                CancellationToken.None);
            Assert.Equal(submittedContainer.Id, scannedSubmittedContainer.Container.Id);
            Assert.Equal(accessionNumber, scannedSubmittedContainer.AccessionNumber);
            var persistedSubmittedContainer = await scope.DbContext.LabContainers
                .AsNoTracking()
                .SingleAsync(item => item.Id == submittedContainer.Id);
            Assert.Equal(staff.User.Id, persistedSubmittedContainer.LastLabelPrintedByUserId);
            Assert.NotNull(persistedSubmittedContainer.LastLabelPrintedAtUtc);

            var libraryContainer = await lab.CreateContainer(
                workOrderId.Value,
                new CreateContainerRequest(
                    specimen.Id,
                    submittedContainer.Id,
                    LabContainerKind.Library.ToString(),
                    "Reference library",
                    "Library rack A",
                    20,
                    "uL",
                    DateTime.UtcNow.AddYears(1)),
                CancellationToken.None);

            var execution = await lab.CreateExecution(
                workOrderId.Value,
                new CreateExecutionRequest(
                    specimen.Id,
                    protocolVersion.Id,
                    staff.User.Id),
                CancellationToken.None);
            execution = await lab.TransitionExecution(
                execution.Id,
                new ExecutionTransitionRequest("start", null, null, execution.Version),
                CancellationToken.None);
            await lab.ConsumeMaterial(
                execution.Id,
                new ConsumeMaterialRequest(
                    material.Id,
                    libraryContainer.Id,
                    10,
                    "uL",
                    material.Version),
                CancellationToken.None);
            await lab.RecordEquipmentUsage(
                execution.Id,
                new RecordEquipmentUsageRequest(
                    equipment.Id,
                    DateTime.UtcNow,
                    "Reference run"),
                CancellationToken.None);
            execution = await lab.TransitionExecution(
                execution.Id,
                new ExecutionTransitionRequest(
                    "complete",
                    """{"yieldNg":125,"status":"passed"}""",
                    null,
                    execution.Version),
                CancellationToken.None);
            Assert.Equal(LabExecutionStatus.Completed.ToString(), execution.Status);

            var library = await lab.CreateLibrary(
                workOrderId.Value,
                new CreateLibraryRequest(
                    specimen.Id,
                    submittedContainer.Id,
                    libraryContainer.Id,
                    execution.Id),
                CancellationToken.None);
            Assert.Equal(libraryContainer.Barcode, library.LibraryKey);
            library = await lab.RecordLibraryQc(
                library.Id,
                new LibraryQcRequest(
                    true,
                    """{"concentrationNgUl":12.5,"status":"passed"}""",
                    library.Version),
                CancellationToken.None);
            var scannedLibrary = await lab.ScanContainer(
                libraryContainer.Barcode,
                CancellationToken.None);
            Assert.Equal(library.Id, scannedLibrary.LabLibraryId);
            Assert.Equal(LabLibraryStatus.QcPassed.ToString(), scannedLibrary.LibraryStatus);

            var batch = await lab.CreateBatch(
                new CreateBatchRequest(
                    "Reference sequencing run",
                    "Reference database-backed journey."),
                CancellationToken.None);
            Assert.Equal("Reference sequencing run", batch.Name);
            Assert.Equal(LabOperationalBatch.ExternalSequencingType, batch.BatchType);
            Assert.Matches(
                "^PH-BAT-[0-9]{8}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$",
                batch.BatchNumber);
            batch = await lab.AddBatchMember(
                batch.Id,
                new AddBatchMemberRequest(workOrderId.Value, library.Id),
                CancellationToken.None);
            var duplicate = await Assert.ThrowsAsync<OrderManagementException>(() =>
                lab.AddBatchMember(
                    batch.Id,
                    new AddBatchMemberRequest(workOrderId.Value, library.Id),
                    CancellationToken.None));
            Assert.Equal("batch_member_duplicate", duplicate.ErrorCode);
            batch = await lab.TransitionBatch(
                batch.Id,
                new BatchTransitionRequest("start", batch.Version, DateTime.UtcNow),
                CancellationToken.None);
            batch = await lab.CreateSendout(
                batch.Id,
                new CreateSendoutRequest(
                    "Reference sequencing provider",
                    $"provider-{Guid.NewGuid():N}",
                    $$"""{"batch":"{{batch.BatchNumber}}","container":"{{libraryContainer.Barcode}}"}""",
                    DateTime.UtcNow.AddDays(10)),
                CancellationToken.None);
            Assert.NotNull(batch.SendoutId);
            Assert.NotNull(batch.SendoutVersion);

            batch = await lab.RecordCustody(
                batch.SendoutId.Value,
                new CustodyEventRequest(
                    libraryContainer.Id,
                    "handoff",
                    "Reference sequencing provider",
                    """{"condition":"sealed"}"""),
                CancellationToken.None);
            foreach (var status in new[]
            {
                LabNgsSendoutStatus.Shipped,
                LabNgsSendoutStatus.ReceivedByProvider,
                LabNgsSendoutStatus.Sequencing,
                LabNgsSendoutStatus.Complete
            })
            {
                batch = await lab.TransitionSendout(
                    batch.SendoutId!.Value,
                    new SendoutTransitionRequest(
                        status.ToString(),
                        batch.SendoutVersion!.Value),
                    CancellationToken.None);
            }
            batch = await lab.TransitionBatch(
                batch.Id,
                new BatchTransitionRequest("complete", batch.Version, DateTime.UtcNow.AddMinutes(5)),
                CancellationToken.None);
            Assert.Equal(LabBatchStatus.Complete.ToString(), batch.Status);

            var exception = await lab.RaiseException(
                workOrderId.Value,
                new CreateExceptionRequest(
                    specimen.Id,
                    execution.Id,
                    PSeq.Operations.Laboratory.Domain.LabExceptionAudience.CustomerActionRequired.ToString(),
                    "reference-confirmation",
                    "Confirm reference metadata",
                    "Reference metadata must be confirmed before approval.",
                    "Please confirm the submitted sample metadata.",
                    true,
                    DateTime.UtcNow.AddDays(2)),
                CancellationToken.None);
            exception = await lab.ResolveException(
                exception.Id,
                new ResolveExceptionRequest(
                    "Reference metadata confirmed.",
                    exception.Version),
                CancellationToken.None);
            Assert.Equal(LabExceptionStatus.Resolved.ToString(), exception.Status);

            work = await lab.WorkOrder(workOrderId.Value, CancellationToken.None);
            work = await lab.SetMilestone(
                workOrderId.Value,
                new WorkMilestoneRequest(
                    LabWorkOrderStatus.ScientificReview.ToString(),
                    work.WorkOrder.Version),
                CancellationToken.None);
            work = await lab.ApproveScientificReview(
                workOrderId.Value,
                new ScientificApprovalRequest(
                    "reference-release",
                    1,
                    """{"rin":9.2,"libraryQc":"passed"}""",
                    work.WorkOrder.Version),
                CancellationToken.None);
            Assert.Equal(LabWorkOrderStatus.ReadyForRelease.ToString(), work.WorkOrder.Status);
            Assert.Single(work.ScientificApprovals);

            await LabOperationsProjectionDispatcher.DispatchAsync(
                scope.DbContext,
                Microsoft.Extensions.Logging.Abstractions.NullLogger.Instance,
                CancellationToken.None);
            scope.DbContext.ChangeTracker.Clear();
            var projection = await scope.DbContext.CommercialLabWorkProjections
                .AsNoTracking()
                .SingleAsync(item => item.AuthorizationId == authorization.AuthorizationId);
            Assert.Equal(LabWorkMilestone.ReadyForRelease.ToString(), projection.Milestone);
            Assert.Equal(0, projection.ActiveCustomerActionCount);
            Assert.Null(projection.CustomerSafeSummary);
            using (var qcProjection = JsonDocument.Parse(projection.PermittedQcProjectionJson!))
            {
                Assert.Equal(
                    9.2,
                    qcProjection.RootElement.GetProperty("rin").GetDouble(),
                    3);
            }

            Assert.Equal(0, await scope.DbContext.ManagedOperationalFiles
                .CountAsync(item => item.WorkflowId == fixture.OrderId));
            Assert.Equal(0, await scope.DbContext.LabResultReleases
                .CountAsync(item => item.LabServiceOrderId == fixture.OrderId));
            var eventTypes = await scope.DbContext.LabWorkEvents
                .AsNoTracking()
                .Where(item => item.LabWorkOrderId == workOrderId.Value)
                .Select(item => item.EventCode)
                .ToListAsync();
            Assert.Contains("SpecimenReceived", eventTypes);
            Assert.Contains("SpecimenAccessioned", eventTypes);
            Assert.Contains("ContainerLabelPrintSucceeded", eventTypes);
            Assert.Contains("ContainerLabelPrintFailed", eventTypes);
            Assert.Contains("ScientificApprovalRecorded", eventTypes);
        }
        finally
        {
            await journey.RollbackAsync();
            scope.DbContext.ChangeTracker.Clear();
        }

        var persistedWork = await scope.DbContext.LabWorkOrders
            .AsNoTracking()
            .SingleAsync(item => item.Id == workOrderId.Value);
        Assert.Equal(LabWorkOrderStatus.AwaitingSpecimens, persistedWork.Status);
        Assert.Equal(0, await scope.DbContext.LabContainers
            .CountAsync(item => item.LabWorkOrderId == workOrderId.Value));
    }

    private sealed class HandoffTestScope : IAsyncDisposable
    {
        private const string ConnectionEnvironmentVariable =
            "PSEQ_OPERATIONS_REFERENCE_CONNECTION";
        private readonly string requestId;
        private readonly ExternalIdentity customerIdentity;
        private readonly ExternalIdentity platformIdentity;
        private readonly List<Guid> catalogItemIds = [];
        private readonly List<Guid> createdCrmCompanyIds = [];
        private readonly List<Guid> createdCrmOpportunityIds = [];
        private readonly List<Guid> createdRelationshipRequestIds = [];
        private readonly ShippingConfigurationFixture shippingConfiguration;

        private HandoffTestScope(
            PSeqOperationsDbContext dbContext,
            Organization customerOrganization,
            User customerUser,
            User platformUser,
            ExternalIdentity customerIdentity,
            ExternalIdentity platformIdentity,
            string requestId,
            ShippingConfigurationFixture shippingConfiguration)
        {
            DbContext = dbContext;
            CustomerOrganization = customerOrganization;
            CustomerUser = customerUser;
            PlatformUser = platformUser;
            this.customerIdentity = customerIdentity;
            this.platformIdentity = platformIdentity;
            this.requestId = requestId;
            this.shippingConfiguration = shippingConfiguration;
        }

        public PSeqOperationsDbContext DbContext { get; }
        public Organization CustomerOrganization { get; }
        public User CustomerUser { get; }
        public User PlatformUser { get; }

        public static async Task<HandoffTestScope> CreateAsync()
        {
            var connectionString = Environment.GetEnvironmentVariable(
                ConnectionEnvironmentVariable)
                ?? throw new InvalidOperationException(
                    $"Set {ConnectionEnvironmentVariable} before running PostgreSQL reference tests.");
            var persistenceOptions = new PersistenceOptions
            {
                CommercialSchema = ReadEnvironmentVariable(
                    "PSEQ_OPERATIONS_REFERENCE_COMMERCIAL_SCHEMA", "commercial_ops"),
                LaboratorySchema = ReadEnvironmentVariable(
                    "PSEQ_OPERATIONS_REFERENCE_LABORATORY_SCHEMA", "lab_ops"),
                MigrationsHistorySchema = ReadEnvironmentVariable(
                    "PSEQ_OPERATIONS_REFERENCE_MIGRATIONS_HISTORY_SCHEMA", "public")
            }.Validate();
            var requestId = $"lab-commercial-handoff-{Guid.NewGuid():N}";
            var dbOptions = new DbContextOptionsBuilder<PSeqOperationsDbContext>()
                .UseNpgsql(
                    connectionString,
                    npgsql => npgsql.MigrationsHistoryTable(
                        persistenceOptions.MigrationsHistoryTable,
                        persistenceOptions.MigrationsHistorySchema))
                .AddInterceptors(new AuditSaveChangesInterceptor(
                    new ReferenceCurrentUserContext(requestId)))
                .Options;
            var dbContext = new PSeqOperationsDbContext(
                dbOptions,
                Options.Create(persistenceOptions));
            try
            {
                Assert.True(await dbContext.Database.CanConnectAsync());
                Assert.Empty(await dbContext.Database.GetPendingMigrationsAsync());
                var suffix = Guid.NewGuid().ToString("N");
                var customerOrganization = new Organization(
                    $"Lab handoff customer {suffix}",
                    OrganizationKind.Customer);
                var customerIdentity = new ExternalIdentity(
                    "test", $"customer-{suffix}", $"customer-{suffix}@example.com", true);
                var customerUser = CreateUser(customerIdentity);
                var customerMembership = new OrganizationMembership(
                    customerUser.Id, customerOrganization.Id, isOrganizationAdmin: true);

                var platformOrganization = new Organization(
                    $"Lab handoff Phaeno {suffix}",
                    OrganizationKind.Phaeno);
                var platformIdentity = new ExternalIdentity(
                    "test", $"platform-{suffix}", $"platform-{suffix}@example.com", true);
                var platformUser = CreateUser(platformIdentity);
                var platformMembership = new OrganizationMembership(
                    platformUser.Id, platformOrganization.Id, isOrganizationAdmin: true);

                dbContext.AddRange(
                    customerOrganization,
                    customerUser,
                    customerMembership,
                    platformOrganization,
                    platformUser,
                    platformMembership);
                await dbContext.SaveChangesAsync();
                var catalogItem = await dbContext.QboCatalogItems
                    .FirstOrDefaultAsync(item => item.IsActive
                        && item.ExternalItemId == OrderServiceKeys.PSeqLabService
                        && item.SalesUnit == OrderSalesUnits.Specimen);
                var createdCatalogItem = false;
                if (catalogItem is null)
                {
                    catalogItem = new QboCatalogItem(
                        OrderServiceKeys.PSeqLabService,
                        "PSeq Lab Service",
                        "Reference-test PSeq Lab Service offering.",
                        OrderSalesUnits.Specimen,
                        100m,
                        "USD",
                        isActive: true,
                        DateTime.UtcNow);
                    dbContext.QboCatalogItems.Add(catalogItem);
                    createdCatalogItem = true;
                }
                dbContext.OrganizationServiceEntitlements.Add(
                    new OrganizationServiceEntitlement(
                        customerOrganization.Id,
                        PortalService.PSeqLabService,
                        DateTime.UtcNow,
                        null,
                        EntitlementConfigurationStatus.Ready,
                        platformUser.Id,
                        null,
                        "Reference-test ordering authorization."));
                await dbContext.SaveChangesAsync();
                var shippingConfiguration = await EnsureShippingConfigurationAsync(
                    dbContext,
                    suffix);
                var scope = new HandoffTestScope(
                    dbContext,
                    customerOrganization,
                    customerUser,
                    platformUser,
                    customerIdentity,
                    platformIdentity,
                    requestId,
                    shippingConfiguration);
                if (createdCatalogItem)
                {
                    scope.catalogItemIds.Add(catalogItem.Id);
                }
                return scope;
            }
            catch
            {
                await dbContext.DisposeAsync();
                throw;
            }
        }

        private static async Task<ShippingConfigurationFixture> EnsureShippingConfigurationAsync(
            PSeqOperationsDbContext dbContext,
            string suffix)
        {
            var now = DateTime.UtcNow;
            var sampleTypes = await dbContext.SampleTypeDefinitions
                .Where(item => item.IsActive
                    && item.MaterialClass == "extracted_rna"
                    && item.QuantityUnit == "tube"
                    && item.EffectiveFrom <= now
                    && (!item.EffectiveTo.HasValue || item.EffectiveTo > now))
                .ToListAsync();
            if (sampleTypes.Count > 1)
                throw new InvalidOperationException("The reference database has more than one active extracted-RNA tube sample type.");

            SampleTypeDefinition sampleType;
            Guid? createdSampleTypeId = null;
            if (sampleTypes.Count == 0)
            {
                sampleType = new SampleTypeDefinition(
                    Guid.NewGuid(),
                    1,
                    null,
                    $"rna-{suffix[..8]}",
                    "Reference extracted RNA",
                    "Reference configuration for the Commercial-to-Lab handoff journey.",
                    "extracted_rna",
                    1,
                    100,
                    "tube",
                    "Leak-proof labeled tube.",
                    "Ship frozen.",
                    null,
                    "Use a secondary sealed container.",
                    "Use the Customer sample ID only.",
                    "Do not include patient identifiers.",
                    "Follow the declared safety requirements.",
                    null,
                    48,
                    now.AddMinutes(-5),
                    true);
                dbContext.SampleTypeDefinitions.Add(sampleType);
                createdSampleTypeId = sampleType.Id;
            }
            else
            {
                sampleType = sampleTypes[0];
            }

            var destinationIds = await dbContext.SampleShippingDestinations
                .Where(item => item.IsActive
                    && item.EffectiveFrom <= now
                    && (!item.EffectiveTo.HasValue || item.EffectiveTo > now))
                .Select(item => item.Id)
                .ToListAsync();
            var activeRules = await dbContext.SampleShippingInstructionRules
                .Where(item => item.IsActive
                    && item.SampleTypeDefinitionId == sampleType.Id
                    && destinationIds.Contains(item.DestinationId)
                    && item.EffectiveFrom <= now
                    && (!item.EffectiveTo.HasValue || item.EffectiveTo > now))
                .ToListAsync();
            if (activeRules.Count > 1)
                throw new InvalidOperationException("The reference database has more than one active shipping rule for extracted-RNA tubes.");
            if (activeRules.Count == 1)
            {
                await dbContext.SaveChangesAsync();
                return new ShippingConfigurationFixture(createdSampleTypeId, null, null);
            }

            var destination = new SampleShippingDestination(
                Guid.NewGuid(),
                1,
                null,
                $"ref-{suffix[..8]}",
                "Reference receiving",
                "Phaeno receiving",
                "Phaeno",
                "1 Reference Way",
                null,
                "Seattle",
                "WA",
                "98101",
                "US",
                null,
                $"receiving-{suffix[..8]}@example.com",
                "Monday through Friday",
                "America/Los_Angeles",
                null,
                "Deliver to receiving.",
                null,
                false,
                now.AddMinutes(-5),
                true);
            var rule = new SampleShippingInstructionRule(
                Guid.NewGuid(),
                1,
                null,
                destination.Id,
                sampleType.Id,
                $"ref-{suffix[..8]}",
                "Pack in a sealed secondary container.",
                "Maintain frozen temperature.",
                "Use an approved tracked carrier.",
                "Record dispatch before shipment.",
                "Deliver during receiving hours.",
                "Include the POMS packing list.",
                "Contact Phaeno if the shipment is delayed.",
                null,
                false,
                now.AddMinutes(-5),
                true);
            dbContext.AddRange(destination, rule);
            await dbContext.SaveChangesAsync();
            return new ShippingConfigurationFixture(
                createdSampleTypeId,
                destination.Id,
                rule.Id);
        }

        public async Task<QuotedOrderFixture> CreateQuotedOrderAsync()
        {
            var now = DateTime.UtcNow;
            var order = new LabServiceOrder(
                CustomerOrganization.Id,
                CustomerOrganization.Departments.Single(department => department.IsDefault).Id,
                OrderNumberGenerator.Lab(),
                "reference-handoff",
                null,
                1,
                false,
                "synthetic_reference",
                "frozen",
                "No special hazards declared.",
                "Ship frozen");
            order.SourceGroups.Add(new LabServiceSourceGroup(
                order.Id,
                "synthetic_reference",
                1));
            order.Submit(CustomerUser.Id, now);
            order.BeginQuotePreparation();
            var quote = new LabServiceQuote(
                order.Id,
                1,
                QuotePurpose.Initial,
                "[]",
                100,
                0,
                "USD",
                now,
                now.AddDays(30));
            quote.MarkIssued();
            order.Quotes.Add(quote);
            order.MarkQuoteIssued(quote.Id);
            DbContext.LabServiceOrders.Add(order);
            await DbContext.SaveChangesAsync();
            return new QuotedOrderFixture(order.Id, quote.Id, order.Version);
        }

        public async Task<LabServiceOrderDto> InitiateCustomerOrderAsync(
            bool prohibitedDataConfirmed = true,
            string? idempotencyKey = null,
            string? customerReference = null,
            Guid? sourceRequestId = null)
        {
            var controller = CreatePlatformController(
                new InternalLabOperationsProvider(DbContext),
                idempotencyKey ?? Guid.NewGuid().ToString("N"));
            return await controller.Initiate(
                new InitiateCustomerLabOrderRequest(
                    CustomerOrganization.Id,
                    customerReference ?? $"Phaeno initiated {Guid.NewGuid():N}",
                    "Customer-safe Job notes.",
                    3,
                    "Ship frozen on dry ice.",
                    "No known hazards.",
                    prohibitedDataConfirmed,
                    [
                        new LabServiceSourceGroupWriteRequest("Human PBMC", 2),
                        new LabServiceSourceGroupWriteRequest("Mouse liver", 1)
                    ],
                    sourceRequestId),
                CancellationToken.None);
        }

        public async Task<PortalIntegrationRequest> CreateApprovedCrmOrderHandoffAsync(
            CrmPipelineStageCategory? opportunityStageCategory = null)
        {
            var company = new CrmCompany(
                $"CRM handoff company {Guid.NewGuid():N}",
                PlatformUser.Id,
                lifecycleState: CrmCompanyLifecycleState.ActiveCustomer);
            var request = new PortalIntegrationRequest(
                CustomerOrganization.Id,
                CustomerOrganization.Name,
                PortalIntegrationRequestType.SalesAssistedOrder,
                PortalIntegrationRequestSource.FirstPartyCrm,
                OrganizationKind.Customer,
                $"reference-crm:{Guid.NewGuid():N}",
                "Approved PSeq Lab Service order handoff.",
                null,
                PlatformUser.Id,
                [PortalService.PSeqLabService]);
            request.Decide(true, "Approved for reference verification.", PlatformUser.Id, DateTime.UtcNow);
            CrmOpportunity? opportunity = null;
            if (opportunityStageCategory.HasValue)
            {
                var stage = await DbContext.CrmPipelineStages
                    .FirstAsync(value => value.IsActive && value.Category == opportunityStageCategory.Value);
                opportunity = new CrmOpportunity(
                    $"CRM handoff opportunity {Guid.NewGuid():N}",
                    company.Id,
                    stage,
                    PlatformUser.Id,
                    "PSeq Lab Service",
                    1000m,
                    "USD",
                    DateOnly.FromDateTime(DateTime.UtcNow),
                    null,
                    null,
                    null,
                    []);
            }
            var handoff = new CrmHandoff(
                company.Id,
                opportunity?.Id,
                CrmHandoffType.CustomWork,
                request.Id,
                Guid.NewGuid().ToString("N"));
            DbContext.AddRange(company, request, handoff);
            if (opportunity is not null) DbContext.CrmOpportunities.Add(opportunity);
            await DbContext.SaveChangesAsync();
            createdCrmCompanyIds.Add(company.Id);
            if (opportunity is not null) createdCrmOpportunityIds.Add(opportunity.Id);
            createdRelationshipRequestIds.Add(request.Id);
            return request;
        }

        public async Task<QboCatalogItem> CreateCatalogItemAsync(
            string externalItemId,
            string name,
            string salesUnit)
        {
            var item = new QboCatalogItem(
                externalItemId,
                name,
                "Reference-test catalog item.",
                salesUnit,
                25m,
                "USD",
                isActive: true,
                DateTime.UtcNow);
            DbContext.QboCatalogItems.Add(item);
            await DbContext.SaveChangesAsync();
            catalogItemIds.Add(item.Id);
            return item;
        }

        public async Task<LabServiceOrderDto> IssueQuoteAsync(
            LabServiceOrderDto order,
            QboCatalogItem item,
            bool derivedReadiness = false)
        {
            DbContext.ChangeTracker.Clear();
            var controller = CreatePlatformController(
                new InternalLabOperationsProvider(DbContext),
                Guid.NewGuid().ToString("N"), derivedReadiness);
            return await controller.IssueQuote(
                order.Id,
                new IssueQuoteRequest(
                    order.Version,
                    [new QuoteLineRequest(item.Id, item.Name, order.RequestedSpecimenCount, item.BasePrice)],
                    0m,
                    "USD",
                    null),
                CancellationToken.None);
        }

        public async Task<LabServiceOrderDto> AcceptQuoteAsync(QuotedOrderFixture fixture)
        {
            DbContext.ChangeTracker.Clear();
            var controller = CreateCustomerController(
                new InternalLabOperationsProvider(DbContext),
                Guid.NewGuid().ToString("N"));
            return await controller.AcceptQuote(
                fixture.OrderId,
                fixture.QuoteId,
                new AcceptQuoteRequest(fixture.OrderVersion, fixture.QuoteId),
                CancellationToken.None);
        }

        public async Task<LabServiceOrderDto> AddReferenceSampleAsync(
            Guid orderId,
            long orderVersion)
        {
            DbContext.ChangeTracker.Clear();
            var controller = CreateCustomerController(
                new InternalLabOperationsProvider(DbContext),
                Guid.NewGuid().ToString("N"));
            return await controller.AddSample(
                orderId,
                new LabSampleRosterWriteRequest(
                    $"sample-{Guid.NewGuid():N}",
                    "synthetic_reference",
                    1,
                    OrderVersion: orderVersion),
                CancellationToken.None);
        }

        public async Task<LabServiceOrderDto> FinalizeSampleRosterAsync(
            Guid orderId,
            long orderVersion,
            ILabOperationsProvider provider,
            string? idempotencyKey = null)
        {
            DbContext.ChangeTracker.Clear();
            var controller = CreateCustomerController(
                provider,
                idempotencyKey ?? Guid.NewGuid().ToString("N"));
            return await controller.FinalizeSampleRoster(
                orderId,
                new VersionRequest(orderVersion),
                CancellationToken.None);
        }

        public async Task<LabServiceOrderDto> AuthorizeSampleRosterAsync(
            QuotedOrderFixture fixture,
            ILabOperationsProvider provider)
        {
            var accepted = await AcceptQuoteAsync(fixture);
            var roster = await AddReferenceSampleAsync(fixture.OrderId, accepted.Version);
            return await FinalizeSampleRosterAsync(
                fixture.OrderId,
                roster.Version,
                provider);
        }

        public async Task<CancellationFixture> RequestCancellationAsync(
            Guid orderId,
            long orderVersion)
        {
            DbContext.ChangeTracker.Clear();
            var controller = CreateCustomerController(
                new InternalLabOperationsProvider(DbContext),
                Guid.NewGuid().ToString("N"));
            var response = await controller.RequestCancellation(
                orderId,
                new CancellationRequestBody(orderVersion, "Cancel the remaining work."),
                CancellationToken.None);
            var cancellationId = await DbContext.OrderCancellationRequests
                .Where(item => item.WorkflowId == orderId)
                .Select(item => item.Id)
                .SingleAsync();
            return new CancellationFixture(cancellationId, response.Version);
        }

        public async Task DecideCancellationAsync(
            Guid orderId,
            Guid cancellationId,
            long orderVersion,
            ILabOperationsProvider provider)
        {
            DbContext.ChangeTracker.Clear();
            var controller = CreatePlatformController(provider);
            await controller.DecideCancellation(
                orderId,
                cancellationId,
                new CancellationDecisionRequest(
                    orderVersion,
                    CancellationRequestStatus.Approved.ToString(),
                    "Cancellation approved."),
                CancellationToken.None);
        }

        public async Task<LabStaffFixture> CreateLabStaffAsync()
        {
            var platformOrganizationId = await DbContext.OrganizationMemberships
                .Where(item => item.UserId == PlatformUser.Id)
                .Select(item => item.OrganizationId)
                .SingleAsync();
            var suffix = Guid.NewGuid().ToString("N");
            var identity = new ExternalIdentity(
                "test",
                $"lab-staff-{suffix}",
                $"lab-staff-{suffix}@example.com",
                true);
            var user = CreateUser(identity);
            var membership = new OrganizationMembership(
                user.Id,
                platformOrganizationId,
                isOrganizationAdmin: false);
            DbContext.AddRange(user, membership);
            await DbContext.SaveChangesAsync();
            return new LabStaffFixture(user, identity);
        }

        public LabOperationsController CreatePlatformLabController() =>
            CreateLabController(platformIdentity);

        public LabOperationsController CreateLabController(ExternalIdentity identity) =>
            new(
                DbContext,
                new LabOperationsRequestContext(
                    DbContext,
                    new FixedIdentityContext(identity)))
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext()
                }
            };

        private LabServiceOrdersController CreateCustomerController(
            ILabOperationsProvider provider,
            string idempotencyKey)
        {
            var httpContext = new DefaultHttpContext();
            httpContext.Request.Headers["X-Organization-Id"] = CustomerOrganization.Id.ToString();
            httpContext.Request.Headers["Idempotency-Key"] = idempotencyKey;
            var orderOptions = Options.Create(new OrderManagementOptions());
            return new LabServiceOrdersController(
                DbContext,
                new OrderRequestContext(DbContext, new FixedIdentityContext(customerIdentity)),
                new OrderIdempotencyService(DbContext),
                NullOperationalFileStorage.Instance,
                Options.Create(new PSeqOrderToCashOptions
                {
                    NativePSeqAccountsReceivable = true
                }),
                provider,
                new ReleasedDeliverableDownloadAttemptService(
                    DbContext,
                    orderOptions,
                    NullLogger<ReleasedDeliverableDownloadAttemptService>.Instance),
                 new ReleasedDeliverableDownloadProjectionService(DbContext),
                 NullLogger<CompletionTrackedFileStreamResult>.Instance,
                 NullLogger<CompletionTrackedArchiveResult>.Instance)
            {
                ControllerContext = new ControllerContext { HttpContext = httpContext }
            };
        }

        private PlatformLabServiceOrdersController CreatePlatformController(
            ILabOperationsProvider provider,
            string? idempotencyKey = null,
            bool derivedReadiness = false)
        {
            var httpContext = new DefaultHttpContext();
            if (idempotencyKey != null)
                httpContext.Request.Headers["Idempotency-Key"] = idempotencyKey;
            return new(
                DbContext,
                new OrderRequestContext(DbContext, new FixedIdentityContext(platformIdentity)),
                new OrderIdempotencyService(DbContext),
                NullOperationalFileStorage.Instance,
                NullOperationalFileScanner.Instance,
                Options.Create(new OrderManagementOptions()),
                Options.Create(new PSeqOrderToCashOptions
                {
                    NativePSeqAccountsReceivable = true,
                    DerivedReadiness = derivedReadiness
                }),
                provider,
                new ReleasedDeliverableRetentionSnapshotService(DbContext),
                NullLogger<PlatformLabServiceOrdersController>.Instance)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = httpContext
                }
            };
        }

        public async ValueTask DisposeAsync()
        {
            try
            {
                DbContext.ChangeTracker.Clear();
                var organizationIds = new[]
                {
                    CustomerOrganization.Id,
                    await DbContext.OrganizationMemberships
                        .Where(item => item.UserId == PlatformUser.Id)
                        .Select(item => item.OrganizationId)
                        .SingleAsync()
                };
                var orderIds = await DbContext.LabServiceOrders
                    .Where(item => organizationIds.Contains(item.OrganizationId))
                    .Select(item => item.Id)
                    .ToArrayAsync();
                var authorizationIds = await DbContext.CommercialLabAuthorizations
                    .Where(item => orderIds.Contains(item.CommercialOrderId))
                    .Select(item => item.AuthorizationId)
                    .ToArrayAsync();
                var workOrderIds = await DbContext.LabWorkOrders
                    .Where(item => authorizationIds.Contains(item.AuthorizationId)
                        || orderIds.Contains(item.AuthorizationSourceId))
                    .Select(item => item.Id)
                    .ToArrayAsync();
                var shipmentIds = await DbContext.SampleShipments
                    .Where(item => orderIds.Contains(item.AuthorizationSourceId))
                    .Select(item => item.Id)
                    .ToArrayAsync();
                var shipmentItemIds = await DbContext.SampleShipmentItems
                    .Where(item => shipmentIds.Contains(item.SampleShipmentId))
                    .Select(item => item.Id)
                    .ToArrayAsync();

                await DbContext.AuditEvents.Where(item => item.RequestId == requestId).ExecuteDeleteAsync();
                await DbContext.LabOperationsEventReceipts.Where(item => authorizationIds.Contains(item.AuthorizationId)).ExecuteDeleteAsync();
                await DbContext.CommercialLabWorkProjections.Where(item => authorizationIds.Contains(item.AuthorizationId)).ExecuteDeleteAsync();
                await DbContext.LabProviderCommandReceipts.Where(item => authorizationIds.Contains(item.AuthorizationId)).ExecuteDeleteAsync();
                await DbContext.LabOperationsOutboxEvents.Where(item => authorizationIds.Contains(item.AuthorizationId)).ExecuteDeleteAsync();
                await DbContext.LabWorkEvents.Where(item => workOrderIds.Contains(item.LabWorkOrderId)).ExecuteDeleteAsync();
                await DbContext.LabScientificApprovals.Where(item => workOrderIds.Contains(item.LabWorkOrderId)).ExecuteDeleteAsync();
                await DbContext.LabWorkAuthorizationVersions.Where(item => workOrderIds.Contains(item.LabWorkOrderId)).ExecuteDeleteAsync();
                await DbContext.LabSpecimens.Where(item => workOrderIds.Contains(item.LabWorkOrderId)).ExecuteDeleteAsync();
                await DbContext.SampleShipmentTubeSlots.Where(item => shipmentItemIds.Contains(item.SampleShipmentItemId)).ExecuteDeleteAsync();
                await DbContext.SampleShipmentItems.Where(item => shipmentIds.Contains(item.SampleShipmentId)).ExecuteDeleteAsync();
                await DbContext.SampleShipments.Where(item => shipmentIds.Contains(item.Id)).ExecuteDeleteAsync();
                await DbContext.LabWorkOrders.Where(item => workOrderIds.Contains(item.Id)).ExecuteDeleteAsync();
                await DbContext.CommercialLabAuthorizations.Where(item => orderIds.Contains(item.CommercialOrderId)).ExecuteDeleteAsync();
                await DbContext.OrderIdempotencyRecords.Where(item => item.ActorUserId == CustomerUser.Id || item.ActorUserId == PlatformUser.Id).ExecuteDeleteAsync();
                await DbContext.OrderNotifications.Where(item => organizationIds.Contains(item.OrganizationId)).ExecuteDeleteAsync();
                await DbContext.OrderStatusEvents.Where(item => organizationIds.Contains(item.OrganizationId)).ExecuteDeleteAsync();
                await DbContext.OrderCancellationRequests.Where(item => orderIds.Contains(item.WorkflowId)).ExecuteDeleteAsync();
                await DbContext.CommercialDocumentLinks.Where(item => orderIds.Contains(item.WorkflowId)).ExecuteDeleteAsync();
                await DbContext.LabResultReleases.Where(item => orderIds.Contains(item.LabServiceOrderId)).ExecuteDeleteAsync();
                await DbContext.ManagedOperationalFiles.Where(item => orderIds.Contains(item.WorkflowId)).ExecuteDeleteAsync();
                await DbContext.LabServiceRequestRevisions.Where(item => orderIds.Contains(item.LabServiceOrderId)).ExecuteDeleteAsync();
                await DbContext.LabServiceQuotes.Where(item => orderIds.Contains(item.LabServiceOrderId)).ExecuteDeleteAsync();
                await DbContext.LabSamples.Where(item => orderIds.Contains(item.LabServiceOrderId)).ExecuteDeleteAsync();
                await DbContext.LabServiceSourceGroups.Where(item => orderIds.Contains(item.LabServiceOrderId)).ExecuteDeleteAsync();
                await DbContext.LabServiceOrders.Where(item => orderIds.Contains(item.Id)).ExecuteDeleteAsync();
                await DbContext.CrmActivities.Where(item => item.CompanyId.HasValue && createdCrmCompanyIds.Contains(item.CompanyId.Value)).ExecuteDeleteAsync();
                await DbContext.CrmHandoffs.Where(item => createdCrmCompanyIds.Contains(item.CompanyId)).ExecuteDeleteAsync();
                await DbContext.CrmOpportunities.Where(item => createdCrmOpportunityIds.Contains(item.Id)).ExecuteDeleteAsync();
                await DbContext.PortalIntegrationRequestServices.Where(item => createdRelationshipRequestIds.Contains(item.PortalIntegrationRequestId)).ExecuteDeleteAsync();
                await DbContext.PortalIntegrationRequests.Where(item => createdRelationshipRequestIds.Contains(item.Id)).ExecuteDeleteAsync();
                await DbContext.CrmCompanies.Where(item => createdCrmCompanyIds.Contains(item.Id)).ExecuteDeleteAsync();
                await DbContext.OrganizationServiceEntitlements.Where(item => organizationIds.Contains(item.OrganizationId)).ExecuteDeleteAsync();
                await DbContext.QboCatalogItems.Where(item => catalogItemIds.Contains(item.Id)).ExecuteDeleteAsync();
                await DbContext.OrganizationDepartmentMemberships.Where(item => organizationIds.Contains(item.Department.OrganizationId)).ExecuteDeleteAsync();
                await DbContext.OrganizationDepartments.Where(item => organizationIds.Contains(item.OrganizationId)).ExecuteDeleteAsync();
                await DbContext.OrganizationMemberships.Where(item => organizationIds.Contains(item.OrganizationId)).ExecuteDeleteAsync();
                await DbContext.Users.Where(item => item.Id == CustomerUser.Id || item.Id == PlatformUser.Id).ExecuteDeleteAsync();
                await DbContext.Organizations.Where(item => organizationIds.Contains(item.Id)).ExecuteDeleteAsync();
                if (shippingConfiguration.RuleId.HasValue)
                    await DbContext.SampleShippingInstructionRules.Where(item => item.Id == shippingConfiguration.RuleId.Value).ExecuteDeleteAsync();
                if (shippingConfiguration.DestinationId.HasValue)
                    await DbContext.SampleShippingDestinations.Where(item => item.Id == shippingConfiguration.DestinationId.Value).ExecuteDeleteAsync();
                if (shippingConfiguration.SampleTypeId.HasValue)
                    await DbContext.SampleTypeDefinitions.Where(item => item.Id == shippingConfiguration.SampleTypeId.Value).ExecuteDeleteAsync();
            }
            finally
            {
                await DbContext.DisposeAsync();
            }
        }

        private static User CreateUser(ExternalIdentity identity)
        {
            var user = new User(identity.Email, "Reference", "User");
            user.LinkExternalIdentity(identity.Provider, identity.SubjectId);
            user.Activate();
            return user;
        }

        private static string ReadEnvironmentVariable(string name, string defaultValue)
        {
            var value = Environment.GetEnvironmentVariable(name);
            return string.IsNullOrWhiteSpace(value) ? defaultValue : value;
        }
    }

    private sealed record QuotedOrderFixture(Guid OrderId, Guid QuoteId, long OrderVersion);
    private sealed record CancellationFixture(Guid Id, long OrderVersion);
    private sealed record LabStaffFixture(User User, ExternalIdentity Identity);
    private sealed record ShippingConfigurationFixture(
        Guid? SampleTypeId,
        Guid? DestinationId,
        Guid? RuleId);
    private sealed record IdempotencyProbeResponse(Guid Id);

    private sealed class FixedIdentityContext(ExternalIdentity identity)
        : IExternalIdentityContext
    {
        public ExternalIdentity? Read(HttpContext httpContext) => identity;
    }

    private sealed class PersistingRejectingProvider(PSeqOperationsDbContext dbContext)
        : ILabOperationsProvider
    {
        public async Task<LabCommandAcknowledgment> AuthorizeWorkAsync(
            AuthorizeLabWorkCommand command,
            CancellationToken cancellationToken)
        {
            var work = new LabWorkOrder(
                command.AuthorizationId,
                command.AuthorizationVersion,
                LabAuthorizationSource.CommercialOrder,
                command.AuthorizationSourceId,
                command.SubmittingOrganizationId,
                command.ServiceKey,
                command.ServiceVersion,
                command.TurnaroundPolicyKey,
                command.OpaqueSubmitterReference);
            foreach (var specimen in command.Specimens)
            {
                work.Specimens.Add(new LabSpecimen(work.Id, specimen.SubmittedSpecimenId));
            }
            dbContext.LabWorkOrders.Add(work);
            await dbContext.SaveChangesAsync(cancellationToken);
            return new LabCommandAcknowledgment(
                command.Metadata.CommandId,
                command.Metadata.CorrelationId,
                LabCommandDisposition.Rejected,
                null,
                null,
                LabCommandReasonCodes.AuthorizationInvalid,
                DateTime.UtcNow);
        }

        public Task<LabCommandAcknowledgment> AmendAuthorizationAsync(
            AmendLabWorkAuthorizationCommand command,
            CancellationToken cancellationToken) => throw new NotSupportedException();

        public Task<LabCancellationOutcome> RequestCancellationAsync(
            RequestLabWorkCancellationCommand command,
            CancellationToken cancellationToken) => throw new NotSupportedException();

        public Task<LabWorkProjection?> GetWorkProjectionAsync(
            Guid authorizationId,
            CancellationToken cancellationToken) => throw new NotSupportedException();
    }

    private sealed class NullOperationalFileStorage : IOperationalFileStorage
    {
        public static NullOperationalFileStorage Instance { get; } = new();
        public Task<StoredOperationalFile> SaveAsync(Stream content, string extension,
            long maximumBytes, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<Stream> OpenReadAsync(string storageKey,
            CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task DeleteIfExistsAsync(string storageKey,
            CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class NullOperationalFileScanner : IOperationalFileScanner
    {
        public static NullOperationalFileScanner Instance { get; } = new();
        public Task<OperationalScanResult> ScanAsync(string storageKey,
            CancellationToken cancellationToken) =>
            Task.FromResult(new OperationalScanResult(
                OperationalFileScanStatus.Unavailable,
                "Not used by the handoff tests."));
    }

    private sealed class ReferenceCurrentUserContext(string requestId)
        : ICurrentUserContext
    {
        public Guid? UserId => null;
        public Guid? OrganizationId => null;
        public string? RequestId { get; } = requestId;
    }
}
