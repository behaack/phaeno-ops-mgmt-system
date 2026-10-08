namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

public sealed class LabAssemblyTests
{
    private static readonly DateTime Start = new(2026, 9, 22, 1, 0, 0, DateTimeKind.Utc);
    internal static LabAssemblyJob Job() => new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1,
        Guid.NewGuid(), "test-provider", "{}", "{}", new string('A', 64), Start);

    [Theory]
    [InlineData("Succeeded")]
    [InlineData("Failed")]
    [InlineData("Terminated")]
    public void Actual_times_survive_delayed_notifications_and_duplicate_dispositions(string state)
    {
        var job = Job(); job.BeginDispatch(Start);
        Assert.True(job.Observe("external-1", state, Start, Start.AddHours(1), Start.AddHours(1), "Test outcome", null, false, Start.AddDays(1)));
        Assert.Equal(Start, job.StartedAtUtc); Assert.Equal(Start.AddHours(1), job.StoppedAtUtc);
        Assert.True(job.IsTerminal);
        Assert.False(job.Observe("external-1", state, Start, Start.AddHours(1), Start.AddHours(1), "Test outcome", null, false, Start.AddDays(2)));
        Assert.Throws<InvalidOperationException>(() => job.Observe("external-1", state == "Failed" ? "Succeeded" : "Failed",
            Start, Start.AddHours(1), Start.AddHours(1), "Conflicting outcome", null, false, Start.AddDays(2)));
        Assert.Equal(state, job.State);
    }

    [Fact]
    public void Queued_cancellation_has_no_fabricated_execution_times()
    {
        var job = Job(); job.SetAttention("Dispatch blocked by a hold"); job.RequestCancellation(Guid.NewGuid(), "Wrong recipe", Start.AddMinutes(1));
        Assert.Equal("CancelledBeforeStart", job.State); Assert.Null(job.StartedAtUtc); Assert.Null(job.StoppedAtUtc);
        Assert.Null(job.AttentionReason);
        Assert.Equal(Start.AddMinutes(1), job.DispositionAtUtc); Assert.False(job.BeginDispatch(Start.AddMinutes(2)));
    }

    [Fact]
    public void Cancellation_request_is_not_a_terminal_outcome_and_success_can_win_the_race()
    {
        var job = Job(); job.BeginDispatch(Start);
        job.Observe("external-1", "Running", Start, null, null, null, null, false, Start);
        job.RequestCancellation(Guid.NewGuid(), "Operator requested stop", Start.AddMinutes(1));
        Assert.False(job.IsTerminal); Assert.Null(job.StoppedAtUtc);
        job.Observe("external-1", "Succeeded", Start, Start.AddMinutes(2), Start.AddMinutes(2), null, null, false, Start.AddMinutes(3));
        Assert.Equal("Succeeded", job.State); Assert.NotNull(job.CancellationRequestedAtUtc);
    }

    [Fact]
    public void Missing_inverted_or_changed_execution_times_cannot_replace_saved_evidence()
    {
        var job = Job();
        Assert.Throws<ArgumentException>(() => job.Observe("external-1", "Succeeded", Start, null, Start.AddHours(1), null, null, false, Start.AddDays(1)));
        Assert.Throws<ArgumentException>(() => job.Observe("external-1", "Failed", Start, Start.AddMinutes(-1), Start, null, null, false, Start.AddDays(1)));
        job.Observe("external-1", "Running", Start, null, null, null, null, false, Start);
        Assert.Throws<InvalidOperationException>(() => job.Observe("external-1", "Running", Start.AddMinutes(1), null, null, null, null, false, Start.AddDays(1)));
        Assert.Equal(Start, job.StartedAtUtc);
    }

    [Fact]
    public void Replay_uses_database_timestamp_precision()
    {
        var job = Job(); var precise = Start.AddTicks(17);
        job.Observe("external-1", "Running", precise, null, null, null, null, false, Start.AddMinutes(1));
        Assert.Equal(Start.AddTicks(10), job.StartedAtUtc);
        Assert.False(job.Observe("external-1", "Running", precise, null, null, null, null, false, Start.AddMinutes(2)));
    }

    [Fact]
    public void Percentages_are_transient_expire_and_never_complete_a_job()
    {
        var clock = new AssemblyTestClock(Start); var progress = new LabAssemblyProgress(clock); var job = Job();
        progress.Report(job.Id, 100, 2); progress.Report(job.Id, 50, 1);
        Assert.Equal(100, progress.Read(job.Id, false)!.Percentage); Assert.False(job.IsTerminal);
        progress.Report(job.Id, double.NaN, 3); Assert.Equal(100, progress.Read(job.Id, false)!.Percentage);
        clock.Now = Start.AddMinutes(3); Assert.Null(progress.Read(job.Id, false));
        progress.Report(job.Id, 80, 4); Assert.Null(progress.Read(job.Id, true)); Assert.Null(progress.Read(job.Id, false));
    }

    [Fact]
    public void Persisted_model_has_no_percentage_or_heartbeat_and_one_active_attempt_per_run()
    {
        using var db = new PSeqOperationsDbContext(new DbContextOptionsBuilder<PSeqOperationsDbContext>()
            .UseNpgsql("Host=localhost;Port=1;Database=not_accessed;Username=test").Options, Options.Create(new PersistenceOptions()));
        var entity = db.Model.FindEntityType(typeof(LabAssemblyJob))!;
        Assert.DoesNotContain(entity.GetProperties(), p => p.Name.Contains("Progress") || p.Name.Contains("Percentage") || p.Name.Contains("Heartbeat"));
        Assert.Contains(entity.GetIndexes(), i => i.IsUnique && i.Properties.Select(p => p.Name).SequenceEqual(new[] { "LabSpecimenId", "SequencingRunNumber" })
            && i.GetFilter()!.Contains("CancelledBeforeStart"));
        Assert.All(db.Model.FindEntityType(typeof(LabAssemblyEvent))!.GetProperties(), p => Assert.Equal(Microsoft.EntityFrameworkCore.Metadata.PropertySaveBehavior.Throw, p.GetAfterSaveBehavior()));
    }

    [Fact]
    public void Combined_run_analyses_cannot_count_as_multiple_delivered_allocations()
    {
        var mixed = Guid.NewGuid(); var first = Guid.NewGuid(); var repeat = Guid.NewGuid();
        var runs = new Dictionary<Guid, HashSet<int>> { [mixed] = [1, 2], [first] = [1], [repeat] = [1] };
        Assert.Equal(0, LabSequencingRunProgress.Count([mixed], runs));
        Assert.Equal(1, LabSequencingRunProgress.Count([mixed, first, repeat], runs));
    }

    [Fact]
    public void Default_provider_never_starts_simulated_scientific_work()
    {
        var provider = new UnavailableLabAssemblyProvider();
        Assert.False(provider.Availability.Available); Assert.Empty(provider.Availability.Recipes);
        Assert.Throws<InvalidOperationException>(() => { _ = provider.StartAsync(Job(), default); });
    }
}

internal sealed class AssemblyTestClock(DateTime now) : TimeProvider
{
    public DateTime Now { get; set; } = now;
    public override DateTimeOffset GetUtcNow() => new(Now);
}
