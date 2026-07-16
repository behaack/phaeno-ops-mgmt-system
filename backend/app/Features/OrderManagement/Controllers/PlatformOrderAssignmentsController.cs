namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/platform/order-assignments")]
public sealed class PlatformOrderAssignmentsController(PSeqOperationsDbContext dbContext, OrderRequestContext requestContext) : ControllerBase
{
    [HttpPut("{workflow}/{recordId:guid}")]
    public async Task<OperationalAssignmentDto> Update(string workflow, Guid recordId,
        [FromBody] OperationalAssignmentRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        Guid? assignedToUserId = request.AssignToMe ? actor.Id : null;
        switch (workflow.ToLowerInvariant())
        {
            case "lab":
            {
                var order = await dbContext.LabServiceOrders.FirstOrDefaultAsync(item => item.Id == recordId && !item.IsDiscarded, cancellationToken) ?? throw Missing();
                EnsureVersion(order.Version, request.Version);
                order.Assign(assignedToUserId, request.DueAt);
                Event(order.OrganizationId, OrderWorkflowTypes.LabService, order.Id, order.Status.ToString(), actor.Id, request.AssignToMe);
                await dbContext.SaveChangesAsync(cancellationToken);
                return new OperationalAssignmentDto("lab", order.Id, order.AssignedToUserId, order.DueAt, order.Version);
            }
            case "reagent":
            {
                var order = await dbContext.PartnerReagentOrders.FirstOrDefaultAsync(item => item.Id == recordId && !item.IsDiscarded, cancellationToken) ?? throw Missing();
                EnsureVersion(order.Version, request.Version);
                order.Assign(assignedToUserId, request.DueAt);
                Event(order.OrganizationId, OrderWorkflowTypes.Reagent, order.Id, order.Status.ToString(), actor.Id, request.AssignToMe);
                await dbContext.SaveChangesAsync(cancellationToken);
                return new OperationalAssignmentDto("reagent", order.Id, order.AssignedToUserId, order.DueAt, order.Version);
            }
            case "assembly":
            {
                var item = await dbContext.DataAssemblyRequests.FirstOrDefaultAsync(value => value.Id == recordId && !value.IsDiscarded, cancellationToken) ?? throw Missing();
                EnsureVersion(item.Version, request.Version);
                item.Assign(assignedToUserId, request.DueAt);
                Event(item.OrganizationId, OrderWorkflowTypes.DataAssembly, item.Id, item.Status.ToString(), actor.Id, request.AssignToMe);
                await dbContext.SaveChangesAsync(cancellationToken);
                return new OperationalAssignmentDto("assembly", item.Id, item.AssignedToUserId, item.DueAt, item.Version);
            }
            default:
                throw new OrderManagementException("workflow_invalid", "Select a supported operational workflow.");
        }
    }

    private void Event(Guid organizationId, string workflowType, Guid recordId, string status, Guid actorId, bool assigned)
        => dbContext.OrderStatusEvents.Add(new OrderStatusEvent(organizationId, workflowType, recordId, null, status, status,
            assigned ? "Assigned to the acting Phaeno operator." : "Operational assignment cleared.", null, actorId, DateTime.UtcNow));

    private static void EnsureVersion(long current, long supplied)
    {
        if (current != supplied) throw new DbUpdateConcurrencyException();
    }

    private static OrderManagementException Missing() => new("operational_order_not_found",
        "The requested operational record was not found.", StatusCodes.Status404NotFound);
}
