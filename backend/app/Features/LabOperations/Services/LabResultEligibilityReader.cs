namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;

/// <summary>Uses the command's evidence boundary inside the caller's read snapshot, without locks, audit stamps or writes.</summary>
public sealed class LabResultEligibilityReader(PSeqOperationsDbContext db, PSeqOrderToCashOptions policy)
{
    public async Task<Guid[]> EligiblePackageIdsAsync(IQueryable<ResultOutputPackage> candidates, bool scientificReview, CancellationToken token)
    {
        // Cheap command-equivalent prerequisites reject incomplete candidates in SQL;
        // full scientific validation still owns every remaining candidate.
        candidates = candidates.Where(package => !package.TraceabilityRequired && !policy.RequireResultTraceability && !policy.RequireScientificEvidence
            || package.LabAnalysisRunId.HasValue && db.LabAnalysisRuns.Any(run => run.Id == package.LabAnalysisRunId
                && (!policy.RequireScientificEvidence || run.RequirementsSnapshotJson != null))
                && db.ResultArtifacts.Count(artifact => artifact.ResultOutputPackageId == package.Id) == package.ExpectedArtifactCount);
        if (scientificReview) candidates = candidates.Where(package => db.LabWorkOrders.Any(work => work.Id == package.LabWorkOrderId
                && (work.Status == PSeq.Operations.Laboratory.Domain.LabWorkOrderStatus.ScientificReview
                    || policy.GovernedPSeqResults && work.Status == PSeq.Operations.Laboratory.Domain.LabWorkOrderStatus.ReadyForRelease))
            && !db.LabExceptions.Any(issue => issue.LabWorkOrderId == package.LabWorkOrderId
                && issue.Status == PSeq.Operations.Laboratory.Domain.LabExceptionStatus.Open && issue.IsBlocking)
            && !db.LabProtocolExecutions.Any(execution => execution.LabWorkOrderId == package.LabWorkOrderId
                && execution.Status != PSeq.Operations.Laboratory.Domain.LabExecutionStatus.Completed
                && execution.Status != PSeq.Operations.Laboratory.Domain.LabExecutionStatus.Abandoned));
        var packages = await candidates.AsNoTracking().ToListAsync(token);
        if (packages.Count == 0) return [];
        var workIds = packages.Select(p => p.LabWorkOrderId).Distinct().ToArray();
        var works = await db.LabWorkOrders.AsNoTracking().Where(w => workIds.Contains(w.Id)).ToDictionaryAsync(w => w.Id, token);
        var specimens = scientificReview
            ? (await db.LabSpecimens.AsNoTracking().Where(s => workIds.Contains(s.LabWorkOrderId)).ToListAsync(token)).ToLookup(s => s.LabWorkOrderId)
            : null;
        var lineage = LabResultLineageService.ForReadOnlyAssessment(db);
        var eligible = new List<Guid>();
        foreach (var package in packages)
        {
            var workId = package.LabWorkOrderId;
            if (scientificReview && works.TryGetValue(workId, out var work)
                && work.TubeUsePolicyKey is not null && (!LabSpecimenReviewReadiness.IsReady(specimens![workId])
                    || !LabSpecimenReviewReadiness.IsReady(specimens[workId], package.LabSampleId ?? package.TrialSampleId))) continue;
            try
            {
                await lineage.RequirePackageAsync(package, token, policy);
                eligible.Add(package.Id);
            }
            catch (OrderManagementException) { /* Domain prerequisites are outstanding; database/transport faults still fail the read. */ }
        }
        return eligible.ToArray();
    }
}
