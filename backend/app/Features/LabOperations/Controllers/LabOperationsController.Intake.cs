namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabOperationsController
{
    [HttpGet("intake-reasons")]
    public async Task<IReadOnlyList<LabIntakeReason>> IntakeReasons(CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken);
        return LabIntakeReasons.All;
    }

    [HttpPost("work-orders/{workOrderId:guid}/containers/{containerId:guid}/intake")]
    public async Task<LabWorkOrderDetailDto> ReviewTubeIntake(Guid workOrderId, Guid containerId,
        [FromBody] TubeIntakeReviewRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken, LabRole.Supervisor);
        await using var transaction = dbContext.Database.CurrentTransaction is null
            ? await SampleShippingPackingData.BeginAsync(dbContext, $"lab-tube-receipt:{workOrderId}", cancellationToken) : null;
        if (transaction is null) await SampleShippingPackingData.LockAsync(dbContext, $"lab-tube-receipt:{workOrderId}", cancellationToken);
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        if (work.Status is LabWorkOrderStatus.Cancelled or LabWorkOrderStatus.ReadyForRelease)
            throw Conflict("tube_review_work_closed", "Intake cannot change after this work is closed.");
        var tube = await dbContext.LabContainers.SingleOrDefaultAsync(item => item.Id == containerId
            && item.LabWorkOrderId == work.Id, cancellationToken) ?? throw Missing();
        EnsureVersion(tube.Version, request.Version);
        if (!tube.LabSpecimenId.HasValue) throw Invalid("tube_specimen_required", "Choose a submitted specimen tube.");
        var specimen = await RequireSpecimenAsync(work.Id, tube.LabSpecimenId.Value, cancellationToken);
        await RequireUnusedTubeIntakeAsync(work, specimen, tube, cancellationToken);
        if (string.IsNullOrWhiteSpace(request.Notes))
            throw Invalid("intake_correction_reason_required", "Explain why the recorded intake decision is being corrected.");
        if (!string.IsNullOrWhiteSpace(request.RetainedStorageLocation))
        {
            if (tube.Location is not null) throw Invalid("intake_location_unchanged", "An intake correction does not move stored material.");
            Execute(() => tube.Move(request.RetainedStorageLocation));
        }
        if (!Enum.TryParse<LabSpecimenIntakeDisposition>(request.Disposition, true, out var disposition))
            throw Invalid("tube_intake_invalid", "Choose Accepted, On hold or Rejected.");
        Execute(() => tube.ReviewIntake(disposition, request.ReasonCode, request.Notes, actor.User.Id, DateTime.UtcNow));
        await RefreshSpecimenTubeIntakeAsync(work, specimen, tube, actor.User.Id, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return await WorkOrder(work.Id, cancellationToken);
    }

    private async Task RequireUnusedTubeIntakeAsync(LabWorkOrder work, LabSpecimen specimen, LabContainer tube, CancellationToken cancellationToken)
    {
        if (specimen.IntakeDisposition == LabSpecimenIntakeDisposition.Cancelled)
            throw Conflict("tube_intake_specimen_closed", "Intake cannot change for a cancelled specimen.");
        if (await dbContext.LabProtocolExecutions.AnyAsync(item => item.LabWorkOrderId == work.Id
            && item.LabSpecimenId == specimen.Id && !item.LabSpecimenAttemptId.HasValue && (item.Status == LabExecutionStatus.InProgress
                || item.Status == LabExecutionStatus.Blocked || item.Status == LabExecutionStatus.Completed), cancellationToken))
            throw Conflict("tube_review_work_started", "This specimen has processing history. Resolve it through supervised rework before changing intake.");
        if (await dbContext.LabSpecimenAttempts.AnyAsync(a => a.SourceContainerId == tube.Id && a.StartedAtUtc.HasValue, cancellationToken))
            throw Conflict("attempt_source_review_locked", "This tube has been used in an attempt. Record an attempt hold or failure; retain the original intake decision.");
    }

    private async Task RefreshSpecimenTubeIntakeAsync(LabWorkOrder work, LabSpecimen specimen,
        LabContainer reviewed, Guid actorId, CancellationToken cancellationToken)
    {
        var tubes = await dbContext.LabContainers.Where(item => item.LabWorkOrderId == work.Id
            && item.LabSpecimenId == specimen.Id && item.Kind == LabContainerKind.SubmittedSpecimen).ToListAsync(cancellationToken);
        if (tubes.All(item => item.Id != reviewed.Id)) tubes.Add(reviewed);
        var before = specimen.IntakeDisposition;
        Execute(() => specimen.RefreshIntakeFromTubes(tubes, DateTime.UtcNow));
        // Also serialize against execution start, not just other intake requests.
        dbContext.Entry(work).Property(item => item.UpdatedAt).IsModified = true;
        dbContext.Entry(specimen).Property(item => item.Version).IsModified = true;
        work.RefreshAcceptedSpecimenTargets();
        dbContext.LabWorkEvents.Add(new LabWorkEvent(work.Id, specimen.Id, "TubeIntakeReviewed",
            DateTime.UtcNow, actorId, JsonSerializer.Serialize(new
            {
                containerId = reviewed.Id, reviewed.Barcode, reviewed.IntakeDisposition,
                reviewed.IntakeReasonCode, reviewed.IntakeNotes, specimenDisposition = specimen.IntakeDisposition
            }, JsonOptions)));
        if (before != specimen.IntakeDisposition)
        {
            work.AdvanceProjectionVersion();
            await EmitProjectionAsync(work, actorId, "SpecimenIntakeChanged", cancellationToken);
        }
    }
}
