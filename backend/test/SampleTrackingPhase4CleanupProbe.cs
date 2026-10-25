namespace PhaenoPortal.Test;

using System.Text.Json;
using Npgsql;

internal static partial class SampleTrackingPhase4Support
{
    public static async Task VerifyCleanupFailureAsync()
    {
        var reference = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION"));
        var keys = new[] { "PSEQ_OPERATIONS_REFERENCE_CONNECTION", "PSEQ_PHASE4_SOURCE_DATABASE", "PSEQ_PHASE4_RESTORED_DATABASE", "PSEQ_PHASE4_PRIVATE_ROOT" };
        var previous = keys.ToDictionary(k => k, Environment.GetEnvironmentVariable);
        var original = new InvalidOperationException("TEST original capture failure for cleanup qualification");
        var receiptRoot = Path.Combine(Artifacts(), "cleanup-failure-probe");
        Exception? verificationError = null;
        IReadOnlyList<Phase4Cleanup.Failure> repairErrors = [];
        try
        {
            var failure = await Assert.ThrowsAsync<AggregateException>(() => RunAsync(() => throw original, () => Task.CompletedTask,
                action => action.StartsWith("database:pseq_handoff_test_", StringComparison.Ordinal)
                    ? throw new IOException("TEST first database cleanup unavailable") : Task.CompletedTask, "cleanup-failure-probe"));
            Assert.Same(original, failure.InnerExceptions[0]);
            foreach (var key in keys) Assert.Equal(previous[key] ?? "", Environment.GetEnvironmentVariable(key) ?? "");
            using var cleanup = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(receiptRoot, "cleanup.json")));
            Assert.Equal("failed", cleanup.RootElement.GetProperty("result").GetString());
            Assert.Single(cleanup.RootElement.GetProperty("remainingKnownDatabases").EnumerateArray());
            Assert.Single(cleanup.RootElement.GetProperty("droppedAndAbsent").EnumerateArray());
            Assert.True(cleanup.RootElement.GetProperty("privateRootRemoved").GetBoolean());
            Assert.True(cleanup.RootElement.GetProperty("configuredDevelopmentUnchanged").GetBoolean());
            using var run = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(receiptRoot, "run.json")));
            Assert.Equal("failed", run.RootElement.GetProperty("result").GetString());
        }
        catch (Exception error) { verificationError = error; }
        finally
        {
            // The qualification intentionally leaves one known fixture; independently remove only identities in its ownership receipt.
            if (File.Exists(Path.Combine(receiptRoot, "ownership.json")))
            {
                using var owned = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(receiptRoot, "ownership.json")));
                var dropped = new List<string>(); var settings = new NpgsqlConnectionStringBuilder(reference.ConnectionString) { Database = "postgres", Pooling = false };
                var repairs = new List<Phase4Cleanup.Action>();
                foreach (var entry in owned.RootElement.GetProperty("creationAttempted").EnumerateArray())
                {
                    var name = entry.GetString()!;
                    repairs.Add(new("repair:" + name, async () =>
                    {
                        Assert.Matches("^pseq_(handoff_test|phase4_restored)_[0-9a-f]{32}$", name); Assert.NotEqual(reference.Database, name);
                        await using var admin = new NpgsqlConnection(settings.ConnectionString); await admin.OpenAsync();
                        await using (var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{name}\" WITH (FORCE)", admin)) await drop.ExecuteNonQueryAsync();
                        await using var readback = new NpgsqlCommand("SELECT count(*) FROM pg_database WHERE datname=@name", admin); readback.Parameters.AddWithValue("name", name);
                        Assert.Equal(0L, await readback.ExecuteScalarAsync()); dropped.Add(name);
                    }));
                }
                repairErrors = await Phase4Cleanup.FinishAsync(repairs, () => { }, [new("repair-receipt", failures =>
                    File.WriteAllTextAsync(Path.Combine(receiptRoot, "repair.json"), JsonSerializer.Serialize(new { result = failures.Count == 0 ? "passed" : "failed", droppedAndAbsent = dropped,
                        environmentRestored = keys.All(k => (previous[k] ?? "") == (Environment.GetEnvironmentVariable(k) ?? "")),
                        errors = failures.Select(f => new { action = f.Action, errorType = f.Error.GetType().Name }).ToArray() }, JsonSerializerOptions.Web)))]);
            }
        }
        Phase4Cleanup.ThrowIfFailed(verificationError, repairErrors);
    }

    public static async Task VerifyUncertainCreationAsync()
    {
        var reference = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION"));
        var keys = new[] { "PSEQ_OPERATIONS_REFERENCE_CONNECTION", "PSEQ_PHASE4_SOURCE_DATABASE", "PSEQ_PHASE4_RESTORED_DATABASE", "PSEQ_PHASE4_PRIVATE_ROOT" };
        var previous = keys.ToDictionary(k => k, Environment.GetEnvironmentVariable);
        foreach (var failAt in new[] { 1, 2 })
        {
            var count = 0; var captured = false; var recovered = false;
            var original = new IOException("TEST server created the database; creation acknowledgement was lost");
            var subdirectory = "uncertain-creation-" + failAt;
            var root = Path.Combine(Artifacts(), subdirectory);
            await Assert.ThrowsAsync<IOException>(() => RunAsync(() => { captured = true; return Task.CompletedTask; },
                () => { recovered = true; return Task.CompletedTask; }, receiptSubdirectory: subdirectory,
                afterDatabaseCreated: _ => ++count == failAt ? throw original : Task.CompletedTask));
            Assert.False(captured); Assert.False(recovered);
            foreach (var key in keys) Assert.Equal(previous[key] ?? "", Environment.GetEnvironmentVariable(key) ?? "");
            using var ownership = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(root, "ownership.json")));
            Assert.Equal(failAt - 1, ownership.RootElement.GetProperty("created").GetArrayLength());
            Assert.Equal(failAt, ownership.RootElement.GetProperty("creationAttempted").GetArrayLength());
            using var cleanup = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(root, "cleanup.json")));
            Assert.Equal("passed", cleanup.RootElement.GetProperty("result").GetString());
            Assert.Equal(failAt, cleanup.RootElement.GetProperty("droppedAndAbsent").GetArrayLength());
            Assert.Empty(cleanup.RootElement.GetProperty("remainingKnownDatabases").EnumerateArray());
            Assert.True(cleanup.RootElement.GetProperty("privateRootRemoved").GetBoolean());
            Assert.True(cleanup.RootElement.GetProperty("configuredDevelopmentUnchanged").GetBoolean());
            using var run = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(root, "run.json")));
            Assert.Equal("failed", run.RootElement.GetProperty("result").GetString());
            var adminSettings = new NpgsqlConnectionStringBuilder(reference.ConnectionString) { Database = "postgres", Pooling = false };
            await using var admin = new NpgsqlConnection(adminSettings.ConnectionString); await admin.OpenAsync();
            foreach (var entry in ownership.RootElement.GetProperty("creationAttempted").EnumerateArray())
            {
                await using var command = new NpgsqlCommand("SELECT count(*) FROM pg_database WHERE datname=@name", admin);
                command.Parameters.AddWithValue("name", entry.GetString()!); Assert.Equal(0L, await command.ExecuteScalarAsync());
            }
            await File.WriteAllTextAsync(Path.Combine(root, "qualification.json"), JsonSerializer.Serialize(new { result = "passed", failAt,
                serverCreatedBeforeLostResponse = true, allIntendedAttemptsAbsent = true, environmentRestored = true }, JsonSerializerOptions.Web));
        }
    }
}
