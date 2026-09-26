namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed partial class SampleShippingContainerCatalogService(PSeqOperationsDbContext dbContext)
{
    public async Task<IReadOnlyList<SampleShippingContainerDefinitionDto>> ReadAllAsync(CancellationToken cancellationToken)
    {
        var records = await Query().OrderBy(item => item.ContainerType.NormalizedSku).ThenByDescending(item => item.Revision)
            .ToListAsync(cancellationToken);
        var readyIds = await ReadyDefinitionIdsAsync(cancellationToken);
        return records.Select(item => Map(item) with { NewWorkReady = readyIds.Contains(item.Id) }).ToArray();
    }

    public async Task<SampleShippingContainerDefinitionDto> ReadAsync(Guid id, CancellationToken cancellationToken)
    {
        var record = await Query().SingleOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw Missing();
        var readyIds = await ReadyDefinitionIdsAsync(cancellationToken);
        return Map(record) with { NewWorkReady = readyIds.Contains(record.Id) };
    }

    public async Task<IReadOnlyList<SampleShippingContainerDefinitionDto>> ReadRevisionsAsync(Guid id, CancellationToken cancellationToken)
    {
        var source = await ReadAsync(id, cancellationToken);
        var records = await Query().Where(item => item.ContainerTypeId == source.DefinitionKey).OrderByDescending(item => item.Revision)
            .ToListAsync(cancellationToken);
        var readyIds = await ReadyDefinitionIdsAsync(cancellationToken);
        return records.Select(item => Map(item) with { NewWorkReady = readyIds.Contains(item.Id) }).ToArray();
    }

    private async Task<HashSet<Guid>> ReadyDefinitionIdsAsync(CancellationToken cancellationToken)
        => (await TransportationKitDefinitionReadiness.ReadAsync(dbContext, DateTime.UtcNow, cancellationToken))
            .Select(item => item.DefinitionId).ToHashSet();

    public async Task<IReadOnlyList<SampleShippingContainerDefinitionDto>> ReadCompatibleAsync(
        IReadOnlyList<ContainerSampleTypeContext> contexts, CancellationToken cancellationToken, Guid? includeDraftDefinitionId = null)
    {
        var sampleTypeAnchorId = await RequiredSampleTypeAnchorAsync(contexts, cancellationToken);
        var now = DateTime.UtcNow;
        var records = await Query().Where(item => (item.IsActive && item.EffectiveFrom <= now && (!item.EffectiveTo.HasValue || item.EffectiveTo > now))
            || item.Id == includeDraftDefinitionId).ToListAsync(cancellationToken);
        if (includeDraftDefinitionId.HasValue)
        {
            var draft = records.SingleOrDefault(item => item.Id == includeDraftDefinitionId) ?? throw Missing();
            if (draft.IsActive || draft.DeactivatedAt.HasValue || draft.EffectiveTo <= now)
                throw Invalid("Only an inactive draft that has not ended or been deactivated can be included for preview. Preview active containers without a draft override.");
            records.RemoveAll(item => item.ContainerTypeId == draft.ContainerTypeId && item.Id != draft.Id);
        }
        var readyIds = (await TransportationKitDefinitionReadiness.ReadAsync(dbContext, now, cancellationToken))
            .Select(item => item.DefinitionId).ToHashSet();
        records.RemoveAll(item => item.IsActive && !readyIds.Contains(item.Id));
        return records.Where(item => item.ContainerType.SampleTypeAnchorId == sampleTypeAnchorId)
            .OrderBy(item => item.DisplayOrder).ThenBy(item => item.ContainerType.NormalizedSku).ThenBy(item => item.Id).Select(Map).ToArray();
    }

    public async Task<SampleShippingContainerDefinitionDto> CreateAsync(CreateSampleShippingContainerRequest request, CancellationToken cancellationToken)
    {
        if (request.IsActive)
            throw Invalid("Save the new Transportation kit as a draft, link its Sample type, then activate its specification.");
        if (!request.FinishedKitProductId.HasValue)
            throw Invalid("Choose a Phaeno Transportation kit product before adding its specification.");
        string? finishedProductName = null;
        if (request.FinishedKitProductId.HasValue)
        {
            var product = await (from p in dbContext.LabSupplierProducts.AsNoTracking()
                join s in dbContext.LabSuppliers.AsNoTracking() on p.SupplierId equals s.Id
                join productType in dbContext.LabProductTypes.AsNoTracking() on p.ProductTypeId equals productType.Id
                where p.Id == request.FinishedKitProductId && s.IsInternalProducer && s.IsActive && productType.IsActive
                    && p.IsActive && p.ProductTypeId == PSeq.Operations.Laboratory.Domain.LabProductType.TransportationKitId
                select p).SingleOrDefaultAsync(cancellationToken)
                ?? throw Invalid("Choose an active Phaeno transportation kit product for the shipping specification.");
            if (!string.Equals(request.Sku.Trim(), product.ProductNumber, StringComparison.OrdinalIgnoreCase))
                throw Invalid("The shipping specification SKU must match its finished kit product SKU.");
            finishedProductName = product.Description;
        }
        SampleShippingContainerType type;
        SampleShippingContainerDefinition definition;
        try
        {
            type = new(request.Sku, request.FinishedKitProductId);
            definition = new(type.Id, 1, null, finishedProductName ?? request.CommonName, request.TubeCapacity, request.SupplierName,
                request.SupplierProductNumber, request.PackingInstructions, Utc(request.EffectiveFrom), Utc(request.EffectiveTo), request.IsActive, request.DisplayOrder,
                request.AssemblyWorkflowRevisionId, request.DryIceQuantity, request.DryIceUnit, request.TemperatureControlInstructions);
        }
        catch (ArgumentException exception) { throw Invalid(exception.Message); }
        if (await dbContext.SampleShippingContainerTypes.AnyAsync(item => item.NormalizedSku == type.NormalizedSku, cancellationToken))
            throw Conflict("This SKU already exists. Create a revision from its container record.");
        type.Definitions.Add(definition);
        await AddContentsAsync(definition, request.KitContents, cancellationToken, request.FinishedKitProductId.HasValue);
        await ValidateKitReleaseAsync(definition, request.FinishedKitProductId, cancellationToken);
        dbContext.SampleShippingContainerTypes.Add(type);
        await SaveAsync(cancellationToken);
        return Map(definition);
    }

    public async Task<IReadOnlyList<SampleShippingContainerDefinitionDto>> ReadStockCompatibleAsync(
        IReadOnlyList<ContainerSampleTypeContext> contexts, IReadOnlyList<Guid> definitionIds, CancellationToken ct)
    {
        var sampleTypeAnchorId = await RequiredSampleTypeAnchorAsync(contexts, ct);
        var now = DateTime.UtcNow;
        // Publishing a successor is not a recall of already manufactured stock. Explicit withdrawal still blocks it.
        var records = await Query().Where(item => definitionIds.Contains(item.Id)
            && item.EffectiveFrom <= now).ToListAsync(ct);
        // Ordinary design deactivation does not withdraw physical kits already assembled from this revision.
        return records.Where(item => item.ContainerType.SampleTypeAnchorId == sampleTypeAnchorId)
            .OrderBy(item => item.DisplayOrder).ThenBy(item => item.ContainerType.NormalizedSku).ThenBy(item => item.Id).Select(Map).ToArray();
    }

    public async Task<SampleShippingContainerDefinitionDto> ReviseAsync(Guid id, ReviseSampleShippingContainerRequest request, CancellationToken cancellationToken)
    {
        if (request.IsActive && !await dbContext.SampleShippingContainerDefinitions.AsNoTracking()
            .Where(item => item.Id == id).AnyAsync(item => item.ContainerType.SampleTypeAnchorId.HasValue, cancellationToken))
            throw Invalid("Link this Transportation kit to one Sample type before activating its specification.");
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var previous = await dbContext.SampleShippingContainerDefinitions.Include(item => item.ContainerType)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw Missing();
        if (previous.Version != request.Version) throw Conflict("This revision changed. Refresh the container before saving.");
        if (request.IsActive && !previous.ContainerType.FinishedKitProductId.HasValue)
            throw Invalid("This historical container has no named Phaeno Transportation kit product. Add a new Transportation kit for new work.");
        if (request.IsActive && previous.ContainerType.FinishedKitProductId.HasValue)
        {
            await SampleShippingPackingData.LockAsync(dbContext,
                $"supplier-product:{previous.ContainerType.FinishedKitProductId.Value}", cancellationToken);
            var productActive = await (from product in dbContext.LabSupplierProducts.AsNoTracking()
                join supplier in dbContext.LabSuppliers.AsNoTracking() on product.SupplierId equals supplier.Id
                join type in dbContext.LabProductTypes.AsNoTracking() on product.ProductTypeId equals type.Id
                where product.Id == previous.ContainerType.FinishedKitProductId && product.IsActive
                    && supplier.IsActive && supplier.IsInternalProducer && type.IsActive
                    && product.ProductTypeId == PSeq.Operations.Laboratory.Domain.LabProductType.TransportationKitId
                select product.Id).AnyAsync(cancellationToken);
            if (!productActive)
                throw Invalid("Reactivate the Phaeno kit product before activating a new shipping specification.");
        }
        if (await dbContext.SampleShippingContainerDefinitions.AnyAsync(item => item.SupersedesDefinitionId == id, cancellationToken))
            throw Conflict("This container already has a later revision. Open the latest revision to continue.");
        SampleShippingContainerDefinition definition;
        try
        {
            var effectiveFrom = Utc(request.EffectiveFrom);
            if (effectiveFrom <= previous.EffectiveFrom) throw Invalid("A revision must begin after the preceding revision starts.");
            var productName = previous.ContainerType.FinishedKitProductId.HasValue
                ? await dbContext.LabSupplierProducts.AsNoTracking().Where(item => item.Id == previous.ContainerType.FinishedKitProductId)
                    .Select(item => item.Description).SingleAsync(cancellationToken)
                : request.CommonName;
            definition = new(previous.ContainerTypeId, previous.Revision + 1, previous.Id, productName, request.TubeCapacity,
                request.SupplierName, request.SupplierProductNumber, request.PackingInstructions, effectiveFrom, Utc(request.EffectiveTo), request.IsActive, request.DisplayOrder,
                request.AssemblyWorkflowRevisionId, request.DryIceQuantity, request.DryIceUnit, request.TemperatureControlInstructions);
            // A draft does not withdraw the active definition. Activating a revision closes any earlier active interval.
            if (request.IsActive)
            {
                var active = await dbContext.SampleShippingContainerDefinitions.Where(item => item.ContainerTypeId == previous.ContainerTypeId && item.IsActive
                    && (!item.EffectiveTo.HasValue || item.EffectiveTo > effectiveFrom)).ToListAsync(cancellationToken);
                foreach (var item in active) item.CloseAt(effectiveFrom);
            }
        }
        catch (ArgumentException exception) { throw Invalid(exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict(exception.Message); }
        await AddContentsAsync(definition, request.KitContents, cancellationToken, previous.ContainerType.FinishedKitProductId.HasValue);
        await ValidateKitReleaseAsync(definition, previous.ContainerType.FinishedKitProductId, cancellationToken);
        previous.ContainerType.Definitions.Add(definition);
        // Shared type concurrency plus unique predecessor prevents concurrent revision forks.
        previous.ContainerType.MarkUpdated(DateTime.UtcNow, null);
        dbContext.SampleShippingContainerDefinitions.Add(definition);
        await SaveAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Map(definition);
    }

    public async Task ValidateContextsAsync(IReadOnlyList<ContainerSampleTypeContext>? contexts, CancellationToken cancellationToken)
    {
        await RequiredSampleTypeAnchorAsync(contexts, cancellationToken);
    }

    private async Task<Guid> RequiredSampleTypeAnchorAsync(IReadOnlyList<ContainerSampleTypeContext>? contexts, CancellationToken ct)
    {
        if (contexts is null || contexts.Count == 0)
            throw Invalid("Choose an Order Sample type before requesting compatible Transportation kits.");
        var ids = contexts.Select(value => value.SampleTypeDefinitionId).Distinct().ToArray();
        var keys = await dbContext.SampleTypeDefinitions.AsNoTracking().Where(value => ids.Contains(value.Id))
            .Select(value => new { value.Id, value.DefinitionKey }).ToArrayAsync(ct);
        if (keys.Length != ids.Length || keys.Select(value => value.DefinitionKey).Distinct().Count() != 1)
            throw Invalid("One Order may use only one Sample type. Choose kits linked to that type.");
        return await dbContext.SampleTypeDefinitions.AsNoTracking()
            .Where(value => value.DefinitionKey == keys[0].DefinitionKey && value.Revision == 1)
            .Select(value => value.Id).SingleAsync(ct);
    }

    public async Task<SampleShippingContainerDefinitionDto> DeactivateAsync(Guid id, long version, CancellationToken cancellationToken)
    {
        var definition = await dbContext.SampleShippingContainerDefinitions.Include(item => item.ContainerType).Include(item => item.KitContents)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw Missing();
        if (definition.Version != version) throw Conflict("This revision changed. Refresh the container before deactivating it.");
        definition.Deactivate(DateTime.UtcNow);
        await SaveAsync(cancellationToken);
        return Map(definition);
    }

    public async Task<SampleShippingContainerDefinitionDto> LinkSampleTypeAsync(Guid id,
        Guid sampleTypeDefinitionId, long version, Guid actorUserId, CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var definition = await dbContext.SampleShippingContainerDefinitions.Include(item => item.ContainerType)
            .Include(item => item.KitContents)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw Missing();
        var type = definition.ContainerType;
        if (definition.Version != version)
            throw Conflict("This Transportation kit changed. Refresh before linking its Sample type.");
        var sample = await dbContext.SampleTypeDefinitions.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == sampleTypeDefinitionId, cancellationToken)
            ?? throw Invalid("Choose an existing Sample type.");
        var anchor = await dbContext.SampleTypeDefinitions.AsNoTracking()
            .Where(item => item.DefinitionKey == sample.DefinitionKey && item.Revision == 1)
            .Select(item => item.Id).SingleAsync(cancellationToken);
        try { type.LinkSampleType(anchor, actorUserId, DateTime.UtcNow); }
        catch (InvalidOperationException error) { throw Conflict(error.Message); }
        catch (ArgumentException error) { throw Invalid(error.Message); }
        await SaveAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Map(definition);
    }

    public static string Snapshot(SampleShippingContainerDefinitionDto definition)
        => JsonSerializer.Serialize(definition, new JsonSerializerOptions(JsonSerializerDefaults.Web));

    public static SampleShippingContainerDefinitionDto Map(SampleShippingContainerDefinition item) => new(item.Id, item.ContainerTypeId,
        item.ContainerType.Sku, item.CommonName, item.TubeCapacity, item.Revision, item.SupersedesDefinitionId,
        item.SupplierName, item.SupplierProductNumber, item.PackingInstructions, item.EffectiveFrom, item.EffectiveTo,
        item.IsActive, item.DisplayOrder, item.Version, item.DeactivatedAt, item.KitContents.OrderBy(part => part.Position).Select(part => new ShippingKitContentDto(
                part.SupplierProductId, part.SupplierId, part.Kind.ToString(), part.Quantity, part.SupplierName, part.ProductNumber, part.ProductDescription, part.ProductTypeName)).ToArray(), item.ContainerType.FinishedKitProductId, item.AssemblyWorkflowRevisionId,
        item.ContainerType.SampleTypeAnchorId, item.DryIceQuantity, item.DryIceUnit, item.TemperatureControlInstructions);

    private async Task ValidateKitReleaseAsync(SampleShippingContainerDefinition definition, Guid? productId, CancellationToken ct)
    {
        if (definition.IsActive && !productId.HasValue)
            throw Invalid("This historical container has no named Phaeno Transportation kit product. Add a new Transportation kit for new work.");
        if (definition.IsActive && (definition.KitContents.Count == 0
            || string.IsNullOrWhiteSpace(definition.TemperatureControlInstructions)))
            throw Invalid("Add the kit bill of materials and temperature-control instructions before activating this specification.");
        if (!productId.HasValue) return; // Historical draft revisions remain readable but cannot become orderable.
        if (!definition.AssemblyWorkflowRevisionId.HasValue)
        {
            if (definition.IsActive) throw Invalid("Approve a kit assembly workflow and select its revision before activating this product specification.");
            return;
        }
        var revision = await dbContext.LabKitAssemblyWorkflowRevisions.AsNoTracking()
            .Include(item => item.Components).SingleOrDefaultAsync(item => item.Id == definition.AssemblyWorkflowRevisionId, ct)
            ?? throw Invalid("Select an existing kit assembly workflow revision.");
        var workflow = await dbContext.LabKitAssemblyWorkflows.AsNoTracking().SingleAsync(item => item.Id == revision.WorkflowId, ct);
        if (workflow.FinishedKitProductId != productId || revision.Status != PSeq.Operations.Laboratory.Domain.LabKitAssemblyRevisionStatus.Approved)
            throw Invalid("Select an approved workflow revision for this exact Phaeno kit product.");
        var latestApprovedRevision = await dbContext.LabKitAssemblyWorkflowRevisions.AsNoTracking()
            .Where(item => item.WorkflowId == workflow.Id
                && item.Status == PSeq.Operations.Laboratory.Domain.LabKitAssemblyRevisionStatus.Approved)
            .OrderByDescending(item => item.Revision).Select(item => item.Id).FirstAsync(ct);
        if (revision.Id != latestApprovedRevision)
            throw Invalid("Select the current approved workflow revision for a new kit specification.");
        var contents = definition.KitContents.OrderBy(item => item.SupplierProductId).Select(item => (item.SupplierProductId, item.Kind.ToString(), item.Quantity)).ToArray();
        var bom = revision.Components.OrderBy(item => item.SupplierProductId).Select(item => (item.SupplierProductId, item.Kind, item.Quantity)).ToArray();
        if (!contents.SequenceEqual(bom)) throw Invalid("The shipping specification contents must exactly match the approved workflow bill of materials.");
        var tube = revision.Components.SingleOrDefault(item => item.Kind == "Tube");
        if (tube?.Quantity != definition.TubeCapacity) throw Invalid("The approved workflow tube count must match the shipping specification capacity.");
    }

    private IQueryable<SampleShippingContainerDefinition> Query() => dbContext.SampleShippingContainerDefinitions.AsNoTracking()
        .Include(item => item.ContainerType).Include(item => item.KitContents);
    private async Task SaveAsync(CancellationToken cancellationToken)
    {
        try { await dbContext.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException) { throw Conflict("This container changed. Refresh before saving another revision."); }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        { throw Conflict("This SKU or revision already exists. Refresh the existing container record."); }
    }
    private static DateTime Utc(DateTime value) => value != default && value.Kind != DateTimeKind.Unspecified
        ? value.ToUniversalTime() : throw Invalid("Effective dates must include a time zone.");
    private static DateTime? Utc(DateTime? value) => value.HasValue ? Utc(value.Value) : null;
    private static OrderManagementException Invalid(string message) => new("shipping_container_invalid", message);
    private static OrderManagementException Conflict(string message) => new("shipping_container_conflict", message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing() => new("shipping_container_not_found", "The container revision was not found.", StatusCodes.Status404NotFound);
}
