namespace PhaenoPortal.App.Features.OrderManagement.Domain;

public sealed record LabChangeSource(string BiologicalSource, int SpecimenCount);
public sealed record LabChangeScope(Guid OriginalQuoteId, int BaseSpecimenCount,
    IReadOnlyList<LabChangeSource> AdditionalSources);
