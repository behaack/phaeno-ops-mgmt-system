namespace PSeq.Operations.Laboratory.Domain;

public enum LabDayBasis { Calendar, Business }

public sealed class LabBusinessCalendar : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public int Revision { get; private set; }
    public string TimeZoneId { get; private set; } = "America/Los_Angeles";
    public DateOnly CoverageFrom { get; private set; }
    public DateOnly CoverageTo { get; private set; }
    public string Reason { get; private set; } = "";
    public List<LabHoliday> Holidays { get; private set; } = [];
    private LabBusinessCalendar() { }
    public LabBusinessCalendar(int revision, string zone, DateOnly from, DateOnly to, string reason)
    {
        if (revision < 1 || from > to || to.DayNumber - from.DayNumber > 3660)
            throw new ArgumentException("Choose a valid calendar coverage range of at most ten years.");
        _ = TimeZoneInfo.FindSystemTimeZoneById(zone);
        Revision = revision; TimeZoneId = zone; CoverageFrom = from; CoverageTo = to;
        Reason = Required(reason, nameof(reason), 2000);
    }
    public void AddHoliday(DateOnly date, string name)
    {
        if (date < CoverageFrom || date > CoverageTo || Holidays.Any(h => h.Date == date))
            throw new ArgumentException("Holiday dates must be unique and within calendar coverage.");
        Holidays.Add(new LabHoliday(Id, date, name));
    }
}

public sealed class LabHoliday
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabBusinessCalendarId { get; private set; }
    public DateOnly Date { get; private set; }
    public string Name { get; private set; } = "";
    private LabHoliday() { }
    public LabHoliday(Guid calendarId, DateOnly date, string name)
    { LabBusinessCalendarId = calendarId; Date = date; Name = LabAuditedEntity.Required(name, nameof(name), 255); }
}

public sealed class LabTimingPolicy : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabServiceWorkflowVersionId { get; private set; }
    public Guid LabBusinessCalendarId { get; private set; }
    public int Revision { get; private set; }
    public string Reason { get; private set; } = "";
    public bool RequiresSequencing { get; private set; }
    public List<LabStageDuration> Durations { get; private set; } = [];
    private LabTimingPolicy() { }
    public LabTimingPolicy(Guid workflowId, Guid calendarId, int revision, string reason, bool requiresSequencing = true)
    {
        RequiresSequencing = requiresSequencing;
        if (workflowId == Guid.Empty || calendarId == Guid.Empty || revision < 1)
            throw new ArgumentException("A workflow, calendar and revision are required.");
        LabServiceWorkflowVersionId = workflowId; LabBusinessCalendarId = calendarId; Revision = revision;
        Reason = Required(reason, nameof(reason), 2000);
    }
    public void AddDuration(string key, decimal days, LabDayBasis basis)
    {
        if (Durations.Any(d => d.StageKey == key)) throw new ArgumentException("Each stage may have only one duration.");
        Durations.Add(new LabStageDuration(Id, key, days, basis));
    }
}

public sealed class LabStageDuration
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabTimingPolicyId { get; private set; }
    public string StageKey { get; private set; } = "";
    public decimal Days { get; private set; }
    public LabDayBasis DayBasis { get; private set; }
    private LabStageDuration() { }
    public LabStageDuration(Guid policyId, string key, decimal days, LabDayBasis basis)
    {
        if (days < 0 || days > 365 || decimal.Round(days, 2) != days || !Enum.IsDefined(basis))
            throw new ArgumentException("Duration must be 0â€“365 days with at most two decimal places and a valid day basis.");
        LabTimingPolicyId = policyId; StageKey = LabAuditedEntity.Required(key, nameof(key), 100); Days = days; DayBasis = basis;
    }
}

