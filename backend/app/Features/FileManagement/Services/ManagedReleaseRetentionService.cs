namespace PhaenoPortal.App.Features.FileManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

internal sealed record ManagedRelease(Guid OrganizationId, Guid WorkflowId, Guid DepartmentId,
    FileReleaseStatus Status, IReadOnlyCollection<Guid> FileIds, Guid? SampleId = null, bool IsDiscarded = false);

internal sealed class ManagedReleaseRetentionService(PSeqOperationsDbContext db)
{
    public async Task<ManagedRelease?> ReadPackageAsync(ReleasedDeliverablePackageType type, Guid packageId, CancellationToken token)
    {
        if (type == ReleasedDeliverablePackageType.LabResult)
        {
            var value = await (from release in db.LabResultReleases.AsNoTracking()
                join order in db.LabServiceOrders on release.LabServiceOrderId equals order.Id
                where release.Id == packageId && release.OrganizationId == order.OrganizationId
                select new { release, order.DepartmentId, order.IsDiscarded }).SingleOrDefaultAsync(token);
            return value is null ? null : new(value.release.OrganizationId, value.release.LabServiceOrderId,
                value.DepartmentId, value.release.ReleaseStatus, ReleasedDeliverableManifest.ReadFileIds(value.release.ManifestJson), value.release.LabSampleId, value.IsDiscarded);
        }
        if (type == ReleasedDeliverablePackageType.AssemblyOutput)
        {
            var value = await (from release in db.AssemblyOutputReleases.AsNoTracking()
                join request in db.DataAssemblyRequests on release.DataAssemblyRequestId equals request.Id
                where release.Id == packageId && release.OrganizationId == request.OrganizationId
                select new { release, request.DepartmentId, request.IsDiscarded }).SingleOrDefaultAsync(token);
            if (value is null) return null;
            var ids = await db.ManagedOperationalFiles.AsNoTracking().Where(file => file.OrganizationId == value.release.OrganizationId
                && file.WorkflowId == value.release.DataAssemblyRequestId && file.ParentRecordId == packageId
                && file.Purpose == OperationalFilePurpose.AssemblyOutput).Select(file => file.Id).ToListAsync(token);
            return new(value.release.OrganizationId, value.release.DataAssemblyRequestId, value.DepartmentId, value.release.ReleaseStatus, ids, IsDiscarded: value.IsDiscarded);
        }
        throw new ArgumentException("A Lab or Assembly release is required.", nameof(type));
    }

    public Task<ReleasedDeliverableRetentionSnapshot?> ReadSnapshotAsync(ReleasedDeliverablePackageType type,
        Guid packageId, Guid organizationId, CancellationToken token) => db.ReleasedDeliverableRetentionSnapshots.AsNoTracking()
        .SingleOrDefaultAsync(value => value.OrganizationId == organizationId
            && (type == ReleasedDeliverablePackageType.LabResult ? value.LabResultReleaseId == packageId : value.AssemblyOutputReleaseId == packageId), token);

    public async Task<ReleasedDeliverableRetentionDecision?> DecideAsync(ReleasedDeliverablePackageType type, Guid packageId,
        ManagedRelease package, DateTime now, bool persist, CancellationToken token)
    {
        var snapshot = await ReadSnapshotAsync(type, packageId, package.OrganizationId, token);
        if (snapshot is null) return null; // Earlier releases keep their existing contract, without manufactured dates.
        var attempts = await db.OperationalFileDownloads.AsNoTracking().Where(value => value.ReleasedPackageType == type
            && value.ReleasedPackageId == packageId && value.OrganizationId == package.OrganizationId).ToListAsync(token);
        var commits = await new DownloadCommitEvidenceService(db).ReadCompletionsAsync(attempts, token);
        var download = ReleasedDeliverableDownloadProjection.Create(package.FileIds, attempts, now, commits);
        var decision = ReleasedDeliverableRetentionDecision.Evaluate(snapshot, download.Files.Values.Select(value => value.DownloadedAtUtc).ToList(), now);
        if (persist && now >= snapshot.StandardDeletionAtUtc)
        {
            var tracked = await db.ReleasedDeliverableRetentionSnapshots.SingleAsync(value => value.Id == snapshot.Id, token);
            await db.Entry(tracked).ReloadAsync(token);
            tracked.ApplyDeadlineDecision(decision, now);
        }
        return decision;
    }

