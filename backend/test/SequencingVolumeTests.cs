namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class SequencingVolumeTests
{
    [Theory]
    [InlineData("5", "µL", true)]
    [InlineData("4.9999999999999999999999999999", "µL", false)]
    [InlineData("5.0000000000000000000000000001", "uL", true)]
    [InlineData("0.005", "mL", true)]
    [InlineData("0.0049999999999999999999999999", "mL", false)]
    [InlineData("5000", "nL", true)]
    public void VerifiesVolumeWithoutRoundingOrChangingInventoryUnit(string actual, string unit, bool expected) =>
        Assert.Equal(expected, SequencingVolume.MeetsMinimum(decimal.Parse(actual, System.Globalization.CultureInfo.InvariantCulture), unit, 5m));

    [Fact]
    public void RejectsMassOrUnknownUnits() => Assert.Throws<ArgumentException>(() => SequencingVolume.MeetsMinimum(5m, "ng", 5m));

    [Fact]
    public void CatalogRequirementAppliesOnlyToLabServicesAndPairRetainsItsVersion()
    {
        var service = new QboCatalogItem("TEST", "PSeq", "", "specimen", 0, "USD", true, DateTime.UtcNow, CatalogServiceFamily.PSeqLabService);
        Assert.Throws<ArgumentException>(() => service.SetMinimumSequencingVolume(0));
        service.SetMinimumSequencingVolume(5);
        var pair = new LabBatchMember(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), DateTime.UtcNow);
        pair.CaptureSequencingRequirement(service.Id, service.Version, service.Name, service.MinimumSequencingVolumeUl!.Value);
        pair.AssignSequencingTube(Guid.NewGuid());
        service.SetMinimumSequencingVolume(6);
        service.IncrementVersion();
        Assert.Equal(5m, pair.MinimumSequencingVolumeUl);
        Assert.Equal(1, pair.SequencingCatalogVersion);
        Assert.Throws<InvalidOperationException>(() => pair.CaptureSequencingRequirement(service.Id, service.Version, service.Name, 6));
        var other = new QboCatalogItem("OTHER", "Item", "", "each", 0, "USD", true, DateTime.UtcNow, CatalogServiceFamily.Other);
        Assert.Throws<ArgumentException>(() => other.SetMinimumSequencingVolume(5));
    }
}
