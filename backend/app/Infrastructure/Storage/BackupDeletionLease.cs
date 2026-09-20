namespace PhaenoPortal.App.Infrastructure.Storage;

using Npgsql;

/// <summary>Online snapshots hold the exclusive side; normal deletions share the other side.</summary>
public sealed class BackupDeletionLease(IConfiguration configuration)
{
    public const long LockId = 650320260920L;
    public async Task<IAsyncDisposable> AcquireAsync(CancellationToken ct)
    {
        var connection = new NpgsqlConnection(new NpgsqlConnectionStringBuilder(configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("File deletion requires the configured database coordination lease.")) { Pooling = false }.ConnectionString);
        try
        {
            await connection.OpenAsync(ct);
            await using var command = new NpgsqlCommand("SELECT pg_advisory_lock_shared(650320260920)", connection) { CommandTimeout = 0 };
            await command.ExecuteNonQueryAsync(ct);
            return connection;
        }
        catch { await connection.DisposeAsync(); throw; }
    }
}
