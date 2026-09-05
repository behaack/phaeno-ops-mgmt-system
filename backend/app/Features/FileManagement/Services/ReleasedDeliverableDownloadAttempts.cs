namespace PhaenoPortal.App.Features.FileManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record ReleasedDeliverableDownloadTransfer(
    Guid TransferId,
    IReadOnlyList<Guid> AttemptIds,
    DateTime LeaseExpiresAtUtc,
    bool MonitorAccess = false);

public sealed class ReleasedDeliverableDownloadAttemptService(
    PSeqOperationsDbContext dbContext,
    IOptions<OrderManagementOptions> options,
    ILogger<ReleasedDeliverableDownloadAttemptService> logger,
    DownloadCommitEvidenceService? commitEvidence = null)
{
    private readonly DownloadCommitEvidenceService commits = commitEvidence ?? new(dbContext);
    public async Task<ReleasedDeliverableDownloadTransfer> StartAsync(
        IReadOnlyCollection<ManagedOperationalFile> files,
        Guid organizationId,
        Guid userId,
        ReleasedDeliverablePackageType packageType,
        Guid packageId,
        OperationalFileDownloadScope scope,
        DateTime startedAtUtc,
        string? remoteAddress,
        string? userAgent,
        CancellationToken cancellationToken)
    {
        if (files.Count == 0) throw new ArgumentException("At least one released file is required.", nameof(files));
        if (files.Any(file => file.OrganizationId != organizationId))
            throw new ArgumentException("Every download file must belong to the authorized organization.", nameof(files));
        if (files.Select(file => file.Id).Distinct().Count() != files.Count)
            throw new ArgumentException("A download transfer cannot contain a file more than once.", nameof(files));

        if (await dbContext.ReleasedDeliverableRetentionSnapshots.AnyAsync(value => value.OrganizationId == organizationId
            && (packageType == ReleasedDeliverablePackageType.LabResult ? value.LabResultReleaseId == packageId : value.AssemblyOutputReleaseId == packageId)
            && (value.IsQuarantined || value.ByteDeletedAtUtc != null), cancellationToken)) throw ManagedReleaseRetentionService.Denied();
        if (options.Value.ReleasedDeliverableRetentionEnforcement)
            return await StartManagedAsync(files, organizationId, userId, packageType, packageId, scope,
                remoteAddress, userAgent, cancellationToken);

        var transferId = Guid.NewGuid();
        var leaseExpiresAtUtc = startedAtUtc.Add(options.Value.DownloadLeaseDuration);
        var attempts = files.Select(file => new OperationalFileDownload(
            transferId,
            file.Id,
            organizationId,
            userId,
            packageType,
            packageId,
            scope,
            startedAtUtc,
            leaseExpiresAtUtc,
            remoteAddress,
            userAgent)).ToList();

        dbContext.OperationalFileDownloads.AddRange(attempts);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new ReleasedDeliverableDownloadTransfer(
            transferId,
            attempts.Select(attempt => attempt.Id).ToList(),
            leaseExpiresAtUtc);
    }

    private async Task<ReleasedDeliverableDownloadTransfer> StartManagedAsync(IReadOnlyCollection<ManagedOperationalFile> files,
        Guid organizationId, Guid userId, ReleasedDeliverablePackageType type, Guid packageId,
        OperationalFileDownloadScope scope, string? remoteAddress, string? userAgent, CancellationToken token)
    {
        await commits.EnsureTransferReadyAsync(token);
        await using var transaction = await RetentionTransaction.OpenAsync(dbContext, packageId, token);
        var retention = new ManagedReleaseRetentionService(dbContext);
        var fileIds = files.Select(value => value.Id).ToList();
        await retention.LockAuthorityAsync(type, packageId, organizationId, userId, fileIds, token);
        var package = await retention.ReadPackageAsync(type, packageId, token) ?? throw ManagedReleaseRetentionService.Denied();
        if (!await retention.HasAccessAsync(type, packageId, organizationId, userId, fileIds, token)
            || (scope == OperationalFileDownloadScope.PackageArchive && !fileIds.ToHashSet().SetEquals(package.FileIds)))
            throw ManagedReleaseRetentionService.Denied();
        var now = await RetentionTransaction.ClockAsync(dbContext, token);
        var decision = await retention.DecideAsync(type, packageId, package, now, true, token);
        if (decision is { IsDownloadAvailable: false }) throw ManagedReleaseRetentionService.Cutoff();
        var transferId = Guid.NewGuid();
        var expires = now.Add(options.Value.DownloadLeaseDuration);
        var attempts = files.Select(file => new OperationalFileDownload(transferId, file.Id, organizationId, userId,
            type, packageId, scope, now, expires, remoteAddress, userAgent)).ToList();
        dbContext.OperationalFileDownloads.AddRange(attempts);
        var admissions = new List<Guid>();
        foreach (var attempt in attempts)
            admissions.Add((await commits.CaptureAsync(attempt.Id, DownloadCommitPhase.Admission, decision?.DeletionDueAtUtc, token)).Id);
        await dbContext.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
        await commits.ResolveAsync(admissions, token);
        var admittedAt = await commits.ReadCommitAsync(admissions[0], token); // Every archive file shares this transaction.
        var ids = attempts.Select(value => value.Id).ToList();
        if (admittedAt >= expires || (decision is not null && admittedAt >= decision.DeletionDueAtUtc))
        {
            await CompleteAsync(ids, OperationalFileDownloadOutcome.Failed, admittedAt, "admission_committed_after_cutoff", false, token);
            throw ManagedReleaseRetentionService.Cutoff();
        }
        return new(transferId, ids, expires, MonitorAccess: true);
    }

    public async Task<ReleasedDeliverableDownloadTransfer> StartPSeqArtifactAsync(
        ResultOutputPackage package, ResultArtifact artifact, Guid userId, DateTime startedAtUtc, DateTime? admissionCutoffAtUtc,
        string? remoteAddress, string? userAgent, CancellationToken cancellationToken)
    {
        if (artifact.ResultOutputPackageId != package.Id || package.State != ResultOutputPackageState.Released
            || artifact.ScanState != ResultArtifactScanState.Clean || artifact.DeletedAtUtc.HasValue)
            throw new ArgumentException("A clean artifact from the released package is required.");
        if (admissionCutoffAtUtc.HasValue && startedAtUtc >= admissionCutoffAtUtc.Value)
            throw new OrderManagementException("result_retention_cutoff_reached",
                "The download period changed. Refresh the package before trying again.", StatusCodes.Status410Gone);
        await commits.EnsureTransferReadyAsync(cancellationToken);
        await using var transaction = await RetentionTransaction.OpenAsync(dbContext, package.Id, cancellationToken);
        await LockPSeqAuthorityAsync(dbContext, package.Id, artifact.Id, package.OrganizationId, userId, cancellationToken);
        if (!await HasPSeqAccessAsync(dbContext, package.Id, artifact.Id, package.OrganizationId, userId, cancellationToken))
            throw new OrderManagementException("result_access_revoked", "Result access is no longer available.", StatusCodes.Status403Forbidden);
        startedAtUtc = await RetentionTransaction.ClockAsync(dbContext, cancellationToken);
        await GovernedRetentionCheckpointService.ApplyDeadlineAsync(dbContext, package.Id, startedAtUtc, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        var currentPackage = await dbContext.ResultOutputPackages.AsNoTracking().SingleAsync(value => value.Id == package.Id, cancellationToken);
        var files = await dbContext.ResultArtifacts.AsNoTracking().Where(value => value.ResultOutputPackageId == package.Id).ToListAsync(cancellationToken);
        var current = (await new GovernedResultRetentionService(dbContext).ReadAsync([currentPackage], files, startedAtUtc, cancellationToken))[package.Id];
        if (!current.IsDownloadAvailable)
            throw new OrderManagementException("result_retention_cutoff_reached", "The download period has ended.", StatusCodes.Status410Gone);
        var transferId = Guid.NewGuid();
        var expires = startedAtUtc.Add(options.Value.DownloadLeaseDuration);
        var attempt = OperationalFileDownload.ForPSeqArtifact(transferId, artifact.Id,
            package.OrganizationId, userId, package.Id, startedAtUtc, expires, remoteAddress, userAgent);
        dbContext.OperationalFileDownloads.Add(attempt);
        var admission = await commits.CaptureAsync(attempt.Id, DownloadCommitPhase.Admission, current.AdmissionCutoffAtUtc, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        var admittedAt = await commits.ReadCommitAsync(admission.Id, cancellationToken);
        if (admittedAt >= expires || (admission.AdmissionCutoffAtUtc.HasValue && admittedAt >= admission.AdmissionCutoffAtUtc.Value))
        {
            await CompleteAsync([attempt.Id], OperationalFileDownloadOutcome.Failed, admittedAt,
                "admission_committed_after_cutoff", false, cancellationToken);
            throw new OrderManagementException("result_retention_cutoff_reached",
                "The download period changed before this transfer was admitted. Refresh the package before trying again.", StatusCodes.Status410Gone);
        }
        return new(transferId, [attempt.Id], expires, MonitorAccess: true);
    }

    public async Task<bool> CompleteAsync(IReadOnlyCollection<Guid> attemptIds, OperationalFileDownloadOutcome outcome,
        DateTime terminalAtUtc, string? terminalReasonCode, bool countsForReleasedPackageRetention, CancellationToken cancellationToken)
    {
        var ids = attemptIds.Where(id => id != Guid.Empty).Distinct().ToList();
        if (ids.Count == 0) throw new ArgumentException("At least one download attempt is required.", nameof(attemptIds));
        var sources = await dbContext.OperationalFileDownloads.AsNoTracking().Where(value => ids.Contains(value.Id))
            .Select(value => new { value.ReleasedPackageType, value.ReleasedPackageId, value.TransferId }).Distinct().ToListAsync(cancellationToken);
        if (sources.Count == 0) return false;
        if (sources.Count != 1) throw new ArgumentException("A terminal event belongs to one package transfer.");
        var source = sources[0];
        var pseq = source.ReleasedPackageType == ReleasedDeliverablePackageType.PSeqResult;
        var serialized = pseq || options.Value.ReleasedDeliverableRetentionEnforcement;
        if (serialized && outcome == OperationalFileDownloadOutcome.Succeeded)
            await commits.EnsureTransferReadyAsync(cancellationToken);
        await using var transaction = serialized ? await RetentionTransaction.OpenAsync(dbContext, source.ReleasedPackageId, cancellationToken) : null;
        var attempts = await dbContext.OperationalFileDownloads.Where(value => ids.Contains(value.Id)).ToListAsync(cancellationToken);
        if (attempts.Count != ids.Count) return false;
        foreach (var attempt in attempts) await dbContext.Entry(attempt).ReloadAsync(cancellationToken);
        if (attempts.Any(value => value.Outcome != OperationalFileDownloadOutcome.Started)) return false;
        // An archive terminal event always covers its complete admitted transfer.
        if (await dbContext.OperationalFileDownloads.CountAsync(value => value.TransferId == source.TransferId, cancellationToken) != ids.Count)
            throw new ArgumentException("Every file in the transfer must share its terminal event.");
        var retention = new ManagedReleaseRetentionService(dbContext);
        if (serialized)
        {
            var first = attempts[0];
            bool allowed;
            if (pseq)
            {
                await LockPSeqAuthorityAsync(dbContext, first.ReleasedPackageId, first.ResultArtifactId!.Value, first.OrganizationId, first.UserId, cancellationToken);
                allowed = await HasPSeqAccessAsync(dbContext, first.ReleasedPackageId, first.ResultArtifactId.Value, first.OrganizationId, first.UserId, cancellationToken);
            }
            else
            {
                var files = attempts.Select(value => value.FileId).ToList();
                await retention.LockAuthorityAsync(source.ReleasedPackageType, source.ReleasedPackageId, first.OrganizationId, first.UserId, files, cancellationToken);
                allowed = await retention.HasAccessAsync(source.ReleasedPackageType, source.ReleasedPackageId, first.OrganizationId, first.UserId, files, cancellationToken);
            }
            terminalAtUtc = await RetentionTransaction.ClockAsync(dbContext, cancellationToken);
            if (!allowed) { outcome = OperationalFileDownloadOutcome.Revoked; terminalReasonCode = "result_access_revoked"; countsForReleasedPackageRetention = false; }
            else if (attempts.Any(value => terminalAtUtc >= value.LeaseExpiresAtUtc))
            { outcome = OperationalFileDownloadOutcome.TimedOut; terminalReasonCode = "lease_expired"; countsForReleasedPackageRetention = false; }
        }
        var completionEvidence = new List<Guid>();
        foreach (var attempt in attempts)
        {
            attempt.Complete(outcome, terminalAtUtc, terminalReasonCode, countsForReleasedPackageRetention);
            if (serialized && outcome == OperationalFileDownloadOutcome.Succeeded && countsForReleasedPackageRetention)
            {
                completionEvidence.Add((await commits.CaptureAsync(attempt.Id, DownloadCommitPhase.Completion, null, cancellationToken)).Id);
                if (pseq) dbContext.ResultDeliveryEvidence.Add(new ResultDeliveryEvidence(attempt.ReleasedPackageId,
                    attempt.ResultArtifactId, ResultDeliveryEvidenceKind.Download, attempt.UserId, terminalAtUtc,
                    JsonSerializer.Serialize(new { attempt.TransferId, attempt.Id, outcome = "Succeeded" })));
            }
        }
        if (completionEvidence.Count > 0)
        {
            if (pseq) await GovernedRetentionCheckpointService.ApplyDeadlineAsync(dbContext, source.ReleasedPackageId, terminalAtUtc, cancellationToken);
            else
            {
                var package = await retention.ReadPackageAsync(source.ReleasedPackageType, source.ReleasedPackageId, cancellationToken) ?? throw ManagedReleaseRetentionService.Denied();
                await retention.DecideAsync(source.ReleasedPackageType, source.ReleasedPackageId, package, terminalAtUtc, true, cancellationToken);
            }
        }
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            if (transaction is not null) await transaction.CommitAsync(cancellationToken);
            await commits.ResolveAsync(completionEvidence, cancellationToken);
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            logger.LogInformation("A concurrent terminal event won download transfer {TransferId}.", source.TransferId);
            return false;
        }
    }

    internal async Task MonitorAccessAsync(ReleasedDeliverableDownloadTransfer transfer, Action stopStream, CancellationToken token)
    {
        try
        {
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));
            do
            {
                var attempts = await dbContext.OperationalFileDownloads.AsNoTracking().Where(value => transfer.AttemptIds.Contains(value.Id)).ToListAsync(token);
                if (attempts.Count != transfer.AttemptIds.Count || attempts.Any(value => value.Outcome == OperationalFileDownloadOutcome.Revoked))
                { stopStream(); return; }
                if (attempts.Any(value => value.Outcome != OperationalFileDownloadOutcome.Started)) return;
                var first = attempts[0];
                var allowed = first.ReleasedPackageType == ReleasedDeliverablePackageType.PSeqResult
                    ? await HasPSeqAccessAsync(dbContext, first.ReleasedPackageId, first.ResultArtifactId!.Value, first.OrganizationId, first.UserId, token)
                    : await new ManagedReleaseRetentionService(dbContext).HasAccessAsync(first.ReleasedPackageType, first.ReleasedPackageId,
                        first.OrganizationId, first.UserId, attempts.Select(value => value.FileId).ToList(), token);
                if (!allowed)
                {
                    stopStream();
                    await CompleteAsync(transfer.AttemptIds, OperationalFileDownloadOutcome.Revoked, DateTime.UtcNow, "result_access_revoked", false, CancellationToken.None);
                    return;
                }
            } while (await timer.WaitForNextTickAsync(token));
        }
        catch (OperationCanceledException) when (token.IsCancellationRequested) { }
        catch (Exception error) { stopStream(); logger.LogError(error, "Access monitoring failed closed for {TransferId}.", transfer.TransferId); }
    }

    // SQL identifiers come only from the EF model and are quoted/escaped; all values are bound parameters.
