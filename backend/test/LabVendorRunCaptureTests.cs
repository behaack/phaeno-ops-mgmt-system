namespace PhaenoPortal.Test;

using System.Text.Json;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed class LabVendorRunCaptureTests
{
    private static readonly DateTime Now = new(2026, 10, 24, 18, 0, 0, DateTimeKind.Utc);
    private static VendorSequencingRunCapture Run(Guid set, int group, string reference) => new(set, group, reference,
        new(1, Instrument: "Instrument A", Flowcell: "FLOW-1", Lane: group.ToString(), IndexMapping: "INDEX-1",
            RunStartedAtUtc: Now.AddHours(-2), RunCompletedAtUtc: Now.AddHours(-1),
            Software: [new("Demultiplexer", "1.2")], Documents: [new("vendor-run", "vendor:retained-evidence", new string('A', 64), 100)]));
    private static RecordVendorResultsRequest Request(Guid set, params VendorSequencingRunCapture[] runs) => new(Guid.NewGuid(), 1,
        "JOB-ONE", false, Now.AddHours(-3), Now, Now, "Success", [], [set], null, SequencingRuns: runs);

    [Fact]
    public void TwoActualRunsUnderOneVendorJobKeepExactGroupEvidence()
    {
        var set = Guid.NewGuid(); var secondSet = Guid.NewGuid();
        var result = LabVendorRunCapture.Normalize(Request(set, Run(secondSet, 1, " RUN-B "), Run(set, 1, "RUN-A")) with { FastqSetIds = [set, secondSet] }, Now);
        LabVendorRunCapture.RequireGroups(result.SequencingRuns, set, [1, 1]);
        LabVendorRunCapture.RequireGroups(result.SequencingRuns, secondSet, [1]);
        Assert.Equal(new[] { "RUN-A", "RUN-B" }, result.SequencingRuns!.Select(r => r.RunReference).Order());
        Assert.All(result.SequencingRuns!, r => Assert.Equal(Now, r.ScientificEvidence.ReceivedAtUtc));
        Assert.Equal("JOB-ONE", result.VendorJobReference);
    }

    [Fact]
    public void MissingDuplicateForeignAndNoRunMappingsAreRejected()
    {
        var set = Guid.NewGuid(); var run = Run(set, 1, "RUN-A");
        Assert.Throws<OrderManagementException>(() => LabVendorRunCapture.RequireGroups([], set, [1]));
        Assert.Throws<OrderManagementException>(() => LabVendorRunCapture.RequireGroups([run], set, [1, 2]));
        Assert.Throws<OrderManagementException>(() => LabVendorRunCapture.Normalize(Request(set, run, run), Now));
        Assert.Throws<OrderManagementException>(() => LabVendorRunCapture.Normalize(Request(set, run, run with { GroupNumber = 2, RunReference = "RUN-B" }), Now));
        Assert.Throws<OrderManagementException>(() => LabVendorRunCapture.Normalize(Request(set, run with { SetId = Guid.NewGuid() }), Now));
        Assert.Throws<OrderManagementException>(() => LabVendorRunCapture.Normalize(Request(set, run) with { RunNotPerformed = true }, Now));
    }

    [Fact]
    public void ActualRunMustHaveRealTimesInsideTheReceiptWindow()
    {
        var set = Guid.NewGuid(); var run = Run(set, 1, "RUN-A");
        Assert.Throws<OrderManagementException>(() => LabVendorRunCapture.Normalize(Request(set, run with { RunReference = " " }), Now));
        Assert.Throws<OrderManagementException>(() => LabVendorRunCapture.Normalize(Request(set, run with { ScientificEvidence = run.ScientificEvidence with { RunStartedAtUtc = null } }), Now));
        Assert.Throws<OrderManagementException>(() => LabVendorRunCapture.Normalize(Request(set, run with { ScientificEvidence = run.ScientificEvidence with { RunCompletedAtUtc = Now.AddHours(1) } }), Now));
    }

    [Fact]
    public void ChangedRunOrInstrumentInvalidatesOutputsButNotesRetainThem()
    {
        var set = Guid.NewGuid(); var run = Run(set, 1, "RUN-A"); var request = LabVendorRunCapture.Normalize(Request(set, run), Now);
        var savedSet = new VendorResultsFastqSetSnapshot(set, Guid.NewGuid(), "LIB", 1, "SingleEnd", 1, []);
        var previous = new VendorResultsSnapshot(Guid.NewGuid(), "BATCH", "Test", Guid.NewGuid(), "Vendor", "JOB-ONE", false,
            request.RunStartedAtUtc, request.RunCompletedAtUtc, request.ResultsReceivedAtUtc, "Success", null, Now, "{}", [], [], [savedSet], request.SequencingRuns);
        Assert.Same(savedSet, LabVendorResultSafety.RetainedSet(previous, request with { Notes = "New note" }, set));
        Assert.Null(LabVendorResultSafety.RetainedSet(previous, request with { SequencingRuns = [run with { RunReference = "RUN-B" }] }, set));
        Assert.Null(LabVendorResultSafety.RetainedSet(previous, request with { SequencingRuns = [run with { ScientificEvidence = run.ScientificEvidence with { Instrument = "OTHER" } }] }, set));
    }

    [Fact]
    public void InvestigationOmitsAnotherSamplesRunAndIndexMapping()
    {
        var set = Guid.NewGuid(); var other = Guid.NewGuid(); var library = Guid.NewGuid(); var foreignLibrary = Guid.NewGuid(); var member = Guid.NewGuid(); var foreignMember = Guid.NewGuid(); var sendout = Guid.NewGuid();
        var manifest = JsonSerializer.Serialize(new { members = new[] { new { libraryId = library, libraryKey = "LIB" }, new { libraryId = foreignLibrary, libraryKey = "OTHER" } } });
        var snapshot = new VendorResultsSnapshot(Guid.NewGuid(), "B", "Batch", sendout, "Vendor", "JOB", false, Now, Now, Now, "Success", null, Now, manifest,
            [new(member, library, "LIB", "Success", null), new(foreignMember, foreignLibrary, "OTHER", "Success", null)], [],
            [new(set, member, "LIB", 1, "SingleEnd", 1, []), new(other, foreignMember, "OTHER", 1, "SingleEnd", 1, [])],
            [Run(set, 1, "RUN-A"), Run(other, 1, "FOREIGN-SECRET") with { ScientificEvidence = new(1, IndexMapping: "FOREIGN-SECRET") }]);
        var version = new LabVendorResultsVersion(Guid.NewGuid(), sendout, 1, JsonSerializer.Serialize(snapshot, JsonSerializerOptions.Web), null, Guid.NewGuid(), "Operator", Now);
        var json = JsonSerializer.Serialize(LabInvestigationSequencing.Version(version, new Dictionary<Guid, string> { [library] = "LIB" }));
        Assert.Contains("RUN-A", json); Assert.DoesNotContain("FOREIGN-SECRET", json);
    }
}
