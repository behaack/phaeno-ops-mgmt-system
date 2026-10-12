namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.LabOperations.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed class LabSpecimenReviewReadinessTests
{
    [Fact]
    public void ReviewRequiresResolvedAffectedSpecimensAndASuccessfulExactOutput()
    {
        var successful = new LabSpecimen(Guid.NewGuid(), Guid.NewGuid());
        successful.RecordProcessingState(LabSpecimenProcessingState.Succeeded, Guid.NewGuid(), DateTime.UtcNow);
        var failed = new LabSpecimen(successful.LabWorkOrderId, Guid.NewGuid());
        failed.RecordProcessingState(LabSpecimenProcessingState.Failed, Guid.NewGuid(), DateTime.UtcNow, "material_exhausted", "Synthetic test evidence");
        var pending = new LabSpecimen(successful.LabWorkOrderId, Guid.NewGuid());
        Assert.False(LabSpecimenReviewReadiness.IsReady([]));
        Assert.False(LabSpecimenReviewReadiness.IsReady([failed]));
        Assert.False(LabSpecimenReviewReadiness.IsReady([successful, pending]));
        Assert.True(LabSpecimenReviewReadiness.IsReady([successful, failed]));
        Assert.True(LabSpecimenReviewReadiness.IsReady([successful, failed], successful.SubmittedSpecimenId));
        Assert.False(LabSpecimenReviewReadiness.IsReady([successful, failed], failed.SubmittedSpecimenId));
        pending.CancelBeforeReceipt("Synthetic cancellation");
        Assert.True(LabSpecimenReviewReadiness.IsReady([successful, pending]));
    }
}
