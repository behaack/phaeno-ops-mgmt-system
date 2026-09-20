namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class LabJobDeadlineTests
{
    private static readonly DateTime Now = new(2026, 9, 18, 12, 0, 0, DateTimeKind.Utc);
    private static LabJobQueueItem Classify(LabJobRow row) => LabJobQuery.Classify(new[] { row }.AsQueryable(), Now).Single();

    [Fact]
    public void Reforecast_does_not_hide_overdue_delivery()
    {
        var row = new LabJobRow { DueAtUtc = Now.AddDays(-1), ExpectedCompletionAtUtc = Now.AddDays(5) };
        Assert.Equal("Overdue", Classify(row).DeadlineStatus);
    }

    [Theory]
    [InlineData(false, "AwaitingAcceptance")]
    [InlineData(true, "AtRisk")]
    public void Missing_dates_never_imply_on_track(bool accepted, string expected) =>
        Assert.Equal(expected, Classify(new() { HasAcceptedSamples = accepted }).DeadlineStatus);

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Acceptance_requires_configured_turnaround_or_explicit_delivery_date(bool configured)
    {
        var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder,
            Guid.NewGuid(), Guid.NewGuid(), "pseq", 1, "standard", null,
            minimumTurnaroundDays: configured ? 7 : null, maximumTurnaroundDays: configured ? 14 : null);
        var specimen = new LabSpecimen(work.Id, Guid.NewGuid());
        work.Specimens.Add(specimen);
        specimen.RecordReceipt(Now.AddDays(-1), "Good", "Freezer");
        specimen.AssignAccession("TEST-ACCEPTANCE");
        var tube = new LabContainer(work.Id, specimen.Id, null, LabContainerKind.SubmittedSpecimen,
            "TEST-DEADLINE-TUBE", "Test tube", "Freezer", null, null, null);
        work.RefreshAcceptedSpecimenTargets();
        Assert.Null(work.OriginalDeliveryDueAtUtc);
        if (!configured)
        {
            Assert.Throws<InvalidOperationException>(work.RequireAcceptanceDeadline);
            Assert.Null(specimen.AcceptedAtUtc);
            work.AdjustDeliveryDueDate(Now.AddDays(10));
        }
        work.RequireAcceptanceDeadline();
        tube.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, Guid.NewGuid(), Now);
        specimen.RefreshIntakeFromTubes([tube], Now);
        work.RefreshAcceptedSpecimenTargets();
        Assert.Equal(Now.AddDays(configured ? 14 : 10), work.AdjustedDeliveryDueAtUtc ?? work.OriginalDeliveryDueAtUtc);
        if (!configured) Assert.Null(work.ExpectedCompletionAtUtc);
    }

    [Fact]
    public void Accepted_specimens_cannot_refresh_without_a_delivery_deadline()
    {
        var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder,
            Guid.NewGuid(), Guid.NewGuid(), "pseq", 1, "standard", null);
        var specimen = new LabSpecimen(work.Id, Guid.NewGuid());
        specimen.RecordReceipt(Now, "Good", "Freezer"); specimen.AssignAccession("TEST-MISSING-DUE");
        var tube = new LabContainer(work.Id, specimen.Id, null, LabContainerKind.SubmittedSpecimen,
            "TEST-MISSING-DUE-TUBE", "Test tube", "Freezer", null, null, null);
        tube.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, Guid.NewGuid(), Now);
        specimen.RefreshIntakeFromTubes([tube], Now); work.Specimens.Add(specimen);
        Assert.Throws<InvalidOperationException>(work.RefreshAcceptedSpecimenTargets);
    }

    [Fact]
    public void Lab_ready_and_partial_delivery_remain_open()
    {
        var row = new LabJobRow { OperationalStatus = LabWorkOrderStatus.ReadyForRelease,
            SampleCount = 2, DeliveredSampleCount = 1, DueAtUtc = Now.AddDays(-1) };
        Assert.Equal("Overdue", Classify(row).DeadlineStatus);
    }

    [Theory]
    [InlineData(-1, "CompleteOnTime")]
    [InlineData(0, "CompleteOnTime")]
    [InlineData(1, "CompleteLate")]
    public void All_sample_delivery_uses_exact_deadline_cutoff(int secondsAfter, string expected)
    {
        Assert.Equal(expected, Classify(new() { IsComplete = true, FirstDeliveredAtUtc = Now.AddSeconds(secondsAfter), CompletedAtUtc = Now.AddSeconds(secondsAfter),
            CompletionDeadlineAtUtc = Now, DueAtUtc = Now.AddDays(5) }).DeadlineStatus);
    }

    [Fact]
    public void Cancelled_is_not_successful_completion() => Assert.Equal("Cancelled",
        Classify(new() { OperationalStatus = LabWorkOrderStatus.Cancelled, IsComplete = true }).DeadlineStatus);

    [Fact]
    public void Earlier_sample_target_is_not_hidden_by_later_job_due_date() => Assert.Equal("AtRisk",
        Classify(new() { DueAtUtc = Now.AddDays(7), NextSampleDueAtUtc = Now.AddDays(-1) }).DeadlineStatus);

    [Theory]
    [InlineData(3, "DueSoon")]
    [InlineData(4, "NoKnownRisk")]
    public void Warning_window_is_three_calendar_days(int days, string expected) =>
        Assert.Equal(expected, Classify(new() { DueAtUtc = Now.AddDays(days) }).DeadlineStatus);

    [Fact]
    public void Blocking_hold_and_late_forecast_are_explainable_risks()
    {
        Assert.Contains("hold", Classify(new() { DueAtUtc = Now.AddDays(7), IsBlocked = true }).Reason);
        Assert.Equal("AtRisk", Classify(new() { DueAtUtc = Now.AddDays(7), ExpectedCompletionAtUtc = Now.AddDays(8) }).DeadlineStatus);
    }

    [Fact]
    public void Adjustments_keep_forecast_separate_and_delivery_history_immutable()
    {
        var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder,
            Guid.NewGuid(), Guid.NewGuid(), "pseq", 1, "standard", null);
        work.AdjustDeliveryDueDate(Now);
        Assert.Null(work.ExpectedCompletionAtUtc);
        work.RecordFirstDelivery(Now.AddMinutes(-1));
        work.RecordFirstDelivery(Now.AddDays(3));
        Assert.Equal(Now.AddMinutes(-1), work.FirstDeliveredAtUtc);
        Assert.Equal(Now, work.DeliveryDueAtFirstDeliveryUtc);
        Assert.Throws<InvalidOperationException>(() => work.AdjustDeliveryDueDate(Now.AddDays(7)));
    }

    [Fact]
    public void Adjustment_requires_reason_and_utc()
    {
        Assert.Throws<ArgumentException>(() => new LabJobDeadlineChange(Guid.NewGuid(), null, Now, " ", Guid.NewGuid(), Now));
        Assert.Throws<ArgumentException>(() => new LabJobDeadlineChange(Guid.NewGuid(), null,
            DateTime.SpecifyKind(Now, DateTimeKind.Unspecified), "Approved scheduling adjustment", Guid.NewGuid(), Now));
    }

    [Theory]
    [InlineData(0, "AwaitingReceipt")]
    [InlineData(1, "AwaitingAcceptance")]
    [InlineData(2, "ReadyForPreparation")]
    [InlineData(3, "LibraryPreparation")]
    [InlineData(4, "Sequencing")]
    [InlineData(5, "DataProcessing")]
    [InlineData(6, "QualityReview")]
    [InlineData(7, "AwaitingDelivery")]
    public void Job_stage_uses_earliest_outstanding_sample(int stage, string expected) =>
        Assert.Equal(expected, Classify(new() { OutstandingStage = stage, HasAttributedProgress = true }).JobStatus);

    [Fact]
    public void Partial_delivery_and_failed_samples_do_not_close_jobs_or_skip_remaining_lab_work()
    {
        var row = new LabJobRow { OperationalStatus = LabWorkOrderStatus.ReadyForRelease,
            OutstandingStage = 3, HasAttributedProgress = true, DeliveredSampleCount = 1, SampleCount = 2 };
        Assert.Equal("LibraryPreparation", Classify(row).JobStatus);
        row.OperationalStatus = LabWorkOrderStatus.OnHold;
        Assert.Equal("OnHold", Classify(row).JobStatus);
        row.IsComplete = true;
        Assert.Equal("Delivered", Classify(row).JobStatus);
        row.OperationalStatus = LabWorkOrderStatus.Cancelled;
        Assert.Equal("Cancelled", Classify(row).JobStatus);
    }

    [Fact]
    public void Queue_filter_counts_and_pagination_translate_to_postgres_without_dashboard_cap()
    {
        using var db = new PSeqOperationsDbContext(new DbContextOptionsBuilder<PSeqOperationsDbContext>()
            .UseNpgsql("Host=localhost;Database=unused_query_translation;Username=unused").Options,
            Options.Create(new PersistenceOptions()));
        var query = LabJobQuery.Classify(new LabJobQuery(db).QueueRows(), Now);
        var sql = query.Where(x => x.DeadlineStatus == "Overdue").OrderBy(x => x.Job.DueAtUtc)
            .ThenBy(x => x.Job.Id).Skip(275).Take(25).ToQueryString();
        Assert.Contains("OFFSET", sql);
        Assert.Contains("WHERE", query.Where(x => x.JobStatus == "Sequencing" && x.Job.DueAtUtc >= Now && x.Job.DueAtUtc < Now.AddDays(1)).ToQueryString());
        Assert.Contains("WHERE", query.Where(x => x.JobStatus == "Cancelled" && x.Job.OrderCreatedAtUtc >= Now).ToQueryString());
        Assert.Contains("LIMIT", sql);
        Assert.DoesNotMatch(@"LIMIT\s+250\b", sql);
        Assert.Contains("GROUP BY", query.GroupBy(x => x.DeadlineStatus).Select(g => new { g.Key, Count = g.Count() }).ToQueryString());
    }
}
