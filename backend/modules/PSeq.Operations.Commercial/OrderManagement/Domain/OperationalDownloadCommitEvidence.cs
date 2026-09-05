namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public enum DownloadCommitPhase { Admission = 1, Completion = 2 }

/// <summary>The source transaction is recorded with the event; only its verified commit time may be appended.</summary>
public sealed class OperationalDownloadCommitEvidence : IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OperationalFileDownloadId { get; private set; }
    public DownloadCommitPhase Phase { get; private set; }
    public string SourceTransactionId { get; private set; } = null!;
    public DateTime RecordedAtUtc { get; private set; }
    public DateTime? AdmissionCutoffAtUtc { get; private set; }
    public DateTime? CommittedAtUtc { get; private set; }
    public DateTime? ObservedAtUtc { get; private set; }
    public long Version { get; private set; } = 1;
    private OperationalDownloadCommitEvidence() { }

    public OperationalDownloadCommitEvidence(Guid attemptId, DownloadCommitPhase phase, string sourceTransactionId,
        DateTime recordedAtUtc, DateTime? admissionCutoffAtUtc = null)
    {
        if (attemptId == Guid.Empty || !Enum.IsDefined(phase)) throw new ArgumentException("A valid download and phase are required.");
        if (!ulong.TryParse(sourceTransactionId, out var transactionId) || transactionId < 3)
            throw new ArgumentException("A full PostgreSQL transaction identifier is required.");
        if (recordedAtUtc.Kind != DateTimeKind.Utc || (admissionCutoffAtUtc.HasValue && admissionCutoffAtUtc.Value.Kind != DateTimeKind.Utc))
            throw new ArgumentException("Commit evidence must use UTC.");
        if (phase == DownloadCommitPhase.Completion && admissionCutoffAtUtc.HasValue)
            throw new ArgumentException("Only admission has a cutoff.");
        OperationalFileDownloadId = attemptId;
        Phase = phase;
        SourceTransactionId = transactionId.ToString(System.Globalization.CultureInfo.InvariantCulture);
        RecordedAtUtc = recordedAtUtc;
        AdmissionCutoffAtUtc = admissionCutoffAtUtc;
    }

    public void Observe(DateTime committedAtUtc, DateTime observedAtUtc)
    {
        if (CommittedAtUtc.HasValue) throw new InvalidOperationException("Verified commit evidence is immutable.");
        if (committedAtUtc.Kind != DateTimeKind.Utc || observedAtUtc.Kind != DateTimeKind.Utc || committedAtUtc > observedAtUtc)
            throw new ArgumentException("The observed commit timestamp must use UTC and precede observation.");
        CommittedAtUtc = committedAtUtc;
        ObservedAtUtc = observedAtUtc;
    }
    public void IncrementVersion() => Version++;
}
