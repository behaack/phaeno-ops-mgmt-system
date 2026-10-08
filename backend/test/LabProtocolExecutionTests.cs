namespace PhaenoPortal.Test;

using System.Text.Json;
using System.Text.Json.Nodes;
using PSeq.Operations.Laboratory.Domain;

internal static class LabProtocolTestData
{
    public static readonly DateTime Now = new(2026, 9, 5, 12, 0, 0, DateTimeKind.Utc);
    public static string Definition(string key = "prepare-library", bool qc = true) => JsonSerializer.Serialize(new
    {
        schemaVersion = 1,
        steps = new[] { new {
            key, name = "Prepare library", instructions = "Follow the approved preparation procedure.",
            required = true, repeatable = true, operatorConfirmation = true, requiredRole = "Operator",
            captures = new[] { new { key = "concentration", label = "Concentration", type = "number", required = true, unit = "ng/uL" } },
            inputMaterials = Array.Empty<string>(), preparedOutputs = Array.Empty<string>(), equipmentTypes = Array.Empty<string>(),
            qcGate = qc ? new { criteria = "Apply the approved concentration criteria.", outcomes = new[] { "pass", "fail", "hold" } } : null
        } }
    });
    public static LabProtocolVersion Version(string? json = null) => new(Guid.NewGuid(), 1, json ?? Definition(), Guid.NewGuid(), Now);
    public static LabProtocolStepInput Input(string key = "prepare-library", string action = "record", string? qc = "pass", string? reason = null) =>
        new(key, action, "recorded", new Dictionary<string, JsonElement> { ["concentration"] = JsonSerializer.SerializeToElement(0) }, true, false, qc, reason);
}

public class LabProtocolExecutionTests
{
    private static readonly Guid Operator = Guid.NewGuid();
    private static readonly HashSet<LabRole> OperatorRoles = [LabRole.Operator];
    private static readonly HashSet<LabRole> SupervisorRoles = [LabRole.Operator, LabRole.Supervisor];

    [Fact]
    public void SavedDefinitionsRetainThePortableAuthoringFormatForAbsentOptionalFields()
    {
        var version = LabProtocolTestData.Version(LabProtocolTestData.Definition(qc: false));
        using var saved = JsonDocument.Parse(version.DefinitionJson);
        var step = saved.RootElement.GetProperty("steps")[0];
        Assert.False(step.TryGetProperty("condition", out _));
        Assert.False(step.TryGetProperty("qcGate", out _));
        Assert.False(step.GetProperty("captures")[0].TryGetProperty("options", out _));
        Assert.Equal(version.DefinitionJson, LabProtocolDefinition.Parse(version.DefinitionJson).ToJson());
    }

    [Fact]
    public void HistoricalOrMalformedEvidenceIsPreservedForRecoveryInsteadOfTreatedAsCompletedSteps()
    {
        Assert.Empty(LabProtocolEvidence.Read("{}").Records);
        foreach (var json in new[] { "{\"passed\":true}", "{\"schemaVersion\":1,\"records\":[null]}", "{\"schemaVersion\":1,\"records\":[{}]}" })
            Assert.Throws<ArgumentException>(() => LabProtocolEvidence.Read(json));
        var execution = Started(LabProtocolTestData.Version());
        execution.Abandon("Historical work needs a new controlled execution");
        Assert.Equal("{}", execution.CapturedResultsJson);
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("[]")]
    [InlineData("null")]
    [InlineData("{\"schemaVersion\":1,\"steps\":[]}")]
    [InlineData("{\"steps\":[{\"key\":\"legacy\",\"required\":true}]}")]
    public void MalformedOrEmptyDefinitionsAreRejected(string json) =>
        Assert.Throws<ArgumentException>(() => LabProtocolTestData.Version(json));

