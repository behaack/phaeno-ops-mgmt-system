namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task TransportationKitConcurrentRequestsFreezeFactsAndNotifyPhaenoOnlyOnce()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(18);
        var size = await scope.CreateContainerAsync(fixture, 20);
        var location = await scope.CreateTransportationLocationAsync();
        var supply = await scope.KitCustomer().Supply(fixture.Shipment.Id, null, default);
        Assert.Equal("Unknown", supply.InventoryStatus);
        Assert.All(supply.RecordedStock, value => Assert.Equal(0, value.AvailableQuantity));
        Assert.True(supply.CanRequestKits);
        var beforeSamples = await scope.DbContext.LabSamples.CountAsync();
        var body = new CreateTransportationKitRequest(supply.ShipmentVersion, location.Id, location.Version, [new(size.Id, 1)]);
        await using var first = scope.CreateAdditionalContext();
        await using var second = scope.CreateAdditionalContext();
        var responses = await Task.WhenAll(scope.KitCustomer(dbOverride: first).Create(fixture.Shipment.Id, body, default),
            scope.KitCustomer(dbOverride: second).Create(fixture.Shipment.Id, body, default));
        Assert.Equal(responses[0].Id, responses[1].Id);
        var created = responses[0];
        Assert.True(created.IncludedInLabOrder);
        Assert.Equal("Pending", created.Status);
        var replay = await scope.KitCustomer().Create(fixture.Shipment.Id, body, default);
        Assert.Equal(created.Id, replay.Id);
        Assert.Equal(beforeSamples, await scope.DbContext.LabSamples.CountAsync());
        Assert.Single(await scope.DbContext.SampleShipments.Where(item => item.AuthorizationSourceId == created.JobId).ToListAsync());
        var notice = await scope.DbContext.OrderNotifications.SingleAsync(item => item.WorkflowId == created.Id);
        Assert.Equal(scope.PlatformOrganization.Id, notice.OrganizationId);
        Assert.Null(notice.RecipientUserId);
        notice.BeginAttempt(DateTime.UtcNow.AddMinutes(1));
        await scope.DbContext.SaveChangesAsync();
        var sender = new TransportationNoticeSender();
        await OrderNotificationDispatcher.DeliverAsync(scope.DbContext, sender, notice.Id, notice.Version, NullLogger.Instance, default);
        Assert.Equal(scope.PlatformUser.Email, Assert.Single(sender.Emails));
        var savedLocation = await scope.DbContext.CustomerDeliveryLocations.SingleAsync(item => item.Id == location.Id);
        savedLocation.Update("Changed later", savedLocation.Recipient, "2 Changed Lane", null, savedLocation.City,
            savedLocation.Region, savedLocation.PostalCode, savedLocation.CountryCode, null, null, true);
        await scope.DbContext.SaveChangesAsync();
        var detail = await scope.KitStaff().Read(created.Id, default);
        Assert.Equal("1 Delivery Way", detail.Request.DeliveryAddress.Line1);
        Assert.Equal(20, Assert.Single(detail.Request.Lines).TubeCapacity);
        Assert.Equal("transportation_kit_not_found", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.KitCustomer(otherTenant: true).Supply(fixture.Shipment.Id, null, default))).ErrorCode);
    }

    [PostgreSqlReferenceFact]
    public async Task TransportationKitPartialDispatchAndReceiptEnableOnlyAcknowledgedCapacity()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(30);
        var sizes = await scope.CreateStandardContainersAsync(fixture);
        var twenty = sizes.Single(item => item.TubeCapacity == 20);
        var ten = sizes.Single(item => item.TubeCapacity == 10);
        var location = await scope.CreateTransportationLocationAsync();
        var created = await scope.KitCustomer().Create(fixture.Shipment.Id,
            new(fixture.Shipment.Version, location.Id, location.Version, [new(twenty.Id, 1), new(ten.Id, 1)]), default);
        var kit20 = await scope.ReadyTransportationKitAsync(twenty);
        var kit10 = await scope.ReadyTransportationKitAsync(ten);
        var dispatch = await scope.KitStaff().Dispatch(created.Id,
            new(created.Version, [kit20.Id], "Reference carrier", "OUT-20", DateTime.UtcNow), default);
        Assert.Equal("PartiallyDispatched", dispatch.Request.Status);
        scope.ClearTrackedState();
        var onTheWay = await scope.KitCustomer().Supply(fixture.Shipment.Id, location.Id, default);
        Assert.False(onTheWay.CanPrepareSamples);
        Assert.Equal(1, onTheWay.RecordedStock.Single(item => item.ContainerDefinitionId == twenty.Id).InTransitQuantity);
        Assert.Equal(0, onTheWay.RecordedStock.Sum(item => item.AvailableQuantity));
        Assert.False((await scope.PackingController().Read(fixture.Shipment.Id, default)).CanPack);
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController().Preview(fixture.Shipment.Id, new(), default));
        var blocked = await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController().Confirm(fixture.Shipment.Id,
            new(fixture.Shipment.Version, [new(twenty.Id, 1)]), default));
        Assert.Equal("transportation_kit_receipt_required", blocked.ErrorCode);
        scope.ClearTrackedState();
        var received = await scope.KitCustomer().Receive(created.Id, new(dispatch.Request.Version, [kit20.Id]), default);
        Assert.Equal("PartiallyDispatched", received.Status);
        var receiptReplay = await scope.KitCustomer().Receive(created.Id, new(dispatch.Request.Version, [kit20.Id]), default);
        Assert.Equal(received.Version, receiptReplay.Version);
        scope.ClearTrackedState();
        Assert.True((await scope.KitCustomer().Supply(fixture.Shipment.Id, location.Id, default)).CanPrepareSamples);
        var partialPreview = await scope.PackingController().Preview(fixture.Shipment.Id, new(), default);
        Assert.Equal(10, partialPreview.UnallocatedTubes);
        Assert.Equal(twenty.Id, Assert.Single(partialPreview.Containers).ContainerDefinitionId);
        var packed = await scope.PackingController().Confirm(fixture.Shipment.Id, new(fixture.Shipment.Version, [new(twenty.Id, 1)]), default);
        var residual = packed.Single(item => item.Id == fixture.Shipment.Id);
        var residualSupply = await scope.KitCustomer().Supply(residual.Id, location.Id, default);
        Assert.Equal(created.Id, residualSupply.Request!.Id);
        Assert.Equal(0, residualSupply.RecordedStock.Single(item => item.ContainerDefinitionId == twenty.Id).AvailableQuantity);
        Assert.Equal(10, residualSupply.Recommendation.TubeCount);
        Assert.Equal(ten.Id, Assert.Single(residualSupply.Recommendation.Containers).ContainerDefinitionId);
        scope.ClearTrackedState();
        var secondDispatch = await scope.KitStaff().Dispatch(created.Id, new(received.Version, [kit10.Id], "Reference carrier", "OUT-10", DateTime.UtcNow), default);
        Assert.Equal("Dispatched", secondDispatch.Request.Status);
        Assert.Equal(1, secondDispatch.Request.Lines.Sum(item => item.ReceivedQuantity));
        var complete = await scope.KitCustomer().Receive(created.Id, new(secondDispatch.Request.Version, [kit10.Id]), default);
        Assert.Equal("Received", complete.Status);
        Assert.Equal(2, complete.Lines.Sum(item => item.ReceivedQuantity));
        scope.ClearTrackedState();
        await scope.PackingController().Confirm(residual.Id, new(residual.Version, [new(ten.Id, 1)]), default);
        Assert.Equal(2, await scope.DbContext.SampleShipments.CountAsync(item => item.AuthorizationSourceId == complete.JobId && item.Status != SampleShipmentStatus.Cancelled));
        Assert.All(await scope.DbContext.SampleShippingStockKits.Where(item => item.AuthorizationSourceId == complete.JobId).ToArrayAsync(), kit => Assert.Equal(location.Id, kit.CustomerDeliveryLocationId));
    }

    [PostgreSqlReferenceFact]
    public async Task TransportationKitReceiptGateBlocksTubeScanUntilCustomerAcknowledgesDelivery()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(18);
        var size = await scope.CreateContainerAsync(fixture, 20);
        var location = await scope.CreateTransportationLocationAsync();
        var shipment = await scope.DbContext.SampleShipments.SingleAsync(item => item.Id == fixture.Shipment.Id);
        shipment.SelectContainer(size.Id, SampleShippingContainerCatalogService.Snapshot(size));
        await scope.DbContext.SaveChangesAsync();
        var created = await scope.KitCustomer().Create(shipment.Id,
            new(shipment.Version, location.Id, location.Version, [new(size.Id, 1)]), default);
        var kit = await scope.ReadyTransportationKitAsync(size);
        var dispatched = await scope.KitStaff().Dispatch(created.Id, new(created.Version, [kit.Id], "Carrier", "TRACK", DateTime.UtcNow), default);
        var barcode = kit.Tubes[0].SupplierBarcode;
        var slot = await scope.DbContext.SampleShipmentTubeSlots.AsNoTracking().Where(item => item.SampleShipmentItemId == fixture.Item.Id).OrderBy(item => item.Ordinal).FirstAsync();
        scope.ClearTrackedState();
        var blocked = await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreateCustomerWorkflowController().AssignTube(shipment.Id,
            fixture.Item.Id, new(barcode, null, slot.Version, TubeSlotId: slot.Id), default));
        Assert.Equal("transportation_kit_receipt_required", blocked.ErrorCode);
        Assert.False(await scope.DbContext.SampleReturnKits.AnyAsync(item => item.SampleShipmentId == shipment.Id));
        scope.ClearTrackedState();
        await scope.KitCustomer().Receive(created.Id, new(dispatched.Request.Version, [kit.Id]), default);
        scope.ClearTrackedState();
        await scope.CreateCustomerWorkflowController().AssignTube(shipment.Id, fixture.Item.Id,
            new(barcode, null, slot.Version, TubeSlotId: slot.Id), default);
        scope.ClearTrackedState();
        var supply = await scope.KitCustomer().Supply(shipment.Id, location.Id, default);
        Assert.True(supply.CanPrepareSamples);
        Assert.Equal(0, supply.RecordedStock.Sum(item => item.AvailableQuantity));
        Assert.Equal(shipment.Id, (await scope.DbContext.SampleShippingStockKits.AsNoTracking().SingleAsync(item => item.Id == kit.Id)).BoundSampleShipmentId);
    }

    [PostgreSqlReferenceFact]
    public async Task TransportationKitOrderAuthorizationCancellationAndWrongKitLeaveRecordsIntact()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(18);
        var size = await scope.CreateContainerAsync(fixture, 20);
        var wrongSize = await scope.CreateContainerAsync(fixture, 5);
        var location = await scope.CreateTransportationLocationAsync();
        var body = new CreateTransportationKitRequest(fixture.Shipment.Version, location.Id, location.Version, [new(size.Id, 1)]);
        var membership = await scope.DbContext.OrganizationMemberships.SingleAsync(item => item.UserId == scope.CustomerUser.Id && item.OrganizationId == scope.CustomerOrganization.Id);
        membership.SetOrganizationAdmin(false);
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.KitCustomer().Supply(fixture.Shipment.Id, null, default))).StatusCode);
        scope.DbContext.OrganizationDepartmentMemberships.Add(new OrganizationDepartmentMembership(membership.Id, location.DepartmentId));
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        Assert.False((await scope.KitCustomer().Supply(fixture.Shipment.Id, null, default)).CanRequestKits);
        Assert.Equal(403, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.KitCustomer().Create(fixture.Shipment.Id, body, default))).StatusCode);
        Assert.Equal(403, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.KitStaff(customer: true).List(null, default))).StatusCode);
        membership = await scope.DbContext.OrganizationMemberships.SingleAsync(item => item.UserId == scope.CustomerUser.Id && item.OrganizationId == scope.CustomerOrganization.Id);
        membership.SetOrganizationAdmin(true); await scope.DbContext.SaveChangesAsync(); scope.ClearTrackedState();
        var created = await scope.KitCustomer().Create(fixture.Shipment.Id, body, default);
        var wrongKit = await scope.ReadyTransportationKitAsync(wrongSize);
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.KitStaff().Dispatch(created.Id,
            new(created.Version, [wrongKit.Id], "Carrier", "WRONG", DateTime.UtcNow), default));
        scope.ClearTrackedState();
        Assert.Null((await scope.DbContext.SampleShippingStockKits.AsNoTracking().SingleAsync(item => item.Id == wrongKit.Id)).FulfilledAt);
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.KitCustomer(otherTenant: true).Receive(created.Id,
            new(created.Version, [wrongKit.Id]), default))).StatusCode);
        var cancelled = await scope.KitCustomer().Cancel(created.Id, new(created.Version, "Correct delivery request"), default);
        Assert.Equal("Cancelled", cancelled.Status);
        var replacement = await scope.KitCustomer().Create(fixture.Shipment.Id, body, default);
        Assert.NotEqual(created.Id, replacement.Id);
        Assert.Equal(1, await scope.DbContext.TransportationKitRequests.CountAsync(item => item.LabServiceOrderId == created.JobId && item.ClosedAt == null));
    }

    [PostgreSqlReferenceFact]
    public async Task TransportationKitPackingDoesNotPoolReceivedKitsAcrossDeliveryLocations()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(18);
        var size = await scope.CreateContainerAsync(fixture, 20);
        var firstLocation = await scope.CreateTransportationLocationAsync();
        var first = await scope.KitCustomer().Create(fixture.Shipment.Id,
            new(fixture.Shipment.Version, firstLocation.Id, firstLocation.Version, [new(size.Id, 1)]), default);
        var kit = await scope.ReadyTransportationKitAsync(size);
        var dispatched = await scope.KitStaff().Dispatch(first.Id, new(first.Version, [kit.Id], "Carrier", "LOCATION-1", DateTime.UtcNow), default);
        await scope.KitCustomer().Receive(first.Id, new(dispatched.Request.Version, [kit.Id]), default);
        var secondLocation = new CustomerDeliveryLocation(scope.CustomerOrganization.Id, firstLocation.DepartmentId,
            "Other receiving location", "Other recipient", "2 Other Way", null, "Seattle", "WA", "98101", "US", null, null, false);
        scope.DbContext.CustomerDeliveryLocations.Add(secondLocation); await scope.DbContext.SaveChangesAsync(); scope.ClearTrackedState();
        var second = await scope.KitCustomer().Create(fixture.Shipment.Id,
            new(fixture.Shipment.Version, secondLocation.Id, secondLocation.Version, [new(size.Id, 1)]), default);
        Assert.NotEqual(first.Id, second.Id);
        var supply = await scope.KitCustomer().Supply(fixture.Shipment.Id, null, default);
        Assert.Equal(secondLocation.Id, supply.DeliveryLocationId);
        Assert.Equal(0, supply.RecordedStock.Sum(item => item.AvailableQuantity));
        Assert.False(supply.CanPrepareSamples);
        Assert.Equal(1, await scope.DbContext.SampleShippingStockKits.CountAsync(item => item.AuthorizationSourceId == first.JobId && item.CustomerReceivedAt.HasValue));
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController().Preview(fixture.Shipment.Id, new(), default));
        Assert.Equal("transportation_kit_receipt_required", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.PackingController().Confirm(fixture.Shipment.Id, new(fixture.Shipment.Version, [new(size.Id, 1)]), default))).ErrorCode);
    }

    [PostgreSqlReferenceFact]
    public async Task TransportationKitQueueReturnsAllRecordsForClientFilteringBeyondTwoHundredFifty()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(18);
        var size = await scope.CreateContainerAsync(fixture, 20);
        var location = await scope.CreateTransportationLocationAsync();
        var pending = await scope.KitCustomer().Create(fixture.Shipment.Id,
            new(fixture.Shipment.Version, location.Id, location.Version, [new(size.Id, 1)]), default);
        var address = System.Text.Json.JsonSerializer.Serialize(location.ToDto(), new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web));
        for (var index = 0; index < 260; index++)
        {
            var historical = new TransportationKitRequest(pending.JobId, pending.OrganizationId, pending.DepartmentId, location.Id,
                address, scope.CustomerUser.Id, DateTime.UtcNow.AddDays(-1).AddSeconds(index));
            historical.Lines.Add(new(historical.Id, size.Id, SampleShippingContainerCatalogService.Snapshot(size), 1));
            historical.Cancel("Historical correction", DateTime.UtcNow);
            scope.DbContext.TransportationKitRequests.Add(historical);
        }
        await scope.DbContext.SaveChangesAsync(); scope.ClearTrackedState();
        var all = await scope.KitStaff().List(null, default);
        Assert.Equal(261, all.Count);
        Assert.Equal(pending.Id, Assert.Single(all, item => item.Status == "Pending").Id);
        Assert.Equal(260, (await scope.KitStaff().List("Cancelled", default)).Count);
        Assert.All(all, item => { Assert.False(string.IsNullOrWhiteSpace(item.OrganizationName)); Assert.False(string.IsNullOrWhiteSpace(item.DepartmentName)); });
    }

    private sealed class TransportationNoticeSender : IOrderNotificationSender
    {
        public List<string> Emails { get; } = [];
        public Task SendAsync(IReadOnlyList<string> recipients, string subject, string body, CancellationToken ct)
        { Emails.AddRange(recipients); return Task.CompletedTask; }
    }

    private sealed partial class ShippingTestScope
    {
        public async Task<ShippingFixture> CreateTransportationShipmentAsync(int tubes)
        {
            var configured = await CreateShipmentAsync();
            var now = DateTime.UtcNow;
            var departmentId = CustomerOrganization.Departments.Single(item => item.IsDefault).Id;
            var job = new LabServiceOrder(CustomerOrganization.Id, departmentId, OrderNumberGenerator.Lab(), $"KIT-SUPPLY-{Suffix}", null,
                1, false, "Synthetic", "Frozen", "No hazards", "Ship cold");
            job.SourceGroups.Add(new(job.Id, "Synthetic", 1)); job.Submit(CustomerUser.Id, now); job.BeginQuotePreparation();
            var quote = new LabServiceQuote(job.Id, 1, QuotePurpose.Initial, "[]", 100, 0, "USD", now, now.AddDays(30));
            quote.MarkIssued(); job.Quotes.Add(quote); job.MarkQuoteIssued(quote.Id); quote.Accept(CustomerUser.Id, now); job.AcceptQuote(quote.Id, now);
            var sample = new LabSample(job.Id, $"KIT-SAMPLE-{Suffix}", "RNA", "Synthetic", tubes, "tubes", "Frozen", "No hazards", null, null, null, "[]");
            job.Samples.Add(sample); job.FinalizeSampleRoster(CustomerUser.Id, now);
            var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, job.Id, CustomerOrganization.Id, "reference-service", 1, "reference-turnaround", job.OrderNumber);
            var specimen = new LabSpecimen(work.Id, sample.Id); work.Specimens.Add(specimen);
            var shipment = new SampleShipment($"KIT-SHP-{Suffix}", CustomerOrganization.Id, departmentId,
                SampleShipmentAuthorizationSource.CustomerLabServiceOrder, job.Id, job.OrderNumber, job.CustomerReference!, work.Id, configured.Destination.Id);
            var row = new SampleShipmentItem(shipment.Id, sample.Id, configured.SampleType.Id, sample.CustomerSampleId, "Synthetic sample", tubes, "tubes");
            for (var ordinal = 1; ordinal <= tubes; ordinal++) row.TubeSlots.Add(new(row.Id, ordinal));
            shipment.Items.Add(row); DbContext.AddRange(job, work, shipment); await DbContext.SaveChangesAsync(); ClearTrackedState();
            return new(configured.Destination, configured.SampleType, work, specimen, shipment, row);
        }
        public async Task<CustomerDeliveryLocation> CreateTransportationLocationAsync()
        {
            var location = new CustomerDeliveryLocation(CustomerOrganization.Id, CustomerOrganization.Departments.Single(item => item.IsDefault).Id,
                "Reference receiving", "Reference recipient", "1 Delivery Way", null, "Seattle", "WA", "98101", "US", null, "Receiving desk", true);
            DbContext.CustomerDeliveryLocations.Add(location); await DbContext.SaveChangesAsync(); ClearTrackedState(); return location;
        }
        public async Task<StockKitDto> ReadyTransportationKitAsync(SampleShippingContainerDefinitionDto size)
        {
            var stock = StockController();
            var created = Assert.IsType<StockKitDto>(Assert.IsType<CreatedResult>((await stock.Create(new(size.Id, "Supplier", "T-1", null, "Shipper", "B-1"), default)).Result).Value);
            ClearTrackedState();
            var codes = Enumerable.Range(1, size.TubeCapacity).Select(index => $"TK-{created.Id:N}-{index:00}").ToArray();
            var ready = await stock.Register(created.Id, new(codes, created.Version), default); ClearTrackedState(); return ready;
        }
        public TransportationKitRequestsController KitCustomer(bool otherTenant = false, PSeqOperationsDbContext? dbOverride = null)
        {
            var db = dbOverride ?? DbContext;
            var http = new DefaultHttpContext(); http.Request.Headers["X-Organization-Id"] = (otherTenant ? OtherCustomerOrganization.Id : CustomerOrganization.Id).ToString();
            http.Request.Headers["Idempotency-Key"] = Guid.NewGuid().ToString("N");
            return new(new OrderRequestContext(db, new FixedIdentityContext(otherTenant ? otherCustomerIdentity : customerIdentity)),
                new OrderIdempotencyService(db), new TransportationKitRequestService(db, new SampleShippingContainerCatalogService(db)))
                { ControllerContext = new() { HttpContext = http } };
        }
        public PlatformTransportationKitRequestsController KitStaff(bool customer = false)
        {
            var http = new DefaultHttpContext(); http.Request.Headers["Idempotency-Key"] = Guid.NewGuid().ToString("N");
            return new(DbContext, new OrderRequestContext(DbContext, new FixedIdentityContext(customer ? customerIdentity : platformIdentity)),
                new OrderIdempotencyService(DbContext), new TransportationKitRequestService(DbContext, ContainerCatalog()))
                { ControllerContext = new() { HttpContext = http } };
        }
        private async Task CleanupTransportationRequestsAsync(Guid[] organizationIds)
        {
            var requests = await DbContext.TransportationKitRequests.Where(item => organizationIds.Contains(item.OrganizationId)).Select(item => item.Id).ToArrayAsync();
            await DbContext.OrderNotifications.Where(item => requests.Contains(item.WorkflowId)).ExecuteDeleteAsync();
            await DbContext.OrderStatusEvents.Where(item => requests.Contains(item.WorkflowId)).ExecuteDeleteAsync();
            var users = new[] { CustomerUser.Id, OtherCustomerUser.Id, PlatformUser.Id };
            await DbContext.OrderIdempotencyRecords.Where(item => users.Contains(item.ActorUserId)).ExecuteDeleteAsync();
            await DbContext.TransportationKitRequestLines.Where(item => requests.Contains(item.TransportationKitRequestId)).ExecuteDeleteAsync();
            await DbContext.TransportationKitRequests.Where(item => requests.Contains(item.Id)).ExecuteDeleteAsync();
            await DbContext.CustomerDeliveryLocations.Where(item => organizationIds.Contains(item.OrganizationId)).ExecuteDeleteAsync();
            var jobs = await DbContext.LabServiceOrders.Where(item => organizationIds.Contains(item.OrganizationId)).Select(item => item.Id).ToArrayAsync();
            await DbContext.LabSamples.Where(item => jobs.Contains(item.LabServiceOrderId)).ExecuteDeleteAsync();
            await DbContext.LabServiceQuotes.Where(item => jobs.Contains(item.LabServiceOrderId)).ExecuteDeleteAsync();
            await DbContext.LabServiceSourceGroups.Where(item => jobs.Contains(item.LabServiceOrderId)).ExecuteDeleteAsync();
            await DbContext.LabServiceOrders.Where(item => jobs.Contains(item.Id)).ExecuteDeleteAsync();
        }
    }
}
