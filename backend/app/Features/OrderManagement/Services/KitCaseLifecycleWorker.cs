namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class KitCaseLifecycleOptions
{
    // Activation requires explicit approval. Existing deployments remain disabled.
    public bool Enabled { get; set; }
}

/// <summary>Opt-in expiry and original-invoice payment checks; disabled until separately activated.</summary>
public sealed class KitCaseLifecycleWorker(IServiceScopeFactory scopes, IOptions<KitCaseLifecycleOptions> options,
    ILogger<KitCaseLifecycleWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.Enabled) return;
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
                var now = DateTime.UtcNow;
                var ids = await db.KitAssemblyCases.AsNoTracking().Where(x =>
                    (x.FirstSubmittedAt == null && x.SubmissionDeadlineAt < now
                        && (x.Status == KitAssemblyCaseStatus.AwaitingSubmission || x.Status == KitAssemblyCaseStatus.PreparingInputs))
                    || (x.Status == KitAssemblyCaseStatus.InProgress && x.AssemblyRequestId != null
                        && db.DataAssemblyRequests.Any(r => r.Id == x.AssemblyRequestId
                            && (r.Status == AssemblyRequestStatus.OutputAvailable || r.Status == AssemblyRequestStatus.Completed))
                        && (db.OrganizationCommercialProfiles.Any(p => p.OrganizationId == x.OrganizationId && p.AssemblyCreditApproved)
                            || db.CommercialDocumentLinks.Any(d => d.Id == x.BillingDocumentId && d.Balance == 0))
                        && db.AssemblyOutputReleases.Any(r => r.DataAssemblyRequestId == x.AssemblyRequestId && r.ReleaseStatus == FileReleaseStatus.PaymentHold)))
                    .OrderBy(x => x.UpdatedAt).Select(x => x.Id).Take(100).ToListAsync(stoppingToken);
                foreach (var id in ids)
                {
                    using var itemScope = scopes.CreateScope();
                    try { await ProcessCaseAsync(itemScope.ServiceProvider, id, now, stoppingToken); }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { throw; }
                    catch (DbUpdateConcurrencyException) { /* Re-read user changes on the next cycle. */ }
                    catch (Exception exception) { logger.LogWarning(exception, "Kit case lifecycle check failed for {CaseId}.", id); }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception exception) { logger.LogWarning(exception, "Kit case lifecycle check could not run."); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    public static async Task ProcessCaseAsync(IServiceProvider services, Guid id, DateTime now, CancellationToken token)
    {
        var db = services.GetRequiredService<PSeqOperationsDbContext>();
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, token);
        var included = await db.KitAssemblyCases.Include(x => x.History).SingleAsync(x => x.Id == id, token);
        if (included.Expire(now)) await new KitBundleService(db).RefreshOrderCompletionAsync(included.PartnerReagentOrderId, token);
        else if (included.Status == KitAssemblyCaseStatus.InProgress && included.AssemblyRequestId.HasValue)
            await services.GetRequiredService<ManualCommercialReleaseService>().ApplyAssemblyReleaseGateAsync(included.AssemblyRequestId.Value,
                await new KitBundleService(db).ReadIncludedBalanceAsync(included.Id, token), token);
        KitBundleService.TrackNewHistory(db, included);
        await db.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
    }
}
