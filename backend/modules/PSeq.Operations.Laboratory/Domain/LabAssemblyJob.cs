namespace PSeq.Operations.Laboratory.Domain;

using PSeq.Operations.Laboratory.Common.Persistence;

/// <summary>One assembly attempt for one purchased sample-run. Percentages are deliberately absent.</summary>
public sealed class LabAssemblyJob : IConcurrency
{
    public Guid Id { get; private set; }
    public Guid LabWorkOrderId { get; private set; }
    public Guid LabSpecimenId { get; private set; }
    public Guid OrganizationId { get; private set; }
    public int SequencingRunNumber { get; private set; }
    public Guid? PreviousJobId { get; private set; }
    public string? RetryReason { get; private set; }
    public string ProviderKey { get; private set; } = null!;
    public string? ProviderJobId { get; private set; }
    public string RecipeJson { get; private set; } = null!;
    public string InputsJson { get; private set; } = null!;
    public string RequestSha256 { get; private set; } = null!;
    public Guid RequestedByUserId { get; private set; }
    public DateTime RequestedAtUtc { get; private set; }
    public DateTime? DispatchRequestedAtUtc { get; private set; }
    public DateTime? StartedAtUtc { get; private set; }
    public DateTime? StoppedAtUtc { get; private set; }
    public DateTime? DispositionAtUtc { get; private set; }
    public DateTime? CancellationRequestedAtUtc { get; private set; }
    public Guid? CancellationRequestedByUserId { get; private set; }
    public string? CancellationReason { get; private set; }
    public string State { get; private set; } = "Queued";
    public string? DispositionReason { get; private set; }
    public string? AttentionReason { get; private set; }
    public string? OutputManifestJson { get; private set; }
    public Guid? LabAnalysisRunId { get; private set; }
    public long Version { get; private set; } = 1;
    public bool IsTerminal => State is "Succeeded" or "Failed" or "Terminated" or "CancelledBeforeStart";
    private LabAssemblyJob() { }

    public LabAssemblyJob(Guid id, Guid workId, Guid specimenId, Guid organizationId, int runNumber,
        Guid userId, string providerKey, string recipeJson, string inputsJson, string requestSha256,
        DateTime requestedAtUtc, Guid? previousJobId = null, string? retryReason = null)
    {
        if (new[] { id, workId, specimenId, organizationId, userId }.Contains(Guid.Empty) || runNumber < 1)
            throw new ArgumentException("An assembly job requires a sample, purchased run and requester.");
        RequireUtc(requestedAtUtc);
        LabLineageText.RequireCorrection(previousJobId, retryReason);
        Id = id; LabWorkOrderId = workId; LabSpecimenId = specimenId; OrganizationId = organizationId;
        SequencingRunNumber = runNumber; RequestedByUserId = userId; RequestedAtUtc = requestedAtUtc;
        ProviderKey = LabLineageText.Required(providerKey, 100); RecipeJson = recipeJson; InputsJson = inputsJson;
        RequestSha256 = LabLineageText.Hash(requestSha256); PreviousJobId = previousJobId; RetryReason = retryReason?.Trim();
    }

    public void IncrementVersion() => Version++;
    public bool BeginDispatch(DateTime now)
    {
        RequireUtc(now);
        if (State != "Queued" || CancellationRequestedAtUtc.HasValue) return false;
        State = "Dispatching"; DispatchRequestedAtUtc = now; AttentionReason = null; return true;
    }

    public bool RequestCancellation(Guid userId, string reason, DateTime now)
    {
        if (IsTerminal) throw new InvalidOperationException("This assembly attempt has already ended.");
        if (CancellationRequestedAtUtc.HasValue) return false;
        RequireUtc(now);
        CancellationReason = LabLineageText.Required(reason, 2000);
        CancellationRequestedByUserId = userId; CancellationRequestedAtUtc = now;
        if (State == "Queued") { State = "CancelledBeforeStart"; DispositionAtUtc = now; DispositionReason = CancellationReason; AttentionReason = null; }
        return true;
    }

    public bool SetAttention(string? reason)
    {
        if (reason == AttentionReason) return false;
        AttentionReason = reason is null ? null : LabLineageText.Required(reason, 2000); return true;
    }

