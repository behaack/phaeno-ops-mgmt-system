namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record DpsObject(string Bucket, string Region, string Key, string VersionId, string Sha256, long SizeBytes);
public sealed record DpsRecipe(string Key, string Version, JsonElement Parameters, IReadOnlyList<string> RequiredOutputRoles);
public sealed record DpsScope(Guid OrganizationId, Guid CommercialOrderId, Guid LabWorkOrderId, Guid SpecimenId,
    Guid LibraryId, Guid SequencingBatchId, int VendorResultsVersion, Guid FastqSetId, int FastqSetVersion, int SequencingRunNumber);
public sealed record DpsInputFile(Guid FileId, Guid SequencingOutputId, string OriginalFileName, string StoredFileName,
    int GroupNumber, int ReadNumber, int PartNumber, string GroupDescription, long ReadCount, string Compression, DpsObject S3);
public sealed record DpsOutputDestination(string Bucket, string Region, string Prefix);
public sealed record DpsInputManifest(string ContractVersion, string Environment, string DocumentType, Guid JobId,
    DateTime CreatedAtUtc, DpsScope Scope, string ReadLayout, DpsRecipe Recipe, IReadOnlyList<DpsInputFile> Files, DpsOutputDestination OutputDestination);
public sealed record DpsSubmission(DpsObject InputManifest, DpsInputManifest Instructions, DpsObject Parameters);
public sealed record DpsEvent(string ContractVersion, string Environment, int DtoId, Guid EventId, Guid JobId,
    string ProviderJobId, long Sequence, string EventType, DateTime OccurredAtUtc, DateTime? StartedAtUtc,
    DateTime? StoppedAtUtc, DateTime? DispositionAtUtc, bool NeverStarted, double? Percentage, string? Reason, DpsObject? OutputManifest);
public sealed record DpsReceipt(string ContractVersion, string Environment, int DtoId, Guid ReceiptId, Guid CommandId,
    Guid JobId, string CommandKind, string Outcome, string? ProviderJobId, DateTime OccurredAtUtc, string? Reason);
public sealed record DpsArtifact(Guid ArtifactId, string Role, string Format, string FileName, DpsObject S3);
public sealed record DpsTool(string Name, string Version);
public sealed record DpsReference(string Name, string Version, string? Sha256);
public sealed record DpsProvenance(string Engine, string EngineVersion, IReadOnlyList<DpsTool> Tools, IReadOnlyList<string> ContainerImages,
    IReadOnlyList<DpsReference> ReferenceData, string? ReferenceDataNotApplicable);
public sealed record DpsOutputManifest(string ContractVersion, string Environment, string DocumentType, Guid JobId,
    string ProviderJobId, DpsScope Scope, DpsRecipe Recipe, string InputManifestSha256, DateTime StartedAtUtc,
    DateTime StoppedAtUtc, DateTime CreatedAtUtc, DpsProvenance Provenance, IReadOnlyList<DpsArtifact> Outputs);

