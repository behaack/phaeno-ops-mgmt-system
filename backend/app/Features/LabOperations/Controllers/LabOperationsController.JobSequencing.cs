namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed partial class LabOperationsController
{
    [HttpGet("work-orders/{workOrderId:guid}/sequencing")]
    public async Task<IReadOnlyList<LabJobSequencingBatchDto>> JobSequencing(
        Guid workOrderId, CancellationToken cancellationToken, [FromQuery] Guid? specimenId = null)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.ProtocolAdministrator,
            LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        if (specimenId.HasValue) await RequireSpecimenAsync(work.Id, specimenId.Value, cancellationToken);
        var members = await (from member in dbContext.LabBatchMembers.AsNoTracking()
            join library in dbContext.LabLibraries.AsNoTracking() on member.LabLibraryId equals library.Id
            where member.LabWorkOrderId == work.Id && library.LabWorkOrderId == work.Id
                && (!specimenId.HasValue || library.LabSpecimenId == specimenId.Value)
            orderby library.LibraryKey
            select new { member.Id, member.LabOperationalBatchId, member.LabLibraryId,
                member.SequencingContainerId, library.LibraryKey, library.LabSpecimenId })
            .ToListAsync(cancellationToken);
        if (members.Count == 0) return [];

        var batchIds = members.Select(member => member.LabOperationalBatchId).Distinct().ToArray();
        var batches = await dbContext.LabOperationalBatches.AsNoTracking()
            .Where(batch => batchIds.Contains(batch.Id)).OrderByDescending(batch => batch.CreatedAt)
            .ToListAsync(cancellationToken);
        var counts = await dbContext.LabBatchMembers.AsNoTracking()
            .Where(member => batchIds.Contains(member.LabOperationalBatchId))
            .GroupBy(member => member.LabOperationalBatchId)
            .Select(group => new { Id = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.Id, item => item.Count, cancellationToken);
        var sendouts = await dbContext.LabNgsSendouts.AsNoTracking()
            .Where(sendout => batchIds.Contains(sendout.LabOperationalBatchId))
            .ToDictionaryAsync(sendout => sendout.LabOperationalBatchId, cancellationToken);
        var sendoutIds = sendouts.Values.Select(sendout => sendout.Id).ToArray();
        var versions = await dbContext.LabVendorResultsVersions.AsNoTracking()
            .Where(version => sendoutIds.Contains(version.LabNgsSendoutId))
            .Select(version => new { version.Id, version.LabNgsSendoutId, version.ResultVersion })
            .ToListAsync(cancellationToken);
        var latestVersions = versions.GroupBy(version => version.LabNgsSendoutId)
            .ToDictionary(group => group.Key, group => group.MaxBy(version => version.ResultVersion)!);
        var latestIds = latestVersions.Values.Select(version => version.Id).ToArray();
        var exceptions = await dbContext.LabVendorLibraryExceptions.AsNoTracking()
            .Where(exception => latestIds.Contains(exception.LabVendorResultsVersionId)
                && members.Select(member => member.Id).Contains(exception.LabBatchMemberId))
            .ToListAsync(cancellationToken);
        var tubeIds = members.Where(member => member.SequencingContainerId.HasValue)
            .Select(member => member.SequencingContainerId!.Value).Distinct().ToArray();
        var tubes = await dbContext.LabContainers.AsNoTracking()
            .Where(tube => tube.LabWorkOrderId == work.Id && tubeIds.Contains(tube.Id))
            .ToDictionaryAsync(tube => tube.Id, tube => tube.Barcode, cancellationToken);
        var exceptionsByMember = exceptions.ToDictionary(exception => exception.LabBatchMemberId);

        return batches.Select(batch =>
        {
            sendouts.TryGetValue(batch.Id, out var sendout);
            var libraries = members.Where(member => member.LabOperationalBatchId == batch.Id).Select(member =>
            {
                exceptionsByMember.TryGetValue(member.Id, out var exception);
                return new LabJobSequencingLibraryDto(member.Id, member.LabLibraryId, member.LabSpecimenId,
                    member.LibraryKey, member.SequencingContainerId.HasValue
                        ? tubes.GetValueOrDefault(member.SequencingContainerId.Value) : null,
                    (exception?.Outcome ?? sendout?.Outcome)?.ToString(), exception?.Reason);
            }).ToList();
            var resultVersion = sendout is not null && latestVersions.TryGetValue(sendout.Id, out var latest)
                ? (int?)latest.ResultVersion : null;
            return new LabJobSequencingBatchDto(
                MapBatch(batch, counts.GetValueOrDefault(batch.Id), sendout?.Status.ToString(),
                    sendout?.Id, sendout?.Version, sendout,
                    sendout is null ? 0 : exceptions.Count(exception => exception.LabNgsSendoutId == sendout.Id), resultVersion),
                sendout?.SequencingStartedAtUtc, sendout?.SequencingCompletedAtUtc, libraries);
        }).ToList();
    }
}
