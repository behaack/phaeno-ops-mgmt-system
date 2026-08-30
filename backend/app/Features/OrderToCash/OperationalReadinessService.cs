namespace PhaenoPortal.App.Features.OrderToCash;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;

public enum OperationalReadinessStatus { NeedsSetup = 1, Ready = 2, Blocked = 3 }

public sealed record OperationalReadinessBlocker(
    string Code,
    string Label,
    string NextAction,
    bool BlocksStaging,
    bool BlocksQuoteOrCommitment);

public sealed record OperationalReadinessResult(
    Guid OrganizationId,
    OperationalReadinessStatus Status,
    bool CanStageOrder,
    bool CanIssueQuoteOrCommit,
    IReadOnlyList<OperationalReadinessBlocker> Blockers,
    PortalReadinessStatus LegacyInformationalStatus,
    string? ManualBlockNote);

public sealed class OperationalReadinessService(PSeqOperationsDbContext dbContext)
{
    public async Task<OperationalReadinessResult> EvaluateAsync(
        Guid organizationId,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var organization = await dbContext.Organizations.AsNoTracking()
            .SingleOrDefaultAsync(value => value.Id == organizationId, cancellationToken)
            ?? throw new InvalidOperationException("Organization not found.");
        var blockers = new List<OperationalReadinessBlocker>();

        Add(!organization.IsActive || !organization.IsCustomer(), "customer_relationship_inactive",
            "Active Customer relationship", "Activate the Customer relationship.", true, true);
        Add(organization.IsPortalReadinessManuallyBlocked, "manual_blocked_override",
            "Manual readiness block", "Resolve the recorded manual block before proceeding.", true, true);

        var hasEntitlement = await dbContext.OrganizationServiceEntitlements.AsNoTracking()
            .AnyAsync(value => value.OrganizationId == organizationId
                && value.Service == PortalService.PSeqLabService
                && value.ConfigurationStatus == EntitlementConfigurationStatus.Ready
                && value.EffectiveFrom <= utcNow
                && (!value.EffectiveTo.HasValue || value.EffectiveTo > utcNow), cancellationToken);
        Add(!hasEntitlement, "pseq_service_not_ready", "Service configuration: Ready",
            "Activate a Ready PSeq service entitlement.", true, true);

        var pseqOfferingIds = await dbContext.QboCatalogItems.AsNoTracking()
            .Where(value => value.IsActive && value.Currency == "USD"
                && value.ExternalItemId == OrderServiceKeys.PSeqLabService)
            .Select(value => value.Id).ToListAsync(cancellationToken);
        var hasOffering = pseqOfferingIds.Count > 0
            && await dbContext.AnalysisDefinitions.AsNoTracking()
                .AnyAsync(value => value.IsActive && pseqOfferingIds.Contains(value.QboCatalogItemId), cancellationToken);
        Add(!hasOffering, "pseq_offering_inactive", "Active PSeq offering",
            "Activate the PSeq catalog item and analysis definition.", true, true);

        var hasAdministrator = await dbContext.OrganizationMemberships.AsNoTracking()
            .AnyAsync(value => value.OrganizationId == organizationId && value.IsActive
                && value.IsOrganizationAdmin && value.User != null && value.User.IsActive
                && value.User.Status == UserAccountStatus.Active, cancellationToken);
        Add(!hasAdministrator, "customer_administrator_missing", "Active Customer administrator",
            "Deliver and accept an administrator invitation.", false, true);

        var orderConfig = await dbContext.OrderSystemConfigurations.AsNoTracking()
            .OrderBy(value => value.CreatedAt).FirstOrDefaultAsync(cancellationToken);
        Add(orderConfig is null || string.IsNullOrWhiteSpace(orderConfig.SampleSubmissionInstructions),
            "order_configuration_incomplete", "Order and sample configuration",
            "Complete the PSeq order defaults and sample submission instructions.", false, true);

        var hasDestination = await dbContext.SampleShippingDestinations.AsNoTracking()
            .AnyAsync(value => value.IsActive && value.EffectiveFrom <= utcNow
                && (!value.EffectiveTo.HasValue || value.EffectiveTo > utcNow), cancellationToken);
        Add(!hasDestination, "shipping_destination_missing", "Shipping destination",
            "Activate a current receiving destination.", false, true);
        var hasSampleType = await dbContext.SampleTypeDefinitions.AsNoTracking()
            .AnyAsync(value => value.IsActive && value.EffectiveFrom <= utcNow
                && (!value.EffectiveTo.HasValue || value.EffectiveTo > utcNow), cancellationToken);
        Add(!hasSampleType, "sample_configuration_missing", "Sample configuration",
            "Activate at least one supported sample type.", false, true);
        var hasInstruction = await dbContext.SampleShippingInstructionRules.AsNoTracking()
            .AnyAsync(value => value.IsActive && value.EffectiveFrom <= utcNow
                && (!value.EffectiveTo.HasValue || value.EffectiveTo > utcNow), cancellationToken);
        Add(!hasInstruction, "shipping_instructions_missing", "Shipping instructions",
            "Activate a compatible shipping instruction rule.", false, true);

        var billing = await dbContext.OrganizationCommercialProfiles.AsNoTracking()
            .SingleOrDefaultAsync(value => value.OrganizationId == organizationId, cancellationToken);
        Add(billing?.HasApprovedPSeqBillingConfiguration != true, "billing_configuration_incomplete",
            "Finance-approved billing and tax configuration",
            "Complete billing contact, address, payment terms, and Finance-approved tax treatment.", false, true);

        var canStage = blockers.All(value => !value.BlocksStaging);
        var canCommit = blockers.Count == 0;
        var status = organization.IsPortalReadinessManuallyBlocked
            ? OperationalReadinessStatus.Blocked
            : canCommit ? OperationalReadinessStatus.Ready : OperationalReadinessStatus.NeedsSetup;
        return new OperationalReadinessResult(organizationId, status, canStage, canCommit,
            blockers, organization.PortalReadiness, organization.PortalReadinessNote);

        void Add(bool condition, string code, string label, string nextAction,
            bool blocksStaging, bool blocksCommitment)
        {
            if (condition) blockers.Add(new OperationalReadinessBlocker(
                code, label, nextAction, blocksStaging, blocksCommitment));
        }
    }
}
