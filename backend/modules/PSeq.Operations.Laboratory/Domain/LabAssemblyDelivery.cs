namespace PSeq.Operations.Laboratory.Domain;

/// <summary>One stable POMS command identity. Transport delivery never establishes execution.</summary>
public sealed class LabAssemblyCommand
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabAssemblyJobId { get; private set; }
    public string Kind { get; private set; } = null!;
    public DateTime RequestedAtUtc { get; private set; }
    public int AttemptCount { get; private set; }
    public DateTime? FirstAttemptAtUtc { get; private set; }
    public DateTime? LastAttemptAtUtc { get; private set; }
    public DateTime? NextAttemptAtUtc { get; private set; }
    public DateTime? ReceivedAtUtc { get; private set; }
    public DateTime? ConfirmedAtUtc { get; private set; }
    public DateTime? EscalatedAtUtc { get; private set; }
    public bool Suppressed { get; private set; }
    private LabAssemblyCommand() { }
    public LabAssemblyCommand(Guid jobId, string kind, DateTime requestedAtUtc)
    {
        if (jobId == Guid.Empty || kind is not ("Run" or "Cancel") || requestedAtUtc.Kind != DateTimeKind.Utc)
            throw new ArgumentException("A command requires an assembly attempt, Run/Cancel kind and UTC request time.");
        LabAssemblyJobId = jobId; Kind = kind; RequestedAtUtc = requestedAtUtc;
    }
    public bool IsDue(DateTime now) => !Suppressed && ConfirmedAtUtc is null && (NextAttemptAtUtc is null || NextAttemptAtUtc <= now);
    public void Attempt(DateTime now, int initialSeconds, int maximumSeconds)
    {
        if (now.Kind != DateTimeKind.Utc || !IsDue(now)) throw new InvalidOperationException("This command is not due for delivery.");
        AttemptCount++; FirstAttemptAtUtc ??= now; LastAttemptAtUtc = now;
        var delay = Math.Min(Math.Clamp(maximumSeconds, 1, 3600), Math.Clamp(initialSeconds, 1, 3600) * Math.Pow(2, Math.Min(AttemptCount - 1, 10)));
        NextAttemptAtUtc = now.AddSeconds(delay);
    }
    public void Receive(DateTime now) { RequireUtc(now); ReceivedAtUtc ??= now; }
    public void Confirm(DateTime now) { RequireUtc(now); if (Kind == "Run") ReceivedAtUtc ??= now; ConfirmedAtUtc ??= now; NextAttemptAtUtc = null; }
    public void Suppress() { Suppressed = true; NextAttemptAtUtc = null; }
    public bool Escalate(DateTime now, int afterSeconds)
    {
        RequireUtc(now);
        if (Suppressed || ConfirmedAtUtc.HasValue || EscalatedAtUtc.HasValue
            || now < (FirstAttemptAtUtc ?? RequestedAtUtc).AddSeconds(afterSeconds)) return false;
        EscalatedAtUtc = now; return true;
    }
    private static void RequireUtc(DateTime value) { if (value.Kind != DateTimeKind.Utc) throw new ArgumentException("Delivery times must be UTC."); }
}

/// <summary>Durable normalized lifecycle receipt; transient percentages never enter this ledger.</summary>
public sealed class LabAssemblyReceipt
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabAssemblyJobId { get; private set; }
    public string ProviderKey { get; private set; } = null!;
    public string ProviderEventId { get; private set; } = null!;
    public long Sequence { get; private set; }
    public DateTime OccurredAtUtc { get; private set; }
    public DateTime ReceivedAtUtc { get; private set; }
    public string PayloadSha256 { get; private set; } = null!;
    public string PayloadJson { get; private set; } = null!;
    public string Outcome { get; private set; } = null!;
    public string? ConflictSha256 { get; private set; }
    public DateTime? ConflictRecordedAtUtc { get; private set; }
    public bool CanAcknowledge => Outcome is "Applied" or "Ignored" && ConflictSha256 is null;
    private LabAssemblyReceipt() { }
    public LabAssemblyReceipt(Guid jobId, string providerKey, string eventId, long sequence, DateTime occurred, DateTime received,
        string hash, string payload, string outcome)
    {
        if (jobId == Guid.Empty || sequence < 1 || occurred.Kind != DateTimeKind.Utc || received.Kind != DateTimeKind.Utc
            || outcome is not ("Applied" or "Ignored" or "Conflict")) throw new ArgumentException("Invalid lifecycle receipt.");
        LabAssemblyJobId = jobId; ProviderKey = LabLineageText.Required(providerKey, 100);
        ProviderEventId = LabLineageText.Required(eventId, 128); Sequence = sequence;
        OccurredAtUtc = occurred; ReceivedAtUtc = received; PayloadSha256 = LabLineageText.Hash(hash); PayloadJson = payload; Outcome = outcome;
    }
    public bool Conflict(string hash, DateTime now)
    {
        if (now.Kind != DateTimeKind.Utc) throw new ArgumentException("Receipt times must be UTC.");
        if (ConflictSha256 is not null) return false;
        ConflictSha256 = LabLineageText.Hash(hash); ConflictRecordedAtUtc = now; return true;
    }
}
