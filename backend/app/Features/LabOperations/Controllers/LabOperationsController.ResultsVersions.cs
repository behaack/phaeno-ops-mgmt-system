namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed partial class LabOperationsController
{
    [HttpGet("batches/{batchId:guid}/results/versions")]
    public async Task<IReadOnlyList<VendorResultsVersionSummary>> VendorResultsVersions(Guid batchId, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, Enum.GetValues<LabRole>());
        var sendoutId = await dbContext.LabNgsSendouts.AsNoTracking().Where(sendout => sendout.LabOperationalBatchId == batchId)
            .Select(sendout => (Guid?)sendout.Id).SingleOrDefaultAsync(ct);
        if (!await dbContext.LabOperationalBatches.AnyAsync(batch => batch.Id == batchId, ct)) throw Missing();
        if (!sendoutId.HasValue) return [];
        var versions = await dbContext.LabVendorResultsVersions.AsNoTracking().Where(version => version.LabNgsSendoutId == sendoutId)
            .OrderByDescending(version => version.ResultVersion)
            .Select(version => new { version.Id, version.ResultVersion, version.RecordedAtUtc, version.RecordedByUserId, version.RecordedByName, version.Note })
            .Take(1001).ToListAsync(ct);
        if (versions.Count > 1000) throw Conflict("results_version_history_limit", "Too many result versions to display. Contact an administrator.");
        var current = versions.FirstOrDefault()?.ResultVersion;
        return versions.Select(version => new VendorResultsVersionSummary(version.Id, version.ResultVersion, version.RecordedAtUtc,
            version.RecordedByUserId, version.RecordedByName, version.Note, version.ResultVersion == current)).ToList();
    }

    [HttpGet("batches/{batchId:guid}/results/versions/{resultVersion:int:min(1)}")]
    public async Task<VendorResultsVersionDetail> VendorResultsVersion(Guid batchId, int resultVersion, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, Enum.GetValues<LabRole>());
        var sendoutId = await dbContext.LabNgsSendouts.AsNoTracking().Where(sendout => sendout.LabOperationalBatchId == batchId)
            .Select(sendout => (Guid?)sendout.Id).SingleOrDefaultAsync(ct) ?? throw Missing();
        var version = await dbContext.LabVendorResultsVersions.AsNoTracking().SingleOrDefaultAsync(version => version.LabNgsSendoutId == sendoutId
            && version.ResultVersion == resultVersion, ct) ?? throw Missing();
        var latest = await dbContext.LabVendorResultsVersions.Where(row => row.LabNgsSendoutId == sendoutId).MaxAsync(row => row.ResultVersion, ct);
        var snapshot = JsonSerializer.Deserialize<VendorResultsSnapshot>(version.SnapshotJson, JsonOptions)
            ?? throw Invalid("results_snapshot_invalid", "This result version could not be read.");
        return new(new(version.Id, version.ResultVersion, version.RecordedAtUtc, version.RecordedByUserId,
            version.RecordedByName, version.Note, version.ResultVersion == latest), snapshot);
    }
}
