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
[Route("api/platform/orders")]
public sealed class PlatformOrdersController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext) : ControllerBase
{
    [HttpGet]
    public async Task<PagedResult<CommercialOrderListItemDto>> List(
        [FromQuery] string? orderType,
        [FromQuery] Guid? organizationId,
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] Guid? assignedToUserId,
        [FromQuery] bool unassigned = false,
        [FromQuery] bool overdue = false,
        [FromQuery] bool holds = false,
        [FromQuery] bool activeIntake = false,
        [FromQuery] DateTime? updatedFrom = null,
        [FromQuery] DateTime? updatedTo = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var normalizedType = orderType?.Trim();
        var now = DateTime.UtcNow;
        var items = new List<CommercialOrderListItemDto>();

        if (Includes(normalizedType, "PSeqLabService"))
        {
            var query = dbContext.LabServiceOrders.AsNoTracking().Where(item => !item.IsDiscarded);
            if (activeIntake) query = query.Where(item =>
                item.Status == LabServiceOrderStatus.SubmittedForQuote
                || item.Status == LabServiceOrderStatus.ChangesRequested
                || item.Status == LabServiceOrderStatus.QuoteInPreparation
                || item.Status == LabServiceOrderStatus.QuoteIssued);
            if (organizationId.HasValue) query = query.Where(item => item.OrganizationId == organizationId.Value);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(item => item.OrderNumber.Contains(term)
                    || item.CustomerReference.Contains(term)
                    || (item.Description != null && item.Description.Contains(term)));
            }
            if (assignedToUserId.HasValue) query = query.Where(item => item.AssignedToUserId == assignedToUserId.Value);
            if (unassigned) query = query.Where(item => item.AssignedToUserId == null);
            if (holds) query = query.Where(item => item.Status == LabServiceOrderStatus.OnHold);
            if (overdue) query = query.Where(item => item.DueAt != null && item.DueAt < now
                && item.Status != LabServiceOrderStatus.Completed
                && item.Status != LabServiceOrderStatus.Cancelled
                && item.Status != LabServiceOrderStatus.Declined);
            if (updatedFrom.HasValue) query = query.Where(item => item.UpdatedAt >= updatedFrom.Value);
            if (updatedTo.HasValue) query = query.Where(item => item.UpdatedAt < updatedTo.Value);
            items.AddRange(await query.Select(item => new CommercialOrderListItemDto(
                item.Id, "PSeqLabService", item.OrderNumber, item.Status.ToString(), item.CustomerReference,
                item.OrganizationId, item.CreatedAt, item.UpdatedAt, item.Version, item.TenantSafeReason,
                item.AssignedToUserId, item.DueAt, item.DueAt != null && item.DueAt < now
                    && item.Status != LabServiceOrderStatus.Completed
                    && item.Status != LabServiceOrderStatus.Cancelled
                    && item.Status != LabServiceOrderStatus.Declined,
                item.ProposedUnitPrice, item.ProposedUnitPrice == null ? null : "USD")).ToListAsync(cancellationToken));
        }

        if (Includes(normalizedType, "PSeqKit"))
        {
            var query = dbContext.PartnerReagentOrders.AsNoTracking().Where(item => !item.IsDiscarded);
            if (activeIntake) query = query.Where(item =>
                item.Status == ReagentOrderStatus.Placed
                || item.Status == ReagentOrderStatus.UnderReview);
            if (organizationId.HasValue) query = query.Where(item => item.OrganizationId == organizationId.Value);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(item => item.OrderNumber.Contains(term)
                    || (item.PurchaseOrderNumber != null && item.PurchaseOrderNumber.Contains(term))
                    || dbContext.PartnerReagentOrderLines.Any(line => line.PartnerReagentOrderId == item.Id
                        && (line.Description.Contains(term) || line.ExternalItemId.Contains(term))));
            }
            if (assignedToUserId.HasValue) query = query.Where(item => item.AssignedToUserId == assignedToUserId.Value);
            if (unassigned) query = query.Where(item => item.AssignedToUserId == null);
            if (holds) query = query.Where(item => item.Status == ReagentOrderStatus.OnHold);
            if (overdue) query = query.Where(item => item.DueAt != null && item.DueAt < now
                && item.Status != ReagentOrderStatus.Fulfilled
                && item.Status != ReagentOrderStatus.Cancelled
                && item.Status != ReagentOrderStatus.Rejected);
            if (updatedFrom.HasValue) query = query.Where(item => item.UpdatedAt >= updatedFrom.Value);
            if (updatedTo.HasValue) query = query.Where(item => item.UpdatedAt < updatedTo.Value);
            items.AddRange(await query.Select(item => new CommercialOrderListItemDto(
                item.Id, "PSeqKit", item.OrderNumber, item.Status.ToString(), item.PurchaseOrderNumber,
                item.OrganizationId, item.CreatedAt, item.UpdatedAt, item.Version, item.TenantSafeReason,
                item.AssignedToUserId, item.DueAt, item.DueAt != null && item.DueAt < now
                    && item.Status != ReagentOrderStatus.Fulfilled
                    && item.Status != ReagentOrderStatus.Cancelled
                    && item.Status != ReagentOrderStatus.Rejected)).ToListAsync(cancellationToken));
        }

        if (Includes(normalizedType, "DataAssembly"))
        {
            var query = dbContext.DataAssemblyRequests.AsNoTracking().Where(item => !item.IsDiscarded);
            if (activeIntake) query = query.Where(item =>
                item.Status == AssemblyRequestStatus.Submitted
                || item.Status == AssemblyRequestStatus.IntakeValidation
                || item.Status == AssemblyRequestStatus.ChangesRequested
                || item.Status == AssemblyRequestStatus.QuoteInPreparation
                || item.Status == AssemblyRequestStatus.QuoteIssued);
            if (organizationId.HasValue) query = query.Where(item => item.OrganizationId == organizationId.Value);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(item => item.RequestNumber.Contains(term)
                    || item.ProjectReference.Contains(term)
                    || (item.PurchaseOrderNumber != null && item.PurchaseOrderNumber.Contains(term))
                    || item.ProfileNameSnapshot.Contains(term));
            }
            if (assignedToUserId.HasValue) query = query.Where(item => item.AssignedToUserId == assignedToUserId.Value);
            if (unassigned) query = query.Where(item => item.AssignedToUserId == null);
            if (holds) query = query.Where(item => item.Status == AssemblyRequestStatus.OnHold);
            if (overdue) query = query.Where(item => item.DueAt != null && item.DueAt < now
                && item.Status != AssemblyRequestStatus.Completed
                && item.Status != AssemblyRequestStatus.Cancelled
                && item.Status != AssemblyRequestStatus.Rejected);
            if (updatedFrom.HasValue) query = query.Where(item => item.UpdatedAt >= updatedFrom.Value);
            if (updatedTo.HasValue) query = query.Where(item => item.UpdatedAt < updatedTo.Value);
            items.AddRange(await query.Select(item => new CommercialOrderListItemDto(
                item.Id, "DataAssembly", item.RequestNumber, item.Status.ToString(), item.ProjectReference,
                item.OrganizationId, item.CreatedAt, item.UpdatedAt, item.Version, item.TenantSafeReason,
                item.AssignedToUserId, item.DueAt, item.DueAt != null && item.DueAt < now
                    && item.Status != AssemblyRequestStatus.Completed
                    && item.Status != AssemblyRequestStatus.Cancelled
                    && item.Status != AssemblyRequestStatus.Rejected)).ToListAsync(cancellationToken));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            items = items.Where(item => string.Equals(item.Status, status.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
        }

        var ordered = items.OrderByDescending(item => item.UpdatedAt).ToList();
        return new PagedResult<CommercialOrderListItemDto>(
            ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList(),
            page,
            pageSize,
            ordered.Count);
    }

    private static bool Includes(string? requestedType, string candidate) =>
        string.IsNullOrWhiteSpace(requestedType)
        || string.Equals(requestedType, candidate, StringComparison.OrdinalIgnoreCase);
}
