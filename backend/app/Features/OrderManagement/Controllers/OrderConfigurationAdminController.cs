namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/platform/order-configuration")]
public sealed class OrderConfigurationAdminController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    OrderIdempotencyService idempotency,
    IWebHostEnvironment environment,
    IOptions<QuickBooksOptions> quickBooksOptions) : ControllerBase
{
    [HttpGet]
    public async Task<OrderConfigurationDto> Get(CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var system = await EnsureSystemAsync(cancellationToken);
        return await MapAsync(system, cancellationToken);
    }

    [HttpPatch("system")]
    public async Task<OrderConfigurationDto> UpdateSystem([FromBody] UpdateSystemConfigurationRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var system = await EnsureSystemAsync(cancellationToken);
        EnsureVersion(system.Version, request.Version);
        Execute(() => system.Update(request.QuoteValidityDays, request.SampleSubmissionInstructions, request.ShippingConfigurationJson));
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(system, cancellationToken);
    }

    [HttpPost("analyses")]
    public async Task<AnalysisDefinitionDto> CreateAnalysis([FromBody] AnalysisDefinitionWriteRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        await RequireCatalogItemAsync(request.QboCatalogItemId, cancellationToken);
        var item = ConstructAnalysis(request); dbContext.AnalysisDefinitions.Add(item);
        await dbContext.SaveChangesAsync(cancellationToken); Response.StatusCode = StatusCodes.Status201Created;
        return Analysis(item);
    }

    [HttpPatch("analyses/{analysisId:guid}")]
    public async Task<AnalysisDefinitionDto> UpdateAnalysis(Guid analysisId, [FromBody] AnalysisDefinitionWriteRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var item = await dbContext.AnalysisDefinitions.FirstOrDefaultAsync(value => value.Id == analysisId, cancellationToken) ?? throw Missing("analysis_not_found", "The analysis definition was not found.");
        EnsureVersion(item.Version, request.Version); if (item.QboCatalogItemId != request.QboCatalogItemId) throw Conflict("analysis_catalog_link_frozen", "Create a new analysis to link a different QuickBooks item.");
        Execute(() => item.Update(request.Name, request.Description, request.SubmissionInstructions, request.RequiredIntakeFieldsJson,
            request.ResultContractJson, request.IsActive, request.IsSynthetic));
        await dbContext.SaveChangesAsync(cancellationToken); return Analysis(item);
    }

    [HttpPost("reagent-offerings")]
    public async Task<ReagentOfferingDto> CreateOffering([FromBody] ReagentOfferingWriteRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        await RequirePartnerAsync(request.PartnerOrganizationId, cancellationToken); var catalog = await RequireCatalogItemAsync(request.QboCatalogItemId, cancellationToken);
        await EnsureNoOfferingOverlapAsync(request, null, cancellationToken);
        var item = ConstructOffering(request); dbContext.PartnerReagentOfferings.Add(item);
        await dbContext.SaveChangesAsync(cancellationToken); Response.StatusCode = StatusCodes.Status201Created; return Offering(item, catalog.Name);
    }

    [HttpPatch("reagent-offerings/{offeringId:guid}")]
    public async Task<ReagentOfferingDto> UpdateOffering(Guid offeringId, [FromBody] ReagentOfferingWriteRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var item = await dbContext.PartnerReagentOfferings.FirstOrDefaultAsync(value => value.Id == offeringId, cancellationToken) ?? throw Missing("offering_not_found", "The reagent offering was not found.");
        EnsureVersion(item.Version, request.Version); if (item.PartnerOrganizationId != request.PartnerOrganizationId || item.QboCatalogItemId != request.QboCatalogItemId)
            throw Conflict("offering_identity_frozen", "Create a new offering to change its Partner or QuickBooks item.");
        var catalog = await RequireCatalogItemAsync(request.QboCatalogItemId, cancellationToken);
        await EnsureNoOfferingOverlapAsync(request, offeringId, cancellationToken);
        Execute(() => item.Update(request.NegotiatedUnitPrice, request.Currency, request.SellingUnit, request.OrderIncrement,
            request.MinimumQuantity, request.MaximumQuantity, request.ShippingRestrictionsJson, request.EffectiveFrom,
            request.EffectiveUntil, request.IsActive));
        await dbContext.SaveChangesAsync(cancellationToken); return Offering(item, catalog.Name);
    }

    [HttpPost("assembly-profiles")]
    public async Task<AssemblyProfileDto> CreateAssemblyProfile([FromBody] AssemblyProfileWriteRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken); await RequireCatalogItemAsync(request.QboCatalogItemId, cancellationToken);
        var item = ConstructAssemblyProfile(request); dbContext.AssemblyProfiles.Add(item);
        await dbContext.SaveChangesAsync(cancellationToken); Response.StatusCode = StatusCodes.Status201Created; return Assembly(item);
    }

    [HttpPatch("assembly-profiles/{profileId:guid}")]
    public async Task<AssemblyProfileDto> UpdateAssemblyProfile(Guid profileId, [FromBody] AssemblyProfileWriteRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var item = await dbContext.AssemblyProfiles.FirstOrDefaultAsync(value => value.Id == profileId, cancellationToken) ?? throw Missing("assembly_profile_not_found", "The assembly profile was not found.");
        EnsureVersion(item.Version, request.Version);
        if (item.QboCatalogItemId != request.QboCatalogItemId || item.Name != request.Name || item.ProfileVersion != request.ProfileVersion)
            throw Conflict("assembly_profile_identity_frozen", "Create a new profile version to change its name, version, or QuickBooks item.");
        Execute(() => item.Update(request.Description, request.Instructions, request.MetadataSchemaJson, request.AllowedFileKindsJson,
            request.OutputContractJson, request.MaximumFileSizeBytes, request.MaximumTotalSizeBytes, request.IsActive, request.IsSynthetic));
        await dbContext.SaveChangesAsync(cancellationToken); return Assembly(item);
    }

    [HttpPut("commercial-profiles/{organizationId:guid}")]
    public async Task<CommercialProfileDto> UpsertCommercialProfile(Guid organizationId, [FromBody] CommercialProfileWriteRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        if (request.OrganizationId != organizationId) throw Invalid("organization_mismatch", "The organization identifier does not match the route.");
        var organization = await dbContext.Organizations.AsNoTracking().FirstOrDefaultAsync(item => item.Id == organizationId
            && item.IsActive && (item.Kind == OrganizationKind.Customer || item.Kind == OrganizationKind.Partner), cancellationToken)
            ?? throw Missing("organization_not_found", "The commercial organization was not found.");
        var item = await dbContext.OrganizationCommercialProfiles.FirstOrDefaultAsync(value => value.OrganizationId == organizationId, cancellationToken);
        if (item == null) { item = new OrganizationCommercialProfile(organizationId); dbContext.OrganizationCommercialProfiles.Add(item); }
        else EnsureVersion(item.Version, request.Version);
        Execute(() => item.Update(request.QboCustomerId, request.LabCreditApproved, request.AssemblyCreditApproved, actor.Id, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken); return Commercial(item, organization.Name);
    }

    [HttpPost("catalog/sync")]
    public async Task<IntegrationMessageDto> SyncCatalog(CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken); var key = idempotency.RequireKey(HttpContext);
        var payload = new { operation = "sync-catalog" }; var replay = await idempotency.ReadAsync<IntegrationMessageDto>(actor.Id, "qbo:catalog:sync", key, payload, cancellationToken);
        if (replay != null) return replay;
        var message = new OrderOutboxMessage(IntegrationOperation.SyncCatalog, "Configuration", Guid.Empty, key, "{}"); dbContext.OrderOutboxMessages.Add(message);
        await dbContext.SaveChangesAsync(cancellationToken); var response = Integration(message);
        idempotency.Store(actor.Id, "qbo:catalog:sync", key, payload, response, StatusCodes.Status202Accepted); await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status202Accepted; return response;
    }

    [HttpPost("catalog/local")]
    public async Task<CatalogItemDto> CreateLocalCatalogItem([FromBody] LocalCatalogItemRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        if (!environment.IsDevelopment() || quickBooksOptions.Value.IsConfigured)
            throw new OrderManagementException("local_catalog_disabled", "Local catalog fixtures are available only in unconfigured development environments.", StatusCodes.Status404NotFound);
        QboCatalogItem item;
        try { item = new QboCatalogItem(request.ExternalItemId, request.Name, request.Description, request.SalesUnit,
            request.BasePrice, request.Currency, request.IsActive, DateTime.UtcNow); }
        catch (ArgumentException exception) { throw Invalid("catalog_item_invalid", exception.Message); }
        dbContext.QboCatalogItems.Add(item); await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created; return Catalog(item);
    }

    private async Task<OrderSystemConfiguration> EnsureSystemAsync(CancellationToken cancellationToken)
    {
        var item = await dbContext.OrderSystemConfigurations.OrderBy(value => value.CreatedAt).FirstOrDefaultAsync(cancellationToken);
        if (item != null) return item;
        item = new OrderSystemConfiguration(30, string.Empty, "{}"); dbContext.OrderSystemConfigurations.Add(item);
        await dbContext.SaveChangesAsync(cancellationToken); return item;
    }

    private async Task<OrderConfigurationDto> MapAsync(OrderSystemConfiguration system, CancellationToken cancellationToken)
    {
        var catalog = await dbContext.QboCatalogItems.AsNoTracking().OrderBy(item => item.Name).ToListAsync(cancellationToken);
        var analyses = await dbContext.AnalysisDefinitions.AsNoTracking().OrderBy(item => item.Name).ToListAsync(cancellationToken);
        var offerings = await (from offering in dbContext.PartnerReagentOfferings.AsNoTracking()
            join item in dbContext.QboCatalogItems.AsNoTracking() on offering.QboCatalogItemId equals item.Id orderby item.Name
            select new { Offering = offering, ItemName = item.Name }).ToListAsync(cancellationToken);
        var assemblies = await dbContext.AssemblyProfiles.AsNoTracking().OrderBy(item => item.Name).ThenByDescending(item => item.ProfileVersion).ToListAsync(cancellationToken);
        var commercial = await (from profile in dbContext.OrganizationCommercialProfiles.AsNoTracking()
            join organization in dbContext.Organizations.AsNoTracking() on profile.OrganizationId equals organization.Id orderby organization.Name
            select new { Profile = profile, OrganizationName = organization.Name }).ToListAsync(cancellationToken);
        return new OrderConfigurationDto(new OrderSystemConfigurationDto(system.Id, system.QuoteValidityDays, system.SampleSubmissionInstructions,
            system.ShippingConfigurationJson, system.Version), catalog.Select(Catalog).ToList(), analyses.Select(Analysis).ToList(),
            offerings.Select(value => Offering(value.Offering, value.ItemName)).ToList(), assemblies.Select(Assembly).ToList(),
            commercial.Select(value => Commercial(value.Profile, value.OrganizationName)).ToList());
    }

    private async Task<QboCatalogItem> RequireCatalogItemAsync(Guid id, CancellationToken cancellationToken)
        => await dbContext.QboCatalogItems.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id && item.IsActive, cancellationToken)
            ?? throw Invalid("catalog_item_unavailable", "Select an active synchronized QuickBooks item.");
    private async Task RequirePartnerAsync(Guid id, CancellationToken cancellationToken)
    {
        if (!await dbContext.Organizations.AsNoTracking().AnyAsync(item => item.Id == id && item.IsActive && item.Kind == OrganizationKind.Partner, cancellationToken))
            throw Missing("partner_not_found", "The Partner organization was not found.");
    }
    private static AnalysisDefinition ConstructAnalysis(AnalysisDefinitionWriteRequest request)
    {
        try { return new AnalysisDefinition(request.QboCatalogItemId, request.Name, request.Description, request.SubmissionInstructions,
            request.RequiredIntakeFieldsJson, request.ResultContractJson, request.IsActive, request.IsSynthetic); }
        catch (ArgumentException exception) { throw Invalid("analysis_invalid", exception.Message); }
    }
    private static PartnerReagentOffering ConstructOffering(ReagentOfferingWriteRequest request)
    {
        try { return new PartnerReagentOffering(request.PartnerOrganizationId, request.QboCatalogItemId, request.NegotiatedUnitPrice,
            request.Currency, request.SellingUnit, request.OrderIncrement, request.MinimumQuantity, request.MaximumQuantity,
            request.ShippingRestrictionsJson, request.EffectiveFrom, request.EffectiveUntil, request.IsActive); }
        catch (ArgumentException exception) { throw Invalid("offering_invalid", exception.Message); }
    }

    private async Task EnsureNoOfferingOverlapAsync(ReagentOfferingWriteRequest request, Guid? excludedId, CancellationToken cancellationToken)
    {
        if (!request.IsActive) return;
        var overlaps = await dbContext.PartnerReagentOfferings.AsNoTracking().AnyAsync(item => item.IsActive
            && item.PartnerOrganizationId == request.PartnerOrganizationId
            && item.QboCatalogItemId == request.QboCatalogItemId
            && (!excludedId.HasValue || item.Id != excludedId.Value)
            && (!request.EffectiveUntil.HasValue || item.EffectiveFrom < request.EffectiveUntil.Value)
            && (!item.EffectiveTo.HasValue || request.EffectiveFrom < item.EffectiveTo.Value), cancellationToken);
        if (overlaps) throw Conflict("reagent_price_period_overlap", "An active negotiated price already covers part of this effective period.");
    }
    private static AssemblyProfile ConstructAssemblyProfile(AssemblyProfileWriteRequest request)
    {
        try { return new AssemblyProfile(request.QboCatalogItemId, request.Name, request.ProfileVersion, request.Description,
            request.Instructions, request.MetadataSchemaJson, request.AllowedFileKindsJson, request.OutputContractJson,
            request.MaximumFileSizeBytes, request.MaximumTotalSizeBytes, request.IsActive, request.IsSynthetic); }
        catch (ArgumentException exception) { throw Invalid("assembly_profile_invalid", exception.Message); }
    }
    private static CatalogItemDto Catalog(QboCatalogItem item) => new(item.Id, item.ExternalItemId, item.Name, item.Description,
        item.SalesUnit, item.BasePrice, item.Currency, item.IsActive, item.LastSyncedAt, item.Version);
    private static AnalysisDefinitionDto Analysis(AnalysisDefinition item) => new(item.Id, item.QboCatalogItemId, item.Name,
        item.Description, item.SubmissionInstructions, item.RequiredIntakeFieldsJson, item.ResultContractJson, item.IsActive, item.IsSynthetic, item.Version);
    private static ReagentOfferingDto Offering(PartnerReagentOffering item, string name) => new(item.Id, item.PartnerOrganizationId,
        item.QboCatalogItemId, name, item.NegotiatedUnitPrice, item.Currency, item.SellingUnit, item.OrderIncrement,
        item.MinimumQuantity ?? item.OrderIncrement, item.MaximumQuantity, item.ShippingRestrictionsJson, item.EffectiveFrom,
        item.EffectiveTo, item.IsActive, item.Version);
    private static AssemblyProfileDto Assembly(AssemblyProfile item) => new(item.Id, item.QboCatalogItemId, item.Name, item.ProfileVersion,
        item.Description, item.Instructions, item.MetadataSchemaJson, item.AllowedFileKindsJson, item.OutputContractJson,
        item.MaximumFileSizeBytes, item.MaximumTotalSizeBytes, item.IsActive, item.IsSynthetic, item.Version);
    private static CommercialProfileDto Commercial(OrganizationCommercialProfile item, string name) => new(item.Id, item.OrganizationId,
        name, item.LabCreditApproved, item.AssemblyCreditApproved, item.QboCustomerId, item.Version);
    private static IntegrationMessageDto Integration(OrderOutboxMessage item) => new(item.Id, item.Operation.ToString(), item.WorkflowType,
        item.WorkflowId, item.Status.ToString(), item.AttemptCount, item.NextAttemptAt, item.LastError, item.CreatedAt, item.Version);
    private static void EnsureVersion(long current, long? supplied) { if (!supplied.HasValue || supplied.Value != current) throw new DbUpdateConcurrencyException(); }
    private static void Execute(Action action)
    {
        try { action(); }
        catch (ArgumentException exception) { throw Invalid("configuration_invalid", exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict("configuration_conflict", exception.Message); }
    }
    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) => new(code, message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing(string code, string message) => new(code, message, StatusCodes.Status404NotFound);
}
