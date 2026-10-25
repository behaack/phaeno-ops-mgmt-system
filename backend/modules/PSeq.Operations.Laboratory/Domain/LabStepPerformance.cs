namespace PSeq.Operations.Laboratory.Domain;

using System.Globalization;

// Optional for compatible writers. Absence means unknown, never inferred from the recorder.
public sealed record LabStepPerformanceInput(string Mode, bool PersonallyPerformed,
    string? PerformedAt = null, string? LateEntryReason = null,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)] Guid? PerformedByUserId = null,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)] LabStepIntervalInput? Interval = null,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)] IReadOnlyList<LabStepParticipant>? Participants = null);

public sealed record LabStepIntervalInput(string StartedAt, string CompletedAt);
public sealed record LabStepInterval(DateTime StartedAtUtc, DateTime CompletedAtUtc, int StartUtcOffsetMinutes, int EndUtcOffsetMinutes);
public sealed record LabStepParticipant(Guid UserId, string Role);

public sealed record LabStepPerformance(Guid PerformedByUserId, DateTime PerformedAtUtc,
    int UtcOffsetMinutes, string Precision, string EntryMode, string? LateEntryReason,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)] string? VerificationStatus = null,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)] LabStepInterval? Interval = null,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)] IReadOnlyList<LabStepParticipant>? Participants = null)
{
    public static LabStepPerformance Capture(LabStepPerformanceInput input, Guid actorId, DateTime recordedAtUtc)
    {
        if (actorId == Guid.Empty || !input.PersonallyPerformed && !input.PerformedByUserId.HasValue)
            throw new ArgumentException("Confirm that you personally performed this step.");
        if (input.PersonallyPerformed && input.PerformedByUserId.HasValue || input.PerformedByUserId == Guid.Empty || input.PerformedByUserId == actorId)
            throw new ArgumentException("Choose personal confirmation for your own work, or identify a different actual performer.");
        var performerId = input.PerformedByUserId ?? actorId;
        var pending = input.PerformedByUserId.HasValue || input.Participants is { Count: > 0 } ? "PendingReview" : null;
        if (pending is not null) LabProtocolDefinition.RequiredText(input.LateEntryReason, 4000, "On-behalf entry reason");
        if (recordedAtUtc.Kind != DateTimeKind.Utc)
            throw new ArgumentException("The recording time must be UTC.");
        if (input.Mode == "now")
        {
            if (input.PerformedAt is not null || pending is null && input.LateEntryReason is not null)
                throw new ArgumentException("Choose Earlier to enter a performed time and late-entry reason.");
            return Extend(new(performerId, recordedAtUtc, 0, "server", "now", input.LateEntryReason?.Trim(), pending), input, recordedAtUtc);
        }
        if (input.Mode != "earlier") throw new ArgumentException("Choose Now or Earlier for the performed time.");
        // Require an explicit offset and minute precision. Never interpret an unspecified server-local time.
        if (!DateTimeOffset.TryParseExact(input.PerformedAt, "yyyy-MM-dd'T'HH:mmzzz",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var time) || time.UtcDateTime == default)
            throw new ArgumentException("Enter the performed date and time with its UTC offset, to the minute.");
        if (time.UtcDateTime > recordedAtUtc)
            throw new ArgumentException("The performed time cannot be in the future.");
        LabProtocolDefinition.RequiredText(input.LateEntryReason, 4000, "Late-entry reason");
        return Extend(new(performerId, time.UtcDateTime, (int)time.Offset.TotalMinutes, "minute", "earlier", input.LateEntryReason!.Trim(), pending), input, recordedAtUtc);
    }

    private static LabStepPerformance Extend(LabStepPerformance value, LabStepPerformanceInput input, DateTime recorded)
    {
        LabStepInterval? interval = null;
        if (input.Interval is { } times)
        {
            if (!DateTimeOffset.TryParseExact(times.StartedAt, "yyyy-MM-dd'T'HH:mmzzz", CultureInfo.InvariantCulture, DateTimeStyles.None, out var start)
                || !DateTimeOffset.TryParseExact(times.CompletedAt, "yyyy-MM-dd'T'HH:mmzzz", CultureInfo.InvariantCulture, DateTimeStyles.None, out var end)
                || end < start || end.UtcDateTime > recorded || end.UtcDateTime > value.PerformedAtUtc)
                throw new ArgumentException("Record actual step start/end times with explicit UTC offsets, in order and no later than the performed time.");
            interval = new(start.UtcDateTime, end.UtcDateTime, (int)start.Offset.TotalMinutes, (int)end.Offset.TotalMinutes);
        }
        var participants = input.Participants?.ToArray();
        if (participants is { Length: > 0 })
        {
            if (participants.Length > 19 || participants.Any(p => p.UserId == Guid.Empty || p.UserId == value.PerformedByUserId)
                || participants.Select(p => p.UserId).Distinct().Count() != participants.Length)
                throw new ArgumentException("Identify up to 19 distinct additional participants, separate from the primary performer.");
            foreach (var participant in participants) LabProtocolDefinition.RequiredText(participant.Role, 100, "Participant role");
            LabProtocolDefinition.RequiredText(input.LateEntryReason, 4000, "Participant attribution reason");
        }
        return value with { Interval = interval, Participants = participants is { Length: > 0 } ? participants : null,
            VerificationStatus = participants is { Length: > 0 } ? "PendingReview" : value.VerificationStatus };
    }

    public void ValidateRequirements(LabProtocolStepDefinition step)
    {
        if (step.TimingRequired && Interval is null) throw new ArgumentException("This procedure requires actual step start and end times.");
        if (1 + (Participants?.Count ?? 0) < step.MinimumParticipants) throw new ArgumentException($"This procedure requires at least {step.MinimumParticipants} named participants including the primary performer.");
    }
}