#pragma warning disable EF1002
    private static async Task LockPSeqAuthorityAsync(PSeqOperationsDbContext db, Guid packageId, Guid artifactId,
        Guid organizationId, Guid userId, CancellationToken token)
    {
        // Shared row locks make authority changes and terminal success commit in a durable order.
        // No row or advisory lock survives into the byte-transfer portion of a normal request.
        static string Table<T>(PSeqOperationsDbContext context) where T : class
        {
            var entity = context.Model.FindEntityType(typeof(T))!;
            return $"\"{entity.GetSchema()!.Replace("\"", "\"\"")}\".\"{entity.GetTableName()!.Replace("\"", "\"\"")}\"";
        }
        await db.Database.ExecuteSqlRawAsync($"SELECT id FROM {Table<Organization>(db)} WHERE id = {{0}} FOR SHARE", [organizationId], token);
        await db.Database.ExecuteSqlRawAsync($"SELECT id FROM {Table<User>(db)} WHERE id = {{0}} FOR SHARE", [userId], token);
        await db.Database.ExecuteSqlRawAsync($"SELECT id FROM {Table<ResultOutputPackage>(db)} WHERE id = {{0}} FOR SHARE", [packageId], token);
        var orderId = await db.ResultOutputPackages.AsNoTracking().Where(value => value.Id == packageId).Select(value => value.LabServiceOrderId).SingleAsync(token);
        await db.Database.ExecuteSqlRawAsync($"SELECT id FROM {Table<LabServiceOrder>(db)} WHERE id = {{0}} FOR SHARE", [orderId], token);
        var departmentId = await db.LabServiceOrders.AsNoTracking().Where(value => value.Id == orderId).Select(value => value.DepartmentId).SingleAsync(token);
        await db.Database.ExecuteSqlRawAsync($"SELECT id FROM {Table<OrganizationDepartment>(db)} WHERE id = {{0}} FOR SHARE", [departmentId], token);
        await db.Database.ExecuteSqlRawAsync($"SELECT id FROM {Table<OrganizationMembership>(db)} WHERE organization_id = {{0}} AND user_id = {{1}} FOR SHARE", [organizationId, userId], token);
        var membershipIds = await db.OrganizationMemberships.AsNoTracking().Where(value => value.OrganizationId == organizationId && value.UserId == userId).Select(value => value.Id).ToListAsync(token);
        foreach (var membershipId in membershipIds)
            await db.Database.ExecuteSqlRawAsync($"SELECT id FROM {Table<OrganizationDepartmentMembership>(db)} WHERE organization_membership_id = {{0}} AND department_id = {{1}} FOR SHARE", [membershipId, departmentId], token);
        await db.Database.ExecuteSqlRawAsync($"SELECT id FROM {Table<ResultArtifact>(db)} WHERE id = {{0}} FOR SHARE", [artifactId], token);
    }

