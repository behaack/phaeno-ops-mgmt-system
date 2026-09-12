namespace PSeq.Operations.Laboratory.Domain;

using System.Text.Json;

public sealed record LabTrayLayout(string Name, int Rows, int Columns, string Labels, IReadOnlyList<string> Unavailable)
{
    public IReadOnlyList<string> Positions() => Enumerable.Range(0, Rows * Columns)
        .Select(i => Labels == "numeric" ? (i + 1).ToString() : $"{(char)('A' + i / Columns)}{i % Columns + 1}").ToList();

    public void Validate()
    {
        LabProtocolDefinition.RequiredText(Name, 120, "Tray format name");
        if (Rows is < 1 or > 26 || Columns is < 1 or > 24 || Rows * Columns > 384)
            throw new ArgumentException("Use 1–26 rows and 1–24 columns, up to 384 positions.");
        if (Labels is not ("numeric" or "grid")) throw new ArgumentException("Choose numeric or row/column position labels.");
        if (Unavailable is null || Unavailable.Distinct().Count() != Unavailable.Count || Unavailable.Any(p => !Positions().Contains(p))
            || Unavailable.Count == Rows * Columns)
            throw new ArgumentException("Unavailable positions must be unique positions in the tray; leave at least one usable position.");
    }
    public string ToJson() { Validate(); return JsonSerializer.Serialize(this); }
    public static LabTrayLayout Read(string json) => JsonSerializer.Deserialize<LabTrayLayout>(json)!;
}

public sealed class LabTrayFormat : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string LayoutJson { get; private set; } = null!;
    public bool IsActive { get; private set; } = true;
    private LabTrayFormat() { }
    public LabTrayFormat(LabTrayLayout layout) => LayoutJson = layout.ToJson();
    public void Update(LabTrayLayout layout, bool active) { LayoutJson = layout.ToJson(); IsActive = active; }
}

public sealed class LabPreparationBatch : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = null!;
    public Guid LabTrayFormatId { get; private set; }
    public Guid LabServiceWorkflowVersionId { get; private set; }
    public string LayoutJson { get; private set; } = null!;
    public LabBatchStatus Status { get; private set; } = LabBatchStatus.Draft;
    public DateTime? StartedAtUtc { get; private set; }
    public DateTime? CompletedAtUtc { get; private set; }
    private LabPreparationBatch() { }
    public LabPreparationBatch(string name, LabTrayFormat format, Guid workflowId)
    {
        if (!format.IsActive || workflowId == Guid.Empty) throw new ArgumentException("Choose an active tray format and approved workflow.");
        Name = Required(name, "Batch name", 160); LabTrayFormatId = format.Id;
        LayoutJson = format.LayoutJson; LabServiceWorkflowVersionId = workflowId;
    }
    public void RequireDraft()
    {
        if (Status != LabBatchStatus.Draft) throw new InvalidOperationException("The tray is locked. Tubes cannot be moved, added or removed after preparation starts.");
    }
    public void RequireActive()
    {
        if (Status != LabBatchStatus.InProgress) throw new InvalidOperationException("Start this preparation batch before recording work. Closed batches are read-only.");
    }
    public void CheckPosition(string position, IEnumerable<LabPreparationMember> members, Guid? movingId = null)
    {
        RequireDraft(); var layout = LabTrayLayout.Read(LayoutJson);
        if (!layout.Positions().Contains(position) || layout.Unavailable.Contains(position)) throw new ArgumentException("Choose an available tray position.");
        if (members.Any(m => !m.Removed && m.Position == position && m.Id != movingId)) throw new InvalidOperationException("That tray position already contains a tube.");
    }
    public void Start(IReadOnlyList<LabPreparationMember> members, bool confirmed, DateTime now)
    {
        RequireDraft();
        if (!confirmed || !members.Any(m => !m.Removed)) throw new ArgumentException("Confirm the assembled tray with at least one scanned tube.");
        Status = LabBatchStatus.InProgress; StartedAtUtc = now;
    }
    public void Complete(bool allResolved, DateTime now)
    {
        RequireActive();
        if (!allResolved) throw new InvalidOperationException("Every tube needs a completed, QC-assessed output or an explicit failed attempt. Resolve pending work and Holds first.");
        Status = LabBatchStatus.Complete; CompletedAtUtc = now;
    }
    public void Cancel() { RequireDraft(); Status = LabBatchStatus.Cancelled; }
}