    [Theory]
    [InlineData("name", "")]
    [InlineData("instructions", "")]
    [InlineData("requiredRole", "Administrator")]
    [InlineData("key", "bad.key")]
    public void StructuredDefinitionRejectsInvalidStepRules(string property, string value)
    {
        var root = JsonNode.Parse(LabProtocolTestData.Definition())!;
        root["steps"]![0]![property] = value;
        Assert.Throws<ArgumentException>(() => LabProtocolDefinition.Parse(root.ToJsonString()));
    }

    [Fact]
    public void DefinitionRejectsUnsupportedSchemaUnknownPropertiesDuplicateKeysAndIncompleteQc()
    {
        var root = JsonNode.Parse(LabProtocolTestData.Definition())!;
        root["schemaVersion"] = 2;
        Assert.Throws<ArgumentException>(() => LabProtocolDefinition.Parse(root.ToJsonString()));
        root["schemaVersion"] = 1;
        root["unknown"] = "must not be silently discarded";
        Assert.Throws<ArgumentException>(() => LabProtocolDefinition.Parse(root.ToJsonString()));
        root.AsObject().Remove("unknown");
        root["steps"]!.AsArray().Add(root["steps"]![0]!.DeepClone());
        Assert.Throws<ArgumentException>(() => LabProtocolDefinition.Parse(root.ToJsonString()));
        root["steps"]!.AsArray().RemoveAt(1);
        root["steps"]![0]!["qcGate"]!["criteria"] = "";
        Assert.Throws<ArgumentException>(() => LabProtocolDefinition.Parse(root.ToJsonString()));
        Assert.Throws<ArgumentException>(() => LabProtocolDefinition.Parse(LabProtocolTestData.Definition().Replace("\"schemaVersion\":1", "\"schemaVersion\":1,\"schemaVersion\":1")));
    }

    [Fact]
    public void EmptyResultsCannotCompleteAndRejectedWritesLeaveEvidenceUnchanged()
    {
        var protocol = LabProtocolTestData.Version();
        var execution = Started(protocol);
        Assert.Throws<InvalidOperationException>(() => execution.Complete(protocol, null, LabProtocolTestData.Now));
        Assert.Throws<ArgumentException>(() => execution.RecordStep(protocol, LabProtocolTestData.Input() with { Captures = new Dictionary<string, JsonElement>() }, Operator, OperatorRoles, LabProtocolTestData.Now));
        Assert.Equal("{}", execution.CapturedResultsJson);
        Assert.Equal(LabExecutionStatus.InProgress, execution.Status);
    }

    [Fact]
    public void TypedEvidenceRequiresTheStepRoleConfirmationAndValidValues()
    {
        var protocol = LabProtocolTestData.Version();
        var execution = Started(protocol);
        Assert.Throws<InvalidOperationException>(() => execution.RecordStep(protocol, LabProtocolTestData.Input(), Operator, new HashSet<LabRole> { LabRole.ScientificReviewer }, LabProtocolTestData.Now));
        Assert.Throws<ArgumentException>(() => execution.RecordStep(protocol, LabProtocolTestData.Input() with { OperatorConfirmed = false }, Operator, OperatorRoles, LabProtocolTestData.Now));
        Assert.Throws<ArgumentException>(() => execution.RecordStep(protocol, LabProtocolTestData.Input() with { Captures = new Dictionary<string, JsonElement> { ["concentration"] = JsonSerializer.SerializeToElement("12") } }, Operator, OperatorRoles, LabProtocolTestData.Now));
        Assert.Throws<ArgumentException>(() => execution.RecordStep(protocol, LabProtocolTestData.Input() with { Captures = new Dictionary<string, JsonElement> { ["unexpected"] = JsonSerializer.SerializeToElement(12) } }, Operator, OperatorRoles, LabProtocolTestData.Now));
        execution.RecordStep(protocol, LabProtocolTestData.Input(), Operator, OperatorRoles, LabProtocolTestData.Now);
        execution.Complete(protocol, null, LabProtocolTestData.Now);
        Assert.Equal(LabExecutionStatus.Completed, execution.Status);
        Assert.Equal(0, LabProtocolEvidence.Read(execution.CapturedResultsJson).Records.Single().Captures["concentration"].GetInt32());
    }