// Append-only bindings retain deliberate timing-policy changes without altering commitments.
public sealed class LabJobTimingPolicy : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public Guid LabTimingPolicyId { get; private set; }
    public int Revision { get; private set; }
    public string Reason { get; private set; } = "";
    private LabJobTimingPolicy() { }
    public LabJobTimingPolicy(Guid jobId, Guid policyId, int revision, string reason)
    { LabWorkOrderId = jobId; LabTimingPolicyId = policyId; Revision = revision; Reason = Required(reason, nameof(reason), 2000); }
}

// Source transitions are captured in the same SaveChanges transaction as the state change.
public sealed class LabForecastTransition
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public Guid SourceId { get; private set; }
    public string SourceKind { get; private set; } = "";
    public string State { get; private set; } = "";
    public string? PreviousState { get; private set; }
    public DateTime EnteredAtUtc { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    public Guid? ActorUserId { get; private set; }
    private LabForecastTransition() { }
    public LabForecastTransition(Guid jobId, Guid sourceId, string kind, string state, string? previous, DateTime at, Guid? actor)
    { LabWorkOrderId = jobId; SourceId = sourceId; SourceKind = kind; State = state; PreviousState = previous; EnteredAtUtc = at; RecordedAtUtc = at; ActorUserId = actor; }
}

public sealed class LabForecastSnapshot
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public DateTime EvaluatedAtUtc { get; private set; }
    public string DetailsJson { get; private set; } = "{}";
    private LabForecastSnapshot() { }
    public LabForecastSnapshot(Guid jobId, DateTime at, string json) { LabWorkOrderId = jobId; EvaluatedAtUtc = at; DetailsJson = json; }
}

public sealed class LabForecastCalendarException(string message) : InvalidOperationException(message);

public static class LabForecastClock
{
    // Each local eligible date is one day, independent of DST and shift length.
    public static DateTime AddDays(DateTime startUtc, decimal days, LabDayBasis basis, LabBusinessCalendar calendar)
    {
        if (startUtc.Kind != DateTimeKind.Utc || days < 0 || days > 3660) throw new ArgumentException("A UTC time and valid duration are required.");
        if (days == 0) return startUtc;
        var zone = TimeZoneInfo.FindSystemTimeZoneById(calendar.TimeZoneId);
        var local = TimeZoneInfo.ConvertTimeFromUtc(startUtc, zone);
        if (basis == LabDayBasis.Calendar) return ToUtc(local.AddDays((double)days), zone);
        var excluded = calendar.Holidays.Select(h => h.Date).ToHashSet();
        bool Eligible(DateTime value)
        {
            var date = DateOnly.FromDateTime(value);
            if (date < calendar.CoverageFrom || date > calendar.CoverageTo)
                throw new LabForecastCalendarException("Business calendar coverage does not include the projected work; extend the calendar and apply its policy.");
            return value.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday) && !excluded.Contains(date);
        }
        while (!Eligible(local)) local = local.Date.AddDays(1);
        while (days > 0)
        {
            var available = (TimeSpan.TicksPerDay - local.TimeOfDay.Ticks) / (decimal)TimeSpan.TicksPerDay;
            if (days < available) { local = local.AddTicks((long)decimal.Round(days * TimeSpan.TicksPerDay)); days = 0; }
            else
            {
                days -= available; local = local.Date.AddDays(1);
                while (!Eligible(local)) local = local.AddDays(1);
            }
        }
        return ToUtc(local, zone);
    }
    private static DateTime ToUtc(DateTime local, TimeZoneInfo zone)
    {
        local = DateTime.SpecifyKind(local, DateTimeKind.Unspecified);
        while (zone.IsInvalidTime(local)) local = local.AddMinutes(1);
        return TimeZoneInfo.ConvertTimeToUtc(local, zone);
    }
    public static (DateTime Exit, bool Overrun) StageExit(DateTime entered, DateTime now, LabStageDuration duration, LabBusinessCalendar calendar)
    {
        if (entered > now) throw new LabForecastCalendarException("The recorded stage entry is in the future.");
        var planned = AddDays(entered, duration.Days, duration.DayBasis, calendar);
        return planned > now ? (planned, false) : (AddDays(now, 1, duration.DayBasis, calendar), true);
    }
}
