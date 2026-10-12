namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

public static class LabSpecimenReviewReadiness
{
    public static bool IsReady(IEnumerable<LabSpecimen> specimens, Guid? submittedSpecimenId = null)
    {
        var affected = specimens.Where(s => s.IntakeDisposition != LabSpecimenIntakeDisposition.Cancelled
            && (!submittedSpecimenId.HasValue || s.SubmittedSpecimenId == submittedSpecimenId)).ToArray();
        return affected.Length > 0 && affected.All(s => s.ProcessingState is LabSpecimenProcessingState.Succeeded or LabSpecimenProcessingState.Failed)
            && affected.Any(s => s.ProcessingState == LabSpecimenProcessingState.Succeeded);
    }

    public static async Task RequireAsync(PSeqOperationsDbContext db, LabWorkOrder work, CancellationToken token, Guid? submittedSpecimenId = null)
    {
        if (work.TubeUsePolicyKey is null) return;
        var specimens = await db.LabSpecimens.AsNoTracking().Where(s => s.LabWorkOrderId == work.Id).ToListAsync(token);
        if (!IsReady(specimens, submittedSpecimenId))
            throw new OrderManagementException("specimen_attempts_incomplete", "Resolve every affected specimen attempt before review. Only successful specimen outputs may be approved for release.", 409);
    }
}
