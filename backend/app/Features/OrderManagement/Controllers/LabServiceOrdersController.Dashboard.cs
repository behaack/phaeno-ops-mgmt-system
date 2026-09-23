namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabServiceOrdersController
{
    [HttpGet("dashboard-summary")]
    public async Task<CustomerLabDashboardSummary> DashboardSummary(CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, false, cancellationToken);
        return await new CustomerLabDashboardService(dbContext).ReadAsync(tenant.Organization.Id, tenant.Department.Id, cancellationToken);
    }
}
