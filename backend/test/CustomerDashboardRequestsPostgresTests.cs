namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class DepartmentAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task DashboardMetricsCountAllDepartmentAttentionItemsAndUseMatchingListFilter()
    {
        await using var scope = await Scope.Create();
        for (var index = 0; index < 12; index++)
            scope.Db.Entry(scope.AddOrder(scope.General)).Property(order => order.Status).CurrentValue = LabServiceOrderStatus.QuoteIssued;
        scope.Db.Entry(scope.AddOrder(scope.General)).Property(order => order.Status).CurrentValue = LabServiceOrderStatus.QuoteInPreparation;
        scope.AddOrder(scope.Research);
        await scope.Db.SaveChangesAsync();
        var controller = scope.QuoteController();
        var summary = await controller.DashboardSummary(default);
        Assert.Equal(12, summary.AttentionCount);
        Assert.Equal(0, summary.NewResultCount);
        var combined = await controller.Dashboard("attention", pageSize: 10);
        Assert.Equal(summary, combined.Summary);
        Assert.Equal(12, combined.Requests.TotalCount);
        Assert.Equal(10, combined.Requests.Items.Count);
        var filtered = await controller.List(null, null, null, null, null, pageSize: 10, dashboard: true, dashboardView: "attention");
        Assert.Equal(12, filtered.TotalCount);
        Assert.Equal(10, filtered.Items.Count);
        Assert.All(filtered.Items, item => Assert.Equal("QuoteIssued", item.Status));
        scope.Http.Request.Headers["X-Department-Id"] = scope.Research.Id.ToString();
        Assert.Equal(1, (await controller.DashboardSummary(default)).AttentionCount);
        Assert.Equal(1, (await controller.Dashboard("attention")).Summary.AttentionCount);
    }

    [PostgreSqlReferenceFact]
    public async Task CustomerDashboardPagesActiveRequestsWithinTheSelectedDepartment()
    {
        await using var scope = await Scope.Create();
        scope.UseOrdinaryMember();
        var first = scope.AddOrder(scope.General);
        var second = scope.AddOrder(scope.General);
        var waiting = scope.AddOrder(scope.General);
        scope.Db.Entry(first).Property(value => value.Status).CurrentValue = LabServiceOrderStatus.QuoteIssued;
        scope.Db.Entry(second).Property(value => value.Status).CurrentValue = LabServiceOrderStatus.QuoteIssued;
        scope.Db.Entry(waiting).Property(value => value.Status).CurrentValue = LabServiceOrderStatus.QuoteInPreparation;
        foreach (var status in new[] { LabServiceOrderStatus.Completed, LabServiceOrderStatus.Cancelled, LabServiceOrderStatus.Declined })
            scope.Db.Entry(scope.AddOrder(scope.General)).Property(value => value.Status).CurrentValue = status;
        scope.Db.Entry(scope.AddOrder(scope.General)).Property(value => value.IsDiscarded).CurrentValue = true;
        scope.AddOrder(scope.Research);
        var foreign = new Organization($"Other customer {Guid.NewGuid():N}", OrganizationKind.Customer);
        scope.Db.Add(foreign);
        scope.Db.Add(new LabServiceOrder(foreign.Id, foreign.Departments.Single().Id, $"TEST-{Guid.NewGuid():N}",
            "Other Customer Job", null, 1, false, "RNA", "Frozen", "No hazard", "Instructions"));
        await scope.Db.SaveChangesAsync();

        var controller = scope.QuoteController();
        var page1 = await controller.List(null, null, null, null, null, page: 1, pageSize: 1, dashboard: true);
        var page2 = await controller.List(null, null, null, null, null, page: 2, pageSize: 1, dashboard: true);
        var page3 = await controller.List(null, null, null, null, null, page: 3, pageSize: 1, dashboard: true);
        Assert.Equal(3, page1.TotalCount);
        Assert.Equal(3, page2.TotalCount);
        Assert.Equal(3, page3.TotalCount);
        Assert.Equal(new[] { first.Id, second.Id }.Order(), new[] { Assert.Single(page1.Items).Id, Assert.Single(page2.Items).Id }.Order());
        Assert.Equal(waiting.Id, Assert.Single(page3.Items).Id);
        var combinedPage = await controller.Dashboard(page: 2, pageSize: 1);
        Assert.Equal(3, combinedPage.Requests.TotalCount);
        Assert.Equal(2, combinedPage.Summary.AttentionCount);
        Assert.Equal(Assert.Single(page2.Items).Id, Assert.Single(combinedPage.Requests.Items).Id);
        var history = await controller.List(null, null, null, null, null);
        Assert.Equal(6, history.TotalCount);

        scope.Db.Entry(first).Property(value => value.Status).CurrentValue = LabServiceOrderStatus.Completed;
        await scope.Db.SaveChangesAsync();
        var refreshed = await controller.List(null, null, null, null, null, dashboard: true);
        Assert.Equal(2, refreshed.TotalCount);
        Assert.DoesNotContain(refreshed.Items, value => value.Id == first.Id);
    }

    [PostgreSqlReferenceFact]
    public async Task CustomerDashboardRejectsRevokedDepartmentAccess()
    {
        await using var scope = await Scope.Create();
        var access = scope.UseOrdinaryMember();
        scope.AddOrder(scope.General);
        await scope.Db.SaveChangesAsync();
        var controller = scope.QuoteController();
        Assert.Single((await controller.List(null, null, null, null, null, dashboard: true)).Items);
        Assert.Single((await controller.Dashboard()).Requests.Items);
        access.Deactivate();
        await scope.Db.SaveChangesAsync();
        var error = await Assert.ThrowsAsync<OrderManagementException>(() => controller.List(null, null, null, null, null, dashboard: true));
        Assert.Equal(StatusCodes.Status404NotFound, error.StatusCode);
        var summaryError = await Assert.ThrowsAsync<OrderManagementException>(() => controller.DashboardSummary(default));
        Assert.Equal(StatusCodes.Status404NotFound, summaryError.StatusCode);
        var combinedError = await Assert.ThrowsAsync<OrderManagementException>(() => controller.Dashboard());
        Assert.Equal(StatusCodes.Status404NotFound, combinedError.StatusCode);
    }
}
