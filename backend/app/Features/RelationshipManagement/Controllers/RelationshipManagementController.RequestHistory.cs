namespace PhaenoPortal.App.Features.RelationshipManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Relationships.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.RelationshipManagement.DTOs;

public sealed partial class RelationshipManagementController
{
    [HttpGet("requests/history")]
    public async Task<PagedResult<PortalIntegrationRequestDto>> ListRequestHistory(
        [FromQuery] string? search,
        [FromQuery] Guid? requestId,
        CancellationToken cancellationToken,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.PortalIntegrationRequests.AsNoTracking()
            .Where(value => value.Source == PortalIntegrationRequestSource.FirstPartyCrm
                && value.Status != PortalIntegrationRequestStatus.PendingReview
                && value.Status != PortalIntegrationRequestStatus.Approved);
        if (requestId.HasValue)
        {
            query = query.Where(value => value.Id == requestId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(value => value.CandidateOrganizationName.ToLower().Contains(term)
                || value.RequestNumber.ToLower().Contains(term)
                || value.Summary.ToLower().Contains(term)
                || (value.DecisionReason != null && value.DecisionReason.ToLower().Contains(term))
                || (value.ApplicationNotes != null && value.ApplicationNotes.ToLower().Contains(term)));
        }
        var totalCount = await query.CountAsync(cancellationToken);
        page = Math.Clamp(page, 1, Math.Max(1, (int)Math.Ceiling(totalCount / (double)pageSize)));
        var values = await query.Include(value => value.RequestedServices)
            .OrderByDescending(value => value.UpdatedAt).ThenByDescending(value => value.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        var ids = values.Select(value => value.Id).ToList();
        var companyIds = await dbContext.CrmHandoffs.AsNoTracking()
            .Where(value => ids.Contains(value.RelationshipRequestId))
            .ToDictionaryAsync(value => value.RelationshipRequestId, value => value.CompanyId, cancellationToken);
        return new PagedResult<PortalIntegrationRequestDto>(
            values.Select(value => ToDto(value, companyIds.GetValueOrDefault(value.Id))).ToList(),
            page, pageSize, totalCount);
    }
}