    public async Task<bool> HasAccessAsync(ReleasedDeliverablePackageType type, Guid packageId, Guid organizationId,
        Guid userId, IReadOnlyCollection<Guid> fileIds, CancellationToken token)
    {
        if (await db.ReleasedDeliverableRetentionSnapshots.AnyAsync(value => value.OrganizationId == organizationId
            && (type == ReleasedDeliverablePackageType.LabResult ? value.LabResultReleaseId == packageId : value.AssemblyOutputReleaseId == packageId)
            && (value.IsQuarantined || value.ByteDeletedAtUtc != null), token)) return false;
        var package = await ReadPackageAsync(type, packageId, token);
        if (package is null || package.OrganizationId != organizationId || package.IsDiscarded || package.Status != FileReleaseStatus.Released
            || fileIds.Count == 0 || fileIds.Any(id => !package.FileIds.Contains(id))) return false;
        if (!await db.OrganizationMemberships.AsNoTracking().AnyAsync(member => member.OrganizationId == organizationId
            && member.UserId == userId && member.IsActive && member.Organization!.IsActive
            && member.Organization.Kind == (type == ReleasedDeliverablePackageType.LabResult ? OrganizationKind.Customer : OrganizationKind.Partner)
            && member.User!.IsActive
            && member.User.Status == UserAccountStatus.Active
            && db.OrganizationDepartments.Any(department => department.Id == package.DepartmentId && department.OrganizationId == organizationId && department.IsActive)
            && (member.IsOrganizationAdmin || db.OrganizationDepartmentMemberships.Any(access => access.OrganizationMembershipId == member.Id
                && access.DepartmentId == package.DepartmentId && access.IsActive)), token)) return false;
        var purpose = type == ReleasedDeliverablePackageType.LabResult ? OperationalFilePurpose.LabResult : OperationalFilePurpose.AssemblyOutput;
        return await db.ManagedOperationalFiles.AsNoTracking().CountAsync(file => fileIds.Contains(file.Id)
            && file.OrganizationId == organizationId && file.WorkflowId == package.WorkflowId && file.Purpose == purpose
            && (type == ReleasedDeliverablePackageType.LabResult ? file.ParentRecordId == package.SampleId : file.ParentRecordId == packageId)
            && file.ReleaseStatus == FileReleaseStatus.Released && file.ScanStatus == OperationalFileScanStatus.Clean, token) == fileIds.Count;
    }

    // Identifiers come exclusively from EF metadata; values are bound parameters. Match the existing authority lock order.
#pragma warning disable EF1002
    public async Task LockAuthorityAsync(ReleasedDeliverablePackageType type, Guid packageId, Guid organizationId,
        Guid userId, IReadOnlyCollection<Guid> fileIds, CancellationToken token)
    {
        async Task Lock<T>(Guid id) where T : class
        {
            var entity = db.Model.FindEntityType(typeof(T))!;
            var table = $"\"{entity.GetSchema()!.Replace("\"", "\"\"")}\".\"{entity.GetTableName()!.Replace("\"", "\"\"")}\"";
            await db.Database.ExecuteSqlRawAsync($"SELECT id FROM {table} WHERE id = {{0}} FOR SHARE", [id], token);
        }
        await Lock<Organization>(organizationId);
        await Lock<User>(userId);
        if (type == ReleasedDeliverablePackageType.LabResult) await Lock<LabResultRelease>(packageId);
        else await Lock<AssemblyOutputRelease>(packageId);
        var package = await ReadPackageAsync(type, packageId, token) ?? throw Denied();
        if (type == ReleasedDeliverablePackageType.LabResult) await Lock<LabServiceOrder>(package.WorkflowId);
        else await Lock<DataAssemblyRequest>(package.WorkflowId);
        await Lock<OrganizationDepartment>(package.DepartmentId);
        var members = await db.OrganizationMemberships.AsNoTracking().Where(value => value.OrganizationId == organizationId && value.UserId == userId)
            .Select(value => value.Id).Order().ToListAsync(token);
        foreach (var member in members)
        {
            await Lock<OrganizationMembership>(member);
            var assignments = await db.OrganizationDepartmentMemberships.AsNoTracking().Where(value => value.OrganizationMembershipId == member
                && value.DepartmentId == package.DepartmentId).Select(value => value.Id).Order().ToListAsync(token);
            foreach (var assignment in assignments) await Lock<OrganizationDepartmentMembership>(assignment);
        }
        foreach (var id in fileIds.Order()) await Lock<ManagedOperationalFile>(id);
    }
#pragma warning restore EF1002
    internal static OrderManagementException Denied() => new("released_deliverable_access_unavailable",
        "This released file is no longer available to your current account. Refresh the release before trying again.", StatusCodes.Status403Forbidden);
    internal static OrderManagementException Cutoff() => new("released_deliverable_retention_cutoff_reached",
        "The download period changed or has ended. Refresh the release before trying again or contact Phaeno.", StatusCodes.Status410Gone);
}
