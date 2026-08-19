namespace PhaenoPortal.App.Features.FileManagement.Services;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record ReleasedDeliverableDownloadTransfer(
    Guid TransferId,
    IReadOnlyList<Guid> AttemptIds,
    DateTime LeaseExpiresAtUtc);

public sealed class ReleasedDeliverableDownloadAttemptService(
    PSeqOperationsDbContext dbContext,
    IOptions<OrderManagementOptions> options,
    ILogger<ReleasedDeliverableDownloadAttemptService> logger)
{
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

    public async Task<bool> CompleteAsync(
        IReadOnlyCollection<Guid> attemptIds,
        OperationalFileDownloadOutcome outcome,
        DateTime terminalAtUtc,
        string? terminalReasonCode,
        bool countsForReleasedPackageRetention,
        CancellationToken cancellationToken)
    {
        var distinctIds = attemptIds.Where(id => id != Guid.Empty).Distinct().ToList();
        if (distinctIds.Count == 0) throw new ArgumentException("At least one download attempt is required.", nameof(attemptIds));

        var attempts = await dbContext.OperationalFileDownloads
            .Where(attempt => distinctIds.Contains(attempt.Id))
            .ToListAsync(cancellationToken);
        if (attempts.Count != distinctIds.Count)
        {
            logger.LogError(
                "Download transfer terminal state could not be recorded because {MissingCount} attempt rows were missing.",
                distinctIds.Count - attempts.Count);
            return false;
        }

        if (attempts.Any(attempt => attempt.Outcome != OperationalFileDownloadOutcome.Started))
        {
            logger.LogInformation(
                "Download transfer {TransferId} already reached a terminal state.",
                attempts[0].TransferId);
            return false;
        }

        foreach (var attempt in attempts)
        {
            attempt.Complete(
                outcome,
                terminalAtUtc,
                terminalReasonCode,
                countsForReleasedPackageRetention);
        }

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            logger.LogInformation(
                "A concurrent terminal event won download transfer {TransferId}.",
                attempts[0].TransferId);
            return false;
        }
    }
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
