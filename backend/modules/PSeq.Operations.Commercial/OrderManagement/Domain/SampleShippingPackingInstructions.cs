namespace PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed record ResolvedContainerPacking(Guid SampleTypeId, Guid InstructionRuleId,
    string TemperatureControlInstructions, string PackingInstructions);

public static class SampleShippingPackingInstructions
{
    public static IReadOnlyList<ResolvedContainerPacking> Resolve(SampleShippingResolution resolution,
        IReadOnlyCollection<SampleShippingContainerCompatibility> combinations,
        IReadOnlyDictionary<Guid, Guid> sampleKeys)
    {
        var result = new List<ResolvedContainerPacking>();
        foreach (var rule in resolution.Rules)
        {
            var matches = combinations.Where(pair => pair.InstructionRuleId == rule.Rule.Id
                && sampleKeys.TryGetValue(pair.SampleTypeDefinitionId, out var key)
                && key == rule.SampleType.DefinitionKey).ToArray();
            if (matches.Length > 1)
                throw new InvalidOperationException("More than one packing instruction matches this sample/container combination.");
            var match = matches.SingleOrDefault();
            if (rule.Rule.ShippingProcedureId.HasValue && (match is null
                || string.IsNullOrWhiteSpace(match.TemperatureControlInstructions) || string.IsNullOrWhiteSpace(match.PackingInstructions)))
                throw new InvalidOperationException($"Approve temperature control and packing steps for '{rule.SampleType.Name}' in this container before issuing instructions.");
            if (match is not null && (!string.IsNullOrWhiteSpace(match.TemperatureControlInstructions) || !string.IsNullOrWhiteSpace(match.PackingInstructions)))
                result.Add(new(rule.SampleType.Id, rule.Rule.Id, match.TemperatureControlInstructions ?? "", match.PackingInstructions ?? ""));
        }
        var controls = result.Select(item => item.TemperatureControlInstructions.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        if (controls.Length > 1 || result.Count > 0 && result.Count != resolution.Rules.Count)
            throw new InvalidOperationException("The samples do not have one approved temperature-control instruction for this container. Review their packing details or use separate containers.");
        return result;
    }
}
