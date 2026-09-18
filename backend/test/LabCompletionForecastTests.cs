namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public sealed class LabCompletionForecastTests
{
    private static LabBusinessCalendar Calendar() => new(1, "America/Los_Angeles", new(2026, 1, 1), new(2027, 12, 31), "Test coverage");
    private static DateTime Utc(int month, int day, int hour = 17) => new(2026, month, day, hour, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Business_days_skip_observed_holidays_and_weekends_but_calendar_days_do_not()
    {
        var calendar = Calendar(); calendar.AddHoliday(new(2026, 9, 21), "Observed closure");
        var friday = Utc(9, 18);
        Assert.Equal(Utc(9, 22), LabForecastClock.AddDays(friday, 1, LabDayBasis.Business, calendar));
        Assert.Equal(Utc(9, 19), LabForecastClock.AddDays(friday, 1, LabDayBasis.Calendar, calendar));
    }

    [Fact]
    public void Weekend_holiday_is_not_counted_twice_and_fractional_days_cross_closures()
    {
        var calendar = Calendar(); calendar.AddHoliday(new(2026, 9, 19), "Saturday closure");
        Assert.Equal(Utc(9, 21), LabForecastClock.AddDays(Utc(9, 18), 1, LabDayBasis.Business, calendar));
        // Friday 18:00 Pacific plus half an eligible date is Monday 06:00 Pacific.
        Assert.Equal(Utc(9, 21, 13), LabForecastClock.AddDays(Utc(9, 19, 1), .5m, LabDayBasis.Business, calendar));
    }

    [Fact]
    public void Overrun_uses_one_day_from_actual_time_without_accumulating_on_repeated_reads()
    {
        var calendar = Calendar(); var entered = Utc(9, 1); var now = entered.AddDays(7);
        var duration = new LabStageDuration(Guid.NewGuid(), "sequencing", 5, LabDayBasis.Calendar);
        Assert.Equal((entered.AddDays(8), true), LabForecastClock.StageExit(entered, now, duration, calendar));
        Assert.Equal(LabForecastClock.StageExit(entered, now, duration, calendar), LabForecastClock.StageExit(entered, now, duration, calendar));
        Assert.Equal((entered.AddDays(9), true), LabForecastClock.StageExit(entered, now.AddDays(1), duration, calendar));
        Assert.Equal((entered.AddDays(5), false), LabForecastClock.StageExit(entered, entered.AddDays(2), duration, calendar));
    }

    [Fact]
    public void Business_overrun_and_downstream_mixed_basis_honor_closures()
    {
        var calendar = Calendar(); calendar.AddHoliday(new(2026, 9, 21), "Closure");
        var duration = new LabStageDuration(Guid.NewGuid(), "sequencing", 1, LabDayBasis.Business);
        var (exit, overrun) = LabForecastClock.StageExit(Utc(9, 14), Utc(9, 18), duration, calendar);
        Assert.True(overrun); Assert.Equal(Utc(9, 22), exit);
        Assert.Equal(Utc(9, 24), LabForecastClock.AddDays(exit, 2, LabDayBasis.Calendar, calendar));
    }

    [Fact]
    public void Calendar_days_preserve_local_time_across_daylight_saving()
    {
        Assert.Equal(Utc(3, 9), LabForecastClock.AddDays(Utc(3, 6, 18), 1, LabDayBasis.Business, Calendar()));
    }

    [Fact]
    public void Missing_coverage_future_entry_and_duplicate_holidays_are_rejected()
    {
        var calendar = Calendar(); calendar.AddHoliday(new(2026, 9, 21), "Closure");
        Assert.Throws<ArgumentException>(() => calendar.AddHoliday(new(2026, 9, 21), "Duplicate"));
        Assert.Throws<LabForecastCalendarException>(() => LabForecastClock.AddDays(new DateTime(2027, 12, 31, 18, 0, 0, DateTimeKind.Utc), 2, LabDayBasis.Business, calendar));
        Assert.Throws<LabForecastCalendarException>(() => LabForecastClock.StageExit(Utc(9, 20), Utc(9, 19), new(Guid.NewGuid(), "qc", 1, LabDayBasis.Calendar), calendar));
    }

    [Fact]
    public void Each_stage_has_its_own_basis_and_unique_policy_entry()
    {
        var policy = new LabTimingPolicy(Guid.NewGuid(), Guid.NewGuid(), 1, "Test policy");
        policy.AddDuration("sequencing", 5, LabDayBasis.Calendar); policy.AddDuration("assembly", 2, LabDayBasis.Business);
        Assert.Throws<ArgumentException>(() => policy.AddDuration("assembly", 3, LabDayBasis.Calendar));
        Assert.Throws<ArgumentException>(() => policy.AddDuration("qc", -1, LabDayBasis.Business));
        Assert.Equal(LabDayBasis.Business, policy.Durations.Single(d => d.StageKey == "assembly").DayBasis);
    }
    [Fact]
    public void Zero_downstream_days_are_immediate_even_on_a_closed_date()
    {
        var calendar = Calendar(); calendar.AddHoliday(new(2026, 9, 21), "Closure");
        Assert.Equal(Utc(9, 21), LabForecastClock.AddDays(Utc(9, 21), 0, LabDayBasis.Business, calendar));
        Assert.Equal((Utc(9, 23, 7), true), LabForecastClock.StageExit(Utc(9, 21), Utc(9, 21), new(Guid.NewGuid(), "delivery", 0, LabDayBasis.Business), calendar));
    }

}
