namespace PhaenoPortal.App.Features.OrderToCash;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.OrderToCash.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;

public sealed class AttentionOperationsService(
    PSeqOperationsDbContext dbContext,
    OperationalReadinessService readiness)
{
    public async Task RefreshAsync(DateTime utcNow, CancellationToken cancellationToken)
    {
        var invitations = await dbContext.InvitationDeliveryAttempts.AsNoTracking()
            .Where(value => value.State == InvitationDeliveryState.NeedsAttention)
            .Select(value => new Candidate("invitation_failure", nameof(InvitationDeliveryAttempt), value.Id,
                (Guid?)value.OrganizationId, BusinessRole.CommercialOperator.ToString(),
                "Correct the delivery problem. Revoke and replace hard-bounced invitations.", value.LastError))
            .ToListAsync(cancellationToken);

        var failedPackages = await dbContext.ResultOutputPackages.AsNoTracking()
            .Where(value => value.Status == ResultOutputPackageStatus.Failed)
            .Select(value => new Candidate("result_scanning_or_projection_failure", nameof(ResultOutputPackage),
                value.Id, (Guid?)value.OrganizationId, BusinessRole.ResultReleaseManager.ToString(),
                "Correct the package failure and register a new immutable version.", value.FailureReason))
            .ToListAsync(cancellationToken);
        var unreleasedPackages = await dbContext.ResultOutputPackages.AsNoTracking()
            .Where(value => value.Status == ResultOutputPackageStatus.ReadyForRelease)
            .Select(value => new Candidate("scientifically_approved_unreleased", nameof(ResultOutputPackage),
                value.Id, (Guid?)value.OrganizationId, BusinessRole.ResultReleaseManager.ToString(),
                "Review the approved package and release it to the Customer.", null))
            .ToListAsync(cancellationToken);
        var overdueInvoices = await dbContext.Invoices.AsNoTracking()
            .Where(value => (value.Status == InvoiceStatus.Issued || value.Status == InvoiceStatus.PartiallyPaid)
                && value.DueAtUtc < utcNow && value.Balance > 0)
            .Select(value => new Candidate("overdue_invoice", nameof(Invoice), value.Id,
                (Guid?)value.OrganizationId, BusinessRole.BillingOperator.ToString(),
                "Review the overdue balance and follow the approved collection procedure.", null))
            .ToListAsync(cancellationToken);
        var unappliedCash = await dbContext.PaymentReceipts.AsNoTracking()
            .Where(value => value.Status != PaymentReceiptStatus.Reversed && value.UnappliedAmount > 0)
            .Select(value => new Candidate("unapplied_cash", nameof(PaymentReceipt), value.Id,
                (Guid?)value.OrganizationId, BusinessRole.CashOperator.ToString(),
                "Review suggested matches and explicitly allocate or retain the cash as unapplied.", null))
            .ToListAsync(cancellationToken);
        var reconciliationDifferences = await dbContext.ReconciliationBatches.AsNoTracking()
            .Where(value => value.Status == ReconciliationStatus.OutOfBalance)
            .Select(value => new Candidate("reconciliation_difference", nameof(ReconciliationBatch), value.Id,
                (Guid?)null, BusinessRole.CashReconciler.ToString(),
                "Resolve the reconciliation difference before approval.", null))
            .ToListAsync(cancellationToken);
        var resultNotificationFailures = await dbContext.OrderNotifications.AsNoTracking()
            .Where(value => value.WorkflowType == OrderWorkflowTypes.PSeqResultPackage
                && value.Status == OrderNotificationStatus.Failed)
            .Select(value => new Candidate("result_notification_failure", nameof(OrderNotification),
                value.Id, (Guid?)value.OrganizationId, BusinessRole.ResultReleaseManager.ToString(),
                "Correct notification delivery and retry the durable notification.", value.LastError))
            .ToListAsync(cancellationToken);
        var projectionFailures = await dbContext.LabOperationsOutboxEvents.AsNoTracking()
            .Where(value => value.PublishedAtUtc == null && value.LastError != null)
            .Select(value => new Candidate("lab_projection_failure", "LabOperationsOutboxEvent",
                value.Id, (Guid?)null, BusinessRole.CommercialOperator.ToString(),
                "Correct the Lab-to-Commercial projection failure and replay the event.", value.LastError))
            .ToListAsync(cancellationToken);

        var readinessCandidates = new List<Candidate>();
        var customerIds = await dbContext.Organizations.AsNoTracking()
            .Where(value => value.IsActive && value.Kind == OrganizationKind.Customer)
            .Select(value => value.Id).ToListAsync(cancellationToken);
        foreach (var organizationId in customerIds)
        {
            var result = await readiness.EvaluateAsync(organizationId, utcNow, cancellationToken);
            if (result.Status != OperationalReadinessStatus.Ready)
                readinessCandidates.Add(new Candidate("readiness_blocker", "Organization", organizationId,
                    organizationId, BusinessRole.CommercialOperator.ToString(),
                    "Complete the account readiness checklist.",
                    string.Join("; ", result.Blockers.Select(value => value.Label))));
        }
        var stagedOrders = await dbContext.LabServiceOrders.AsNoTracking()
            .Where(value => value.Status == LabServiceOrderStatus.QuoteInPreparation)
            .Select(value => new { value.Id, value.OrganizationId })
            .ToListAsync(cancellationToken);
        foreach (var stagedOrder in stagedOrders)
        {
            var result = await readiness.EvaluateAsync(stagedOrder.OrganizationId, utcNow, cancellationToken);
            if (!result.CanIssueQuoteOrCommit)
                readinessCandidates.Add(new Candidate("staged_order_awaiting_readiness",
                    nameof(LabServiceOrder), stagedOrder.Id, stagedOrder.OrganizationId,
                    BusinessRole.CommercialOperator.ToString(),
                    "Complete Customer administrator, order, shipping, and billing readiness before issuing the quote.",
                    string.Join("; ", result.Blockers.Where(value => value.BlocksQuoteOrCommitment)
                        .Select(value => value.Label))));
        }

        foreach (var candidate in invitations.Concat(failedPackages).Concat(unreleasedPackages)
                     .Concat(overdueInvoices).Concat(unappliedCash).Concat(reconciliationDifferences)
                     .Concat(resultNotificationFailures).Concat(projectionFailures)
                     .Concat(readinessCandidates))
        {
            var existing = await dbContext.AttentionItems.SingleOrDefaultAsync(value =>
                value.Category == candidate.Category && value.SourceType == candidate.SourceType
                && value.SourceId == candidate.SourceId, cancellationToken);
            if (existing is null)
                dbContext.AttentionItems.Add(new AttentionItem(candidate.Category, candidate.SourceType,
                    candidate.SourceId, candidate.OrganizationId, candidate.OwnerRole,
                    candidate.NextAction, candidate.LastError, utcNow));
            else if (existing.LastError != candidate.LastError
                     || existing.NextAction != candidate.NextAction)
                existing.Observe(candidate.NextAction, candidate.LastError, utcNow);
        }
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private sealed record Candidate(string Category, string SourceType, Guid SourceId,
        Guid? OrganizationId, string OwnerRole, string NextAction, string? LastError);
}
