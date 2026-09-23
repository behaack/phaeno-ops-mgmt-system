namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabServiceOrdersController
{
    [HttpGet("dashboard")]
    public async Task<CustomerLabDashboardResponse> Dashboard([FromQuery] string dashboardView = "active",
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken cancellationToken = default)
    {
        if (dashboardView is not ("active" or "attention" or "results"))
            throw Invalid("invalid_dashboard_view", "Choose an available dashboard view.");
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, false, cancellationToken);
        var dashboard = new CustomerLabDashboardService(dbContext);
        var orders = dashboard.Orders(tenant.Organization.Id, tenant.Department.Id);
        var attention = await CustomerLabDashboardService.RequiringAttention(orders).CountAsync(cancellationToken);
        var results = await dashboard.NewResultsAsync(tenant.Organization.Id, tenant.Department.Id, cancellationToken);
        var resultOrderIds = results.Select(result => result.LabServiceOrderId!.Value).Distinct().ToArray();
        var query = dashboardView switch
        {
            "attention" => CustomerLabDashboardService.RequiringAttention(orders),
            "results" => orders.Where(order => resultOrderIds.Contains(order.Id)),
            _ => orders.Where(order => order.Status != LabServiceOrderStatus.Completed
                && order.Status != LabServiceOrderStatus.Cancelled
                && order.Status != LabServiceOrderStatus.Declined)
        };
        var requests = await ListOrdersAsync(query, tenant.Organization.Id, Math.Max(1, page),
            Math.Clamp(pageSize, 1, 100), dashboard: true, cancellationToken: cancellationToken);
        return new(new(attention, results.Count), requests);
    }

    [HttpGet("dashboard-summary")]
    public async Task<CustomerLabDashboardSummary> DashboardSummary(CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, false, cancellationToken);
        return await new CustomerLabDashboardService(dbContext).ReadAsync(tenant.Organization.Id, tenant.Department.Id, cancellationToken);
    }
}
