namespace PhaenoPortal.App.Features.OrderManagement.Domain;

using System.Text.Json.Serialization;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record CustomerStandardOrderDraft(string JobName, Guid? OfferingId, Guid? SampleTypeDefinitionId,
    IReadOnlyList<PhaseSourceScope> Sources, string? StorageRequirements, string? SafetyDeclaration, string? Notes)
{
    public void Validate(bool review)
    {
        // Reuse the scope validation while fixing Customer orders to exactly one run and one scope.
        CommercialDraftRules.Validate(new(JobName, SampleTypeDefinitionId, StorageRequirements,
            SafetyDeclaration, null, false, [new("Scope", Sources, 1, null, null, null)]), review);
        if (Notes?.Length > 2000) throw new ArgumentException("Job notes allow up to 2,000 characters.");
        if (review && (!OfferingId.HasValue || OfferingId == Guid.Empty))
            throw new ArgumentException("Select an available service before reviewing this order.");
    }
}

public static class CustomerStandardOrderRules
{
    public static string? SampleLimitBlocker(int sampleCount, int? maximum) => !maximum.HasValue
        ? "Phaeno must configure this service's Customer sample limit before self-service placement. Contact your sales representative."
        : sampleCount > maximum.Value ? $"For orders above {maximum.Value} samples, contact your sales representative for negotiated pricing." : null;
}