#pragma warning restore EF1002

    internal static Task<bool> HasPSeqAccessAsync(PSeqOperationsDbContext db, Guid packageId, Guid artifactId,
        Guid organizationId, Guid userId, CancellationToken token) =>
        (from package in db.ResultOutputPackages.AsNoTracking()
         join order in db.LabServiceOrders on package.LabServiceOrderId equals order.Id
         join artifact in db.ResultArtifacts on package.Id equals artifact.ResultOutputPackageId
         where package.Id == packageId && package.OrganizationId == organizationId
             && package.State == ResultOutputPackageState.Released && artifact.Id == artifactId
             && artifact.ScanState == ResultArtifactScanState.Clean && artifact.DeletedAtUtc == null
             && !db.ResultRetentionSchedules.Any(schedule => schedule.ResultOutputPackageId == packageId
                 && db.ReleasedDeliverableRetentionSnapshots.Any(snapshot => snapshot.Id == schedule.RetentionSnapshotId && (snapshot.IsQuarantined || snapshot.ByteDeletedAtUtc != null)))
             && db.OrganizationMemberships.Any(membership => membership.OrganizationId == organizationId
                 && membership.UserId == userId && membership.IsActive && membership.Organization!.IsActive
                 && membership.User!.IsActive && membership.User.Status == UserAccountStatus.Active
                 && db.OrganizationDepartments.Any(department => department.Id == order.DepartmentId
                     && department.OrganizationId == organizationId && department.IsActive)
                 && (membership.IsOrganizationAdmin || db.OrganizationDepartmentMemberships.Any(access =>
                     access.OrganizationMembershipId == membership.Id && access.DepartmentId == order.DepartmentId && access.IsActive)))
         select package.Id).AnyAsync(token);
}

