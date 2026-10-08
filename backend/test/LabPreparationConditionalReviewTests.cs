namespace PhaenoPortal.Test;

using System.Text.Json;
using PSeq.Operations.Laboratory.Domain;

public class LabPreparationConditionalReviewTests
{
    private static readonly HashSet<LabRole> Roles = [LabRole.Operator, LabRole.Supervisor];
    private static LabProtocolDefinition Definition()
    {
        var original = LabPreparationBatchTests.Definition();
        return original with { Steps = [original.Steps[1] with { Key = "identity" }, original.Steps[0], original.Steps[1] with
        { Key = "conditional-review", Required = false, RequiredRole = "Supervisor", Condition = LabPreparationConditionalReview.Condition,
          Captures = [new() { Key = "review-rationale", Label = "Review rationale", Type = "text", Required = true, Scope = "shared" }] }] };
    }
    private static LabProtocolEvidence History(LabProtocolDefinition definition, params string[] outcomes)
    {
        var evidence = new LabProtocolEvidence(1, []).Append(definition, new("identity", "record", "recorded", new Dictionary<string, JsonElement>(), false, false, null, null), Guid.NewGuid(), Roles, DateTime.UtcNow);
        foreach (var outcome in outcomes)
            evidence = evidence.Append(definition, new("qc", evidence.Records.Count == 1 ? "record" : "repeat", "recorded",
                new Dictionary<string, JsonElement> { ["value"] = JsonSerializer.SerializeToElement(20) }, true, false, outcome, "TEST ONLY QC decision"), Guid.NewGuid(), Roles, DateTime.UtcNow);
        return evidence;
    }

    [Fact]
    public void All_samples_need_complete_passing_history_and_recorded_prerequisites()
    {
        var definition = Definition();
        Assert.Equal("conditional-review", LabPreparationConditionalReview.SkippableStep(definition, [History(definition, "pass"), History(definition, "pass")])?.Key);
        Assert.Null(LabPreparationConditionalReview.SkippableStep(definition, []));
        Assert.Null(LabPreparationConditionalReview.SkippableStep(definition, [History(definition, "pass"), History(definition)]));
        Assert.Null(LabPreparationConditionalReview.SkippableStep(definition, [new(1, [])]));
    }

    [Theory]
    [InlineData("hold")]
    [InlineData("fail")]
    public void Any_historical_hold_or_failure_keeps_review_even_after_passing_repeat(string prior)
    {
        var definition = Definition();
        Assert.Null(LabPreparationConditionalReview.SkippableStep(definition, [History(definition, "pass"), History(definition, prior, "pass")]));
        Assert.Null(LabPreparationConditionalReview.SkippableStep(definition, [History(definition, prior)]));
    }

    [Fact]
    public void Existing_review_and_unknown_conditions_are_not_automatically_changed()
    {
        var definition = Definition(); var history = History(definition, "pass");
        var resolved = history.Append(definition, new("conditional-review", "record", "skipped", new Dictionary<string, JsonElement>(), false, false, null, "Previously assessed"), Guid.NewGuid(), Roles, DateTime.UtcNow);
        Assert.Null(LabPreparationConditionalReview.SkippableStep(definition, [resolved]));
        var different = definition with { Steps = [definition.Steps[0], definition.Steps[1], definition.Steps[2] with { Condition = "A different condition requiring judgment." }] };
        Assert.Null(LabPreparationConditionalReview.SkippableStep(different, [history]));
        var stale = history.Append(definition, new("identity", "correct", "recorded", new Dictionary<string, JsonElement>(), false, false, null, "Correct prior evidence"), Guid.NewGuid(), Roles, DateTime.UtcNow);
        Assert.Null(LabPreparationConditionalReview.SkippableStep(definition, [stale]));
    }
}
