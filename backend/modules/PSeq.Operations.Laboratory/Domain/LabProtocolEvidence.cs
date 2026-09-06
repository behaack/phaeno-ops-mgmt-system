namespace PSeq.Operations.Laboratory.Domain;

using System.Globalization;
using System.Text.Json;

public sealed record LabProtocolStepInput(
    string StepKey, string Action, string Outcome,
    IReadOnlyDictionary<string, JsonElement> Captures,
    bool OperatorConfirmed, bool ResourcesConfirmed, string? QcOutcome, string? Reason);

public sealed record LabProtocolStepRecord(
    Guid Id, string StepKey, string Action, string Outcome,
    IReadOnlyDictionary<string, JsonElement> Captures,
    bool OperatorConfirmed, bool ResourcesConfirmed, string? QcOutcome, string? Reason,
    Guid RecordedByUserId, DateTime RecordedAtUtc);

public sealed record LabProtocolEvidence(int SchemaVersion, IReadOnlyList<LabProtocolStepRecord> Records)
{
    public static LabProtocolEvidence Read(string json)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind == JsonValueKind.Object
                && !document.RootElement.EnumerateObject().Any()) return new(1, []);
            var result = JsonSerializer.Deserialize<LabProtocolEvidence>(json, LabProtocolDefinition.JsonOptions);
            if (result is not { SchemaVersion: 1, Records: not null })
                throw new JsonException();
            if (result.Records.Count > 5000 || result.Records.Any(record => record is null
                || record.Id == Guid.Empty || record.RecordedByUserId == Guid.Empty
                || record.RecordedAtUtc == default || string.IsNullOrWhiteSpace(record.StepKey)
                || record.Captures is null || record.Action is not ("record" or "repeat" or "correct")
                || record.Outcome is not ("recorded" or "skipped"))
                || result.Records.Select(record => record.Id).Distinct().Count() != result.Records.Count)
                throw new JsonException();
            return result;
        }
        catch (JsonException)
        {
            throw new ArgumentException("This execution has historical unstructured results. Preserve this record and assign a new execution of a valid approved protocol.");
        }
    }

    public string ToJson() => JsonSerializer.Serialize(this, LabProtocolDefinition.JsonOptions);

    public LabProtocolEvidence Append(LabProtocolDefinition definition, LabProtocolStepInput input,
        Guid actorId, IReadOnlySet<LabRole> roles, DateTime utcNow)
    {
        if (actorId == Guid.Empty) throw new ArgumentException("A recording operator is required.");
        var step = definition.Steps.SingleOrDefault(item => item.Key == input.StepKey)
            ?? throw new ArgumentException("Choose a step from this execution's pinned protocol.");
        var requiredRole = step.RequiredRole is null ? (LabRole?)null : Enum.Parse<LabRole>(step.RequiredRole);
        if (requiredRole.HasValue ? !roles.Contains(requiredRole.Value)
            : !roles.Contains(LabRole.Operator) && !roles.Contains(LabRole.Supervisor))
            throw new InvalidOperationException($"{step.Name} requires the {step.RequiredRole ?? "Operator or Supervisor"} laboratory role.");
        var prior = Records.LastOrDefault(record => record.StepKey == step.Key);
        if (prior is null && input.Action != "record") throw new ArgumentException("Record the initial step before repeating or correcting it.");
        if (prior is not null)
        {
            if (prior.Outcome == "recorded" && input.Outcome == "skipped")
                throw new InvalidOperationException("A performed step cannot be changed into a skip. Preserve its outcome through a repeat or correction.");
            if (input.Action == "repeat" && !step.Repeatable)
                throw new InvalidOperationException("This protocol does not permit repeating this step. A supervisor may correct a data-entry error, or arrange a new execution.");
            if (input.Action == "correct" && !roles.Contains(LabRole.Supervisor))
                throw new InvalidOperationException("A supervisor must record a correction.");
            if (input.Action is not ("repeat" or "correct"))
                throw new InvalidOperationException("This step already has evidence. Use an authorized repeat or correction.");
            LabProtocolDefinition.RequiredText(input.Reason, 4000, "Repeat or correction reason");
        }
        foreach (var earlier in definition.Steps.TakeWhile(item => item.Key != step.Key))
        {
            var blocker = StepBlocker(definition, earlier);
            if (blocker is not null) throw new InvalidOperationException(blocker);
        }
        ValidateValues(step, input);
        if (Records.Count >= 5000) throw new InvalidOperationException("This execution has reached its evidence limit. Arrange a new execution.");
        var record = new LabProtocolStepRecord(Guid.NewGuid(), step.Key, input.Action, input.Outcome,
            input.Captures.ToDictionary(pair => pair.Key, pair => pair.Value.Clone(), StringComparer.Ordinal),
            input.OperatorConfirmed, input.ResourcesConfirmed, input.QcOutcome,
            string.IsNullOrWhiteSpace(input.Reason) ? null : input.Reason.Trim(), actorId, utcNow);
        return new(1, [.. Records, record]);
    }

    public IReadOnlyList<string> CompletionBlockers(LabProtocolDefinition definition) =>
        definition.Steps.Select(step => StepBlocker(definition, step)).OfType<string>().ToList();

    public string? StepBlocker(LabProtocolDefinition definition, LabProtocolStepDefinition step)
    {
        var record = Records.LastOrDefault(item => item.StepKey == step.Key);
        if (record is null) return $"{step.Name}: record the step or an allowed skip decision.";
        ValidateValues(step, new(step.Key, record.Action, record.Outcome, record.Captures,
            record.OperatorConfirmed, record.ResourcesConfirmed, record.QcOutcome, record.Reason));
        if (record.Outcome == "recorded" && step.QcGate is not null && record.QcOutcome != "pass")
            return $"{step.Name}: QC is {record.QcOutcome}; resolve it before continuing.";
        var index = Records.ToList().FindLastIndex(item => item.StepKey == step.Key);
        if (definition.Steps.TakeWhile(item => item.Key != step.Key).Any(earlier =>
            Records.ToList().FindLastIndex(item => item.StepKey == earlier.Key) > index))
            return $"{step.Name}: an earlier step changed; review and record fresh evidence.";
        return null;
    }

    public bool HasUnresolvedQc => Records.GroupBy(record => record.StepKey)
        .Any(group => group.Last().QcOutcome is "fail" or "hold");

    private static void ValidateValues(LabProtocolStepDefinition step, LabProtocolStepInput input)
    {
        if (input.Captures is null) throw new ArgumentException("Captured values must be supplied.");
        if (input.Reason?.Length > 4000) throw new ArgumentException("The reason must contain at most 4000 characters.");
        if (input.Outcome == "skipped")
        {
            if (step.Required) throw new InvalidOperationException($"{step.Name} is required and cannot be skipped.");
            LabProtocolDefinition.RequiredText(input.Reason, 4000, "Skip reason or condition assessment");
            if (input.Captures.Count != 0 || input.QcOutcome is not null || input.OperatorConfirmed || input.ResourcesConfirmed)
                throw new ArgumentException("A skipped step must not claim performed work, captured values, or QC.");
            return;
        }
        if (input.Outcome != "recorded") throw new ArgumentException("Choose Record step or Skip step.");
        if (step.Condition is not null) LabProtocolDefinition.RequiredText(input.Reason, 4000, "Condition assessment");
        if (step.OperatorConfirmation && !input.OperatorConfirmed)
            throw new ArgumentException($"{step.Name}: confirm that you performed the instructed step.");
        if ((step.InputMaterials.Count + step.PreparedOutputs.Count + step.EquipmentTypes.Count) > 0
            && !input.ResourcesConfirmed)
            throw new ArgumentException($"{step.Name}: confirm the listed inputs, outputs, and equipment and record their traceability on the job.");
        if (step.QcGate is not null)
        {
            if (input.QcOutcome is not ("pass" or "fail" or "hold"))
                throw new ArgumentException($"{step.Name}: record a QC outcome.");
            if (input.QcOutcome != "pass") LabProtocolDefinition.RequiredText(input.Reason, 4000, "QC failure or hold reason");
        }
        else if (input.QcOutcome is not null) throw new ArgumentException("This step has no QC gate.");
        if (input.Captures.Keys.Any(key => !step.Captures.Any(capture => capture.Key == key)))
            throw new ArgumentException("Captured values must match this step's defined fields.");
        foreach (var capture in step.Captures)
        {
            var present = input.Captures.TryGetValue(capture.Key, out var value)
                && value.ValueKind is not (JsonValueKind.Null or JsonValueKind.Undefined)
                && !(value.ValueKind == JsonValueKind.String && string.IsNullOrWhiteSpace(value.GetString()));
            if (!present)
            {
                if (capture.Required) throw new ArgumentException($"{capture.Label} is required.");
                continue;
            }
            if (capture.Type == "number")
            {
                if (value.ValueKind != JsonValueKind.Number || !value.TryGetDouble(out var number) || !double.IsFinite(number))
                    throw new ArgumentException($"{capture.Label} must be a finite number in the specified unit.");
                continue;
            }
            if (value.ValueKind != JsonValueKind.String || value.GetString()!.Length > 4000)
                throw new ArgumentException($"{capture.Label} must be text of at most 4000 characters.");
            var text = value.GetString()!;
            if (capture.Type == "date" && !DateOnly.TryParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
                throw new ArgumentException($"{capture.Label} must be a valid calendar date.");
            if (capture.Type == "choice" && !capture.Options!.Contains(text, StringComparer.Ordinal))
                throw new ArgumentException($"{capture.Label} must be one of the approved choices.");
            if (capture.Type == "barcode" && (text.Length > 200 || text.Any(char.IsWhiteSpace) || text.Any(char.IsControl)))
                throw new ArgumentException($"{capture.Label} must be a barcode without whitespace or control characters.");
        }
    }
}
