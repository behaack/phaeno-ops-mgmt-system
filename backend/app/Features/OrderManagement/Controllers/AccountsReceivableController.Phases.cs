namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.Accounts.Domain;

public sealed record PhaseBillingJobDto(Guid Id, string OrderNumber, string JobName, string OrganizationName);
public sealed record PhaseBillingJobsDto(IReadOnlyList<PhaseBillingJobDto> Items, bool HasMore);
public sealed record PhaseBillingItemDto(Guid Id, string Name, string Lifecycle, decimal AcceptedSubtotal, decimal InvoicedSubtotal);
public sealed record PhaseBillingPlanDto(Guid OrderId, int Revision, string Currency, IReadOnlyList<PhaseBillingItemDto> Phases);

public sealed partial class AccountsReceivableController
{
    [HttpGet("phase-jobs")]
    public async Task<PhaseBillingJobsDto> PhaseBillingJobs([FromQuery] string? search,
        [FromQuery] Guid? organizationId, [FromQuery] int page = 1, CancellationToken cancellationToken = default)
    {
        await RequireAsync(BusinessRole.BillingOperator, cancellationToken);
        var query = from order in dbContext.LabServiceOrders.AsNoTracking()
                    join organization in dbContext.Organizations on order.OrganizationId equals organization.Id
                    where order.AcceptedQuoteId != null && (!organizationId.HasValue || order.OrganizationId == organizationId)
                    && order.Phases.Any(p => p.SupersededAtUtc == null && p.CancelledAtUtc == null && p.AcceptedSubtotal > 0)
                    select new PhaseBillingJobDto(order.Id, order.OrderNumber, order.CustomerReference, organization.Name);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(j => j.OrderNumber.ToLower().Contains(term) || j.JobName.ToLower().Contains(term)
                || j.OrganizationName.ToLower().Contains(term));
        }
        var items = await query.OrderBy(j => j.OrderNumber).ThenBy(j => j.Id)
            .Skip((Math.Clamp(page, 1, 10000) - 1) * 25).Take(26).ToListAsync(cancellationToken);
        return new(items.Take(25).ToArray(), items.Count > 25);
    }

    [HttpGet("phase-jobs/{orderId:guid}/phases")]
    public async Task<PhaseBillingPlanDto> PhaseBillingPlan(Guid orderId, CancellationToken cancellationToken)
    {
        await RequireAsync(BusinessRole.BillingOperator, cancellationToken);
        if (!await dbContext.LabServiceOrders.AnyAsync(o => o.Id == orderId && o.AcceptedQuoteId != null, cancellationToken))
            throw new OrderManagementException("job_not_found", "An accepted Job was not found.", 404);
        var facts = await new LabPhaseFacts(dbContext).ReadAsync(orderId, cancellationToken);
        return new(orderId, facts.Revision, facts.Currency, facts.Phases
            .Select(p => new PhaseBillingItemDto(p.Id, p.Name, p.Lifecycle, p.AcceptedSubtotal, p.InvoicedSubtotal)).ToArray());
    }
}
