namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;

[ApiController]
[Authorize]
[Route("api/order-catalog/custom-work")]
public sealed class CustomWorkRequestsController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    OrderIdempotencyService idempotency,
    CustomWorkRequestService service) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<CustomWorkSubmissionDto>> Create(
        [FromBody] CreateCustomWorkRequest request, CancellationToken cancellationToken)
    {
        var tenant = await RequireSelectedTenantAsync(request.Service, cancellationToken);
        CustomWorkRequestService.RequireOrganizationAdministrator(tenant);
        var normalized = CustomWorkRequestService.Normalize(request, tenant.Organization.Kind);
        var result = await idempotency.ExecuteAsync(tenant.Actor.Id, "order-catalog:custom-work",
            idempotency.RequireKey(HttpContext),
            new { organizationId = tenant.Organization.Id, departmentId = tenant.Department.Id, request = normalized },
            async token =>
            {
                // Revalidate selected access inside the write transaction. The initial
                // check also protects idempotent replays after access is withdrawn.
                dbContext.ChangeTracker.Clear();
                var current = await RequireSelectedTenantAsync(normalized.Service, token);
                CustomWorkRequestService.RequireOrganizationAdministrator(current);
                return await service.CreateAsync(current, normalized, token);
            },
            StatusCodes.Status201Created, cancellationToken,
            isolationLevel: IsolationLevel.Serializable);
        return StatusCode(result.StatusCode, result.Response);
    }

    private Task<OrderTenantContext> RequireSelectedTenantAsync(string service, CancellationToken token)
        => service == CrmProductInterests.PSeqKit
            ? requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, token)
            : requestContext.RequireLabServiceTenantAsync(HttpContext, true, token);
}
