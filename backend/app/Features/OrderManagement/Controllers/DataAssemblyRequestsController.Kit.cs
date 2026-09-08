namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class DataAssemblyRequestsController
{
    [HttpPost("~/api/reagent-orders/{orderId:guid}/assembly-cases/{caseId:guid}/request")]
    public async Task<DataAssemblyRequestDto> PrepareIncludedCase(Guid orderId, Guid caseId,
        [FromBody] KitAssemblyStartRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        // Perform ownership admission before idempotency replay as well as
        // within the mutation, without changing already issued request keys.
        if (!await dbContext.KitAssemblyCases.AsNoTracking().AnyAsync(x => x.Id == caseId
            && x.PartnerReagentOrderId == orderId && x.OrganizationId == tenant.Organization.Id
            && x.DepartmentId == tenant.Department.Id, cancellationToken)) throw Missing();
        var execution = await idempotency.ExecuteAsync(tenant.Actor.Id, $"kit-case:{caseId}:prepare", idempotency.RequireKey(HttpContext), request,
            async token =>
            {
                var included = await dbContext.KitAssemblyCases.Include(x => x.History).SingleOrDefaultAsync(x => x.Id == caseId
                    && x.PartnerReagentOrderId == orderId && x.OrganizationId == tenant.Organization.Id && x.DepartmentId == tenant.Department.Id, token) ?? throw Missing();
                EnsureVersion(included.Version, request.Version);
                var parent = await dbContext.PartnerReagentOrders.SingleAsync(x => x.Id == orderId && x.IsKitBundle, token);
                var profile = KitBundleService.FrozenProfileDto(included.ProfileSnapshotJson);
                var item = new DataAssemblyRequest(tenant.Organization.Id, tenant.Department.Id, OrderNumberGenerator.Assembly(), request.ProjectReference,
                    profile.Id, profile.ProfileVersion, profile.Name, profile.Instructions, request.MetadataJson,
                    $"Included outputs for {profile.Name}", request.ProcessingNotes, request.ProhibitedDataConfirmed);
                Execute(() => included.AttachRequest(item.Id, tenant.Actor.Id, DateTime.UtcNow));
                KitBundleService.TrackNewHistory(dbContext, included);
                Execute(() => item.LinkIncludedCase(included.Id, included.ProfileSnapshotJson, parent.PurchaseOrderNumber!, parent.PlacedAt!.Value));
                dbContext.DataAssemblyRequests.Add(item);
                Event(item, "Created", item.Status.ToString(), tenant.Actor.Id);
                await dbContext.SaveChangesAsync(token);
                return await MapAsync(item, true, false, token);
            }, StatusCodes.Status201Created, cancellationToken, concurrencyScope: $"kit-case:{caseId}", isolationLevel: System.Data.IsolationLevel.Serializable);
        Response.StatusCode = execution.StatusCode;
        return execution.Response;
    }

    private async Task<KitAssemblyCase?> RequireEditableIncludedCaseAsync(DataAssemblyRequest item, CancellationToken token)
    {
        if (!item.KitAssemblyCaseId.HasValue) return null;
        var included = await dbContext.KitAssemblyCases.Include(x => x.History).SingleAsync(x => x.Id == item.KitAssemblyCaseId
            && x.OrganizationId == item.OrganizationId && x.DepartmentId == item.DepartmentId && x.AssemblyRequestId == item.Id, token);
        if (included.IsTerminal || (!included.FirstSubmittedAt.HasValue && !included.CanPrepareAt(DateTime.UtcNow)))
            throw Conflict("included_case_unavailable", "This included Assembly case is closed or past its submission deadline. Ask Phaeno to review an extension before changing inputs.");
        return included;
    }
}
