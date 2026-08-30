namespace PhaenoPortal.App.Features.OrderToCash;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.OrderToCash.Domain;
using PSeq.Operations.Laboratory.Domain;

[ApiController]
[Authorize]
[Route("api/order-to-cash")]
public sealed class OrderToCashOperationsController(
    PSeqOperationsDbContext dbContext,
    OperationalReadinessService readiness,
    AttentionOperationsService attention,
    OrderToCashAuthorization authorization,
    IExternalIdentityContext externalIdentityContext,
    IOptions<OrderToCashOptions> options) : ControllerBase
{
    [HttpGet("readiness/{organizationId:guid}")]
    public async Task<ActionResult<OperationalReadinessResult>> Readiness(Guid organizationId,
        CancellationToken cancellationToken)
    {
        RequireFeature(options.Value.Features.DerivedReadiness, "Derived readiness");
        var actor = await AccountAccess.ReadActiveActorAsync(HttpContext, dbContext,
            externalIdentityContext, cancellationToken) ?? throw AuthenticationRequired();
        var isPhaeno = actor.Memberships.Any(value => value.IsActive && value.Organization?.IsPhaeno() == true);
        var belongsToOrganization = actor.Memberships.Any(value => value.IsActive && value.OrganizationId == organizationId);
        if (!isPhaeno && !belongsToOrganization) throw Forbidden("readiness_forbidden", "Readiness is unavailable.");
        return Ok(await readiness.EvaluateAsync(organizationId, DateTime.UtcNow, cancellationToken));
    }

    [HttpGet("stage-eligible-customers")]
    public async Task<ActionResult<IReadOnlyList<StageEligibleCustomerDto>>> StageEligibleCustomers(
        CancellationToken cancellationToken)
    {
        RequireFeature(options.Value.Features.DerivedReadiness, "Derived readiness");
        _ = await authorization.RequireAsync(HttpContext, BusinessRole.CommercialOperator, cancellationToken);
        var organizations = await dbContext.Organizations.AsNoTracking()
            .Where(value => value.Kind == OrganizationKind.Customer)
            .OrderBy(value => value.Name).ToListAsync(cancellationToken);
        var result = new List<StageEligibleCustomerDto>();
        foreach (var organization in organizations)
        {
            var evaluation = await readiness.EvaluateAsync(organization.Id, DateTime.UtcNow, cancellationToken);
            result.Add(new StageEligibleCustomerDto(organization.Id, organization.Name,
                evaluation.Status, evaluation.CanStageOrder, evaluation.CanIssueQuoteOrCommit,
                evaluation.Blockers));
        }
        return Ok(result);
    }

    [HttpGet("attention")]
    public async Task<ActionResult<IReadOnlyList<AttentionItemDto>>> Attention(
        [FromQuery] bool includeResolved, CancellationToken cancellationToken)
    {
        RequireFeature(options.Value.Features.AttentionOperations, "Attention operations");
        var actor = await authorization.ReadActorAsync(HttpContext, cancellationToken)
            ?? throw AuthenticationRequired();
        await attention.RefreshAsync(DateTime.UtcNow, cancellationToken);
        var ownerRoles = actor.Roles.Select(value => value.ToString()).ToArray();
        var query = dbContext.AttentionItems.AsNoTracking().AsQueryable();
        if (options.Value.Features.BusinessRoles)
            query = query.Where(value => ownerRoles.Contains(value.OwnerRole));
        else if (!AccountAuthorization.IsPlatformAdmin(actor.User))
            query = query.Where(value => ownerRoles.Contains(value.OwnerRole));
        if (!includeResolved) query = query.Where(value => value.Status != AttentionItemStatus.Resolved);
        var now = DateTime.UtcNow;
        var values = await query.OrderBy(value => value.FirstObservedAtUtc).ToListAsync(cancellationToken);
        return Ok(values.Select(value => new AttentionItemDto(value.Id, value.Category,
            value.SourceType, value.SourceId, value.OrganizationId, value.OwnerRole, value.Status,
            value.AttemptCount, value.NextAction, value.LastError, value.FirstObservedAtUtc,
            (int)Math.Max(0, (now - value.FirstObservedAtUtc).TotalHours), value.Resolution,
            value.Version)).ToArray());
    }

    [HttpPost("attention/{id:guid}/start")]
    public async Task<ActionResult> StartAttention(Guid id, [FromBody] VersionRequest request,
        CancellationToken cancellationToken)
    {
        var (item, _) = await RequireAttentionOwner(id, request.Version, cancellationToken);
        item.Start(); await dbContext.SaveChangesAsync(cancellationToken); return Ok();
    }

    [HttpPost("attention/{id:guid}/resolve")]
    public async Task<ActionResult> ResolveAttention(Guid id, [FromBody] ResolveAttentionRequest request,
        CancellationToken cancellationToken)
    {
        var (item, actor) = await RequireAttentionOwner(id, request.Version, cancellationToken);
        item.Resolve(actor.Id, DateTime.UtcNow, request.Resolution);
        await dbContext.SaveChangesAsync(cancellationToken); return Ok();
    }

    [HttpGet("dual-control/readiness")]
    public async Task<ActionResult<DualControlReadinessDto>> DualControlReadiness(CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(HttpContext, dbContext,
            externalIdentityContext, cancellationToken) ?? throw AuthenticationRequired();
        if (!AccountAuthorization.IsPlatformAdmin(actor)) throw Forbidden("platform_admin_required", "Platform administration is required.");
        var businessCounts = await dbContext.BusinessRoleAssignments.AsNoTracking()
            .Where(value => value.IsActive).GroupBy(value => value.Role)
            .Select(group => new { Role = group.Key, Count = group.Select(value => value.UserId).Distinct().Count() })
            .ToDictionaryAsync(value => value.Role, value => value.Count, cancellationToken);
        var scientificReviewers = await dbContext.LabRoleAssignments.AsNoTracking()
            .CountAsync(value => value.IsActive && value.Role == LabRole.ScientificReviewer, cancellationToken);
        var sufficientlyStaffed = businessCounts.GetValueOrDefault(BusinessRole.CashOperator) >= 1
            && businessCounts.GetValueOrDefault(BusinessRole.CashReconciler) >= 1
            && businessCounts.GetValueOrDefault(BusinessRole.ResultReleaseManager) >= 1
            && scientificReviewers >= 2;
        return Ok(new DualControlReadinessDto(options.Value.DualControlMode,
            options.Value.DualControlStaffingValidated, sufficientlyStaffed,
            businessCounts, scientificReviewers));
    }

    [HttpGet("features")]
    public ActionResult<OrderToCashFeatureFlags> Features() => Ok(options.Value.Features);

    [HttpGet("migration-preview")]
    public async Task<ActionResult<OrderToCashMigrationPreviewDto>> MigrationPreview(
        CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(HttpContext, dbContext,
            externalIdentityContext, cancellationToken) ?? throw AuthenticationRequired();
        if (!AccountAuthorization.IsPlatformAdmin(actor))
            throw Forbidden("platform_admin_required", "Platform administration is required.");

        var invitationsWithoutAttempts = await dbContext.OrganizationInvitations.AsNoTracking()
            .CountAsync(invitation => invitation.SendCount > 0
                && !dbContext.InvitationDeliveryAttempts.Any(attempt =>
                    attempt.OrganizationInvitationId == invitation.Id), cancellationToken);
        var historicalBlockedOrganizations = await dbContext.Organizations.AsNoTracking()
            .CountAsync(organization => organization.PortalReadiness == PortalReadinessStatus.Blocked
                && !organization.IsPortalReadinessManuallyBlocked, cancellationToken);
        var quotesWithoutBillingSnapshots = await dbContext.LabServiceQuotes.AsNoTracking()
            .CountAsync(quote => quote.BillingSnapshotJson == null, cancellationToken);
        var resultReleasesOnPaymentHold = await dbContext.LabResultReleases.AsNoTracking()
            .CountAsync(release => release.ReleaseStatus == FileReleaseStatus.PaymentHold, cancellationToken);
        var resultFilesOnPaymentHold = await dbContext.ManagedOperationalFiles.AsNoTracking()
            .CountAsync(file => file.Purpose == OperationalFilePurpose.LabResult
                && file.ReleaseStatus == FileReleaseStatus.PaymentHold, cancellationToken);
        var releasesWithoutGovernedPackages = await dbContext.LabResultReleases.AsNoTracking()
            .CountAsync(release => !dbContext.ResultOutputPackages.Any(package =>
                package.LabServiceOrderId == release.LabServiceOrderId
                && package.LabSampleId == release.LabSampleId), cancellationToken);
        var legacyBillingRows = await dbContext.CommercialDocumentLinks.AsNoTracking()
            .CountAsync(link => link.WorkflowType == OrderWorkflowTypes.LabService, cancellationToken);

        return Ok(new OrderToCashMigrationPreviewDto(
            invitationsWithoutAttempts,
            historicalBlockedOrganizations,
            quotesWithoutBillingSnapshots,
            resultReleasesOnPaymentHold,
            resultFilesOnPaymentHold,
            releasesWithoutGovernedPackages,
            legacyBillingRows,
            "Preview only. Historical changes require a separately authorized, reviewed backfill."));
    }

    private async Task<(AttentionItem Item, OrderToCashActor Actor)> RequireAttentionOwner(
        Guid id, long version, CancellationToken cancellationToken)
    {
        RequireFeature(options.Value.Features.AttentionOperations, "Attention operations");
        var actor = await authorization.ReadActorAsync(HttpContext, cancellationToken)
            ?? throw AuthenticationRequired();
        var item = await dbContext.AttentionItems.SingleOrDefaultAsync(value => value.Id == id, cancellationToken)
            ?? throw new OrderManagementException("attention_item_missing", "The attention item was not found.", StatusCodes.Status404NotFound);
        if (item.Version != version) throw new DbUpdateConcurrencyException();
        if (options.Value.Features.BusinessRoles
            && !actor.Roles.Any(value => value.ToString() == item.OwnerRole))
            throw Forbidden("attention_owner_required", "This attention item belongs to another business role.");
        return (item, actor);
    }

    private static void RequireFeature(bool enabled, string name)
    {
        if (!enabled) throw new OrderManagementException("feature_disabled", $"{name} is not enabled.", StatusCodes.Status404NotFound);
    }
    private static OrderManagementException AuthenticationRequired() => new("authentication_required", "An active user is required.", StatusCodes.Status401Unauthorized);
    private static OrderManagementException Forbidden(string code, string message) => new(code, message, StatusCodes.Status403Forbidden);
}

