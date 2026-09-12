namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;

public sealed class ConfiguredLabServiceDomainTests
{
    [Fact]
    public void OfferingPublishesOneCompatibleEffectiveVersionAndPreservesItsScopeWhenWithdrawn()
    {
        var now = DateTime.UtcNow;
        var offering = Offering(now);
        Assert.True(offering.IsEffectiveAt(now));
        Assert.True(offering.Supports("EXTRACTED_RNA", ["Human PBMC"]));
        Assert.False(offering.Supports("extracted_rna", ["Mouse liver"]));
        offering.SetAvailability(now.AddDays(-1), null, false);
        Assert.False(offering.IsEffectiveAt(now));
        Assert.Equal(14, offering.MaximumTurnaroundDays);
        Assert.Equal("FASTQ and assembled outputs", offering.IncludedOutputContract);
        Assert.Throws<ArgumentException>(() => offering.SetAvailability(now, now, true));
    }

    [Theory]
    [InlineData(0, 10)] [InlineData(11, 10)] [InlineData(1, 366)]
    public void OfferingRejectsInvalidTurnaround(int minimum, int maximum) =>
        Assert.Throws<ArgumentException>(() => Offering(DateTime.UtcNow, minimum, maximum));

    [Fact]
    public void StandardCommitmentRequiresAcceptedExactQuoteAndCreatesNoSpecimenAuthorization()
    {
        var now = DateTime.UtcNow; var order = Draft(); var snapshot = Snapshot(now, 2);
        var quote = new LabServiceQuote(order.Id, 1, QuotePurpose.Initial, "[]", 200, 20, "USD", now, now.AddDays(1));
        order.Quotes.Add(quote);
        Assert.Throws<InvalidOperationException>(() => order.PlaceStandard(quote.Id, snapshot, "{}", now));
        quote.MarkIssued(); quote.Accept(Guid.NewGuid(), now);
        order.PlaceStandard(quote.Id, snapshot, "{}", now);
        Assert.Equal(LabServiceEntryMode.ConfiguredDirect, order.EntryMode);
        Assert.Equal(LabServiceOrderStatus.PlacedAwaitingSamples, order.Status);
        Assert.Equal(220, order.ReadConfiguredSnapshot()!.Total);
        Assert.Empty(order.Samples); Assert.Null(order.SampleRosterFinalizedAt);
        Assert.Throws<InvalidOperationException>(() => order.PlaceStandard(quote.Id, snapshot, "{}", now));
    }

