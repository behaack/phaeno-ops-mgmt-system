namespace PhaenoPortal.App.Features.OrderManagement.Services;

using PhaenoPortal.App.Features.OrderManagement.DTOs;

/// <summary>Read-only tube packing; quantities describe physical containers, never specimens or stock reservations.</summary>
public static class SampleShippingContainerPacker
{
    private sealed record Path(int Count, int DefinitionIndex, int Quantity, Path? Previous);

    public static ContainerPackingPreviewDto Preview(IReadOnlyList<SampleShippingContainerDefinitionDto> definitions,
        int tubeCount, IReadOnlyList<ContainerQuantityRequest>? availability = null,
        IReadOnlyList<ContainerQuantityRequest>? selection = null)
    {
        if (tubeCount is < 0 or > 10000) throw Invalid("Choose a tube count between 0 and 10,000.");
        var candidates = definitions.OrderBy(item => item.DisplayOrder).ThenBy(item => item.Sku, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.Id).ToArray();
        if (candidates.Any(item => item.TubeCapacity is < 1 or > 10000) || candidates.Select(item => item.Id).Distinct().Count() != candidates.Length)
            throw Invalid("Container definitions must have unique revisions and valid usable tube capacities.");
        var available = Quantities(availability, candidates);
        var selected = Quantities(selection, candidates);
        var quantities = new int[candidates.Length];
        if (selection is not null)
        {
            for (var i = 0; i < candidates.Length; i++)
            {
                quantities[i] = selected.GetValueOrDefault(candidates[i].Id);
                if (available.TryGetValue(candidates[i].Id, out var limit) && quantities[i] > limit)
                    throw Invalid($"The selected quantity of {candidates[i].CommonName} exceeds the available quantity.");
            }
        }
        else if (tubeCount > 0 && candidates.Length > 0)
        {
            // Any optimal covering plan has less than one largest-container worth of spare capacity.
            // Bounded binary groups keep the search exact without iterating individual stock units.
            var maxCapacity = tubeCount + candidates.Max(item => item.TubeCapacity) - 1;
            var paths = new Path?[maxCapacity + 1];
            paths[0] = new Path(0, -1, 0, null);
            for (var i = 0; i < candidates.Length; i++)
            {
                var capacity = candidates[i].TubeCapacity;
                var remaining = Math.Min(available.GetValueOrDefault(candidates[i].Id, maxCapacity / capacity), maxCapacity / capacity);
                for (var block = 1; remaining > 0; block *= 2)
                {
                    var quantity = Math.Min(block, remaining);
                    remaining -= quantity;
                    var weight = quantity * capacity;
                    for (var total = maxCapacity; total >= weight; total--)
                    {
                        var previous = paths[total - weight];
                        if (previous is null || (paths[total] is { } existing && existing.Count <= previous.Count + quantity)) continue;
                        paths[total] = new Path(previous.Count + quantity, i, quantity, previous);
                    }
                }
            }
            var best = -1;
            for (var capacity = tubeCount; capacity <= maxCapacity; capacity++)
                if (paths[capacity] is { } path && (best < 0 || path.Count < paths[best]!.Count)) best = capacity;
            if (best < 0)
                for (var capacity = tubeCount - 1; capacity >= 0; capacity--)
                    if (paths[capacity] is not null) { best = capacity; break; }
            for (var path = paths[best]; path is { DefinitionIndex: >= 0 }; path = path.Previous)
                quantities[path.DefinitionIndex] += path.Quantity;
        }

        var unallocated = tubeCount;
        var allocations = new List<ContainerPackingAllocationDto>();
        // Fill larger selected containers first. Empty extras remain unused supplies, never empty shipments.
        foreach (var index in Enumerable.Range(0, candidates.Length).OrderByDescending(i => candidates[i].TubeCapacity).ThenBy(i => i))
        {
            if (unallocated == 0 || quantities[index] == 0) continue;
            var definition = candidates[index];
            var used = Math.Min(quantities[index], (unallocated + definition.TubeCapacity - 1) / definition.TubeCapacity);
            var capacity = used * definition.TubeCapacity;
            var assigned = Math.Min(unallocated, capacity);
            allocations.Add(new(definition.Id, definition.Sku, definition.CommonName, definition.TubeCapacity, used, assigned, capacity - assigned));
            unallocated -= assigned;
        }
        var count = allocations.Sum(item => item.Quantity);
        var totalCapacity = allocations.Sum(item => item.Capacity * item.Quantity);
        var unused = totalCapacity - (tubeCount - unallocated);
        var explanation = unallocated > 0
            ? $"These compatible containers leave {unallocated} tube(s) unallocated. Add available capacity or prepare the allocated containers separately."
            : selection is not null
                ? $"Your selection holds all {tubeCount} tube(s) in {count} container(s), with {unused} unused slot(s). Empty extra containers are not used."
                : $"The fewest compatible containers needed are {count}, with {unused} unused slot(s). Availability is limited only where quantities were entered.";
        return new(tubeCount, count, totalCapacity, unused, unallocated, unallocated == 0, allocations, explanation);
    }

    private static Dictionary<Guid, int> Quantities(IReadOnlyList<ContainerQuantityRequest>? requests,
        IReadOnlyList<SampleShippingContainerDefinitionDto> definitions)
    {
        var result = new Dictionary<Guid, int>();
        foreach (var request in requests ?? [])
        {
            if (request.Quantity is < 0 or > 10000) throw Invalid("Container quantities must be between 0 and 10,000.");
            if (!definitions.Any(item => item.Id == request.ContainerDefinitionId)) throw Invalid("Choose an effective container compatible with every selected sample and handling rule.");
            if (!result.TryAdd(request.ContainerDefinitionId, request.Quantity)) throw Invalid("Enter each container size only once.");
        }
        return result;
    }

    private static OrderManagementException Invalid(string message) => new("container_packing_invalid", message);
}
