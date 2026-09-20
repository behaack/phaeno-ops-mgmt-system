namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class LabServiceOfferingService(PSeqOperationsDbContext db)
{
    public async Task ValidateConfigurationAsync(LabServiceOffering offering, CancellationToken token)
    {
        var catalog = await db.QboCatalogItems.AsNoTracking().SingleOrDefaultAsync(value => value.Id == offering.CatalogItemId, token)
            ?? throw Invalid("Select an existing POMS catalog item.");
        if (!OrderServiceKeys.IsPSeqLabService(catalog.ExternalItemId)
            || !string.Equals(catalog.SalesUnit, OrderSalesUnits.Specimen, StringComparison.OrdinalIgnoreCase))
            throw Invalid("Select the designated PSeq Lab Service catalog item sold by specimen.");
        if (offering.IsActive && (catalog.BasePrice <= 0 || catalog.Currency != "USD"))
            throw Invalid("Standard PSeq Lab Service requires a positive USD catalog price.");
        var ids = offering.AnalysisIds();
        if (await db.AnalysisDefinitions.CountAsync(value => ids.Contains(value.Id)
                && (!offering.IsActive || value.IsActive && !value.IsSynthetic), token) != ids.Count)
            throw Invalid("Select existing included analyses; an active offering requires active, non-synthetic analyses.");
        if (offering.IsActive && (!catalog.IsActive || !offering.AllowedMaterialTypes().Contains("extracted_rna", StringComparer.OrdinalIgnoreCase)))
            throw Invalid("An active standard offering requires an active catalog item and the currently supported extracted RNA intake.");
        var sampleIds = offering.SupportedSampleTypes.Select(value => value.SampleTypeDefinitionId).ToArray();
        var types = await db.SampleTypeDefinitions.AsNoTracking().Where(value => sampleIds.Contains(value.Id)).ToListAsync(token);
        if (types.Count != sampleIds.Length || types.Any(type => !offering.AllowedMaterialTypes().Contains(type.MaterialClass, StringComparer.OrdinalIgnoreCase)))
            throw Invalid("Select existing sample-type revisions matching the service materials.");
        if (offering.IsActive && (types.Count == 0 || types.Any(type => !type.IsActive
            || type.EffectiveFrom > offering.EffectiveFrom || type.EffectiveTo <= offering.EffectiveFrom)))
            throw Invalid("An active scientific definition requires explicitly assigned sample-type revisions available when it begins. Create a new version to review legacy assignments.");
        if (offering.IsActive && types.Count(type => type.MaterialClass == "extracted_rna" && type.QuantityUnit == "tube") != 1)
            throw Invalid("The current PSeq intake requires exactly one supported extracted-RNA tube sample type.");
    }

    public async Task<IReadOnlyList<LabServiceOfferingDto>> ReadAsync(bool availableOnly, CancellationToken token)
    {
        var now = DateTime.UtcNow;
        var query = db.Set<LabServiceOffering>().Include(value => value.SupportedSampleTypes).AsNoTracking();
        if (availableOnly) query = query.Where(value => value.IsActive && !value.IsSynthetic && value.EffectiveFrom <= now
            && (!value.EffectiveTo.HasValue || value.EffectiveTo > now));
        var offerings = await query.OrderBy(value => value.Name).ThenByDescending(value => value.OfferingVersion).ToListAsync(token);
        var typeIds = offerings.SelectMany(value => value.SupportedSampleTypes.Select(type => type.SampleTypeDefinitionId)).Distinct().ToArray();
        var anchors = await db.SampleTypeDefinitions.AsNoTracking().Where(value => typeIds.Contains(value.Id)).ToDictionaryAsync(value => value.Id, token);
        var keys = anchors.Values.Select(value => value.DefinitionKey).Distinct().ToArray();
        var revisions = await db.SampleTypeDefinitions.AsNoTracking().Where(value => keys.Contains(value.DefinitionKey)).ToListAsync(token);
        var current = revisions.Where(value => value.IsEffectiveAt(now)).GroupBy(value => value.DefinitionKey)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(value => value.Revision).First());
        var sampleTypes = anchors.ToDictionary(pair => pair.Key, pair => current.GetValueOrDefault(pair.Value.DefinitionKey) ?? pair.Value);
        var catalogIds = offerings.Select(value => value.CatalogItemId).Distinct().ToList();
        var catalog = await db.QboCatalogItems.AsNoTracking().Where(value => catalogIds.Contains(value.Id)).ToDictionaryAsync(value => value.Id, token);
        var activeAnalyses = (await db.AnalysisDefinitions.AsNoTracking().Where(value => value.IsActive && !value.IsSynthetic)
            .Select(value => value.Id).ToListAsync(token)).ToHashSet();
        return offerings.Where(value => catalog.ContainsKey(value.CatalogItemId)).Select(value =>
        {
            var item = catalog[value.CatalogItemId];
            var available = value.IsEffectiveAt(now) && item.IsActive && item.BasePrice > 0 && item.Currency == "USD"
                && OrderServiceKeys.IsPSeqLabService(item.ExternalItemId)
                && string.Equals(item.SalesUnit, OrderSalesUnits.Specimen, StringComparison.OrdinalIgnoreCase)
                && value.AnalysisIds().All(activeAnalyses.Contains)
                && value.AllowedMaterialTypes().Contains("extracted_rna", StringComparer.OrdinalIgnoreCase);
            var supported = value.SupportedSampleTypes.Select(type => sampleTypes[type.SampleTypeDefinitionId])
                .OrderBy(type => type.Name).Select(type => new ServiceSampleTypeDto(type.Id, type.Code, type.Name,
                    type.Revision, type.MaterialClass, type.QuantityUnit, type.IsEffectiveAt(now))).ToArray();
            available = available && supported.Length > 0 && supported.All(type => type.IsAvailable)
                && supported.Count(type => type.MaterialClass == "extracted_rna" && type.QuantityUnit == "tube") == 1
                && offerings.Count(other => other.CatalogItemId == value.CatalogItemId && other.IsEffectiveAt(now)) == 1;
            return Map(value, item, available) with { SupportedSampleTypes = supported };
        }).Where(value => !availableOnly || value.IsAvailable).ToList();
    }

    public async Task<LabServiceOfferingDto> ReadOneAsync(Guid id, CancellationToken token) =>
        (await ReadAsync(false, token)).SingleOrDefault(value => value.Id == id)
            ?? throw new OrderManagementException("lab_offering_not_found", "The Lab Service offering was not found.", StatusCodes.Status404NotFound);

    public static LabServiceOfferingDto Map(LabServiceOffering offering, QboCatalogItem item, bool available) => new(
        offering.Id, offering.FamilyId, offering.OfferingVersion, offering.Name, offering.Description,
        item.Id, item.ExternalItemId, item.Name, item.Version, item.BasePrice, item.Currency,
        offering.AnalysisIds(), offering.AllowedMaterialTypes(), offering.AllowedBiologicalSources(), offering.IncludedOutputContract,
        offering.MinimumTurnaroundDays, offering.MaximumTurnaroundDays, offering.EffectiveFrom, offering.EffectiveTo,
        offering.IsActive, offering.IsSynthetic, available, offering.Version);

    public static LabServiceOffering Build(Guid familyId, int version, LabServiceOfferingWriteRequest request)
    {
        try
        {
            var offering = new LabServiceOffering(familyId, version, request.Name, request.Description, request.CatalogItemId, request.AnalysisIds,
                request.AllowedMaterialTypes, request.AllowedBiologicalSources, request.IncludedOutputContract,
                request.MinimumTurnaroundDays, request.MaximumTurnaroundDays, request.EffectiveFrom,
                request.EffectiveTo, request.IsActive, request.IsSynthetic);
            offering.AssignSampleTypes(request.SupportedSampleTypeIds ?? []);
            return offering;
        }
        catch (ArgumentException exception) { throw Invalid(exception.Message); }
    }
    private static OrderManagementException Invalid(string message) => new("lab_offering_invalid", message, StatusCodes.Status400BadRequest);
}
