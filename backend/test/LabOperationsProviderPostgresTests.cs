namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

public class LabOperationsProviderPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task AuthorizationIsAtomicIdempotentAndRejectsConflictingCommandReuse()
    {
        await using var scope = await ProviderTestScope.CreateAsync();
        var authorizationId = scope.TrackAuthorization(Guid.NewGuid());
        var organizationId = Guid.NewGuid();
        var specimenIds = new[] { Guid.NewGuid(), Guid.NewGuid() };
        var command = CreateAuthorization(
            authorizationId,
            organizationId,
            specimenIds);

        var first = await scope.Provider.AuthorizeWorkAsync(
            command,
            CancellationToken.None);
        var replay = await scope.Provider.AuthorizeWorkAsync(
            command,
            CancellationToken.None);
        var conflict = await scope.Provider.AuthorizeWorkAsync(
            command with { ServiceVersion = command.ServiceVersion + 1 },
            CancellationToken.None);

        Assert.Equal(LabCommandDisposition.Accepted, first.Disposition);
        Assert.NotNull(first.LabWorkOrderId);
        Assert.Equal(first, replay);
        Assert.Equal(LabCommandDisposition.Rejected, conflict.Disposition);
        Assert.Equal(LabCommandReasonCodes.CommandIdConflict, conflict.ReasonCode);
        Assert.Null(conflict.LabWorkOrderId);

        var workOrder = await scope.DbContext.LabWorkOrders
            .AsNoTracking()
            .SingleAsync(item => item.AuthorizationId == authorizationId);
        Assert.Equal(first.LabWorkOrderId, workOrder.Id);
        Assert.Equal(organizationId, workOrder.SubmittingOrganizationId);
        Assert.Equal(1, workOrder.CurrentAuthorizationVersion);
        Assert.Equal(
            2,
            await scope.DbContext.LabSpecimens.CountAsync(
                item => item.LabWorkOrderId == workOrder.Id));
        Assert.Equal(
            1,
            await scope.DbContext.LabWorkAuthorizationVersions.CountAsync(
                item => item.LabWorkOrderId == workOrder.Id));
        Assert.Equal(
            1,
            await scope.DbContext.LabProviderCommandReceipts.CountAsync(
                item => item.AuthorizationId == authorizationId));
    }

    [PostgreSqlReferenceFact]
    public async Task AmendmentsApplySafeChangesAndRejectStaleOrReceivedSpecimenChanges()
    {
        await using var scope = await ProviderTestScope.CreateAsync();
        var authorizationId = scope.TrackAuthorization(Guid.NewGuid());
        var retainedSpecimenId = Guid.NewGuid();
        var removedSpecimenId = Guid.NewGuid();
        var addedSpecimenId = Guid.NewGuid();
        var original = CreateAuthorization(
            authorizationId,
            Guid.NewGuid(),
            [retainedSpecimenId, removedSpecimenId]);
        var authorization = await scope.Provider.AuthorizeWorkAsync(
            original,
            CancellationToken.None);
        Assert.Equal(LabCommandDisposition.Accepted, authorization.Disposition);

        var acceptedAmendment = CreateAmendment(
            original,
            expectedVersion: 1,
            newVersion: 2,
            [retainedSpecimenId, addedSpecimenId]);
        var accepted = await scope.Provider.AmendAuthorizationAsync(
            acceptedAmendment,
            CancellationToken.None);

        Assert.Equal(LabCommandDisposition.Accepted, accepted.Disposition);
        Assert.Equal(2, accepted.AppliedAuthorizationVersion);

        scope.DbContext.ChangeTracker.Clear();
        var specimens = await scope.DbContext.LabSpecimens
            .AsNoTracking()
            .Where(item => item.LabWorkOrderId == authorization.LabWorkOrderId)
            .ToDictionaryAsync(item => item.SubmittedSpecimenId);
        Assert.Equal(3, specimens.Count);
        Assert.Equal(
            LabSpecimenIntakeDisposition.Cancelled,
            specimens[removedSpecimenId].IntakeDisposition);
        Assert.Equal(
            LabSpecimenIntakeDisposition.AwaitingReceipt,
            specimens[retainedSpecimenId].IntakeDisposition);
        Assert.Equal(
            LabSpecimenIntakeDisposition.AwaitingReceipt,
            specimens[addedSpecimenId].IntakeDisposition);

        var stale = await scope.Provider.AmendAuthorizationAsync(
            CreateAmendment(
                original,
                expectedVersion: 1,
                newVersion: 3,
                [retainedSpecimenId, addedSpecimenId]),
            CancellationToken.None);
        Assert.Equal(LabCommandDisposition.Rejected, stale.Disposition);
        Assert.Equal(
            LabCommandReasonCodes.AuthorizationVersionConflict,
            stale.ReasonCode);
        Assert.Equal(2, stale.AppliedAuthorizationVersion);

        scope.DbContext.ChangeTracker.Clear();
        var receivedSpecimen = await scope.DbContext.LabSpecimens.SingleAsync(
            item => item.LabWorkOrderId == authorization.LabWorkOrderId
                && item.SubmittedSpecimenId == retainedSpecimenId);
        receivedSpecimen.RecordReceipt(
            DateTime.UtcNow,
            receiptCondition: "Conformance fixture received intact.",
            currentLocation: "Reference intake");
        await scope.DbContext.SaveChangesAsync();
        scope.DbContext.ChangeTracker.Clear();

        var unsafeChange = await scope.Provider.AmendAuthorizationAsync(
            CreateAmendment(
                original,
                expectedVersion: 2,
                newVersion: 3,
                [addedSpecimenId]),
            CancellationToken.None);
        Assert.Equal(
            LabCommandDisposition.ManualReviewRequired,
            unsafeChange.Disposition);
        Assert.Equal(LabCommandReasonCodes.WorkAlreadyStarted, unsafeChange.ReasonCode);

        var persistedWork = await scope.DbContext.LabWorkOrders
            .AsNoTracking()
            .SingleAsync(item => item.AuthorizationId == authorizationId);
        Assert.Equal(2, persistedWork.CurrentAuthorizationVersion);
    }

    [PostgreSqlReferenceFact]
    public async Task CancellationFullyCancelsUnreceivedWorkAndPartiallyCancelsMixedIntake()
    {
        await using var scope = await ProviderTestScope.CreateAsync();

        var partialAuthorizationId = scope.TrackAuthorization(Guid.NewGuid());
        var receivedSpecimenId = Guid.NewGuid();
        var unreceivedSpecimenId = Guid.NewGuid();
        var partialCommand = CreateAuthorization(
            partialAuthorizationId,
            Guid.NewGuid(),
            [receivedSpecimenId, unreceivedSpecimenId]);
        var partialAuthorization = await scope.Provider.AuthorizeWorkAsync(
            partialCommand,
            CancellationToken.None);
        Assert.Equal(LabCommandDisposition.Accepted, partialAuthorization.Disposition);

        scope.DbContext.ChangeTracker.Clear();
        var receivedSpecimen = await scope.DbContext.LabSpecimens.SingleAsync(
            item => item.LabWorkOrderId == partialAuthorization.LabWorkOrderId
                && item.SubmittedSpecimenId == receivedSpecimenId);
        receivedSpecimen.RecordReceipt(
            DateTime.UtcNow,
            receiptCondition: null,
            currentLocation: "Reference intake");
        await scope.DbContext.SaveChangesAsync();
        scope.DbContext.ChangeTracker.Clear();

        var partial = await scope.Provider.RequestCancellationAsync(
            CreateCancellation(partialAuthorizationId, expectedVersion: 1),
            CancellationToken.None);
        Assert.Equal(
            LabCancellationDisposition.PartiallyAccepted,
            partial.Disposition);
        Assert.Equal([unreceivedSpecimenId], partial.AffectedSubmittedSpecimenIds);
        Assert.Equal(LabCommandReasonCodes.WorkAlreadyStarted, partial.ReasonCode);

        var partialWork = await scope.DbContext.LabWorkOrders
            .AsNoTracking()
            .SingleAsync(item => item.AuthorizationId == partialAuthorizationId);
        Assert.Equal(LabWorkOrderStatus.AwaitingSpecimens, partialWork.Status);
        var partialSpecimens = await scope.DbContext.LabSpecimens
            .AsNoTracking()
            .Where(item => item.LabWorkOrderId == partialWork.Id)
            .ToDictionaryAsync(item => item.SubmittedSpecimenId);
        Assert.Equal(
            LabSpecimenIntakeDisposition.Received,
            partialSpecimens[receivedSpecimenId].IntakeDisposition);
        Assert.Equal(
            LabSpecimenIntakeDisposition.Cancelled,
            partialSpecimens[unreceivedSpecimenId].IntakeDisposition);

        var fullAuthorizationId = scope.TrackAuthorization(Guid.NewGuid());
        var fullSpecimenIds = new[] { Guid.NewGuid(), Guid.NewGuid() };
        var fullAuthorization = await scope.Provider.AuthorizeWorkAsync(
            CreateAuthorization(
                fullAuthorizationId,
                Guid.NewGuid(),
                fullSpecimenIds),
            CancellationToken.None);
        Assert.Equal(LabCommandDisposition.Accepted, fullAuthorization.Disposition);

        var full = await scope.Provider.RequestCancellationAsync(
            CreateCancellation(fullAuthorizationId, expectedVersion: 1),
            CancellationToken.None);
        Assert.Equal(LabCancellationDisposition.Accepted, full.Disposition);
        Assert.Equal(
            fullSpecimenIds.OrderBy(id => id),
            full.AffectedSubmittedSpecimenIds.OrderBy(id => id));
        Assert.Null(full.ReasonCode);

        var fullWork = await scope.DbContext.LabWorkOrders
            .AsNoTracking()
            .SingleAsync(item => item.AuthorizationId == fullAuthorizationId);
        Assert.Equal(LabWorkOrderStatus.Cancelled, fullWork.Status);
        Assert.All(
            await scope.DbContext.LabSpecimens
                .AsNoTracking()
                .Where(item => item.LabWorkOrderId == fullWork.Id)
                .ToListAsync(),
            specimen => Assert.Equal(
                LabSpecimenIntakeDisposition.Cancelled,
                specimen.IntakeDisposition));
    }

    [PostgreSqlReferenceFact]
    public async Task ProjectionLookupKeepsCommercialOrganizationsIsolated()
    {
        await using var scope = await ProviderTestScope.CreateAsync();
        var customerAuthorizationId = scope.TrackAuthorization(Guid.NewGuid());
        var partnerAuthorizationId = scope.TrackAuthorization(Guid.NewGuid());
        var customerOrganizationId = Guid.NewGuid();
        var partnerOrganizationId = Guid.NewGuid();

        var customer = await scope.Provider.AuthorizeWorkAsync(
            CreateAuthorization(
                customerAuthorizationId,
                customerOrganizationId,
                [Guid.NewGuid()]),
            CancellationToken.None);
        var partner = await scope.Provider.AuthorizeWorkAsync(
            CreateAuthorization(
                partnerAuthorizationId,
                partnerOrganizationId,
                [Guid.NewGuid()]),
            CancellationToken.None);

        Assert.Equal(LabCommandDisposition.Accepted, customer.Disposition);
        Assert.Equal(LabCommandDisposition.Accepted, partner.Disposition);

        var customerProjection = await scope.Provider.GetWorkProjectionAsync(
            customerAuthorizationId,
            CancellationToken.None);
        var partnerProjection = await scope.Provider.GetWorkProjectionAsync(
            partnerAuthorizationId,
            CancellationToken.None);

        Assert.NotNull(customerProjection);
        Assert.NotNull(partnerProjection);
        Assert.Equal(customerAuthorizationId, customerProjection.AuthorizationId);
        Assert.Equal(customer.LabWorkOrderId, customerProjection.LabWorkOrderId);
        Assert.Equal(partnerAuthorizationId, partnerProjection.AuthorizationId);
        Assert.Equal(partner.LabWorkOrderId, partnerProjection.LabWorkOrderId);
        Assert.NotEqual(customerProjection.LabWorkOrderId, partnerProjection.LabWorkOrderId);
        Assert.Equal(customerProjection.Milestone, partnerProjection.Milestone);
        Assert.Equal(LabWorkMilestone.AwaitingSpecimens, customerProjection.Milestone);
        Assert.Null(await scope.Provider.GetWorkProjectionAsync(
            Guid.NewGuid(),
            CancellationToken.None));
        Assert.Null(await scope.Provider.GetWorkProjectionAsync(
            Guid.Empty,
            CancellationToken.None));

        var workOrders = await scope.DbContext.LabWorkOrders
            .AsNoTracking()
            .Where(item => item.AuthorizationId == customerAuthorizationId
                || item.AuthorizationId == partnerAuthorizationId)
            .ToDictionaryAsync(item => item.AuthorizationId);
        Assert.Equal(
            customerOrganizationId,
            workOrders[customerAuthorizationId].SubmittingOrganizationId);
        Assert.Equal(
            partnerOrganizationId,
            workOrders[partnerAuthorizationId].SubmittingOrganizationId);

        var projectionProperties = typeof(LabWorkProjection)
            .GetProperties()
            .Select(property => property.Name)
            .ToArray();
        Assert.DoesNotContain(
            projectionProperties,
            property => property.Contains("Price", StringComparison.OrdinalIgnoreCase)
                || property.Contains("Invoice", StringComparison.OrdinalIgnoreCase)
                || property.Contains("Payment", StringComparison.OrdinalIgnoreCase)
                || property.Contains("Downstream", StringComparison.OrdinalIgnoreCase)
                || property.Contains("Download", StringComparison.OrdinalIgnoreCase));
    }

    private static AuthorizeLabWorkCommand CreateAuthorization(
        Guid authorizationId,
        Guid organizationId,
        IReadOnlyList<Guid> specimenIds)
    {
        var metadata = NewMetadata();
        return new AuthorizeLabWorkCommand(
            metadata,
            authorizationId,
            AuthorizationVersion: 1,
            LabWorkAuthorizationSource.CommercialOrder,
            AuthorizationSourceId: Guid.NewGuid(),
            organizationId,
            ServiceKey: "pseq-lab",
            ServiceVersion: 1,
            TurnaroundPolicyKey: "standard",
            OpaqueSubmitterReference: null,
            specimenIds.Select(CreateSpecimen).ToList());
    }

    private static AmendLabWorkAuthorizationCommand CreateAmendment(
        AuthorizeLabWorkCommand original,
        int expectedVersion,
        int newVersion,
        IReadOnlyList<Guid> specimenIds)
    {
        var metadata = NewMetadata();
        var replacement = original with
        {
            Metadata = metadata,
            AuthorizationVersion = newVersion,
            Specimens = specimenIds.Select(CreateSpecimen).ToList()
        };
        return new AmendLabWorkAuthorizationCommand(
            metadata,
            original.AuthorizationId,
            expectedVersion,
            newVersion,
            CommercialReasonCode: "authorized_scope_changed",
            replacement);
    }

    private static RequestLabWorkCancellationCommand CreateCancellation(
        Guid authorizationId,
        int expectedVersion) =>
        new(
            NewMetadata(),
            authorizationId,
            expectedVersion,
            ReasonCode: "commercial_cancellation",
            SubmittedSpecimenIds: null);

    private static LabOperationsCommandMetadata NewMetadata() =>
        new(Guid.NewGuid(), Guid.NewGuid(), DateTime.UtcNow);

    private static AuthorizedSpecimen CreateSpecimen(Guid submittedSpecimenId) =>
        new(
            submittedSpecimenId,
            $"specimen-{submittedSpecimenId:N}",
            DeclaredMaterialType: "extracted_rna",
            DeclaredBiologicalSource: "synthetic_reference",
            DeclaredQuantity: 1,
            DeclaredQuantityUnit: "tube",
            DeclaredStorageRequirements: "frozen",
            DeclaredSafetyInformation: "No special hazards declared.",
            DeclaredCollectionDate: null,
            DeclaredConcentration: null,
            SubmissionNote: null,
            RequestedServiceKeys: ["pseq-lab"]);

    private sealed class ProviderTestScope : IAsyncDisposable
    {
        private const string ConnectionEnvironmentVariable =
            "PSEQ_OPERATIONS_REFERENCE_CONNECTION";
        private readonly HashSet<Guid> authorizationIds = [];
        private readonly string requestId;

        private ProviderTestScope(
            PSeqOperationsDbContext dbContext,
            string requestId)
        {
            DbContext = dbContext;
            Provider = new InternalLabOperationsProvider(dbContext);
            this.requestId = requestId;
        }

        public PSeqOperationsDbContext DbContext { get; }
        public InternalLabOperationsProvider Provider { get; }

        public static async Task<ProviderTestScope> CreateAsync()
        {
            var connectionString = Environment.GetEnvironmentVariable(
                ConnectionEnvironmentVariable)
                ?? throw new InvalidOperationException(
                    $"Set {ConnectionEnvironmentVariable} before running PostgreSQL reference tests.");
            var persistenceOptions = new PersistenceOptions
            {
                CommercialSchema = ReadEnvironmentVariable(
                    "PSEQ_OPERATIONS_REFERENCE_COMMERCIAL_SCHEMA",
                    "commercial_ops"),
                LaboratorySchema = ReadEnvironmentVariable(
                    "PSEQ_OPERATIONS_REFERENCE_LABORATORY_SCHEMA",
                    "lab_ops"),
                MigrationsHistorySchema = ReadEnvironmentVariable(
                    "PSEQ_OPERATIONS_REFERENCE_MIGRATIONS_HISTORY_SCHEMA",
                    "public")
            }.Validate();
            var requestId = $"lab-provider-conformance-{Guid.NewGuid():N}";
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
                Assert.True(
                    await dbContext.Database.CanConnectAsync(),
                    "The configured PostgreSQL reference database is unavailable.");
                Assert.Empty(await dbContext.Database.GetPendingMigrationsAsync());
                return new ProviderTestScope(dbContext, requestId);
            }
            catch
            {
                await dbContext.DisposeAsync();
                throw;
            }
        }

        public Guid TrackAuthorization(Guid authorizationId)
        {
            authorizationIds.Add(authorizationId);
            return authorizationId;
        }

        public async ValueTask DisposeAsync()
        {
            try
            {
                DbContext.ChangeTracker.Clear();
                var trackedAuthorizationIds = authorizationIds.ToArray();
                var workOrderIds = await DbContext.LabWorkOrders
                    .AsNoTracking()
                    .Where(item => trackedAuthorizationIds.Contains(item.AuthorizationId))
                    .Select(item => item.Id)
                    .ToArrayAsync();

                await DbContext.AuditEvents
                    .Where(item => item.RequestId == requestId)
                    .ExecuteDeleteAsync();
                await DbContext.LabProviderCommandReceipts
                    .Where(item => trackedAuthorizationIds.Contains(item.AuthorizationId))
                    .ExecuteDeleteAsync();
                await DbContext.LabWorkEvents
                    .Where(item => workOrderIds.Contains(item.LabWorkOrderId))
                    .ExecuteDeleteAsync();
                await DbContext.LabScientificApprovals
                    .Where(item => workOrderIds.Contains(item.LabWorkOrderId))
                    .ExecuteDeleteAsync();
                await DbContext.LabWorkAuthorizationVersions
                    .Where(item => workOrderIds.Contains(item.LabWorkOrderId))
                    .ExecuteDeleteAsync();
                await DbContext.LabSpecimens
                    .Where(item => workOrderIds.Contains(item.LabWorkOrderId))
                    .ExecuteDeleteAsync();
                await DbContext.LabWorkOrders
                    .Where(item => trackedAuthorizationIds.Contains(item.AuthorizationId))
                    .ExecuteDeleteAsync();
            }
            finally
            {
                await DbContext.DisposeAsync();
            }
        }

        private static string ReadEnvironmentVariable(
            string name,
            string defaultValue)
        {
            var value = Environment.GetEnvironmentVariable(name);
            return string.IsNullOrWhiteSpace(value) ? defaultValue : value;
        }
    }

    private sealed class ReferenceCurrentUserContext(string requestId)
        : ICurrentUserContext
    {
        public Guid? UserId => null;
        public Guid? OrganizationId => null;
        public string? RequestId { get; } = requestId;
    }
}

[AttributeUsage(AttributeTargets.Method)]
internal sealed class PostgreSqlReferenceFactAttribute : FactAttribute
{
    public PostgreSqlReferenceFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(
                "PSEQ_OPERATIONS_REFERENCE_CONNECTION")))
        {
            Skip = "Set PSEQ_OPERATIONS_REFERENCE_CONNECTION to run PostgreSQL reference tests.";
        }
    }
}
