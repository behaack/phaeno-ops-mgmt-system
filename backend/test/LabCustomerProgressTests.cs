namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.LabOperations.Services;

public sealed class LabCustomerProgressTests
{
    [Fact]
    public void PreparedAndAwaitingProviderRemainPreparationUntilSequencingIsRecorded()
    {
        Assert.Equal("LibraryPrep", Stage(preparation: true));
        Assert.Equal("Sequencing", Stage(preparation: true, sequencing: true));
        Assert.Equal("DataAssembly", Stage(sequencing: true, packages: ["Uploading"]));
        Assert.Equal("QualityReview", Stage(packages: ["ReadyForRelease"]));
        Assert.Equal("ResultsAvailable", Stage(packages: ["Released"], released: true));
        Assert.Equal("Received", Stage(status: "DataAvailable")); // A status alone is not release evidence.
        Assert.Equal("Received", Stage(packages: ["Withdrawn"]));
    }

    [Fact]
    public void MixedSamplesAndPartialReleaseDoNotAdvanceTheWholeJob()
    {
        var mixed = Summary("Received", "LibraryPrep", "ResultsAvailable");
        Assert.Equal("Mixed", mixed.CurrentStage);
        Assert.Equal(3, mixed.Counts.Sum(count => count.Count));
        Assert.Equal("Mixed", Summary("LibraryPrep", "ResultsAvailable").CurrentStage);
        Assert.Equal("Mixed", Summary("AwaitingReceipt", "ResultsAvailable").CurrentStage);
        Assert.Equal("ResultsAvailable", Summary("ResultsAvailable", "ResultsAvailable").CurrentStage);
    }

    [Fact]
    public void JobWideActivityDoesNotFabricateSampleStageCounts()
    {
        var progress = LabCustomerProgressService.Summarize([new(Guid.NewGuid(), "Sequencing")], "QualityReview", true);
        Assert.Equal("Sequencing", progress.CurrentStage);
        Assert.Equal("Sequencing", Assert.Single(progress.Samples).Stage);
        Assert.DoesNotContain(progress.Counts, count => count.Stage == "QualityReview");
        Assert.Equal("Sequencing", LabCustomerProgressService.Summarize(progress.Samples, "OnHold", true).CurrentStage);
        Assert.Equal("Mixed", Summary("OnHold", "Sequencing").CurrentStage);
        Assert.Equal("OnHold", Stage(disposition: "OnHold", packages: ["Released"]));
    }

    private static LabCustomerProgress Summary(params string[] stages) =>
        LabCustomerProgressService.Summarize(stages.Select(stage => new LabCustomerSampleStage(Guid.NewGuid(), stage)).ToArray(), null, true);

    private static string Stage(string status = "Accessioned", string? disposition = null,
        bool preparation = false, bool sequencing = false, string[]? packages = null, bool released = false) =>
        LabCustomerProgressService.ResolveSampleStage(status, disposition, true, preparation, sequencing, packages ?? [], released);
}