    [Theory]
    [InlineData("date", "2026-02-30")]
    [InlineData("choice", "unapproved")]
    [InlineData("barcode", "has whitespace")]
    [InlineData("text", "")]
    [InlineData("fileReference", "")]
    public void TypedCapturesRejectInvalidEvidence(string type, string invalid)
    {
        var root = JsonNode.Parse(LabProtocolTestData.Definition())!;
        var capture = root["steps"]![0]!["captures"]![0]!.AsObject();
        capture["type"] = type;
        capture.Remove("unit");
        if (type == "choice") capture["options"] = new JsonArray("approved");
        var protocol = LabProtocolTestData.Version(root.ToJsonString());
        Assert.Throws<ArgumentException>(() => Started(protocol).RecordStep(protocol, LabProtocolTestData.Input() with { Captures = new Dictionary<string, JsonElement> { ["concentration"] = JsonSerializer.SerializeToElement(invalid) } }, Operator, OperatorRoles, LabProtocolTestData.Now));
    }

    [Theory]
    [InlineData("fail")]
    [InlineData("hold")]
    public void QcBlocksCompletionAndRepeatPreservesTheOriginal(string qc)
    {
        var protocol = LabProtocolTestData.Version();
        var execution = Started(protocol);
        execution.RecordStep(protocol, LabProtocolTestData.Input(qc: qc, reason: "Observed QC issue"), Operator, OperatorRoles, LabProtocolTestData.Now);
        Assert.Equal(LabExecutionStatus.Blocked, execution.Status);
        Assert.Throws<InvalidOperationException>(() => execution.Complete(protocol, null, LabProtocolTestData.Now));
        execution.RecordStep(protocol, LabProtocolTestData.Input(action: "repeat", reason: "Repeated using the approved procedure"), Operator, OperatorRoles, LabProtocolTestData.Now.AddMinutes(1));
        execution.Complete(protocol, null, LabProtocolTestData.Now.AddMinutes(2));
        var history = LabProtocolEvidence.Read(execution.CapturedResultsJson).Records;
        Assert.Equal(2, history.Count);
        Assert.Equal(qc, history[0].QcOutcome);
        Assert.Equal("pass", history[1].QcOutcome);
        Assert.Equal(Operator, history[0].RecordedByUserId);
        Assert.Throws<InvalidOperationException>(() => execution.RecordStep(protocol, LabProtocolTestData.Input(action: "repeat", reason: "Too late"), Operator, OperatorRoles, LabProtocolTestData.Now));
    }

    [Fact]
    public void RequiredSequenceAndCorrectionInvalidateDownstreamEvidence()
    {
        var root = JsonNode.Parse(LabProtocolTestData.Definition())!;
        var second = root["steps"]![0]!.DeepClone();
        second["key"] = "review-library";
        second["name"] = "Review library";
        root["steps"]!.AsArray().Add(second);
        var protocol = LabProtocolTestData.Version(root.ToJsonString());
        var execution = Started(protocol);
        Assert.Throws<InvalidOperationException>(() => execution.RecordStep(protocol, LabProtocolTestData.Input("review-library"), Operator, OperatorRoles, LabProtocolTestData.Now));
        execution.RecordStep(protocol, LabProtocolTestData.Input(), Operator, OperatorRoles, LabProtocolTestData.Now);
        execution.RecordStep(protocol, LabProtocolTestData.Input("review-library"), Operator, OperatorRoles, LabProtocolTestData.Now);
        Assert.Throws<InvalidOperationException>(() => execution.RecordStep(protocol, LabProtocolTestData.Input(action: "correct", reason: "Wrong recorded concentration"), Operator, OperatorRoles, LabProtocolTestData.Now));
        execution.RecordStep(protocol, LabProtocolTestData.Input(action: "correct", reason: "Wrong recorded concentration"), Operator, SupervisorRoles, LabProtocolTestData.Now);
        Assert.Throws<InvalidOperationException>(() => execution.Complete(protocol, null, LabProtocolTestData.Now));
        execution.RecordStep(protocol, LabProtocolTestData.Input("review-library", "repeat", reason: "Rechecked downstream evidence"), Operator, OperatorRoles, LabProtocolTestData.Now);
        execution.Complete(protocol, null, LabProtocolTestData.Now);
        Assert.Equal(4, LabProtocolEvidence.Read(execution.CapturedResultsJson).Records.Count);
    }