public sealed class ReleasedDeliverableDownloadAttemptReconciler(
    IServiceScopeFactory scopeFactory,
    IOptions<OrderManagementOptions> options,
    ILogger<ReleasedDeliverableDownloadAttemptReconciler> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(options.Value.DownloadReconciliationInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await ReconcileAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Expired download attempts could not be reconciled.");
            }
        }
    }

    private async Task ReconcileAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
        var utcNow = DateTime.UtcNow;
        var reconciled = await dbContext.OperationalFileDownloads
            .Where(attempt => attempt.Outcome == OperationalFileDownloadOutcome.Started
                && attempt.LeaseExpiresAtUtc <= utcNow)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(attempt => attempt.Outcome, OperationalFileDownloadOutcome.TimedOut)
                    .SetProperty(attempt => attempt.TerminalAtUtc, utcNow)
                    .SetProperty(attempt => attempt.CompletedAtUtc, (DateTime?)null)
                    .SetProperty(attempt => attempt.TerminalReasonCode, "lease_expired")
                    .SetProperty(attempt => attempt.CountsForReleasedPackageRetention, false)
                    .SetProperty(attempt => attempt.Version, attempt => attempt.Version + 1),
                cancellationToken);

        if (reconciled > 0)
        {
            logger.LogInformation("Reconciled {AttemptCount} expired download attempts.", reconciled);
        }
    }
}
