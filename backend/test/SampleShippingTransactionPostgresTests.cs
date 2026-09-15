namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class SampleShippingTransactionPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ShippingJoinsOuterGuardTransactionAndRetainsRollbackAndLockOwnership()
    {
        var connection = Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!;
        var settings = new NpgsqlConnectionStringBuilder(connection);
        if (settings.Host is not ("localhost" or "127.0.0.1")) throw new InvalidOperationException("Use local PostgreSQL.");
        await using var db = new PSeqOperationsDbContext(new DbContextOptionsBuilder<PSeqOperationsDbContext>().UseNpgsql(connection).Options, Options.Create(new PersistenceOptions()));
        await db.Database.OpenConnectionAsync();
        await db.Database.ExecuteSqlRawAsync("CREATE TEMP TABLE shipping_guard_probe (value integer) ON COMMIT PRESERVE ROWS");
        var key = "test-shipping-guard-" + Guid.NewGuid();
        await using var outer = await db.Database.BeginTransactionAsync();
        await using var nested = await SampleShippingPackingData.BeginAsync(db, key, default);
        Assert.Null(nested);
        Assert.Same(outer, db.Database.CurrentTransaction);
        await db.Database.ExecuteSqlRawAsync("INSERT INTO shipping_guard_probe VALUES (1)");
        await using var observer = new NpgsqlConnection(connection);
        await observer.OpenAsync();
        async Task<bool> CanLock()
        {
            await using var query = new NpgsqlCommand("SELECT pg_try_advisory_xact_lock(hashtextextended(@key, 0))", observer);
            query.Parameters.AddWithValue("key", key);
            return (bool)(await query.ExecuteScalarAsync())!;
        }
        Assert.False(await CanLock());
        await outer.RollbackAsync();
        Assert.True(await CanLock());
        await using var count = db.Database.GetDbConnection().CreateCommand();
        count.CommandText = "SELECT count(*) FROM shipping_guard_probe";
        Assert.Equal(0L, await count.ExecuteScalarAsync());
        await using var owned = await SampleShippingPackingData.BeginAsync(db, key, default);
        Assert.NotNull(owned);
        Assert.Same(owned, db.Database.CurrentTransaction);
        await owned.RollbackAsync();
    }
}
