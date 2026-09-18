namespace PhaenoPortal.Test;
using PSeq.Operations.Laboratory.Domain;

public class LabStepTests
{
    [Fact]
    public void ResourceFieldsPreserveScopeAndOptionalTraceability()
    {
        var source = Definition();
        var field = new LabProtocolCaptureDefinition { Key = "reagent", Label = "Reagent used", Type = "material", Scope = "batch", Required = true, QuantityBasis = "perSample", IncludeTracking = true };
        var definition = source with { Steps = [source.Steps[0] with { Captures = [field] }] };
        Assert.True(LabProtocolDefinition.Parse(definition.ToJson()).Steps[0].Captures[0].IncludeTracking);
        var withUnit = definition with { Steps = [source.Steps[0] with { Captures = [field with { Unit = "µL" }] }] };
        Assert.Equal("µL", LabProtocolDefinition.Parse(withUnit.ToJson()).Steps[0].Captures[0].Unit);
        Assert.Equal("shared", LabProtocolDefinition.Parse((definition with { Steps = [source.Steps[0] with { Captures = [field with { Scope = "shared" }] }] }).ToJson()).Steps[0].Captures[0].Scope);
        Assert.Throws<ArgumentException>(() => LabProtocolDefinition.Parse((definition with { Steps = [source.Steps[0] with { Captures = [field with { Scope = "shared", QuantityBasis = "total" }] }] }).ToJson()));
        Assert.Throws<ArgumentException>(() => LabProtocolDefinition.Parse((definition with { Steps = [source.Steps[0] with { Captures = [field with { Type = "output", QuantityBasis = null, IncludeTracking = false }] }] }).ToJson()));
        Assert.Throws<ArgumentException>(() => LabProtocolDefinition.Parse((definition with { PreparationBatchEnabled = false }).ToJson()));
    }

    [Fact]
    public void ReportPolicyDistinguishesHiddenOptionalRequiredAndSkippedEntries()
    {
        var source = Definition().Steps[0];
        var required = source with { AttachmentKind = "qc", AttachmentRequired = true };
        Assert.Throws<ArgumentException>(() => required.ValidatePreparationReport(false, "recorded"));
        required.ValidatePreparationReport(true, "recorded");
        required.ValidatePreparationReport(false, "skipped");
        Assert.Throws<ArgumentException>(() => required.ValidatePreparationReport(true, "skipped"));
        var optional = required with { AttachmentRequired = false };
        optional.ValidatePreparationReport(false, "recorded");
        optional.ValidatePreparationReport(true, "recorded");
        var hidden = optional with { AttachmentKind = "none", QcGate = new() { Scope = "batch", Criteria = "TEST ONLY", Outcomes = ["pass", "fail", "hold"] } };
        Assert.Null(hidden.PreparationReportProperty);
        Assert.Throws<ArgumentException>(() => hidden.ValidatePreparationReport(true, "recorded"));
        Assert.Equal("qcReport", (hidden with { AttachmentKind = null }).PreparationReportProperty);
        Assert.Throws<ArgumentException>(() => LabProtocolDefinition.Parse((Definition() with { Steps = [hidden with { AttachmentRequired = true }] }).ToJson()));
    }

    internal static LabProtocolDefinition Definition()
    {
        var source = LabProtocolDefinition.Parse(LabProtocolTestData.Definition(qc: false));
        return source with { PreparationBatchEnabled = true, Steps = source.Steps.Select(s => s with {
            Captures = s.Captures.Select(c => c with { Scope = "tube" }).ToArray()
        }).ToArray() };
    }

    [Fact]
    public void CatalogVersionsRequireOneScopedStepWithoutCompositionSettings()
    {
        var definition = Definition();
        Assert.Throws<ArgumentException>(() => new LabStepVersion(Guid.NewGuid(), 1, LabProtocolTestData.Definition(), Guid.NewGuid(), DateTime.UtcNow));
        Assert.Throws<ArgumentException>(() => new LabStepVersion(Guid.NewGuid(), 1,
            (definition with { Steps = [definition.Steps[0] with { Required = false, Condition = "Example" }] }).ToJson(), Guid.NewGuid(), DateTime.UtcNow));
        Assert.Throws<ArgumentException>(() => new LabStepVersion(Guid.NewGuid(), 1,
            (definition with { Steps = [definition.Steps[0] with { LabStepVersionId = Guid.NewGuid() }] }).ToJson(), Guid.NewGuid(), DateTime.UtcNow));
    }

    [Fact]
    public void IndependentApprovalLocksContentAndRetirementPreservesSnapshot()
    {
        var step = new LabStep("test", "Example step", null);
        var author = Guid.NewGuid(); var reviewer = Guid.NewGuid();
        var version = new LabStepVersion(step.Id, 1, Definition().ToJson(), author, DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() => version.Approve(author, DateTime.UtcNow));
        version.UpdateDraft(Definition().ToJson(), reviewer);
        Assert.Throws<InvalidOperationException>(() => version.Approve(reviewer, DateTime.UtcNow));
        version.Approve(author, DateTime.UtcNow);
        var snapshot = version.DefinitionJson;
        Assert.Throws<InvalidOperationException>(() => version.UpdateDraft(snapshot, author));
        step.Retire("Replaced", author, DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(step.RequireCurrent);
        Assert.Equal(snapshot, version.DefinitionJson);
        version.RequireReleaseApproval();
    }

    [Fact]
    public void RepeatedCatalogOccurrencesKeepSeparateEvidence()
    {
        var source = Definition(); var id = Guid.NewGuid();
        var definition = source with { Steps = [source.Steps[0] with { Key = "first", LabStepVersionId = id }, source.Steps[0] with { Key = "second", LabStepVersionId = id }] };
        var evidence = LabProtocolEvidence.Read("{}");
        var actor = Guid.NewGuid();
        evidence = evidence.Append(definition, LabProtocolTestData.Input("first", qc: null), actor, new HashSet<LabRole> { LabRole.Operator }, DateTime.UtcNow);
        Assert.Null(evidence.StepBlocker(definition, definition.Steps[0]));
        Assert.NotNull(evidence.StepBlocker(definition, definition.Steps[1]));
        evidence = evidence.Append(definition, LabProtocolTestData.Input("second", qc: null), actor, new HashSet<LabRole> { LabRole.Operator }, DateTime.UtcNow);
        Assert.Equal(2, evidence.Records.Count);
        Assert.Empty(evidence.CompletionBlockers(definition));
        Assert.Equal(id, LabProtocolDefinition.Parse(definition.ToJson()).Steps[1].LabStepVersionId);
    }
}
