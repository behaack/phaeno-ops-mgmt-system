namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public class LabTubeIntakeTests
{
    [Fact]
    public void OneAcceptedTubeAcceptsSpecimenDespiteRejectedOrHeldReserves()
    {
        var specimen = Specimen();
        var accepted = Tube(specimen);
        var rejected = Tube(specimen);
        var held = Tube(specimen);
        var reviewer = Guid.NewGuid();
        var now = DateTime.UtcNow;
        accepted.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, reviewer, now);
        rejected.ReviewIntake(LabSpecimenIntakeDisposition.Rejected, "leaking_container", null, reviewer, now);
        held.ReviewIntake(LabSpecimenIntakeDisposition.OnHold, "missing_information", null, reviewer, now);
        specimen.RefreshIntakeFromTubes([accepted, rejected, held], now);
        Assert.Equal(LabSpecimenIntakeDisposition.Accepted, specimen.IntakeDisposition);
        Assert.Equal(now, specimen.AcceptedAtUtc);
        Assert.Null(accepted.IntakeReasonCode);
        Assert.Equal(reviewer, accepted.IntakeReviewedByUserId);
        Assert.Equal(now, accepted.IntakeReviewedAtUtc);
        Assert.Equal(LabContainerStatus.Rejected, rejected.Status);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("invented", "Some note")]
    [InlineData("other", null)]
    public void InvalidReasonsCannotMutateReview(string? code, string? notes)
    {
        var tube = Tube(Specimen());
        Assert.Throws<ArgumentException>(() => tube.ReviewIntake(LabSpecimenIntakeDisposition.Rejected,
            code, notes, Guid.NewGuid(), DateTime.UtcNow));
        Assert.Null(tube.IntakeDisposition);
        Assert.Null(tube.IntakeReviewedAtUtc);
    }

    [Fact]
    public void HoldResolutionRequiresNotesAndDoesNotResetFirstAcceptanceDate()
    {
        var specimen = Specimen();
        var tube = Tube(specimen);
        var now = DateTime.UtcNow;
        var actor = Guid.NewGuid();
        tube.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, actor, now);
        specimen.RefreshIntakeFromTubes([tube], now);
        tube.ReviewIntake(LabSpecimenIntakeDisposition.OnHold, "identity_mismatch", null, actor, now.AddMinutes(1));
        specimen.RefreshIntakeFromTubes([tube], now.AddMinutes(1));
        Assert.Equal(LabSpecimenIntakeDisposition.OnHold, specimen.IntakeDisposition);
        Assert.Throws<ArgumentException>(() => tube.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, actor, now));
        tube.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, "Identity verified", actor, now.AddMinutes(2));
        specimen.RefreshIntakeFromTubes([tube], now.AddMinutes(2));
        Assert.Equal(now, specimen.AcceptedAtUtc);
        Assert.Equal(LabSpecimenIntakeDisposition.Accepted, specimen.IntakeDisposition);
    }

    [Fact]
    public void UnreviewedOrRejectedTubesDoNotAcceptOrAutomaticallyRejectSpecimen()
    {
        var specimen = Specimen();
        var tube = Tube(specimen);
        specimen.RefreshIntakeFromTubes([tube], DateTime.UtcNow);
        Assert.Equal(LabSpecimenIntakeDisposition.Received, specimen.IntakeDisposition);
        tube.ReviewIntake(LabSpecimenIntakeDisposition.Rejected, "other", "Fixture reason", Guid.NewGuid(), DateTime.UtcNow);
        specimen.RefreshIntakeFromTubes([tube], DateTime.UtcNow);
        Assert.Equal(LabSpecimenIntakeDisposition.Received, specimen.IntakeDisposition);
        Assert.Null(specimen.AcceptedAtUtc);
        Assert.Throws<ArgumentException>(() => specimen.RefreshIntakeFromTubes([Tube(Specimen())], DateTime.UtcNow));
    }

    [Fact]
    public void DestroyedExpectedTubeRetainsRejectionWithoutInventingStorage()
    {
        var specimen = Specimen();
        var expectedTubeId = Guid.NewGuid();
        var actor = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var tube = new LabContainer(specimen.LabWorkOrderId, specimen.Id, null,
            LabContainerKind.SubmittedSpecimen, "TEST-BROKEN", "Expected tube", null, null, null, null,
            LabContainerBarcodeSource.RegisteredSupplier, expectedTubeId, rejectedAtIntake: true);
        tube.ReviewIntake(LabSpecimenIntakeDisposition.Rejected, "damaged_container", "Destroyed on arrival", actor, now);
        Assert.Null(tube.Location);
        Assert.Equal(LabContainerStatus.Rejected, tube.Status);
        Assert.Equal(expectedTubeId, tube.ExternalBarcodeReferenceId);
        Assert.Equal(actor, tube.IntakeReviewedByUserId);
        Assert.Equal(now, tube.IntakeReviewedAtUtc);
        Assert.Throws<InvalidOperationException>(() => tube.ReviewIntake(LabSpecimenIntakeDisposition.Accepted,
            null, "Claimed correction", actor, now));
        Assert.Equal(LabSpecimenIntakeDisposition.Rejected, tube.IntakeDisposition);
        Assert.Equal(LabContainerStatus.Rejected, tube.Status);
    }

    [Fact]
    public void AcceptedOrHeldRetainedMaterialNeedsActualStorage()
    {
        var specimen = Specimen();
        Assert.Throws<ArgumentException>(() => new LabContainer(specimen.LabWorkOrderId, specimen.Id, null,
            LabContainerKind.SubmittedSpecimen, "TEST-NO-STORAGE", "Tube", null, null, null, null));
        var tube = new LabContainer(specimen.LabWorkOrderId, specimen.Id, null,
            LabContainerKind.SubmittedSpecimen, "TEST-CORRECTION", "Tube", null, null, null, null, rejectedAtIntake: true);
        var actor = Guid.NewGuid();
        tube.ReviewIntake(LabSpecimenIntakeDisposition.Rejected, "identity_mismatch", null, actor, DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() => tube.ReviewIntake(LabSpecimenIntakeDisposition.OnHold,
            "missing_information", null, actor, DateTime.UtcNow));
        tube.Move("REAL-BOX-1");
        tube.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, "Intact tube identified; original rejection was incorrect", actor, DateTime.UtcNow);
        Assert.Equal("REAL-BOX-1", tube.Location);
        Assert.Equal(LabContainerStatus.Available, tube.Status);
    }

    private static LabSpecimen Specimen()
    {
        var specimen = new LabSpecimen(Guid.NewGuid(), Guid.NewGuid());
        specimen.RecordReceipt(DateTime.UtcNow, "Intact", "Test freezer");
        specimen.AssignAccession("TEST-" + specimen.Id);
        return specimen;
    }

    private static LabContainer Tube(LabSpecimen specimen) => new(specimen.LabWorkOrderId, specimen.Id, null,
        LabContainerKind.SubmittedSpecimen, "TEST-" + Guid.NewGuid(), "Tube", "Test freezer", null, null, null);
}
