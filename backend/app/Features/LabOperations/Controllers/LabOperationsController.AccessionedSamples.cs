namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed partial class LabOperationsController
{
    [HttpGet("samples/accessioned")]
    public async Task<LabAccessionedSamplePageDto> AccessionedSamples(
        [FromQuery] string? search = null, [FromQuery] string? intakeStatus = null,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? useStatus = null, CancellationToken cancellationToken = default,
        [FromQuery] bool includePending = false, [FromQuery] string? processingStatus = null,
        [FromQuery] string? scope = null, [FromQuery] bool blockedOnly = false)
    {
        await RequireShipmentReaderAsync(cancellationToken);
        if (!string.IsNullOrEmpty(useStatus) && useStatus is not ("Used" or "NotUsed"))
            throw Invalid("accessioned_sample_use_invalid", "Choose Used or Not used.");
        if (scope is not (null or "Active" or "Historical")) throw Invalid("specimen_scope_invalid", "Choose Active or Historical specimens.");
        LabSpecimenProcessingState? processing = null;
        if (!string.IsNullOrEmpty(processingStatus))
        {
            if (processingStatus is not ("Ready" or "Planned" or "InProgress" or "OnHold" or "Failed" or "Succeeded"))
                throw Invalid("specimen_processing_invalid", "Choose a valid processing state.");
            processing = Enum.Parse<LabSpecimenProcessingState>(processingStatus);
        }
        LabSpecimenIntakeDisposition? status = null;
        if (!string.IsNullOrEmpty(intakeStatus))
        {
            if (intakeStatus is not ("AwaitingReceipt" or "Received" or "Accepted" or "OnHold" or "Rejected" or "Cancelled"))
                throw Invalid("accessioned_sample_status_invalid", "Choose a valid sample intake status.");
            status = Enum.Parse<LabSpecimenIntakeDisposition>(intakeStatus);
        }
        var usedTubes = dbContext.LabContainers.Where(tube => tube.Kind == LabContainerKind.SubmittedSpecimen
            && (dbContext.LabSpecimenAttempts.Any(attempt => attempt.LabWorkOrderId == tube.LabWorkOrderId
                && attempt.LabSpecimenId == tube.LabSpecimenId && attempt.SourceContainerId == tube.Id && attempt.StartedAtUtc.HasValue)
                || dbContext.LabBiologicalMaterialTransfers.Any(transfer => transfer.LabWorkOrderId == tube.LabWorkOrderId
                    && transfer.LabSpecimenId == tube.LabSpecimenId && transfer.SourceContainerId == tube.Id)));
        // Historical processing establishes sample use without identifying a particular source tube.
        var unlinkedProcessing = dbContext.LabProtocolExecutions.Where(execution => !execution.LabSpecimenAttemptId.HasValue
            && (execution.StartedAtUtc.HasValue || execution.Status == LabExecutionStatus.InProgress
                || execution.Status == LabExecutionStatus.Blocked || execution.Status == LabExecutionStatus.Completed));
        var query = from specimen in dbContext.LabSpecimens.AsNoTracking()
                    join work in dbContext.LabWorkOrders.AsNoTracking() on specimen.LabWorkOrderId equals work.Id
                    where includePending || specimen.AccessionNumber != null
                        && dbContext.LabContainers.Any(tube => tube.LabWorkOrderId == work.Id
                            && tube.LabSpecimenId == specimen.Id && tube.Kind == LabContainerKind.SubmittedSpecimen)
                    select new
                    {
                        Specimen = specimen,
                        Historical = work.CompletedAtUtc.HasValue || work.Status == LabWorkOrderStatus.Cancelled,
                        JobStatus = work.Status,
                        Blocked = work.Status == LabWorkOrderStatus.OnHold || specimen.IntakeDisposition == LabSpecimenIntakeDisposition.OnHold
                            || specimen.IntakeDisposition == LabSpecimenIntakeDisposition.Rejected || specimen.ProcessingState == LabSpecimenProcessingState.OnHold
                            || specimen.ProcessingState == LabSpecimenProcessingState.Failed
                            || dbContext.LabCustomerHolds.Any(h => h.LabWorkOrderId == work.Id && h.LabSpecimenId == specimen.Id && h.State != "Released")
                            || dbContext.LabSpecimenAttempts.Any(a => a.LabWorkOrderId == work.Id && a.LabSpecimenId == specimen.Id && a.State == LabSpecimenAttemptState.OnHold)
                            || dbContext.LabExceptions.Any(e => e.LabWorkOrderId == work.Id && e.Status == LabExceptionStatus.Open && e.IsBlocking
                                && (e.LabSpecimenId == specimen.Id || e.LabSpecimenId == null && (!e.LabProtocolExecutionId.HasValue
                                    || dbContext.LabProtocolExecutions.Any(x => x.Id == e.LabProtocolExecutionId && x.LabWorkOrderId == work.Id && x.LabSpecimenId == specimen.Id)))),
                        HasRecordedUse = usedTubes.Any(tube => tube.LabWorkOrderId == work.Id && tube.LabSpecimenId == specimen.Id)
                            || unlinkedProcessing.Any(execution => execution.LabWorkOrderId == work.Id && execution.LabSpecimenId == specimen.Id),
                        CustomerSampleId = dbContext.SampleShipmentItems.Where(item => item.SubmittedSpecimenId == specimen.SubmittedSpecimenId
                            && dbContext.SampleShipments.Any(shipment => shipment.Id == item.SampleShipmentId && shipment.LabWorkOrderId == work.Id))
                            .OrderBy(item => item.CreatedAt).ThenBy(item => item.Id).Select(item => item.CustomerSampleId).FirstOrDefault()
                            ?? dbContext.LabSamples.Where(sample => work.AuthorizationSource == LabAuthorizationSource.CommercialOrder
                                && sample.LabServiceOrderId == work.AuthorizationSourceId && sample.Id == specimen.SubmittedSpecimenId)
                                .Select(sample => sample.CustomerSampleId).FirstOrDefault()
                            ?? dbContext.TrialSamples.Where(sample => work.AuthorizationSource == LabAuthorizationSource.TrialProject
                                && sample.TrialProjectId == work.AuthorizationSourceId && sample.Id == specimen.SubmittedSpecimenId)
                                .Select(sample => sample.Reference).FirstOrDefault() ?? specimen.AccessionNumber ?? "Specimen",
                        OrganizationName = dbContext.Organizations.Where(org => org.Id == work.SubmittingOrganizationId)
                            .Select(org => org.Name).FirstOrDefault() ?? "Phaeno submission",
                        JobReference = dbContext.LabServiceOrders.Where(order => work.AuthorizationSource == LabAuthorizationSource.CommercialOrder
                            && order.Id == work.AuthorizationSourceId && order.OrganizationId == work.SubmittingOrganizationId)
                            .Select(order => order.OrderNumber).FirstOrDefault() ?? work.OpaqueSubmitterReference ?? "Job"
                    };
        if (scope != null) query = query.Where(row => row.Historical == (scope == "Historical"));
        if (processing.HasValue) query = query.Where(row => row.Specimen.ProcessingState == processing.Value);
        if (blockedOnly) query = query.Where(row => row.Blocked);
        if (status.HasValue) query = query.Where(row => row.Specimen.IntakeDisposition == status.Value);
        if (!string.IsNullOrEmpty(useStatus)) query = query.Where(row => row.HasRecordedUse == (useStatus == "Used"));
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            if (term.Length > 255) throw Invalid("accessioned_sample_search_invalid", "Search must be 255 characters or fewer.");
            query = query.Where(row => row.CustomerSampleId.ToLower().Contains(term)
                || row.Specimen.AccessionNumber != null && row.Specimen.AccessionNumber.ToLower().Contains(term)
                || row.OrganizationName.ToLower().Contains(term) || row.JobReference.ToLower().Contains(term)
                || dbContext.LabContainers.Any(tube => tube.LabWorkOrderId == row.Specimen.LabWorkOrderId
                    && tube.LabSpecimenId == row.Specimen.Id && (includePending || tube.Kind == LabContainerKind.SubmittedSpecimen)
                    && (tube.Barcode.ToLower().Contains(term) || tube.Location != null && tube.Location.ToLower().Contains(term))));
        }
        pageSize = Math.Clamp(pageSize, 1, 50);
        var total = await query.CountAsync(cancellationToken);
        page = Math.Clamp(page, 1, Math.Max(1, (int)Math.Ceiling(total / (double)pageSize)));
        var rows = await query.OrderByDescending(row => row.Specimen.ReceivedAtUtc).ThenByDescending(row => row.Specimen.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        var specimenIds = rows.Select(row => row.Specimen.Id).ToArray();
        var tubes = await dbContext.LabContainers.AsNoTracking().Where(tube => tube.LabSpecimenId.HasValue
            && specimenIds.Contains(tube.LabSpecimenId.Value) && tube.Kind == LabContainerKind.SubmittedSpecimen)
            .OrderBy(tube => tube.Barcode).Select(tube => new
            {
                SpecimenId = tube.LabSpecimenId!.Value, tube.LabWorkOrderId,
                Detail = new LabAccessionedTubeDto(tube.Id, tube.Barcode, tube.Location,
                    tube.IntakeDisposition == null ? null : tube.IntakeDisposition.ToString(), tube.Status.ToString(),
                    usedTubes.Any(used => used.Id == tube.Id) ? "Used"
                        : unlinkedProcessing.Any(execution => execution.LabWorkOrderId == tube.LabWorkOrderId
                            && execution.LabSpecimenId == tube.LabSpecimenId) ? "Unknown" : "NotUsed")
            }).ToListAsync(cancellationToken);
        var items = rows.Select(row => new LabAccessionedSampleDto(row.Specimen.Id, row.Specimen.LabWorkOrderId,
            row.CustomerSampleId, row.Specimen.AccessionNumber!, row.OrganizationName, row.JobReference,
            row.Specimen.IntakeDisposition.ToString(), row.Specimen.ReceivedAtUtc, row.HasRecordedUse ? "Used" : "NotUsed",
            tubes.Where(tube => tube.SpecimenId == row.Specimen.Id && tube.LabWorkOrderId == row.Specimen.LabWorkOrderId)
                .Select(tube => tube.Detail).ToArray(), row.Specimen.ProcessingState?.ToString(), row.JobStatus.ToString(),
            row.Historical, row.Blocked, row.Specimen.ProcessingNextAction)).ToArray();
        return new(items, page, pageSize, total);
    }
}
