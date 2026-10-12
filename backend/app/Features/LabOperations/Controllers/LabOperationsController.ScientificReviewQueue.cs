namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    [HttpGet("scientific-review-queue")]
    public async Task<PhaenoPortal.App.Features.OrderManagement.DTOs.PagedResult<LabScientificReviewQueueItemDto>> ScientificReviewQueue(CancellationToken ct,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor,
            LabRole.ProtocolAdministrator, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        await using var snapshot = dbContext.Database.IsRelational() && dbContext.Database.CurrentTransaction is null
            ? await dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead, ct) : null;
        var pending = LabScientificReviewQueueQuery.PendingPackages(dbContext);
        var eligibleIds = await new LabResultEligibilityReader(dbContext, traceabilityOptions?.Value ?? new())
            .EligiblePackageIdsAsync(pending, true, ct);
        pending = pending.Where(package => eligibleIds.Contains(package.Id));
        var workPage = await Infrastructure.Api.RecordPage.ReadAsync(dbContext.LabWorkOrders.AsNoTracking()
            .Where(work => pending.Any(package => package.LabWorkOrderId == work.Id))
            .OrderByDescending(work => work.UpdatedAt).ThenBy(work => work.Id), page, pageSize, ct);
        var workOrders = workPage.Items;
        var workIds = workOrders.Select(work => work.Id).ToArray();
        var packageCounts = await pending.Where(package => workIds.Contains(package.LabWorkOrderId))
            .GroupBy(package => package.LabWorkOrderId)
            .Select(group => new { WorkId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(row => row.WorkId, row => row.Count, ct);
        var authorizationIds = workOrders.Select(work => work.AuthorizationId).ToArray();
        var authorizations = await dbContext.CommercialLabAuthorizations.AsNoTracking()
            .Where(item => authorizationIds.Contains(item.AuthorizationId)).ToDictionaryAsync(item => item.AuthorizationId, ct);
        var orderIds = authorizations.Values.Select(item => item.CommercialOrderId).ToArray();
        var orders = await dbContext.LabServiceOrders.AsNoTracking()
            .Where(item => orderIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, ct);
        var specimenCounts = await dbContext.LabSpecimens.AsNoTracking().Where(item => workIds.Contains(item.LabWorkOrderId))
            .GroupBy(item => item.LabWorkOrderId).Select(group => new { WorkId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(row => row.WorkId, row => row.Count, ct);
        var exceptionCounts = await dbContext.LabExceptions.AsNoTracking()
            .Where(item => workIds.Contains(item.LabWorkOrderId) && item.Status == LabExceptionStatus.Open)
            .GroupBy(item => item.LabWorkOrderId).Select(group => new { WorkId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(row => row.WorkId, row => row.Count, ct);
        var items = workOrders.Where(work => packageCounts.GetValueOrDefault(work.Id) > 0)
            .Select(work => new LabScientificReviewQueueItemDto(
                MapWorkOrder(work, authorizations, orders, specimenCounts.GetValueOrDefault(work.Id), exceptionCounts.GetValueOrDefault(work.Id)),
                packageCounts[work.Id])).ToList();
        if (snapshot is not null) await snapshot.CommitAsync(ct);
        return new(items, workPage.Page, workPage.PageSize, workPage.TotalCount);
    }
}
