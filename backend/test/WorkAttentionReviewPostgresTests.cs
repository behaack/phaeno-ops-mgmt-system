namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.WorkAttention;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class DepartmentAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task SubstitutionAttentionScopesCurrentConsentAndClearsAfterDecision()
    {
        await using var scope = await Scope.Create();
        var now = DateTime.UtcNow;
        var catalog = new QboCatalogItem($"ATTN-{Guid.NewGuid():N}", "TEST Kit", "Synthetic consent evidence", "kit", 100, "USD", true, now);
        var offering = new PartnerReagentOffering(scope.Organization.Id, catalog.Id, 100, "USD", "kit", 1, 1, 100, "{}", now.AddDays(-1), null, true);
        scope.Db.AddRange(catalog, offering);
        ReagentOrderAdjustment Add(OrganizationDepartment department, ReagentOrderStatus status)
        {
            var order = new PartnerReagentOrder(scope.Organization.Id, department.Id, $"ATTN-{Guid.NewGuid():N}", true);
            scope.Db.Add(order); scope.Db.Entry(order).Property(o => o.Status).CurrentValue = status;
            var line = new PartnerReagentOrderLine(order.Id, offering.Id, 1, null);
            line.Snapshot(catalog.Id, $"ATTN-{catalog.Id:N}", "TEST Kit", "kit", 100, "USD");
            var adjustment = new ReagentOrderAdjustment(order.Id, line.Id, offering.Id, "{}", "{}", "TEST consent", 0);
            scope.Db.AddRange(line, adjustment);
            return adjustment;
        }
        var current = Add(scope.General, ReagentOrderStatus.Processing);
        var held = Add(scope.General, ReagentOrderStatus.OnHold);
        Add(scope.Research, ReagentOrderStatus.Processing);
        Add(scope.General, ReagentOrderStatus.Completed);
        Add(scope.General, ReagentOrderStatus.CancellationRequested);
        var decided = Add(scope.General, ReagentOrderStatus.Processing); decided.Decide(false, scope.Actor.Id, now);
        await scope.Db.SaveChangesAsync();
        async Task<WorkItem[]> Read(bool canApprove)
        {
            var session = AttentionSession(scope, EmptyAttentionCaps() with { CanViewReagentOrders = true, CanApproveReagentSubstitutions = canApprove });
            return await new WorkAttentionReader(scope.Db, new(), session, false, now).Queries()
                .Aggregate((left, right) => left.Concat(right)).Where(item => item.SourceType == "KitSubstitution").ToArrayAsync();
        }
        var rows = await Read(true);
        Assert.Equal(2, rows.Length);
        var action = rows.Single(item => item.SourceId == current.Id);
        Assert.Equal("action", action.Kind); Assert.Equal(current.PartnerReagentOrderId, action.TargetId);
        Assert.Equal("/reagent-orders/", action.Destination); Assert.Null(action.DueAtUtc);
        Assert.Equal("waiting", rows.Single(item => item.SourceId == held.Id).Kind);
        Assert.All(await Read(false), item => Assert.Equal("waiting", item.Kind));
        current.Decide(true, scope.Actor.Id, now); held.Decide(false, scope.Actor.Id, now);
        await scope.Db.SaveChangesAsync();
        Assert.Empty(await Read(true)); Assert.False(scope.Db.ChangeTracker.HasChanges());
    }

    [PostgreSqlReferenceFact]
    public async Task ActiveJobsKeepUnfinishedShippingAfterLaboratoryReceipt()
    {
        await using var scope = await Scope.Create();
        var order = scope.AddOrder(scope.General);
        var accepted = scope.AddQuote(order, QuoteStatus.Accepted);
        scope.Db.Entry(order).Property(value => value.AcceptedQuoteId).CurrentValue = accepted.Id;
        scope.Db.Entry(order).Property(value => value.Status).CurrentValue = LabServiceOrderStatus.PlacedAwaitingSamples;
        await scope.Db.SaveChangesAsync();
        var session = AttentionSession(scope, EmptyAttentionCaps() with { CanViewLabServiceOrders = true, CanManageSampleShipping = true });
        var reader = new WorkAttentionReader(scope.Db, new(), session, false, DateTime.UtcNow);
        Assert.Single(await reader.ReadExternalDomainActionsAsync(default));
        order.RecordLaboratoryReceipt();
        await scope.Db.SaveChangesAsync();
        Assert.Equal(LabServiceOrderStatus.InProgress, order.Status);
        var item = Assert.Single(await reader.ReadExternalDomainActionsAsync(default));
        Assert.Equal(order.Id, item.TargetId);
        Assert.Equal(order.Phases.Single().Id, item.SourceId);
        Assert.Equal("action", item.Kind);
        order.PutOnHold("Synthetic hold", null);
        await scope.Db.SaveChangesAsync();
        Assert.Empty(await reader.ReadExternalDomainActionsAsync(default));
    }

    [PostgreSqlReferenceFact]
    public async Task ChangeQuoteAttentionScopesCurrentDecisionsAndAdministratorResponsibility()
    {
        await using var scope = await Scope.Create();
        var now = DateTime.UtcNow;
        LabServiceQuote AddChange(OrganizationDepartment department, QuoteStatus status, DateTime expires)
        {
            var order = scope.AddOrder(department);
            var accepted = scope.AddQuote(order, QuoteStatus.Accepted);
            scope.Db.Entry(order).Property(value => value.AcceptedQuoteId).CurrentValue = accepted.Id;
            scope.Db.Entry(order).Property(value => value.Status).CurrentValue = LabServiceOrderStatus.InProgress;
            var quote = new LabServiceQuote(order.Id, 2, QuotePurpose.Change, "[]", 100, 0, "USD", now.AddDays(-2), expires);
            scope.Db.Add(quote);
            scope.Db.Entry(quote).Property(value => value.Status).CurrentValue = status;
            return quote;
        }
        var current = AddChange(scope.General, QuoteStatus.Issued, now.AddDays(1));
        AddChange(scope.Research, QuoteStatus.Issued, now.AddDays(1));
        AddChange(scope.General, QuoteStatus.Issued, now.AddDays(-1));
        AddChange(scope.General, QuoteStatus.Accepted, now.AddDays(1));
        await scope.Db.SaveChangesAsync();
        var session = AttentionSession(scope, EmptyAttentionCaps() with { CanViewLabServiceOrders = true, CanAcceptLabServiceQuotes = true });
        async Task<WorkItem[]> Decisions(bool admin)
        {
            var reader = new WorkAttentionReader(scope.Db, new(), session with { Capabilities = session.Capabilities with { CanAcceptLabServiceQuotes = admin } }, false, now);
            return await reader.Queries().Aggregate((left, right) => left.Concat(right)).Where(item => item.SourceType == "ChangeQuote").ToArrayAsync();
        }
        var action = Assert.Single(await Decisions(true));
        Assert.Equal(current.Id, action.SourceId);
        Assert.Equal(current.LabServiceOrderId, action.TargetId);
        Assert.Equal("action", action.Kind);
        Assert.Equal("waiting", Assert.Single(await Decisions(false)).Kind);
        scope.Db.Entry(current).Property(value => value.Status).CurrentValue = QuoteStatus.Declined;
        await scope.Db.SaveChangesAsync();
        Assert.Empty(await Decisions(true));
    }

    [PostgreSqlReferenceFact]
    public async Task ReconciliationWorkExcludesSourceContributorsAndRetainedDraftEditorsBeforePaging()
    {
        await using var scope = await Scope.Create();
        var other = new User($"review-{Guid.NewGuid():N}@example.invalid", "Other", "Operator");
        other.Activate(); scope.Db.Add(other);
        var now = DateTime.UtcNow;
        ReconciliationBatch Batch(decimal bank = 100)
        {
            var batch = new ReconciliationBatch($"REVIEW-{Guid.NewGuid():N}", DateOnly.FromDateTime(now), 100, bank, other.Id);
            scope.Db.Add(batch); return batch;
        }
        var eligible = Batch(); eligible.Submit(other.Id, now);
        var contributor = Batch(); contributor.Submit(other.Id, now);
        scope.Db.Add(new ReconciliationBatchItem(contributor.Id, "PaymentReceipt", Guid.NewGuid(), 100, scope.Actor.Id));
        var editor = Batch();
        var before = new ReconciliationDraftSnapshot(editor.PeriodEnd, 100, 100, [], [], []);
        editor.ReviseDraft(before, before, scope.Actor.Id, "Synthetic retained editor", now);
        editor.Submit(other.Id, now);
        var unbalanced = Batch(90); unbalanced.Submit(other.Id, now);
        await scope.Db.SaveChangesAsync();
        var session = AttentionSession(scope, EmptyAttentionCaps() with { CanReconcilePSeqCash = true });
        var reader = new WorkAttentionReader(scope.Db, new() { DualControlEnforced = true }, session, true, now);
        var raw = reader.Queries().Aggregate((left, right) => left.Concat(right));
        var filtered = await reader.WithReconciliationEligibilityAsync(raw, default);
        Assert.Equal(eligible.Id, Assert.Single(await filtered.ToListAsync()).SourceId);
        var relaxed = new WorkAttentionReader(scope.Db, new(), session, true, now);
        Assert.Equal(3, await (await relaxed.WithReconciliationEligibilityAsync(raw, default)).CountAsync());
        eligible.Approve(scope.Actor.Id, [], "{}", now);
        await scope.Db.SaveChangesAsync();
        Assert.Empty(await filtered.ToListAsync());
        Assert.False(scope.Db.ChangeTracker.HasChanges());
    }
}