/// <summary>Uses the shipped schema; recipe schemas are restricted to the supported local JSON Schema vocabulary.</summary>
public static class DpsContract
{
    public const string Version = "poms-dps/1.0";
    public const string Provider = "dps-mqtt-v1";
    public const int MaximumMessageBytes = 65536;
    public const int MaximumManifestBytes = 1_000_000;
    public static readonly JsonSerializerOptions Json = new() {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower, UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        PropertyNameCaseInsensitive = false, MaxDepth = 48,
    };
    private static readonly JsonDocument Schema = LoadSchema();
    private static JsonDocument LoadSchema()
    {
        using var stream = typeof(DpsContract).Assembly.GetManifestResourceStream("Dps.contract.schema.json")
            ?? throw new InvalidOperationException("The DPS contract schema is missing.");
        return JsonDocument.Parse(stream);
    }
    public static JsonElement Message(string definition, string environment, int dto, object fields)
    {
        var node = JsonSerializer.SerializeToNode(fields, Json)!.AsObject();
        node.Add("contract_version", Version); node.Add("environment", environment); node.Add("dto_id", dto);
        var result = JsonSerializer.SerializeToElement(node, Json); Validate(definition, result); return result;
    }
    public static JsonElement Parse(ReadOnlyMemory<byte> bytes, string definition, int limit = MaximumMessageBytes)
    {
        if (bytes.Length is < 1 || bytes.Length > limit) throw Invalid();
        using var document = JsonDocument.Parse(bytes, new JsonDocumentOptions { MaxDepth = 48 });
        Validate(definition, document.RootElement); return document.RootElement.Clone();
    }
    public static T Read<T>(JsonElement element) => element.Deserialize<T>(Json) ?? throw Invalid();
    public static void Validate(string definition, JsonElement value)
    {
        RejectDuplicateProperties(value);
        if (!Matches(Schema.RootElement.GetProperty("$defs").GetProperty(definition), value, Schema.RootElement, 0)) throw Invalid();
    }
    public static bool ParametersMatch(JsonElement schema, JsonElement parameters)
    {
        RejectDuplicateProperties(schema); RejectDuplicateProperties(parameters);
        return SupportedSchema(schema, schema, 0) && Matches(schema, parameters, schema, 0);
    }
    public static bool SameRecipe(DpsRecipe left, DpsRecipe right) => left.Key == right.Key && left.Version == right.Version
        && JsonNode.DeepEquals(JsonNode.Parse(left.Parameters.GetRawText()), JsonNode.Parse(right.Parameters.GetRawText()))
        && left.RequiredOutputRoles.Order(StringComparer.Ordinal).SequenceEqual(right.RequiredOutputRoles.Order(StringComparer.Ordinal));
    public static void RequireUtc(DateTime? value, DateTime now)
    {
        if (value.HasValue && (value.Value == default || value.Value.Kind != DateTimeKind.Utc || value.Value > now)) throw Invalid();
    }
    public static OrderManagementException Invalid() => new("dps_contract_invalid",
        "DPS returned invalid or inconsistent contract evidence. The saved attempt requires reconciliation.", 409);
    private static void RejectDuplicateProperties(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Object) {
            var names = new HashSet<string>(StringComparer.Ordinal);
            foreach (var item in value.EnumerateObject()) { if (!names.Add(item.Name)) throw Invalid(); RejectDuplicateProperties(item.Value); }
        } else if (value.ValueKind == JsonValueKind.Array) foreach (var item in value.EnumerateArray()) RejectDuplicateProperties(item);
    }
    private static readonly HashSet<string> Vocabulary = new(StringComparer.Ordinal) { "$ref", "$defs", "definitions", "$schema", "$id", "title", "description", "default", "examples", "type", "const", "enum", "anyOf", "oneOf", "allOf", "not", "if", "then", "else", "properties", "required", "additionalProperties", "items", "minItems", "maxItems", "uniqueItems", "minLength", "maxLength", "pattern", "format", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "minProperties", "maxProperties" };
    private static bool SupportedSchema(JsonElement schema, JsonElement root, int depth)
    {
        if (depth > 64) return false;
        if (schema.ValueKind is JsonValueKind.True or JsonValueKind.False) return true;
        if (schema.ValueKind != JsonValueKind.Object || schema.EnumerateObject().Any(p => !Vocabulary.Contains(p.Name))) return false;
        if (schema.TryGetProperty("$ref", out var reference)) {
            var path = reference.GetString(); if (path is null || !path.StartsWith("#/", StringComparison.Ordinal)) return false;
            var resolved = root;
            foreach (var segment in path[2..].Split('/')) if (resolved.ValueKind != JsonValueKind.Object
                || !resolved.TryGetProperty(segment.Replace("~1", "/").Replace("~0", "~"), out resolved)) return false;
            if (!SupportedSchema(resolved, root, depth + 1)) return false;
        }
        foreach (var keyword in new[] { "properties", "$defs", "definitions" }) if (schema.TryGetProperty(keyword, out var map))
            if (map.ValueKind != JsonValueKind.Object || map.EnumerateObject().Any(item => !SupportedSchema(item.Value, root, depth + 1))) return false;
        foreach (var keyword in new[] { "not", "if", "then", "else", "items", "additionalProperties" }) if (schema.TryGetProperty(keyword, out var child))
            if (!SupportedSchema(child, root, depth + 1)) return false;
        foreach (var keyword in new[] { "oneOf", "anyOf", "allOf" }) if (schema.TryGetProperty(keyword, out var branches))
            if (branches.ValueKind != JsonValueKind.Array || branches.EnumerateArray().Any(child => !SupportedSchema(child, root, depth + 1))) return false;
        return true;
    }
    private static bool Matches(JsonElement schema, JsonElement value, JsonElement root, int depth)
    {
        if (depth > 64) return false;
        if (schema.ValueKind is JsonValueKind.True or JsonValueKind.False) return schema.ValueKind == JsonValueKind.True;
        if (schema.ValueKind != JsonValueKind.Object) return false;
        if (schema.EnumerateObject().Any(p => !Vocabulary.Contains(p.Name))) return false;
        if (schema.TryGetProperty("$ref", out var reference)) {
            var path = reference.GetString(); if (path is null || !path.StartsWith("#/", StringComparison.Ordinal)) return false;
            var resolved = root;
            foreach (var segment in path[2..].Split('/')) if (!resolved.TryGetProperty(segment.Replace("~1", "/").Replace("~0", "~"), out resolved)) return false;
            if (!Matches(resolved, value, root, depth + 1)) return false;
        }
        if (schema.TryGetProperty("type", out var type)) {
            bool Is(string? kind) => kind switch {
                "object" => value.ValueKind == JsonValueKind.Object, "array" => value.ValueKind == JsonValueKind.Array,
                "string" => value.ValueKind == JsonValueKind.String, "boolean" => value.ValueKind is JsonValueKind.True or JsonValueKind.False,
                "null" => value.ValueKind == JsonValueKind.Null, "number" => value.ValueKind == JsonValueKind.Number,
                "integer" => value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var n) && decimal.Truncate(n) == n, _ => false,
            };
            if (type.ValueKind == JsonValueKind.Array ? !type.EnumerateArray().Any(t => Is(t.GetString())) : !Is(type.GetString())) return false;
        }
        if (schema.TryGetProperty("const", out var constant) && !JsonElement.DeepEquals(constant, value)) return false;
        if (schema.TryGetProperty("enum", out var choices) && !choices.EnumerateArray().Any(item => JsonElement.DeepEquals(item, value))) return false;
        foreach (var keyword in new[] { "allOf", "anyOf", "oneOf" }) if (schema.TryGetProperty(keyword, out var branches)) {
            var count = branches.EnumerateArray().Count(branch => Matches(branch, value, root, depth + 1));
            if (keyword == "allOf" && count != branches.GetArrayLength() || keyword == "anyOf" && count == 0 || keyword == "oneOf" && count != 1) return false;
        }
        if (schema.TryGetProperty("not", out var excluded) && Matches(excluded, value, root, depth + 1)) return false;
        if (schema.TryGetProperty("if", out var condition)) {
            var branch = Matches(condition, value, root, depth + 1) ? "then" : "else";
            if (schema.TryGetProperty(branch, out var consequent) && !Matches(consequent, value, root, depth + 1)) return false;
        }
        bool Limit(string name, decimal actual, bool minimum) => !schema.TryGetProperty(name, out var bound)
            || bound.TryGetDecimal(out var number) && (minimum ? actual >= number : actual <= number);
        if (value.ValueKind == JsonValueKind.String) {
            var text = value.GetString()!;
            var length = 0; foreach (var rune in text.EnumerateRunes()) length++;
            if (!Limit("minLength", length, true) || !Limit("maxLength", length, false)) return false;
            if (schema.TryGetProperty("pattern", out var pattern) && !Regex.IsMatch(text, pattern.GetString()!, RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(100))) return false;
            if (schema.TryGetProperty("format", out var format) && !(format.GetString() switch {
                "uuid" => Guid.TryParseExact(text, "D", out var id) && id != Guid.Empty,
                "date-time" => text.EndsWith('Z') && DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var date) && date.Kind == DateTimeKind.Utc,
                _ => false,
            })) return false;
        }
        if (value.ValueKind == JsonValueKind.Number) {
            if (!value.TryGetDecimal(out var number) || !Limit("minimum", number, true) || !Limit("maximum", number, false)) return false;
            if (schema.TryGetProperty("exclusiveMinimum", out var min) && number <= min.GetDecimal()
                || schema.TryGetProperty("exclusiveMaximum", out var max) && number >= max.GetDecimal()) return false;
            if (schema.TryGetProperty("multipleOf", out var multiple) && (multiple.GetDecimal() <= 0 || number % multiple.GetDecimal() != 0)) return false;
        }
        if (value.ValueKind == JsonValueKind.Array) {
            if (!Limit("minItems", value.GetArrayLength(), true) || !Limit("maxItems", value.GetArrayLength(), false)) return false;
            var items = value.EnumerateArray().ToArray();
            if (schema.TryGetProperty("uniqueItems", out var unique) && unique.ValueKind == JsonValueKind.True
                && items.Where((item, index) => items.Take(index).Any(prior => JsonElement.DeepEquals(prior, item))).Any()) return false;
            if (schema.TryGetProperty("items", out var itemSchema) && items.Any(item => !Matches(itemSchema, item, root, depth + 1))) return false;
        }
        if (value.ValueKind == JsonValueKind.Object) {
            if (!Limit("minProperties", value.EnumerateObject().Count(), true) || !Limit("maxProperties", value.EnumerateObject().Count(), false)) return false;
            if (schema.TryGetProperty("required", out var required) && required.EnumerateArray().Any(name => !value.TryGetProperty(name.GetString()!, out _))) return false;
            var hasProperties = schema.TryGetProperty("properties", out var properties);
            foreach (var property in value.EnumerateObject()) {
                if (hasProperties && properties.TryGetProperty(property.Name, out var propertySchema)) {
                    if (!Matches(propertySchema, property.Value, root, depth + 1)) return false;
                } else if (schema.TryGetProperty("additionalProperties", out var additional)
                    && !Matches(additional, property.Value, root, depth + 1)) return false;
            }
        }
        return true;
    }
}
