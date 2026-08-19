namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public class SampleShippingDomainTests
{
    private static readonly DateTime Now = new(2026, 8, 17, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void PacketBarcodeNormalizesScannerFramingAndRejectsAlteration()
    {
        var barcode = SampleShippingBarcode.Create();

        Assert.True(SampleShippingBarcode.TryNormalize($"*{barcode.ToLowerInvariant()}*", out var normalized));
        Assert.Equal(barcode, normalized);

        var replacementCheck = barcode[^1] == '2' ? '3' : '2';
        Assert.False(SampleShippingBarcode.TryNormalize(barcode[..^1] + replacementCheck, out _));
        Assert.False(SampleShippingBarcode.TryNormalize("PH-S-CUSTOMER-X", out _));
    }

    [Fact]
    public void CompatibleSampleTypesResolveToOneDestinationPacket()
    {
        var destination = Destination();
        var first = SampleType("RNA", "Extracted RNA");
        var second = SampleType("CDNA", "cDNA");
        var rules = new[]
        {
            Rule(destination, first, "FROZEN", requiresSeparateShipment: false),
            Rule(destination, second, "FROZEN", requiresSeparateShipment: false)
        };

        var resolution = SampleShippingCompatibilityResolver.Resolve(
            destination,
            new[] { first, second },
            rules,
            Now);

        Assert.Equal("FROZEN", resolution.CompatibilityGroup);
        Assert.Equal(2, resolution.Rules.Count);
        Assert.False(resolution.RequiresSeparateShipment);
    }

    [Fact]
    public void IncompatibleOrIncompleteSelectionCannotResolveACombinedPacket()
    {
        var destination = Destination();
        var first = SampleType("RNA", "Extracted RNA");
        var second = SampleType("TISSUE", "Frozen tissue");
        var incompatibleRules = new[]
        {
            Rule(destination, first, "FROZEN_RNA", requiresSeparateShipment: false),
            Rule(destination, second, "FROZEN_TISSUE", requiresSeparateShipment: true)
        };

        Assert.Throws<InvalidOperationException>(() => SampleShippingCompatibilityResolver.Resolve(
            destination,
            new[] { first, second },
            incompatibleRules,
            Now));
        Assert.Throws<InvalidOperationException>(() => SampleShippingCompatibilityResolver.Resolve(
            destination,
            new[] { first },
            Array.Empty<SampleShippingInstructionRule>(),
            Now));
    }

    [Fact]
    public void SupersededConfigurationRevisionStopsAtNewEffectiveTime()
    {
        var destination = Destination();
        var nextEffective = Now.AddDays(7);

        destination.EndAt(nextEffective);

        Assert.True(destination.IsEffectiveAt(nextEffective.AddTicks(-1)));
        Assert.False(destination.IsEffectiveAt(nextEffective));
        Assert.Throws<InvalidOperationException>(() => destination.EndAt(nextEffective.AddDays(1)));
    }

    [Fact]
    public void PacketRevisionFreezesSnapshotsAndRetainsReplacementIdentity()
    {
        var shipmentId = Guid.NewGuid();
        var first = new SampleShippingPacketRevision(
            shipmentId,
            1,
            "SP-20260817-FIRST",
            SampleShippingBarcode.Create(),
            "{\"destination\":\"west\"}",
            "{\"temperature\":\"frozen\"}",
            "{\"samples\":[\"S-1\"]}",
            Now);
        var replacement = new SampleShippingPacketRevision(
            shipmentId,
            2,
            "SP-20260817-SECOND",
            SampleShippingBarcode.Create(),
            "{\"destination\":\"west\"}",
            "{\"temperature\":\"frozen\"}",
            "{\"samples\":[\"S-1\"]}",
            Now.AddMinutes(1));

        first.Void(Now.AddMinutes(1), "Corrected receiving window", replacement.Id);

        Assert.True(first.IsVoided);
        Assert.Equal(replacement.Id, first.ReplacedByPacketRevisionId);
        Assert.Contains("west", first.DestinationSnapshotJson);
        Assert.Throws<InvalidOperationException>(() => first.Void(Now.AddMinutes(2), "Again", null));
    }

    [Fact]
    public void SupplierTubeBarcodeNormalizesScannerFramingWithoutInventingAPhaenoIdentity()
    {
        Assert.True(SupplierTubeBarcode.TryNormalize("*abc-1234*", out var normalized));
        Assert.Equal("ABC-1234", normalized);
        Assert.False(SupplierTubeBarcode.TryNormalize("ABC 1234", out _));
        Assert.False(SupplierTubeBarcode.TryNormalize("A", out _));
    }

    [Fact]
    public void ReturnKitRequiresTheExactRegisteredTubeCountBeforeFulfillment()
    {
        var shipmentId = Guid.NewGuid();
        var kit = new SampleReturnKit(
            "RK-20260818-TEST",
            shipmentId,
            Guid.NewGuid(),
            SampleShipmentAuthorizationSource.ProspectTrialProject,
            Guid.NewGuid(),
            "Corning",
            "8676 / Fisher 07-200-963",
            "LOT-1",
            "Therapak",
            "37806 / Fisher 22-130-029",
            2);
        kit.Tubes.Add(new RegisteredSampleTube(kit.Id, "TUBE-0001"));

        Assert.Throws<InvalidOperationException>(() =>
            kit.Fulfill("Carrier", "TRACK-1", Now));

        kit.Tubes.Add(new RegisteredSampleTube(kit.Id, "TUBE-0002"));
        kit.Fulfill("Carrier", "TRACK-1", Now);

        Assert.Equal(SampleReturnKitStatus.Fulfilled, kit.Status);
        Assert.Equal(2, kit.Tubes.Count);
    }

    [Fact]
    public void TubeAssignmentAndSupplierBarcodeAdoptionPreserveOnePhysicalIdentity()
    {
        var shipmentId = Guid.NewGuid();
        var tube = new RegisteredSampleTube(Guid.NewGuid(), "TUBE-0003");
        var item = new SampleShipmentItem(
            shipmentId,
            Guid.NewGuid(),
            Guid.NewGuid(),
            "CUSTOMER-3",
            "Extracted RNA 3",
            20,
            "uL");

        tube.MarkAssigned(Now);
        item.AssignTube(tube.Id, Now);
        var container = new LabContainer(
            Guid.NewGuid(),
            Guid.NewGuid(),
            null,
            LabContainerKind.SubmittedSpecimen,
            tube.SupplierBarcode,
            "CUSTOMER-3",
            "Intake rack",
            20,
            "uL",
            null,
            LabContainerBarcodeSource.RegisteredSupplier,
            tube.Id);
        tube.MarkAccessioned(Now.AddMinutes(1));

        Assert.Equal(tube.Id, item.RegisteredSampleTubeId);
        Assert.Equal(LabContainerBarcodeSource.RegisteredSupplier, container.BarcodeSource);
        Assert.Equal(tube.Id, container.ExternalBarcodeReferenceId);
        Assert.Equal("TUBE-0003", container.Barcode);
        Assert.Equal(RegisteredSampleTubeStatus.Accessioned, tube.Status);
    }

    private static SampleShippingDestination Destination() => new(
        Guid.NewGuid(),
        1,
        null,
        "WEST_LAB",
        "West laboratory",
        "Sample Receiving",
        "Phaeno",
        "123 Example Street",
        null,
        "San Diego",
        "CA",
        "92101",
        "US",
        null,
        "receiving@example.test",
        "Monday-Friday, 8:00 AM-4:00 PM",
        "America/Los_Angeles",
        "Do not deliver on posted closures.",
        "Deliver to Sample Receiving.",
        null,
        false,
        Now.AddDays(-1),
        true);

    private static SampleTypeDefinition SampleType(string code, string name) => new(
        Guid.NewGuid(),
        1,
        null,
        code,
        name,
        "Synthetic test definition",
        "Nucleic acid",
        1,
        10,
        "tube",
        "Use an approved sealed primary tube.",
        "Keep frozen.",
        null,
        "Use approved secondary containment.",
        "Use only the safe sample identifier.",
        "Do not include direct identifiers.",
        "Declare hazards before shipping.",
        null,
        48,
        Now.AddDays(-1),
        true);

    private static SampleShippingInstructionRule Rule(
        SampleShippingDestination destination,
        SampleTypeDefinition sampleType,
        string compatibilityGroup,
        bool requiresSeparateShipment) => new(
            Guid.NewGuid(),
            1,
            null,
            destination.Id,
            sampleType.Id,
            compatibilityGroup,
            "Pack with approved absorbent and secondary containment.",
            "Maintain the approved temperature range.",
            "Use an approved traceable carrier service.",
            "Dispatch only for an open receiving window.",
            "Deliver to Sample Receiving.",
            "Include the current shipment packet.",
            "Contact Phaeno if delayed or damaged.",
            null,
            requiresSeparateShipment,
            Now.AddDays(-1),
            true);
}
