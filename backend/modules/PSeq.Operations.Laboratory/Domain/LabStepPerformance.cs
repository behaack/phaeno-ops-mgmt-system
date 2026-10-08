namespace PSeq.Operations.Laboratory.Domain;

using System.Globalization;

// Optional for compatible writers. Absence means unknown, never inferred from the recorder.
public sealed record LabStepPerformanceInput(string Mode, bool PersonallyPerformed,
    string? PerformedAt = null, string? LateEntryReason = null,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)] Guid? PerformedByUserId = null);

public sealed record LabStepPerformance(Guid PerformedByUserId, DateTime PerformedAtUtc,
    int UtcOffsetMinutes, string Precision, string EntryMode, string? LateEntryReason,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)] string? VerificationStatus = null)
{
    public static LabStepPerformance Capture(LabStepPerformanceInput input, Guid actorId, DateTime recordedAtUtc)
    {
        if (actorId == Guid.Empty || !input.PersonallyPerformed && !input.PerformedByUserId.HasValue)
            throw new ArgumentException("Confirm that you personally performed this step.");
        if (input.PersonallyPerformed && input.PerformedByUserId.HasValue || input.PerformedByUserId == Guid.Empty || input.PerformedByUserId == actorId)
            throw new ArgumentException("Choose personal confirmation for your own work, or identify a different actual performer.");
        var performerId = input.PerformedByUserId ?? actorId;
        var pending = input.PerformedByUserId.HasValue ? "PendingReview" : null;
        if (pending is not null) LabProtocolDefinition.RequiredText(input.LateEntryReason, 4000, "On-behalf entry reason");
        if (recordedAtUtc.Kind != DateTimeKind.Utc)
            throw new ArgumentException("The recording time must be UTC.");
        if (input.Mode == "now")
        {
            if (input.PerformedAt is not null || pending is null && input.LateEntryReason is not null)
                throw new ArgumentException("Choose Earlier to enter a performed time and late-entry reason.");
            return new(performerId, recordedAtUtc, 0, "server", "now", input.LateEntryReason?.Trim(), pending);
        }
        if (input.Mode != "earlier") throw new ArgumentException("Choose Now or Earlier for the performed time.");
        // Require an explicit offset and minute precision. Never interpret an unspecified server-local time.
        if (!DateTimeOffset.TryParseExact(input.PerformedAt, "yyyy-MM-dd'T'HH:mmzzz",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var time) || time.UtcDateTime == default)
            throw new ArgumentException("Enter the performed date and time with its UTC offset, to the minute.");
        if (time.UtcDateTime > recordedAtUtc)
            throw new ArgumentException("The performed time cannot be in the future.");
        LabProtocolDefinition.RequiredText(input.LateEntryReason, 4000, "Late-entry reason");
        return new(performerId, time.UtcDateTime, (int)time.Offset.TotalMinutes, "minute", "earlier", input.LateEntryReason!.Trim(), pending);
    }
}
