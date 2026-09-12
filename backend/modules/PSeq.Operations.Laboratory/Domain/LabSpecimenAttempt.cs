namespace PSeq.Operations.Laboratory.Domain;

using System.Text.Json;

public static class LabTubeUsePolicy
{
    public const string RunOneWithFailureFallback = "run_one_with_failure_fallback";
    public const int Version = 1;
}

public enum LabSpecimenAttemptState { Planned, InProgress, OnHold, Failed, Succeeded, Cancelled }
public enum LabSpecimenProcessingState { Ready, Planned, InProgress, OnHold, Failed, Succeeded }
public sealed record LabAttemptStageSkip(Guid StageId, string Reason, Guid ActorId, DateTime RecordedAtUtc);

public sealed class LabSpecimenAttempt : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public Guid LabSpecimenId { get; private set; }
    public Guid SourceContainerId { get; private set; }
    public Guid LabServiceWorkflowVersionId { get; private set; }
    public int Sequence { get; private set; }
    public Guid? PreviousAttemptId { get; private set; }
    public LabSpecimenAttemptState State { get; private set; } = LabSpecimenAttemptState.Planned;
    public DateTime? StartedAtUtc { get; private set; }
    public DateTime? ClosedAtUtc { get; private set; }
    public Guid? ClosedByUserId { get; private set; }
    public string? FailureReasonCode { get; private set; }
    public string? FailureEvidence { get; private set; }
    public Guid? FailedExecutionId { get; private set; }
    public string? HoldReason { get; private set; }
    public Guid? HoldOwnerUserId { get; private set; }
    public string? HoldNextAction { get; private set; }
    public string StageSkipsJson { get; private set; } = "[]";

    private LabSpecimenAttempt() { }
    public LabSpecimenAttempt(Guid workId, Guid specimenId, Guid sourceId, Guid workflowId, int sequence, Guid? previousId)
    {
        if (new[] { workId, specimenId, sourceId, workflowId }.Any(id => id == Guid.Empty) || sequence < 1)
            throw new ArgumentException("A specimen, source, workflow and valid attempt sequence are required.");
        LabWorkOrderId = workId; LabSpecimenId = specimenId; SourceContainerId = sourceId;
        LabServiceWorkflowVersionId = workflowId; Sequence = sequence; PreviousAttemptId = previousId;
    }

    public void Start(string sourceBarcode, string confirmedBarcode, DateTime utcNow)
    {
        if (State != LabSpecimenAttemptState.Planned) throw new InvalidOperationException("Only a planned attempt can start.");
        if (!string.Equals(sourceBarcode, confirmedBarcode?.Trim(), StringComparison.Ordinal))
            throw new ArgumentException("Scan the selected source tube before starting.");
        StartedAtUtc = utcNow; State = LabSpecimenAttemptState.InProgress;
    }

    public void RequireOpen(bool allowQcHold = true)
    {
        if (State is LabSpecimenAttemptState.Failed or LabSpecimenAttemptState.Succeeded or LabSpecimenAttemptState.Cancelled)
            throw new InvalidOperationException("This attempt is closed. Its evidence is retained and cannot progress further.");
        if (HoldReason is not null || (!allowQcHold && State == LabSpecimenAttemptState.OnHold))
            throw new InvalidOperationException("Resolve the attempt hold before continuing.");
    }

    public void Hold(string reason, string nextAction, Guid ownerId)
    {
        RequireOpen();
        if (!StartedAtUtc.HasValue || ownerId == Guid.Empty) throw new InvalidOperationException("Hold requires a started attempt and a responsible owner.");
        var normalizedReason = Required(reason, "Hold reason", 2000);
        var normalizedAction = Required(nextAction, "Next action", 2000);
        HoldReason = normalizedReason; HoldNextAction = normalizedAction; HoldOwnerUserId = ownerId;
        State = LabSpecimenAttemptState.OnHold;
    }

    public void Resume(string resolution)
    {
        if (State != LabSpecimenAttemptState.OnHold || HoldReason is null)
            throw new InvalidOperationException("This attempt has no operational hold to resolve.");
        Required(resolution, "Resolution", 2000);
        HoldReason = null; HoldNextAction = null; HoldOwnerUserId = null;
        State = LabSpecimenAttemptState.InProgress;
    }

    public void Refresh(bool hasBlockedExecution, bool allStagesSatisfied, Guid actorId, DateTime utcNow)
    {
        RequireOpen();
        if (!StartedAtUtc.HasValue && !allStagesSatisfied) return;
        State = hasBlockedExecution ? LabSpecimenAttemptState.OnHold : LabSpecimenAttemptState.InProgress;
        if (!hasBlockedExecution && allStagesSatisfied)
        {
            State = LabSpecimenAttemptState.Succeeded; ClosedAtUtc = utcNow; ClosedByUserId = actorId;
        }
    }

    public void SkipStage(LabServiceWorkflowStage stage, string reason, Guid actorId, DateTime utcNow)
    {
        RequireOpen(false);
        if (stage.LabServiceWorkflowVersionId != LabServiceWorkflowVersionId
            || stage.Requirement == LabServiceWorkflowStageRequirement.Required)
            throw new InvalidOperationException("Only optional or conditional stages in this attempt's workflow may be skipped.");
        var decisions = ReadStageSkips().ToList();
        if (decisions.Any(item => item.StageId == stage.Id)) throw new InvalidOperationException("This stage already has a decision.");
        decisions.Add(new(stage.Id, Required(reason, "Skip reason", 2000), actorId, utcNow));
        StageSkipsJson = JsonSerializer.Serialize(decisions);
    }
    public IReadOnlyList<LabAttemptStageSkip> ReadStageSkips() => JsonSerializer.Deserialize<List<LabAttemptStageSkip>>(StageSkipsJson) ?? [];

    public void Fail(string code, string evidence, Guid executionId, Guid actorId, DateTime utcNow)
    {
        if (State is not (LabSpecimenAttemptState.InProgress or LabSpecimenAttemptState.OnHold) || !StartedAtUtc.HasValue)
            throw new InvalidOperationException("Only a started unresolved attempt can fail.");
        if (code is not ("analysis_failed" or "material_unusable" or "equipment_incident" or "procedure_deviation" or "other"))
            throw new ArgumentException("Choose a predefined processing-failure reason.");
        var normalized = Required(evidence, "Failure evidence", 4000);
        if (executionId == Guid.Empty || actorId == Guid.Empty) throw new ArgumentException("A failed execution and actor are required.");
        FailureReasonCode = code; FailureEvidence = normalized; FailedExecutionId = executionId;
        State = LabSpecimenAttemptState.Failed; ClosedAtUtc = utcNow; ClosedByUserId = actorId;
    }

    public void Cancel(string reason, Guid actorId, DateTime utcNow)
    {
        if (State != LabSpecimenAttemptState.Planned || StartedAtUtc.HasValue)
            throw new InvalidOperationException("Only an unstarted attempt can release its source.");
        FailureEvidence = Required(reason, "Cancellation reason", 2000);
        State = LabSpecimenAttemptState.Cancelled; ClosedAtUtc = utcNow; ClosedByUserId = actorId;
    }
}

public sealed class LabAttemptCommandReceipt
{
    public Guid Id { get; private set; }
    public Guid LabWorkOrderId { get; private set; }
    public Guid ActorUserId { get; private set; }
    public string RequestHash { get; private set; } = null!;
    public DateTime AppliedAtUtc { get; private set; }
    private LabAttemptCommandReceipt() { }
    public LabAttemptCommandReceipt(Guid id, Guid workId, Guid actorId, string hash, DateTime now)
    { Id = id; LabWorkOrderId = workId; ActorUserId = actorId; RequestHash = hash; AppliedAtUtc = now; }
}
