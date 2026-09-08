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
    }

    public async Task<IReadOnlyList<LabServiceOfferingDto>> ReadAsync(bool availableOnly, CancellationToken token)
    {
        var now = DateTime.UtcNow;
        var query = db.Set<LabServiceOffering>().AsNoTracking();
        if (availableOnly) query = query.Where(value => value.IsActive && !value.IsSynthetic && value.EffectiveFrom <= now
            && (!value.EffectiveTo.HasValue || value.EffectiveTo > now));
        var offerings = await query.OrderBy(value => value.Name).ThenByDescending(value => value.OfferingVersion).ToListAsync(token);
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
            return Map(value, item, available);
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
            return new(familyId, version, request.Name, request.Description, request.CatalogItemId, request.AnalysisIds,
                request.AllowedMaterialTypes, request.AllowedBiologicalSources, request.IncludedOutputContract,
                request.MinimumTurnaroundDays, request.MaximumTurnaroundDays, request.EffectiveFrom,
                request.EffectiveTo, request.IsActive, request.IsSynthetic);
        }
        catch (ArgumentException exception) { throw Invalid(exception.Message); }
    }
    private static OrderManagementException Invalid(string message) => new("lab_offering_invalid", message, StatusCodes.Status400BadRequest);
}