public sealed class LabPreparationMember
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabPreparationBatchId { get; private set; }
    public Guid LabSpecimenAttemptId { get; private set; }
    public string Position { get; private set; } = null!;
    public string ConfirmedBarcode { get; private set; } = null!;
    public bool Removed { get; private set; }
    public Guid? OutputContainerId { get; private set; }
    public bool OutputConfirmed { get; private set; }
    public Guid? LabLibraryId { get; private set; }
    private LabPreparationMember() { }
    public LabPreparationMember(Guid batchId, Guid attemptId, string position, string barcode)
    { LabPreparationBatchId = batchId; LabSpecimenAttemptId = attemptId; Position = position; ConfirmedBarcode = barcode; }
    public void Move(LabPreparationBatch batch, string position, IEnumerable<LabPreparationMember> members)
    { batch.CheckPosition(position, members, Id); Position = position; }
    public void Remove(LabPreparationBatch batch) { batch.RequireDraft(); Removed = true; }
    public void SetOutput(Guid id)
    {
        if (OutputContainerId.HasValue) throw new InvalidOperationException("This tube already has a prepared output. Open its existing output.");
        OutputContainerId = id;
    }
    public void SetLibrary(Guid id) => LabLibraryId = id;
    public void ConfirmOutput(string barcode, string confirmedBarcode)
    {
        if (!OutputContainerId.HasValue || barcode != confirmedBarcode?.Trim()) throw new ArgumentException("Scan the prepared output's barcode to confirm its identity.");
        OutputConfirmed = true;
    }
}

// The command and its exact coverage are retained once. Per-execution evidence references this record.
public sealed class LabPreparationRecord
{
    public Guid Id { get; private set; }
    public Guid LabPreparationBatchId { get; private set; }
    public Guid ActorUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    public string Action { get; private set; } = null!;
    public string RequestHash { get; private set; } = null!;
    public string DetailsJson { get; private set; } = null!;
    private LabPreparationRecord() { }
    public LabPreparationRecord(Guid id, Guid batchId, Guid actorId, string action, string hash, string details, DateTime now)
    { Id = id; LabPreparationBatchId = batchId; ActorUserId = actorId; Action = action; RequestHash = hash; DetailsJson = details; RecordedAtUtc = now; }
}

public sealed record LabPreparationTubeInput(Guid MemberId, IReadOnlyDictionary<string, JsonElement> Captures, string? QcOutcome, string? Reason);
public sealed record LabPreparationStepInput(Guid StageId, string StepKey, string Action, string Outcome,
    IReadOnlyList<Guid> CoveredMemberIds, IReadOnlyDictionary<string, JsonElement> SharedCaptures,
    IReadOnlyList<LabPreparationTubeInput> Tubes, string? SharedQcOutcome, string? Reason,
    bool CoverageConfirmed, bool OperatorConfirmed, bool ResourcesConfirmed);

public static class LabPreparationEvidence
{
    public static LabProtocolStepInput Resolve(LabProtocolStepDefinition step, LabPreparationStepInput input, Guid memberId, Guid recordId)
    {
        if (!input.CoverageConfirmed || input.CoveredMemberIds.Count == 0 || input.CoveredMemberIds.Distinct().Count() != input.CoveredMemberIds.Count
            || !input.CoveredMemberIds.Contains(memberId) || input.Tubes.Select(t => t.MemberId).Distinct().Count() != input.Tubes.Count
            || input.Tubes.Any(t => !input.CoveredMemberIds.Contains(t.MemberId)))
            throw new ArgumentException("Confirm the exact tubes covered by this step, without duplicates.");
        var tube = input.Tubes.SingleOrDefault(t => t.MemberId == memberId);
        if (input.Outcome == "skipped")
        {
            if (input.SharedCaptures.Count > 0 || input.Tubes.Any(t => t.Captures.Count > 0 || t.QcOutcome is not null) || input.SharedQcOutcome is not null)
                throw new ArgumentException("A skipped step cannot contain performed work or QC.");
            return new(step.Key, input.Action, input.Outcome, new Dictionary<string, JsonElement>(), false, false, null, tube?.Reason ?? input.Reason, recordId);
        }
        if (input.SharedCaptures.Keys.Any(k => !step.Captures.Any(c => c.Key == k && c.Scope is "batch" or "shared"))
            || input.Tubes.Any(t => t.Captures.Keys.Any(k => !step.Captures.Any(c => c.Key == k && c.Scope is "tube" or "shared"))))
            throw new ArgumentException("Values must use the scope defined by the approved protocol.");
        var values = new Dictionary<string, JsonElement>();
        foreach (var capture in step.Captures)
        {
            if (capture.Scope != "tube" && input.SharedCaptures.TryGetValue(capture.Key, out var shared)) values[capture.Key] = shared;
            if (capture.Scope != "batch" && tube?.Captures.TryGetValue(capture.Key, out var individual) == true)
            {
                if (capture.Scope == "shared") LabProtocolDefinition.RequiredText(tube.Reason, 4000, "Tube exception reason");
                values[capture.Key] = individual;
            }
        }
        if (step.QcGate?.Scope == "batch" && input.Tubes.Any(t => t.QcOutcome is not null)
            || step.QcGate?.Scope == "tube" && input.SharedQcOutcome is not null)
            throw new ArgumentException("QC must use the scope defined by the approved protocol.");
        if (step.QcGate?.Scope == "shared" && tube?.QcOutcome is not null) LabProtocolDefinition.RequiredText(tube.Reason, 4000, "Tube QC exception reason");
        var qc = step.QcGate?.Scope == "tube" ? tube?.QcOutcome : tube?.QcOutcome ?? input.SharedQcOutcome;
        return new(step.Key, input.Action, input.Outcome, values, input.OperatorConfirmed, input.ResourcesConfirmed, qc, tube?.Reason ?? input.Reason, recordId);
    }
}
