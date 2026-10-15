namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed class PSeqKitLotDomainTests
{
    [Fact]
    public void ExpiryUsesTheActualUseDateAndIncludesTheLabeledLastDay()
    {
        var expiry = new DateOnly(2026, 9, 1);
        var lot = new PSeqKitLot(Guid.NewGuid(), " Lot-A ", expiry);
        Assert.Equal("Lot-A", lot.LotNumber); Assert.Equal("LOT-A", lot.NormalizedLotNumber);
        Assert.False(PSeqKitLotService.Assess(lot, expiry).IsExpired);
        Assert.True(PSeqKitLotService.Assess(lot, expiry.AddDays(1)).IsExpired);
        lot.SetRecall(true, "Customer-safe recall reason", DateTime.UtcNow);
        Assert.True(PSeqKitLotService.Assess(lot, expiry).IsRecalled);
        Assert.False(PSeqKitLotService.Assess(lot, expiry).IsExpired);
    }

    [Fact]
    public void EarlyLotSubmissionNeedsNeitherAnAssemblyRequestNorAnActualUseDate()
    {
        var lot = new PSeqKitLot(Guid.NewGuid(), "EARLY", null);
        var unit = new PartnerKitUnit(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "KIT-1");
        var included = new KitAssemblyCase(unit, Guid.NewGuid(), "{}");
        unit.Ship(null, DateTime.UtcNow.AddDays(-1), null, lot.LotNumber, "Carrier", "Tracking", lot.Id);
        included.RecordShipment(unit, null, DateTime.UtcNow);
        var assessment = PSeqKitLotService.Assess(lot);
        var submission = new PartnerKitLotSubmission(included, unit, "EARLY", null, PSeqKitLotService.Snapshot(assessment), DateTime.UtcNow);
        Assert.Null(submission.UsedOn); Assert.Null(included.AssemblyRequestId);
        Assert.Equal(KitAssemblyCaseStatus.AwaitingSubmission, included.Status);
        Assert.True(assessment.ExpirationUnknown);
        lot.SetRecall(true, "Recall after the early check", DateTime.UtcNow);
        var current = PSeqKitLotService.Map(submission, lot);
        Assert.False(current.SavedAssessment.IsRecalled); Assert.True(current.CurrentAssessment.IsRecalled);
        Assert.Throws<ArgumentException>(() => submission.Update("EARLY", DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1), "{}", DateTime.UtcNow));
    }

    [Fact]
    public void ShippedKitsRequireRegisteredLotIdentity()
    {
        var unit = new PartnerKitUnit(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "KIT-1");
        Assert.Throws<ArgumentException>(() => unit.Ship(null, DateTime.UtcNow.AddDays(-1), null, "LOT", "Carrier", "Tracking", Guid.Empty));
        Assert.Equal(KitUnitStatus.AwaitingShipment, unit.Status);
    }
}
