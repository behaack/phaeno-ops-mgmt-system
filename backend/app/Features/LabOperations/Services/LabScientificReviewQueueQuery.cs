namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

/// <summary>Pending scientific review is based on exact assembly/package/QC evidence, not job stage.</summary>
public static class LabScientificReviewQueueQuery
{
    public static IQueryable<ResultOutputPackage> PendingPackages(PSeqOperationsDbContext db) =>
        db.ResultOutputPackages.AsNoTracking().Where(package =>
            package.State == ResultOutputPackageState.ReadyForReview
            && package.LabAnalysisRunId.HasValue
            && db.LabWorkOrders.Any(work => work.Id == package.LabWorkOrderId
                && work.SubmittingOrganizationId == package.OrganizationId
                && work.Status != LabWorkOrderStatus.OnHold && work.Status != LabWorkOrderStatus.Cancelled)
            && db.Set<LabAssemblyJob>().Any(job => job.LabWorkOrderId == package.LabWorkOrderId
                && job.OrganizationId == package.OrganizationId
                && job.LabAnalysisRunId == package.LabAnalysisRunId
                && job.State == "Succeeded" && job.AttentionReason == null
                && db.LabSpecimens.Any(specimen => specimen.Id == job.LabSpecimenId
                    && specimen.LabWorkOrderId == package.LabWorkOrderId
                    && (specimen.SubmittedSpecimenId == package.LabSampleId
                        || specimen.SubmittedSpecimenId == package.TrialSampleId))
                && db.Set<LabAssemblyQc>().Any(qc => qc.ResultOutputPackageId == package.Id
                    && qc.LabAssemblyJobId == job.Id && qc.LabAnalysisRunId == package.LabAnalysisRunId
                    && qc.Decision == "Pass"
                    && !db.Set<LabAssemblyQc>().Any(later => later.ResultOutputPackageId == package.Id
                        && later.ReviewVersion > qc.ReviewVersion)))
            && !db.LabScientificApprovals.Any(approval => approval.ResultOutputPackageId == package.Id));
}
