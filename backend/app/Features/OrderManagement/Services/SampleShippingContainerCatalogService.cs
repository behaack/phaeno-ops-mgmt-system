namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed partial class SampleShippingContainerCatalogService(PSeqOperationsDbContext dbContext)
{
    public async Task<IReadOnlyList<SampleShippingContainerDefinitionDto>> ReadAllAsync(CancellationToken cancellationToken)
    {
        var records = await Query().OrderBy(item => item.ContainerType.NormalizedSku).ThenByDescending(item => item.Revision)
            .ToListAsync(cancellationToken);
        var ready = await ReadyDefinitionsAsync(cancellationToken);
        return records.Select(item => WithReadiness(item, ready)).ToArray();
    }

    public async Task<SampleShippingContainerDefinitionDto> ReadAsync(Guid id, CancellationToken cancellationToken)
    {
        var record = await Query().SingleOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw Missing();
        var ready = await ReadyDefinitionsAsync(cancellationToken);
        return WithReadiness(record, ready);
    }

    public async Task<IReadOnlyList<SampleShippingContainerDefinitionDto>> ReadRevisionsAsync(Guid id, CancellationToken cancellationToken)
    {
        var source = await ReadAsync(id, cancellationToken);
        var records = await Query().Where(item => item.ContainerTypeId == source.DefinitionKey).OrderByDescending(item => item.Revision)
            .ToListAsync(cancellationToken);
        var ready = await ReadyDefinitionsAsync(cancellationToken);
        return records.Select(item => WithReadiness(item, ready)).ToArray();
    }

    private async Task<IReadOnlyDictionary<Guid, OrderableTransportationKit>> ReadyDefinitionsAsync(CancellationToken cancellationToken)
        => (await TransportationKitDefinitionReadiness.ReadAsync(dbContext, DateTime.UtcNow, cancellationToken))
            .ToDictionary(item => item.DefinitionId);

    private static SampleShippingContainerDefinitionDto WithReadiness(SampleShippingContainerDefinition item,
        IReadOnlyDictionary<Guid, OrderableTransportationKit> ready)
    {
        var orderable = ready.TryGetValue(item.Id, out var current);
        return Map(item) with { NewWorkReady = orderable, AssemblyWorkflowReady = current?.AssemblyWorkflowReady };
    }

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
            if (draft.Lifecycle != ShippingRevisionLifecycle.Draft || draft.EffectiveTo <= now)
                throw Invalid("Only an inactive draft that has not ended or been deactivated can be included for preview. Preview active containers without a draft override.");
            records.RemoveAll(item => item.ContainerTypeId == draft.ContainerTypeId && item.Id != draft.Id);
        }
        var ready = (await TransportationKitDefinitionReadiness.ReadAsync(dbContext, now, cancellationToken))
            .ToDictionary(item => item.DefinitionId);
        records.RemoveAll(item => item.IsActive && !ready.ContainsKey(item.Id));
        return records.Where(item => item.SampleTypeAnchorId == sampleTypeAnchorId)
            .OrderBy(item => item.DisplayOrder).ThenBy(item => item.ContainerType.NormalizedSku).ThenBy(item => item.Id)
            .Select(item => WithReadiness(item, ready)).ToArray();
    }

    public async Task<SampleShippingContainerDefinitionDto> CreateAsync(CreateSampleShippingContainerRequest request, CancellationToken cancellationToken)
    {
        if (request.IsActive)
            throw Invalid("Save the new Transportation kit as a draft, link its Sample type, then activate its specification.");
        if (!request.ShippingContainerProductId.HasValue)
            throw Invalid("Choose a purchased Shipping Container.");
        return await CreateContainerSpecificationAsync(request, cancellationToken);
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
        return records.Where(item => item.SampleTypeAnchorId == sampleTypeAnchorId)
            .OrderBy(item => item.DisplayOrder).ThenBy(item => item.ContainerType.NormalizedSku).ThenBy(item => item.Id).Select(Map).ToArray();
    }

    public async Task<SampleShippingContainerDefinitionDto> ReviseAsync(Guid id, ReviseSampleShippingContainerRequest request, CancellationToken cancellationToken)
    {
        if (request.IsActive) throw Invalid("Create a Draft specification, then activate it after validation.");
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var previous = await dbContext.SampleShippingContainerDefinitions.Include(item => item.ContainerType)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw Missing();
        await SampleShippingPackingData.LockAsync(dbContext,
            $"shipping-specification:{previous.ContainerTypeId}", cancellationToken);
        if (previous.Version != request.Version) throw Conflict("This revision changed. Refresh the container before saving.");
        var family = await dbContext.SampleShippingContainerDefinitions
            .Where(item => item.ContainerTypeId == previous.ContainerTypeId)
            .OrderByDescending(item => item.Revision).ToListAsync(cancellationToken);
        if (family.Any(item => item.Lifecycle == ShippingRevisionLifecycle.Draft))
            throw Conflict("Finish or discard the existing Draft before creating another specification revision.");
        var source = family.FirstOrDefault(item => item.Lifecycle == ShippingRevisionLifecycle.Released)
            ?? family.FirstOrDefault(item => item.Lifecycle == ShippingRevisionLifecycle.Superseded)
            ?? family.FirstOrDefault(item => item.Lifecycle == ShippingRevisionLifecycle.Deactivated)
            ?? previous;
        var chainHead = family[0];
        SampleShippingContainerDefinition definition;
        try
        {
            var effectiveFrom = Utc(request.EffectiveFrom);
            if (effectiveFrom <= source.EffectiveFrom) throw Invalid("A revision must begin after the preceding released revision starts.");
            definition = new(previous.ContainerTypeId, chainHead.Revision + 1, chainHead.Id,
                request.CommonName,
                request.TubeCapacity, effectiveFrom, Utc(request.EffectiveTo), false, request.DisplayOrder,
                request.DryIceQuantity, request.DryIceUnit, request.TemperatureControlInstructions,
                request.SampleTypeDefinitionId.HasValue
                    ? await SampleTypeAnchorAsync(request.SampleTypeDefinitionId.Value, cancellationToken) : null);
        }
        catch (ArgumentException exception) { throw Invalid(exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict(exception.Message); }
        definition.ConfigureAssembly(request.ShippingContainerProductId ?? source.ShippingContainerProductId, request.ShippingContainerProductId.HasValue ? request.AssemblyWorkflowId : source.AssemblyWorkflowId);
        var contents = request.KitContents ?? await dbContext.Set<ShippingKitContent>().AsNoTracking()
            .Where(item => item.ContainerDefinitionId == source.Id).OrderBy(item => item.Position)
            .Select(item => new ShippingKitContentRequest(item.SupplierProductId, item.Quantity)).ToArrayAsync(cancellationToken);
        await AddContentsAsync(definition, contents, cancellationToken);
        await ValidateKitReleaseAsync(definition, cancellationToken);
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

    private Task<Guid> SampleTypeAnchorAsync(Guid sampleTypeDefinitionId, CancellationToken ct)
        => RequiredSampleTypeAnchorAsync([new ContainerSampleTypeContext(sampleTypeDefinitionId)], ct);

    public async Task<SampleShippingContainerDefinitionDto> DeactivateAsync(Guid id, long version, CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var definition = await dbContext.SampleShippingContainerDefinitions.Include(item => item.ContainerType).Include(item => item.KitContents)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw Missing();
        await SampleShippingPackingData.LockAsync(dbContext,
            $"shipping-specification:{definition.ContainerTypeId}", cancellationToken);
        if (definition.Version != version) throw Conflict("This revision changed. Refresh the container before deactivating it.");
        try { definition.Deactivate(DateTime.UtcNow); }
        catch (InvalidOperationException error) { throw Conflict(error.Message); }
        await SaveAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Map(definition);
    }

    public async Task<SampleShippingContainerDefinitionDto> ActivateAsync(Guid id, long version, CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var definition = await dbContext.SampleShippingContainerDefinitions.Include(item => item.ContainerType)
            .Include(item => item.KitContents).SingleOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw Missing();
        await SampleShippingPackingData.LockAsync(dbContext,
            $"shipping-specification:{definition.ContainerTypeId}", cancellationToken);
        if (definition.Version != version) throw Conflict("This revision changed. Refresh the kit before activating it.");
        if (definition.Lifecycle != ShippingRevisionLifecycle.Draft)
            throw Conflict("Only a Draft specification can be activated.");
        if (!definition.SampleTypeAnchorId.HasValue)
            throw Invalid("Link this Transportation kit to one Sample type before activating its specification.");
        var sampleKey = await dbContext.SampleTypeDefinitions.AsNoTracking()
            .Where(item => item.Id == definition.SampleTypeAnchorId.Value)
            .Select(item => (Guid?)item.DefinitionKey).SingleOrDefaultAsync(cancellationToken)
            ?? throw Invalid("The selected Sample type is unavailable.");
        await SampleShippingPackingData.LockAsync(dbContext,
            $"sample-type:{sampleKey}", cancellationToken);
        if (await dbContext.SampleShippingContainerDefinitions.AnyAsync(item => item.SupersedesDefinitionId == id, cancellationToken))
            throw Conflict("Only the latest specification revision can be activated. Open the latest revision.");
        if (definition.IsActive) throw Conflict("This specification is already active.");
        var now = DateTime.UtcNow;
        try { definition.Activate(now); }
        catch (ArgumentException error) { throw Invalid(error.Message); }
        catch (InvalidOperationException error) { throw Conflict(error.Message); }
        if (!definition.ShippingContainerProductId.HasValue)
            throw Invalid("Choose a purchased Shipping Container before activation.");
        await SampleShippingPackingData.LockAsync(dbContext,
            $"supplier-product:{definition.ShippingContainerProductId.Value}", cancellationToken);
        await ValidateKitReleaseAsync(definition, cancellationToken);
        var active = await dbContext.SampleShippingContainerDefinitions.Where(item => item.ContainerTypeId == definition.ContainerTypeId
            && item.Id != id && item.IsActive && !item.DeactivatedAt.HasValue
            && (!item.EffectiveTo.HasValue || item.EffectiveTo > definition.EffectiveFrom)).ToListAsync(cancellationToken);
        try { foreach (var item in active) item.CloseAt(definition.EffectiveFrom); }
        catch (InvalidOperationException error) { throw Conflict(error.Message); }
        definition.ContainerType.MarkUpdated(now, null);
        await SaveAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Map(definition);
    }

    public async Task<SampleShippingContainerDefinitionDto> LinkSampleTypeAsync(Guid id,
        Guid sampleTypeDefinitionId, long version, Guid actorUserId, CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var definition = await dbContext.SampleShippingContainerDefinitions.Include(item => item.ContainerType)
            .Include(item => item.KitContents)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw Missing();
        await SampleShippingPackingData.LockAsync(dbContext,
            $"shipping-specification:{definition.ContainerTypeId}", cancellationToken);
        if (definition.Version != version)
            throw Conflict("This Transportation kit changed. Refresh before linking its Sample type.");
        var sample = await dbContext.SampleTypeDefinitions.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == sampleTypeDefinitionId, cancellationToken)
            ?? throw Invalid("Choose an existing Sample type.");
        await SampleShippingPackingData.LockAsync(dbContext, $"sample-type:{sample.DefinitionKey}", cancellationToken);
        var anchor = await SampleTypeAnchorAsync(sample.Id, cancellationToken);
        try { definition.SetDraftSampleType(anchor); }
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
        item.EffectiveFrom, item.EffectiveTo,
        item.IsActive, item.DisplayOrder, item.Version, item.DeactivatedAt, item.KitContents.OrderBy(part => part.Position).Select(part => new ShippingKitContentDto(
                part.SupplierProductId, part.SupplierId, part.Kind.ToString(), part.Quantity, part.SupplierName, part.ProductNumber, part.ProductDescription, part.ProductTypeName)).ToArray(),
        item.SampleTypeAnchorId, item.DryIceQuantity, item.DryIceUnit, item.TemperatureControlInstructions,
        null, item.Lifecycle.ToString(), null, item.ShippingContainerProductId, item.AssemblyWorkflowId);

    private async Task ValidateKitReleaseAsync(SampleShippingContainerDefinition definition, CancellationToken ct)
    {
        await ValidateAssemblyConfigurationAsync(definition, ct);
        if (!definition.IsActive) return; // An incomplete draft can be finished after its product workflow is approved.
        if (string.IsNullOrWhiteSpace(definition.TemperatureControlInstructions))
            throw Invalid("Record temperature-control instructions before activating this specification.");
        var contents = definition.KitContents.ToArray();
        try { ShippingKitContent.ValidateRecipe(contents, active: true); }
        catch (ArgumentException error) { throw Invalid(error.Message); }
        if (contents.Count(item => item.Kind == ShippingKitContentKind.Tube) != 1
            || contents.Single(item => item.Kind == ShippingKitContentKind.Tube).Quantity != definition.TubeCapacity
            || contents.Count(item => item.Kind == ShippingKitContentKind.ShippingContainer) != 1
            || contents.Single(item => item.Kind == ShippingKitContentKind.ShippingContainer).Quantity != 1)
            throw Invalid("Add one tube product matching usable capacity and one outer shipper with quantity one.");
        var componentIds = contents.Select(item => item.SupplierProductId).ToArray();
        var products = await (from product in dbContext.LabSupplierProducts.AsNoTracking()
            join supplier in dbContext.LabSuppliers.AsNoTracking() on product.SupplierId equals supplier.Id
            join type in dbContext.LabProductTypes.AsNoTracking() on product.ProductTypeId equals type.Id
            where componentIds.Contains(product.Id) && product.ProductTypeId != PSeq.Operations.Laboratory.Domain.LabProductType.SequencingServiceId && product.IsActive && supplier.IsActive
                && !supplier.IsInternalProducer && type.IsActive
            select new { product.Id, product.ProductTypeId, product.DefaultQuantityUnit, product.TubeCapacity,
                product.MaximumSampleAmount, product.SampleAmountUnit, type.KitUse }).ToDictionaryAsync(item => item.Id, ct);
        if (products.Count != contents.Length || contents.Any(item =>
            !products.TryGetValue(item.SupplierProductId, out var product)
            || product.KitUse.ToString() != item.Kind.ToString()
            || item.Kind is ShippingKitContentKind.Tube or ShippingKitContentKind.ShippingContainer
                && !string.Equals(product.DefaultQuantityUnit, "each", StringComparison.OrdinalIgnoreCase)))
            throw Invalid("Each required component must be an active purchased product with the approved kit role. Tube and outer shipper inventory units must be each.");
        var shipper = contents.Single(item => item.Kind == ShippingKitContentKind.ShippingContainer);
        if (definition.ShippingContainerProductId.HasValue && shipper.SupplierProductId != definition.ShippingContainerProductId)
            throw Invalid("Required contents must include the selected Shipping Container once with quantity one.");
        if (products[shipper.SupplierProductId].TubeCapacity is not int capacity || capacity < definition.TubeCapacity)
            throw Invalid("Set the outer Shipping Container product's tube capacity to at least this kit's usable tube capacity.");
        if (definition.SampleTypeAnchorId.HasValue)
        {
            var anchor = await dbContext.SampleTypeDefinitions.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Id == definition.SampleTypeAnchorId.Value, ct);
            if (anchor is not null)
            {
                var sampleType = await dbContext.SampleTypeDefinitions.AsNoTracking()
                    .Where(item => item.DefinitionKey == anchor.DefinitionKey && item.IsActive)
                    .OrderByDescending(item => item.Revision).FirstOrDefaultAsync(ct);
                if (sampleType is not null)
                {
                    var tube = products[contents.Single(item => item.Kind == ShippingKitContentKind.Tube).SupplierProductId];
                    if (sampleType.MinimumSampleAmount is not > 0 || tube.MaximumSampleAmount is not > 0
                        || !string.Equals(sampleType.SampleAmountUnit, tube.SampleAmountUnit, StringComparison.Ordinal)
                        || tube.MaximumSampleAmount < sampleType.MinimumSampleAmount)
                        throw Invalid("Set matching Sample type minimum and Tube product maximum units; the tube maximum must be at least the sample minimum before activating this kit specification.");
                }
            }
        }
    }

    private IQueryable<SampleShippingContainerDefinition> Query() => dbContext.SampleShippingContainerDefinitions.AsNoTracking()
        .Include(item => item.ContainerType).Include(item => item.KitContents);
    private async Task SaveAsync(CancellationToken cancellationToken)
    {
        try { await dbContext.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException) { throw Conflict("This container changed. Refresh before saving another revision."); }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        { throw Conflict("This kit specification conflicts with an existing record or revision. Refresh and review the saved specifications."); }
    }
    private static DateTime Utc(DateTime value) => value != default && value.Kind != DateTimeKind.Unspecified
        ? value.ToUniversalTime() : throw Invalid("Effective dates must include a time zone.");
    private static DateTime? Utc(DateTime? value) => value.HasValue ? Utc(value.Value) : null;
    private static OrderManagementException Invalid(string message) => new("shipping_container_invalid", message);
    private static OrderManagementException Conflict(string message) => new("shipping_container_conflict", message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing() => new("shipping_container_not_found", "The container revision was not found.", StatusCodes.Status404NotFound);
}
