namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed partial class LabOperationsController
{
    [HttpPost("work-orders/{workOrderId:guid}/milestone")]
    public async Task<LabWorkOrderDetailDto> SetMilestone(Guid workOrderId,
        [FromBody] WorkMilestoneRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        if (!Enum.TryParse<LabWorkOrderStatus>(request.Status, true, out var status)
            || status is LabWorkOrderStatus.ReadyForRelease or LabWorkOrderStatus.Cancelled)
            throw Invalid("lab_milestone_invalid", "The requested laboratory milestone is invalid for this action.");
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        EnsureVersion(work.Version, request.Version);
        Execute(() => work.RecordMilestone(status));
        await EmitProjectionAsync(work, actor.User.Id, "MilestoneChanged", cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await WorkOrder(work.Id, cancellationToken);
    }

    [HttpPost("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/receipt")]
    public async Task<LabWorkOrderDetailDto> ReceiveSpecimen(Guid workOrderId, Guid specimenId,
        [FromBody] SpecimenReceiptRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        var specimen = await RequireSpecimenAsync(work.Id, specimenId, cancellationToken);
        EnsureVersion(specimen.Version, request.Version);
        Execute(() => specimen.RecordReceipt(request.ReceivedAtUtc, request.ReceiptCondition, request.CurrentLocation));
        dbContext.LabWorkEvents.Add(new LabWorkEvent(work.Id, specimen.Id, "SpecimenReceived",
            DateTime.UtcNow, actor.User.Id, JsonSerializer.Serialize(new { request.ReceiptCondition, request.CurrentLocation }, JsonOptions)));
        await dbContext.SaveChangesAsync(cancellationToken);
        return await WorkOrder(work.Id, cancellationToken);
    }

    [HttpPost("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/accession")]
    public async Task<LabWorkOrderDetailDto> AccessionSpecimen(Guid workOrderId, Guid specimenId,
        [FromBody] SpecimenAccessionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        var specimen = await RequireSpecimenAsync(work.Id, specimenId, cancellationToken);
        EnsureVersion(specimen.Version, request.Version);
        Execute(() => specimen.AssignAccession(request.AccessionNumber));
        var container = new LabContainer(work.Id, specimen.Id, null,
            LabContainerKind.SubmittedSpecimen, request.Barcode, request.Label,
            request.Location, request.Quantity, request.QuantityUnit, request.RetainUntilUtc);
        container.RecordLabelPrint(actor.User.Id, DateTime.UtcNow);
        dbContext.LabContainers.Add(container);
        dbContext.LabWorkEvents.Add(new LabWorkEvent(work.Id, specimen.Id, "SpecimenAccessioned",
            DateTime.UtcNow, actor.User.Id, JsonSerializer.Serialize(new { request.AccessionNumber, request.Barcode }, JsonOptions)));
        await dbContext.SaveChangesAsync(cancellationToken);
        return await WorkOrder(work.Id, cancellationToken);
    }

    [HttpPost("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/disposition")]
    public async Task<LabWorkOrderDetailDto> SetSpecimenDisposition(Guid workOrderId, Guid specimenId,
        [FromBody] SpecimenDispositionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        if (!Enum.TryParse<LabSpecimenIntakeDisposition>(request.Disposition, true, out var disposition))
            throw Invalid("specimen_disposition_invalid", "The intake disposition is invalid.");
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        var specimen = await RequireSpecimenAsync(work.Id, specimenId, cancellationToken);
        EnsureVersion(specimen.Version, request.Version);
        Execute(() => specimen.RecordIntakeDisposition(disposition, request.ReasonCode));
        dbContext.LabWorkEvents.Add(new LabWorkEvent(work.Id, specimen.Id, "SpecimenIntakeDispositionRecorded",
            DateTime.UtcNow, actor.User.Id, JsonSerializer.Serialize(new { disposition, request.ReasonCode }, JsonOptions)));
        var remaining = await dbContext.LabSpecimens.AnyAsync(item => item.LabWorkOrderId == work.Id
            && item.Id != specimen.Id
            && (item.IntakeDisposition == LabSpecimenIntakeDisposition.AwaitingReceipt
                || item.IntakeDisposition == LabSpecimenIntakeDisposition.Received), cancellationToken);
        if (!remaining && work.Status == LabWorkOrderStatus.AwaitingSpecimens)
        {
            work.RecordMilestone(LabWorkOrderStatus.Received);
            await EmitProjectionAsync(work, actor.User.Id, "IntakeCompleted", cancellationToken);
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return await WorkOrder(work.Id, cancellationToken);
    }

    [HttpPost("work-orders/{workOrderId:guid}/containers")]
    public async Task<LabContainerDto> CreateContainer(Guid workOrderId,
        [FromBody] CreateContainerRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        await RequireWorkOrderAsync(workOrderId, cancellationToken);
        if (!Enum.TryParse<LabContainerKind>(request.Kind, true, out var kind))
            throw Invalid("container_kind_invalid", "The container kind is invalid.");
        if (request.LabSpecimenId.HasValue)
            await RequireSpecimenAsync(workOrderId, request.LabSpecimenId.Value, cancellationToken);
        if (request.ParentContainerId.HasValue && !await dbContext.LabContainers
            .AnyAsync(item => item.Id == request.ParentContainerId && item.LabWorkOrderId == workOrderId, cancellationToken))
            throw Missing();
        var container = new LabContainer(workOrderId, request.LabSpecimenId,
            request.ParentContainerId, kind, request.Barcode, request.Label,
            request.Location, request.Quantity, request.QuantityUnit, request.RetainUntilUtc);
        dbContext.LabContainers.Add(container);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapContainer(container);
    }

    [HttpPost("containers/{containerId:guid}/label-print")]
    public async Task<LabContainerDto> PrintContainerLabel(Guid containerId, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        var container = await dbContext.LabContainers.SingleOrDefaultAsync(item => item.Id == containerId, cancellationToken)
            ?? throw Missing();
        container.RecordLabelPrint(actor.User.Id, DateTime.UtcNow);
        dbContext.LabWorkEvents.Add(new LabWorkEvent(container.LabWorkOrderId, container.LabSpecimenId,
            "ContainerLabelPrinted", DateTime.UtcNow, actor.User.Id,
            JsonSerializer.Serialize(new { container.Id, container.Barcode, printNumber = container.LabelPrintCount }, JsonOptions)));
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapContainer(container);
    }

    [HttpPost("work-orders/{workOrderId:guid}/executions")]
    public async Task<LabExecutionDto> CreateExecution(Guid workOrderId,
        [FromBody] CreateExecutionRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        await RequireWorkOrderAsync(workOrderId, cancellationToken);
        if (request.LabSpecimenId.HasValue)
            await RequireSpecimenAsync(workOrderId, request.LabSpecimenId.Value, cancellationToken);
        var protocolVersion = await dbContext.LabProtocolVersions.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == request.LabProtocolVersionId, cancellationToken) ?? throw Missing();
        if (protocolVersion.Status != LabProtocolStatus.Active)
            throw Conflict("protocol_not_active", "Only an active protocol version can be assigned.");
        var execution = new LabProtocolExecution(workOrderId, request.LabSpecimenId,
            request.LabProtocolVersionId, request.AssignedToUserId);
        dbContext.LabProtocolExecutions.Add(execution);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapExecution(execution);
    }

    [HttpPost("executions/{executionId:guid}/transition")]
    public async Task<LabExecutionDto> TransitionExecution(Guid executionId,
        [FromBody] ExecutionTransitionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        var execution = await dbContext.LabProtocolExecutions
            .SingleOrDefaultAsync(item => item.Id == executionId, cancellationToken) ?? throw Missing();
        EnsureVersion(execution.Version, request.Version);
        var work = await RequireWorkOrderAsync(execution.LabWorkOrderId, cancellationToken);
        switch (request.Action.Trim().ToLowerInvariant())
        {
            case "start":
                execution.Start(DateTime.UtcNow);
                if (work.Status is LabWorkOrderStatus.AwaitingSpecimens or LabWorkOrderStatus.Received)
                {
                    work.RecordMilestone(LabWorkOrderStatus.Processing);
                    await EmitProjectionAsync(work, actor.User.Id, "WorkStarted", cancellationToken);
                }
                break;
            case "complete":
                execution.Complete(NormalizeJson(request.CapturedResultsJson ?? "{}", "execution_results_invalid"),
                    request.DeviationNote, DateTime.UtcNow);
                break;
            default: throw Invalid("execution_transition_invalid", "The execution transition is invalid.");
        }
        dbContext.LabWorkEvents.Add(new LabWorkEvent(work.Id, execution.LabSpecimenId,
            $"Execution{request.Action.Trim()}", DateTime.UtcNow, actor.User.Id,
            JsonSerializer.Serialize(new { execution.Id, execution.LabProtocolVersionId }, JsonOptions)));
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapExecution(execution);
    }
}
