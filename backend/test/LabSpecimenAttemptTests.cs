namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;
using Xunit;

public sealed class LabSpecimenAttemptTests
{
    [Fact]
    public void Wrong_barcode_does_not_start_or_change_source()
    {
        var sourceId = Guid.NewGuid();
        var attempt = NewAttempt(sourceId);
        Assert.Throws<ArgumentException>(() => attempt.Start("SOURCE-1", "SOURCE-2", DateTime.UtcNow));
        Assert.Null(attempt.StartedAtUtc);
        Assert.Equal(sourceId, attempt.SourceContainerId);
        Assert.Equal(LabSpecimenAttemptState.Planned, attempt.State);
    }

    [Fact]
    public void Qc_hold_permits_same_attempt_repeat_but_operational_hold_requires_resolution()
    {
        var attempt = NewAttempt(); var actor = Guid.NewGuid(); var now = DateTime.UtcNow;
        attempt.Start("SOURCE-1", "SOURCE-1", now);
        attempt.Refresh(true, false, actor, now);
        attempt.RequireOpen();
        Assert.Throws<InvalidOperationException>(() => attempt.RequireOpen(false));
        attempt.Refresh(false, false, actor, now);
        attempt.Hold("Instrument needs review", "Inspect instrument", actor);
        Assert.Throws<InvalidOperationException>(() => attempt.RequireOpen());
        attempt.Resume("Inspection complete");
        attempt.RequireOpen();
        Assert.Equal(LabSpecimenAttemptState.InProgress, attempt.State);
    }

    [Fact]
    public void Failure_preserves_source_and_locks_attempt_even_with_later_completion()
    {
        var attempt = NewAttempt(); var actor = Guid.NewGuid(); var now = DateTime.UtcNow;
        attempt.Start("SOURCE-1", "SOURCE-1", now);
        attempt.Fail("equipment_incident", "Run failed; instrument report TEST-1", Guid.NewGuid(), actor, now);
        Assert.Equal(LabSpecimenAttemptState.Failed, attempt.State);
        Assert.Throws<InvalidOperationException>(() => attempt.Refresh(false, true, actor, now));
        Assert.Throws<InvalidOperationException>(() => attempt.Cancel("Release source", actor, now));
        Assert.Equal("equipment_incident", attempt.FailureReasonCode);
    }

    [Fact]
    public void Skipped_required_or_foreign_stage_does_not_create_decision()
    {
        var attempt = NewAttempt();
        var stage = new LabServiceWorkflowStage(attempt.LabServiceWorkflowVersionId, 1, "Required", Guid.NewGuid(), LabServiceWorkflowStageRequirement.Required, null, null);
        Assert.Throws<InvalidOperationException>(() => attempt.SkipStage(stage, "Skip", Guid.NewGuid(), DateTime.UtcNow));
        Assert.Empty(attempt.ReadStageSkips());
    }

    [Fact]
    public void Failed_processing_does_not_change_accepted_intake()
    {
        var specimen = new LabSpecimen(Guid.NewGuid(), Guid.NewGuid());
        var now = DateTime.UtcNow; var actor = Guid.NewGuid();
        specimen.RecordReceipt(now, null, "TEST-BOX"); specimen.AssignAccession("TEST-ACC");
        var tube = new LabContainer(specimen.LabWorkOrderId, specimen.Id, null, LabContainerKind.SubmittedSpecimen, "TEST-TUBE", "Tube", "TEST-BOX", null, null, null);
        tube.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, actor, now);
        specimen.RefreshIntakeFromTubes([tube], now);
        specimen.RecordProcessingState(LabSpecimenProcessingState.Failed, actor, now, "material_exhausted", "No remaining material after terminal failure");
        Assert.Equal(LabSpecimenIntakeDisposition.Accepted, specimen.IntakeDisposition);
        Assert.Equal(LabSpecimenProcessingState.Failed, specimen.ProcessingState);
        Assert.Throws<InvalidOperationException>(() => specimen.RecordProcessingState(LabSpecimenProcessingState.Ready, actor, now));
    }

    private static LabSpecimenAttempt NewAttempt(Guid? sourceId = null) => new(Guid.NewGuid(), Guid.NewGuid(), sourceId ?? Guid.NewGuid(), Guid.NewGuid(), 1, null);
}
