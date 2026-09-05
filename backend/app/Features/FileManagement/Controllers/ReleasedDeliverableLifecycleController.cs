namespace PhaenoPortal.App.Features.FileManagement.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record RetainedReleaseRow(Guid Id, Guid OrganizationId, string OrganizationName, string PackageType, Guid PackageId,
    DateTime ReleasedAtUtc, DateTime? DownloadAccessClosedAtUtc, DateTime? ByteDeletedAtUtc, string? DeletionOutcome, bool IsQuarantined);
public sealed record RetainedReleaseFile(Guid Id, string Name, long SizeBytes, string Sha256, DateTime? DownloadedAtUtc);
public sealed record RetainedReleaseAttempt(Guid Id, Guid FileId, Guid UserId, string UserName, string Scope, string Outcome,
    DateTime StartedAtUtc, DateTime? CompletedAtUtc, bool CompletedAfterCutoff);
public sealed record RetainedReleaseReissue(Guid Id, Guid OriginalSnapshotId, Guid ReplacementSnapshotId, DateTime AuthorizedAtUtc, string? Reason);
public sealed record RetainedReleaseReceipt(RetainedReleaseRow Release, ReleasedDeliverableRetentionDto Retention, Guid WorkflowId,
    string WorkflowPath, long Version, bool CanManage, bool CanQuarantine, DateTime GeneratedAtUtc, IReadOnlyList<RetainedReleaseFile> Files,
    IReadOnlyList<RetainedReleaseAttempt> Downloads, IReadOnlyList<ReleasedDeliverablePreservationHold> Holds, IReadOnlyList<RetainedReleaseReissue> Reissues, DateTime DeletionDueAtUtc, ReleasedReceiptLineage? Lineage);
public sealed record PlaceReleaseHoldRequest(long Version, ReleasedDeliverableHoldKind Kind, string Reason);
public sealed record ReleaseHoldRequest(long Version, string Reason);
public sealed record LinkReleaseReissueRequest(long Version, Guid ReplacementSnapshotId, string Reason);

