namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
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
        Guid organizationId, CancellationToken cancellationToken, Guid? departmentId = null)
    {
        var organization = await dbContext.Organizations.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == organizationId, cancellationToken)
            ?? throw new OrderManagementException("customer_not_found", "The Customer was not found.", StatusCodes.Status404NotFound);
        return await EvaluateAsync(organization, cancellationToken, departmentId);
    }

    public async Task<PSeqCustomerReadiness> EvaluateAsync(
        Organization organization, CancellationToken cancellationToken, Guid? departmentId = null)
    {
        var now = DateTime.UtcNow;
        var hasAdministrator = await dbContext.OrganizationMemberships.AsNoTracking().AnyAsync(item =>
            item.OrganizationId == organization.Id && item.IsActive && item.IsOrganizationAdmin
            && dbContext.Users.Any(user => user.Id == item.UserId && user.IsActive
                && user.Status == UserAccountStatus.Active), cancellationToken);
        var hasEntitlement = await dbContext.OrganizationServiceEntitlements.AsNoTracking().AnyAsync(item =>
            item.OrganizationId == organization.Id && item.Service == PortalService.PSeqLabService
            && item.ConfigurationStatus == EntitlementConfigurationStatus.Ready
            && item.EffectiveFrom <= now && (!item.EffectiveTo.HasValue || item.EffectiveTo > now), cancellationToken);
        if (departmentId.HasValue)
        {
            var eligibility = await LabServiceOrderingEligibility.ReadAsync(
                dbContext, organization.Id, now, cancellationToken, departmentId);
            hasEntitlement = eligibility.OrderingAuthorized;
        }
        var hasOffering = await dbContext.QboCatalogItems.AsNoTracking().AnyAsync(item =>
            item.IsActive && item.ExternalItemId.ToLower() == OrderServiceKeys.PSeqLabService
            && item.SalesUnit.ToLower() == OrderSalesUnits.Specimen, cancellationToken);
        var system = await dbContext.OrderSystemConfigurations.AsNoTracking().OrderBy(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        var profile = await dbContext.OrganizationCommercialProfiles.AsNoTracking()
            .SingleOrDefaultAsync(item => item.OrganizationId == organization.Id, cancellationToken);
        var hasSampleTypes = await dbContext.SampleTypeDefinitions.AsNoTracking().AnyAsync(item => item.IsActive
            && item.EffectiveFrom <= now && (!item.EffectiveTo.HasValue || item.EffectiveTo > now), cancellationToken);
        var hasShipping = await dbContext.SampleShippingInstructionRules.AsNoTracking().AnyAsync(rule => rule.IsActive
            && rule.EffectiveFrom <= now && (!rule.EffectiveTo.HasValue || rule.EffectiveTo > now)
            && dbContext.SampleShippingDestinations.Any(destination => destination.Id == rule.DestinationId && destination.IsActive
                && destination.EffectiveFrom <= now && (!destination.EffectiveTo.HasValue || destination.EffectiveTo > now))
            && dbContext.SampleTypeDefinitions.Any(sample => sample.Id == rule.SampleTypeDefinitionId && sample.IsActive
                && sample.EffectiveFrom <= now && (!sample.EffectiveTo.HasValue || sample.EffectiveTo > now)), cancellationToken);
        var evaluation = OperationalReadinessPolicy.Evaluate(new OperationalReadinessInput(
            organization is { IsActive: true, Kind: OrganizationKind.Customer or OrganizationKind.Partner },
            organization.IsOperationalReadinessBlocked,
            organization.OperationalReadinessBlockReason,
            hasAdministrator,
            hasEntitlement,
            hasOffering,
            system is { QuoteValidityDays: > 0 } && OrderSystemConfiguration.HasSupportedSampleConfiguration(system.SampleConfigurationJson),
            hasSampleTypes,
            hasShipping,
            OrderSystemConfiguration.HasSupportedResultDestination(system?.ResultDestinationConfigurationJson),
            !string.IsNullOrWhiteSpace(system?.SampleSubmissionInstructions),
            profile?.HasCompleteBillingContact == true,
            profile?.HasCompleteBillingAddress == true,
            profile is { PaymentTermsDays: >= 0 and <= 365 },
            profile?.HasEffectiveTaxDecision == true,
            profile?.HasFinanceApprovedTaxDecision == true));
        return new PSeqCustomerReadiness(organization.Id, organization.Name, evaluation);
    }
}
