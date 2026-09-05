namespace PhaenoPortal.App.Features.Trials.Services;

using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Trials.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

// The shared operator paths keep their own authorization. This filter serializes Trial
// scientific/shipping mutations with scope and hold changes using the parent row.
public sealed class TrialWorkGuard(PSeqOperationsDbContext db, OrderRequestContext context) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext action, ActionExecutionDelegate next)
    {
        if (HttpMethods.IsGet(action.HttpContext.Request.Method)) { await next(); return; }
        var token = action.HttpContext.RequestAborted;
        Guid? Id(string name) => action.ActionArguments.TryGetValue(name, out var value) && value is Guid id ? id : null;
        Guid? RequestId(string name) => action.ActionArguments.TryGetValue("request", out var value) && value?.GetType().GetProperty(name)?.GetValue(value) is Guid id ? id : null;
        var workIds = new HashSet<Guid>();
        if ((Id("workOrderId") ?? RequestId("LabWorkOrderId")) is Guid workId) workIds.Add(workId);
        if (Id("executionId") is Guid executionId)
            workIds.UnionWith(await db.LabProtocolExecutions.Where(value => value.Id == executionId).Select(value => value.LabWorkOrderId).ToListAsync(token));
        if ((Id("libraryId") ?? RequestId("LabLibraryId")) is Guid libraryId)
            workIds.UnionWith(await db.LabLibraries.Where(value => value.Id == libraryId).Select(value => value.LabWorkOrderId).ToListAsync(token));
        if (Id("containerId") is Guid containerId)
            workIds.UnionWith(await db.LabContainers.Where(value => value.Id == containerId).Select(value => value.LabWorkOrderId).ToListAsync(token));
        if (Id("exceptionId") is Guid exceptionId)
            workIds.UnionWith(await db.LabExceptions.Where(value => value.Id == exceptionId).Select(value => value.LabWorkOrderId).ToListAsync(token));
        var batchId = Id("batchId");
        if (Id("sendoutId") is Guid sendoutId) batchId = await db.LabNgsSendouts.Where(value => value.Id == sendoutId).Select(value => (Guid?)value.LabOperationalBatchId).SingleOrDefaultAsync(token);
        if (batchId.HasValue) workIds.UnionWith(await db.LabBatchMembers.Where(value => value.LabOperationalBatchId == batchId).Select(value => value.LabWorkOrderId).ToListAsync(token));
        var trialIds = (await db.LabWorkOrders.Where(value => workIds.Contains(value.Id) && value.AuthorizationSource == LabAuthorizationSource.TrialProject)
            .Select(value => value.AuthorizationSourceId).ToListAsync(token)).ToHashSet();
        var shipmentId = Id("shipmentId");
        if (Id("kitId") is Guid kitId) shipmentId = await db.SampleReturnKits.Where(value => value.Id == kitId).Select(value => (Guid?)value.SampleShipmentId).SingleOrDefaultAsync(token);
        if (shipmentId.HasValue) trialIds.UnionWith(await db.SampleShipments.Where(value => value.Id == shipmentId && value.AuthorizationSource == SampleShipmentAuthorizationSource.ProspectTrialProject).Select(value => value.AuthorizationSourceId).ToListAsync(token));
        if (Id("packageId") is Guid packageId) trialIds.UnionWith(await db.ResultOutputPackages.Where(value => value.Id == packageId && value.TrialProjectId != null).Select(value => value.TrialProjectId!.Value).ToListAsync(token));
        if (RequestId("TrialProjectId") is Guid requestedTrial) trialIds.Add(requestedTrial);
        if (trialIds.Count == 0) { await next(); return; }
        var path = action.HttpContext.Request.Path.Value ?? "";
        var custodyOnly = path.EndsWith("/receipt") || path.EndsWith("/custody-events") || path.EndsWith("/label-print") || path.EndsWith("/exceptions") || path.Contains("/exceptions/");
        var resultOnly = path.Contains("/pseq-results/") || path.EndsWith("/scientific-approval");
        await using var transaction = db.Database.CurrentTransaction is null ? await db.Database.BeginTransactionAsync(token) : null;
        var parents = new List<TrialProject>();
        foreach (var id in trialIds.Order())
        {
            await LockAsync(id, token);
            var trial = await db.TrialProjects.AsNoTracking().SingleOrDefaultAsync(value => value.Id == id, token);
            if (trial is not null) parents.Add(trial);
        }
        var result = await next();
        if (result.Exception is not null) return;
        // Controller authorization runs before policy failures become observable.
        // Every write remains in this transaction and rolls back if a parent is held.
        foreach (var trial in parents)
        {
            if (!custodyOnly && (trial.IsOnHold || trial.IsTerminal && !(resultOnly && trial.Status == TrialStatus.Completed)
                || trial.ApprovedScopeRevision != trial.CurrentScopeRevision || trial.AcceptedScopeRevision != trial.ApprovedScopeRevision))
                throw TrialAccess.Error("trial_work_unavailable", "Trial scientific work and shipping require current approval and acceptance without a hold or terminal closure.", 409);
            if (path.StartsWith("/api/sample-shipping/", StringComparison.Ordinal))
            {
                var tenant = await context.RequireSampleShippingTenantAsync(action.HttpContext, true, token);
                if (!tenant.Membership.IsOrganizationAdmin || trial.OrganizationId != tenant.Organization.Id || trial.DepartmentId != tenant.Department.Id)
                    throw TrialAccess.Error("trial_shipping_admin_required", "The Trial organization's administrator must prepare its shipment.", 403);
            }
        }
        if (transaction is not null) await transaction.CommitAsync(token);
    }

    private async Task LockAsync(Guid id, CancellationToken token)
    {
        if (!db.Database.IsNpgsql()) return;
        var entity = db.Model.FindEntityType(typeof(TrialProject))!;
        var table = $"\"{entity.GetSchema()!.Replace("\"", "\"\"")}\".\"{entity.GetTableName()!.Replace("\"", "\"\"")}\"";
#pragma warning disable EF1002
        await db.Database.ExecuteSqlRawAsync($"SELECT id FROM {table} WHERE id = {{0}} FOR SHARE", [id], token);
#pragma warning restore EF1002
    }
}
