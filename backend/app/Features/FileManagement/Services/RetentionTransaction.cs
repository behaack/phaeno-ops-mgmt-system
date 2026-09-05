namespace PhaenoPortal.App.Features.FileManagement.Services;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using PhaenoPortal.App.Infrastructure.Persistence;

/// <summary>Serializes one package across serving instances; never holds a lock while streaming.</summary>
internal sealed class RetentionTransaction(IDbContextTransaction? ownedTransaction) : IAsyncDisposable
{
    public static async Task<RetentionTransaction> OpenAsync(PSeqOperationsDbContext db, Guid packageId, CancellationToken token)
    {
        var transaction = db.Database.CurrentTransaction is null
            ? await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, token) : null;
        try
        {
            var key = $"released-retention:{packageId:D}";
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtextextended({key}, 0))", token);
            return new(transaction);
        }
        catch { if (transaction is not null) await transaction.DisposeAsync(); throw; }
    }

    public static Task<DateTime> ClockAsync(PSeqOperationsDbContext db, CancellationToken token) =>
        db.Database.SqlQuery<DateTime>($"SELECT clock_timestamp() AS \"Value\"").SingleAsync(token);
    public async Task CommitAsync(CancellationToken token)
    {
        if (ownedTransaction is null) return;
        await ownedTransaction.CommitAsync(token);
        await ownedTransaction.DisposeAsync();
        ownedTransaction = null;
    }
    public ValueTask DisposeAsync() => ownedTransaction?.DisposeAsync() ?? ValueTask.CompletedTask;
}
