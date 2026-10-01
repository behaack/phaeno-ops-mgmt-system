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
        if (!tenant.IsDepartmentAdmin)
            throw new OrderManagementException("organization_administrator_required",
                "An organization or assigned-department administrator must place a standard order.", StatusCodes.Status403Forbidden);
        if (!request.ProhibitedDataConfirmed)
            throw Invalid("prohibited_data_confirmation_required", "Confirm that the order contains no prohibited data.");
        await ReadOrderAsync(orderId, tenant, cancellationToken);
        var execution = await idempotency.ExecuteAsync(tenant.Actor.Id, $"lab-order:{orderId}:place-standard",
            idempotency.RequireKey(HttpContext), request, async token =>
            {
                // Re-read the selected membership and Department inside the commitment transaction.
                dbContext.ChangeTracker.Clear();
                var currentTenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, token);
                if (!currentTenant.IsDepartmentAdmin)
                    throw new OrderManagementException("organization_administrator_required",
                        "An organization or assigned-department administrator must place a standard order.", StatusCodes.Status403Forbidden);
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
                if (!request.ConfirmedSampleTypeId.HasValue || request.ConfirmedSampleTypeId != order.SampleTypeDefinitionId
                    || offering.SupportedSampleTypes?.Any(value => value.Id == request.ConfirmedSampleTypeId && value.IsAvailable) != true)
                    throw Conflict("sample_type_confirmation_required", "Confirm the Sample type supported by this offering. Review a different order if it needs to change.");
                if (!request.KitDeliveryLocationId.HasValue || !request.KitDeliveryLocationVersion.HasValue)
                    throw Invalid("kit_delivery_location_required", "Select and confirm the kit delivery address.");
                var kitLocation = await dbContext.CustomerDeliveryLocations.AsNoTracking().SingleOrDefaultAsync(item =>
                    item.Id == request.KitDeliveryLocationId && item.OrganizationId == order.OrganizationId
                    && item.DepartmentId == order.DepartmentId && item.IsActive, token)
                    ?? throw Conflict("kit_delivery_location_unavailable", "Choose an active kit delivery address in this Department.");
                EnsureVersion(kitLocation.Version, request.KitDeliveryLocationVersion.Value);
                var analyses = await dbContext.AnalysisDefinitions.AsNoTracking().Where(value => offering.AnalysisIds.Contains(value.Id))
                    .Select(value => new { value.Id, value.Name, value.Description, value.SubmissionInstructions,
                        value.RequiredIntakeFieldsJson, value.ResultContractJson, value.Version }).ToListAsync(token);
                var now = DateTime.UtcNow;
                var snapshot = new ConfiguredLabServiceSnapshot(offering.Id, offering.FamilyId, offering.OfferingVersion,
                    offering.Version, offering.Name, offering.CatalogItemId, offering.CatalogCode, offering.CatalogItemVersion,
                    offering.Currency, offering.UnitPrice, order.RequestedSpecimenCount, preview.Subtotal, preview.Tax!.Value,
                    preview.Total!.Value, offering.AnalysisIds, JsonSerializer.Serialize(analyses, JsonSerializerOptions),
                    offering.IncludedOutputContract, offering.MinimumTurnaroundDays, offering.MaximumTurnaroundDays, now,
                    offering.SupportedSampleTypes!.Select(type => type.Id).ToArray(), order.RequestedSequencingRunCount,
                    offering.MaximumTurnaroundDays, preview.PriceProvenance);
                var lines = JsonSerializer.Serialize(new[] { new { catalogItemId = offering.CatalogItemId,
                    externalItemId = offering.CatalogCode, description = $"{offering.Name}: library preparation, one run and data assembly per sample",
                    quantity = order.RequestedSpecimenCount, unitPrice = offering.UnitPrice,
                    pricingComponent = LabPhasePricing.StandardSample } }, JsonSerializerOptions);
                var quote = new LabServiceQuote(order.Id, order.Quotes.Select(value => value.Revision).DefaultIfEmpty(0).Max() + 1,
                    QuotePurpose.Initial, lines, preview.Subtotal, preview.Tax.Value, offering.Currency, now, now.AddDays(1));
                quote.SetDeliveryTarget(offering.MaximumTurnaroundDays);
                LabPhasePlans.FreezeQuote(order, quote);
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
                    purchaseOrderNumber = purchaseOrder, order.RequestedSpecimenCount, order.RequestedSequencingRunCount,
                    sourceGroups = order.SourceGroups.Select(value => new { value.BiologicalSource, value.SpecimenCount }),
                    order.TubeUsePolicyKey, order.TubeUsePolicyVersion,
                    order.StorageRequirements, order.SafetyDeclaration, serviceKey = OrderServiceKeys.PSeqLabService,
                    materialType = order.SampleTypeMaterialClassSnapshot ?? StandardMaterialType, quantityUnit = StandardQuantityUnit, quoteId = quote.Id,
                    quote.Revision, quote.LinesJson, quote.Total, quote.Currency, acceptedAt = now,
                    configuredOffering = snapshot, prohibitedDataConfirmed = true,
                    confirmedSampleTypeId = request.ConfirmedSampleTypeId,
                    kitDeliveryAddress = kitLocation.ToDto()
                }, JsonSerializerOptions);
                var before = order.Status.ToString();
                await ShippingJobPinning.PinAtPlacementAsync(dbContext, order, token);
                Execute(() => order.PlaceStandard(quote.Id, snapshot, placement, now));
                await transportationKits.QueueAtAcceptanceAsync(order, kitLocation, currentTenant.Actor.Id, token);
                dbContext.OrderStatusEvents.Add(NewEvent(order, before, order.Status.ToString(), currentTenant.Actor.Id));
                QueueNotice(order, "lab-standard-order-placed", "Standard laboratory order placed",
                    $"{order.OrderNumber} is placed. Phaeno is preparing Transportation kits; confirm physical receipt before pairing samples and tubes.", currentTenant.Actor.Id);
                await new CommercialSaleSummaryService(dbContext).StageAsync(OrderWorkflowTypes.LabService, order.Id,
                    order.OrganizationId, null, offering.Name, order.RequestedSequencingRunCount, quote.Total, quote.Currency,
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
        var price = await LabServicePriceResolver.ResolveAsync(dbContext, order.OrganizationId, order.DepartmentId, offering, token);
        offering = offering with { UnitPrice = price.UnitPrice, PriceProvenance = price };
        var blockers = new List<string>();
        if (tenant.Organization.Kind == PSeq.Operations.Commercial.Accounts.Domain.OrganizationKind.Customer)
        {
            var limitBlocker = CustomerStandardOrderRules.SampleLimitBlocker(order.RequestedSpecimenCount, offering.MaximumCustomerSamples);
            if (limitBlocker is not null) blockers.Add(limitBlocker);
        }
        if (order.Phases.Count(p => p.SupersededAtUtc == null) != 1 || order.Phases.Any(p => p.ScopeJson != null))
            blockers.Add("Customer standard orders use one scope. Contact Sales for phased orders.");
        if (order.ReadCustomerDraft() is { } draft && draft.OfferingId != offeringId)
            blockers.Add("Review the service selected in your saved Draft.");
        if (!await LabDeliveryCalendarReadiness.HasCoverageAsync(dbContext, offering.MaximumTurnaroundDays, token))
            blockers.Add("Phaeno must configure an observed-holiday calendar covering this delivery target before the order can be placed.");
        if (!tenant.IsDepartmentAdmin) blockers.Add("An organization or assigned-department administrator must place a standard order.");
        if (order.Status is not (LabServiceOrderStatus.DraftRequest or LabServiceOrderStatus.ChangesRequested))
            blockers.Add("Only an unplaced draft can be placed as a standard order.");
        if (order.SourceRequestId.HasValue || order.ProposedUnitPrice.HasValue)
            blockers.Add("This Job uses sales-assisted or custom pricing. Continue its pricing request.");
        if (order.RequestedSequencingRunCount > order.RequestedSpecimenCount)
            blockers.Add("Standard sample pricing includes one run per sample. Submit for pricing so Phaeno can quote additional runs separately using the prepared library.");
        if (order.Samples.Count != 0) blockers.Add("Resolve legacy draft samples before placing this Job.");
        if (!order.SampleTypeDefinitionId.HasValue)
            blockers.Add("Select one sample type for this Job before placing it.");
        else
        {
            var orderableTypes = await LabOrderSampleTypeChoices.ReadAsync(dbContext, token);
            if (!orderableTypes.Any(value => value.Id == order.SampleTypeDefinitionId.Value))
                blockers.Add("The selected Sample type is no longer ready for ordering. Choose a current Sample type with an Active procedure and usable Transportation kit.");
            var selectedKey = await dbContext.SampleTypeDefinitions.AsNoTracking()
                .Where(value => value.Id == order.SampleTypeDefinitionId.Value)
                .Select(value => (Guid?)value.DefinitionKey).SingleOrDefaultAsync(token);
            var supportedTypeIds = offering.SupportedSampleTypes?.Select(type => type.Id).ToArray() ?? [];
            var supportedKeys = await dbContext.SampleTypeDefinitions.AsNoTracking()
                .Where(value => supportedTypeIds.Contains(value.Id))
                .Select(value => value.DefinitionKey).ToArrayAsync(token);
            if (!selectedKey.HasValue || !supportedKeys.Contains(selectedKey.Value))
                blockers.Add("This offering does not support the Job's selected sample type. Choose a supporting offering or create a separate order.");
        }
        if (!offering.IsAvailable) blockers.Add("This offering is no longer available. Choose a current offering.");
        if (order.RequestedSpecimenCount is < 1 or > 10000 || order.SourceGroups.Count == 0
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
        decimal? tax = financeReady && order.RequestedSequencingRunCount == order.RequestedSpecimenCount ? profile!.TaxDecision == EffectiveTaxDecision.Taxable
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
            tenant.Department.Version, tenant.Organization.Version, reviewToken, order.RequestedSequencingRunCount, price);
    }
}
