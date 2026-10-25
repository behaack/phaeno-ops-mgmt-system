namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using PhaenoPortal.App.Infrastructure.Persistence;

internal sealed class SampleTrackingReviewDatabase : IAsyncDisposable
{
    private readonly NpgsqlConnectionStringBuilder adminSettings;
    private readonly string name;
    private readonly string role;
    private bool ownsName;
    public string ConnectionString { get; }
    private SampleTrackingReviewDatabase(NpgsqlConnectionStringBuilder reference, string role)
    {
        if (reference.Host is not ("localhost" or "127.0.0.1" or "::1")) throw new InvalidOperationException("Review fixtures require loopback PostgreSQL.");
        if (role != "mix-equipment" && role is not ("phase1-browser" or "phase2-browser" or "phase3-browser")) throw new ArgumentException("Use a known isolated verification role.");
        this.role = role;
        name = (role == "mix-equipment" ? "pseq_mix_review_test_" : "pseq_browser_matrix_test_") + Guid.NewGuid().ToString("N");
        adminSettings = new(reference.ConnectionString) { Database = "postgres", Pooling = false };
        ConnectionString = new NpgsqlConnectionStringBuilder(reference.ConnectionString) { Database = name, Pooling = false }.ConnectionString;
    }
    public static async Task<SampleTrackingReviewDatabase> CreateAsync(string role = "mix-equipment")
    {
        var owned = new SampleTrackingReviewDatabase(new(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")), role);
        await using var admin = new NpgsqlConnection(owned.adminSettings.ConnectionString); await admin.OpenAsync();
        await using (var absent = new NpgsqlCommand("SELECT count(*) FROM pg_database WHERE datname=@name", admin))
        {
            absent.Parameters.AddWithValue("name", owned.name); Assert.Equal(0L, await absent.ExecuteScalarAsync());
        }
        owned.ownsName = true;
        try
        {
            var receipts = Environment.GetEnvironmentVariable("PSEQ_PHASE4_ARTIFACTS");
            if (!string.IsNullOrWhiteSpace(receipts)) await File.WriteAllTextAsync(Path.Combine(receipts, role + "-ownership.json"),
                System.Text.Json.JsonSerializer.Serialize(new { creationAttempted = owned.name, configuredDatabaseExcluded = true }));
            await using (var create = new NpgsqlCommand($"CREATE DATABASE \"{owned.name}\" TEMPLATE template0", admin)) await create.ExecuteNonQueryAsync();
            var settings = new PersistenceOptions();
            var options = new DbContextOptionsBuilder<PSeqOperationsDbContext>().UseNpgsql(owned.ConnectionString,
                postgres => postgres.MigrationsHistoryTable(settings.MigrationsHistoryTable, settings.MigrationsHistorySchema));
            await using var db = new PSeqOperationsDbContext(options.Options, Options.Create(settings));
            await db.Database.MigrateAsync(); return owned;
        }
        catch { await owned.DisposeAsync(); throw; }
    }
    public async ValueTask DisposeAsync()
    {
        if (!ownsName) return;
        Assert.Matches("^pseq_(mix_review_test|browser_matrix_test)_[0-9a-f]{32}$", name);
        await using var admin = new NpgsqlConnection(adminSettings.ConnectionString); await admin.OpenAsync();
        await using (var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{name}\" WITH (FORCE)", admin)) await drop.ExecuteNonQueryAsync();
        await using var absent = new NpgsqlCommand("SELECT count(*) FROM pg_database WHERE datname=@name", admin); absent.Parameters.AddWithValue("name", name);
        Assert.Equal(0L, await absent.ExecuteScalarAsync());
        var receipts = Environment.GetEnvironmentVariable("PSEQ_PHASE4_ARTIFACTS");
        if (!string.IsNullOrWhiteSpace(receipts)) await File.WriteAllTextAsync(Path.Combine(receipts, role + "-cleanup.json"),
            System.Text.Json.JsonSerializer.Serialize(new { result = "passed", droppedAndAbsent = name }));
    }
}
