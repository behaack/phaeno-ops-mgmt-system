namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record OperationalAttentionDto(
    Guid Id, string Category, Guid? OrganizationId, string SourceType, Guid SourceId,
    string Status, Guid? OwnerUserId, int AttemptCount, string Summary,
    string NextAction, string? Resolution, DateTime CreatedAt, int AgeDays, long Version);
public sealed record AssignAttentionRequest(Guid? OwnerUserId, long Version);
public sealed record ResolveAttentionRequest(string Resolution, long Version);

[ApiController]
[Authorize]
[Route("api/platform/operational-attention")]
public sealed class OperationalAttentionController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    IOptions<PSeqOrderToCashOptions> options) : ControllerBase
{
    private static readonly BusinessRole[] Roles =
    [
        BusinessRole.CommercialOperator, BusinessRole.ResultReleaseManager,
        BusinessRole.BillingOperator, BusinessRole.CashOperator, BusinessRole.CashReconciler
    ];

    [HttpGet]
    public async Task<IReadOnlyList<OperationalAttentionDto>> List(
        [FromQuery] string? category, [FromQuery] bool includeResolved = false,
        CancellationToken cancellationToken = default)
    {
        await RequireAsync(cancellationToken);
        if (!options.Value.AttentionOperations)
            throw new OrderManagementException("attention_operations_disabled", "Operational attention queues are not enabled.", StatusCodes.Status404NotFound);
        await SynchronizeAsync(cancellationToken);
        var query = dbContext.OperationalAttentionItems.AsNoTracking();
        if (!includeResolved) query = query.Where(item => item.Status != OperationalAttentionStatus.Resolved);
        if (!string.IsNullOrWhiteSpace(category))
        {
            if (!Enum.TryParse<OperationalAttentionCategory>(category, true, out var parsed))
                throw new OrderManagementException("attention_category_invalid", "The attention category is invalid.");
            query = query.Where(item => item.Category == parsed);
        }
        return await query.OrderBy(item => item.Status).ThenBy(item => item.CreatedAt)
            .Select(item => Map(item)).Take(1000).ToListAsync(cancellationToken);
    }

    [HttpPost("{itemId:guid}/assign")]
    public async Task<OperationalAttentionDto> Assign(Guid itemId,
        [FromBody] AssignAttentionRequest request, CancellationToken cancellationToken)
    {
        await RequireAsync(cancellationToken);
        var item = await dbContext.OperationalAttentionItems.SingleOrDefaultAsync(value => value.Id == itemId, cancellationToken)
            ?? throw Missing();
        EnsureVersion(item.Version, request.Version);
        if (request.OwnerUserId.HasValue && !await dbContext.Users.AsNoTracking().AnyAsync(user =>
            user.Id == request.OwnerUserId && user.IsActive, cancellationToken))
            throw new OrderManagementException("attention_owner_invalid", "The selected owner is not active.");
        Execute(() => item.Assign(request.OwnerUserId));
        await dbContext.SaveChangesAsync(cancellationToken);
        return Map(item);
    }

    [HttpPost("{itemId:guid}/resolve")]
    public async Task<OperationalAttentionDto> Resolve(Guid itemId,
        [FromBody] ResolveAttentionRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireAsync(cancellationToken);
        var item = await dbContext.OperationalAttentionItems.SingleOrDefaultAsync(value => value.Id == itemId, cancellationToken)
            ?? throw Missing();
        EnsureVersion(item.Version, request.Version);
        Execute(() => item.Resolve(actor.Id, DateTime.UtcNow, request.Resolution));
        await dbContext.SaveChangesAsync(cancellationToken);
        return Map(item);
    }

