namespace PhaenoPortal.Test;

using System.Text.Json;
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

    [PostgreSqlReferenceFact]
    public async Task AuthorizedOrderCompletesTheDatabaseBackedLabOperatorJourney()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync();
        await scope.AcceptQuoteAsync(
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

            var lab = scope.CreateLabController(staff.Identity);
            var protocolName = $"Reference library preparation {Guid.NewGuid():N}";
            var protocol = await lab.CreateProtocol(
                new CreateProtocolRequest(
                    protocolName,
                    "Database-backed verification protocol."),
                CancellationToken.None);
            Assert.Equal(
                LabIdentifierService.CreateProtocolKey(protocolName, Array.Empty<string>()),
                protocol.Key);
            protocol = await lab.CreateProtocolVersion(
                protocol.Id,
                new CreateProtocolVersionRequest(
                    """{"steps":[{"key":"prepare-library","required":true}]}""",
                    protocol.Version),
                CancellationToken.None);
            var protocolVersion = Assert.Single(protocol.Versions);
            protocolVersion = await lab.TransitionProtocol(
                protocolVersion.Id,
                new ProtocolTransitionRequest("approve"),
                CancellationToken.None);
            protocolVersion = await lab.TransitionProtocol(
                protocolVersion.Id,
                new ProtocolTransitionRequest("activate"),
                CancellationToken.None);
            Assert.Equal(LabProtocolStatus.Active.ToString(), protocolVersion.Status);

            var material = await lab.CreateMaterialLot(
                new CreateMaterialLotRequest(
                    LabMaterialLotKind.SupplierLot.ToString(),
                    $"reference-kit-{Guid.NewGuid():N}",
                    "Reference preparation kit",
                    $"lot-{Guid.NewGuid():N}",
                    "Reference supplier",
                    """{"component":"library-prep"}""",
                    DateTime.UtcNow.AddMonths(6),
                    "Freezer A",
                    100,
                    "uL"),
                CancellationToken.None);
            material = await lab.RecordMaterialQc(
                material.Id,
                new MaterialQcRequest(
                    LabQcDisposition.Passed.ToString(),
                    """{"inspection":"passed"}""",
                    material.Version),
                CancellationToken.None);

            var equipment = await lab.CreateEquipment(
                new CreateEquipmentRequest(
                    $"asset-{Guid.NewGuid():N}",
                    "Reference thermal cycler",
                    "ThermalCycler",
                    "Bench 1",
                    DateTime.UtcNow.AddDays(-1),
                    DateTime.UtcNow.AddMonths(6)),
                CancellationToken.None);

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
                    "ExternalSequencing",
                    "Reference database-backed journey."),
                CancellationToken.None);
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
                new BatchTransitionRequest("start", batch.Version),
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
                new BatchTransitionRequest("complete", batch.Version),
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
                JsonSerializer.Serialize(new[] { Guid.NewGuid() })));
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
    private sealed record LabStaffFixture(User User, ExternalIdentity Identity);

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
