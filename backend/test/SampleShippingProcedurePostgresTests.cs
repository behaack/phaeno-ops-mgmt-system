namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task SharedProcedureAndContainerAmountsSaveIssueAndRemainFrozenAfterRevision()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync();
        var request = new SampleShippingProcedureWriteRequest(null, null, $"PACK-{scope.Suffix}-PROCEDURE",
            "Synthetic shared packing steps", "Follow the selected container's approved method.",
            "Synthetic carrier", "Synthetic dispatch window", "Include the insert", "Contact receiving", null, true);
        var denied = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ProcedureController(true).Create(request, default));
        Assert.Equal(403, denied.StatusCode);
        var procedure = await scope.ProcedureController().Create(request, default);
        scope.ClearTrackedState();
        var previous = await scope.DbContext.SampleShippingInstructionRules.AsNoTracking()
            .SingleAsync(value => value.SampleTypeDefinitionId == fixture.SampleType.Id);
        var assignment = await scope.CreateConfigurationController().CreateInstructionRule(
            scope.RuleRequest(fixture.Destination.Id, fixture.SampleType.Id, DateTime.UtcNow.AddHours(-2), previous.Id, previous.Version)
                with { ShippingProcedureId = procedure.Id, DestinationInstructions = "Synthetic side entrance" }, default);
        scope.ClearTrackedState();
        Assert.Equal(procedure.PackingInstructions, assignment.PackingInstructions);
        var smallPair = new ContainerCompatibilityRequest(fixture.SampleType.Id, assignment.Id,
            "Synthetic regular ice: 1 kg for this entire container.", "Keep the tubes in the sealed secondary bag.");
        var small = await scope.ContainerCatalog().CreateAsync(new($"PACK-{scope.Suffix}-SMALL", "Synthetic small container", 5,
            DateTime.UtcNow.AddHours(-1), [smallPair], IsActive: true), default);
        var large = await scope.ContainerCatalog().CreateAsync(new($"PACK-{scope.Suffix}-LARGE", "Synthetic large container", 20,
            DateTime.UtcNow.AddHours(-1), [smallPair with { TemperatureControlInstructions = "Synthetic regular ice: 3 kg for this entire container." }], IsActive: true), default);
        scope.ClearTrackedState();
        Assert.NotEqual(small.Compatibilities[0].TemperatureControlInstructions, large.Compatibilities[0].TemperatureControlInstructions);
        var source = await scope.DbContext.SampleShipments.SingleAsync(value => value.Id == fixture.Shipment.Id);
        source.SelectContainer(small.Id, SampleShippingContainerCatalogService.Snapshot(small));
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        var staff = scope.CreatePlatformWorkflowController();
        var customer = scope.CreateCustomerWorkflowController();
        await staff.CreateReturnKit(fixture.Shipment.Id, new(1, "Synthetic", "TUBE", null, "Synthetic", "SHIPPER"), default);
        scope.ClearTrackedState();
        var kit = await scope.DbContext.SampleReturnKits.AsNoTracking().SingleAsync(value => value.SampleShipmentId == fixture.Shipment.Id);
        var barcode = $"REF-{scope.Suffix}-PACK";
        var registered = await staff.RegisterTubes(kit.Id, new([barcode], kit.Version), default);
        scope.ClearTrackedState();
        var fulfilled = await staff.FulfillReturnKit(kit.Id, new("Synthetic", "TRACK", DateTime.UtcNow, registered.ReturnKit!.Version), default);
        scope.ClearTrackedState();
        var tube = Assert.Single(fulfilled.Crosswalk);
        var assigned = await customer.AssignTube(fixture.Shipment.Id, fixture.Item.Id, new(barcode, null, tube.Version, tube.TubeSlotId), default);
        scope.ClearTrackedState();
        var issued = await customer.IssuePacket(fixture.Shipment.Id, new(assigned.Version, null), default);
        scope.ClearTrackedState();
        var packet = await scope.DbContext.SampleShippingPacketRevisions.AsNoTracking().SingleAsync(value => value.Id == issued.CurrentPacket!.Id);
        using (var frozen = JsonDocument.Parse(packet.InstructionSnapshotJson))
        {
            var packing = frozen.RootElement.GetProperty("containerPacking");
            Assert.Equal(small.Id, packing.GetProperty("containerDefinitionId").GetGuid());
            Assert.Equal(smallPair.TemperatureControlInstructions, packing.GetProperty("temperatureControlInstructions").GetString());
            Assert.Equal(smallPair.PackingInstructions, packing.GetProperty("samples")[0].GetProperty("packingInstructions").GetString());
            var rule = frozen.RootElement.GetProperty("samples")[0].GetProperty("instructionRule");
            Assert.Equal(procedure.Id, rule.GetProperty("shippingProcedureId").GetGuid());
            Assert.Equal("Synthetic side entrance", rule.GetProperty("destinationInstructions").GetString());
        }
        var sampleStatus = await scope.CreateConfigurationController().SetSampleTypeStatus(fixture.SampleType.Id, new(false, fixture.SampleType.Version), default);
        scope.ClearTrackedState();
        var frozenWhileInactive = await scope.DbContext.SampleShippingPacketRevisions.AsNoTracking().SingleAsync(value => value.Id == packet.Id);
        Assert.Equal(packet.InstructionSnapshotJson, frozenWhileInactive.InstructionSnapshotJson);
        Assert.Equal(packet.ManifestSnapshotJson, frozenWhileInactive.ManifestSnapshotJson);
        await scope.CreateConfigurationController().SetSampleTypeStatus(fixture.SampleType.Id, new(true, sampleStatus.Version), default);
        scope.ClearTrackedState();
        var revised = await scope.ProcedureController().Create(request with { SupersedesProcedureId = procedure.Id,
            SupersededVersion = procedure.Version, PackingInstructions = "Later shared instructions" }, default);
        scope.ClearTrackedState();
        Assert.Equal(2, revised.Revision);
        var conflict = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ProcedureController().Create(request with {
            SupersedesProcedureId = procedure.Id, SupersededVersion = procedure.Version }, default));
        Assert.Equal(409, conflict.StatusCode);
        scope.ClearTrackedState();
        await scope.ContainerCatalog().ReviseAsync(small.Id, new(small.Version, small.CommonName, 5, DateTime.UtcNow,
            [smallPair with { TemperatureControlInstructions = "Synthetic no cooling required." }], IsActive: true), default);
        scope.ClearTrackedState();
        var persisted = await scope.DbContext.SampleShippingPacketRevisions.AsNoTracking().SingleAsync(value => value.Id == packet.Id);
        Assert.Equal(packet.InstructionSnapshotJson, persisted.InstructionSnapshotJson);
        Assert.Equal(packet.ManifestSnapshotJson, persisted.ManifestSnapshotJson);
        Assert.Equal(procedure.Id, (await scope.DbContext.SampleShippingInstructionRules.AsNoTracking().SingleAsync(value => value.Id == assignment.Id)).ShippingProcedureId);
    }

    private sealed partial class ShippingTestScope
    {
        public SampleShippingProceduresController ProcedureController(bool customer = false) => new(DbContext,
            new OrderRequestContext(DbContext, new FixedIdentityContext(customer ? customerIdentity : platformIdentity)))
            { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };

        private async Task CleanupShippingProceduresAsync()
        {
            var procedures = await DbContext.SampleShippingProcedures.Where(value => value.Name == $"PACK-{Suffix}-PROCEDURE")
                .OrderByDescending(value => value.Revision).Select(value => value.Id).ToArrayAsync();
            foreach (var id in procedures) await DbContext.SampleShippingProcedures.Where(value => value.Id == id).ExecuteDeleteAsync();
        }
    }
}
