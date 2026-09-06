namespace PSeq.Operations.Laboratory.Domain;

using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

/// <summary>The portable, versioned procedure contract shared by authoring and execution.</summary>
public sealed record LabProtocolDefinition
{
    internal static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = false,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
    };
    private static readonly JsonSerializerOptions DefinitionWriteOptions = new(JsonOptions)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public required int SchemaVersion { get; init; }
    public required IReadOnlyList<LabProtocolStepDefinition> Steps { get; init; }

    public static LabProtocolDefinition Parse(string json)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(json) || json.Length > 1_000_000)
                throw new ArgumentException("A structured protocol definition of at most 1 MB is required.");
            using var document = JsonDocument.Parse(json);
            RejectDuplicateProperties(document.RootElement);
            var definition = JsonSerializer.Deserialize<LabProtocolDefinition>(json, JsonOptions)
                ?? throw new ArgumentException("A structured protocol definition is required.");
            definition.Validate();
            return definition;
        }
        catch (JsonException)
        {
            throw new ArgumentException("The definition must use the supported structured protocol format. Open the draft in the protocol editor.");
        }
    }

    public string ToJson() => JsonSerializer.Serialize(this, DefinitionWriteOptions);

    private void Validate()
    {
        if (SchemaVersion != 1) throw new ArgumentException("Protocol schema version 1 is required.");
        if (Steps is null || Steps.Count is < 1 or > 100)
            throw new ArgumentException("A protocol must contain between 1 and 100 steps.");
        var keys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var step in Steps)
        {
            if (step is null) throw new ArgumentException("Every protocol step must contain a definition.");
            ValidateKey(step.Key, keys, "Step");
            RequiredText(step.Name, 160, "Step name");
            RequiredText(step.Instructions, 4000, $"{step.Name}: instructions");
            if (step.Condition is not null)
            {
                RequiredText(step.Condition, 1000, $"{step.Name}: condition");
                if (step.Required) throw new ArgumentException($"{step.Name}: a conditional step cannot also be unconditionally required.");
            }
            if (step.RequiredRole is not null && !Enum.GetNames<LabRole>().Contains(step.RequiredRole))
                throw new ArgumentException($"{step.Name}: choose an existing laboratory role.");
            ValidateResources(step.InputMaterials, "Input materials");
            ValidateResources(step.PreparedOutputs, "Prepared outputs");
            ValidateResources(step.EquipmentTypes, "Equipment types");
            if (step.Captures is null || step.Captures.Count > 30)
                throw new ArgumentException($"{step.Name}: at most 30 typed captures are allowed.");
            var captureKeys = new HashSet<string>(StringComparer.Ordinal);
            foreach (var capture in step.Captures)
            {
                if (capture is null) throw new ArgumentException("Every capture must contain a definition.");
                ValidateKey(capture.Key, captureKeys, "Capture");
                RequiredText(capture.Label, 120, "Capture label");
                if (capture.Type is not ("number" or "text" or "date" or "choice" or "fileReference" or "barcode"))
                    throw new ArgumentException($"{capture.Label}: the capture type is not supported.");
                if (capture.Unit is not null)
                {
                    RequiredText(capture.Unit, 50, "Capture unit");
                    if (capture.Type != "number") throw new ArgumentException("Only number captures can specify a unit.");
                }
                if (capture.Type == "choice")
                {
                    if (capture.Options is null || capture.Options.Count == 0
                        || capture.Options.Sum(value => value?.Length ?? 0) + capture.Options.Count - 1 > 1000)
                        throw new ArgumentException($"{capture.Label}: enter permitted choices (at most 1000 characters).");
                    foreach (var option in capture.Options) RequiredText(option, 1000, "Choice");
                    if (capture.Options.Distinct(StringComparer.Ordinal).Count() != capture.Options.Count)
                        throw new ArgumentException($"{capture.Label}: choices cannot repeat.");
                }
                else if (capture.Options is not null)
                    throw new ArgumentException("Only choice captures can specify permitted choices.");
            }
            if (step.QcGate is not null)
            {
                RequiredText(step.QcGate.Criteria, 2000, "QC acceptance criteria");
                if (step.QcGate.Outcomes is null
                    || !step.QcGate.Outcomes.SequenceEqual(new[] { "pass", "fail", "hold" }))
                    throw new ArgumentException("A QC gate must provide Pass, Fail, and Hold outcomes.");
            }
        }
    }

    internal static void RequiredText(string? value, int maximum, string label)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > maximum)
            throw new ArgumentException($"{label} is required and must contain at most {maximum} characters.");
    }

    private static void ValidateKey(string? value, HashSet<string> keys, string label)
    {
        if (value is null || value.Length > 200
            || !Regex.IsMatch(value, "^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.CultureInvariant)
            || !keys.Add(value))
            throw new ArgumentException($"{label} keys must be unique readable identifiers.");
    }

    private static void ValidateResources(IReadOnlyList<string>? values, string label)
    {
        if (values is null || values.Sum(value => value?.Length ?? 0) + Math.Max(0, values.Count - 1) > 2000)
            throw new ArgumentException($"{label} must be a list of at most 2000 characters.");
        foreach (var value in values) RequiredText(value, 2000, label);
    }

    private static void RejectDuplicateProperties(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Object)
        {
            var names = new HashSet<string>(StringComparer.Ordinal);
            foreach (var property in value.EnumerateObject())
            {
                if (!names.Add(property.Name)) throw new ArgumentException("Repeated JSON property names are not allowed.");
                RejectDuplicateProperties(property.Value);
            }
        }
        else if (value.ValueKind == JsonValueKind.Array)
            foreach (var item in value.EnumerateArray()) RejectDuplicateProperties(item);
    }
}

public sealed record LabProtocolStepDefinition
{
    public required string Key { get; init; }
    public required string Name { get; init; }
    public required string Instructions { get; init; }
    public required bool Required { get; init; }
    public string? Condition { get; init; }
    public required bool Repeatable { get; init; }
    public required bool OperatorConfirmation { get; init; }
    public string? RequiredRole { get; init; }
    public required IReadOnlyList<LabProtocolCaptureDefinition> Captures { get; init; }
    public required IReadOnlyList<string> InputMaterials { get; init; }
    public required IReadOnlyList<string> PreparedOutputs { get; init; }
    public required IReadOnlyList<string> EquipmentTypes { get; init; }
    public LabProtocolQcGate? QcGate { get; init; }
}

public sealed record LabProtocolCaptureDefinition
{
    public required string Key { get; init; }
    public required string Label { get; init; }
    public required string Type { get; init; }
    public required bool Required { get; init; }
    public string? Unit { get; init; }
    public IReadOnlyList<string>? Options { get; init; }
}

public sealed record LabProtocolQcGate
{
    public required string Criteria { get; init; }
    public required IReadOnlyList<string> Outcomes { get; init; }
}
