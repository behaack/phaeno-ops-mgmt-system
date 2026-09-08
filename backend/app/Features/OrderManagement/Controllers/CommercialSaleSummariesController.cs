namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record CommercialSaleSummaryDto(Guid Id, string WorkflowType, Guid OrderId, Guid OrganizationId,
    string ProductSummary, decimal Quantity, decimal Total, string Currency, DateTime CommittedAtUtc,
    DateTime? ExpectedCompletionAtUtc, string ScheduleHealth, string ProjectionStatus, string? FailureCode, long Version);

[ApiController]
[Authorize]
[Route("api/platform/commercial-sale-summaries")]
public sealed class CommercialSaleSummariesController(PSeqOperationsDbContext dbContext, OrderRequestContext requestContext) : ControllerBase
{
    [HttpGet]
    public async Task<PagedResult<CommercialSaleSummaryDto>> List([FromQuery] bool needsAttention = false,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25, CancellationToken cancellationToken = default)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.CommercialSaleSummaries.AsNoTracking().AsQueryable();
        if (needsAttention) query = query.Where(value => value.ProjectedRevision < value.Revision && value.FailureCode != null);
        var count = await query.CountAsync(cancellationToken);
        var rows = await query.OrderByDescending(value => value.UpdatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return new(rows.Select(Map).ToList(), page, pageSize, count);
    }
    [HttpPost("{id:guid}/retry")]
    public async Task<CommercialSaleSummaryDto> Retry(Guid id, [FromBody] VersionRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var row = await dbContext.CommercialSaleSummaries.SingleOrDefaultAsync(value => value.Id == id, cancellationToken)
            ?? throw new OrderManagementException("sale_summary_not_found", "The commercial summary was not found.", StatusCodes.Status404NotFound);
        if (row.Version != request.Version) throw new DbUpdateConcurrencyException();
        if (row.ProjectedRevision == row.Revision)
            throw new OrderManagementException("sale_summary_already_published", "This summary is already published.", StatusCodes.Status409Conflict);
        row.Retry(DateTime.UtcNow); await dbContext.SaveChangesAsync(cancellationToken); return Map(row);
    }
    private static CommercialSaleSummaryDto Map(CommercialSaleSummary value) => new(value.Id, value.WorkflowType, value.OrderId,
        value.OrganizationId, value.ProductSummary, value.Quantity, value.Total, value.Currency, value.CommittedAtUtc,
        value.ExpectedCompletionAtUtc, value.CurrentScheduleHealth(DateTime.UtcNow), value.ProjectedRevision == value.Revision ? "Published"
            : value.FailureCode is not null ? "NeedsAttention" : "Pending", value.FailureCode, value.Version);
}
