namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

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
        var barcode = await LabBarcodeService.AllocateAsync(
            dbContext, LabContainerKind.SubmittedSpecimen, cancellationToken);
        var container = new LabContainer(work.Id, specimen.Id, null,
            LabContainerKind.SubmittedSpecimen, barcode, request.Label,
            request.Location, request.Quantity, request.QuantityUnit, request.RetainUntilUtc);
        dbContext.LabContainers.Add(container);
        dbContext.LabWorkEvents.Add(new LabWorkEvent(work.Id, specimen.Id, "SpecimenAccessioned",
            DateTime.UtcNow, actor.User.Id, JsonSerializer.Serialize(new { request.AccessionNumber, barcode }, JsonOptions)));
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
        var barcode = await LabBarcodeService.AllocateAsync(dbContext, kind, cancellationToken);
        var container = new LabContainer(workOrderId, request.LabSpecimenId,
            request.ParentContainerId, kind, barcode, request.Label,
            request.Location, request.Quantity, request.QuantityUnit, request.RetainUntilUtc);
        dbContext.LabContainers.Add(container);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapContainer(container);
    }

    [HttpGet("containers/scan")]
    public async Task<LabContainerScanDto> ScanContainer(
        [FromQuery] string barcode,
        CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.ProtocolAdministrator,
            LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        if (!LabBarcodeService.TryNormalize(barcode, out var normalized))
            throw Invalid("barcode_invalid", "Scan or enter a complete Phaeno barcode.");
        var container = await dbContext.LabContainers.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Barcode == normalized, cancellationToken)
            ?? throw new OrderManagementException(
                "barcode_not_found",
                "No laboratory container matches this barcode.",
                StatusCodes.Status404NotFound);
        var context = await ReadContainerContextAsync(container, cancellationToken);
        return new LabContainerScanDto(
            container.LabWorkOrderId,
            context.CommercialOrderNumber,
            context.AccessionNumber,
            context.ParentBarcode,
            context.Library?.Id,
            context.Library?.Status.ToString(),
            MapContainer(container));
    }

    [HttpGet("containers/{containerId:guid}/label")]
    public async Task<LabContainerLabelDto> ContainerLabel(
        Guid containerId,
        CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.ProtocolAdministrator,
            LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var container = await dbContext.LabContainers.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == containerId, cancellationToken)
            ?? throw Missing();
        return await ReadContainerLabelAsync(container, cancellationToken);
    }

    [HttpPost("containers/{containerId:guid}/label-print")]
    public async Task<LabContainerLabelDto> PrintContainerLabel(
        Guid containerId,
        [FromBody] RecordLabelPrintRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        var container = await dbContext.LabContainers.SingleOrDefaultAsync(item => item.Id == containerId, cancellationToken)
            ?? throw Missing();
        var reason = request.Reason?.Trim();
        if (string.IsNullOrWhiteSpace(reason) || reason.Length > 500)
            throw Invalid("label_print_reason_required", "Enter a label-print reason of 500 characters or fewer.");
        var outcome = request.Outcome?.Trim().ToLowerInvariant() switch
        {
            "succeeded" => "Succeeded",
            "failed" => "Failed",
            _ => throw Invalid("label_print_outcome_invalid", "Record whether the label printed or failed.")
        };
        var failureDetails = string.IsNullOrWhiteSpace(request.FailureDetails)
            ? null
            : request.FailureDetails.Trim();
        if (outcome == "Failed" && failureDetails is null)
            throw Invalid("label_print_failure_details_required", "Describe why the label did not print.");
        if (failureDetails?.Length > 1000)
            throw Invalid("label_print_failure_details_invalid", "Print-failure details cannot exceed 1000 characters.");

        var occurredAtUtc = DateTime.UtcNow;
        if (outcome == "Succeeded")
        {
            container.RecordLabelPrint(actor.User.Id, occurredAtUtc);
            failureDetails = null;
        }

        var eventCode = outcome == "Succeeded"
            ? "ContainerLabelPrintSucceeded"
            : "ContainerLabelPrintFailed";
        dbContext.LabWorkEvents.Add(new LabWorkEvent(container.LabWorkOrderId, container.LabSpecimenId,
            eventCode, occurredAtUtc, actor.User.Id,
            JsonSerializer.Serialize(new
            {
                containerId = container.Id,
                container.Barcode,
                outcome,
                reason,
                failureDetails,
                printNumber = outcome == "Succeeded" ? container.LabelPrintCount : (int?)null
            }, JsonOptions)));
        await dbContext.SaveChangesAsync(cancellationToken);
        return await ReadContainerLabelAsync(container, cancellationToken);
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

    private async Task<LabContainerLabelDto> ReadContainerLabelAsync(
        LabContainer container,
        CancellationToken cancellationToken)
    {
        var context = await ReadContainerContextAsync(container, cancellationToken);
        var events = await dbContext.LabWorkEvents.AsNoTracking()
            .Where(item => item.LabWorkOrderId == container.LabWorkOrderId
                && (item.EventCode == "ContainerLabelPrintSucceeded"
                    || item.EventCode == "ContainerLabelPrintFailed"))
            .OrderByDescending(item => item.OccurredAtUtc)
            .ToListAsync(cancellationToken);
        var history = new List<LabLabelPrintEventDto>();
        foreach (var item in events)
        {
            try
            {
                using var details = JsonDocument.Parse(item.DetailsJson);
                var root = details.RootElement;
                if (!root.TryGetProperty("containerId", out var containerId)
                    || containerId.GetGuid() != container.Id)
                {
                    continue;
                }

                history.Add(new LabLabelPrintEventDto(
                    item.Id,
                    container.Id,
                    root.GetProperty("outcome").GetString() ?? "Unknown",
                    root.GetProperty("reason").GetString() ?? "Not recorded",
                    root.TryGetProperty("failureDetails", out var failureDetails)
                        && failureDetails.ValueKind != JsonValueKind.Null
                            ? failureDetails.GetString()
                            : null,
                    root.TryGetProperty("printNumber", out var printNumber)
                        && printNumber.ValueKind != JsonValueKind.Null
                            ? printNumber.GetInt32()
                            : null,
                    item.ActorUserId,
                    item.OccurredAtUtc));
            }
            catch (JsonException)
            {
                // A malformed historical event remains auditable in the event
                // stream but must not prevent the current label from rendering.
            }
        }

        return new LabContainerLabelDto(
            container.LabWorkOrderId,
            context.CommercialOrderNumber,
            context.AccessionNumber,
            context.ParentBarcode,
            MapContainer(container),
            history);
    }

    private async Task<ContainerContext> ReadContainerContextAsync(
        LabContainer container,
        CancellationToken cancellationToken)
    {
        var work = await dbContext.LabWorkOrders.AsNoTracking()
            .SingleAsync(item => item.Id == container.LabWorkOrderId, cancellationToken);
        var authorization = await dbContext.CommercialLabAuthorizations.AsNoTracking()
            .SingleOrDefaultAsync(item => item.AuthorizationId == work.AuthorizationId, cancellationToken);
        var commercialOrderNumber = authorization is null
            ? null
            : await dbContext.LabServiceOrders.AsNoTracking()
                .Where(item => item.Id == authorization.CommercialOrderId)
                .Select(item => item.OrderNumber)
                .SingleOrDefaultAsync(cancellationToken);
        var accessionNumber = container.LabSpecimenId.HasValue
            ? await dbContext.LabSpecimens.AsNoTracking()
                .Where(item => item.Id == container.LabSpecimenId.Value)
                .Select(item => item.AccessionNumber)
                .SingleOrDefaultAsync(cancellationToken)
            : null;
        var parentBarcode = container.ParentContainerId.HasValue
            ? await dbContext.LabContainers.AsNoTracking()
                .Where(item => item.Id == container.ParentContainerId.Value)
                .Select(item => item.Barcode)
                .SingleOrDefaultAsync(cancellationToken)
            : null;
        var library = await dbContext.LabLibraries.AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.LibraryContainerId == container.Id,
                cancellationToken);
        return new ContainerContext(
            commercialOrderNumber,
            accessionNumber,
            parentBarcode,
            library);
    }

    private sealed record ContainerContext(
        string? CommercialOrderNumber,
        string? AccessionNumber,
        string? ParentBarcode,
        LabLibrary? Library);
}
