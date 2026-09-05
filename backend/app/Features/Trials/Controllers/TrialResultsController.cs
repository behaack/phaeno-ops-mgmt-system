namespace PhaenoPortal.App.Features.Trials.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Trials.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Trials.DTOs;
using PhaenoPortal.App.Features.Trials.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;
using static Services.TrialAccess;

[ApiController, Authorize, Route("api/trials/{id:guid}/results")]
public sealed class TrialResultsController(PSeqOperationsDbContext db, TrialAccess access, TrialWorkflowService workflow,
    TrialReader reader, TrialResultService results, OrderRequestContext orderContext, OrderIdempotencyService idempotency,
    IOptions<PSeqOrderToCashOptions> pseq, IOptions<OrderManagementOptions> options, IOperationalFileStorage storage,
    ReleasedDeliverableDownloadAttemptService attempts, ILogger<CompletionTrackedFileStreamResult> fileLogger,
    ILogger<CompletionTrackedArchiveResult> archiveLogger) : ControllerBase
{
    [HttpGet("candidates")]
    public async Task<IReadOnlyList<ResultPackageDto>> Candidates(Guid id, CancellationToken token)
    { var actor = await access.ReadAsync(HttpContext, token); return await results.CandidatesAsync(await workflow.ReadAsync(id, actor, token), actor, token); }
    [HttpPost("release")]
    public async Task<TrialDetailDto> Release(Guid id, TrialReleaseRequest request, CancellationToken token)
    {
        var actor = await ReleaseActorAsync(token);
        try
        {
            return (await idempotency.ExecuteAsync(actor.User.Id, $"trial:{id}:release", idempotency.RequireKey(HttpContext), request, async _ =>
            {
                var trial = await workflow.ReadAsync(id, actor, token); await results.ReleaseAsync(trial, actor, request, token);
                await db.SaveChangesAsync(token); return await reader.DetailAsync(trial, actor, token);
            }, cancellationToken: token, concurrencyScope: $"trial:{id}")).Response;
        }
        catch (ArgumentException error) { throw Error("trial_release_invalid", error.Message); }
        catch (InvalidOperationException error) { throw Error("trial_release_conflict", error.Message, 409); }
    }
    [HttpPost("releases/{releaseId:guid}/withdraw")]
    public async Task<TrialDetailDto> Withdraw(Guid id, Guid releaseId, TrialActionRequest request, CancellationToken token)
    {
        var actor = await ReleaseActorAsync(token);
        return (await idempotency.ExecuteAsync(actor.User.Id, $"trial:{id}:withdraw", idempotency.RequireKey(HttpContext), new { releaseId, request }, async _ =>
        {
            var trial = await workflow.ReadAsync(id, actor, token); Version(trial.Version, request.Version);
            var release = await db.TrialResultReleases.SingleOrDefaultAsync(value => value.Id == releaseId && value.TrialProjectId == id, token) ?? throw Missing();
            await using var retentionLock = await RetentionTransaction.OpenAsync(db, release.Id, token);
            release.Withdraw(TrialRules.Text(request.Reason));
            var ids = ReleasedDeliverableManifest.ReadFileIds(release.ManifestJson);
            foreach (var file in await db.ManagedOperationalFiles.Where(value => ids.Contains(value.Id)).ToListAsync(token)) file.Withdraw();
            workflow.Record(trial, actor, "ResultsWithdrawn", "Phaeno withdrew a Trial result release. Contact Phaeno for the next step.", new { releaseId, request.Reason });
            await db.SaveChangesAsync(token); return await reader.DetailAsync(trial, actor, token);
        }, cancellationToken: token, concurrencyScope: $"trial:{id}")).Response;
    }
    [HttpGet("files/{fileId:guid}/download"), SkipApiEnvelope]
    public async Task<IActionResult> Download(Guid id, Guid fileId, CancellationToken token)
    {
        var (actor, trial) = await DownloadActorAsync(id, token);
        var file = await db.ManagedOperationalFiles.AsNoTracking().SingleOrDefaultAsync(value => value.Id == fileId && value.WorkflowId == id
            && value.WorkflowType == "trial-project" && value.OrganizationId == trial.OrganizationId && value.Purpose == OperationalFilePurpose.TrialResult
            && value.ReleaseStatus == FileReleaseStatus.Released && value.ScanStatus == OperationalFileScanStatus.Clean, token) ?? throw Missing();
        var releases = await db.TrialResultReleases.AsNoTracking().Where(value => value.TrialProjectId == id && !value.IsWithdrawn).OrderByDescending(value => value.ReleaseVersion).ToListAsync(token);
        var release = releases.FirstOrDefault(value => (!trial.CompleteReleaseId.HasValue || value.IsCompletePackage) && ReleasedDeliverableManifest.ReadFileIds(value.ManifestJson).Contains(fileId)) ?? throw Missing();
        var transfer = await attempts.StartAsync([file], trial.OrganizationId!.Value, actor.User.Id, ReleasedDeliverablePackageType.TrialResult,
            release.Id, OperationalFileDownloadScope.IndividualFile, DateTime.UtcNow, HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.ToString(), token);
        Stream stream;
        try { stream = await storage.OpenReadAsync(file.StorageKey, token); }
        catch
        {
            await attempts.CompleteAsync(transfer.AttemptIds, OperationalFileDownloadOutcome.Failed, DateTime.UtcNow, "storage_open_failed", false, CancellationToken.None); throw;
        }
        return new CompletionTrackedFileStreamResult(stream, file.ContentType, file.FileName, Request.Headers.ContainsKey(HeaderNames.Range), transfer, attempts, fileLogger);
    }
    [HttpGet("releases/{releaseId:guid}/download"), SkipApiEnvelope]
    public async Task<IActionResult> DownloadPackage(Guid id, Guid releaseId, CancellationToken token)
    {
        var (actor, trial) = await DownloadActorAsync(id, token);
        var release = await db.TrialResultReleases.AsNoTracking().SingleOrDefaultAsync(value => value.Id == releaseId && value.TrialProjectId == id && !value.IsWithdrawn, token) ?? throw Missing();
        if (trial.CompleteReleaseId.HasValue && !release.IsCompletePackage)
            throw Error("trial_complete_package_available", "Open the complete Trial package to download its current archive.", 409);
        var ids = ReleasedDeliverableManifest.ReadFileIds(release.ManifestJson);
        var files = await db.ManagedOperationalFiles.AsNoTracking().Where(value => ids.Contains(value.Id) && value.OrganizationId == trial.OrganizationId
            && value.WorkflowId == id && value.Purpose == OperationalFilePurpose.TrialResult && value.ReleaseStatus == FileReleaseStatus.Released && value.ScanStatus == OperationalFileScanStatus.Clean).ToListAsync(token);
        if (files.Count == 0 || files.Count != ids.Count) throw Missing();
        var transfer = await attempts.StartAsync(files, trial.OrganizationId!.Value, actor.User.Id, ReleasedDeliverablePackageType.TrialResult, release.Id,
            OperationalFileDownloadScope.PackageArchive, DateTime.UtcNow, HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.ToString(), token);
        return new CompletionTrackedArchiveResult(files.Select(value => new ReleasedDeliverableArchiveFile(value.Id, value.StorageKey, value.FileName, value.ReleasedAt)).ToList(),
            $"{trial.Number}-results-r{release.ReleaseVersion}.zip", transfer, storage, attempts, archiveLogger, release.ManifestJson);
    }
    private async Task<TrialActor> ReleaseActorAsync(CancellationToken token)
    {
        var actor = await access.ReadAsync(HttpContext, token); RequireStaff(actor);
        await orderContext.RequireBusinessRoleAsync(HttpContext, BusinessRole.ResultReleaseManager, pseq.Value.BusinessRoles || pseq.Value.DualControlEnforced, token);
        return actor;
    }
    private async Task<(TrialActor Actor, TrialProject Trial)> DownloadActorAsync(Guid id, CancellationToken token)
    {
        var actor = await access.ReadAsync(HttpContext, token); var trial = await workflow.ReadAsync(id, actor, token);
        if (actor.IsStaff || trial.IsOnHold || !options.Value.ReleasedDeliverableRetentionEnforcement)
            throw Error("trial_download_unavailable", "Trial downloads require an active organization membership and configured retention enforcement, with no Trial hold.", 403);
        return (actor, trial);
    }
}