    public bool Observe(string providerJobId, string state, DateTime? startedAtUtc, DateTime? stoppedAtUtc,
        DateTime? dispositionAtUtc, string? reason, string? outputManifestJson, bool neverStarted, DateTime receivedAtUtc)
    {
        providerJobId = LabLineageText.Required(providerJobId, 255);
        if (ProviderJobId is not null && ProviderJobId != providerJobId)
            throw new InvalidOperationException("The provider returned a different execution identity for this attempt.");
        if (state is not ("Accepted" or "Running" or "Succeeded" or "Failed" or "Terminated"))
            throw new ArgumentException("Unsupported assembly disposition.");
        foreach (var timestamp in new[] { startedAtUtc, stoppedAtUtc, dispositionAtUtc }.OfType<DateTime>())
        { RequireUtc(timestamp); if (timestamp > receivedAtUtc.AddMinutes(5)) throw new ArgumentException("An execution time is in the future."); }
        // PostgreSQL timestamps retain microseconds. Normalize before replay comparisons.
        startedAtUtc = Precision(startedAtUtc); stoppedAtUtc = Precision(stoppedAtUtc); dispositionAtUtc = Precision(dispositionAtUtc);
        reason = string.IsNullOrWhiteSpace(reason) ? null : LabLineageText.Required(reason, 2000);
        var terminal = state is "Succeeded" or "Failed" or "Terminated";
        if (state == "Running" && !startedAtUtc.HasValue || terminal && !dispositionAtUtc.HasValue
            || terminal && !neverStarted && (!startedAtUtc.HasValue || !stoppedAtUtc.HasValue)
            || !terminal && (stoppedAtUtc.HasValue || dispositionAtUtc.HasValue)
            || neverStarted && (state != "Failed" || StartedAtUtc.HasValue || startedAtUtc.HasValue || stoppedAtUtc.HasValue)
            || stoppedAtUtc.HasValue && (!startedAtUtc.HasValue || stoppedAtUtc < startedAtUtc)
            || dispositionAtUtc.HasValue && stoppedAtUtc > dispositionAtUtc)
            throw new ArgumentException("The provider must supply consistent actual start, stop and disposition times.");
        if (StartedAtUtc.HasValue && startedAtUtc.HasValue && StartedAtUtc != startedAtUtc)
            throw new InvalidOperationException("The provider changed the recorded start time; reconciliation is required.");
        if (IsTerminal)
        {
            if (state != State || stoppedAtUtc != StoppedAtUtc || dispositionAtUtc != DispositionAtUtc
                || reason != DispositionReason || outputManifestJson != OutputManifestJson)
                throw new InvalidOperationException("The provider changed a terminal outcome; reconciliation is required.");
            return SetAttention(null);
        }
        if (State == "Running" && state == "Accepted") return false;
        var changed = ProviderJobId != providerJobId || State != state || StartedAtUtc != startedAtUtc
            || AttentionReason is not null || terminal;
        ProviderJobId = providerJobId; State = state; StartedAtUtc ??= startedAtUtc; AttentionReason = null;
        if (terminal)
        {
            StoppedAtUtc = stoppedAtUtc; DispositionAtUtc = dispositionAtUtc;
            DispositionReason = reason is null ? null : LabLineageText.Required(reason, 2000);
            // A receipt is evidence of provider output, not scientific approval or verified file availability.
            OutputManifestJson = outputManifestJson;
        }
        return changed;
    }

    public void LinkAnalysis(Guid analysisId)
    {
        if (State != "Succeeded" || analysisId == Guid.Empty || LabAnalysisRunId.HasValue && LabAnalysisRunId != analysisId)
            throw new InvalidOperationException("Only a successful attempt can link to its exact completed analysis.");
        LabAnalysisRunId = analysisId;
    }

    private static void RequireUtc(DateTime value)
    { if (value.Kind != DateTimeKind.Utc) throw new ArgumentException("Execution timestamps must be UTC."); }
    private static DateTime? Precision(DateTime? value) => value.HasValue ? new DateTime(value.Value.Ticks - value.Value.Ticks % 10, DateTimeKind.Utc) : null;
}

public sealed class LabAssemblyEvent
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabAssemblyJobId { get; private set; }
    public string Kind { get; private set; } = null!;
    public DateTime RecordedAtUtc { get; private set; }
    public Guid? ActorUserId { get; private set; }
    public string EvidenceJson { get; private set; } = null!;
    private LabAssemblyEvent() { }
    public LabAssemblyEvent(Guid jobId, string kind, DateTime recordedAtUtc, Guid? actorId, string evidenceJson)
    { LabAssemblyJobId = jobId; Kind = kind; RecordedAtUtc = recordedAtUtc; ActorUserId = actorId; EvidenceJson = evidenceJson; }
}
