namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class LabOrderSampleTypeChoices
{
    public static async Task<IReadOnlyList<LabOrderSampleTypeChoiceDto>> ReadAsync(
        PSeqOperationsDbContext db, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var defaultKey = await db.OrderSystemConfigurations.AsNoTracking()
            .OrderBy(item => item.CreatedAt).Select(item => item.DefaultShippingDestinationDefinitionKey)
            .FirstOrDefaultAsync(ct);
        if (!defaultKey.HasValue || !await db.SampleShippingDestinations.AsNoTracking().AnyAsync(item =>
            item.DefinitionKey == defaultKey.Value && item.IsActive && item.EffectiveFrom <= now
                && (!item.EffectiveTo.HasValue || item.EffectiveTo > now), ct))
            return [];
        var types = await db.SampleTypeDefinitions.AsNoTracking()
            .Where(item => item.IsActive && (item.MaterialClass == "extracted_rna" || item.MaterialClass == "enriched_rna")
                && item.EffectiveFrom <= now && (!item.EffectiveTo.HasValue || item.EffectiveTo > now))
            .ToListAsync(ct);
        var currentTypes = types.GroupBy(item => item.DefinitionKey)
            .Select(group => group.OrderByDescending(item => item.Revision).First()).ToArray();
        var procedureIds = currentTypes.Where(item => item.ShippingProcedureId.HasValue)
            .Select(item => item.ShippingProcedureId!.Value).Distinct().ToArray();
        var procedures = await db.SampleShippingProcedures.AsNoTracking()
            .Where(item => procedureIds.Contains(item.Id)).Select(item => new { item.Id, item.DefinitionKey }).ToArrayAsync(ct);
        var activeProcedureKeys = await db.SampleShippingProcedures.AsNoTracking()
            .Where(item => item.IsActive).Select(item => item.DefinitionKey).Distinct().ToArrayAsync(ct);
        var procedureKeyById = procedures.ToDictionary(item => item.Id, item => item.DefinitionKey);
        var activeSet = activeProcedureKeys.ToHashSet();
        var sampleKeys = currentTypes.Select(item => item.DefinitionKey).ToArray();
        var anchors = await db.SampleTypeDefinitions.AsNoTracking()
            .Where(item => sampleKeys.Contains(item.DefinitionKey) && item.Revision == 1)
            .Select(item => new { item.Id, item.DefinitionKey }).ToArrayAsync(ct);
        var anchorByKey = anchors.ToDictionary(item => item.DefinitionKey, item => item.Id);
        var usableAnchors = (await TransportationKitDefinitionReadiness.ReadAsync(db, now, ct))
            .Select(item => item.SampleTypeAnchorId).ToHashSet();
        return currentTypes.Where(item => item.ShippingProcedureId.HasValue
                && procedureKeyById.TryGetValue(item.ShippingProcedureId.Value, out var key) && activeSet.Contains(key)
                && anchorByKey.TryGetValue(item.DefinitionKey, out var anchorId) && usableAnchors.Contains(anchorId))
            .OrderBy(item => item.Name, StringComparer.OrdinalIgnoreCase)
            .Select(item => new LabOrderSampleTypeChoiceDto(item.Id, item.Name, item.Revision))
            .ToArray();
    }

    public static async Task<SampleTypeDefinition> RequireAsync(
        PSeqOperationsDbContext db, Guid? selectedId, CancellationToken ct)
    {
        if (!selectedId.HasValue || selectedId.Value == Guid.Empty)
            throw new OrderManagementException("sample_type_required", "Select one sample type for this Job.");
        var choices = await ReadAsync(db, ct);
        if (!choices.Any(item => item.Id == selectedId.Value))
            throw new OrderManagementException("sample_type_unavailable", "Select an active PSeq sample type for this Job.");
        return await db.SampleTypeDefinitions.AsNoTracking().SingleAsync(item => item.Id == selectedId.Value, ct);
    }
}
