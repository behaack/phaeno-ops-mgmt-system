namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class SampleShippingContainerCatalogService(PSeqOperationsDbContext dbContext)
{
    public async Task<IReadOnlyList<SampleShippingContainerDefinitionDto>> ReadAllAsync(CancellationToken cancellationToken)
        => (await Query().OrderBy(item => item.ContainerType.NormalizedSku).ThenByDescending(item => item.Revision)
            .ToListAsync(cancellationToken)).Select(Map).ToArray();

    public async Task<SampleShippingContainerDefinitionDto> ReadAsync(Guid id, CancellationToken cancellationToken)
        => Map(await Query().SingleOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw Missing());

    public async Task<IReadOnlyList<SampleShippingContainerDefinitionDto>> ReadRevisionsAsync(Guid id, CancellationToken cancellationToken)
    {
        var source = await ReadAsync(id, cancellationToken);
        return (await Query().Where(item => item.ContainerTypeId == source.DefinitionKey).OrderByDescending(item => item.Revision)
            .ToListAsync(cancellationToken)).Select(Map).ToArray();
    }

    public async Task<IReadOnlyList<SampleShippingContainerDefinitionDto>> ReadCompatibleAsync(
        IReadOnlyList<ContainerCompatibilityRequest> contexts, CancellationToken cancellationToken, Guid? includeDraftDefinitionId = null)
    {
        await ValidateContextsAsync(contexts, cancellationToken);
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
        return records.Where(item => contexts.All(context => item.Compatibilities.Any(pair =>
                pair.SampleTypeDefinitionId == context.SampleTypeDefinitionId && pair.InstructionRuleId == context.InstructionRuleId)))
            .OrderBy(item => item.DisplayOrder).ThenBy(item => item.ContainerType.NormalizedSku).ThenBy(item => item.Id).Select(Map).ToArray();
    }

    public async Task<SampleShippingContainerDefinitionDto> CreateAsync(CreateSampleShippingContainerRequest request, CancellationToken cancellationToken)
    {
        await ValidateContextsAsync(request.Compatibilities, cancellationToken);
        SampleShippingContainerType type;
        SampleShippingContainerDefinition definition;
        try
        {
            type = new(request.Sku);
            definition = new(type.Id, 1, null, request.CommonName, request.TubeCapacity, request.SupplierName,
                request.SupplierProductNumber, request.PackingInstructions, Utc(request.EffectiveFrom), Utc(request.EffectiveTo), request.IsActive, request.DisplayOrder);
        }
        catch (ArgumentException exception) { throw Invalid(exception.Message); }
        if (await dbContext.SampleShippingContainerTypes.AnyAsync(item => item.NormalizedSku == type.NormalizedSku, cancellationToken))
            throw Conflict("This SKU already exists. Create a revision from its container record.");
        type.Definitions.Add(definition);
        AddContexts(definition, request.Compatibilities);
        dbContext.SampleShippingContainerTypes.Add(type);
        await SaveAsync(cancellationToken);
        return Map(definition);
    }

    public async Task<IReadOnlyList<SampleShippingContainerDefinitionDto>> ReadStockCompatibleAsync(
        IReadOnlyList<ContainerCompatibilityRequest> contexts, IReadOnlyList<Guid> definitionIds, CancellationToken ct)
    {
        await ValidateContextsAsync(contexts, ct);
        var now = DateTime.UtcNow;
        // Publishing a successor is not a recall of already manufactured stock. Explicit withdrawal still blocks it.
        var records = await Query().Where(item => definitionIds.Contains(item.Id) && item.IsActive
            && !item.DeactivatedAt.HasValue && item.EffectiveFrom <= now).ToListAsync(ct);
        return records.Where(item => contexts.All(context => item.Compatibilities.Any(pair =>
                pair.SampleTypeDefinitionId == context.SampleTypeDefinitionId && pair.InstructionRuleId == context.InstructionRuleId)))
            .OrderBy(item => item.DisplayOrder).ThenBy(item => item.ContainerType.NormalizedSku).ThenBy(item => item.Id).Select(Map).ToArray();
    }

    public async Task<SampleShippingContainerDefinitionDto> ReviseAsync(Guid id, ReviseSampleShippingContainerRequest request, CancellationToken cancellationToken)
    {
        await ValidateContextsAsync(request.Compatibilities, cancellationToken);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var previous = await dbContext.SampleShippingContainerDefinitions.Include(item => item.ContainerType)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw Missing();
        if (previous.Version != request.Version) throw Conflict("This revision changed. Refresh the container before saving.");
        if (await dbContext.SampleShippingContainerDefinitions.AnyAsync(item => item.SupersedesDefinitionId == id, cancellationToken))
            throw Conflict("This container already has a later revision. Open the latest revision to continue.");
        SampleShippingContainerDefinition definition;
        try
        {
            var effectiveFrom = Utc(request.EffectiveFrom);
            if (effectiveFrom <= previous.EffectiveFrom) throw Invalid("A revision must begin after the preceding revision starts.");
            definition = new(previous.ContainerTypeId, previous.Revision + 1, previous.Id, request.CommonName, request.TubeCapacity,
                request.SupplierName, request.SupplierProductNumber, request.PackingInstructions, effectiveFrom, Utc(request.EffectiveTo), request.IsActive, request.DisplayOrder);
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
        AddContexts(definition, request.Compatibilities);
        previous.ContainerType.Definitions.Add(definition);
        // Shared type concurrency plus unique predecessor prevents concurrent revision forks.
        previous.ContainerType.MarkUpdated(DateTime.UtcNow, null);
        dbContext.SampleShippingContainerDefinitions.Add(definition);
        await SaveAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Map(definition);
    }

    public async Task ValidateContextsAsync(IReadOnlyList<ContainerCompatibilityRequest>? contexts, CancellationToken cancellationToken)
    {
        if (contexts is null || contexts.Count == 0 || contexts.Count > 100 || contexts.Distinct().Count() != contexts.Count)
            throw Invalid("Choose at least one distinct sample type and handling rule, up to 100 combinations.");
        var ids = contexts.Select(item => item.InstructionRuleId).ToArray();
        var rules = await dbContext.SampleShippingInstructionRules.AsNoTracking().Where(item => ids.Contains(item.Id))
            .Select(item => new { item.Id, item.SampleTypeDefinitionId }).ToDictionaryAsync(item => item.Id, cancellationToken);
        foreach (var pair in contexts)
            if (!rules.TryGetValue(pair.InstructionRuleId, out var rule) || rule.SampleTypeDefinitionId != pair.SampleTypeDefinitionId)
                throw Invalid("Each handling rule must belong to its selected sample type.");
    }

    public async Task<SampleShippingContainerDefinitionDto> DeactivateAsync(Guid id, long version, CancellationToken cancellationToken)
    {
        var definition = await dbContext.SampleShippingContainerDefinitions.Include(item => item.ContainerType).Include(item => item.Compatibilities)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken) ?? throw Missing();
        if (definition.Version != version) throw Conflict("This revision changed. Refresh the container before deactivating it.");
        definition.Deactivate(DateTime.UtcNow);
        await SaveAsync(cancellationToken);
        return Map(definition);
    }

    public static string Snapshot(SampleShippingContainerDefinitionDto definition)
        => JsonSerializer.Serialize(definition, new JsonSerializerOptions(JsonSerializerDefaults.Web));

    public static SampleShippingContainerDefinitionDto Map(SampleShippingContainerDefinition item) => new(item.Id, item.ContainerTypeId,
        item.ContainerType.Sku, item.CommonName, item.TubeCapacity, item.Revision, item.SupersedesDefinitionId,
        item.SupplierName, item.SupplierProductNumber, item.PackingInstructions, item.EffectiveFrom, item.EffectiveTo,
        item.IsActive, item.DisplayOrder, item.Version, item.Compatibilities.OrderBy(pair => pair.SampleTypeDefinitionId).ThenBy(pair => pair.InstructionRuleId)
            .Select(pair => new ContainerCompatibilityRequest(pair.SampleTypeDefinitionId, pair.InstructionRuleId)).ToArray(), item.DeactivatedAt);

    private IQueryable<SampleShippingContainerDefinition> Query() => dbContext.SampleShippingContainerDefinitions.AsNoTracking()
        .Include(item => item.ContainerType).Include(item => item.Compatibilities);
    private static void AddContexts(SampleShippingContainerDefinition definition, IReadOnlyList<ContainerCompatibilityRequest> contexts)
    {
        foreach (var pair in contexts) definition.Compatibilities.Add(new(definition.Id, pair.SampleTypeDefinitionId, pair.InstructionRuleId));
    }
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