    private async Task SynchronizeAsync(CancellationToken cancellationToken)
    {
        var candidates = new List<AttentionCandidate>();
        var invitationFailures = await dbContext.InvitationDeliveryAttempts.AsNoTracking()
            .Where(item => item.State == InvitationDeliveryState.Bounced
                || item.State == InvitationDeliveryState.Failed
                || item.State == InvitationDeliveryState.NeedsAttention)
            .Select(item => new { item.Id, item.OrganizationInvitationId, item.State,
                item.AttemptCount, item.LastError }).ToListAsync(cancellationToken);
        var invitationOrganizations = await dbContext.OrganizationInvitations.AsNoTracking()
            .Where(item => invitationFailures.Select(value => value.OrganizationInvitationId).Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.OrganizationId, cancellationToken);
        candidates.AddRange(invitationFailures.Select(item => new AttentionCandidate(
            OperationalAttentionCategory.InvitationFailure,
            invitationOrganizations.GetValueOrDefault(item.OrganizationInvitationId),
            "InvitationDeliveryAttempt", item.Id, item.AttemptCount,
            $"Invitation delivery is {item.State}: {item.LastError ?? "provider attention required"}",
            item.State == InvitationDeliveryState.Bounced
                ? "Correct the address, revoke the invitation, and issue a replacement."
                : "Review provider diagnostics and retry the delivery.")));

        var customers = await dbContext.Organizations.AsNoTracking()
            .Where(item => item.IsActive && item.Kind == OrganizationKind.Customer)
            .Select(item => new { item.Id, item.Name }).ToListAsync(cancellationToken);
        var readinessService = new OperationalReadinessService(dbContext);
        foreach (var customer in customers)
        {
            var readiness = await readinessService.EvaluateAsync(customer.Id, cancellationToken);
            if (readiness.Evaluation.State != PSeq.Operations.Commercial.Relationships.Application.OperationalReadiness.Ready)
                candidates.Add(new AttentionCandidate(OperationalAttentionCategory.ReadinessBlocker,
                    customer.Id, "Organization", customer.Id, 0,
                    $"{customer.Name} has {readiness.Evaluation.Blockers.Count} PSeq readiness blocker(s).",
                    readiness.Evaluation.Blockers.First().NextAction));
        }

        var staged = await dbContext.LabServiceOrders.AsNoTracking().Where(item =>
            item.Status == LabServiceOrderStatus.QuoteInPreparation || item.Status == LabServiceOrderStatus.QuoteIssued)
            .Select(item => new { item.Id, item.OrganizationId, item.OrderNumber, item.Status }).ToListAsync(cancellationToken);
        candidates.AddRange(staged.Select(item => new AttentionCandidate(
            OperationalAttentionCategory.StagedOrderAwaitingAdminOrApproval, item.OrganizationId,
            "LabServiceOrder", item.Id, 0, $"{item.OrderNumber} is {item.Status}.",
            item.Status == LabServiceOrderStatus.QuoteInPreparation
                ? "Complete readiness and issue the quote."
                : "Customer administrator approval is required.")));

        var resultPackages = await dbContext.ResultOutputPackages.AsNoTracking().Where(item =>
            item.State == ResultOutputPackageState.Failed || item.State == ResultOutputPackageState.ReadyForRelease)
            .Select(item => new { item.Id, item.OrganizationId, item.State, item.FailureDetail }).ToListAsync(cancellationToken);
        candidates.AddRange(resultPackages.Select(item => new AttentionCandidate(
            item.State == ResultOutputPackageState.ReadyForRelease
                ? OperationalAttentionCategory.ScientificallyApprovedUnreleased
                : OperationalAttentionCategory.ProjectionOrScanningFailure,
            item.OrganizationId, "ResultOutputPackage", item.Id, 0,
            item.State == ResultOutputPackageState.ReadyForRelease
                ? "A scientifically approved package awaits customer release."
                : $"Result processing failed: {item.FailureDetail}",
            item.State == ResultOutputPackageState.ReadyForRelease
                ? "A Result Release Manager must review and release or withdraw it."
                : "Review the pipeline or scanning failure and submit a corrected package.")));

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var overdue = await dbContext.Invoices.AsNoTracking().Where(item => item.DueOn < today
            && (item.Status == InvoiceStatus.Issued || item.Status == InvoiceStatus.PartiallyPaid))
            .Select(item => new { item.Id, item.OrganizationId, item.InvoiceNumber, item.Balance, item.DueOn }).ToListAsync(cancellationToken);
        candidates.AddRange(overdue.Select(item => new AttentionCandidate(
            OperationalAttentionCategory.OverdueInvoice, item.OrganizationId, "Invoice", item.Id, 0,
            $"{item.InvoiceNumber} has {item.Balance:0.00} USD overdue since {item.DueOn:yyyy-MM-dd}.",
            "Review the aging account and record the appropriate Finance follow-up.")));

        var unapplied = await dbContext.PaymentReceipts.AsNoTracking().Where(item => item.UnappliedAmount > 0
            && item.Status != PaymentReceiptStatus.Reversed)
            .Select(item => new { item.Id, item.OrganizationId, item.ReceiptNumber, item.UnappliedAmount }).ToListAsync(cancellationToken);
        candidates.AddRange(unapplied.Select(item => new AttentionCandidate(
            OperationalAttentionCategory.UnappliedCash, item.OrganizationId, "PaymentReceipt", item.Id, 0,
            $"{item.ReceiptNumber} has {item.UnappliedAmount:0.00} USD unapplied.",
            "Review matching suggestions and explicitly allocate or leave the cash unapplied.")));

        var differences = await dbContext.ReconciliationBatches.AsNoTracking().Where(item =>
            item.Difference != 0 && item.Status != ReconciliationBatchStatus.Approved)
            .Select(item => new { item.Id, item.BatchNumber, item.Difference }).ToListAsync(cancellationToken);
        candidates.AddRange(differences.Select(item => new AttentionCandidate(
            OperationalAttentionCategory.ReconciliationDifference, null, "ReconciliationBatch", item.Id, 0,
            $"{item.BatchNumber} has a {item.Difference:0.00} USD difference.",
            "Resolve the bank-versus-ledger difference before independent approval.")));

        var keys = candidates.Select(item => new { item.Category, item.SourceType, item.SourceId }).ToList();
        var existing = await dbContext.OperationalAttentionItems.Where(item => item.Status != OperationalAttentionStatus.Resolved)
            .ToListAsync(cancellationToken);
        foreach (var candidate in candidates)
        {
            var current = existing.SingleOrDefault(item => item.Category == candidate.Category
                && item.SourceType == candidate.SourceType && item.SourceId == candidate.SourceId);
            if (current is null)
                dbContext.OperationalAttentionItems.Add(new OperationalAttentionItem(candidate.Category,
                    candidate.OrganizationId, candidate.SourceType, candidate.SourceId, candidate.AttemptCount,
                    candidate.Summary, candidate.NextAction));
            else current.Refresh(candidate.AttemptCount, candidate.Summary, candidate.NextAction);
        }
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private sealed record AttentionCandidate(OperationalAttentionCategory Category,
        Guid? OrganizationId, string SourceType, Guid SourceId, int AttemptCount,
        string Summary, string NextAction);
    private Task<User> RequireAsync(CancellationToken cancellationToken) =>
        requestContext.RequireAnyBusinessRoleAsync(HttpContext, Roles,
            options.Value.BusinessRoles || options.Value.DualControlEnforced, cancellationToken);
    private static OperationalAttentionDto Map(OperationalAttentionItem item) => new(item.Id,
        item.Category.ToString(), item.OrganizationId, item.SourceType, item.SourceId,
        item.Status.ToString(), item.OwnerUserId, item.AttemptCount, item.Summary, item.NextAction,
        item.Resolution, item.CreatedAt, Math.Max(0, (DateTime.UtcNow.Date - item.CreatedAt.Date).Days), item.Version);
    private static void EnsureVersion(long actual, long expected)
    { if (actual != expected) throw new OrderManagementException("concurrency_conflict", "This item changed. Refresh and try again.", StatusCodes.Status409Conflict); }
    private static void Execute(Action action)
    {
        try { action(); }
        catch (ArgumentException exception) { throw new OrderManagementException("attention_item_invalid", exception.Message); }
        catch (InvalidOperationException exception) { throw new OrderManagementException("attention_item_transition_invalid", exception.Message, StatusCodes.Status409Conflict); }
    }
    private static OrderManagementException Missing() => new("attention_item_not_found", "The attention item was not found.", StatusCodes.Status404NotFound);
}
