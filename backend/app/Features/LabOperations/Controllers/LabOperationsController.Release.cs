namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed partial class LabOperationsController
{
    [HttpPost("batches/{batchId:guid}/sendout")]
    public async Task<LabBatchDto> CreateSendout(Guid batchId,
        [FromBody] CreateSendoutRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor);
        var batch = await dbContext.LabOperationalBatches.SingleOrDefaultAsync(item => item.Id == batchId, cancellationToken)
            ?? throw Missing();
        if (batch.Status != LabBatchStatus.InProgress)
            throw Conflict("batch_not_active", "The sequencing batch must be active before sendout.");
        if (!await dbContext.LabBatchMembers.AnyAsync(item => item.LabOperationalBatchId == batch.Id, cancellationToken))
            throw Conflict("batch_members_required", "Add at least one library before creating a sendout.");
        var sendout = new LabNgsSendout(batch.Id, request.ProviderName, request.ProviderReference,
            NormalizeJson(request.ManifestJson, "sendout_manifest_invalid"), request.ExpectedCompletionAtUtc);
        dbContext.LabNgsSendouts.Add(sendout);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await ReadBatchesAsync(cancellationToken)).Single(item => item.Id == batch.Id);
    }

    [HttpPost("sendouts/{sendoutId:guid}/transition")]
    public async Task<LabBatchDto> TransitionSendout(Guid sendoutId,
        [FromBody] SendoutTransitionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor);
        if (!Enum.TryParse<LabNgsSendoutStatus>(request.Status, true, out var status))
            throw Invalid("sendout_status_invalid", "The sequencing sendout status is invalid.");
        var sendout = await dbContext.LabNgsSendouts.SingleOrDefaultAsync(item => item.Id == sendoutId, cancellationToken)
            ?? throw Missing();
        EnsureVersion(sendout.Version, request.Version);
        sendout.SetStatus(status, DateTime.UtcNow);
        var workOrderIds = await dbContext.LabBatchMembers.AsNoTracking()
            .Where(item => item.LabOperationalBatchId == sendout.LabOperationalBatchId)
            .Select(item => item.LabWorkOrderId).Distinct().ToListAsync(cancellationToken);
        var workOrders = await dbContext.LabWorkOrders.Where(item => workOrderIds.Contains(item.Id)).ToListAsync(cancellationToken);
        foreach (var work in workOrders)
        {
            var milestone = status switch
            {
                LabNgsSendoutStatus.Shipped or LabNgsSendoutStatus.ReceivedByProvider
                    or LabNgsSendoutStatus.Sequencing => LabWorkOrderStatus.AwaitingExternalSequencing,
                LabNgsSendoutStatus.Complete => LabWorkOrderStatus.DataProcessing,
                LabNgsSendoutStatus.Exception => LabWorkOrderStatus.OnHold,
                _ => (LabWorkOrderStatus?)null
            };
            if (milestone.HasValue && work.Status != milestone.Value)
            {
                work.RecordMilestone(milestone.Value);
                await EmitProjectionAsync(work, actor.User.Id, "SequencingStatusChanged", cancellationToken,
                    sendout.ExpectedCompletionAtUtc);
            }
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await ReadBatchesAsync(cancellationToken)).Single(item => item.Id == sendout.LabOperationalBatchId);
    }

    [HttpPost("sendouts/{sendoutId:guid}/custody-events")]
    public async Task<LabBatchDto> RecordCustody(Guid sendoutId,
        [FromBody] CustodyEventRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor);
        var sendout = await dbContext.LabNgsSendouts.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == sendoutId, cancellationToken) ?? throw Missing();
        if (request.LabContainerId.HasValue)
        {
            var container = await dbContext.LabContainers.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Id == request.LabContainerId, cancellationToken) ?? throw Missing();
            if (!await dbContext.LabBatchMembers.AsNoTracking().AnyAsync(item =>
                item.LabOperationalBatchId == sendout.LabOperationalBatchId
                && item.LabWorkOrderId == container.LabWorkOrderId, cancellationToken))
                throw Invalid("custody_container_invalid", "The custody container must belong to work represented in this batch.");
        }
        dbContext.LabCustodyEvents.Add(new LabCustodyEvent(sendout.Id, request.LabContainerId,
            request.EventCode, request.LocationOrParty,
            NormalizeJson(request.DetailsJson, "custody_details_invalid"), actor.User.Id, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await ReadBatchesAsync(cancellationToken)).Single(item => item.Id == sendout.LabOperationalBatchId);
    }

    [HttpPost("work-orders/{workOrderId:guid}/exceptions")]
    public async Task<LabExceptionDto> RaiseException(Guid workOrderId,
        [FromBody] CreateExceptionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor);
        if (!Enum.TryParse<LabExceptionAudience>(request.Audience, true, out var audience))
            throw Invalid("lab_exception_audience_invalid", "The exception audience is invalid.");
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        if (request.LabSpecimenId.HasValue)
            await RequireSpecimenAsync(work.Id, request.LabSpecimenId.Value, cancellationToken);
        if (request.LabProtocolExecutionId.HasValue && !await dbContext.LabProtocolExecutions
            .AnyAsync(item => item.Id == request.LabProtocolExecutionId && item.LabWorkOrderId == work.Id, cancellationToken))
            throw Missing();
        var exception = new LabException(work.Id, request.LabSpecimenId,
            request.LabProtocolExecutionId, audience, request.CategoryCode, request.Title,
            request.InternalDescription, request.CustomerSafeSummary, request.IsBlocking,
            request.ResponseDueAtUtc);
        dbContext.LabExceptions.Add(exception);
        work.AdvanceProjectionVersion();
        await EmitProjectionAsync(work, actor.User.Id, "ExceptionRaised", cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapException(exception);
    }

    [HttpPost("exceptions/{exceptionId:guid}/resolve")]
    public async Task<LabExceptionDto> ResolveException(Guid exceptionId,
        [FromBody] ResolveExceptionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Supervisor);
        var exception = await dbContext.LabExceptions.SingleOrDefaultAsync(item => item.Id == exceptionId, cancellationToken)
            ?? throw Missing();
        EnsureVersion(exception.Version, request.Version);
        exception.Resolve(actor.User.Id, DateTime.UtcNow, request.ResolutionNote);
        var work = await RequireWorkOrderAsync(exception.LabWorkOrderId, cancellationToken);
        work.AdvanceProjectionVersion();
        await EmitProjectionAsync(work, actor.User.Id, "ExceptionResolved", cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapException(exception);
    }

    [HttpPost("work-orders/{workOrderId:guid}/scientific-approval")]
    public async Task<LabWorkOrderDetailDto> ApproveScientificReview(Guid workOrderId,
        [FromBody] ScientificApprovalRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.ScientificReviewer);
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        EnsureVersion(work.Version, request.WorkOrderVersion);
        if (work.Status != LabWorkOrderStatus.ScientificReview)
            throw Conflict("scientific_review_not_ready", "The work order must be in scientific review.");
        if (await dbContext.LabExceptions.AnyAsync(item => item.LabWorkOrderId == work.Id
            && item.Status == LabExceptionStatus.Open && item.IsBlocking, cancellationToken))
            throw Conflict("blocking_exception_open", "Resolve all blocking laboratory exceptions before approval.");
        if (await dbContext.LabProtocolExecutions.AnyAsync(item => item.LabWorkOrderId == work.Id
            && item.Status != LabExecutionStatus.Completed && item.Status != LabExecutionStatus.Abandoned, cancellationToken))
            throw Conflict("execution_incomplete", "Every assigned protocol execution must be completed or abandoned before approval.");
        var actorContributed = await dbContext.LabWorkEvents.AsNoTracking().AnyAsync(item =>
            item.LabWorkOrderId == work.Id && item.ActorUserId == actor.User.Id
            && item.EventCode != "ScientificApprovalRecorded"
            && item.EventCode != "ReadyForRelease", cancellationToken);
        if (actorContributed)
        {
            requestContext.EnforceOrAuditActorConflict(actor.User.Id,
                "scientific_approval_contributor_conflict",
                "Scientific approval requires a reviewer who did not perform receipt, accessioning, execution, QC, library, batch, or sendout work for this work order.",
                new { workOrderId = work.Id });
        }
        ResultOutputPackage? outputPackage = null;
        if (requestContext.GovernedPSeqResultsEnabled)
        {
            if (!request.ResultOutputPackageId.HasValue)
                throw Invalid("result_output_package_required", "Select a complete output package before scientific approval.");
            outputPackage = await dbContext.ResultOutputPackages.SingleOrDefaultAsync(item =>
                item.Id == request.ResultOutputPackageId.Value
                && item.LabWorkOrderId == work.Id, cancellationToken) ?? throw Missing();
            if (outputPackage.State != ResultOutputPackageState.ReadyForReview)
                throw Conflict("result_output_package_not_ready", "The output package must be complete, checksummed, and malware-clean before scientific approval.");
        }
        var approvalVersion = await dbContext.LabScientificApprovals
            .CountAsync(item => item.LabWorkOrderId == work.Id, cancellationToken) + 1;
        work.RecordMilestone(LabWorkOrderStatus.ReadyForRelease);
        var permittedQcProjectionJson = NormalizeOptionalJson(
            request.PermittedQcProjectionJson, "qc_projection_invalid");
        var approval = new LabScientificApproval(work.Id, approvalVersion,
            request.ReleaseDefinitionKey, request.ReleaseDefinitionVersion,
            permittedQcProjectionJson,
            actor.User.Id, DateTime.UtcNow, work.ProjectionVersion, outputPackage?.Id);
        dbContext.LabScientificApprovals.Add(approval);
        if (outputPackage is not null)
        {
            outputPackage.RecordScientificApproval(approval.Id, actor.User.Id, DateTime.UtcNow);
            outputPackage.MarkReadyForRelease(approval.Id);
        }
        dbContext.LabWorkEvents.Add(new LabWorkEvent(work.Id, null, "ScientificApprovalRecorded",
            DateTime.UtcNow, actor.User.Id, JsonSerializer.Serialize(new
            {
                request.ReleaseDefinitionKey,
                request.ReleaseDefinitionVersion,
                scientificApprovalId = approval.Id,
                resultOutputPackageId = outputPackage?.Id,
                readyForRelease = true,
                filePublicationTriggered = false
            }, JsonOptions)));
        await EmitProjectionAsync(work, actor.User.Id, "ReadyForRelease", cancellationToken,
            permittedQcProjectionJson: permittedQcProjectionJson,
            scientificApprovalId: approval.Id,
            resultOutputPackageId: outputPackage?.Id);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await WorkOrder(work.Id, cancellationToken);
    }
}
