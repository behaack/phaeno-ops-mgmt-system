namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Relationships.Application;
using PSeq.Operations.Commercial.Relationships.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record PSeqCustomerReadiness(
    Guid OrganizationId,
    string OrganizationName,
    OperationalReadinessEvaluation Evaluation);

public sealed class OperationalReadinessService(PSeqOperationsDbContext dbContext)
{
    public async Task<PSeqCustomerReadiness> EvaluateAsync(
        Guid organizationId, CancellationToken cancellationToken)
    {
        var organization = await dbContext.Organizations.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == organizationId, cancellationToken)
            ?? throw new OrderManagementException("customer_not_found", "The Customer was not found.", StatusCodes.Status404NotFound);
        var now = DateTime.UtcNow;
        var hasAdministrator = await dbContext.OrganizationMemberships.AsNoTracking().AnyAsync(item =>
            item.OrganizationId == organization.Id && item.IsActive && item.IsOrganizationAdmin
            && dbContext.Users.Any(user => user.Id == item.UserId && user.IsActive
                && user.Status == UserAccountStatus.Active), cancellationToken);
        var hasEntitlement = await dbContext.OrganizationServiceEntitlements.AsNoTracking().AnyAsync(item =>
            item.OrganizationId == organization.Id && item.Service == PortalService.PSeqLabService
            && item.ConfigurationStatus == EntitlementConfigurationStatus.Ready
            && item.EffectiveFrom <= now && (!item.EffectiveTo.HasValue || item.EffectiveTo > now), cancellationToken);
        var hasOffering = await (from analysis in dbContext.AnalysisDefinitions.AsNoTracking()
            join catalog in dbContext.QboCatalogItems.AsNoTracking() on analysis.QboCatalogItemId equals catalog.Id
            where analysis.IsActive && !analysis.IsSynthetic && catalog.IsActive
            select analysis.Id).AnyAsync(cancellationToken);
        var system = await dbContext.OrderSystemConfigurations.AsNoTracking().OrderBy(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        var profile = await dbContext.OrganizationCommercialProfiles.AsNoTracking()
            .SingleOrDefaultAsync(item => item.OrganizationId == organization.Id, cancellationToken);
        var evaluation = OperationalReadinessPolicy.Evaluate(new OperationalReadinessInput(
            organization is { IsActive: true, Kind: OrganizationKind.Customer },
            organization.IsOperationalReadinessBlocked,
            organization.OperationalReadinessBlockReason,
            hasAdministrator,
            hasEntitlement,
            hasOffering,
            system is { QuoteValidityDays: > 0 },
            system?.SampleConfigurationJson != "{}",
            system?.ShippingConfigurationJson != "{}",
            system?.ResultDestinationConfigurationJson != "{}",
            !string.IsNullOrWhiteSpace(system?.SampleSubmissionInstructions),
            profile?.HasCompleteBillingContact == true,
            profile?.HasCompleteBillingAddress == true,
            profile is { PaymentTermsDays: >= 0 and <= 365 },
            profile?.HasEffectiveTaxDecision == true,
            profile?.HasFinanceApprovedTaxDecision == true));
        return new PSeqCustomerReadiness(organization.Id, organization.Name, evaluation);
    }
}
