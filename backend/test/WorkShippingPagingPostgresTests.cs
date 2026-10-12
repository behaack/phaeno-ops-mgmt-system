namespace PhaenoPortal.Test;

using System.Data.Common;
using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.WorkAttention;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class DepartmentAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ShippingAttentionQueriesStayBoundedBeyondOneThousandScopedJobs()
    {
        var commands = new ShippingReadCommands();
        await using var scope = await Scope.Create(commands);
        LabServiceOrder Place()
        {
            var order = scope.AddOrder(scope.General);
            var quote = scope.AddQuote(order, QuoteStatus.Accepted);
            scope.Db.Entry(order).Property(value => value.AcceptedQuoteId).CurrentValue = quote.Id;
            scope.Db.Entry(order).Property(value => value.Status).CurrentValue = LabServiceOrderStatus.PlacedAwaitingSamples;
            return order;
        }
        Place(); await scope.Db.SaveChangesAsync();
        var caps = EmptyAttentionCaps() with { CanViewLabServiceOrders = true, CanManageSampleShipping = true };
        var reader = new WorkAttentionReader(scope.Db, new PSeqOrderToCashOptions(), AttentionSession(scope, caps), false, DateTime.UtcNow);
        commands.Count = 0;
        Assert.Single(await reader.ReadExternalDomainActionsAsync(default));
        var baselineQueries = commands.Count;
        for (var index = 0; index < 1004; index++) Place();
        var hidden = scope.AddOrder(scope.Research);
        scope.Db.Entry(hidden).Property(value => value.Status).CurrentValue = LabServiceOrderStatus.PlacedAwaitingSamples;
        await scope.Db.SaveChangesAsync();
        commands.Count = 0;
        var timing = Stopwatch.StartNew();
        var items = await reader.ReadExternalDomainActionsAsync(default);
        timing.Stop();
        Assert.Equal(1005, items.Count);
        Assert.DoesNotContain(items, item => item.TargetId == hidden.Id);
        Assert.Equal(baselineQueries, commands.Count);
        Assert.InRange(commands.Count, 1, 15);
        Assert.False(scope.Db.ChangeTracker.HasChanges());
        Console.WriteLine($"Synthetic shipping attention: {items.Count} Jobs, {commands.Count} queries, {timing.ElapsedMilliseconds} ms. No end-to-end latency target is inferred.");
        var member = new WorkAttentionReader(scope.Db, new PSeqOrderToCashOptions(), AttentionSession(scope, caps with { CanManageSampleShipping = false }), false, DateTime.UtcNow);
        Assert.All(await member.ReadExternalDomainActionsAsync(default), item => Assert.Equal("waiting", item.Kind));
        var denied = new WorkAttentionReader(scope.Db, new PSeqOrderToCashOptions(), AttentionSession(scope, EmptyAttentionCaps()), false, DateTime.UtcNow);
        commands.Count = 0;
        Assert.Empty(await denied.ReadExternalDomainActionsAsync(default));
        Assert.Equal(0, commands.Count);
    }

    private sealed class ShippingReadCommands : DbCommandInterceptor
    {
        public int Count { get; set; }
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData,
            InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            Count++;
            return ValueTask.FromResult(result);
        }
    }
}
