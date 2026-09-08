namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class PlatformReagentOrdersController
{
    [HttpPost("{orderId:guid}/assembly-cases/{caseId:guid}/extend")]
    public Task<PartnerReagentOrderDto> ExtendIncludedCase(Guid orderId, Guid caseId, [FromBody] KitCaseExtensionRequest request, CancellationToken token)
        => ChangeCaseAsync(orderId, caseId, request.Version, "extend", request, (included, actor, _) =>
        { Execute(() => included.Extend(request.SubmissionDeadlineAt, request.Reason, actor, DateTime.UtcNow)); return Task.CompletedTask; }, token);

    [HttpPost("{orderId:guid}/assembly-cases/{caseId:guid}/cancel")]
    public Task<PartnerReagentOrderDto> CancelIncludedCase(Guid orderId, Guid caseId, [FromBody] KitCaseCancelRequest request, CancellationToken token)
        => ChangeCaseAsync(orderId, caseId, request.Version, "cancel", request, (included, actor, _) =>
        {
            if (included.FirstSubmittedAt.HasValue) throw Conflict("included_case_submitted", "Use the Assembly request cancellation workflow for submitted work.");
            Execute(() => included.Cancel(request.Reason, actor, DateTime.UtcNow)); return Task.CompletedTask;
        }, token);

    [HttpPost("{orderId:guid}/assembly-cases/{caseId:guid}/replace")]
    public Task<PartnerReagentOrderDto> ReplaceKit(Guid orderId, Guid caseId, [FromBody] KitReplacementRequest request, CancellationToken token)
        => ChangeCaseAsync(orderId, caseId, request.Version, "replace", request, async (included, actor, operationToken) =>
        {
            var original = await dbContext.PartnerKitUnits.SingleAsync(x => x.Id == included.CurrentKitUnitId, operationToken);
            var replacement = new PartnerKitUnit(orderId, original.PartnerReagentOrderLineId, included.OrganizationId, included.DepartmentId,
                $"{original.Label.Split("-R")[0]}-R{Guid.NewGuid():N}", original.Id);
            Execute(() => replacement.Ship(null, request.ShippedAt, request.ExpiresAt, request.LotBatchNumber, request.Carrier, request.TrackingNumber));
            Execute(() => original.Replace(replacement.Id));
            Execute(() => included.Transfer(replacement, request.Reason, actor, DateTime.UtcNow));
            dbContext.PartnerKitUnits.Add(replacement);
        }, token);

    private async Task<PartnerReagentOrderDto> ChangeCaseAsync<T>(Guid orderId, Guid caseId, long version, string action, T request,
        Func<KitAssemblyCase, Guid, CancellationToken, Task> change, CancellationToken token) where T : notnull
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, token);
        var execution = await idempotency.ExecuteAsync(actor.Id, $"kit-case:{caseId}:{action}", idempotency.RequireKey(HttpContext), request,
            async operationToken =>
            {
                var parent = await ReadAsync(orderId, operationToken);
                var included = await dbContext.KitAssemblyCases.Include(x => x.History).SingleOrDefaultAsync(x => x.Id == caseId && x.PartnerReagentOrderId == orderId, operationToken) ?? throw Missing();
                EnsureVersion(included.Version, version);
                await change(included, actor.Id, operationToken);
                KitBundleService.TrackNewHistory(dbContext, included);
                await new KitBundleService(dbContext).RefreshOrderCompletionAsync(orderId, operationToken);
                await dbContext.SaveChangesAsync(operationToken);
                return await MapAsync(parent, operationToken);
            }, cancellationToken: token, concurrencyScope: $"kit-case:{caseId}", isolationLevel: System.Data.IsolationLevel.Serializable);
        return execution.Response;
    }
}
