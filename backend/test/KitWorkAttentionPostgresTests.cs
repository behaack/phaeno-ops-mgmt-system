namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.WorkAttention;
using PhaenoPortal.App.Infrastructure.Api;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class DepartmentAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task KitAttentionUsesCurrentAuthorityStageAssignmentAndSourceClearance()
    {
        await using var scope = await Scope.Create();
        var partner = new Organization($"Kit attention {Guid.NewGuid():N}", OrganizationKind.Partner);
        scope.Db.Add(partner);
        PartnerReagentOrder Seed(ReagentOrderStatus status)
        {
            var order = new PartnerReagentOrder(partner.Id, partner.Departments.Single().Id, $"ATTN-{Guid.NewGuid():N}", true);
            scope.Db.Add(order); scope.Db.Entry(order).Property(value => value.Status).CurrentValue = status;
            return order;
        }
        var review = Seed(ReagentOrderStatus.UnderReview);
        review.Assign(scope.Actor.Id, DateTime.UtcNow.AddDays(-1));
        var accepted = Seed(ReagentOrderStatus.Accepted);
        var processing = Seed(ReagentOrderStatus.Processing);
        var shipped = Seed(ReagentOrderStatus.Shipped);
        var hold = Seed(ReagentOrderStatus.OnHold);
        scope.Db.Entry(hold).Property(value => value.ResumeStatus).CurrentValue = ReagentOrderStatus.Processing;
        var cancellation = Seed(ReagentOrderStatus.CancellationRequested);
        var terminal = Seed(ReagentOrderStatus.Completed);
        var discarded = Seed(ReagentOrderStatus.Draft); discarded.DiscardDraft();
        scope.Db.Entry(discarded).Property(value => value.Status).CurrentValue = ReagentOrderStatus.Processing;
        await scope.Db.SaveChangesAsync();
        var ids = new[] { review.Id, accepted.Id, processing.Id, shipped.Id, hold.Id, cancellation.Id, terminal.Id, discarded.Id };
        var labCaps = EmptyAttentionCaps() with { CanManageLabOperations = true, CanOperateLabWork = true };
        async Task<WorkItem[]> Read(bool admin, bool lab, bool commercial)
        {
            var caps = lab ? labCaps : EmptyAttentionCaps();
            caps = caps with { CanManageOrderConfiguration = commercial, CanOperateCommercialWork = commercial };
            var session = AttentionSession(scope, caps) with { IsPlatformAdmin = admin };
            var sources = new WorkAttentionReader(scope.Db, new(), session, true, DateTime.UtcNow).Queries();
            return sources.Count == 0 ? [] : await sources.Aggregate((left, right) => left.Concat(right))
                .Where(item => ids.Contains(item.SourceId)).ToArrayAsync();
        }
        var staff = await Read(true, true, true);
        Assert.Equal(6, staff.Length);
        Assert.Equal("kits.review", staff.Single(item => item.SourceId == review.Id).MessageKey);
        Assert.Equal(scope.Actor.Id, staff.Single(item => item.SourceId == review.Id).OwnerUserId);
        Assert.Equal(1, staff.Single(item => item.SourceId == review.Id).Priority);
        Assert.Equal("kits.confirmFulfillment", staff.Single(item => item.SourceId == shipped.Id).MessageKey);
        Assert.Equal(0, staff.Single(item => item.SourceId == hold.Id).Priority);
        Assert.All(await Read(false, true, false), item => Assert.Equal("KitFulfillment", item.SourceType));
        Assert.All(await Read(true, false, true), item => Assert.Equal("KitCommercial", item.SourceType));
        Assert.Empty(await Read(false, false, true)); // business role alone is not the current Kit endpoint authority
        accepted.StartProcessing();
        scope.Db.Entry(processing).Property(value => value.Status).CurrentValue = ReagentOrderStatus.Completed;
        shipped.Fulfill(DateTime.UtcNow);
        await scope.Db.SaveChangesAsync();
        var updated = await Read(true, true, true);
        Assert.Equal("kits.prepareDispatch", updated.Single(item => item.SourceId == accepted.Id).MessageKey);
        Assert.DoesNotContain(updated, item => item.SourceId == processing.Id || item.SourceId == shipped.Id);
        Assert.False(scope.Db.ChangeTracker.HasChanges());
    }

    [PostgreSqlReferenceFact]
    public async Task KitAttentionCountsBeyondOneThousandBeforeStablePaging()
    {
        await using var scope = await Scope.Create();
        var partner = new Organization($"Kit volume {Guid.NewGuid():N}", OrganizationKind.Partner);
        scope.Db.Add(partner);
        var orders = Enumerable.Range(0, 1005).Select(index => new PartnerReagentOrder(partner.Id, partner.Departments.Single().Id, $"VOL-{index}-{Guid.NewGuid():N}", true)).ToArray();
        foreach (var order in orders) { scope.Db.Add(order); scope.Db.Entry(order).Property(value => value.Status).CurrentValue = ReagentOrderStatus.Processing; }
        await scope.Db.SaveChangesAsync();
        var ids = orders.Select(order => order.Id).ToArray();
        var session = AttentionSession(scope, EmptyAttentionCaps() with { CanManageLabOperations = true, CanOperateLabWork = true });
        var sources = new WorkAttentionReader(scope.Db, new(), session, true, DateTime.UtcNow).Queries();
        var query = sources.Aggregate((left, right) => left.Concat(right)).Where(item => ids.Contains(item.SourceId));
        var page = await RecordPage.ReadAsync(query.OrderBy(item => item.CreatedAtUtc).ThenBy(item => item.SourceId), 41, 25, default);
        Assert.Equal(1005, page.TotalCount); Assert.Equal(5, page.Items.Count);
        Assert.All(page.Items, item => Assert.Equal("/lab-operations/pseq-kit-orders/", item.Destination));
        Assert.False(scope.Db.ChangeTracker.HasChanges());
    }
}
