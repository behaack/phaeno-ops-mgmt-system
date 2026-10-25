namespace PhaenoPortal.Test;

using System.Runtime.ExceptionServices;

internal static class Phase4Cleanup
{
    internal sealed record Action(string Name, Func<Task> Run);
    internal sealed record Failure(string Action, Exception Error);
    internal sealed record Receipt(string Name, Func<IReadOnlyList<Failure>, Task> Write);

    internal static async Task<IReadOnlyList<Failure>> FinishAsync(IEnumerable<Action> actions,
        System.Action restoreEnvironment, IEnumerable<Receipt> receipts)
    {
        var failures = new List<Failure>();
        try
        {
            foreach (var action in actions)
                try { await action.Run(); } catch (Exception error) { failures.Add(new(action.Name, error)); }
        }
        finally
        {
            try { restoreEnvironment(); } catch (Exception error) { failures.Add(new("restore-environment", error)); }
        }
        // Receipt failure cannot suppress another receipt or undo environment restoration.
        foreach (var receipt in receipts)
            try { await receipt.Write(failures); } catch (Exception error) { failures.Add(new(receipt.Name, error)); }
        return failures;
    }

    internal static void ThrowIfFailed(Exception? operationError, IReadOnlyList<Failure> cleanupErrors)
    {
        if (cleanupErrors.Count == 0)
        {
            if (operationError is not null) ExceptionDispatchInfo.Capture(operationError).Throw();
            return;
        }
        var errors = cleanupErrors.Select(f => new InvalidOperationException($"Phase 4 cleanup failed: {f.Action}", f.Error)).Cast<Exception>().ToList();
        if (operationError is not null) errors.Insert(0, operationError);
        throw new AggregateException("Phase 4 failed; inspect ownership.json, cleanup.json, run.json and the test failure. Unremoved fixtures remain explicitly listed.", errors);
    }
}
