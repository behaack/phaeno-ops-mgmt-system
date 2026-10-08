namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.OrderManagement.Domain;

public sealed class LabJobPhaseDomainTests
{
    [Theory]
    [InlineData(350)]
    [InlineData(10000)]
    public void JobScopeSupportsGeneralizedCohorts(int sampleCount)
    {
        var order = new LabServiceOrder(Guid.NewGuid(), Guid.NewGuid(), "JOB-1", "Study", null,
            sampleCount, false, "Human PBMC", "Frozen", "Research", "Instructions");
        Assert.Equal(sampleCount, Assert.Single(order.Phases).SampleCount);
    }

    [Fact]
    public void ManualRequestRevisionKeepsItsSingleCohortIdentityAndReconcilesCount()
    {
        var order = new LabServiceOrder(Guid.NewGuid(), Guid.NewGuid(), "JOB-1", "Study", null,
            2, false, "Human PBMC", "Frozen", "Research", "Instructions");
        var phaseId = Assert.Single(order.Phases).Id;
        order.UpdateDraft("Revised study", null, 3, false, "Human PBMC", "Frozen", "Research");
        Assert.Equal(phaseId, Assert.Single(order.Phases).Id);
        Assert.Equal(3, Assert.Single(order.Phases).SampleCount);
        order.SourceGroups.Add(new LabServiceSourceGroup(order.Id, "Human PBMC", 3));
        order.Submit(Guid.NewGuid(), DateTime.UtcNow);
        order.RequestChanges("Correct the sample count", null);
        order.UpdateDraft("Corrected study", null, 4, false, "Human PBMC", "Frozen", "Research");
        Assert.Equal(phaseId, Assert.Single(order.Phases).Id);
        Assert.Equal(4, order.RequestedSpecimenCount);
        Assert.Equal(4, Assert.Single(order.Phases).SampleCount);
    }

    [Fact]
    public void FirstReceiptClosesCancellationButDoesNotStartTat()
    {
        var phase = new LabJobPhase(Guid.NewGuid(), 1, "Discovery", 50, 10, 1200);
        var first = DateTime.UtcNow;
        phase.RecordReceipt(first, null, null, null, null);
        Assert.Null(phase.CompleteReceiptAtUtc);
        Assert.Null(phase.OriginalDueAtUtc);
        Assert.Throws<InvalidOperationException>(() => phase.Cancel(Guid.NewGuid(), "Unused scope", first));
        Assert.Throws<InvalidOperationException>(() => phase.Supersede(first));
        var last = first.AddDays(4);
        var due = last.AddDays(14);
        var calendar = Guid.NewGuid();
        phase.RecordReceipt(first, last, due, calendar, 2);
        phase.RecordReceipt(first.AddDays(1), last.AddDays(1), due.AddDays(1), Guid.NewGuid(), 3);
        phase.AdjustDeadline(due.AddDays(3));
        Assert.Equal(first, phase.FirstReceiptAtUtc);
        Assert.Equal(last, phase.CompleteReceiptAtUtc);
        Assert.Equal(due, phase.OriginalDueAtUtc);
        Assert.Equal(calendar, phase.CalendarId);
        Assert.Equal(due.AddDays(3), phase.AdjustedDueAtUtc);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void SentOrReceivedSampleCannotMovePhase(bool received)
    {
        var sample = new LabSample(Guid.NewGuid(), "S-1", "RNA", "Human PBMC", 4, "tube",
            "Frozen", "Research", null, null, null, "[]");
        var original = Guid.NewGuid();
        sample.AssignPhase(original);
        if (received) sample.Receive(DateTime.UtcNow, "Intact");
        else sample.RecordCustomerShipment("Carrier", "Tracking", DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() => sample.AssignPhase(Guid.NewGuid()));
        Assert.Equal(original, sample.LabJobPhaseId);
    }

    [Fact]
    public void StartedAndCancelledScopeCannotBeReconfigured()
    {
        var started = new LabJobPhase(Guid.NewGuid(), 1, "Started", 50, 10, 1000);
        started.Start(DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() => started.Configure(2, "Changed", 40, 20, 900, 0, "[]"));
        var cancelled = new LabJobPhase(Guid.NewGuid(), 2, "Unstarted", 150, 20, 2000);
        cancelled.Cancel(Guid.NewGuid(), "Agreed unused cohort", DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() => cancelled.Start(DateTime.UtcNow));
        Assert.Null(cancelled.FirstDeliveredAtUtc);
    }

    [Fact]
    public void RephasingRetainsIssuedInvoiceIdentityAndPriceSnapshot()
    {
        var phase = new LabJobPhase(Guid.NewGuid(), 1, "Original", 50, 10, 1000, 0, "{\"source\":\"accepted quote\"}");
        var allocation = new LabPhaseInvoiceAllocation(Guid.NewGuid(), phase, 400);
        var previous = new LabPhaseBillingAssignment(allocation.Id, phase.Id, 400);
        previous.Supersede(DateTime.UtcNow);
        var first = new LabPhaseBillingAssignment(allocation.Id, Guid.NewGuid(), 100);
        var second = new LabPhaseBillingAssignment(allocation.Id, Guid.NewGuid(), 300);
        phase.Configure(1, "Updated", 50, 15, 1000, 0, "{}");
        Assert.Equal("Original", allocation.PhaseNameSnapshot);
        Assert.Contains("accepted quote", allocation.PriceLinesSnapshotJson);
        Assert.Equal(allocation.Subtotal, first.Subtotal + second.Subtotal);
        Assert.Equal(allocation.Id, first.LabPhaseInvoiceAllocationId);
        Assert.NotNull(previous.SupersededAtUtc);
    }
}
