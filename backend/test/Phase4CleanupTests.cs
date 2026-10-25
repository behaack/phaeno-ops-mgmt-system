namespace PhaenoPortal.Test;

public sealed class Phase4CleanupTests
{
    [Theory]
    [InlineData("database:first")]
    [InlineData("private-files")]
    [InlineData("preservation")]
    public async Task CleanupAttemptsEveryResourceAndRestoresBeforeWritingReceipts(string failedAction)
    {
        var attempted = new List<string>(); var restored = false; var receipts = new List<string>();
        var actions = new[] { "database:first", "database:second", "private-files", "preservation" }.Select(name => new Phase4Cleanup.Action(name, () =>
        {
            attempted.Add(name); if (name == failedAction) throw new IOException("TEST injected failure"); return Task.CompletedTask;
        }));
        var errors = await Phase4Cleanup.FinishAsync(actions, () => restored = true,
            [new("cleanup", failures => { Assert.True(restored); Assert.Equal(failedAction, Assert.Single(failures).Action); receipts.Add("cleanup"); return Task.CompletedTask; }),
             new("run", failures => { Assert.True(restored); Assert.Single(failures); receipts.Add("run"); return Task.CompletedTask; })]);
        Assert.Equal(new[] { "database:first", "database:second", "private-files", "preservation" }, attempted);
        Assert.Equal(new[] { "cleanup", "run" }, receipts); Assert.Single(errors);
    }

    [Fact]
    public async Task CleanupReceiptFailureCannotSuppressRunReceiptOrRestoration()
    {
        var restored = false; var runWritten = false;
        var errors = await Phase4Cleanup.FinishAsync([], () => restored = true,
            [new("cleanup", _ => throw new IOException("TEST unwritable receipt")), new("run", failures =>
            { Assert.True(restored); Assert.Equal("cleanup", Assert.Single(failures).Action); runWritten = true; return Task.CompletedTask; })]);
        Assert.True(runWritten); Assert.Single(errors);
    }

    [Fact]
    public async Task RestorationFailureIsRetainedAndReceiptsAreStillAttempted()
    {
        var written = false;
        var errors = await Phase4Cleanup.FinishAsync([], () => throw new InvalidOperationException("TEST environment restore failure"),
            [new("run", failures => { written = true; Assert.Equal("restore-environment", Assert.Single(failures).Action); return Task.CompletedTask; })]);
        Assert.True(written); Assert.Single(errors);
    }

    [Fact]
    public void OriginalOperationFailureIsPreservedAlongsideCleanupFailures()
    {
        var original = new InvalidOperationException("TEST original capture failure"); var cleanup = new IOException("TEST cleanup failure");
        var error = Assert.Throws<AggregateException>(() => Phase4Cleanup.ThrowIfFailed(original, [new("database", cleanup)]));
        Assert.Same(original, error.InnerExceptions[0]); Assert.Same(cleanup, error.InnerExceptions[1].InnerException);
        Assert.Same(original, Assert.Throws<InvalidOperationException>(() => Phase4Cleanup.ThrowIfFailed(original, [])));
    }

    [Fact]
    public async Task SuccessfulCleanupRetainsSuccessfulOutcome()
    {
        var restored = false;
        var errors = await Phase4Cleanup.FinishAsync([new("resource", () => Task.CompletedTask)], () => restored = true,
            [new("receipt", failures => { Assert.Empty(failures); Assert.True(restored); return Task.CompletedTask; })]);
        Assert.Empty(errors); Phase4Cleanup.ThrowIfFailed(null, errors);
    }
}
