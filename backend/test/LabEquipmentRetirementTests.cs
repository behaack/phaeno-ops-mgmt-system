namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public class LabEquipmentRetirementTests
{
    [Fact]
    public void RetirementPreservesIdentityAndCalibrationAndBlocksEvenBackdatedUse()
    {
        var equipment = CreateEquipment();
        var actor = Guid.NewGuid();
        var retiredAt = new DateTime(2026, 9, 11, 18, 0, 0, DateTimeKind.Utc);
        var usage = new LabEquipmentUsage(Guid.NewGuid(), equipment.Id, retiredAt.AddDays(-1), actor, "retained-run");
        Assert.True(equipment.CanRecordUsage(new DateOnly(2026, 9, 10)));
        equipment.Retire("  Replaced by a new asset.  ", actor, retiredAt);
        Assert.Equal(LabEquipmentStatus.Retired, equipment.Status);
        Assert.Equal("Replaced by a new asset.", equipment.RetirementReason);
        Assert.Equal(actor, equipment.RetiredByUserId);
        Assert.Equal(retiredAt, equipment.RetiredAtUtc);
        Assert.Equal("TEST-EQP", equipment.AssetCode);
        Assert.Equal(new DateOnly(2026, 9, 1), equipment.LastCalibrationOn);
        Assert.Equal(new DateOnly(2026, 12, 31), equipment.CalibrationDueOn);
        Assert.Equal(equipment.Id, usage.LabEquipmentId);
        Assert.Equal("retained-run", usage.RunReference);
        Assert.False(equipment.CanRecordUsage(new DateOnly(2026, 9, 10)));
        Assert.Throws<InvalidOperationException>(() => equipment.Retire("Overwrite", actor, retiredAt.AddDays(1)));
        Assert.Equal("Replaced by a new asset.", equipment.RetirementReason);
    }

    [Fact]
    public void InvalidRetirementDoesNotChangeAnActiveAsset()
    {
        var equipment = CreateEquipment();
        Assert.Throws<ArgumentException>(() => equipment.Retire(" ", Guid.NewGuid(), DateTime.UtcNow));
        Assert.Throws<ArgumentException>(() => equipment.Retire(new string('x', 1001), Guid.NewGuid(), DateTime.UtcNow));
        Assert.Throws<ArgumentException>(() => equipment.Retire("Reason", Guid.Empty, DateTime.UtcNow));
        Assert.Equal(LabEquipmentStatus.Active, equipment.Status);
        Assert.Null(equipment.RetiredAtUtc);
        Assert.Null(equipment.RetirementReason);
        Assert.False(equipment.CanRecordUsage(new DateOnly(2027, 1, 1)));
    }

    private static LabEquipment CreateEquipment() => new("TEST-EQP", "Test asset", "Test type", "Test location",
        new DateOnly(2026, 9, 1), new DateOnly(2026, 12, 31));
}
