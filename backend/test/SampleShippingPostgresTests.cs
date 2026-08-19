namespace PhaenoPortal.Test;

using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
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
public class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ConfigurationRevisionsClosePredecessorsAndRejectOverlappingRules()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var controller = scope.CreateConfigurationController();
        var effectiveFrom = DateTime.UtcNow.AddDays(-2);

        var destinationV1 = await controller.CreateDestination(
            scope.DestinationRequest(effectiveFrom), CancellationToken.None);
        scope.ClearTrackedState();
        var sampleTypeV1 = await controller.CreateSampleType(
            scope.SampleTypeRequest(effectiveFrom), CancellationToken.None);
        scope.ClearTrackedState();
        var ruleV1 = await controller.CreateInstructionRule(
            scope.RuleRequest(destinationV1.Id, sampleTypeV1.Id, effectiveFrom),
            CancellationToken.None);
        scope.ClearTrackedState();

        var overlap = await Assert.ThrowsAsync<OrderManagementException>(() =>
            controller.CreateInstructionRule(
                scope.RuleRequest(destinationV1.Id, sampleTypeV1.Id, effectiveFrom.AddHours(6)),
                CancellationToken.None));
        Assert.Equal("shipping_instruction_period_overlap", overlap.ErrorCode);
        scope.ClearTrackedState();

        var ruleV2EffectiveFrom = effectiveFrom.AddDays(1);
        var ruleV2 = await controller.CreateInstructionRule(
            scope.RuleRequest(
                destinationV1.Id,
                sampleTypeV1.Id,
                ruleV2EffectiveFrom,
                ruleV1.Id,
                ruleV1.Version),
            CancellationToken.None);
        scope.ClearTrackedState();
        var configurationV2EffectiveFrom = DateTime.UtcNow.AddHours(1);
        var destinationV2 = await controller.CreateDestination(
            scope.DestinationRequest(
                configurationV2EffectiveFrom,
                destinationV1.Id,
                destinationV1.Version,
                name: "Reference receiving revision 2"),
            CancellationToken.None);
        scope.ClearTrackedState();
        var sampleTypeV2 = await controller.CreateSampleType(
            scope.SampleTypeRequest(
                configurationV2EffectiveFrom,
                sampleTypeV1.Id,
                sampleTypeV1.Version,
                name: "Reference RNA revision 2"),
            CancellationToken.None);
        scope.ClearTrackedState();

        var persistedDestinationV1 = await scope.DbContext.SampleShippingDestinations
            .AsNoTracking().SingleAsync(item => item.Id == destinationV1.Id);
        var persistedSampleTypeV1 = await scope.DbContext.SampleTypeDefinitions
            .AsNoTracking().SingleAsync(item => item.Id == sampleTypeV1.Id);
        var persistedRuleV1 = await scope.DbContext.SampleShippingInstructionRules
            .AsNoTracking().SingleAsync(item => item.Id == ruleV1.Id);

        Assert.Equal(2, destinationV2.Revision);
        Assert.Equal(destinationV1.DefinitionKey, destinationV2.DefinitionKey);
        AssertUtcWithinDatabasePrecision(configurationV2EffectiveFrom, persistedDestinationV1.EffectiveTo);
        Assert.Equal(2, sampleTypeV2.Revision);
        Assert.Equal(sampleTypeV1.DefinitionKey, sampleTypeV2.DefinitionKey);
        AssertUtcWithinDatabasePrecision(configurationV2EffectiveFrom, persistedSampleTypeV1.EffectiveTo);
        Assert.Equal(2, ruleV2.Revision);
        Assert.Equal(ruleV1.DefinitionKey, ruleV2.DefinitionKey);
        AssertUtcWithinDatabasePrecision(ruleV2EffectiveFrom, persistedRuleV1.EffectiveTo);
    }

    [PostgreSqlReferenceFact]
    public async Task RegisteredTubeJourneyFreezesCrosswalkEnforcesTenantAndAdoptsBarcodeAtAccession()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync();
        var platformWorkflow = scope.CreatePlatformWorkflowController();
        var customerWorkflow = scope.CreateCustomerWorkflowController();
        var configuration = scope.CreateConfigurationController();
        var firstTubeBarcode = $"CRN-{scope.Suffix}-01";
        var correctedTubeBarcode = $"CRN-{scope.Suffix}-02";

        await platformWorkflow.CreateReturnKit(
            fixture.Shipment.Id,
            new CreateSampleReturnKitRequest(
                2,
                "Corning",
                "8676",
                "REFERENCE-LOT",
                "Therapak",
                "37806"),
            CancellationToken.None);
        scope.ClearTrackedState();
        var kit = await scope.DbContext.SampleReturnKits.AsNoTracking()
            .SingleAsync(item => item.SampleShipmentId == fixture.Shipment.Id);
        var withRegisteredTubes = await platformWorkflow.RegisterTubes(
            kit.Id,
            new RegisterSampleTubesRequest([firstTubeBarcode, correctedTubeBarcode], kit.Version),
            CancellationToken.None);
        scope.ClearTrackedState();
        Assert.NotNull(withRegisteredTubes.ReturnKit);
        var fulfilled = await platformWorkflow.FulfillReturnKit(
            kit.Id,
            new FulfillSampleReturnKitRequest(
                "Reference carrier",
                "OUTBOUND-TRACKING",
                DateTime.UtcNow,
                withRegisteredTubes.ReturnKit!.Version),
            CancellationToken.None);
        scope.ClearTrackedState();
        Assert.Equal(SampleReturnKitStatus.Fulfilled.ToString(), fulfilled.ReturnKit!.Status);

        var duplicateShipment = await scope.CreateEmptyShipmentAsync(fixture);
        await platformWorkflow.CreateReturnKit(
            duplicateShipment.Id,
            new CreateSampleReturnKitRequest(1, "Corning", "8676", null, "Therapak", "37806"),
            CancellationToken.None);
        scope.ClearTrackedState();
        var duplicateKit = await scope.DbContext.SampleReturnKits.AsNoTracking()
            .SingleAsync(item => item.SampleShipmentId == duplicateShipment.Id);
        var duplicateTube = await Assert.ThrowsAsync<OrderManagementException>(() =>
            platformWorkflow.RegisterTubes(
                duplicateKit.Id,
                new RegisterSampleTubesRequest([firstTubeBarcode], duplicateKit.Version),
                CancellationToken.None));
        Assert.Equal("supplier_tube_barcode_duplicate", duplicateTube.ErrorCode);
        scope.ClearTrackedState();

        var assigned = await customerWorkflow.AssignTube(
            fixture.Shipment.Id,
            fixture.Item.Id,
            new AssignSampleTubeRequest(firstTubeBarcode, null, fixture.Item.Version),
            CancellationToken.None);
        scope.ClearTrackedState();
        var issued = await customerWorkflow.IssuePacket(
            fixture.Shipment.Id,
            new IssueSampleShippingPacketRequest(assigned.Version, null),
            CancellationToken.None);
        scope.ClearTrackedState();
        Assert.NotNull(issued.CurrentPacket);
        var packetV1 = await scope.DbContext.SampleShippingPacketRevisions.AsNoTracking()
            .SingleAsync(item => item.Id == issued.CurrentPacket!.Id);

        using (var destinationSnapshot = JsonDocument.Parse(packetV1.DestinationSnapshotJson))
            Assert.Equal("Reference receiving", destinationSnapshot.RootElement.GetProperty("name").GetString());
        using (var instructionSnapshot = JsonDocument.Parse(packetV1.InstructionSnapshotJson))
            Assert.Contains(
                "approved absorbent",
                instructionSnapshot.RootElement.GetProperty("samples")[0]
                    .GetProperty("instructionRule").GetProperty("packingInstructions").GetString());
        Assert.Equal(firstTubeBarcode, ManifestTubeBarcode(packetV1.ManifestSnapshotJson));

        var otherTenant = scope.CreateOtherCustomerWorkflowController();
        var hidden = await Assert.ThrowsAsync<OrderManagementException>(() =>
            otherTenant.Shipment(fixture.Shipment.Id, CancellationToken.None));
        Assert.Equal("sample_shipment_not_found", hidden.ErrorCode);
        Assert.Equal(StatusCodes.Status404NotFound, hidden.StatusCode);

        var corrected = await customerWorkflow.AssignTube(
            fixture.Shipment.Id,
            fixture.Item.Id,
            new AssignSampleTubeRequest(
                correctedTubeBarcode,
                "Corrected after comparing the physical tube with the Customer record.",
                issued.Crosswalk.Single().Version),
            CancellationToken.None);
        scope.ClearTrackedState();
        Assert.NotNull(corrected.CurrentPacket);
        Assert.Equal(2, corrected.CurrentPacket!.Revision);

        scope.DbContext.ChangeTracker.Clear();
        var packets = await scope.DbContext.SampleShippingPacketRevisions.AsNoTracking()
            .Where(item => item.SampleShipmentId == fixture.Shipment.Id)
            .OrderBy(item => item.Revision)
            .ToListAsync();
        Assert.Equal(2, packets.Count);
        Assert.True(packets[0].IsVoided);
        Assert.Equal(packets[1].Id, packets[0].ReplacedByPacketRevisionId);
        Assert.Equal(firstTubeBarcode, ManifestTubeBarcode(packets[0].ManifestSnapshotJson));
        Assert.Equal(correctedTubeBarcode, ManifestTubeBarcode(packets[1].ManifestSnapshotJson));
        var assignmentActions = await scope.DbContext.SampleTubeAssignmentEvents.AsNoTracking()
            .Where(item => item.SampleShipmentId == fixture.Shipment.Id)
            .Select(item => item.Action)
            .ToListAsync();
        Assert.Equal(3, assignmentActions.Count);
        Assert.Contains(SampleTubeAssignmentAction.Assigned, assignmentActions);
        Assert.Contains(SampleTubeAssignmentAction.Cleared, assignmentActions);
        Assert.Contains(SampleTubeAssignmentAction.Reassigned, assignmentActions);

        var csvResult = Assert.IsType<FileContentResult>(
            await customerWorkflow.CrosswalkCsv(fixture.Shipment.Id, CancellationToken.None));
        var csv = Encoding.UTF8.GetString(csvResult.FileContents);
        Assert.Contains(fixture.Item.CustomerSampleId, csv);
        Assert.Contains(correctedTubeBarcode, csv);
        Assert.DoesNotContain(firstTubeBarcode, csv);

        var malformedPacket = await Assert.ThrowsAsync<OrderManagementException>(() =>
            platformWorkflow.ScanTube("not-a-packet", correctedTubeBarcode, CancellationToken.None));
        Assert.Equal("sample_shipping_barcode_invalid", malformedPacket.ErrorCode);
        var unknownPacket = await Assert.ThrowsAsync<OrderManagementException>(() =>
            platformWorkflow.ScanTube(
                SampleShippingBarcode.Create(), correctedTubeBarcode, CancellationToken.None));
        Assert.Equal("sample_shipping_packet_not_found", unknownPacket.ErrorCode);
        Assert.Equal("PacketVoided", (await platformWorkflow.ScanTube(
            packets[0].Barcode, correctedTubeBarcode, CancellationToken.None)).Outcome);
        Assert.Equal("TubeNotRegistered", (await platformWorkflow.ScanTube(
            packets[1].Barcode, $"UNKNOWN-{scope.Suffix}", CancellationToken.None)).Outcome);
        Assert.Equal("TubeNotExpectedForPacket", (await platformWorkflow.ScanTube(
            packets[1].Barcode, firstTubeBarcode, CancellationToken.None)).Outcome);
        Assert.Equal("Expected", (await platformWorkflow.ScanTube(
            packets[1].Barcode, correctedTubeBarcode, CancellationToken.None)).Outcome);

        var packetScanBeforeReceipt = await configuration.ScanPacket(
            packets[1].Barcode, CancellationToken.None);
        Assert.Equal(fixture.WorkOrder.Id, packetScanBeforeReceipt.LabWorkOrderId);
        Assert.Equal("AwaitingReceipt", packetScanBeforeReceipt.ReceiptState);

        var lab = scope.CreateLabController();
        var received = await lab.ReceiveSpecimen(
            fixture.WorkOrder.Id,
            fixture.Specimen.Id,
            new SpecimenReceiptRequest(DateTime.UtcNow, "Frozen and intact", "Intake", fixture.Specimen.Version),
            CancellationToken.None);
        scope.ClearTrackedState();
        var receivedSpecimen = received.Specimens.Single(item => item.Id == fixture.Specimen.Id);
        var accessioned = await lab.AccessionSpecimen(
            fixture.WorkOrder.Id,
            fixture.Specimen.Id,
            new SpecimenAccessionRequest(
                "ACC-REFERENCE-001",
                fixture.Item.CustomerSampleId,
                "Intake freezer",
                fixture.Item.Quantity,
                fixture.Item.QuantityUnit,
                null,
                receivedSpecimen.Version,
                packets[1].Barcode,
                correctedTubeBarcode),
            CancellationToken.None);
        scope.ClearTrackedState();
        var container = Assert.Single(accessioned.Containers);
        Assert.Equal(correctedTubeBarcode, container.Barcode);
        Assert.Equal(LabContainerBarcodeSource.RegisteredSupplier.ToString(), container.BarcodeSource);
        Assert.NotNull(container.ExternalBarcodeReferenceId);
        Assert.Equal("AlreadyAccessioned", (await platformWorkflow.ScanTube(
            packets[1].Barcode, correctedTubeBarcode, CancellationToken.None)).Outcome);

        var accessionedSpecimen = accessioned.Specimens.Single(item => item.Id == fixture.Specimen.Id);
        var repeatedAccession = await Assert.ThrowsAsync<OrderManagementException>(() =>
            lab.AccessionSpecimen(
                fixture.WorkOrder.Id,
                fixture.Specimen.Id,
                new SpecimenAccessionRequest(
                    "ACC-REFERENCE-002",
                    fixture.Item.CustomerSampleId,
                    "Intake freezer",
                    fixture.Item.Quantity,
                    fixture.Item.QuantityUnit,
                    null,
                    accessionedSpecimen.Version,
                    packets[1].Barcode,
                    correctedTubeBarcode),
                CancellationToken.None));
        Assert.Equal("lab_transition_not_allowed", repeatedAccession.ErrorCode);
        Assert.Equal(1, await scope.DbContext.LabContainers.AsNoTracking()
            .CountAsync(item => item.LabWorkOrderId == fixture.WorkOrder.Id));

        var packetScanAfterReceipt = await configuration.ScanPacket(
            packets[1].Barcode, CancellationToken.None);
        Assert.Equal("ReceiptRecorded", packetScanAfterReceipt.ReceiptState);
    }

    [PostgreSqlReferenceFact]
    public async Task ConcurrentPacketIssuePersistsOnlyOneFirstRevision()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync();
        var platformWorkflow = scope.CreatePlatformWorkflowController();
        var customerWorkflow = scope.CreateCustomerWorkflowController();
        var tubeBarcode = $"CRN-{scope.Suffix}-RACE";

        await platformWorkflow.CreateReturnKit(
            fixture.Shipment.Id,
            new CreateSampleReturnKitRequest(1, "Corning", "8676", null, "Therapak", "37806"),
            CancellationToken.None);
        scope.ClearTrackedState();
        var kit = await scope.DbContext.SampleReturnKits.AsNoTracking()
            .SingleAsync(item => item.SampleShipmentId == fixture.Shipment.Id);
        var registered = await platformWorkflow.RegisterTubes(
            kit.Id,
            new RegisterSampleTubesRequest([tubeBarcode], kit.Version),
            CancellationToken.None);
        scope.ClearTrackedState();
        var fulfilled = await platformWorkflow.FulfillReturnKit(
            kit.Id,
            new FulfillSampleReturnKitRequest(
                "Reference carrier", "OUTBOUND-RACE", DateTime.UtcNow, registered.ReturnKit!.Version),
            CancellationToken.None);
        scope.ClearTrackedState();
        var assigned = await customerWorkflow.AssignTube(
            fixture.Shipment.Id,
            fixture.Item.Id,
            new AssignSampleTubeRequest(tubeBarcode, null, fulfilled.Crosswalk.Single().Version),
            CancellationToken.None);
        scope.ClearTrackedState();

        await using var firstContext = scope.CreateAdditionalContext();
        await using var secondContext = scope.CreateAdditionalContext();
        var issuedAt = DateTime.UtcNow;
        var outcomes = await Task.WhenAll(
            CaptureAsync(() => new SampleShippingPacketService(firstContext).IssueAsync(
                fixture.Shipment.Id, assigned.Version, issuedAt, null, CancellationToken.None)),
            CaptureAsync(() => new SampleShippingPacketService(secondContext).IssueAsync(
                fixture.Shipment.Id, assigned.Version, issuedAt, null, CancellationToken.None)));

        Assert.Single(outcomes, outcome => outcome is null);
        var failure = Assert.Single(outcomes, outcome => outcome is not null);
        Assert.True(failure is OrderManagementException or DbUpdateException,
            $"Unexpected concurrent packet failure: {failure!.GetType().Name}");
        Assert.Equal(1, await scope.DbContext.SampleShippingPacketRevisions.AsNoTracking()
            .CountAsync(item => item.SampleShipmentId == fixture.Shipment.Id));
        Assert.Equal(1, await scope.DbContext.SampleShippingPacketRevisions.AsNoTracking()
            .Where(item => item.SampleShipmentId == fixture.Shipment.Id)
            .Select(item => item.Revision)
            .SingleAsync());
    }

    private static string? ManifestTubeBarcode(string manifestJson)
    {
        using var manifest = JsonDocument.Parse(manifestJson);
        return manifest.RootElement.GetProperty("samples")[0]
            .GetProperty("supplierTubeBarcode").GetString();
    }

    private static void AssertUtcWithinDatabasePrecision(DateTime expected, DateTime? actual)
    {
        Assert.NotNull(actual);
        Assert.InRange((expected - actual!.Value).Duration(), TimeSpan.Zero, TimeSpan.FromTicks(9));
    }

    private static async Task<Exception?> CaptureAsync(Func<Task> action)
    {
        try
        {
            await action();
            return null;
        }
        catch (Exception exception)
        {
            return exception;
        }
    }

    private sealed class ShippingTestScope : IAsyncDisposable
    {
        private const string ConnectionEnvironmentVariable = "PSEQ_OPERATIONS_REFERENCE_CONNECTION";
        private readonly string connectionString;
        private readonly PersistenceOptions persistenceOptions;
        private readonly string requestId;
        private readonly ExternalIdentity customerIdentity;
        private readonly ExternalIdentity otherCustomerIdentity;
        private readonly ExternalIdentity platformIdentity;

        private ShippingTestScope(
            string connectionString,
            PersistenceOptions persistenceOptions,
            PSeqOperationsDbContext dbContext,
            string suffix,
            string requestId,
            Organization customerOrganization,
            Organization otherCustomerOrganization,
            Organization platformOrganization,
            User customerUser,
            User otherCustomerUser,
            User platformUser,
            ExternalIdentity customerIdentity,
            ExternalIdentity otherCustomerIdentity,
            ExternalIdentity platformIdentity)
        {
            this.connectionString = connectionString;
            this.persistenceOptions = persistenceOptions;
            this.requestId = requestId;
            this.customerIdentity = customerIdentity;
            this.otherCustomerIdentity = otherCustomerIdentity;
            this.platformIdentity = platformIdentity;
            DbContext = dbContext;
            Suffix = suffix;
            CustomerOrganization = customerOrganization;
            OtherCustomerOrganization = otherCustomerOrganization;
            PlatformOrganization = platformOrganization;
            CustomerUser = customerUser;
            OtherCustomerUser = otherCustomerUser;
            PlatformUser = platformUser;
        }

        public PSeqOperationsDbContext DbContext { get; }
        public string Suffix { get; }
        public Organization CustomerOrganization { get; }
        public Organization OtherCustomerOrganization { get; }
        public Organization PlatformOrganization { get; }
        public User CustomerUser { get; }
        public User OtherCustomerUser { get; }
        public User PlatformUser { get; }

        public void ClearTrackedState() => DbContext.ChangeTracker.Clear();

        public static async Task<ShippingTestScope> CreateAsync()
        {
            var connectionString = Environment.GetEnvironmentVariable(ConnectionEnvironmentVariable)
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
            var suffix = Guid.NewGuid().ToString("N")[..10].ToUpperInvariant();
            var requestId = $"sample-shipping-reference-{suffix}";
            var dbContext = CreateDbContext(connectionString, persistenceOptions, requestId);
            try
            {
                Assert.True(await dbContext.Database.CanConnectAsync());
                Assert.Empty(await dbContext.Database.GetPendingMigrationsAsync());

                var customerOrganization = new Organization(
                    $"Shipping customer {suffix}", OrganizationKind.Customer);
                var otherCustomerOrganization = new Organization(
                    $"Other shipping customer {suffix}", OrganizationKind.Customer);
                var platformOrganization = new Organization(
                    $"Shipping Phaeno {suffix}", OrganizationKind.Phaeno);
                var customerIdentity = Identity("customer", suffix);
                var otherCustomerIdentity = Identity("other-customer", suffix);
                var platformIdentity = Identity("platform", suffix);
                var customerUser = CreateUser(customerIdentity);
                var otherCustomerUser = CreateUser(otherCustomerIdentity);
                var platformUser = CreateUser(platformIdentity);

                dbContext.AddRange(
                    customerOrganization,
                    otherCustomerOrganization,
                    platformOrganization,
                    customerUser,
                    otherCustomerUser,
                    platformUser,
                    new OrganizationMembership(customerUser.Id, customerOrganization.Id, true),
                    new OrganizationMembership(otherCustomerUser.Id, otherCustomerOrganization.Id, true),
                    new OrganizationMembership(platformUser.Id, platformOrganization.Id, true));
                await dbContext.SaveChangesAsync();

                return new ShippingTestScope(
                    connectionString,
                    persistenceOptions,
                    dbContext,
                    suffix,
                    requestId,
                    customerOrganization,
                    otherCustomerOrganization,
                    platformOrganization,
                    customerUser,
                    otherCustomerUser,
                    platformUser,
                    customerIdentity,
                    otherCustomerIdentity,
                    platformIdentity);
            }
            catch
            {
                await dbContext.DisposeAsync();
                throw;
            }
        }

        public SampleShippingDestinationWriteRequest DestinationRequest(
            DateTime effectiveFrom,
            Guid? supersedesId = null,
            long? supersededVersion = null,
            string name = "Reference receiving") => new(
                supersedesId,
                supersededVersion,
                $"REF_{Suffix}_DEST",
                name,
                "Sample Receiving",
                "Phaeno",
                "123 Reference Street",
                null,
                "Irvine",
                "CA",
                "92617",
                "US",
                "+1 555 010 0000",
                "receiving@example.test",
                "Monday-Friday, 8:00 AM-4:00 PM",
                "America/Los_Angeles",
                "Do not deliver during closures.",
                "Deliver to Sample Receiving.",
                "Use a traceable carrier service.",
                false,
                effectiveFrom,
                true);

        public SampleTypeDefinitionWriteRequest SampleTypeRequest(
            DateTime effectiveFrom,
            Guid? supersedesId = null,
            long? supersededVersion = null,
            string name = "Reference RNA") => new(
                supersedesId,
                supersededVersion,
                $"REF_{Suffix}_RNA",
                name,
                "Reference extracted RNA definition.",
                "Nucleic acid",
                1,
                100,
                "uL",
                "Use the Phaeno-supplied sealed tube.",
                "Keep frozen.",
                null,
                "Use approved secondary containment.",
                "Use only the Customer sample identifier.",
                "Do not include direct identifiers.",
                "Declare hazards before shipping.",
                null,
                48,
                effectiveFrom,
                true);

        public SampleShippingInstructionRuleWriteRequest RuleRequest(
            Guid destinationId,
            Guid sampleTypeId,
            DateTime effectiveFrom,
            Guid? supersedesId = null,
            long? supersededVersion = null) => new(
                supersedesId,
                supersededVersion,
                destinationId,
                sampleTypeId,
                $"REF_{Suffix}_FROZEN",
                "Pack with approved absorbent and secondary containment.",
                "Keep frozen using the approved method.",
                "Use an approved traceable carrier service.",
                "Dispatch only for an open receiving window.",
                "Deliver to Sample Receiving.",
                "Include the current shipment packet.",
                "Contact Phaeno if delayed or damaged.",
                null,
                false,
                effectiveFrom,
                true);

        public async Task<ShippingFixture> CreateShipmentAsync()
        {
            var effectiveFrom = DateTime.UtcNow.AddDays(-1);
            var controller = CreateConfigurationController();
            var destination = await controller.CreateDestination(
                DestinationRequest(effectiveFrom), CancellationToken.None);
            ClearTrackedState();
            var sampleType = await controller.CreateSampleType(
                SampleTypeRequest(effectiveFrom), CancellationToken.None);
            ClearTrackedState();
            await controller.CreateInstructionRule(
                RuleRequest(destination.Id, sampleType.Id, effectiveFrom), CancellationToken.None);
            ClearTrackedState();

            var authorizationSourceId = Guid.NewGuid();
            var workOrder = new LabWorkOrder(
                Guid.NewGuid(),
                1,
                LabAuthorizationSource.CommercialOrder,
                authorizationSourceId,
                CustomerOrganization.Id,
                "reference-service",
                1,
                "reference-turnaround",
                $"PROMO-{Suffix}");
            var specimen = new LabSpecimen(workOrder.Id, Guid.NewGuid());
            workOrder.Specimens.Add(specimen);
            var shipment = new SampleShipment(
                $"SS-{Suffix}-{Guid.NewGuid():N}"[..30],
                CustomerOrganization.Id,
                SampleShipmentAuthorizationSource.CustomerPromotionalOrder,
                authorizationSourceId,
                $"PROMO-{Suffix}",
                "Reference promotional authorization",
                workOrder.Id,
                destination.Id);
            var item = new SampleShipmentItem(
                shipment.Id,
                specimen.SubmittedSpecimenId,
                sampleType.Id,
                $"CUSTOMER-{Suffix}",
                "Reference sample",
                20,
                "uL");
            shipment.Items.Add(item);
            DbContext.AddRange(workOrder, shipment);
            await DbContext.SaveChangesAsync();
            ClearTrackedState();
            return new ShippingFixture(destination, sampleType, workOrder, specimen, shipment, item);
        }

        public async Task<SampleShipment> CreateEmptyShipmentAsync(ShippingFixture fixture)
        {
            var shipment = new SampleShipment(
                $"SS-{Suffix}-{Guid.NewGuid():N}"[..30],
                CustomerOrganization.Id,
                SampleShipmentAuthorizationSource.CustomerPromotionalOrder,
                fixture.Shipment.AuthorizationSourceId,
                $"PROMO-{Suffix}-DUP",
                "Reference duplicate-kit check",
                fixture.WorkOrder.Id,
                fixture.Destination.Id);
            DbContext.SampleShipments.Add(shipment);
            await DbContext.SaveChangesAsync();
            ClearTrackedState();
            return shipment;
        }

        public SampleShippingAdminController CreateConfigurationController() => new(
            DbContext,
            new OrderRequestContext(DbContext, new FixedIdentityContext(platformIdentity)),
            new SampleShippingWorkflowReader(DbContext))
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

        public SampleShippingWorkflowAdminController CreatePlatformWorkflowController() => new(
            DbContext,
            new OrderRequestContext(DbContext, new FixedIdentityContext(platformIdentity)),
            new SampleShippingWorkflowReader(DbContext))
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

        public SampleShippingWorkflowController CreateCustomerWorkflowController() =>
            CreateCustomerWorkflowController(customerIdentity, CustomerOrganization.Id);

        public SampleShippingWorkflowController CreateOtherCustomerWorkflowController() =>
            CreateCustomerWorkflowController(otherCustomerIdentity, OtherCustomerOrganization.Id);

        public LabOperationsController CreateLabController() => new(
            DbContext,
            new LabOperationsRequestContext(DbContext, new FixedIdentityContext(platformIdentity)))
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

        public PSeqOperationsDbContext CreateAdditionalContext() =>
            CreateDbContext(connectionString, persistenceOptions, requestId);

        private SampleShippingWorkflowController CreateCustomerWorkflowController(
            ExternalIdentity identity,
            Guid organizationId)
        {
            var httpContext = new DefaultHttpContext();
            httpContext.Request.Headers["X-Organization-Id"] = organizationId.ToString();
            return new SampleShippingWorkflowController(
                DbContext,
                new OrderRequestContext(DbContext, new FixedIdentityContext(identity)),
                new SampleShippingPacketService(DbContext),
                new SampleShippingWorkflowReader(DbContext))
            {
                ControllerContext = new ControllerContext { HttpContext = httpContext }
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
                    OtherCustomerOrganization.Id,
                    PlatformOrganization.Id
                };
                var shipmentIds = await DbContext.SampleShipments
                    .Where(item => organizationIds.Contains(item.OrganizationId))
                    .Select(item => item.Id)
                    .ToArrayAsync();
                var workOrderIds = await DbContext.LabWorkOrders
                    .Where(item => organizationIds.Contains(item.SubmittingOrganizationId))
                    .Select(item => item.Id)
                    .ToArrayAsync();
                var kitIds = await DbContext.SampleReturnKits
                    .Where(item => shipmentIds.Contains(item.SampleShipmentId))
                    .Select(item => item.Id)
                    .ToArrayAsync();
                var destinationIds = await DbContext.SampleShippingDestinations
                    .Where(item => item.Code == $"REF_{Suffix}_DEST")
                    .Select(item => item.Id)
                    .ToArrayAsync();
                var sampleTypeIds = await DbContext.SampleTypeDefinitions
                    .Where(item => item.Code == $"REF_{Suffix}_RNA")
                    .Select(item => item.Id)
                    .ToArrayAsync();

                await DbContext.LabWorkEvents.Where(item => workOrderIds.Contains(item.LabWorkOrderId)).ExecuteDeleteAsync();
                await DbContext.LabContainers.Where(item => workOrderIds.Contains(item.LabWorkOrderId)).ExecuteDeleteAsync();
                await DbContext.SampleTubeAssignmentEvents.Where(item => shipmentIds.Contains(item.SampleShipmentId)).ExecuteDeleteAsync();
                await DbContext.SampleShippingPacketRevisions
                    .Where(item => shipmentIds.Contains(item.SampleShipmentId) && item.ReplacedByPacketRevisionId != null)
                    .ExecuteDeleteAsync();
                await DbContext.SampleShippingPacketRevisions.Where(item => shipmentIds.Contains(item.SampleShipmentId)).ExecuteDeleteAsync();
                await DbContext.SampleShipmentItems.Where(item => shipmentIds.Contains(item.SampleShipmentId)).ExecuteDeleteAsync();
                await DbContext.RegisteredSampleTubes.Where(item => kitIds.Contains(item.SampleReturnKitId)).ExecuteDeleteAsync();
                await DbContext.SampleReturnKits.Where(item => kitIds.Contains(item.Id)).ExecuteDeleteAsync();
                await DbContext.SampleShipments.Where(item => shipmentIds.Contains(item.Id)).ExecuteDeleteAsync();
                await DbContext.LabSpecimens.Where(item => workOrderIds.Contains(item.LabWorkOrderId)).ExecuteDeleteAsync();
                await DbContext.LabWorkOrders.Where(item => workOrderIds.Contains(item.Id)).ExecuteDeleteAsync();

                var rules = await DbContext.SampleShippingInstructionRules
                    .Where(item => destinationIds.Contains(item.DestinationId)
                        || sampleTypeIds.Contains(item.SampleTypeDefinitionId))
                    .OrderByDescending(item => item.Revision)
                    .ToListAsync();
                DbContext.SampleShippingInstructionRules.RemoveRange(rules);
                await DbContext.SaveChangesAsync();
                var sampleTypes = await DbContext.SampleTypeDefinitions
                    .Where(item => sampleTypeIds.Contains(item.Id))
                    .OrderByDescending(item => item.Revision)
                    .ToListAsync();
                DbContext.SampleTypeDefinitions.RemoveRange(sampleTypes);
                await DbContext.SaveChangesAsync();
                var destinations = await DbContext.SampleShippingDestinations
                    .Where(item => destinationIds.Contains(item.Id))
                    .OrderByDescending(item => item.Revision)
                    .ToListAsync();
                DbContext.SampleShippingDestinations.RemoveRange(destinations);
                await DbContext.SaveChangesAsync();

                await DbContext.AuditEvents.Where(item => item.RequestId == requestId).ExecuteDeleteAsync();
                await DbContext.OrganizationMemberships
                    .Where(item => organizationIds.Contains(item.OrganizationId)).ExecuteDeleteAsync();
                var userIds = new[] { CustomerUser.Id, OtherCustomerUser.Id, PlatformUser.Id };
                await DbContext.Users.Where(item => userIds.Contains(item.Id)).ExecuteDeleteAsync();
                await DbContext.Organizations.Where(item => organizationIds.Contains(item.Id)).ExecuteDeleteAsync();
            }
            finally
            {
                await DbContext.DisposeAsync();
            }
        }

        private static PSeqOperationsDbContext CreateDbContext(
            string connectionString,
            PersistenceOptions persistenceOptions,
            string requestId)
        {
            var dbOptions = new DbContextOptionsBuilder<PSeqOperationsDbContext>()
                .UseNpgsql(
                    connectionString,
                    npgsql => npgsql.MigrationsHistoryTable(
                        persistenceOptions.MigrationsHistoryTable,
                        persistenceOptions.MigrationsHistorySchema))
                .AddInterceptors(new AuditSaveChangesInterceptor(
                    new ReferenceCurrentUserContext(requestId)))
                .Options;
            return new PSeqOperationsDbContext(dbOptions, Options.Create(persistenceOptions));
        }

        private static ExternalIdentity Identity(string role, string suffix) => new(
            "test", $"{role}-{suffix}", $"{role}-{suffix}@example.com", true);

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

    private sealed record ShippingFixture(
        SampleShippingDestinationDto Destination,
        SampleTypeDefinitionDto SampleType,
        LabWorkOrder WorkOrder,
        LabSpecimen Specimen,
        SampleShipment Shipment,
        SampleShipmentItem Item);

    private sealed class FixedIdentityContext(ExternalIdentity identity) : IExternalIdentityContext
    {
        public ExternalIdentity? Read(HttpContext httpContext) => identity;
    }

    private sealed class ReferenceCurrentUserContext(string requestId) : ICurrentUserContext
    {
        public Guid? UserId => null;
        public Guid? OrganizationId => null;
        public string? RequestId { get; } = requestId;
    }
}
