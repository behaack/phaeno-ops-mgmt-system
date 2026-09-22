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
using PSeq.Operations.Laboratory.Domain;
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

    [HttpGet("customer-options")]
    public async Task<IReadOnlyList<CustomerOrderOptionDto>> ListCustomerOptions(CancellationToken cancellationToken)
    {
        await RequireCommercialAsync(true, cancellationToken);
        return await dbContext.Organizations.AsNoTracking()
            .Where(item => item.IsActive && item.Kind == OrganizationKind.Customer)
            .OrderBy(item => item.Name)
            .Select(item => new CustomerOrderOptionDto(item.Id, item.Name))
            .ToListAsync(cancellationToken);
    }

    [HttpGet("customer-options/{organizationId:guid}/departments")]
    public async Task<IReadOnlyList<CustomerOrderDepartmentOptionDto>> ListCustomerDepartments(
        Guid organizationId, CancellationToken cancellationToken)
    {
        await RequireCommercialAsync(true, cancellationToken);
        if (!await dbContext.Organizations.AnyAsync(value => value.Id == organizationId
            && value.IsActive && value.Kind == OrganizationKind.Customer, cancellationToken))
            throw new OrderManagementException("order_not_found", "The requested Customer was not found.", StatusCodes.Status404NotFound);
        return await dbContext.OrganizationDepartments.AsNoTracking()
            .Where(value => value.OrganizationId == organizationId && value.IsActive)
            .OrderByDescending(value => value.IsDefault).ThenBy(value => value.Name)
            .Select(value => new CustomerOrderDepartmentOptionDto(value.Id, value.Name, value.IsDefault))
            .ToListAsync(cancellationToken);
    }

    [HttpGet("pricing-catalog")]
    public async Task<IReadOnlyList<CatalogItemDto>> PricingCatalog(CancellationToken cancellationToken)
    {
        await RequireCommercialAsync(true, cancellationToken);
        return await dbContext.QboCatalogItems.AsNoTracking()
            .Where(value => value.ServiceFamily == CatalogServiceFamily.PSeqLabService)
            .Select(value => new CatalogItemDto(value.Id, value.ExternalItemId, value.Name,
                value.Description, value.SalesUnit, value.BasePrice, value.Currency, value.IsActive,
                true, value.LastSyncedAt, value.Version)).ToListAsync(cancellationToken);
    }

    [HttpGet("customer-options/{organizationId:guid}/readiness")]
    public async Task<CustomerOrderReadinessDto> CustomerReadiness(
        Guid organizationId, [FromQuery] Guid departmentId, CancellationToken cancellationToken)
    {
        await RequireCommercialAsync(true, cancellationToken);
        if (!await dbContext.OrganizationDepartments.AsNoTracking().AnyAsync(item =>
            item.Id == departmentId && item.OrganizationId == organizationId && item.IsActive
            && item.Organization.IsActive && item.Organization.Kind == OrganizationKind.Customer, cancellationToken))
            throw Conflict("customer_department_not_available", "Select an active Customer department to check readiness.");
        var readiness = (await new OperationalReadinessService(dbContext)
            .EvaluateAsync(organizationId, cancellationToken, departmentId)).Evaluation;
        var stageCodes = readiness.StageBlockers.Select(item => item.Code).ToHashSet();
        return new CustomerOrderReadinessDto(readiness.CanStageOrder, readiness.StageBlockers,
            readiness.QuoteBlockers.Where(item => !stageCodes.Contains(item.Code)).ToList(), readiness.InvoiceBlockers);
    }

    [HttpGet("eligible-customers")]
    public async Task<IReadOnlyList<EligibleCustomerCompanyDto>> ListEligibleCustomers(
        CancellationToken cancellationToken)
    {
        await RequireCommercialAsync(true, cancellationToken);
        var now = DateTime.UtcNow;
        var offeringAvailable = await dbContext.QboCatalogItems.AsNoTracking()
            .AnyAsync(item => item.IsActive
                && item.ServiceFamily == CatalogServiceFamily.PSeqLabService
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
        CancellationToken cancellationToken = default,
        [FromQuery] bool quoteExtensionRequested = false)
    {
        await RequireCommercialAsync(true, cancellationToken);
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
        if (quoteExtensionRequested) query = query.Where(order => order.Status == LabServiceOrderStatus.QuoteIssued
            && dbContext.LabServiceQuoteExtensionRequests.Any(request => request.LabServiceOrderId == order.Id && request.ResolvedAt == null));
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
                    && order.Status != LabServiceOrderStatus.Completed && order.Status != LabServiceOrderStatus.Cancelled && order.Status != LabServiceOrderStatus.Declined,
                order.Status == LabServiceOrderStatus.QuoteIssued && dbContext.LabServiceQuoteExtensionRequests.Any(request => request.LabServiceOrderId == order.Id && request.ResolvedAt == null))).ToListAsync(cancellationToken);
        return new PagedResult<OrderListItemDto>(items, page, pageSize, total);
    }

    [HttpPost]
    public async Task<LabServiceOrderDto> Initiate(
        [FromBody] InitiateCustomerLabOrderRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequireCommercialAsync(false, cancellationToken);
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
                    department.ResolveConfiguration(department.Organization).ShippingInstructions
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

                Execute(() => order.SetSequencingRunCount(request.SequencingRunCount));
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
        await RequireCommercialAsync(true, cancellationToken);
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
        var actor = await RequireCommercialAsync(false, cancellationToken);
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
        var actor = await RequireCommercialAsync(false, cancellationToken);
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
        var actor = await RequireCommercialAsync(false, cancellationToken);
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
        var actor = await RequireCommercialAsync(false, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var scope = $"platform:lab-order:{orderId}:quote";
        await using var transaction = dbContext.Database.CurrentTransaction is null
            ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
        await idempotency.AcquireOrderLockAsync($"lab-order:{orderId}", cancellationToken);
        var replay = await idempotency.ReadAsync<LabServiceOrderDto>(actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var order = await ReadAsync(orderId, cancellationToken);
        await dbContext.Entry(order).ReloadAsync(cancellationToken);
        foreach (var item in order.Quotes) await dbContext.Entry(item).ReloadAsync(cancellationToken);
        await dbContext.LabServiceQuotes.Where(item => item.LabServiceOrderId == orderId).LoadAsync(cancellationToken);
        if (order.IsDiscarded) throw Missing();
        if (request.SourceQuoteId.HasValue && order.CurrentQuoteId != request.SourceQuoteId.Value)
            throw Conflict("quote_not_current", "This quote was replaced. Refresh the Job and review the current revision before issuing another quote.");
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
                .EvaluateAsync(order.OrganizationId, cancellationToken, order.DepartmentId);
            if (!readiness.Evaluation.CanIssueQuote)
                throw new OrderManagementException("operational_readiness_incomplete",
                    "Resolve every quote-readiness blocker before issuing a Customer quote.",
                    StatusCodes.Status409Conflict, readiness.Evaluation.QuoteBlockers);
        }
        await LabServiceOrderingEligibility.RequireAsync(dbContext, order.OrganizationId,
            DateTime.UtcNow, cancellationToken, order.DepartmentId);
        if (!Enum.TryParse<QuotePurpose>(request.Purpose, true, out var purpose) || !Enum.IsDefined(purpose))
            throw Invalid("quote_purpose_invalid", "The quote purpose is invalid.");
        var isChange = purpose == QuotePurpose.Change;
        LabChangeScope? changeScope = null;
        if (isChange)
        {
            if (!nativeReceivables || !order.CanProposeChange)
                throw Conflict("quote_not_allowed", "Change quotes require an active accepted Job and native billing.");
            var additions = request.AdditionalSources;
            if (additions is null || additions.Count == 0 || additions.Any(s => string.IsNullOrWhiteSpace(s.BiologicalSource)
                    || s.BiologicalSource.Trim().Length > 500 || s.SpecimenCount < 1 || s.SpecimenCount > 100)
                || additions.Select(s => LabServiceSourceGroup.Normalize(s.BiologicalSource)).Distinct().Count() != additions.Count
                || additions.Sum(s => s.SpecimenCount) + order.RequestedSpecimenCount > 100)
                throw Invalid("change_scope_invalid", "Specify unique biological sources and positive additional counts, up to 100 total samples per Job.");
            var addedRuns = request.AdditionalSequencingRunCount ?? additions.Sum(s => s.SpecimenCount);
            if (addedRuns < additions.Sum(s => s.SpecimenCount) || addedRuns > 10000 - order.RequestedSequencingRunCount)
                throw Invalid("change_runs_invalid", "Additional runs must cover every new sample without exceeding 10,000 total runs.");
            changeScope = new(order.AcceptedQuoteId!.Value, order.RequestedSpecimenCount,
                additions.Select(s => new LabChangeSource(s.BiologicalSource.Trim(), s.SpecimenCount)).ToList(), addedRuns);
        }
        else if (order.Status == LabServiceOrderStatus.SubmittedForQuote) Execute(order.BeginQuotePreparation);
        if (!isChange && order.Status != LabServiceOrderStatus.QuoteInPreparation && order.Status != LabServiceOrderStatus.QuoteIssued)
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
            && item.ServiceFamily == CatalogServiceFamily.PSeqLabService
            && string.Equals(item.SalesUnit, OrderSalesUnits.Specimen, StringComparison.OrdinalIgnoreCase)).ToList();
        if (labServiceLines.Count != 1)
            throw Invalid("quote_lab_service_line_required", "Include the active PSeq Lab Service specimen item exactly once.");
        var labServiceLine = labServiceLines[0];
        if (changeScope != null)
        {
            var original = order.Quotes.SingleOrDefault(item => item.Id == order.AcceptedQuoteId)
                ?? throw Conflict("accepted_quote_missing", "The accepted Job quote is unavailable.");
            if (labServiceLine.CatalogItemId != await LabQuoteCatalog.ReadItemAsync(dbContext, original.LinesJson, false, cancellationToken))
                throw Conflict("change_quote_service_mismatch", "Additional work must retain the service from the accepted Job.");
        }
        if (labServiceLine.Quantity != (changeScope?.AdditionalSequencingRunCount ?? changeScope?.AdditionalSources.Sum(s => s.SpecimenCount) ?? order.RequestedSequencingRunCount))
            throw Invalid("quote_lab_service_quantity_mismatch", "The PSeq Lab Service quantity must equal the requested sample-sequencing run count.");
        var commercial = await dbContext.OrganizationCommercialProfiles.AsNoTracking()
            .FirstOrDefaultAsync(item => item.OrganizationId == order.OrganizationId, cancellationToken);
        var department = await dbContext.OrganizationDepartments.AsNoTracking().Include(value => value.Organization)
            .SingleAsync(item => item.Id == order.DepartmentId
                && item.OrganizationId == order.OrganizationId, cancellationToken);
        var billingContactEmail = department.ResolveConfiguration(department.Organization).BillingContactEmail ?? commercial?.BillingContactEmail;
        if (!nativeReceivables && string.IsNullOrWhiteSpace(commercial?.QboCustomerId))
            throw Conflict("qbo_customer_required", "Link this customer to QuickBooks before issuing a quote.");
        if (nativeReceivables && !string.Equals(request.Currency, "USD", StringComparison.OrdinalIgnoreCase))
            throw Invalid("currency_not_supported", "PSeq accounts receivable supports USD only.");
        if (nativeReceivables && request.Tax != 0)
            throw Invalid("quote_tax_not_allowed", "PSeq quote tax is calculated by the system when approved tax information is available; otherwise it is calculated when the invoice is issued.");
        var now = DateTime.UtcNow;
        var config = await dbContext.OrderSystemConfigurations.AsNoTracking().OrderBy(item => item.CreatedAt).FirstOrDefaultAsync(cancellationToken);
        var expiresAt = request.ExpiresAt ?? now.AddDays(config?.QuoteValidityDays ?? 30);
        if (expiresAt.Kind != DateTimeKind.Utc || expiresAt <= now)
            throw Invalid("quote_expiration_invalid", "Choose a quote expiration date in the future.");
        var snapshots = request.Lines.Select(line => new QuoteLineSnapshot(line.CatalogItemId, catalog[line.CatalogItemId].ExternalItemId,
            line.Description.Trim(), line.Quantity, line.UnitPrice)).ToList();
        var subtotal = snapshots.Sum(line => decimal.Round(line.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero));
        var revision = order.Quotes.Count == 0 ? 1 : order.Quotes.Max(item => item.Revision) + 1;
        var canCalculateTax = nativeReceivables
            && HasInvoiceReadyCommercialProfile(commercial, billingContactEmail);
        var computedTax = canCalculateTax ? CalculateTax(subtotal, commercial!) : nativeReceivables ? 0 : request.Tax;
        var quote = new LabServiceQuote(order.Id, revision, purpose, JsonSerializer.Serialize(snapshots, JsonOptions), subtotal,
            computedTax, nativeReceivables ? "USD" : request.Currency, now, expiresAt);
        if (changeScope is not null) quote.FreezeChangeScope(JsonSerializer.Serialize(changeScope, JsonOptions));
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
            Math.Max(1, order.RequestRevision),
            isChange ? null : order.ProposedUnitPrice,
            labServiceLine.UnitPrice,
            request.PricingDecisionReason,
            actor.Id,
            now));
        var previous = order.Quotes.Where(item => item.Purpose == purpose && item.Status is QuoteStatus.Issued or QuoteStatus.Expired or QuoteStatus.SyncPending).OrderByDescending(item => item.Revision).FirstOrDefault();
        previous?.Supersede(quote.Id);
        dbContext.LabServiceQuotes.Add(quote);
        if (nativeReceivables)
        {
            var previousStatus = order.Status.ToString();
            quote.MarkIssued();
            if (!isChange) order.MarkQuoteIssued(quote.Id);
            else order.MarkUpdated(now, actor.Id);
            var pendingExtensions = await dbContext.LabServiceQuoteExtensionRequests
                .Where(item => item.LabServiceOrderId == order.Id && item.ResolvedAt == null).ToListAsync(cancellationToken);
            if (!isChange) foreach (var extension in pendingExtensions) extension.Resolve(quote.Id, now);
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
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
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
        await EnsureLegacySampleOperationAllowedAsync(order, sample.Id, cancellationToken);
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
        await EnsureLegacySampleOperationAllowedAsync(order, sample.Id, cancellationToken);
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
        await EnsureLegacySampleOperationAllowedAsync(order, sample.Id, cancellationToken);
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
        [FromForm] string qcStatus, CancellationToken cancellationToken,
        [FromForm] Guid? labAnalysisRunId = null, [FromForm] string? resultLocator = null)
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
        if (orderToCashOptions.Value.RequireResultTraceability || orderToCashOptions.Value.RequireScientificEvidence || labAnalysisRunId.HasValue)
        {
            await new LabOperations.Services.LabResultLineageService(dbContext).RequireResultAsync(labAnalysisRunId,
                orderToCashOptions.Value.RequireResultTraceability, order.OrganizationId, null, sample.Id, cancellationToken, orderToCashOptions.Value.RequireScientificEvidence);
            if (string.IsNullOrWhiteSpace(resultLocator) || resultLocator.Length > 1000)
                throw Invalid("result_locator_required", "Identify the result within the file. Use '*' only when the entire file belongs to this sample and analysis.");
        }
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
                pipelineVersion, provenance, qcStatus, JsonSerializer.Serialize(new { fileId = managed.Id }, JsonOptions), DateTime.UtcNow,
                labAnalysisRunId, orderToCashOptions.Value.RequireResultTraceability || orderToCashOptions.Value.RequireScientificEvidence, resultLocator);
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
                await new LabOperations.Services.LabResultLineageService(dbContext).RequireReleaseAsync(release, operationCancellationToken, orderToCashOptions.Value);
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
                if (mayRelease)
                    await new LabOperations.Services.LabJobDeliveryRecorder(dbContext).RecordCommercialAsync(order.Id,
                        [new(sample.Id, releasedAtUtc)], operationCancellationToken);
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
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        await SampleShippingPackingData.LockAsync(dbContext, $"sample-shipping:{orderId}", cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var cancellation = await dbContext.OrderCancellationRequests.FirstOrDefaultAsync(item => item.Id == cancellationId
            && item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == orderId, cancellationToken) ?? throw Missing();
        if (!Enum.TryParse<CancellationRequestStatus>(request.Status, true, out var decision)
            || !Enum.IsDefined(decision) || decision == CancellationRequestStatus.Pending)
            throw Invalid("cancellation_decision_invalid", "A final cancellation decision is required.");
        var selectedIds = request.SampleIds?.ToHashSet() ?? [];
        if (request.Lines is { Count: > 0 }
            || (decision != CancellationRequestStatus.PartiallyApproved && selectedIds.Count > 0)
            || (decision == CancellationRequestStatus.PartiallyApproved && (selectedIds.Count == 0
                || selectedIds.Count != request.SampleIds!.Count || !order.Samples.Any(sample => !selectedIds.Contains(sample.Id) && sample.Status != LabSampleStatus.Cancelled)
                || selectedIds.Except(order.Samples.Select(sample => sample.Id)).Any())))
            throw Invalid("cancellation_samples_invalid", "Select specific samples from this Job for partial cancellation.");
        if (decision == CancellationRequestStatus.PartiallyApproved
            && order.Samples.Any(sample => selectedIds.Contains(sample.Id)
                && (sample.Status != LabSampleStatus.Expected || sample.ReceivedAt.HasValue)))
            throw Conflict("lab_cancellation_requires_review", "Only samples awaiting receipt can be partially cancelled. Review the current Lab records.");
        if (decision == CancellationRequestStatus.PartiallyApproved)
        {
            var shipping = await dbContext.SampleShipments.Include(value => value.Items)
                .Where(value => value.AuthorizationSourceId == order.Id && value.OrganizationId == order.OrganizationId
                    && value.Status != SampleShipmentStatus.Cancelled).ToListAsync(cancellationToken);
            if (shipping.Any(shipment => shipment.Items.Any(item => selectedIds.Contains(item.SubmittedSpecimenId))
                && (shipment.ShippedAt.HasValue || shipment.DeliveredAt.HasValue || shipment.ReceivedAt.HasValue
                    || shipment.Items.Any(item => !selectedIds.Contains(item.SubmittedSpecimenId)))))
                throw Conflict("cancellation_shipping_review_required", "Review dispatched shipments and separate selected samples from mixed containers before approving cancellation.");
        }
        var before = order.Status.ToString();
        if (decision is CancellationRequestStatus.Approved or CancellationRequestStatus.PartiallyApproved)
        {
            var authorization = await dbContext.CommercialLabAuthorizations
                .SingleOrDefaultAsync(item => item.CommercialOrderId == order.Id, cancellationToken);
            if (authorization is null && decision == CancellationRequestStatus.PartiallyApproved)
                throw Conflict("lab_cancellation_requires_review", "Partial cancellation requires a finalized sample roster authorized for Lab work.");
            if (authorization is not null)
            {
                var outcome = await labOperationsProvider.RequestCancellationAsync(
                    new RequestLabWorkCancellationCommand(
                        new LabOperationsCommandMetadata(Guid.NewGuid(), authorization.AuthorizationId, DateTime.UtcNow),
                        authorization.AuthorizationId,
                        authorization.AuthorizationVersion,
                        decision == CancellationRequestStatus.Approved ? "commercial_cancellation_approved" : "commercial_partial_cancellation_approved",
                        SubmittedSpecimenIds: decision == CancellationRequestStatus.PartiallyApproved ? selectedIds.ToArray() : null),
                    cancellationToken);
                if (outcome.Disposition is not LabCancellationDisposition.Accepted
                    || (decision == CancellationRequestStatus.PartiallyApproved
                        && !selectedIds.SetEquals(outcome.AffectedSubmittedSpecimenIds)))
                {
                    throw Conflict(
                        "lab_cancellation_requires_review",
                        "Laboratory work has started or requires a separate specimen-level cancellation decision.");
                }
                if (decision == CancellationRequestStatus.Approved) authorization.MarkCancelled();
            }
        }
        cancellation.Decide(decision, request.Reason, actor.Id, DateTime.UtcNow);
        Execute(() => order.ResolveCancellation(decision is CancellationRequestStatus.Approved, request.Reason, null));
        if (decision == CancellationRequestStatus.PartiallyApproved)
        {
            foreach (var sample in order.Samples.Where(sample => selectedIds.Contains(sample.Id)))
            {
                var sampleBefore = sample.Status.ToString();
                Execute(() => sample.ApplyLaboratoryOutcome(LabSampleStatus.Cancelled, request.Reason));
                dbContext.OrderStatusEvents.Add(new OrderStatusEvent(order.OrganizationId, OrderWorkflowTypes.LabService,
                    order.Id, sample.Id, sampleBefore, sample.Status.ToString(), request.Reason, null, actor.Id, DateTime.UtcNow));
            }
            // Release only reservations belonging entirely to cancelled samples; mixed shipments retain their reservation.
            var shipments = await dbContext.SampleShipments.Include(shipment => shipment.Items)
                .Where(shipment => shipment.AuthorizationSourceId == order.Id && shipment.OrganizationId == order.OrganizationId
                    && shipment.DepartmentId == order.DepartmentId && shipment.ShippedAt == null).ToListAsync(cancellationToken);
            var cancelledShipments = shipments.Where(shipment => shipment.Status != SampleShipmentStatus.Cancelled
                && shipment.Items.Count > 0 && shipment.Items.All(item => selectedIds.Contains(item.SubmittedSpecimenId))).ToArray();
            foreach (var shipment in cancelledShipments) Execute(shipment.Cancel);
            var shipmentIds = cancelledShipments.Select(shipment => shipment.Id).ToArray();
            await TransportationKitInventory.ReleaseAsync(dbContext, shipmentIds, cancellationToken);
        }
        if (decision == CancellationRequestStatus.Approved)
        {
            var shipmentIds = await dbContext.SampleShipments.Where(item => item.AuthorizationSourceId == order.Id
                && item.OrganizationId == order.OrganizationId && item.DepartmentId == order.DepartmentId)
                .Select(item => item.Id).ToArrayAsync(cancellationToken);
            await TransportationKitInventory.ReleaseAsync(dbContext, shipmentIds, cancellationToken);
        }
        Event(order, before, order.Status.ToString(), actor.Id, request.Reason);
        if (decision == CancellationRequestStatus.Approved)
        {
            Notice(
                order,
                "lab-cancellation-approved",
                "Laboratory service cancelled",
                $"Phaeno approved cancellation of {order.OrderNumber}: {request.Reason}");
        }
        else if (decision == CancellationRequestStatus.PartiallyApproved)
        {
            Notice(order, "lab-cancellation-partially-approved", "Laboratory cancellation partially approved",
                $"Phaeno approved cancellation of {selectedIds.Count} samples in {order.OrderNumber}: {request.Reason}. Remaining work continues. The accepted quote remains unchanged; any adjustment is reviewed separately.");
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
        string? createdPdfKey = null;
        try
        {
            var execution = await idempotency.ExecuteAsync(actor.Id, scope, key, request, async operationCancellationToken =>
            {
                var order = await ReadAsync(orderId, operationCancellationToken);
                await dbContext.Entry(order).ReloadAsync(operationCancellationToken);
                foreach (var sample in order.Samples) await dbContext.Entry(sample).ReloadAsync(operationCancellationToken);
                EnsureVersion(order.Version, request.Version);
                var before = order.Status.ToString();
                var labWork = await dbContext.LabWorkOrders.AsNoTracking().Include(value => value.Specimens)
                    .SingleOrDefaultAsync(value => value.AuthorizationSourceId == order.Id
                        && value.AuthorizationSource == LabAuthorizationSource.CommercialOrder
                        && value.SubmittingOrganizationId == order.OrganizationId, operationCancellationToken);
                if (labWork is not null)
                {
                    var outcomes = await PhaenoPortal.App.Features.LabOperations.Services.LabIntakeProgress
                        .ReadAsync(dbContext, labWork, operationCancellationToken);
                    if (labWork.Status == LabWorkOrderStatus.OnHold
                        || await dbContext.LabExceptions.AsNoTracking().AnyAsync(value => value.LabWorkOrderId == labWork.Id
                            && value.IsBlocking && value.Status == LabExceptionStatus.Open, operationCancellationToken)
                        || order.Samples.Any(sample => !(outcomes.TerminalOutcomes ?? []).Any(outcome =>
                            outcome.SubmittedSpecimenId == sample.Id && outcome.Outcome == sample.Status.ToString())))
                        throw Conflict("laboratory_outcomes_not_final", "Review current laboratory outcomes and resolve all holds before completing this Job.");
                }
                Execute(() => order.Complete(DateTime.UtcNow));
                var acceptedQuote = order.Quotes.SingleOrDefault(item => item.Id == order.AcceptedQuoteId) ?? throw Conflict("accepted_quote_missing", "The accepted quote snapshot is unavailable.");
                var profile = await dbContext.OrganizationCommercialProfiles.AsNoTracking().FirstOrDefaultAsync(item => item.OrganizationId == order.OrganizationId, operationCancellationToken);
                var acceptedQuotes = order.Quotes.Where(q => q.Id == acceptedQuote.Id || q.Purpose == QuotePurpose.Change && q.Status == QuoteStatus.Accepted).ToList();
                var invoiceSubtotal = acceptedQuotes.Sum(q => q.Subtotal);
                var lines = acceptedQuotes.SelectMany(q => JsonSerializer.Deserialize<List<QuoteLineSnapshot>>(q.LinesJson, JsonOptions) ?? []).ToList();
                if (nativeReceivables)
                {
                    if (!string.Equals(acceptedQuote.Currency, "USD", StringComparison.Ordinal))
                        throw Conflict("currency_not_supported", "PSeq accounts receivable supports USD only.");
                    if (await dbContext.Invoices.AnyAsync(item => item.LabServiceOrderId == order.Id, operationCancellationToken))
                        throw Conflict("invoice_already_issued", "An invoice has already been issued for this completed order.");
                    var quoteHasCommercialSnapshot = acceptedQuote.BillingContactSnapshotJson is not null
                        && acceptedQuote.BillingAddressSnapshotJson is not null
                        && acceptedQuote.TaxDecisionSnapshotJson is not null
                        && acceptedQuote.PaymentTermsDaysSnapshot.HasValue;
                    if (acceptedQuotes.Any(q => q.TaxDecisionSnapshotJson is null))
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
                    var invoiceTax = acceptedQuotes.Sum(q => q.TaxDecisionSnapshotJson is not null ? q.Tax : CalculateTax(q.Subtotal, profile!));
                    if (acceptedQuotes.Count > 1)
                        taxDecisionSnapshotJson = JsonSerializer.Serialize(new { originalDecision = taxDecisionSnapshotJson,
                            components = acceptedQuotes.Select(q => new { quoteId = q.Id, q.Revision, q.Subtotal,
                                tax = q.TaxDecisionSnapshotJson is not null ? q.Tax : CalculateTax(q.Subtotal, profile!), q.TaxDecisionSnapshotJson }) }, JsonOptions);
                    var invoiceTotal = decimal.Round(invoiceSubtotal + invoiceTax, 2, MidpointRounding.AwayFromZero);
                    var issuedOn = DateOnly.FromDateTime(order.CompletedAt ?? DateTime.UtcNow);
                    var dueOn = issuedOn.AddDays(paymentTermsDays);
                    var invoiceNumber = $"INV-{issuedOn:yyyyMMdd}-{Guid.NewGuid():N}"[..21].ToUpperInvariant();
                    var customerName = await dbContext.Organizations.AsNoTracking()
                        .Where(item => item.Id == order.OrganizationId).Select(item => item.Name)
                        .SingleAsync(operationCancellationToken);
                    var pdf = InvoicePdfRenderer.Render(invoiceNumber, customerName, issuedOn, dueOn,
                        lines.Select(line => new InvoicePdfLine(line.Description, line.Quantity, line.UnitPrice,
                            decimal.Round(line.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero))).ToList(),
                        invoiceSubtotal, invoiceTax, invoiceTotal, "USD");
                    await using var pdfStream = new MemoryStream(pdf, writable: false);
                    var stored = await fileStorage.SaveAsync(pdfStream, ".pdf", 5_000_000, operationCancellationToken);
                    createdPdfKey = stored.StorageKey;
                    var nativeInvoice = new Invoice(order.OrganizationId, order.Id, acceptedQuote.Id,
                        invoiceNumber, issuedOn, paymentTermsDays,
                        billingContactSnapshotJson, billingAddressSnapshotJson,
                        taxDecisionSnapshotJson, invoiceSubtotal, invoiceTax,
                        stored.StorageKey, stored.Sha256, actor.Id, DateTime.UtcNow);
                    dbContext.Invoices.Add(nativeInvoice);
                    var lineNumber = 0;
                    foreach (var component in acceptedQuotes)
                    {
                        var componentTax = component.TaxDecisionSnapshotJson is not null ? component.Tax : CalculateTax(component.Subtotal, profile!);
                        var taxRate = component.Subtotal == 0 ? 0 : decimal.Round(componentTax / component.Subtotal, 6, MidpointRounding.AwayFromZero);
                        foreach (var line in JsonSerializer.Deserialize<List<QuoteLineSnapshot>>(component.LinesJson, JsonOptions) ?? [])
                            dbContext.InvoiceLines.Add(new InvoiceLine(nativeInvoice.Id, ++lineNumber, null, line.Description, line.Quantity, line.UnitPrice, taxRate));
                    }
                    Notice(order, "lab-invoice-issued", "Invoice available",
                        $"Invoice {invoiceNumber} is available for {order.OrderNumber} and is due {dueOn:yyyy-MM-dd}.");
                }
                else
                {
                    if (string.IsNullOrWhiteSpace(profile?.QboCustomerId)) throw Conflict("qbo_customer_required", "Link this customer to QuickBooks before completing the order.");
                    var estimate = await dbContext.CommercialDocumentLinks.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.LabService
                        && item.WorkflowId == orderId && item.Kind == CommercialDocumentKind.Estimate && item.SyncStatus == IntegrationStatus.Succeeded)
                        .OrderByDescending(item => item.SynchronizedAt).FirstOrDefaultAsync(operationCancellationToken);
                    var invoice = new CommercialDocumentLink(OrderWorkflowTypes.LabService, order.Id, CommercialDocumentKind.Invoice, acceptedQuote.Total, acceptedQuote.Currency);
                    dbContext.CommercialDocumentLinks.Add(invoice);
                    var payload = new OrderDocumentOutboxPayload(invoice.Id, null, profile.QboCustomerId!, order.OrderNumber, null,
                        acceptedQuote.Currency, lines.Select(line => new QuickBooksLineRequest(line.ExternalItemId, line.Description, line.Quantity, line.UnitPrice)).ToList(), estimate?.ExternalDocumentId);
                    dbContext.OrderOutboxMessages.Add(new OrderOutboxMessage(IntegrationOperation.CreateInvoice, OrderWorkflowTypes.LabService,
                        order.Id, key, JsonSerializer.Serialize(payload, JsonOptions)));
                }
                Event(order, before, order.Status.ToString(), actor.Id);
                Notice(order, "lab-order-completed", "Laboratory service completed", $"Laboratory work for {order.OrderNumber} is complete.");
                await dbContext.SaveChangesAsync(operationCancellationToken);
                var response = await MapAsync(order, operationCancellationToken);
                return response;
            }, nativeReceivables ? StatusCodes.Status201Created : StatusCodes.Status202Accepted,
                cancellationToken, concurrencyScope: $"lab-order:{orderId}", isolationLevel: IsolationLevel.Serializable);
            Response.StatusCode = execution.StatusCode;
            return execution.Response;
        }
        catch
        {
            if (createdPdfKey is not null)
            {
                try
                {
                    // A lost commit acknowledgment must not remove a successfully issued invoice PDF.
                    if (!await dbContext.Invoices.AsNoTracking().AnyAsync(item => item.PdfStorageKey == createdPdfKey,
                        CancellationToken.None))
                        await fileStorage.DeleteIfExistsAsync(createdPdfKey, CancellationToken.None);
                }
                catch (Exception cleanupError)
                {
                    logger.LogWarning(cleanupError, "Invoice PDF cleanup could not be verified for Job {OrderId}; retain the file for recovery.", orderId);
                }
            }
            throw;
        }
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

    private async Task EnsureLegacySampleOperationAllowedAsync(
        LabServiceOrder order, Guid sampleId, CancellationToken cancellationToken)
    {
        var labOwnsShipping = await (
            from item in dbContext.SampleShipmentItems
            join shipment in dbContext.SampleShipments on item.SampleShipmentId equals shipment.Id
            join work in dbContext.LabWorkOrders on shipment.LabWorkOrderId equals work.Id
            join specimen in dbContext.LabSpecimens on work.Id equals specimen.LabWorkOrderId
            where item.SubmittedSpecimenId == sampleId && specimen.SubmittedSpecimenId == sampleId
                && shipment.AuthorizationSource == SampleShipmentAuthorizationSource.CustomerLabServiceOrder
                && shipment.AuthorizationSourceId == order.Id
                && shipment.OrganizationId == order.OrganizationId
                && shipment.DepartmentId == order.DepartmentId
                && work.AuthorizationSource == LabAuthorizationSource.CommercialOrder
                && work.AuthorizationSourceId == order.Id
                && work.SubmittingOrganizationId == order.OrganizationId
            select item.Id).AnyAsync(cancellationToken);
        if (labOwnsShipping)
            throw Conflict("lab_owned_sample_operation_required",
                "This sample is managed in Lab operations. Use Lab receiving to record physical tube receipt, and Lab operations for accession and sample status changes.");
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
                && (membership.IsOrganizationAdmin || dbContext.OrganizationDepartmentMemberships.Any(access =>
                    access.OrganizationMembershipId == membership.Id && access.IsActive && access.IsDepartmentAdmin
                    && access.DepartmentId == order.DepartmentId && access.Department.IsActive
                    && access.Department.OrganizationId == order.OrganizationId))
                && membership.User != null
                && membership.User.IsActive
                && membership.User.Status == UserAccountStatus.Active)
            .Select(membership => (Guid?)membership.UserId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<LabServiceOrderDto> MapAsync(LabServiceOrder order, CancellationToken cancellationToken)
    {
        var extensionRequests = await dbContext.LabServiceQuoteExtensionRequests.AsNoTracking()
            .Where(item => item.LabServiceOrderId == order.Id).ToDictionaryAsync(item => item.QuoteId, cancellationToken);
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
        var timing = await new LabServiceTimingService(dbContext).ReadAsync(order.Id, order.OrganizationId, true,
            await new LabServiceTimingService(dbContext).CanOverrideAsync(HttpContext, orderToCashOptions.Value.DualControlEnforced, cancellationToken), cancellationToken);
        return new LabServiceOrderDto(order.Id, order.OrganizationId, order.OrderNumber, order.CustomerReference, order.Description,
            order.HasMixedBiologicalSources, order.SharedBiologicalSource,
            order.StorageRequirements, order.SafetyDeclaration, order.SubmissionInstructionsSnapshot,
            order.Status.ToString(), order.RequestRevision, order.SubmittedAt, order.PlacedAt, order.CompletedAt, order.TenantSafeReason,
            order.InternalNote, order.CreatedAt, order.UpdatedAt, order.Version, false, false, false, false, false,
            order.Samples.OrderBy(item => item.CreatedAt).Select(item => item.ToDto(true)).ToList(), order.Quotes.OrderByDescending(item => item.Revision).Select(item => item.ToDto(extensionRequests.GetValueOrDefault(item.Id))).ToList(),
            releases.Select(item => item.ToDto(retentionByReleaseId.GetValueOrDefault(item.Id))).ToList(), files.Select(item => item.ToDto()).ToList(), docs.Select(item => item.ToDto(true)).ToList(), cancellations.Select(item => item.ToDto()).ToList(), timeline.Select(item => item.ToDto(true)).ToList(),
            order.AssignedToUserId, order.DueAt,
            RequestRevisions: order.Revisions.OrderByDescending(item => item.Revision).Select(item => new LabRequestRevisionDto(item.Id,
                item.Revision, item.PreviousRevisionId, item.SnapshotJson, item.CorrectionReason, item.SubmittedByUserId, item.SubmittedAt)).ToList(),
            LabMilestone: projection?.Milestone,
            LabScheduleHealth: timing?.ScheduleHealth ?? projection?.ScheduleHealth,
            LabExpectedCompletionAtUtc: timing?.ExpectedCompletionAtUtc ?? projection?.ExpectedCompletionAtUtc,
            LabCustomerActionCount: projection?.ActiveCustomerActionCount ?? 0,
            LabCustomerActionSummary: projection?.CustomerSafeSummary,
            LabPermittedQcProjectionJson: projection?.PermittedQcProjectionJson,
            LabReadyForRelease: projection?.Milestone == "ReadyForRelease",
            TubeUsePolicyKey: order.TubeUsePolicyKey, TubeUsePolicyVersion: order.TubeUsePolicyVersion,
            RequestedSpecimenCount: order.RequestedSpecimenCount,
            RequestedSequencingRunCount: order.RequestedSequencingRunCount,
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
            PriceProposedAt: order.PriceProposedAt,
            EntryMode: order.EntryMode.ToString(),
            StandardCommercialSnapshot: LabServiceTimingService.CommercialSnapshot(order.ReadConfiguredSnapshot()),
            Timing: timing,
            CanManageQuotes: await CanManageQuotesAsync(cancellationToken),
            CanProposeChange: orderToCashOptions.Value.NativePSeqAccountsReceivable && order.CanProposeChange);
    }

    private Task<User> RequireCommercialAsync(bool readOnly, CancellationToken cancellationToken)
        => requestContext.RequireCommercialOrderAsync(HttpContext,
            orderToCashOptions.Value.BusinessRoles || orderToCashOptions.Value.DualControlEnforced,
            readOnly, cancellationToken);

    private async Task<bool> CanManageQuotesAsync(CancellationToken cancellationToken)
    {
        try
        {
            await RequireCommercialAsync(false, cancellationToken);
            return true;
        }
        catch (OrderManagementException exception) when (exception.ErrorCode is "business_role_required" or "platform_capability_required")
        {
            return false;
        }
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
        var query = dbContext.OrganizationDepartments.AsNoTracking().Include(value => value.Organization)
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
            order.RequestedSpecimenCount, order.RequestedSequencingRunCount,
            sourceGroups = order.SourceGroups.OrderBy(group => group.BiologicalSource).Select(group => new
            {
                group.BiologicalSource,
                group.SpecimenCount
            }),
            order.TubeUsePolicyKey, order.TubeUsePolicyVersion,
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
            QuotePricingDecision.ApprovedAsProposed => $"Approved the proposed USD {quote.ProposedUnitPriceSnapshot:0.00} per sample-sequencing run and issued quote revision {quote.Revision}.",
            QuotePricingDecision.AmendedProposal => $"Amended the proposed USD {quote.ProposedUnitPriceSnapshot:0.00} per sample-sequencing run and issued quote revision {quote.Revision}. Reason: {quote.PricingDecisionReason}",
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
