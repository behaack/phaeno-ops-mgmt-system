namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed record SampleShippingDestinationChoice(
    SampleShippingDestination Destination,
    SampleTypeDefinition SampleType);

/// <summary>Usable receiving destinations for one selected Sample type at the time of new shipping work.</summary>
public static class SampleShippingDestinationChoices
{
    public static async Task<Guid> DefaultAsync(PSeqOperationsDbContext db,
        IReadOnlyList<SampleShippingDestinationChoice> choices, CancellationToken ct)
    {
        var familyKey = await db.OrderSystemConfigurations.AsNoTracking().OrderBy(item => item.CreatedAt)
            .Select(item => item.DefaultShippingDestinationDefinitionKey).FirstOrDefaultAsync(ct);
        if (!familyKey.HasValue)
            throw new OrderManagementException("shipping_default_destination_required",
                "Phaeno must set a default ship-to destination before this sample list can be finalized.", 409);
        var selected = choices.SingleOrDefault(item => item.Destination.DefinitionKey == familyKey.Value);
        return selected?.Destination.Id ?? throw new OrderManagementException("shipping_default_destination_unavailable",
            "The default Phaeno ship-to destination is unavailable. Activate it or set another Active destination as Default before ordering.", 409);
    }

    public static async Task<IReadOnlyList<SampleShippingDestinationChoice>> ReadAsync(
        PSeqOperationsDbContext db, Guid sampleTypeId, DateTime effectiveAt, CancellationToken ct)
    {
        var requested = await db.SampleTypeDefinitions.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == sampleTypeId, ct)
            ?? throw new OrderManagementException("sample_type_not_found", "Choose an existing Sample type.", 409);
        var currentType = await db.SampleTypeDefinitions.AsNoTracking()
            .Where(item => item.DefinitionKey == requested.DefinitionKey && item.IsActive
                && item.EffectiveFrom <= effectiveAt && (!item.EffectiveTo.HasValue || item.EffectiveTo > effectiveAt))
            .OrderByDescending(item => item.Revision).FirstOrDefaultAsync(ct);
        if (currentType?.ShippingProcedureId is not Guid procedureId)
            return [];
        var procedure = await db.SampleShippingProcedures.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == procedureId, ct);
        if (procedure is null || !await db.SampleShippingProcedures.AsNoTracking()
            .AnyAsync(item => item.DefinitionKey == procedure.DefinitionKey && item.IsActive, ct))
            return [];
        var destinations = await db.SampleShippingDestinations.AsNoTracking()
            .Where(item => item.IsActive && item.EffectiveFrom <= effectiveAt
                && (!item.EffectiveTo.HasValue || item.EffectiveTo > effectiveAt))
            .OrderBy(item => item.Name).ThenBy(item => item.Id).ToArrayAsync(ct);
        return destinations.GroupBy(item => item.DefinitionKey)
            .Select(group => new SampleShippingDestinationChoice(group.OrderByDescending(item => item.Revision).First(), currentType))
            .OrderBy(item => item.Destination.Name).ToArray();
    }
}
