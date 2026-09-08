namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Data;
using System.Text.Json;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabServiceOrdersController
{
    [HttpGet("{orderId:guid}/standard-preview")]
    public async Task<StandardLabOrderPreviewDto> PreviewStandard(Guid orderId, [FromQuery] Guid offeringId,
        CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, false, cancellationToken);
        var order = await ReadOrderAsync(orderId, tenant, cancellationToken);
        return await BuildStandardPreviewAsync(order, tenant, offeringId, cancellationToken);
    }

    [HttpPost("{orderId:guid}/place-standard")]
    public async Task<LabServiceOrderDto> PlaceStandard(Guid orderId, [FromBody] PlaceStandardLabOrderRequest request,
        CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, cancellationToken);
        if (!tenant.Membership.IsOrganizationAdmin)
            throw new OrderManagementException("organization_administrator_required",
                "An organization administrator must place a standard order.", StatusCodes.Status403Forbidden);
        if (!request.ProhibitedDataConfirmed)
            throw Invalid("prohibited_data_confirmation_required", "Confirm that the order contains no prohibited data.");
        await ReadOrderAsync(orderId, tenant, cancellationToken);
        var execution = await idempotency.ExecuteAsync(tenant.Actor.Id, $"lab-order:{orderId}:place-standard",
            idempotency.RequireKey(HttpContext), request, async token =>
            {
                // Re-read the selected membership and Department inside the commitment transaction.
                dbContext.ChangeTracker.Clear();
                var currentTenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, token);
                if (!currentTenant.Membership.IsOrganizationAdmin)
                    throw new OrderManagementException("organization_administrator_required",
                        "An organization administrator must place a standard order.", StatusCodes.Status403Forbidden);
                var order = await ReadOrderAsync(orderId, currentTenant, token);
                EnsureVersion(order.Version, request.Version);
                var preview = await BuildStandardPreviewAsync(order, currentTenant, request.OfferingId, token);
                EnsureVersion(preview.Offering.Version, request.OfferingRecordVersion);
                EnsureVersion(preview.Offering.OfferingVersion, request.OfferingVersion);
                EnsureVersion(preview.Offering.CatalogItemVersion, request.CatalogItemVersion);
                EnsureVersion(preview.CommercialProfileVersion ?? 0, request.CommercialProfileVersion);
                EnsureVersion(preview.DepartmentVersion, request.DepartmentVersion);
                EnsureVersion(preview.OrganizationVersion, request.OrganizationVersion);
                if (!string.Equals(preview.ReviewToken, request.ReviewToken, StringComparison.Ordinal))
                    throw Conflict("standard_review_expired", "The offering or order configuration changed. Review the current scope and total before placing the order.");
                if (!preview.CanPlaceStandardOrder)
                    throw Conflict("standard_order_not_ready", string.Join(" ", preview.Blockers));
                var purchaseOrder = string.IsNullOrWhiteSpace(request.PurchaseOrderNumber) ? null : request.PurchaseOrderNumber.Trim();
                if (purchaseOrder?.Length > 255) throw Invalid("purchase_order_number_invalid", "The purchase order number must be 255 characters or fewer.");
                if (currentTenant.Configuration.PurchaseOrderRequired == true && purchaseOrder is null)
                    throw Invalid("purchase_order_number_required", "A purchase order number is required for this Department.");
                var profile = await dbContext.OrganizationCommercialProfiles.SingleAsync(value => value.OrganizationId == order.OrganizationId, token);
                var offering = preview.Offering;
                var analyses = await dbContext.AnalysisDefinitions.AsNoTracking().Where(value => offering.AnalysisIds.Contains(value.Id))
                    .Select(value => new { value.Id, value.Name, value.Description, value.SubmissionInstructions,
                        value.RequiredIntakeFieldsJson, value.ResultContractJson, value.Version }).ToListAsync(token);
                var now = DateTime.UtcNow;
                var snapshot = new ConfiguredLabServiceSnapshot(offering.Id, offering.FamilyId, offering.OfferingVersion,
                    offering.Version, offering.Name, offering.CatalogItemId, offering.CatalogCode, offering.CatalogItemVersion,
                    offering.Currency, offering.UnitPrice, order.RequestedSpecimenCount, preview.Subtotal, preview.Tax!.Value,
                    preview.Total!.Value, offering.AnalysisIds, JsonSerializer.Serialize(analyses, JsonSerializerOptions),
                    offering.IncludedOutputContract, offering.MinimumTurnaroundDays, offering.MaximumTurnaroundDays, now);
                var lines = JsonSerializer.Serialize(new[] { new { catalogItemId = offering.CatalogItemId,
                    externalItemId = offering.CatalogCode, description = offering.Name,
                    quantity = order.RequestedSpecimenCount, unitPrice = offering.UnitPrice } }, JsonSerializerOptions);
                var quote = new LabServiceQuote(order.Id, order.Quotes.Select(value => value.Revision).DefaultIfEmpty(0).Max() + 1,
                    QuotePurpose.Initial, lines, preview.Subtotal, preview.Tax.Value, offering.Currency, now, now.AddDays(1));
                quote.FreezeCommercialTerms(JsonSerializer.Serialize(new { name = profile.BillingContactName,
                        email = currentTenant.Configuration.BillingContactEmail ?? profile.BillingContactEmail }, JsonSerializerOptions),
                    profile.BillingAddressJson!, profile.PaymentTermsDays, JsonSerializer.Serialize(new {
                        decision = profile.TaxDecision!.Value.ToString(), rate = profile.ApprovedTaxRate,
                        exemptionEvidence = profile.TaxExemptionEvidence, approvedByUserId = profile.FinanceApprovedByUserId,
                        approvedAtUtc = profile.FinanceApprovedAtUtc }, JsonSerializerOptions), profile.ConfigurationVersion);
                quote.MarkIssued();
                quote.Accept(currentTenant.Actor.Id, now);
                order.Quotes.Add(quote);
                dbContext.LabServiceQuotes.Add(quote);
                var placement = JsonSerializer.Serialize(new {
                    department = new { currentTenant.Department.Id, currentTenant.Department.Code, currentTenant.Department.Name,
                        currentTenant.Configuration.PurchaseOrderRequired, currentTenant.Configuration.BillingContactEmail,
                        currentTenant.Configuration.NotificationEmail, currentTenant.Configuration.ShippingInstructions,
                        currentTenant.Configuration.ResultDeliveryInstructions },
                    purchaseOrderNumber = purchaseOrder, order.RequestedSpecimenCount,
                    sourceGroups = order.SourceGroups.Select(value => new { value.BiologicalSource, value.SpecimenCount }),
                    order.StorageRequirements, order.SafetyDeclaration, serviceKey = OrderServiceKeys.PSeqLabService,
                    materialType = StandardMaterialType, quantityUnit = StandardQuantityUnit, quoteId = quote.Id,
                    quote.Revision, quote.LinesJson, quote.Total, quote.Currency, acceptedAt = now,
                    configuredOffering = snapshot, prohibitedDataConfirmed = true
                }, JsonSerializerOptions);
                var before = order.Status.ToString();
                Execute(() => order.PlaceStandard(quote.Id, snapshot, placement, now));
                dbContext.OrderStatusEvents.Add(NewEvent(order, before, order.Status.ToString(), currentTenant.Actor.Id));
                QueueNotice(order, "lab-standard-order-placed", "Standard laboratory order placed",
                    $"{order.OrderNumber} is placed and awaiting its sample roster.", currentTenant.Actor.Id);
                await new CommercialSaleSummaryService(dbContext).StageAsync(OrderWorkflowTypes.LabService, order.Id,
                    order.OrganizationId, null, offering.Name, order.RequestedSpecimenCount, quote.Total, quote.Currency,
                    now, currentTenant.Actor.Id, token);
                await dbContext.SaveChangesAsync(token);
                return await MapAsync(order, true, false, token);
            }, cancellationToken: cancellationToken, concurrencyScope: $"lab-order:{orderId}", isolationLevel: IsolationLevel.Serializable);
        return execution.Response;
    }

    private async Task<StandardLabOrderPreviewDto> BuildStandardPreviewAsync(LabServiceOrder order, OrderTenantContext tenant,
        Guid offeringId, CancellationToken token)
    {
        var offering = await new LabServiceOfferingService(dbContext).ReadOneAsync(offeringId, token);
        var blockers = new List<string>();
        if (!tenant.Membership.IsOrganizationAdmin) blockers.Add("An organization administrator must place a standard order.");
        if (order.Status is not (LabServiceOrderStatus.DraftRequest or LabServiceOrderStatus.ChangesRequested))
            blockers.Add("Only an unplaced draft can be placed as a standard order.");
        if (order.SourceRequestId.HasValue || order.ProposedUnitPrice.HasValue)
            blockers.Add("This Job uses sales-assisted or custom pricing. Continue its pricing request.");
        if (order.Samples.Count != 0) blockers.Add("Resolve legacy draft samples before placing this Job.");
        if (!offering.IsAvailable) blockers.Add("This offering is no longer available. Choose a current offering.");
        if (order.RequestedSpecimenCount is < 1 or > 100 || order.SourceGroups.Count == 0
            || order.SourceGroups.Sum(value => value.SpecimenCount) != order.RequestedSpecimenCount)
            blockers.Add("Complete the Job's specimen count and biological-source groups.");
        if (order.SourceGroups.Any(value => !offering.AllowedBiologicalSources.Contains(value.BiologicalSource, StringComparer.OrdinalIgnoreCase)))
            blockers.Add("A biological source is outside this standard offering. Request custom work.");
        var readiness = await new OperationalReadinessService(dbContext).EvaluateAsync(tenant.Organization, token, tenant.Department.Id);
        blockers.AddRange(readiness.Evaluation.Blockers.Select(value => $"{value.Label}: {value.NextAction}"));
        if (!orderToCashOptions.Value.NativePSeqAccountsReceivable)
            blockers.Add("Standard order billing is not enabled. Continue through the manual pricing workflow.");
        var profile = await dbContext.OrganizationCommercialProfiles.AsNoTracking().SingleOrDefaultAsync(value => value.OrganizationId == order.OrganizationId, token);
        var billingEmail = tenant.Configuration.BillingContactEmail ?? profile?.BillingContactEmail;
        var financeReady = profile is not null && !string.IsNullOrWhiteSpace(profile.BillingContactName)
            && System.Net.Mail.MailAddress.TryCreate(billingEmail, out _) && profile.HasCompleteBillingAddress
            && profile.PaymentTermsDays is >= 0 and <= 365 && profile.HasEffectiveTaxDecision && profile.HasFinanceApprovedTaxDecision;
        if (!financeReady) blockers.Add("Complete billing details and Finance-approved tax before reviewing a final standard total.");
        var subtotal = decimal.Round(offering.UnitPrice * order.RequestedSpecimenCount, 2, MidpointRounding.AwayFromZero);
        decimal? tax = financeReady ? profile!.TaxDecision == EffectiveTaxDecision.Taxable
            ? decimal.Round(subtotal * profile.ApprovedTaxRate!.Value, 2, MidpointRounding.AwayFromZero) : 0 : null;
        var analysisVersions = await dbContext.AnalysisDefinitions.AsNoTracking().Where(value => offering.AnalysisIds.Contains(value.Id))
            .OrderBy(value => value.Id).Select(value => new { value.Id, value.Version }).ToListAsync(token);
        var configurationVersion = await dbContext.OrderSystemConfigurations.AsNoTracking().OrderBy(value => value.CreatedAt)
            .Select(value => (long?)value.Version).FirstOrDefaultAsync(token);
        var reviewToken = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new {
            order.Id, order.Version, offering, analysisVersions, configurationVersion,
            profileVersion = profile?.Version, departmentVersion = tenant.Department.Version,
            organizationVersion = tenant.Organization.Version, subtotal, tax
        }, JsonSerializerOptions))));
        return new(offering, order.RequestedSpecimenCount, subtotal, tax, tax.HasValue ? subtotal + tax.Value : null,
            offering.Currency, blockers.Count == 0, blockers.Distinct().ToList(), order.Version, profile?.Version,
            tenant.Department.Version, tenant.Organization.Version, reviewToken);
    }
}
