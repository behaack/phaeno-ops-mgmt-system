namespace PhaenoPortal.Test;

using System.Text.Json;
using PSeq.Operations.Laboratory.Domain;

public class LabStepPerformanceTests
{
    private static readonly Guid Performer = Guid.NewGuid();
    private static readonly DateTime Now = new(2026, 11, 2, 16, 0, 0, DateTimeKind.Utc);
    private static readonly HashSet<LabRole> Roles = [LabRole.Operator, LabRole.Supervisor];

    [Fact]
    public void ExplicitNowUsesAuthenticatedPerformerAndServerTime()
    {
        var evidence = Append(new(1, []), LabProtocolTestData.Input() with { Performance = new("now", true) });
        var saved = LabProtocolEvidence.Read(evidence.ToJson()).Records.Single();
        Assert.Equal(Performer, saved.Performance!.PerformedByUserId);
        Assert.Equal(Now, saved.Performance.PerformedAtUtc);
        Assert.Equal(Now, saved.RecordedAtUtc);
        Assert.Equal("server", saved.Performance.Precision);
    }

    [Theory]
    [InlineData("2026-11-01T01:30-07:00", 8, -420)]
    [InlineData("2026-11-01T01:30-08:00", 9, -480)]
    public void LateEntryRetainsOffsetPrecisionAndReason(string entered, int utcHour, int offset)
    {
        var saved = Append(new(1, []), LabProtocolTestData.Input() with { Performance = new("earlier", true, entered, "  Recorded from worksheet  ") }).Records.Single();
        Assert.Equal(new DateTime(2026, 11, 1, utcHour, 30, 0, DateTimeKind.Utc), saved.Performance!.PerformedAtUtc);
        Assert.Equal(offset, saved.Performance.UtcOffsetMinutes);
        Assert.Equal("minute", saved.Performance.Precision);
        Assert.Equal("Recorded from worksheet", saved.Performance.LateEntryReason);
        Assert.Equal(Now, saved.RecordedAtUtc);
    }

    [Theory]
    [InlineData("earlier", true, "2026-11-01T01:30", "Worksheet")]
    [InlineData("earlier", true, "2026-02-30T01:30-08:00", "Worksheet")]
    [InlineData("earlier", true, "2026-11-03T01:30-08:00", "Worksheet")]
    [InlineData("earlier", true, "2026-11-01T01:30-08:00", " ")]
    [InlineData("now", false, null, null)]
    [InlineData("now", true, "2026-11-01T01:30-08:00", "Worksheet")]
    [InlineData("invented", true, null, null)]
    public void InvalidPerformanceCannotAppendEvidence(string mode, bool confirmed, string? time, string? reason)
    {
        var original = new LabProtocolEvidence(1, []);
        Assert.Throws<ArgumentException>(() => Append(original, LabProtocolTestData.Input() with { Performance = new(mode, confirmed, time, reason) }));
        Assert.Empty(original.Records);
    }

    [Fact]
    public void CorrectionRetainsOriginalPerformerWhileRepeatCapturesNewPerformance()
    {
        var original = Append(new(1, []), LabProtocolTestData.Input() with { Performance = new("now", true) });
        var supervisor = Guid.NewGuid();
        var corrected = original.Append(Definition(), LabProtocolTestData.Input(action: "correct", reason: "Transcription error"), supervisor, Roles, Now.AddHours(1));
        Assert.Equal(original.Records[0].Performance, corrected.Records[1].Performance);
        Assert.Equal(original.Records[0].Id, corrected.Records[1].CorrectsRecordId);
        Assert.Equal(supervisor, corrected.Records[1].RecordedByUserId);
        Assert.Throws<ArgumentException>(() => original.Append(Definition(), LabProtocolTestData.Input(action: "correct", reason: "Wrong actor") with { Performance = new("now", true) }, supervisor, Roles, Now));
        var repeated = corrected.Append(Definition(), LabProtocolTestData.Input(action: "repeat", reason: "Repeat measurement") with { Performance = new("now", true) }, supervisor, Roles, Now.AddHours(2));
        Assert.Equal(supervisor, repeated.Records[2].Performance!.PerformedByUserId);
        Assert.Null(repeated.Records[2].CorrectsRecordId);
    }