[ApiController, Authorize, Route("api/file-management/releases")]
public sealed class ReleasedDeliverableLifecycleController(PSeqOperationsDbContext db, IExternalIdentityContext identity,
    ReleasedDeliverableLifecycleService lifecycle, IOptions<OrderManagementOptions> options, IOptions<PSeqOrderToCashOptions> pseq) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<RetainedReleaseRow>> List([FromQuery] Guid? organizationId, [FromQuery] string? search,
        [FromQuery] int skip = 0, [FromQuery] int take = 50, CancellationToken token = default)
    {
        await RequireAdmin(token);
        var query = from snapshot in db.ReleasedDeliverableRetentionSnapshots.AsNoTracking()
            join organization in db.Organizations on snapshot.OrganizationId equals organization.Id
            where (!organizationId.HasValue || organization.Id == organizationId)
                && (search == null || organization.Name.ToLower().Contains(search.ToLower()))
            orderby snapshot.ReleasedAtUtc descending, snapshot.Id
            select new { snapshot, organization.Name };
        var values = await query.Skip(Math.Max(0, skip)).Take(Math.Clamp(take, 1, 100)).ToListAsync(token);
        var result = new List<RetainedReleaseRow>();
        foreach (var value in values)
        {
            var package = await lifecycle.ReadPackageAsync(value.snapshot, token);
            if (package is not null) result.Add(Row(value.snapshot, value.Name, package));
        }
        return result;
    }

    [HttpGet("{id:guid}")]
    public async Task<RetainedReleaseReceipt> Read(Guid id, CancellationToken token)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(HttpContext, db, identity, token) ?? throw Error("active_actor_required", "Sign in to view this release.", 401);
        var snapshot = await Snapshot(id, token);
        var package = await lifecycle.ReadPackageAsync(snapshot, token) ?? throw Missing();
        var admin = AccountAuthorization.IsPlatformAdmin(actor);
        OrganizationMembership? membership = null;
        if (!admin)
        {
            if (!Guid.TryParse(HttpContext.Request.Headers["X-Organization-Id"].FirstOrDefault(), out var selected) || selected != snapshot.OrganizationId) throw Missing();
            membership = actor.Memberships.SingleOrDefault(value => value.OrganizationId == selected && value.IsActive && value.Organization is { IsActive: true });
            if (membership is null) throw Missing();
            var context = new OrderRequestContext(db, identity);
            var tenant = await context.RequireTenantAsync(HttpContext, membership.Organization!.Kind, false, token);
            if (!tenant.Membership.IsOrganizationAdmin && tenant.Department.Id != package.DepartmentId) throw Missing();
        }
        var attempts = await db.OperationalFileDownloads.AsNoTracking().Where(value => value.OrganizationId == snapshot.OrganizationId
            && value.ReleasedPackageId == package.Id && value.ReleasedPackageType == package.Type).ToListAsync(token);
        var now = DateTime.UtcNow;
        var commits = await new DownloadCommitEvidenceService(db).ReadCompletionsAsync(attempts, token);
        var projection = ReleasedDeliverableDownloadProjection.Create(package.Files.Select(value => value.Id).ToList(), attempts, now, commits);
        var decision = ReleasedDeliverableRetentionDecision.Evaluate(snapshot, projection.Files.Values.Select(value => value.DownloadedAtUtc).ToList(), now);
        var audit = new List<RetainedReleaseAttempt>();
        if (admin || membership!.IsOrganizationAdmin)
        {
            var actorIds = attempts.Select(value => value.UserId).Distinct().ToList();
            var names = await db.Users.AsNoTracking().Where(value => actorIds.Contains(value.Id)).ToDictionaryAsync(value => value.Id, value => value.FirstName + " " + value.LastName, token);
            audit.AddRange(attempts.OrderBy(value => value.StartedAtUtc).Select(value => new RetainedReleaseAttempt(value.Id, value.FileId, value.UserId,
                names.GetValueOrDefault(value.UserId, "Former member"), value.Scope.ToString(), value.Outcome.ToString(), value.StartedAtUtc,
                commits.GetValueOrDefault(value.Id), commits.GetValueOrDefault(value.Id) > decision.DeletionDueAtUtc && value.StartedAtUtc < decision.DeletionDueAtUtc)));
        }
        var name = await db.Organizations.Where(value => value.Id == snapshot.OrganizationId).Select(value => value.Name).SingleAsync(token);
        var path = package.Type == ReleasedDeliverablePackageType.AssemblyOutput ? $"/data-assembly/{package.WorkflowId:D}" : $"/lab-services/{package.WorkflowId:D}";
        return new(Row(snapshot, name, package), snapshot.ToDto(projection) with { GraceActivatedAtUtc = decision.GraceActivatedAtUtc, DownloadAccessClosedAtUtc = decision.DownloadAccessClosedAtUtc },
            package.WorkflowId, path, snapshot.Version, admin,
            package.Type == ReleasedDeliverablePackageType.PSeqResult ? pseq.Value.GovernedPSeqResults : options.Value.ReleasedDeliverableRetentionEnforcement,
            now, package.Files.Select(value => new RetainedReleaseFile(value.Id, value.Name, value.SizeBytes, value.Sha256, projection.Files[value.Id].DownloadedAtUtc)).ToList(), audit,
            admin ? await db.ReleasedDeliverablePreservationHolds.AsNoTracking().Where(value => value.RetentionSnapshotId == id).OrderByDescending(value => value.PlacedAtUtc).ToListAsync(token) : [],
            await db.ReleasedDeliverableReissues.AsNoTracking().Where(value => value.OriginalSnapshotId == id || value.ReplacementSnapshotId == id)
                .Select(value => new RetainedReleaseReissue(value.Id, value.OriginalSnapshotId, value.ReplacementSnapshotId, value.AuthorizedAtUtc, admin ? value.Reason : null)).ToListAsync(token),
            decision.DeletionDueAtUtc, snapshot.ReceiptLineageJson is null ? null : JsonSerializer.Deserialize<ReleasedReceiptLineage>(snapshot.ReceiptLineageJson));
    }

    [HttpPost("{id:guid}/holds")]
    public async Task<RetainedReleaseReceipt> PlaceHold(Guid id, PlaceReleaseHoldRequest request, CancellationToken token)
    {
        var actor = await RequireAdmin(token); var snapshot = await Snapshot(id, token);
        var package = await lifecycle.ReadPackageAsync(snapshot, token) ?? throw Missing();
        await using var transaction = await RetentionTransaction.OpenAsync(db, package.Id, token);
        await db.Entry(snapshot).ReloadAsync(token); Version(snapshot.Version, request.Version);
        if (snapshot.ByteDeletedAtUtc.HasValue) throw Error("release_already_deleted", "Deleted bytes cannot be preserved.", 409);
        if (request.Kind == ReleasedDeliverableHoldKind.Quarantine && !(package.Type == ReleasedDeliverablePackageType.PSeqResult ? pseq.Value.GovernedPSeqResults : options.Value.ReleasedDeliverableRetentionEnforcement))
            throw Error("release_monitoring_required", "Active download monitoring must be enabled before quarantine can be used.", 409);
        if (!Enum.IsDefined(request.Kind)) throw Error("invalid_hold_kind", "Choose a supported hold type.", 400);
        var hold = new ReleasedDeliverablePreservationHold(id, request.Kind, actor.Id, Reason(request.Reason), DateTime.UtcNow);
        db.Add(hold); if (request.Kind == ReleasedDeliverableHoldKind.Quarantine) snapshot.SetQuarantine(true);
        snapshot.RequestCleanupRetry(); snapshot.MarkUpdated(DateTime.UtcNow, actor.Id); await db.SaveChangesAsync(token); await transaction.CommitAsync(token); return await Read(id, token);
    }

    [HttpPost("{id:guid}/holds/{holdId:guid}/release")]
    public async Task<RetainedReleaseReceipt> ReleaseHold(Guid id, Guid holdId, ReleaseHoldRequest request, CancellationToken token)
    {
        var actor = await RequireAdmin(token); var snapshot = await Snapshot(id, token);
        var package = await lifecycle.ReadPackageAsync(snapshot, token) ?? throw Missing();
        await using var transaction = await RetentionTransaction.OpenAsync(db, package.Id, token);
        var hold = await db.ReleasedDeliverablePreservationHolds.SingleOrDefaultAsync(value => value.Id == holdId && value.RetentionSnapshotId == id, token) ?? throw Missing();
        await db.Entry(hold).ReloadAsync(token); Version(hold.Version, request.Version);
        if (hold.ReleasedAtUtc.HasValue) throw Error("hold_already_released", "This hold was already released.", 409);
        hold.Release(actor.Id, Reason(request.Reason), DateTime.UtcNow);
        await db.Entry(snapshot).ReloadAsync(token);
        snapshot.SetQuarantine(await db.ReleasedDeliverablePreservationHolds.AnyAsync(value => value.RetentionSnapshotId == id && value.Id != holdId
            && value.Kind == ReleasedDeliverableHoldKind.Quarantine && value.ReleasedAtUtc == null, token));
        snapshot.RequestCleanupRetry(); snapshot.MarkUpdated(DateTime.UtcNow, actor.Id); await db.SaveChangesAsync(token); await transaction.CommitAsync(token); return await Read(id, token);
    }

    [HttpGet("{id:guid}/reissue-candidates")]
    public async Task<IReadOnlyList<RetainedReleaseRow>> Candidates(Guid id, CancellationToken token)
    {
        await RequireAdmin(token); var original = await Snapshot(id, token);
        if (!original.ByteDeletedAtUtc.HasValue) return [];
        var source = await lifecycle.ReadPackageAsync(original, token) ?? throw Missing();
        var snapshots = await db.ReleasedDeliverableRetentionSnapshots.AsNoTracking().Where(value => value.OrganizationId == original.OrganizationId
            && value.Id != id && value.ReleasedAtUtc >= original.ByteDeletedAtUtc && value.ByteDeletedAtUtc == null && !value.IsQuarantined
            && !db.ReleasedDeliverableReissues.Any(link => link.ReplacementSnapshotId == value.Id)).OrderByDescending(value => value.ReleasedAtUtc).ToListAsync(token);
        var result = new List<RetainedReleaseRow>();
        var name = await db.Organizations.Where(value => value.Id == original.OrganizationId).Select(value => value.Name).SingleAsync(token);
        foreach (var snapshot in snapshots)
        {
            var target = await lifecycle.ReadPackageAsync(snapshot, token);
            if (target is not null && source.Type == target.Type && source.WorkflowId == target.WorkflowId && source.SampleId == target.SampleId && target.Released
                && target.ExpectedFiles > 0 && target.Files.Count == target.ExpectedFiles && target.Files.All(value => value.Clean)
                && !source.Files.Select(value => value.StorageKey).Intersect(target.Files.Select(value => value.StorageKey)).Any()) result.Add(Row(snapshot, name, target));
        }
        return result;
    }

    [HttpPost("{id:guid}/reissues")]
    public async Task<RetainedReleaseReceipt> LinkReissue(Guid id, LinkReleaseReissueRequest request, CancellationToken token)
    {
        var actor = await RequireAdmin(token); var original = await Snapshot(id, token); var replacement = await Snapshot(request.ReplacementSnapshotId, token);
        var source = await lifecycle.ReadPackageAsync(original, token) ?? throw Missing();
        var target = await lifecycle.ReadPackageAsync(replacement, token) ?? throw Missing();
        var ids = new[] { source.Id, target.Id }.Distinct().Order().ToArray();
        await using var transaction = await RetentionTransaction.OpenAsync(db, ids[0], token);
        foreach (var packageId in ids.Skip(1)) { await using var nested = await RetentionTransaction.OpenAsync(db, packageId, token); }
        await db.Entry(original).ReloadAsync(token); await db.Entry(replacement).ReloadAsync(token); Version(original.Version, request.Version);
        source = await lifecycle.ReadPackageAsync(original, token) ?? throw Missing();
        target = await lifecycle.ReadPackageAsync(replacement, token) ?? throw Missing();
        if (original.Id == replacement.Id || original.OrganizationId != replacement.OrganizationId || source.Type != target.Type || source.WorkflowId != target.WorkflowId || source.SampleId != target.SampleId
            || !original.ByteDeletedAtUtc.HasValue || replacement.ReleasedAtUtc < original.ByteDeletedAtUtc || replacement.ByteDeletedAtUtc.HasValue || replacement.IsQuarantined
            || !target.Released || target.Files.Count == 0 || target.Files.Count != target.ExpectedFiles || target.Files.Any(value => !value.Clean)
            || source.Files.Select(value => value.StorageKey).Intersect(target.Files.Select(value => value.StorageKey)).Any())
            throw Error("invalid_release_reissue", "Choose a newly released, complete replacement for the same workflow after the original was deleted. Old storage objects cannot be reused.", 409);
        if (await db.ReleasedDeliverableReissues.AnyAsync(value => value.ReplacementSnapshotId == replacement.Id, token)) throw Error("release_reissue_exists", "This replacement already has reissue lineage.", 409);
        db.Add(new ReleasedDeliverableReissue(id, replacement.Id, actor.Id, Reason(request.Reason), DateTime.UtcNow));
        original.MarkUpdated(DateTime.UtcNow, actor.Id);
        await db.SaveChangesAsync(token); await transaction.CommitAsync(token); return await Read(id, token);
    }

    private async Task<User> RequireAdmin(CancellationToken token)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(HttpContext, db, identity, token);
        if (actor is null || !AccountAuthorization.IsPlatformAdmin(actor)) throw Error("file_management_configuration_required", "A Phaeno administrator is required.", 403);
        return actor;
    }
    private async Task<ReleasedDeliverableRetentionSnapshot> Snapshot(Guid id, CancellationToken token) =>
        await db.ReleasedDeliverableRetentionSnapshots.SingleOrDefaultAsync(value => value.Id == id, token) ?? throw Missing();
    private static RetainedReleaseRow Row(ReleasedDeliverableRetentionSnapshot value, string name, RetainedPackage package) => new(value.Id, value.OrganizationId, name,
        package.Type.ToString(), package.Id, value.ReleasedAtUtc, value.DownloadAccessClosedAtUtc, value.ByteDeletedAtUtc, value.DeletionOutcome, value.IsQuarantined);
    private static void Version(long current, long supplied) { if (current != supplied) throw Error("release_version_conflict", "This record changed. Refresh it and review before retrying.", 409); }
    private static string Reason(string value) { try { return ReleasedDeliverablePolicyDefault.NormalizeReason(value); } catch (ArgumentException) { throw Error("release_reason_required", "Enter a reason of 1 to 2,000 characters.", 400); } }
    private static FileManagementException Missing() => Error("released_deliverable_not_found", "The retained release was not found.", 404);
    private static FileManagementException Error(string code, string message, int status) => new(code, message, status);
}
