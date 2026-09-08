namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabOperationsController
{
    [HttpPost("/api/platform/lab-service-orders/{orderId:guid}/timing")]
    public async Task<LabServiceTimingDto> OverrideOrderTiming(Guid orderId, [FromBody] LabServiceTimingOverrideRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken, LabRole.Operator, LabRole.Supervisor);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var order = await dbContext.LabServiceOrders.AsNoTracking().SingleOrDefaultAsync(value => value.Id == orderId && !value.IsDiscarded, cancellationToken)
            ?? throw Missing();
        var work = await dbContext.LabWorkOrders.Include(value => value.Specimens).SingleOrDefaultAsync(value =>
            value.AuthorizationSource == LabAuthorizationSource.CommercialOrder && value.AuthorizationSourceId == order.Id
            && value.SubmittingOrganizationId == order.OrganizationId, cancellationToken) ?? throw Missing();
        EnsureVersion(work.Version, request.Version);
        var previous = work.ExpectedCompletionAtUtc ?? throw Conflict("timing_not_started", "The quoted turnaround begins after specimen acceptance.");
        var now = DateTime.UtcNow;
        OrderNotification? notification = null;
        if (request.ExpectedCompletionAtUtc > previous)
        {
            notification = new OrderNotification(order.OrganizationId, order.CreatedByUserId, OrderWorkflowTypes.LabService,
                order.Id, "lab-timing-delayed", "Laboratory expected completion changed",
                $"{order.OrderNumber} is now expected by {request.ExpectedCompletionAtUtc:yyyy-MM-dd}. {request.Reason}. {request.CustomerSafeNote?.Trim()}", order.DepartmentId);
        }
        LabWorkTimingChange? change = null;
        Execute(() => {
            change = new LabWorkTimingChange(work.Id, previous, request.ExpectedCompletionAtUtc, request.Reason,
                request.CustomerSafeNote, request.InternalNote, actor.User.Id, now, notification?.Id);
            work.OverrideExpectedCompletion(request.ExpectedCompletionAtUtc);
        });
        dbContext.Add(change!);
        if (notification is not null) dbContext.OrderNotifications.Add(notification);
        await EmitProjectionAsync(work, actor.User.Id, "ExpectedCompletionChanged", cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return (await new LabServiceTimingService(dbContext).ReadAsync(order.Id, order.OrganizationId, true, true, cancellationToken))!;
    }
}