    [Fact]
    public void OnBehalfEntryRetainsActualPerformerReasonAndPendingReview()
    {
        var actual = Guid.NewGuid();
        var input = LabProtocolTestData.Input() with { Performance = new("now", false, null, "Recorded from the operator worksheet", actual) };
        var saved = LabProtocolEvidence.Read(Append(new(1, []), input).ToJson()).Records.Single();
        Assert.Equal(Performer, saved.RecordedByUserId);
        Assert.Equal(actual, saved.Performance!.PerformedByUserId);
        Assert.Equal("PendingReview", saved.Performance.VerificationStatus);
        Assert.Throws<ArgumentException>(() => LabStepPerformance.Capture(new("now", false, null, null, actual), Performer, Now));
        Assert.Throws<ArgumentException>(() => LabStepPerformance.Capture(new("now", false, null, "Reason", Performer), Performer, Now));
        var proposal = new LabPerformanceProposal(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), saved.Id,
            null, Performer, Now, "OnBehalf", "Worksheet", saved.Performance, null);
        Assert.Throws<ArgumentException>(() => new LabPerformanceDecision(proposal, Performer, Now, true, "Self approval"));
        Assert.True(new LabPerformanceDecision(proposal, actual, Now, true, "Independent supervisor checked worksheet").Approved);
    }

    [Fact]
    public void LegacyEvidenceRemainsUnknownAndOptionalFieldsDoNotChangeOldCommandSerialization()
    {
        var legacy = Append(new(1, []), LabProtocolTestData.Input());
        Assert.Null(LabProtocolEvidence.Read(legacy.ToJson()).Records.Single().Performance);
        var corrected = Append(legacy, LabProtocolTestData.Input(action: "correct", reason: "Value correction"));
        Assert.Null(corrected.Records.Last().Performance);
        var request = PreparationInput();
        var json = JsonSerializer.Serialize(request, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.DoesNotContain("performance", json);
    }

    [Fact]
    public void PreparationPropagatesOneConfirmedPerformanceOnlyToCoveredTubes()
    {
        var member = Guid.NewGuid();
        var input = PreparationInput() with { CoveredMemberIds = [member], Performance = new("now", true) };
        var step = Definition().Steps[0] with { Captures = [], QcGate = null };
        var resolved = LabPreparationEvidence.Resolve(step, input, member, Guid.NewGuid());
        Assert.Equal(input.Performance, resolved.Performance);
        Assert.Throws<ArgumentException>(() => LabPreparationEvidence.Resolve(step, input, Guid.NewGuid(), Guid.NewGuid()));
        Assert.Throws<ArgumentException>(() => LabPreparationEvidence.Resolve(step, input with { Outcome = "skipped" }, member, Guid.NewGuid()));
        var definition = Definition() with { Steps = [step with { Required = false }] };
        var skip = resolved with { Outcome = "skipped", Reason = "Not applicable", OperatorConfirmed = false };
        Assert.Throws<ArgumentException>(() => new LabProtocolEvidence(1, []).Append(definition, skip, Performer, Roles, Now));
        Assert.Null(new LabProtocolEvidence(1, []).Append(definition, skip with { Performance = null }, Performer, Roles, Now).Records.Single().Performance);
    }

    private static LabPreparationStepInput PreparationInput() => new(Guid.NewGuid(), "prepare-library", "record", "recorded", [], new Dictionary<string, JsonElement>(), [], null, null, true, true, false);
    private static LabProtocolDefinition Definition() => LabProtocolDefinition.Parse(LabProtocolTestData.Definition());
    private static LabProtocolEvidence Append(LabProtocolEvidence evidence, LabProtocolStepInput input) => evidence.Append(Definition(), input, Performer, Roles, Now);
}