public sealed record StageEligibleCustomerDto(Guid Id, string Name,
    OperationalReadinessStatus Status, bool CanStageOrder, bool CanIssueQuoteOrCommit,
    IReadOnlyList<OperationalReadinessBlocker> Blockers);
public sealed record AttentionItemDto(Guid Id, string Category, string SourceType,
    Guid SourceId, Guid? OrganizationId, string OwnerRole, AttentionItemStatus Status,
    int AttemptCount, string NextAction, string? LastError, DateTime FirstObservedAtUtc,
    int AgeHours, string? Resolution, long Version);
public sealed record VersionRequest(long Version);
public sealed record ResolveAttentionRequest(long Version, string Resolution);
public sealed record DualControlReadinessDto(DualControlMode Mode, bool StaffingMarkedValidated,
    bool CalculatedSufficientStaffing, IReadOnlyDictionary<BusinessRole, int> BusinessRoleCounts,
    int ScientificReviewerCount);
public sealed record OrderToCashMigrationPreviewDto(
    int InvitationsWithoutAttempts,
    int HistoricalBlockedOrganizations,
    int QuotesWithoutBillingSnapshots,
    int ResultReleasesOnPaymentHold,
    int ResultFilesOnPaymentHold,
    int ReleasesWithoutGovernedPackages,
    int LegacyBillingRows,
    string Notice);
