namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Commercial.LabOperations.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

public class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task QuoteAcceptanceAtomicallyCreatesCommercialAuthorizationAndLabWork()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync();

        var response = await scope.AcceptQuoteAsync(
            fixture,
            new InternalLabOperationsProvider(scope.DbContext));

        scope.DbContext.ChangeTracker.Clear();
        var authorization = await scope.DbContext.CommercialLabAuthorizations
            .AsNoTracking()
            .SingleAsync(item => item.CommercialOrderId == fixture.OrderId);
        var work = await scope.DbContext.LabWorkOrders
            .AsNoTracking()
            .SingleAsync(item => item.AuthorizationId == authorization.AuthorizationId);
        Assert.Equal(LabServiceOrderStatus.PlacedAwaitingSamples.ToString(), response.Status);
        Assert.Equal(CommercialLabAuthorizationStatus.Accepted, authorization.Status);
        Assert.Equal(work.Id, authorization.LabWorkOrderId);
        Assert.Equal(scope.CustomerOrganization.Id, work.SubmittingOrganizationId);
        Assert.Equal(1, await scope.DbContext.LabSpecimens
            .CountAsync(item => item.LabWorkOrderId == work.Id));
        Assert.Equal(1, await scope.DbContext.LabOperationsOutboxEvents
            .CountAsync(item => item.AuthorizationId == authorization.AuthorizationId));
        Assert.Equal(1, await scope.DbContext.LabProviderCommandReceipts
            .CountAsync(item => item.AuthorizationId == authorization.AuthorizationId));
    }

    [PostgreSqlReferenceFact]
    public async Task ProviderRejectionRollsBackAlreadyPersistedCommercialAndLabChanges()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync();

        var exception = await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.AcceptQuoteAsync(
                fixture,
                new PersistingRejectingProvider(scope.DbContext)));

        Assert.Equal("lab_authorization_failed", exception.ErrorCode);
        scope.DbContext.ChangeTracker.Clear();
        var order = await scope.DbContext.LabServiceOrders
            .AsNoTracking()
            .SingleAsync(item => item.Id == fixture.OrderId);
        var quote = await scope.DbContext.LabServiceQuotes
            .AsNoTracking()
            .SingleAsync(item => item.Id == fixture.QuoteId);
        Assert.Equal(LabServiceOrderStatus.QuoteIssued, order.Status);
        Assert.Equal(QuoteStatus.Issued, quote.Status);
        Assert.Empty(await scope.DbContext.CommercialLabAuthorizations
            .Where(item => item.CommercialOrderId == fixture.OrderId)
            .ToListAsync());
        Assert.Empty(await scope.DbContext.LabWorkOrders
            .Where(item => item.AuthorizationSourceId == fixture.OrderId)
            .ToListAsync());
        Assert.Empty(await scope.DbContext.OrderIdempotencyRecords
            .Where(item => item.ActorUserId == scope.CustomerUser.Id)
            .ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task ApprovedCancellationCommitsOnlyAfterLabAcceptsTheHandoff()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync();
        var accepted = await scope.AcceptQuoteAsync(
            fixture,
            new InternalLabOperationsProvider(scope.DbContext));
        var cancellation = await scope.RequestCancellationAsync(
            fixture.OrderId,
            accepted.Version);

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
        var accepted = await scope.AcceptQuoteAsync(
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
            accepted.Version);

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

    private sealed class HandoffTestScope : IAsyncDisposable
    {
        private const string ConnectionEnvironmentVariable =
            "PSEQ_OPERATIONS_REFERENCE_CONNECTION";
        private readonly string requestId;
        private readonly ExternalIdentity customerIdentity;
        private readonly ExternalIdentity platformIdentity;

        private HandoffTestScope(
            PSeqOperationsDbContext dbContext,
            Organization customerOrganization,
            User customerUser,
            User platformUser,
            ExternalIdentity customerIdentity,
            ExternalIdentity platformIdentity,
            string requestId)
        {
            DbContext = dbContext;
            CustomerOrganization = customerOrganization;
            CustomerUser = customerUser;
            PlatformUser = platformUser;
            this.customerIdentity = customerIdentity;
            this.platformIdentity = platformIdentity;
            this.requestId = requestId;
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
                return new HandoffTestScope(
                    dbContext,
                    customerOrganization,
                    customerUser,
                    platformUser,
                    customerIdentity,
                    platformIdentity,
                    requestId);
            }
            catch
            {
                await dbContext.DisposeAsync();
                throw;
            }
        }

        public async Task<QuotedOrderFixture> CreateQuotedOrderAsync()
        {
            var now = DateTime.UtcNow;
            var order = new LabServiceOrder(
                CustomerOrganization.Id,
                OrderNumberGenerator.Lab(),
                "reference-handoff",
                "Ship frozen");
            order.Samples.Add(new LabSample(
                order.Id,
                $"sample-{Guid.NewGuid():N}",
                "extracted_rna",
                "synthetic_reference",
                1,
                "tube",
                "frozen",
                "No special hazards declared.",
                null,
                null,
                null,
                "[]"));
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

        public async Task<LabServiceOrderDto> AcceptQuoteAsync(
            QuotedOrderFixture fixture,
            ILabOperationsProvider provider)
        {
            var controller = CreateCustomerController(provider, Guid.NewGuid().ToString("N"));
            return await controller.AcceptQuote(
                fixture.OrderId,
                fixture.QuoteId,
                new AcceptQuoteRequest(fixture.OrderVersion, fixture.QuoteId),
                CancellationToken.None);
        }

        public async Task<CancellationFixture> RequestCancellationAsync(
            Guid orderId,
            long orderVersion)
        {
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

        private LabServiceOrdersController CreateCustomerController(
            ILabOperationsProvider provider,
            string idempotencyKey)
        {
            var httpContext = new DefaultHttpContext();
            httpContext.Request.Headers["X-Organization-Id"] = CustomerOrganization.Id.ToString();
            httpContext.Request.Headers["Idempotency-Key"] = idempotencyKey;
            return new LabServiceOrdersController(
                DbContext,
                new OrderRequestContext(DbContext, new FixedIdentityContext(customerIdentity)),
                new OrderIdempotencyService(DbContext),
                NullOperationalFileStorage.Instance,
                provider)
            {
                ControllerContext = new ControllerContext { HttpContext = httpContext }
            };
        }

        private PlatformLabServiceOrdersController CreatePlatformController(
            ILabOperationsProvider provider) =>
            new(
                DbContext,
                new OrderRequestContext(DbContext, new FixedIdentityContext(platformIdentity)),
                new OrderIdempotencyService(DbContext),
                NullOperationalFileStorage.Instance,
                NullOperationalFileScanner.Instance,
                Options.Create(new OrderManagementOptions()),
                provider)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext()
                }
            };

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

                await DbContext.AuditEvents.Where(item => item.RequestId == requestId).ExecuteDeleteAsync();
                await DbContext.LabOperationsEventReceipts.Where(item => authorizationIds.Contains(item.AuthorizationId)).ExecuteDeleteAsync();
                await DbContext.CommercialLabWorkProjections.Where(item => authorizationIds.Contains(item.AuthorizationId)).ExecuteDeleteAsync();
                await DbContext.LabProviderCommandReceipts.Where(item => authorizationIds.Contains(item.AuthorizationId)).ExecuteDeleteAsync();
                await DbContext.LabOperationsOutboxEvents.Where(item => authorizationIds.Contains(item.AuthorizationId)).ExecuteDeleteAsync();
                await DbContext.LabWorkEvents.Where(item => workOrderIds.Contains(item.LabWorkOrderId)).ExecuteDeleteAsync();
                await DbContext.LabScientificApprovals.Where(item => workOrderIds.Contains(item.LabWorkOrderId)).ExecuteDeleteAsync();
                await DbContext.LabWorkAuthorizationVersions.Where(item => workOrderIds.Contains(item.LabWorkOrderId)).ExecuteDeleteAsync();
                await DbContext.LabSpecimens.Where(item => workOrderIds.Contains(item.LabWorkOrderId)).ExecuteDeleteAsync();
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
                await DbContext.LabServiceOrders.Where(item => orderIds.Contains(item.Id)).ExecuteDeleteAsync();
                await DbContext.OrganizationMemberships.Where(item => organizationIds.Contains(item.OrganizationId)).ExecuteDeleteAsync();
                await DbContext.Users.Where(item => item.Id == CustomerUser.Id || item.Id == PlatformUser.Id).ExecuteDeleteAsync();
                await DbContext.Organizations.Where(item => organizationIds.Contains(item.Id)).ExecuteDeleteAsync();
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