    [Fact]
    public void OptionalAndConditionalDecisionsRequireReasonsAndCannotHidePerformedQc()
    {
        var root = JsonNode.Parse(LabProtocolTestData.Definition())!;
        root["steps"]![0]!["required"] = false;
        root["steps"]![0]!["condition"] = "If additional preparation is needed";
        var protocol = LabProtocolTestData.Version(root.ToJsonString());
        var skipped = LabProtocolTestData.Input() with { Outcome = "skipped", Captures = new Dictionary<string, JsonElement>(), OperatorConfirmed = false, QcOutcome = null };
        Assert.Throws<ArgumentException>(() => Started(protocol).RecordStep(protocol, skipped, Operator, OperatorRoles, LabProtocolTestData.Now));
        var execution = Started(protocol);
        execution.RecordStep(protocol, skipped with { Reason = "Condition did not apply" }, Operator, OperatorRoles, LabProtocolTestData.Now);
        execution.Complete(protocol, null, LabProtocolTestData.Now);
        var failed = Started(protocol);
        failed.RecordStep(protocol, LabProtocolTestData.Input(qc: "fail", reason: "Condition applies, QC failed"), Operator, OperatorRoles, LabProtocolTestData.Now);
        Assert.Throws<InvalidOperationException>(() => failed.RecordStep(protocol, skipped with { Action = "correct", Reason = "Attempted waiver" }, Operator, SupervisorRoles, LabProtocolTestData.Now));
        Assert.Throws<InvalidOperationException>(() => Started(LabProtocolTestData.Version()).RecordStep(protocol, skipped, Operator, OperatorRoles, LabProtocolTestData.Now));
    }

    [Fact]
    public void NonrepeatableStepAndRequiredResourcesRemainControlled()
    {
        var root = JsonNode.Parse(LabProtocolTestData.Definition())!;
        root["steps"]![0]!["repeatable"] = false;
        root["steps"]![0]!["inputMaterials"] = new JsonArray("Approved preparation lot");
        var protocol = LabProtocolTestData.Version(root.ToJsonString());
        var execution = Started(protocol);
        Assert.Throws<ArgumentException>(() => execution.RecordStep(protocol, LabProtocolTestData.Input(), Operator, OperatorRoles, LabProtocolTestData.Now));
        execution.RecordStep(protocol, LabProtocolTestData.Input() with { ResourcesConfirmed = true }, Operator, OperatorRoles, LabProtocolTestData.Now);
        Assert.Throws<InvalidOperationException>(() => execution.RecordStep(protocol, LabProtocolTestData.Input(action: "repeat", reason: "Not allowed") with { ResourcesConfirmed = true }, Operator, OperatorRoles, LabProtocolTestData.Now));
        execution.Abandon("Supervisor arranged replacement work");
        Assert.Single(LabProtocolEvidence.Read(execution.CapturedResultsJson).Records);
        Assert.Throws<InvalidOperationException>(() => execution.Complete(protocol, null, LabProtocolTestData.Now));
    }

    private static LabProtocolExecution Started(LabProtocolVersion protocol)
    {
        var execution = new LabProtocolExecution(Guid.NewGuid(), null, protocol.Id, Operator);
        execution.Start(LabProtocolTestData.Now);
        return execution;
    }
}
