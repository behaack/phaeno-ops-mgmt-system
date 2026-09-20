namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

/// <summary>Stored revision IDs anchor a stable sample identity; issued packets retain their own snapshots.</summary>
public sealed record SampleShippingRevisionData(
    IReadOnlyDictionary<Guid, SampleTypeDefinition> CurrentByRequestedId,
    IReadOnlyDictionary<Guid, Guid> DefinitionKeysById,
    IReadOnlyList<SampleShippingInstructionRule> Rules)
{
    public IReadOnlyList<SampleTypeDefinition> CurrentTypes => CurrentByRequestedId.Values.DistinctBy(item => item.Id).ToArray();

    public SampleShippingResolution Resolve(SampleShippingDestination destination, DateTime effectiveAt)
        => SampleShippingCompatibilityResolver.Resolve(destination, CurrentTypes, Rules, effectiveAt, DefinitionKeysById);

    public static async Task<SampleShippingRevisionData> ReadAsync(PSeqOperationsDbContext db,
        Guid destinationId, IEnumerable<Guid> requestedIds, DateTime effectiveAt, CancellationToken ct)
    {
        var ids = requestedIds.Distinct().ToArray();
        var anchors = await db.SampleTypeDefinitions.AsNoTracking().Where(item => ids.Contains(item.Id)).ToListAsync(ct);
        if (ids.Length == 0 || anchors.Count != ids.Length)
            throw new OrderManagementException("sample_type_not_found", "Select an available sample type.", 409);
        var keys = anchors.Select(item => item.DefinitionKey).Distinct().ToArray();
        var revisions = await db.SampleTypeDefinitions.AsNoTracking().Where(item => keys.Contains(item.DefinitionKey)).ToListAsync(ct);
        var byKey = revisions.Where(item => item.IsEffectiveAt(effectiveAt)).GroupBy(item => item.DefinitionKey)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(item => item.Revision).ThenByDescending(item => item.EffectiveFrom).ThenBy(item => item.Id).First());
        var current = new Dictionary<Guid, SampleTypeDefinition>();
        foreach (var anchor in anchors)
        {
            if (!byKey.TryGetValue(anchor.DefinitionKey, out var revision))
                throw new OrderManagementException("sample_type_not_effective",
                    $"Sample type '{anchor.Name}' has no active revision effective at the requested time. Activate an approved revision before issuing shipping instructions.", 409);
            current.Add(anchor.Id, revision);
        }
        var revisionIds = revisions.Select(item => item.Id).ToArray();
        var rules = await db.SampleShippingInstructionRules.AsNoTracking()
            .Where(item => item.DestinationId == destinationId && revisionIds.Contains(item.SampleTypeDefinitionId)).ToListAsync(ct);
        return new(current, revisions.ToDictionary(item => item.Id, item => item.DefinitionKey), rules);
    }
}
