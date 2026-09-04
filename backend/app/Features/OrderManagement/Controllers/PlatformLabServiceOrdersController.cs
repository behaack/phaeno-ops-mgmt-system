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
using PSeq.Operations.Commercial.OrderManagement.Application;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

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
    IOptions<PSeqOrderToCashOptions> orderToCashOptions,
    ILabOperationsProvider labOperationsProvider,
    ReleasedDeliverableRetentionSnapshotService retentionSnapshots,
    ILogger<PlatformLabServiceOrdersController> logger) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpGet("eligible-customers")]
    public async Task<IReadOnlyList<EligibleCustomerCompanyDto>> ListEligibleCustomers(
        CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
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

        return await dbContext.CrmCompanies.AsNoTracking()
            .Where(company => company.IsActive
                && company.AccessOrganizationId.HasValue
                && company.AccessOrganization != null
                && company.AccessOrganization.Kind == OrganizationKind.Customer
                && company.AccessOrganization.IsActive
                && !company.AccessOrganization.IsOperationalReadinessBlocked
                && dbContext.OrganizationServiceEntitlements.Any(entitlement =>
                    entitlement.OrganizationId == company.AccessOrganizationId.Value
                    && entitlement.Service == PortalService.PSeqLabService
                    && entitlement.ConfigurationStatus == EntitlementConfigurationStatus.Ready
                    && entitlement.EffectiveFrom <= now
                    && (!entitlement.EffectiveTo.HasValue || entitlement.EffectiveTo.Value > now)))
            .OrderBy(company => company.Name)
            .Select(company => new EligibleCustomerCompanyDto(
                company.AccessOrganizationId!.Value,
                company.Id,
                company.Name))
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
                if (customer.IsOperationalReadinessBlocked)
                {
                    throw Conflict(
                        "customer_operationally_blocked",
                        string.IsNullOrWhiteSpace(customer.OperationalReadinessBlockReason)
                            ? "Clear the Customer's manual operational block before starting pricing."
                            : customer.OperationalReadinessBlockReason);
                }

                var department = await ResolveDepartmentAsync(
                    customer.Id,
                    request.DepartmentId,
                    operationCancellationToken);

                await LabServiceOrderingEligibility.RequireAsync(
                    dbContext,
                    customer.Id,
                    DateTime.UtcNow,
                    operationCancellationToken,
                    department.Id);

                var normalizedJobName = NormalizeJobName(request.CustomerReference);
                await EnsureUniqueJobNameAsync(customer.Id, department.Id, normalizedJobName, operationCancellationToken);
                var sourceGroups = ValidatePricingProfile(request.RequestedSpecimenCount, request.SourceGroups);
                var configuration = await dbContext.OrderSystemConfigurations.AsNoTracking()
                    .OrderBy(item => item.CreatedAt)
                    .FirstOrDefaultAsync(operationCancellationToken);
                var order = new LabServiceOrder(
                    customer.Id,
                    department.Id,
                    await GenerateUniqueJobNumberAsync(operationCancellationToken),
                    request.CustomerReference,
                    request.Description,
                    request.RequestedSpecimenCount,
                    sourceGroups.Count > 1,
                    sourceGroups.Count == 1 ? sourceGroups[0].BiologicalSource : null,
                    request.StorageRequirements,
                    request.SafetyDeclaration,
                    department.ShippingInstructions
                        ?? configuration?.SampleSubmissionInstructions
                        ?? string.Empty,
                    request.SourceRequestId);
                foreach (var group in sourceGroups)
                {
                    order.SourceGroups.Add(new LabServiceSourceGroup(
                        order.Id,
                        group.BiologicalSource,
                        group.SpecimenCount));
                }

                var initiatedAt = DateTime.UtcNow;
                Execute(() => order.UpdatePriceProposal(
                    request.ProposedUnitPrice,
                    request.PriceProposalNote,
                    actor.Id,
                    initiatedAt));
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
        var nativeReceivables = orderToCashOptions.Value.NativePSeqAccountsReceivable;
        var actor = nativeReceivables
            ? await requestContext.RequireBusinessRoleAsync(HttpContext, BusinessRole.CommercialOperator,
                orderToCashOptions.Value.BusinessRoles || orderToCashOptions.Value.DualControlEnforced,
                cancellationToken)
            : await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var scope = $"platform:lab-order:{orderId}:quote";
        var replay = await idempotency.ReadAsync<LabServiceOrderDto>(actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var order = await ReadAsync(orderId, cancellationToken);
        if (order.Version != request.Version)
        {
            logger.LogWarning(
                "Quote issuance version mismatch for Job {OrderId}: request version {RequestVersion}, database version {DatabaseVersion}.",
                orderId,
                request.Version,
                order.Version);
            throw new DbUpdateConcurrencyException();
        }
        if (orderToCashOptions.Value.DerivedReadiness)
        {
            var readiness = await new OperationalReadinessService(dbContext)
                .EvaluateAsync(order.OrganizationId, cancellationToken);
            if (!readiness.Evaluation.CanIssueQuote)
                throw new OrderManagementException("operational_readiness_incomplete",
                    "Resolve every quote-readiness blocker before issuing a Customer quote.",
                    StatusCodes.Status409Conflict, readiness.Evaluation.QuoteBlockers);
        }
        await LabServiceOrderingEligibility.RequireAsync(dbContext, order.OrganizationId,
            DateTime.UtcNow, cancellationToken, order.DepartmentId);
        if (order.Status == LabServiceOrderStatus.SubmittedForQuote) Execute(order.BeginQuotePreparation);
        if (order.Status != LabServiceOrderStatus.QuoteInPreparation && order.Status != LabServiceOrderStatus.QuoteIssued)
            throw Conflict("quote_not_allowed", "A quote can be issued only while pricing this request.");
        if (orderToCashOptions.Value.DualControlEnforced
            && order.ProposedUnitPrice.HasValue
            && order.PriceProposedByUserId == actor.Id)
            throw Conflict("price_proposal_self_approval_not_allowed", "A different Commercial Operator must review this proposed price.");
        if (request.Lines.Count == 0) throw Invalid("quote_lines_required", "At least one quote line is required.");
        if (request.Lines.Any(line => line.Quantity <= 0
                || line.UnitPrice < 0
                || line.UnitPrice != decimal.Round(line.UnitPrice, 2, MidpointRounding.AwayFromZero)))
            throw Invalid("invalid_quote_line", "Quote quantities must be positive and prices must use no more than two decimal places.");
        var itemIds = request.Lines.Select(line => line.CatalogItemId).Distinct().ToList();
        var catalog = await dbContext.QboCatalogItems.AsNoTracking().Where(item => itemIds.Contains(item.Id) && item.IsActive)
            .ToDictionaryAsync(item => item.Id, cancellationToken);
        if (catalog.Count != itemIds.Count) throw Invalid("catalog_item_unavailable", "One or more QuickBooks items are unavailable.");
        var labServiceLines = request.Lines.Where(line =>
            catalog.TryGetValue(line.CatalogItemId, out var item)
            && string.Equals(item.ExternalItemId, OrderServiceKeys.PSeqLabService, StringComparison.OrdinalIgnoreCase)
            && string.Equals(item.SalesUnit, OrderSalesUnits.Specimen, StringComparison.OrdinalIgnoreCase)).ToList();
        if (labServiceLines.Count != 1)
            throw Invalid("quote_lab_service_line_required", "Include the active PSeq Lab Service specimen item exactly once.");
        var labServiceLine = labServiceLines[0];
        if (labServiceLine.Quantity != order.RequestedSpecimenCount)
            throw Invalid("quote_lab_service_quantity_mismatch", "The PSeq Lab Service quantity must equal the requested specimen count.");
        var commercial = await dbContext.OrganizationCommercialProfiles.AsNoTracking()
            .FirstOrDefaultAsync(item => item.OrganizationId == order.OrganizationId, cancellationToken);
        var department = await dbContext.OrganizationDepartments.AsNoTracking()
            .SingleAsync(item => item.Id == order.DepartmentId
                && item.OrganizationId == order.OrganizationId, cancellationToken);
        var billingContactEmail = department.BillingContactEmail ?? commercial?.BillingContactEmail;
        if (!nativeReceivables && string.IsNullOrWhiteSpace(commercial?.QboCustomerId))
            throw Conflict("qbo_customer_required", "Link this customer to QuickBooks before issuing a quote.");
        if (nativeReceivables && !string.Equals(request.Currency, "USD", StringComparison.OrdinalIgnoreCase))
            throw Invalid("currency_not_supported", "PSeq accounts receivable supports USD only.");
        if (nativeReceivables && request.Tax != 0)
            throw Invalid("quote_tax_not_allowed", "PSeq quote tax is calculated by the system when approved tax information is available; otherwise it is calculated when the invoice is issued.");
        var now = DateTime.UtcNow;
        var config = await dbContext.OrderSystemConfigurations.AsNoTracking().OrderBy(item => item.CreatedAt).FirstOrDefaultAsync(cancellationToken);
        var expiresAt = request.ExpiresAt ?? now.AddDays(config?.QuoteValidityDays ?? 30);
        if (!Enum.TryParse<QuotePurpose>(request.Purpose, true, out var purpose)) throw Invalid("quote_purpose_invalid", "The quote purpose is invalid.");
        var snapshots = request.Lines.Select(line => new QuoteLineSnapshot(line.CatalogItemId, catalog[line.CatalogItemId].ExternalItemId,
            line.Description.Trim(), line.Quantity, line.UnitPrice)).ToList();
        var subtotal = snapshots.Sum(line => decimal.Round(line.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero));
        var revision = order.Quotes.Count == 0 ? 1 : order.Quotes.Max(item => item.Revision) + 1;
        var canCalculateTax = nativeReceivables
            && HasInvoiceReadyCommercialProfile(commercial, billingContactEmail);
        var computedTax = canCalculateTax ? CalculateTax(subtotal, commercial!) : nativeReceivables ? 0 : request.Tax;
        var quote = new LabServiceQuote(order.Id, revision, purpose, JsonSerializer.Serialize(snapshots, JsonOptions), subtotal,
            computedTax, nativeReceivables ? "USD" : request.Currency, now, expiresAt);
        if (canCalculateTax)
        {
            quote.FreezeCommercialTerms(
                SerializeBillingContact(commercial!, billingContactEmail!),
                commercial!.BillingAddressJson!,
                commercial.PaymentTermsDays,
                SerializeTaxDecision(commercial),
                commercial.ConfigurationVersion);
        }
        Execute(() => quote.RecordPricingDecision(
            order.RequestRevision,
            order.ProposedUnitPrice,
            labServiceLine.UnitPrice,
            request.PricingDecisionReason,
            actor.Id,
            now));
        var previous = order.Quotes.Where(item => item.Status is QuoteStatus.Issued or QuoteStatus.SyncPending).OrderByDescending(item => item.Revision).FirstOrDefault();
        previous?.Supersede(quote.Id);
        dbContext.LabServiceQuotes.Add(quote);
        if (nativeReceivables)
        {
            var previousStatus = order.Status.ToString();
            quote.MarkIssued();
            order.MarkQuoteIssued(quote.Id);
            Event(order, previousStatus, order.Status.ToString(), actor.Id, internalNote: PricingDecisionAudit(quote));
            Notice(order, "lab-quote-issued", "Laboratory quote available", $"Pricing for {order.OrderNumber} is available for review.");
        }
        else
        {
            var document = new CommercialDocumentLink(OrderWorkflowTypes.LabService, order.Id, CommercialDocumentKind.Estimate, quote.Total, quote.Currency);
            dbContext.CommercialDocumentLinks.Add(document);
            var payload = new OrderDocumentOutboxPayload(document.Id, quote.Id, commercial!.QboCustomerId!, order.OrderNumber, null,
                quote.Currency, snapshots.Select(line => new QuickBooksLineRequest(line.ExternalItemId, line.Description, line.Quantity, line.UnitPrice)).ToList());
            dbContext.OrderOutboxMessages.Add(new OrderOutboxMessage(IntegrationOperation.CreateEstimate, OrderWorkflowTypes.LabService,
                order.Id, key, JsonSerializer.Serialize(payload, JsonOptions)));
            Notice(order, "lab-quote-sync-pending", "Laboratory quote is being prepared", $"Pricing for {order.OrderNumber} is being synchronized.");
        }
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            var entries = string.Join(", ", exception.Entries.Select(entry =>
                $"{entry.Metadata.ClrType.Name}:{entry.State}"));
            logger.LogError(
                exception,
                "Quote issuance persistence conflict for Job {OrderId} at request version {RequestVersion}. Conflicting entries: {Entries}.",
                orderId,
                request.Version,
                entries);
            throw;
        }
        var response = await MapAsync(order, cancellationToken);
        idempotency.Store(actor.Id, scope, key, request, response, StatusCodes.Status202Accepted);
        await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = nativeReceivables ? StatusCodes.Status201Created : StatusCodes.Status202Accepted;
        return response;
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
        if (orderToCashOptions.Value.GovernedPSeqResults)
            throw new OrderManagementException("manual_result_upload_retired",
                "PSeq results must be registered by the governed pipeline output-package workflow.",
                StatusCodes.Status410Gone);
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
        if (orderToCashOptions.Value.GovernedPSeqResults)
            throw new OrderManagementException("manual_result_release_retired",
                "Release the scientifically approved output package from the governed result-release queue.",
                StatusCodes.Status410Gone);
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
        var nativeReceivables = orderToCashOptions.Value.NativePSeqAccountsReceivable;
        var actor = nativeReceivables
            ? await requestContext.RequireBusinessRoleAsync(HttpContext, BusinessRole.CommercialOperator,
                orderToCashOptions.Value.BusinessRoles || orderToCashOptions.Value.DualControlEnforced,
                cancellationToken)
            : await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var scope = $"platform:lab-order:{orderId}:complete";
        var replay = await idempotency.ReadAsync<LabServiceOrderDto>(actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var before = order.Status.ToString();
        Execute(() => order.Complete(DateTime.UtcNow));
        var acceptedQuote = order.Quotes.SingleOrDefault(item => item.Id == order.AcceptedQuoteId) ?? throw Conflict("accepted_quote_missing", "The accepted quote snapshot is unavailable.");
        var profile = await dbContext.OrganizationCommercialProfiles.AsNoTracking().FirstOrDefaultAsync(item => item.OrganizationId == order.OrganizationId, cancellationToken);
        var lines = JsonSerializer.Deserialize<List<QuoteLineSnapshot>>(acceptedQuote.LinesJson, JsonOptions) ?? [];
        if (nativeReceivables)
        {
            if (!string.Equals(acceptedQuote.Currency, "USD", StringComparison.Ordinal))
                throw Conflict("currency_not_supported", "PSeq accounts receivable supports USD only.");
            if (await dbContext.Invoices.AnyAsync(item => item.LabServiceOrderId == order.Id, cancellationToken))
                throw Conflict("invoice_already_issued", "An invoice has already been issued for this completed order.");
            var quoteHasCommercialSnapshot = acceptedQuote.BillingContactSnapshotJson is not null
                && acceptedQuote.BillingAddressSnapshotJson is not null
                && acceptedQuote.TaxDecisionSnapshotJson is not null
                && acceptedQuote.PaymentTermsDaysSnapshot.HasValue;
            if (!quoteHasCommercialSnapshot)
            {
                if (profile is null
                    || !profile.HasCompleteBillingContact
                    || !profile.HasCompleteBillingAddress
                    || profile.PaymentTermsDays is < 0 or > 365
                    || !profile.HasEffectiveTaxDecision)
                    throw Conflict("billing_profile_required", "Complete the Customer billing contact, address, payment terms, and tax decision before issuing the invoice.");
                if (!profile.HasFinanceApprovedTaxDecision)
                    throw Conflict("finance_tax_approval_required", "Finance must approve the effective tax decision before invoice issuance.");
            }
            var billingContactSnapshotJson = quoteHasCommercialSnapshot
                ? acceptedQuote.BillingContactSnapshotJson!
                : SerializeBillingContact(profile!, profile!.BillingContactEmail!);
            var billingAddressSnapshotJson = quoteHasCommercialSnapshot
                ? acceptedQuote.BillingAddressSnapshotJson!
                : profile!.BillingAddressJson!;
            var taxDecisionSnapshotJson = quoteHasCommercialSnapshot
                ? acceptedQuote.TaxDecisionSnapshotJson!
                : SerializeTaxDecision(profile!);
            var paymentTermsDays = quoteHasCommercialSnapshot
                ? acceptedQuote.PaymentTermsDaysSnapshot!.Value
                : profile!.PaymentTermsDays;
            var invoiceTax = quoteHasCommercialSnapshot
                ? acceptedQuote.Tax
                : CalculateTax(acceptedQuote.Subtotal, profile!);
            var invoiceTotal = decimal.Round(acceptedQuote.Subtotal + invoiceTax, 2, MidpointRounding.AwayFromZero);
            var issuedOn = DateOnly.FromDateTime(order.CompletedAt ?? DateTime.UtcNow);
            var dueOn = issuedOn.AddDays(paymentTermsDays);
            var invoiceNumber = $"INV-{issuedOn:yyyyMMdd}-{Guid.NewGuid():N}"[..21].ToUpperInvariant();
            var customerName = await dbContext.Organizations.AsNoTracking()
                .Where(item => item.Id == order.OrganizationId).Select(item => item.Name)
                .SingleAsync(cancellationToken);
            var pdf = InvoicePdfRenderer.Render(invoiceNumber, customerName, issuedOn, dueOn,
                lines.Select(line => new InvoicePdfLine(line.Description, line.Quantity, line.UnitPrice,
                    decimal.Round(line.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero))).ToList(),
                acceptedQuote.Subtotal, invoiceTax, invoiceTotal, "USD");
            await using var pdfStream = new MemoryStream(pdf, writable: false);
            var stored = await fileStorage.SaveAsync(pdfStream, ".pdf", 5_000_000, cancellationToken);
            try
            {
                var nativeInvoice = new Invoice(order.OrganizationId, order.Id, acceptedQuote.Id,
                    invoiceNumber, issuedOn, paymentTermsDays,
                    billingContactSnapshotJson, billingAddressSnapshotJson,
                    taxDecisionSnapshotJson, acceptedQuote.Subtotal, invoiceTax,
                    stored.StorageKey, stored.Sha256, actor.Id, DateTime.UtcNow);
                dbContext.Invoices.Add(nativeInvoice);
                var taxRate = acceptedQuote.Subtotal == 0 ? 0
                    : decimal.Round(invoiceTax / acceptedQuote.Subtotal, 6, MidpointRounding.AwayFromZero);
                dbContext.InvoiceLines.AddRange(lines.Select((line, index) => new InvoiceLine(
                    nativeInvoice.Id, index + 1, null, line.Description, line.Quantity, line.UnitPrice, taxRate)));
                Notice(order, "lab-invoice-issued", "Invoice available",
                    $"Invoice {invoiceNumber} is available for {order.OrderNumber} and is due {dueOn:yyyy-MM-dd}.");
            }
            catch
            {
                await fileStorage.DeleteIfExistsAsync(stored.StorageKey, cancellationToken);
                throw;
            }
        }
        else
        {
            if (string.IsNullOrWhiteSpace(profile?.QboCustomerId)) throw Conflict("qbo_customer_required", "Link this customer to QuickBooks before completing the order.");
            var estimate = await dbContext.CommercialDocumentLinks.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.LabService
                && item.WorkflowId == orderId && item.Kind == CommercialDocumentKind.Estimate && item.SyncStatus == IntegrationStatus.Succeeded)
                .OrderByDescending(item => item.SynchronizedAt).FirstOrDefaultAsync(cancellationToken);
            var invoice = new CommercialDocumentLink(OrderWorkflowTypes.LabService, order.Id, CommercialDocumentKind.Invoice, acceptedQuote.Total, acceptedQuote.Currency);
            dbContext.CommercialDocumentLinks.Add(invoice);
            var payload = new OrderDocumentOutboxPayload(invoice.Id, null, profile.QboCustomerId!, order.OrderNumber, null,
                acceptedQuote.Currency, lines.Select(line => new QuickBooksLineRequest(line.ExternalItemId, line.Description, line.Quantity, line.UnitPrice)).ToList(), estimate?.ExternalDocumentId);
            dbContext.OrderOutboxMessages.Add(new OrderOutboxMessage(IntegrationOperation.CreateInvoice, OrderWorkflowTypes.LabService,
                order.Id, key, JsonSerializer.Serialize(payload, JsonOptions)));
        }
        Event(order, before, order.Status.ToString(), actor.Id);
        Notice(order, "lab-order-completed", "Laboratory service completed", $"Laboratory work for {order.OrderNumber} is complete.");
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(order, cancellationToken);
        idempotency.Store(actor.Id, scope, key, request, response,
            nativeReceivables ? StatusCodes.Status201Created : StatusCodes.Status202Accepted);
        await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = nativeReceivables ? StatusCodes.Status201Created : StatusCodes.Status202Accepted;
        return response;
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
            CommercialSource: commercialSource,
            ProposedUnitPrice: order.ProposedUnitPrice,
            ProposedCurrency: order.ProposedUnitPrice.HasValue ? "USD" : null,
            PriceProposalNote: order.PriceProposalNote,
            PriceProposedByUserId: order.PriceProposedByUserId,
            PriceProposedAt: order.PriceProposedAt);
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
        Guid departmentId,
        string normalizedJobName,
        CancellationToken cancellationToken)
    {
        var exists = await dbContext.LabServiceOrders.AsNoTracking().AnyAsync(
            order => order.OrganizationId == organizationId
                && order.DepartmentId == departmentId
                && order.NormalizedJobName == normalizedJobName,
            cancellationToken);
        if (exists)
            throw Conflict("duplicate_job_name", "A Job with this name already exists for this Customer.");
    }

    private async Task<OrganizationDepartment> ResolveDepartmentAsync(
        Guid organizationId,
        Guid? departmentId,
        CancellationToken cancellationToken)
    {
        var query = dbContext.OrganizationDepartments.AsNoTracking()
            .Where(value => value.OrganizationId == organizationId && value.IsActive);
        var department = departmentId.HasValue
            ? await query.SingleOrDefaultAsync(value => value.Id == departmentId.Value, cancellationToken)
            : await query.SingleOrDefaultAsync(value => value.IsDefault, cancellationToken);
        return department ?? throw Conflict(
            "customer_department_not_available",
            "Select an active Department for this Customer before initiating the order.");
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
            proposedUnitPrice = order.ProposedUnitPrice,
            proposedCurrency = order.ProposedUnitPrice.HasValue ? "USD" : null,
            priceProposalNote = order.PriceProposalNote,
            priceProposedByUserId = order.PriceProposedByUserId,
            priceProposedAt = order.PriceProposedAt,
            serviceKey = OrderServiceKeys.PSeqLabService,
            submissionInstructions = order.SubmissionInstructionsSnapshot,
            prohibitedDataConfirmed = true,
            samples = Array.Empty<object>(),
            analyses = Array.Empty<object>()
        }, JsonOptions);

    private static string PricingDecisionAudit(LabServiceQuote quote)
        => quote.PricingDecision switch
        {
            QuotePricingDecision.ApprovedAsProposed => $"Approved the proposed USD {quote.ProposedUnitPriceSnapshot:0.00} per specimen and issued quote revision {quote.Revision}.",
            QuotePricingDecision.AmendedProposal => $"Amended the proposed USD {quote.ProposedUnitPriceSnapshot:0.00} per specimen and issued quote revision {quote.Revision}. Reason: {quote.PricingDecisionReason}",
            _ => $"Set pricing without a proposal and issued quote revision {quote.Revision}."
        };

    private static bool HasInvoiceReadyCommercialProfile(
        OrganizationCommercialProfile? profile,
        string? billingContactEmail)
        => profile is not null
            && !string.IsNullOrWhiteSpace(profile.BillingContactName)
            && System.Net.Mail.MailAddress.TryCreate(billingContactEmail, out _)
            && profile.HasCompleteBillingAddress
            && profile.PaymentTermsDays is >= 0 and <= 365
            && profile.HasEffectiveTaxDecision
            && profile.HasFinanceApprovedTaxDecision;

    private static decimal CalculateTax(decimal subtotal, OrganizationCommercialProfile profile)
        => profile.TaxDecision == EffectiveTaxDecision.Taxable
            ? decimal.Round(subtotal * profile.ApprovedTaxRate!.Value, 2, MidpointRounding.AwayFromZero)
            : 0;

    private static string SerializeBillingContact(
        OrganizationCommercialProfile profile,
        string billingContactEmail)
        => JsonSerializer.Serialize(new
        {
            name = profile.BillingContactName,
            email = billingContactEmail
        }, JsonOptions);

    private static string SerializeTaxDecision(OrganizationCommercialProfile profile)
        => JsonSerializer.Serialize(new
        {
            decision = profile.TaxDecision!.Value.ToString(),
            rate = profile.ApprovedTaxRate,
            exemptionEvidence = profile.TaxExemptionEvidence,
            approvedByUserId = profile.FinanceApprovedByUserId,
            approvedAtUtc = profile.FinanceApprovedAtUtc
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
            body,
            order.DepartmentId));

    private static void EnsureVersion(long current, long supplied) { if (current != supplied) throw new DbUpdateConcurrencyException(); }
    private static void Execute(Action action)
    {
        try { action(); }
        catch (ArgumentException exception) { throw Invalid("invalid_order_action", exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict("order_action_not_allowed", exception.Message); }
    }
    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) => new(code, message, StatusCodes.Status409Conflict);
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
