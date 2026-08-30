namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Data;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Commercial.LabOperations.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.OrderToCash;
using PhaenoPortal.App.Infrastructure.Persistence;
using VersionRequest = PhaenoPortal.App.Features.OrderManagement.DTOs.VersionRequest;
using ReasonRequest = PhaenoPortal.App.Features.OrderManagement.DTOs.ReasonRequest;

[ApiController]
[Authorize]
[Route("api/platform/lab-service-orders")]
public sealed class PlatformLabServiceOrdersController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    OrderIdempotencyService idempotency,
    IOperationalFileStorage fileStorage,
    IOperationalFileScanner fileScanner,
    IOptions<OrderManagementOptions> options,
    IOptions<OrderToCashOptions> orderToCashOptions,
    OperationalReadinessService operationalReadiness,
    OrderToCashAuthorization orderToCashAuthorization,
    NativeInvoiceService nativeInvoices,
    ILabOperationsProvider labOperationsProvider,
    ReleasedDeliverableRetentionSnapshotService retentionSnapshots) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpGet("eligible-customers")]
    public async Task<IReadOnlyList<EligibleCustomerOrganizationDto>> ListEligibleCustomers(
        CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        if (orderToCashOptions.Value.Features.BusinessRoles)
            _ = await orderToCashAuthorization.RequireAsync(
                HttpContext, BusinessRole.CommercialOperator, cancellationToken);
        if (orderToCashOptions.Value.Features.DerivedReadiness)
        {
            var customers = await dbContext.Organizations.AsNoTracking()
                .Where(value => value.Kind == OrganizationKind.Customer && value.IsActive)
                .OrderBy(value => value.Name)
                .Select(value => new { value.Id, value.Name })
                .ToListAsync(cancellationToken);
            var results = new List<EligibleCustomerOrganizationDto>();
            foreach (var customer in customers)
            {
                var evaluation = await operationalReadiness.EvaluateAsync(
                    customer.Id, DateTime.UtcNow, cancellationToken);
                if (evaluation.CanStageOrder)
                    results.Add(new EligibleCustomerOrganizationDto(
                        customer.Id,
                        customer.Name,
                        evaluation.CanStageOrder,
                        evaluation.CanIssueQuoteOrCommit,
                        evaluation.Blockers));
            }
            return results;
        }
        var now = DateTime.UtcNow;
        var offeringAvailable = await dbContext.QboCatalogItems.AsNoTracking()
            .AnyAsync(item => item.IsActive
                && item.ExternalItemId.ToLower() == OrderServiceKeys.PSeqLabService
                && item.SalesUnit.ToLower() == OrderSalesUnits.Specimen,
                cancellationToken);
        if (!offeringAvailable)
        {
            return [];
        }

        return await dbContext.Organizations.AsNoTracking()
            .Where(organization => organization.Kind == OrganizationKind.Customer
                && organization.IsActive
                && dbContext.OrganizationServiceEntitlements.Any(entitlement =>
                    entitlement.OrganizationId == organization.Id
                    && entitlement.Service == PortalService.PSeqLabService
                    && entitlement.ConfigurationStatus == EntitlementConfigurationStatus.Ready
                    && entitlement.EffectiveFrom <= now
                    && (!entitlement.EffectiveTo.HasValue || entitlement.EffectiveTo.Value > now))
                && dbContext.OrganizationMemberships.Any(membership =>
                    membership.OrganizationId == organization.Id
                    && membership.IsActive
                    && membership.IsOrganizationAdmin
                    && membership.User != null
                    && membership.User.IsActive
                    && membership.User.Status == UserAccountStatus.Active))
            .OrderBy(organization => organization.Name)
            .Select(organization => new EligibleCustomerOrganizationDto(
                organization.Id,
                organization.Name))
            .ToListAsync(cancellationToken);
    }

    [HttpGet]
    public async Task<PagedResult<OrderListItemDto>> List(
        [FromQuery] Guid? organizationId,
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] Guid? assignedToUserId,
        [FromQuery] bool unassigned = false,
        [FromQuery] bool overdue = false,
        [FromQuery] bool holds = false,
        [FromQuery] bool readyForIntake = false,
        [FromQuery] DateTime? updatedFrom = null,
        [FromQuery] DateTime? updatedTo = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.LabServiceOrders.AsNoTracking().Where(order => !order.IsDiscarded);
        if (organizationId.HasValue) query = query.Where(order => order.OrganizationId == organizationId);
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<LabServiceOrderStatus>(status, true, out var parsed)) throw Invalid("invalid_status", "The lab status is invalid.");
            query = query.Where(order => order.Status == parsed);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(order => order.OrderNumber.Contains(term) || (order.CustomerReference != null && order.CustomerReference.Contains(term))
                || dbContext.LabSamples.Any(sample => sample.LabServiceOrderId == order.Id
                    && (sample.CustomerSampleId.Contains(term) || (sample.AccessionId != null && sample.AccessionId.Contains(term)))));
        }
        if (assignedToUserId.HasValue) query = query.Where(order => order.AssignedToUserId == assignedToUserId.Value);
        if (unassigned) query = query.Where(order => order.AssignedToUserId == null);
        if (holds) query = query.Where(order => order.Status == LabServiceOrderStatus.OnHold);
        if (readyForIntake) query = query.Where(order => order.SampleRosterFinalizedAt != null);
        if (overdue)
        {
            var now = DateTime.UtcNow;
            query = query.Where(order => order.DueAt != null && order.DueAt < now
                && order.Status != LabServiceOrderStatus.Completed && order.Status != LabServiceOrderStatus.Cancelled && order.Status != LabServiceOrderStatus.Declined);
        }
        if (updatedFrom.HasValue) query = query.Where(order => order.UpdatedAt >= updatedFrom.Value);
        if (updatedTo.HasValue) query = query.Where(order => order.UpdatedAt < updatedTo.Value);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(order => order.UpdatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(order => new OrderListItemDto(order.Id, order.OrderNumber, order.Status.ToString(), order.CustomerReference,
                order.OrganizationId, order.CreatedAt, order.UpdatedAt, order.Version, order.TenantSafeReason,
                order.AssignedToUserId, order.DueAt, order.DueAt != null && order.DueAt < DateTime.UtcNow
                    && order.Status != LabServiceOrderStatus.Completed && order.Status != LabServiceOrderStatus.Cancelled && order.Status != LabServiceOrderStatus.Declined)).ToListAsync(cancellationToken);
        return new PagedResult<OrderListItemDto>(items, page, pageSize, total);
    }

    [HttpPost]
    public async Task<LabServiceOrderDto> Initiate(
        [FromBody] InitiateCustomerLabOrderRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        if (orderToCashOptions.Value.Features.BusinessRoles)
            _ = await orderToCashAuthorization.RequireAsync(
                HttpContext, BusinessRole.CommercialOperator, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        const string scope = "platform:lab-order:initiate";
        var execution = await idempotency.ExecuteAsync(
            actor.Id,
            scope,
            key,
            request,
            async operationCancellationToken =>
            {
                if (!request.ProhibitedDataConfirmed)
                    throw Invalid(
                        "prohibited_data_confirmation_required",
                        "Confirm that the Job pricing details contain no patient identifiers, PHI, or unnecessary personal data.");

                CrmHandoff? sourceHandoff = null;
                if (request.SourceRequestId.HasValue)
                {
                    sourceHandoff = await dbContext.CrmHandoffs
                        .Include(value => value.Company)
                        .Include(value => value.Opportunity).ThenInclude(value => value!.Stage)
                        .Include(value => value.RelationshipRequest).ThenInclude(value => value.RequestedServices)
                        .SingleOrDefaultAsync(
                            value => value.RelationshipRequestId == request.SourceRequestId.Value,
                            operationCancellationToken)
                        ?? throw Conflict(
                            "crm_handoff_not_found",
                            "The selected CRM handoff was not found.");
                    var sourceRequest = sourceHandoff.RelationshipRequest;
                    if (sourceRequest.Source != PortalIntegrationRequestSource.FirstPartyCrm
                        || sourceRequest.RequestType != PortalIntegrationRequestType.SalesAssistedOrder)
                        throw Conflict("crm_handoff_not_orderable", "Only a first-party CRM Customer order handoff can start an order.");
                    if (await dbContext.LabServiceOrders.AsNoTracking().AnyAsync(
                        value => value.SourceRequestId == sourceRequest.Id,
                        operationCancellationToken))
                        throw Conflict("crm_handoff_order_exists", "This CRM handoff has already started an order.");
                    if (sourceRequest.Status != PortalIntegrationRequestStatus.Approved)
                        throw Conflict("crm_handoff_not_approved", "The CRM handoff must be approved before it can start an order.");
                    if (sourceRequest.OrganizationId != request.OrganizationId
                        || sourceRequest.RequestedOrganizationKind != OrganizationKind.Customer)
                        throw Conflict("crm_handoff_customer_mismatch", "The CRM handoff is not approved for the selected Customer organization.");
                    if (!sourceRequest.RequestedServices.Any(value => value.Service == PortalService.PSeqLabService))
                        throw Conflict("crm_handoff_service_mismatch", "The CRM handoff does not request PSeq Lab Service.");
                    if (sourceHandoff.Opportunity is not null
                        && sourceHandoff.Opportunity.Stage.Category != CrmPipelineStageCategory.Won)
                        throw Conflict("crm_handoff_opportunity_not_won", "The linked Opportunity must be Won before its handoff can start an order.");
                }

                var customer = await dbContext.Organizations.AsNoTracking()
                    .SingleOrDefaultAsync(
                        organization => organization.Id == request.OrganizationId
                            && organization.Kind == OrganizationKind.Customer
                            && organization.IsActive,
                        operationCancellationToken)
                    ?? throw Conflict(
                        "customer_not_available",
                        "Select an active Customer organization before initiating the order.");
                if (orderToCashOptions.Value.Features.DerivedReadiness)
                {
                    var evaluation = await operationalReadiness.EvaluateAsync(
                        customer.Id, DateTime.UtcNow, operationCancellationToken);
                    if (!evaluation.CanStageOrder)
                        throw Conflict(
                            "customer_not_stage_eligible",
                            "Resolve the blocking Customer configuration before staging this PSeq Job.",
                            evaluation.Blockers);
                }
                else
                {
                    var hasActiveAdministrator = await dbContext.OrganizationMemberships.AsNoTracking()
                        .AnyAsync(
                            membership => membership.OrganizationId == customer.Id
                                && membership.IsActive
                                && membership.IsOrganizationAdmin
                                && membership.User != null
                                && membership.User.IsActive
                                && membership.User.Status == UserAccountStatus.Active,
                            operationCancellationToken);
                    if (!hasActiveAdministrator)
                    {
                        throw Conflict(
                            "customer_approver_required",
                            "This Customer needs an active organization administrator before an order can be sent for approval.");
                    }

                    await LabServiceOrderingEligibility.RequireAsync(
                        dbContext,
                        customer.Id,
                        DateTime.UtcNow,
                        operationCancellationToken);
                }

                var normalizedJobName = NormalizeJobName(request.CustomerReference);
                await EnsureUniqueJobNameAsync(customer.Id, normalizedJobName, operationCancellationToken);
                var sourceGroups = ValidatePricingProfile(request.RequestedSpecimenCount, request.SourceGroups);
                var configuration = await dbContext.OrderSystemConfigurations.AsNoTracking()
                    .OrderBy(item => item.CreatedAt)
                    .FirstOrDefaultAsync(operationCancellationToken);
                var order = new LabServiceOrder(
                    customer.Id,
                    await GenerateUniqueJobNumberAsync(operationCancellationToken),
                    request.CustomerReference,
                    request.Description,
                    request.RequestedSpecimenCount,
                    sourceGroups.Count > 1,
                    sourceGroups.Count == 1 ? sourceGroups[0].BiologicalSource : null,
                    request.StorageRequirements,
                    request.SafetyDeclaration,
                    configuration?.SampleSubmissionInstructions ?? string.Empty,
                    request.SourceRequestId);
                foreach (var group in sourceGroups)
                {
                    order.SourceGroups.Add(new LabServiceSourceGroup(
                        order.Id,
                        group.BiologicalSource,
                        group.SpecimenCount));
                }

                var initiatedAt = DateTime.UtcNow;
                dbContext.LabServiceOrders.Add(order);
                Event(order, "Created", order.Status.ToString(), actor.Id);
                var draftStatus = order.Status.ToString();
                Execute(() => order.Submit(actor.Id, initiatedAt));
                var revision = new LabServiceRequestRevision(
                    order.Id,
                    order.RequestRevision,
                    null,
                    BuildRequestSnapshot(order),
                    null,
                    actor.Id,
                    initiatedAt);
                dbContext.LabServiceRequestRevisions.Add(revision);
                Event(order, draftStatus, order.Status.ToString(), actor.Id);
                var submittedStatus = order.Status.ToString();
                Execute(order.BeginQuotePreparation);
                Event(order, submittedStatus, order.Status.ToString(), actor.Id);

                if (sourceHandoff is not null)
                {
                    Execute(() => sourceHandoff.RelationshipRequest.MarkApplied(
                        $"Started Customer order {order.OrderNumber}.",
                        actor.Id,
                        initiatedAt));
                    dbContext.CrmActivities.Add(new CrmActivity(
                        CrmActivityType.PortalEvent,
                        "Customer order started",
                        $"CRM handoff {sourceHandoff.RelationshipRequest.RequestNumber} started order {order.OrderNumber}.",
                        initiatedAt,
                        CrmActivityVisibility.Internal,
                        actor.Id,
                        sourceHandoff.CompanyId,
                        opportunityId: sourceHandoff.OpportunityId));
                }

                await dbContext.SaveChangesAsync(operationCancellationToken);
                return await MapAsync(order, operationCancellationToken);
            },
            statusCode: StatusCodes.Status201Created,
            cancellationToken: cancellationToken,
            concurrencyScope: request.SourceRequestId.HasValue
                ? $"crm-handoff-order:{request.SourceRequestId.Value:N}"
                : null);
        Response.StatusCode = execution.StatusCode;
        return execution.Response;
    }

    [HttpGet("{orderId:guid}")]
    public async Task<LabServiceOrderDto> Get(Guid orderId, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        return await MapAsync(await ReadAsync(orderId, cancellationToken), cancellationToken);
    }

    [HttpGet("{orderId:guid}/lab-intake")]
    public async Task<LabIntakeDto> GetLabIntake(Guid orderId, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await dbContext.LabServiceOrders.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == orderId && !item.IsDiscarded, cancellationToken)
            ?? throw Missing();

        if (order.Status is not (LabServiceOrderStatus.PlacedAwaitingSamples
            or LabServiceOrderStatus.InProgress
            or LabServiceOrderStatus.ResultsAvailable))
        {
            throw Conflict("lab_intake_not_ready", "Lab intake is available after the laboratory order is placed.");
        }

        var authorization = await dbContext.CommercialLabAuthorizations.AsNoTracking()
            .SingleOrDefaultAsync(item => item.CommercialOrderId == order.Id, cancellationToken)
            ?? throw Conflict("lab_authorization_missing", "The accepted laboratory order has not been authorized.");
        if (authorization.Status != CommercialLabAuthorizationStatus.Accepted || authorization.LabWorkOrderId is null)
        {
            throw Conflict("lab_authorization_missing", "The accepted laboratory order has not been authorized.");
        }

        return new LabIntakeDto(order.Id, order.OrderNumber, authorization.LabWorkOrderId.Value);
    }

    [HttpPost("{orderId:guid}/begin-quote")]
    public async Task<LabServiceOrderDto> BeginQuote(Guid orderId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var before = order.Status.ToString();
        Execute(order.BeginQuotePreparation);
        Event(order, before, order.Status.ToString(), actor.Id);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/request-changes")]
    public async Task<LabServiceOrderDto> RequestChanges(Guid orderId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var before = order.Status.ToString();
        Execute(() => order.RequestChanges(request.Reason, request.InternalNote));
        Event(order, before, order.Status.ToString(), actor.Id, request.Reason, request.InternalNote);
        var actingAdministratorId = await ResolveActingAdministratorAsync(order, cancellationToken);
        if (actingAdministratorId.HasValue)
        {
            Notice(order, "lab-changes-requested", "Changes requested for laboratory service", $"Phaeno requested changes to {order.OrderNumber}: {request.Reason}", actingAdministratorId);
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/decline")]
    public async Task<LabServiceOrderDto> Decline(Guid orderId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var before = order.Status.ToString();
        Execute(() => order.Decline(request.Reason, request.InternalNote));
        Event(order, before, order.Status.ToString(), actor.Id, request.Reason, request.InternalNote);
        var actingAdministratorId = await ResolveActingAdministratorAsync(order, cancellationToken);
        if (actingAdministratorId.HasValue)
        {
            Notice(order, "lab-request-declined", "Laboratory request declined", $"{order.OrderNumber} was declined: {request.Reason}", actingAdministratorId);
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/quotes")]
    public async Task<LabServiceOrderDto> IssueQuote(Guid orderId, [FromBody] IssueQuoteRequest request, CancellationToken cancellationToken)
    {
        var actor = orderToCashOptions.Value.Features.BusinessRoles
            ? (await orderToCashAuthorization.RequireAsync(HttpContext, BusinessRole.CommercialOperator, cancellationToken)).User
            : await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var scope = $"platform:lab-order:{orderId}:quote";
        var execution = await idempotency.ExecuteAsync(
            actor.Id,
            scope,
            key,
            request,
            async operationCancellationToken =>
            {
                var order = await ReadAsync(orderId, operationCancellationToken);
                EnsureVersion(order.Version, request.Version);
                await LabServiceOrderingEligibility.RequireAsync(
                    dbContext,
                    order.OrganizationId,
                    DateTime.UtcNow,
                    operationCancellationToken);
                await RequireCustomerApproverAsync(order.OrganizationId, operationCancellationToken);
                if (orderToCashOptions.Value.Features.DerivedReadiness)
                {
                    var readiness = await operationalReadiness.EvaluateAsync(order.OrganizationId,
                        DateTime.UtcNow, operationCancellationToken);
                    if (!readiness.CanIssueQuoteOrCommit)
                        throw Conflict("operational_readiness_incomplete",
                            "The Customer is not ready for quote issuance.",
                            readiness.Blockers);
                }
                if (order.Status == LabServiceOrderStatus.SubmittedForQuote) Execute(order.BeginQuotePreparation);
                if (order.Status != LabServiceOrderStatus.QuoteInPreparation && order.Status != LabServiceOrderStatus.QuoteIssued)
                    throw Conflict("quote_not_allowed", "A quote can be issued only while pricing this request.");
                if (request.Lines.Count == 0) throw Invalid("quote_lines_required", "At least one quote line is required.");
                if (request.Lines.Any(line => line.Quantity <= 0 || line.UnitPrice < 0)) throw Invalid("invalid_quote_line", "Quote quantities must be positive and prices cannot be negative.");
                var itemIds = request.Lines.Select(line => line.CatalogItemId).Distinct().ToList();
                var catalog = await dbContext.QboCatalogItems.AsNoTracking().Where(item => itemIds.Contains(item.Id) && item.IsActive)
                    .ToDictionaryAsync(item => item.Id, operationCancellationToken);
                if (catalog.Count != itemIds.Count) throw Invalid("catalog_item_unavailable", "One or more commercial catalog items are unavailable.");
                var labServiceLines = request.Lines
                    .Where(line => OrderServiceKeys.IsPSeqLabService(catalog[line.CatalogItemId].ExternalItemId))
                    .ToList();
                if (labServiceLines.Count != 1)
                    throw Invalid(
                        "quote_lab_service_line_required",
                        $"Add exactly one active {OrderServiceKeys.PSeqLabService} catalog line to the quote.");
                var labServiceLine = labServiceLines[0];
                var labServiceItem = catalog[labServiceLine.CatalogItemId];
                if (!OrderSalesUnits.IsSpecimen(labServiceItem.SalesUnit))
                    throw Invalid(
                        "quote_lab_service_catalog_invalid",
                        $"The {OrderServiceKeys.PSeqLabService} catalog item must use the {OrderSalesUnits.Specimen} sales unit.");
                if (labServiceLine.Quantity != order.RequestedSpecimenCount)
                    throw Invalid("quote_specimen_quantity_mismatch",
                        $"The {OrderServiceKeys.PSeqLabService} line must use the Job's committed quantity of {order.RequestedSpecimenCount}.");
                var now = DateTime.UtcNow;
                var config = await dbContext.OrderSystemConfigurations.AsNoTracking().OrderBy(item => item.CreatedAt).FirstOrDefaultAsync(operationCancellationToken);
                var expiresAt = request.ExpiresAt ?? now.AddDays(config?.QuoteValidityDays ?? 30);
                if (!Enum.TryParse<QuotePurpose>(request.Purpose, true, out var purpose)) throw Invalid("quote_purpose_invalid", "The quote purpose is invalid.");
                var snapshots = request.Lines.Select(line => new QuoteLineSnapshot(line.CatalogItemId, catalog[line.CatalogItemId].ExternalItemId,
                    line.Description.Trim(), line.Quantity, line.UnitPrice)).ToList();
                var subtotal = snapshots.Sum(line => decimal.Round(line.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero));
                OrganizationCommercialProfile? billingProfile = null;
                var tax = request.Tax;
                if (orderToCashOptions.Value.Features.NativePSeqAccountsReceivable)
                {
                    billingProfile = await dbContext.OrganizationCommercialProfiles
                        .SingleOrDefaultAsync(value => value.OrganizationId == order.OrganizationId,
                            operationCancellationToken);
                    if (billingProfile?.HasApprovedPSeqBillingConfiguration != true)
                        throw Conflict("billing_configuration_incomplete",
                            "Finance-approved billing and tax configuration is required before quote issuance.");
                    tax = billingProfile.PSeqTaxDecision == PSeq.Operations.Commercial.OrderToCash.Domain.TaxDecision.Taxable
                        ? decimal.Round(subtotal * (billingProfile.ApprovedTaxRate ?? 0), 2, MidpointRounding.AwayFromZero)
                        : 0;
                    if (decimal.Round(request.Tax, 2, MidpointRounding.AwayFromZero) != tax)
                        throw Invalid("quote_tax_mismatch", $"The calculated POMS tax is {tax:0.00} USD.");
                    if (!string.Equals(request.Currency, "USD", StringComparison.OrdinalIgnoreCase))
                        throw Invalid("quote_currency_not_supported", "PSeq quotes support USD only.");
                }
                var revision = order.Quotes.Count == 0 ? 1 : order.Quotes.Max(item => item.Revision) + 1;
                var quote = new LabServiceQuote(order.Id, revision, purpose, JsonSerializer.Serialize(snapshots, JsonOptions), subtotal,
                    tax, request.Currency, now, expiresAt);
                if (billingProfile is not null)
                {
                    quote.FreezePSeqBilling(JsonSerializer.Serialize(new
                    {
                        billingProfile.BillingContactName,
                        billingProfile.BillingContactEmail,
                        billingAddress = JsonSerializer.Deserialize<JsonElement>(billingProfile.BillingAddressJson!),
                        billingProfile.PaymentTermsDays,
                        taxDecision = billingProfile.PSeqTaxDecision,
                        billingProfile.ApprovedTaxRate,
                        billingProfile.TaxExemptionEvidenceReference,
                        billingProfile.TaxApprovedByUserId,
                        billingProfile.TaxApprovedAtUtc,
                        billingProfile.PSeqBillingConfigurationVersion
                    }, JsonOptions), billingProfile.PaymentTermsDays,
                    billingProfile.PSeqTaxDecision!.Value.ToString(), billingProfile.ApprovedTaxRate,
                    billingProfile.PSeqBillingConfigurationVersion);
                }
                var previous = order.Quotes.Where(item => item.Status is QuoteStatus.Issued or QuoteStatus.SyncPending).OrderByDescending(item => item.Revision).FirstOrDefault();
                previous?.Supersede(quote.Id);
                dbContext.LabServiceQuotes.Add(quote);
                var document = new CommercialDocumentLink(OrderWorkflowTypes.LabService, order.Id, CommercialDocumentKind.Estimate, quote.Total, quote.Currency);
                document.MarkReadyForManualAccounting(order.OrderNumber, now);
                dbContext.CommercialDocumentLinks.Add(document);
                Execute(quote.MarkIssued);
                var quoteBefore = order.Status.ToString();
                Execute(() => order.MarkQuoteIssued(quote.Id));
                Event(order, quoteBefore, order.Status.ToString(), actor.Id);
                Notice(order, "lab-quote-issued", "Laboratory quote ready for approval", $"Pricing for {order.OrderNumber} is ready for Customer review.");
                await dbContext.SaveChangesAsync(operationCancellationToken);
                return await MapAsync(order, operationCancellationToken);
            },
            cancellationToken: cancellationToken);
        return execution.Response;
    }

    [HttpPost("{orderId:guid}/samples/{sampleId:guid}/receive")]
    public async Task<LabServiceOrderDto> Receive(Guid orderId, Guid sampleId, [FromBody] LabSampleReceiptRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        var sample = order.Samples.SingleOrDefault(item => item.Id == sampleId) ?? throw Missing();
        EnsureVersion(sample.Version, request.Version);
        var before = sample.Status.ToString();
        Execute(() => sample.Receive(request.ReceivedAt, request.ReceiptCondition));
        Event(order, before, sample.Status.ToString(), actor.Id, childId: sample.Id);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/samples/{sampleId:guid}/accession")]
    public async Task<LabServiceOrderDto> Accession(Guid orderId, Guid sampleId, [FromBody] LabSampleAccessionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        var sample = order.Samples.SingleOrDefault(item => item.Id == sampleId) ?? throw Missing();
        EnsureVersion(sample.Version, request.Version);
        var before = sample.Status.ToString();
        Execute(() => sample.Accession(request.AccessionId));
        Event(order, before, sample.Status.ToString(), actor.Id, childId: sample.Id);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/samples/{sampleId:guid}/transition")]
    public async Task<LabServiceOrderDto> TransitionSample(Guid orderId, Guid sampleId, [FromBody] LabSampleTransitionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        if (!Enum.TryParse<LabSampleStatus>(request.Status, true, out var target)) throw Invalid("sample_status_invalid", "The sample status is invalid.");
        var order = await ReadAsync(orderId, cancellationToken);
        var sample = order.Samples.SingleOrDefault(item => item.Id == sampleId) ?? throw Missing();
        EnsureVersion(sample.Version, request.Version);
        var before = sample.Status.ToString();
        Execute(() => sample.TransitionTo(target, request.Reason, request.InternalNote));
        if (target is LabSampleStatus.LabAnalysis or LabSampleStatus.DataProcessing) Execute(order.MarkWorkStarted);
        Event(order, before, sample.Status.ToString(), actor.Id, request.Reason, request.InternalNote, sample.Id);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/samples/{sampleId:guid}/results")]
    [RequestSizeLimit(104_857_600)]
    public async Task<OperationalFileDto> UploadResult(Guid orderId, Guid sampleId, [FromForm] IFormFile file,
        [FromForm] string analysisProfile, [FromForm] string pipelineVersion, [FromForm] string provenance,
        [FromForm] string qcStatus, CancellationToken cancellationToken)
    {
        if (orderToCashOptions.Value.Features.GovernedPSeqResults)
            throw Conflict("manual_result_upload_retired",
                "PSeq final deliverables must be registered by the governed pipeline package workflow.");
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        var sample = order.Samples.SingleOrDefault(item => item.Id == sampleId) ?? throw Missing();
        if (sample.Status is not (LabSampleStatus.DataProcessing or LabSampleStatus.DataAvailable))
            throw Conflict("result_upload_not_allowed", "Results can be uploaded only during data processing or review.");
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!options.Value.AllowedFileKinds.ContainsKey(extension))
            throw Invalid("file_kind_not_allowed", "This result file type is not allowed.");
        StoredOperationalFile stored;
        await using (var stream = file.OpenReadStream())
            stored = await fileStorage.SaveAsync(stream, extension, options.Value.MaximumFileBytes, cancellationToken);
        try
        {
            var scan = await fileScanner.ScanAsync(stored.StorageKey, cancellationToken);
            var managed = new ManagedOperationalFile(order.OrganizationId, OrderWorkflowTypes.LabService, order.Id, sample.Id,
                OperationalFilePurpose.LabResult, file.FileName, extension, file.ContentType ?? "application/octet-stream",
                stored.SizeBytes, stored.Sha256, stored.StorageKey);
            managed.RecordScan(scan.Status, scan.Message);
            var releaseVersion = await dbContext.LabResultReleases.CountAsync(item => item.LabSampleId == sample.Id, cancellationToken) + 1;
            var release = new LabResultRelease(order.OrganizationId, order.Id, sample.Id, releaseVersion, analysisProfile,
                pipelineVersion, provenance, qcStatus, JsonSerializer.Serialize(new { fileId = managed.Id }, JsonOptions), DateTime.UtcNow);
            dbContext.ManagedOperationalFiles.Add(managed);
            dbContext.LabResultReleases.Add(release);
            await dbContext.SaveChangesAsync(cancellationToken);
            return managed.ToDto();
        }
        catch
        {
            await fileStorage.DeleteIfExistsAsync(stored.StorageKey, cancellationToken);
            throw;
        }
    }

    [HttpPost("{orderId:guid}/samples/{sampleId:guid}/results/{releaseId:guid}/release")]
    public async Task<LabServiceOrderDto> ReleaseResult(Guid orderId, Guid sampleId, Guid releaseId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
    {
        if (orderToCashOptions.Value.Features.GovernedPSeqResults)
            throw Conflict("manual_result_release_retired",
                "PSeq results must be released from an approved governed output package.");
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var scope = $"platform:lab-order:{orderId}:sample:{sampleId}:result:{releaseId}:release";
        var execution = await idempotency.ExecuteAsync(
            actor.Id,
            scope,
            key,
            request,
            async operationCancellationToken =>
            {
                var order = await ReadAsync(orderId, operationCancellationToken);
                EnsureVersion(order.Version, request.Version);
                var sample = order.Samples.SingleOrDefault(item => item.Id == sampleId) ?? throw Missing();
                var release = await dbContext.LabResultReleases.FirstOrDefaultAsync(item => item.Id == releaseId && item.LabServiceOrderId == orderId && item.LabSampleId == sampleId, operationCancellationToken) ?? throw Missing();
                var releaseFileIds = ResultFileIds(release.ManifestJson);
                var files = await dbContext.ManagedOperationalFiles.Where(item => releaseFileIds.Contains(item.Id) && item.WorkflowId == orderId && item.ParentRecordId == sampleId
                    && item.Purpose == OperationalFilePurpose.LabResult && item.ReleaseStatus == FileReleaseStatus.Internal).ToListAsync(operationCancellationToken);
                if (releaseFileIds.Count == 0 || files.Count != releaseFileIds.Count || files.Any(item => item.ScanStatus != OperationalFileScanStatus.Clean))
                    throw Conflict("result_files_not_clean", "Every result file must pass scanning before release.");
                var profile = await dbContext.OrganizationCommercialProfiles.AsNoTracking().FirstOrDefaultAsync(item => item.OrganizationId == order.OrganizationId, operationCancellationToken);
                var invoicePaid = await dbContext.CommercialDocumentLinks.AsNoTracking().AnyAsync(item => item.WorkflowType == OrderWorkflowTypes.LabService
                    && item.WorkflowId == order.Id && item.Kind == CommercialDocumentKind.Invoice && item.SyncStatus == IntegrationStatus.Succeeded && item.Balance == 0, operationCancellationToken);
                var mayRelease = profile?.LabCreditApproved == true || invoicePaid;
                release.MarkReady(!mayRelease);
                var releasedAtUtc = DateTime.UtcNow;
                foreach (var item in files)
                {
                    if (mayRelease) item.Release(releasedAtUtc); else item.HoldForPayment();
                }
                if (mayRelease && release.Release(releasedAtUtc))
                    await retentionSnapshots.CaptureLabResultAsync(release, releasedAtUtc, operationCancellationToken);
                Execute(order.MarkResultsAvailable);
                if (sample.Status == LabSampleStatus.DataProcessing) Execute(() => sample.TransitionTo(LabSampleStatus.DataAvailable, null, null));
                Event(order, "ResultReview", mayRelease ? "ResultReleased" : "PaymentHold", actor.Id, childId: sample.Id);
                Notice(order, mayRelease ? "lab-result-released" : "lab-result-payment-hold",
                    mayRelease ? "Laboratory result available" : "Laboratory result awaiting payment",
                    mayRelease ? $"A result is available for {order.OrderNumber}." : $"A result for {order.OrderNumber} is ready but remains on payment hold. Contact Phaeno about release.");
                await dbContext.SaveChangesAsync(operationCancellationToken);
                return await MapAsync(order, operationCancellationToken);
            },
            cancellationToken: cancellationToken);
        return execution.Response;
    }

    [HttpPost("{orderId:guid}/hold")]
    public async Task<LabServiceOrderDto> Hold(Guid orderId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
        => await MutateOrder(orderId, request, (order) => order.PutOnHold(request.Reason, request.InternalNote), "hold", cancellationToken);

    [HttpPost("{orderId:guid}/release-hold")]
    public async Task<LabServiceOrderDto> ReleaseHold(Guid orderId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
        => await MutateOrder(orderId, request, (order) => order.ReleaseHold(request.Reason, request.InternalNote), "release-hold", cancellationToken);

    [HttpPost("{orderId:guid}/cancellation-requests/{cancellationId:guid}/decision")]
    public async Task<LabServiceOrderDto> DecideCancellation(Guid orderId, Guid cancellationId, [FromBody] CancellationDecisionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var cancellation = await dbContext.OrderCancellationRequests.FirstOrDefaultAsync(item => item.Id == cancellationId
            && item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == orderId, cancellationToken) ?? throw Missing();
        if (!Enum.TryParse<CancellationRequestStatus>(request.Status, true, out var decision) || decision == CancellationRequestStatus.Pending)
            throw Invalid("cancellation_decision_invalid", "A final cancellation decision is required.");
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);
        var before = order.Status.ToString();
        if (decision == CancellationRequestStatus.Approved)
        {
            var authorization = await dbContext.CommercialLabAuthorizations
                .SingleOrDefaultAsync(item => item.CommercialOrderId == order.Id, cancellationToken);
            if (authorization is not null)
            {
                var outcome = await labOperationsProvider.RequestCancellationAsync(
                    new RequestLabWorkCancellationCommand(
                        new LabOperationsCommandMetadata(Guid.NewGuid(), authorization.AuthorizationId, DateTime.UtcNow),
                        authorization.AuthorizationId,
                        authorization.AuthorizationVersion,
                        "commercial_cancellation_approved",
                        SubmittedSpecimenIds: null),
                    cancellationToken);
                if (outcome.Disposition is not LabCancellationDisposition.Accepted)
                {
                    throw Conflict(
                        "lab_cancellation_requires_review",
                        "Laboratory work has started or requires a separate specimen-level cancellation decision.");
                }
                authorization.MarkCancelled();
            }
        }
        cancellation.Decide(decision, request.Reason, actor.Id, DateTime.UtcNow);
        Execute(() => order.ResolveCancellation(decision is CancellationRequestStatus.Approved, request.Reason, null));
        Event(order, before, order.Status.ToString(), actor.Id, request.Reason);
        if (decision == CancellationRequestStatus.Approved)
        {
            Notice(
                order,
                "lab-cancellation-approved",
                "Laboratory service cancelled",
                $"Phaeno approved cancellation of {order.OrderNumber}: {request.Reason}");
        }
        else
        {
            var actingAdministratorId = await ResolveActingAdministratorAsync(order, cancellationToken);
            if (actingAdministratorId.HasValue)
            {
                Notice(
                    order,
                    "lab-cancellation-declined",
                    "Laboratory cancellation declined",
                    $"Phaeno declined cancellation of {order.OrderNumber}: {request.Reason}",
                    actingAdministratorId);
            }
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/complete")]
    public async Task<LabServiceOrderDto> Complete(Guid orderId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
    {
        var actor = orderToCashOptions.Value.Features.BusinessRoles
            ? (await orderToCashAuthorization.RequireAsync(HttpContext, BusinessRole.CommercialOperator, cancellationToken)).User
            : await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var scope = $"platform:lab-order:{orderId}:complete";
        var execution = await idempotency.ExecuteAsync(
            actor.Id,
            scope,
            key,
            request,
            async operationCancellationToken =>
            {
                var order = await ReadAsync(orderId, operationCancellationToken);
                EnsureVersion(order.Version, request.Version);
                var before = order.Status.ToString();
                Execute(() => order.Complete(DateTime.UtcNow));
                var acceptedQuote = order.Quotes.SingleOrDefault(item => item.Id == order.AcceptedQuoteId) ?? throw Conflict("accepted_quote_missing", "The accepted quote snapshot is unavailable.");
                if (orderToCashOptions.Value.Features.NativePSeqAccountsReceivable)
                    await nativeInvoices.IssueForCompletedOrderAsync(order, acceptedQuote,
                        actor.Id, order.CompletedAt!.Value, operationCancellationToken);
                else
                {
                    var invoice = new CommercialDocumentLink(OrderWorkflowTypes.LabService, order.Id, CommercialDocumentKind.Invoice, acceptedQuote.Total, acceptedQuote.Currency);
                    invoice.MarkReadyForManualAccounting(order.OrderNumber, DateTime.UtcNow);
                    dbContext.CommercialDocumentLinks.Add(invoice);
                }
                Event(order, before, order.Status.ToString(), actor.Id);
                var actingAdministratorId = await ResolveActingAdministratorAsync(order, operationCancellationToken);
                if (actingAdministratorId.HasValue)
                {
                    Notice(order, "lab-order-completed", "Laboratory service completed", $"Laboratory work for {order.OrderNumber} is complete.", actingAdministratorId);
                }
                await dbContext.SaveChangesAsync(operationCancellationToken);
                return await MapAsync(order, operationCancellationToken);
            },
            cancellationToken: cancellationToken);
        return execution.Response;
    }

    private async Task<LabServiceOrderDto> MutateOrder(Guid orderId, ReasonRequest request, Action<LabServiceOrder> action, string eventName, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var before = order.Status.ToString();
        Execute(() => action(order));
        Event(order, before, order.Status.ToString(), actor.Id, request.Reason, request.InternalNote);
        Notice(order, $"lab-{eventName}", "Laboratory order status changed", $"{order.OrderNumber}: {request.Reason}");
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    private async Task<LabServiceOrder> ReadAsync(Guid orderId, CancellationToken cancellationToken)
        => await dbContext.LabServiceOrders.Include(order => order.Samples).Include(order => order.SourceGroups)
            .Include(order => order.Quotes).Include(order => order.Revisions)
            .FirstOrDefaultAsync(order => order.Id == orderId && !order.IsDiscarded, cancellationToken) ?? throw Missing();

    private async Task RequireCustomerApproverAsync(
        Guid organizationId,
        CancellationToken cancellationToken)
    {
        var hasActiveAdministrator = await dbContext.OrganizationMemberships.AsNoTracking()
            .AnyAsync(membership => membership.OrganizationId == organizationId
                && membership.IsActive
                && membership.IsOrganizationAdmin
                && membership.User != null
                && membership.User.IsActive
                && membership.User.Status == UserAccountStatus.Active,
                cancellationToken);
        if (!hasActiveAdministrator)
        {
            throw Conflict(
                "customer_approver_required",
                "This Customer needs an active organization administrator before the quote can be issued.");
        }
    }

    private async Task<Guid?> ResolveActingAdministratorAsync(
        LabServiceOrder order,
        CancellationToken cancellationToken)
    {
        var candidateId = order.Quotes
            .Where(quote => quote.Id == order.AcceptedQuoteId)
            .Select(quote => quote.AcceptedByUserId)
            .SingleOrDefault()
            ?? order.SubmittedByUserId;
        if (!candidateId.HasValue)
        {
            return null;
        }

        return await dbContext.OrganizationMemberships.AsNoTracking()
            .Where(membership => membership.OrganizationId == order.OrganizationId
                && membership.UserId == candidateId.Value
                && membership.IsActive
                && membership.IsOrganizationAdmin
                && membership.User != null
                && membership.User.IsActive
                && membership.User.Status == UserAccountStatus.Active)
            .Select(membership => (Guid?)membership.UserId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<LabServiceOrderDto> MapAsync(LabServiceOrder order, CancellationToken cancellationToken)
    {
        var files = await dbContext.ManagedOperationalFiles.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == order.Id).OrderBy(item => item.CreatedAt).ToListAsync(cancellationToken);
        var releases = await dbContext.LabResultReleases.AsNoTracking().Where(item => item.LabServiceOrderId == order.Id).OrderBy(item => item.GeneratedAt).ToListAsync(cancellationToken);
        var releaseIds = releases.Select(release => release.Id).ToList();
        var retentionByReleaseId = await dbContext.ReleasedDeliverableRetentionSnapshots
            .AsNoTracking()
            .Where(item => item.OrganizationId == order.OrganizationId
                && item.LabResultReleaseId.HasValue
                && releaseIds.Contains(item.LabResultReleaseId.Value))
            .ToDictionaryAsync(item => item.LabResultReleaseId!.Value, cancellationToken);
        var docs = await dbContext.CommercialDocumentLinks.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == order.Id).OrderBy(item => item.CreatedAt).ToListAsync(cancellationToken);
        var cancellations = await dbContext.OrderCancellationRequests.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == order.Id).OrderBy(item => item.CreatedAt).ToListAsync(cancellationToken);
        var timeline = await dbContext.OrderStatusEvents.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == order.Id).OrderBy(item => item.OccurredAt).ToListAsync(cancellationToken);
        var authorization = await dbContext.CommercialLabAuthorizations.AsNoTracking()
            .SingleOrDefaultAsync(item => item.CommercialOrderId == order.Id, cancellationToken);
        var projection = authorization is null ? null : await dbContext.CommercialLabWorkProjections.AsNoTracking()
            .SingleOrDefaultAsync(item => item.AuthorizationId == authorization.AuthorizationId, cancellationToken);
        CommercialOrderSourceDto? commercialSource = null;
        if (order.SourceRequestId.HasValue)
        {
            commercialSource = await dbContext.CrmHandoffs.AsNoTracking()
                .Where(item => item.RelationshipRequestId == order.SourceRequestId.Value)
                .Select(item => new CommercialOrderSourceDto(
                    item.RelationshipRequestId,
                    item.RelationshipRequest.RequestNumber,
                    item.Id,
                    item.CompanyId,
                    item.Company.Name,
                    item.OpportunityId,
                    item.Opportunity == null ? null : item.Opportunity.Name))
                .SingleOrDefaultAsync(cancellationToken);
        }
        return new LabServiceOrderDto(order.Id, order.OrganizationId, order.OrderNumber, order.CustomerReference, order.Description,
            order.HasMixedBiologicalSources, order.SharedBiologicalSource,
            order.StorageRequirements, order.SafetyDeclaration, order.SubmissionInstructionsSnapshot,
            order.Status.ToString(), order.RequestRevision, order.SubmittedAt, order.PlacedAt, order.CompletedAt, order.TenantSafeReason,
            order.InternalNote, order.CreatedAt, order.UpdatedAt, order.Version, false, false, false, false, false,
            order.Samples.OrderBy(item => item.CreatedAt).Select(item => item.ToDto(true)).ToList(), order.Quotes.OrderByDescending(item => item.Revision).Select(item => item.ToDto()).ToList(),
            releases.Select(item => item.ToDto(retentionByReleaseId.GetValueOrDefault(item.Id))).ToList(), files.Select(item => item.ToDto()).ToList(), docs.Select(item => item.ToDto(true)).ToList(), cancellations.Select(item => item.ToDto()).ToList(), timeline.Select(item => item.ToDto(true)).ToList(),
            order.AssignedToUserId, order.DueAt,
            RequestRevisions: order.Revisions.OrderByDescending(item => item.Revision).Select(item => new LabRequestRevisionDto(item.Id,
                item.Revision, item.PreviousRevisionId, item.SnapshotJson, item.CorrectionReason, item.SubmittedByUserId, item.SubmittedAt)).ToList(),
            LabMilestone: projection?.Milestone,
            LabScheduleHealth: projection?.ScheduleHealth,
            LabExpectedCompletionAtUtc: projection?.ExpectedCompletionAtUtc,
            LabCustomerActionCount: projection?.ActiveCustomerActionCount ?? 0,
            LabCustomerActionSummary: projection?.CustomerSafeSummary,
            LabPermittedQcProjectionJson: projection?.PermittedQcProjectionJson,
            LabReadyForRelease: projection?.Milestone == "ReadyForRelease",
            RequestedSpecimenCount: order.RequestedSpecimenCount,
            SourceGroups: order.SourceGroups.OrderBy(group => group.BiologicalSource)
                .Select(group => new LabServiceSourceGroupDto(group.Id, group.BiologicalSource, group.SpecimenCount, group.Version)).ToList(),
            SampleRosterFinalizedAt: order.SampleRosterFinalizedAt,
            CanEditSamples: false,
            CanFinalizeSamples: false,
            CommercialSource: commercialSource);
    }

    private static IReadOnlyList<LabServiceSourceGroupWriteRequest> ValidatePricingProfile(
        int requestedSpecimenCount,
        IReadOnlyList<LabServiceSourceGroupWriteRequest>? requestedGroups)
    {
        if (requestedSpecimenCount is < 1 or > 100)
            throw Invalid("requested_specimen_count_invalid", "Requested specimen count must be between 1 and 100.");
        var groups = requestedGroups?.ToList() ?? [];
        if (groups.Count == 0)
            throw Invalid("biological_source_required", "Add at least one biological-source group.");
        if (groups.Any(group => group.SpecimenCount < 1 || string.IsNullOrWhiteSpace(group.BiologicalSource)))
            throw Invalid("biological_source_invalid", "Every biological-source group needs a source and a positive sample count.");
        if (groups.Sum(group => group.SpecimenCount) != requestedSpecimenCount)
            throw Invalid("biological_source_count_mismatch", "Biological-source counts must equal the requested specimen count.");
        if (groups.Select(group => LabServiceSourceGroup.Normalize(group.BiologicalSource))
            .Distinct(StringComparer.Ordinal).Count() != groups.Count)
            throw Invalid("biological_source_duplicate", "Duplicate biological sources are not permitted.");
        return groups;
    }

    private async Task EnsureUniqueJobNameAsync(
        Guid organizationId,
        string normalizedJobName,
        CancellationToken cancellationToken)
    {
        var exists = await dbContext.LabServiceOrders.AsNoTracking().AnyAsync(
            order => order.OrganizationId == organizationId
                && order.NormalizedJobName == normalizedJobName,
            cancellationToken);
        if (exists)
            throw Conflict("duplicate_job_name", "A Job with this name already exists for this Customer.");
    }

    private async Task<string> GenerateUniqueJobNumberAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 10; attempt++)
        {
            var candidate = OrderNumberGenerator.Lab();
            if (!await dbContext.LabServiceOrders.AsNoTracking()
                .AnyAsync(order => order.OrderNumber == candidate, cancellationToken))
                return candidate;
        }

        throw Conflict("job_number_unavailable", "A unique Job number could not be generated. Try creating the Job again.");
    }

    private static string NormalizeJobName(string? jobName)
    {
        try { return LabServiceOrder.NormalizeJobName(jobName); }
        catch (ArgumentException exception) { throw Invalid("invalid_job_name", exception.Message); }
    }

    private static string BuildRequestSnapshot(LabServiceOrder order)
        => JsonSerializer.Serialize(new
        {
            order.CustomerReference,
            jobNotes = order.Description,
            order.HasMixedBiologicalSources,
            order.SharedBiologicalSource,
            order.RequestedSpecimenCount,
            sourceGroups = order.SourceGroups.OrderBy(group => group.BiologicalSource).Select(group => new
            {
                group.BiologicalSource,
                group.SpecimenCount
            }),
            order.StorageRequirements,
            order.SafetyDeclaration,
            serviceKey = OrderServiceKeys.PSeqLabService,
            submissionInstructions = order.SubmissionInstructionsSnapshot,
            prohibitedDataConfirmed = true,
            samples = Array.Empty<object>(),
            analyses = Array.Empty<object>()
        }, JsonOptions);

    private void Event(LabServiceOrder order, string from, string to, Guid actorId, string? reason = null, string? internalNote = null, Guid? childId = null)
        => dbContext.OrderStatusEvents.Add(new OrderStatusEvent(order.OrganizationId, OrderWorkflowTypes.LabService, order.Id, childId,
            from, to, reason, internalNote, actorId, DateTime.UtcNow));

    private void Notice(
        LabServiceOrder order,
        string eventType,
        string subject,
        string body,
        Guid? recipientUserId = null)
        => dbContext.OrderNotifications.Add(new OrderNotification(
            order.OrganizationId,
            recipientUserId,
            OrderWorkflowTypes.LabService,
            order.Id,
            eventType,
            subject,
            body));

    private static void EnsureVersion(long current, long supplied) { if (current != supplied) throw new DbUpdateConcurrencyException(); }
    private static void Execute(Action action)
    {
        try { action(); }
        catch (ArgumentException exception) { throw Invalid("invalid_order_action", exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict("order_action_not_allowed", exception.Message); }
    }
    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) => new(code, message, StatusCodes.Status409Conflict);
    private static OrderManagementException Conflict(string code, string message, object details) =>
        new(code, message, StatusCodes.Status409Conflict, details);
    private static OrderManagementException Missing() => new("lab_order_not_found", "The requested laboratory record was not found.", StatusCodes.Status404NotFound);
    private static IReadOnlyList<Guid> ResultFileIds(string manifestJson)
    {
        try
        {
            using var document = JsonDocument.Parse(manifestJson);
            if (document.RootElement.TryGetProperty("fileId", out var fileId) && fileId.TryGetGuid(out var id)) return [id];
            if (document.RootElement.TryGetProperty("fileIds", out var fileIds) && fileIds.ValueKind == JsonValueKind.Array)
                return fileIds.EnumerateArray().Select(item => item.TryGetGuid(out var value) ? value : Guid.Empty).Where(value => value != Guid.Empty).Distinct().ToList();
        }
        catch (JsonException) { }
        throw Invalid("result_manifest_invalid", "The result manifest does not identify valid managed files.");
    }
    private sealed record QuoteLineSnapshot(Guid CatalogItemId, string ExternalItemId, string Description, decimal Quantity, decimal UnitPrice);
}
