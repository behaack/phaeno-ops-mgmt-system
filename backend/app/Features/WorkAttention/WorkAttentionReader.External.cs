namespace PhaenoPortal.App.Features.WorkAttention;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Trials.Domain;
using PSeq.Operations.Commercial.DataProvisioning.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class WorkAttentionReader
{
    public async Task<IReadOnlyList<WorkItem>> ReadExternalUpdatesAsync(CancellationToken token)
    {
        var organizationId = session.SelectedOrganization!.OrganizationId;
        var departmentId = session.SelectedDepartment!.DepartmentId;
        var updates = new List<WorkItem>();
        if (Caps.CanDownloadLabResults)
        {
            // Use the same complete-transfer/commit/retention projection as Customer home.
            var packages = await new CustomerLabDashboardService(db).NewResultsAsync(organizationId, departmentId, token);
            var orderIds = packages.Where(package => package.LabServiceOrderId.HasValue).Select(package => package.LabServiceOrderId!.Value).Distinct().ToArray();
            var names = await db.LabServiceOrders.AsNoTracking().Where(order => orderIds.Contains(order.Id) && order.OrganizationId == organizationId && order.DepartmentId == departmentId)
                .ToDictionaryAsync(order => order.Id, order => order.OrderNumber, token);
            updates.AddRange(packages.Select(package => new WorkItem { SourceId = package.Id, TargetId = package.LabServiceOrderId, SourceType = "AvailableResult", Domain = "scientific",
                MessageKey = "results.available", RecordLabel = names.GetValueOrDefault(package.LabServiceOrderId!.Value, "Released results"), Destination = "/lab-services/", Kind = "update", CreatedAtUtc = package.CreatedAt, Priority = 4 }));
        }
        if (Caps.CanViewOrganizationDatasets)
            updates.AddRange(await db.OrganizationDatasetGrants.AsNoTracking().Where(grant => grant.OrganizationId == organizationId && (grant.DepartmentId == null || grant.DepartmentId == departmentId)
                && grant.Status == OrganizationDatasetGrantStatus.Active && (grant.CuratedDatasetVersion.Status == CuratedDatasetVersionStatus.Published || grant.CuratedDatasetVersion.Status == CuratedDatasetVersionStatus.Retired))
                .Select(grant => new WorkItem { SourceId = grant.Id, TargetId = grant.CuratedDatasetId, SourceType = "CuratedData", Domain = "data", MessageKey = "data.available",
                    RecordLabel = "Curated data assignment", Destination = "/data-library/", Kind = "update", CreatedAtUtc = grant.GrantedAt, Priority = 4 }).ToListAsync(token));
        return updates;
    }

    private void AddExternal(List<IQueryable<WorkItem>> queries)
    {
        var organizationId = session.SelectedOrganization!.OrganizationId;
        var departmentId = session.SelectedDepartment!.DepartmentId;
        if (Caps.CanViewLabServiceOrders)
        {
            var orders = db.LabServiceOrders.AsNoTracking().Where(order => order.OrganizationId == organizationId && order.DepartmentId == departmentId && !order.IsDiscarded && order.CommercialDraftJson == null);
            queries.Add(orders.Where(order => order.Status == LabServiceOrderStatus.DraftRequest || order.Status == LabServiceOrderStatus.ChangesRequested || order.Status == LabServiceOrderStatus.QuoteIssued)
                .Select(order => new WorkItem { SourceId = order.Id, SourceType = "LabOrder", Domain = "commercial", RecordLabel = order.OrderNumber, Destination = "/lab-services/",
                    MessageKey = order.Status == LabServiceOrderStatus.QuoteIssued ? "orders.quote" : order.Status == LabServiceOrderStatus.ChangesRequested ? "orders.correct" : "orders.complete",
                    Kind = order.Status == LabServiceOrderStatus.QuoteIssued ? Caps.CanAcceptLabServiceQuotes ? "action" : "waiting" : Caps.CanSubmitLabServiceRequests ? "action" : "waiting", CreatedAtUtc = order.CreatedAt, TargetId = (Guid?)null, OwnerUserId = (Guid?)null, DueAtUtc = (DateTime?)null, Priority = 3 }));
            queries.Add(orders.Where(order => order.Status == LabServiceOrderStatus.OnHold || order.Status == LabServiceOrderStatus.SubmittedForQuote || order.Status == LabServiceOrderStatus.QuoteInPreparation
                    || order.Status == LabServiceOrderStatus.InProgress).Select(order => new WorkItem { SourceId = order.Id, SourceType = "LabWaiting", Domain = "commercial", MessageKey = "orders.waiting",
                    RecordLabel = order.OrderNumber, Destination = "/lab-services/", Kind = "waiting", CreatedAtUtc = order.CreatedAt, TargetId = (Guid?)null, OwnerUserId = (Guid?)null, DueAtUtc = (DateTime?)null, Priority = 3 }));
        }
        if (Caps.CanViewReagentOrders)
            queries.Add(db.PartnerReagentOrders.AsNoTracking().Where(order => order.OrganizationId == organizationId && order.DepartmentId == departmentId && !order.IsDiscarded && order.Status == ReagentOrderStatus.Draft)
                .Select(order => new WorkItem { SourceId = order.Id, SourceType = "KitOrder", Domain = "commercial", MessageKey = "kits.complete", RecordLabel = order.OrderNumber,
                    Destination = "/reagent-orders/", Kind = Caps.CanPlaceReagentOrders ? "action" : "waiting", CreatedAtUtc = order.CreatedAt, TargetId = (Guid?)null, OwnerUserId = (Guid?)null, DueAtUtc = (DateTime?)null, Priority = 3 }));
    }

    // Scope/phase rules depend on authoritative domain methods, including JSON scope
    // values. Evaluate every scoped candidate before counting or paging; no list cap.
    public async Task<IReadOnlyList<WorkItem>> ReadExternalDomainActionsAsync(CancellationToken token)
    {
        var organizationId = session.SelectedOrganization!.OrganizationId;
        var departmentId = session.SelectedDepartment!.DepartmentId;
        var items = new List<WorkItem>();
        if (Caps.CanViewLabServiceOrders) items.AddRange(await ReadExternalShippingAsync(token));
        if (Caps.CanViewTrialProjects)
        {
            var trials = await db.TrialProjects.AsNoTracking().AsSplitQuery().Include(trial => trial.Scopes).Include(trial => trial.Samples)
                .Where(trial => trial.OrganizationId == organizationId && trial.DepartmentId == departmentId && !trial.IsOnHold
                    && (trial.Status == TrialStatus.AwaitingAcceptance || trial.Status == TrialStatus.AwaitingSamples || trial.Status == TrialStatus.InProgress)).ToArrayAsync(token);
            var trialIds = trials.Select(trial => trial.Id).ToArray();
            var replacementIds = (await db.TrialReplacementAuthorizations.AsNoTracking().Where(value => trialIds.Contains(value.TrialProjectId)
                && !value.UsedBySampleId.HasValue).Select(value => value.TrialProjectId).Distinct().ToArrayAsync(token)).ToHashSet();
            var prospect = session.Memberships.Single(membership => membership.OrganizationId == organizationId).OrganizationKind == OrganizationKind.Prospect;
            foreach (var trial in trials)
            {
                if (trial.ApprovedScopeRevision != trial.CurrentScopeRevision) continue;
                var scope = trial.Scopes.SingleOrDefault(scope => scope.Revision == trial.ApprovedScopeRevision)?.Read();
                if (scope is null) continue;
                var accepting = trial.Status == TrialStatus.AwaitingAcceptance;
                var remaining = scope.SampleAllowance - trial.Samples.Count(sample => !sample.ReplacesSampleId.HasValue);
                var replacement = replacementIds.Contains(trial.Id);
                if (!accepting && (trial.SubmissionBlocker(now) != null || remaining <= 0 && !replacement)) continue;
                items.Add(new WorkItem { SourceId = trial.Id, SourceType = "Trial", Domain = "commercial", MessageKey = accepting ? "trials.accept" : "trials.samples",
                    RecordLabel = trial.Number, Destination = "/order-operations/lab-services/trials/", Kind = prospect && session.SelectedDepartment.IsDepartmentAdmin ? "action" : "waiting",
                    DueAtUtc = scope.SubmissionClosesAtUtc, CreatedAtUtc = trial.CreatedAt, Priority = 3 });
            }
        }
        return items;
    }
}