    [Fact]
    public void AcceptanceStartsTurnaroundOnceAndOverridesRetainOriginalTargets()
    {
        var now = DateTime.UtcNow;
        var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, Guid.NewGuid(),
            Guid.NewGuid(), "pseq_lab_service", 1, "configured", "job", minimumTurnaroundDays: 7, maximumTurnaroundDays: 14);
        var specimen = new LabSpecimen(work.Id, Guid.NewGuid()); work.Specimens.Add(specimen);
        specimen.RecordReceipt(now.AddDays(-2), "Good", "Freezer"); specimen.AssignAccession("LAB-1");
        work.RefreshAcceptedSpecimenTargets(); Assert.Null(work.ExpectedCompletionAtUtc);
        var tube = new LabContainer(work.Id, specimen.Id, null, LabContainerKind.SubmittedSpecimen,
            "TUBE-1", "Tube", "Freezer", null, null, null);
        tube.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, Guid.NewGuid(), now);
        specimen.RefreshIntakeFromTubes([tube], now);
        work.RefreshAcceptedSpecimenTargets(); Assert.Equal(now.AddDays(14), work.OriginalTargetAtUtc);
        tube.ReviewIntake(LabSpecimenIntakeDisposition.OnHold, "missing_information", null, Guid.NewGuid(), now.AddDays(1));
        specimen.RefreshIntakeFromTubes([tube], now.AddDays(1));
        tube.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, "Information verified", Guid.NewGuid(), now.AddDays(2));
        specimen.RefreshIntakeFromTubes([tube], now.AddDays(2));
        work.RefreshAcceptedSpecimenTargets(); Assert.Equal(now, specimen.AcceptedAtUtc);
        var later = now.AddDays(20); work.OverrideExpectedCompletion(later); work.RefreshAcceptedSpecimenTargets();
        Assert.Equal(later, work.ExpectedCompletionAtUtc); Assert.Equal(now.AddDays(14), specimen.OriginalTargetAtUtc);
        Assert.Equal("AtRisk", work.ScheduleHealth(now)); Assert.Equal("Delayed", work.ScheduleHealth(now.AddDays(21)));
        work.RecordMilestone(LabWorkOrderStatus.Processing); work.RecordMilestone(LabWorkOrderStatus.ScientificReview);
        work.RecordMilestone(LabWorkOrderStatus.ReadyForRelease);
        Assert.NotNull(work.CompletedAtUtc); Assert.NotNull(specimen.CompletedAtUtc);
        Assert.Throws<InvalidOperationException>(() => work.OverrideExpectedCompletion(now.AddDays(30)));
    }

    [Fact]
    public void TimingChangeRequiresControlledReasonAndKeepsPrivateNoteSeparate()
    {
        var now = DateTime.UtcNow;
        Assert.Throws<ArgumentException>(() => new LabWorkTimingChange(Guid.NewGuid(), now, now.AddDays(2),
            "Other operational delay", null, "Internal reason", Guid.NewGuid(), now, null));
        var change = new LabWorkTimingChange(Guid.NewGuid(), now, now.AddDays(2), "Other operational delay",
            "Additional processing is needed.", "Private instrument diagnostic", Guid.NewGuid(), now, Guid.NewGuid());
        Assert.Equal("Additional processing is needed.", change.CustomerSafeNote);
        Assert.Equal("Private instrument diagnostic", change.InternalNote);
    }

    [Fact]
    public void PublicationFailureAndRetryNeverChangeCommittedSaleValues()
    {
        var now = DateTime.UtcNow; var summary = new CommercialSaleSummary(OrderWorkflowTypes.LabService,
            Guid.NewGuid(), Guid.NewGuid(), null, "Lab Service", 2, 220, "USD", now, Guid.NewGuid());
        summary.Failed("company_link_missing", now); Assert.Equal(1, summary.AttemptCount);
        summary.Retry(now); summary.Projected(Guid.NewGuid());
        Assert.Equal(220, summary.Total); Assert.Equal(2, summary.Quantity); Assert.Equal(1, summary.ProjectedRevision);
        summary.SetSchedule(now.AddDays(14), "OnTrack", now); Assert.Equal(2, summary.Revision);
        Assert.Equal(1, summary.ProjectedRevision); Assert.Equal(220, summary.Total);
    }

    private static LabServiceOffering Offering(DateTime now, int minimum = 7, int maximum = 14) => new(Guid.NewGuid(), 1,
        "Standard", "Processing and assembly", Guid.NewGuid(), [Guid.NewGuid()], ["extracted_rna"], ["Human PBMC"],
        "FASTQ and assembled outputs", minimum, maximum, now.AddDays(-1), null, true, false);
    private static LabServiceOrder Draft()
    {
        var order = new LabServiceOrder(Guid.NewGuid(), Guid.NewGuid(), "JOB-STD", "Study", null, 2, false,
            "Human PBMC", "Frozen", "No hazards", "Follow shipping instructions");
        order.SourceGroups.Add(new LabServiceSourceGroup(order.Id, "Human PBMC", 2)); return order;
    }
    private static ConfiguredLabServiceSnapshot Snapshot(DateTime now, int count) => new(Guid.NewGuid(), Guid.NewGuid(), 1, 1,
        "Standard", Guid.NewGuid(), "pseq_lab_service", 1, "USD", 100, count, 200, 20, 220,
        [Guid.NewGuid()], "[]", "FASTQ", 7, 14, now);
}
