namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using System.Text.Json;
using PSeq.Operations.Commercial.Common.Persistence;

public sealed class LabServiceOffering : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid FamilyId { get; private set; }
    public int OfferingVersion { get; private set; }
    public string Name { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public Guid CatalogItemId { get; private set; }
    public ICollection<LabServiceSampleType> SupportedSampleTypes { get; private set; } = new List<LabServiceSampleType>();
    public string AnalysisIdsJson { get; private set; } = "[]";
    public string AllowedMaterialTypesJson { get; private set; } = "[]";
    public string AllowedBiologicalSourcesJson { get; private set; } = "[]";
    public string IncludedOutputContract { get; private set; } = null!;
    public int MinimumTurnaroundDays { get; private set; }
    public int MaximumTurnaroundDays { get; private set; }
    public DateTime EffectiveFrom { get; private set; }
    public DateTime? EffectiveTo { get; private set; }
    public bool IsActive { get; private set; }
    public bool IsSynthetic { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private LabServiceOffering() { }

    public LabServiceOffering(Guid familyId, int offeringVersion, string name, string description,
        Guid catalogItemId, IReadOnlyList<Guid> analysisIds, IReadOnlyList<string> allowedMaterialTypes,
        IReadOnlyList<string> allowedBiologicalSources, string includedOutputContract,
        int minimumTurnaroundDays, int maximumTurnaroundDays, DateTime effectiveFrom,
        DateTime? effectiveTo, bool isActive, bool isSynthetic)
    {
        if (familyId == Guid.Empty || catalogItemId == Guid.Empty || offeringVersion < 1)
            throw new ArgumentException("An offering family, catalog item and positive version are required.");
        if (analysisIds is null || analysisIds.Count is < 1 or > 100 || analysisIds.Any(value => value == Guid.Empty)
            || analysisIds.Distinct().Count() != analysisIds.Count)
            throw new ArgumentException("Select between one and 100 distinct included analyses.");
        if (minimumTurnaroundDays < 1 || maximumTurnaroundDays < minimumTurnaroundDays || maximumTurnaroundDays > 365)
            throw new ArgumentException("Turnaround must be between one and 365 days, with minimum no greater than maximum.");
        FamilyId = familyId; OfferingVersion = offeringVersion;
        Name = OrderText.Required(name, "Offering name", 255);
        Description = OrderText.Required(description, "Offering description", 4000);
        CatalogItemId = catalogItemId; AnalysisIdsJson = JsonSerializer.Serialize(analysisIds);
        AllowedMaterialTypesJson = JsonSerializer.Serialize(ValidateNames(allowedMaterialTypes, "allowed material types"));
        AllowedBiologicalSourcesJson = JsonSerializer.Serialize(ValidateNames(allowedBiologicalSources, "allowed biological sources"));
        IncludedOutputContract = OrderText.Required(includedOutputContract, "Included outputs", 8000);
        MinimumTurnaroundDays = minimumTurnaroundDays; MaximumTurnaroundDays = maximumTurnaroundDays;
        IsSynthetic = isSynthetic;
        SetAvailability(effectiveFrom, effectiveTo, isActive);
    }

    public void SetAvailability(DateTime effectiveFrom, DateTime? effectiveTo, bool isActive)
    {
        if (effectiveFrom.Kind != DateTimeKind.Utc || effectiveFrom == default
            || effectiveTo.HasValue && (effectiveTo.Value.Kind != DateTimeKind.Utc || effectiveTo <= effectiveFrom))
            throw new ArgumentException("Use a UTC effective window whose end is after its start.");
        EffectiveFrom = effectiveFrom; EffectiveTo = effectiveTo; IsActive = isActive;
    }

    public bool IsEffectiveAt(DateTime utcNow) => IsActive && !IsSynthetic
        && EffectiveFrom <= utcNow && (!EffectiveTo.HasValue || EffectiveTo > utcNow);
    public IReadOnlyList<Guid> AnalysisIds() => JsonSerializer.Deserialize<List<Guid>>(AnalysisIdsJson)!;
    public void AssignSampleTypes(IReadOnlyList<Guid> ids)
    {
        if (SupportedSampleTypes.Count != 0) throw new InvalidOperationException("Create a new scientific version to change supported sample types.");
        if (ids.Count is < 1 or > 100 || ids.Any(id => id == Guid.Empty) || ids.Distinct().Count() != ids.Count)
            throw new ArgumentException("Select between one and 100 distinct sample-type revisions.");
        foreach (var id in ids) SupportedSampleTypes.Add(new(Id, id));
    }
    public IReadOnlyList<string> AllowedMaterialTypes() => JsonSerializer.Deserialize<List<string>>(AllowedMaterialTypesJson)!;
    public IReadOnlyList<string> AllowedBiologicalSources() => JsonSerializer.Deserialize<List<string>>(AllowedBiologicalSourcesJson)!;
    public bool Supports(string materialType, IEnumerable<string> sources) =>
        AllowedMaterialTypes().Contains(materialType.Trim(), StringComparer.OrdinalIgnoreCase)
        && sources.All(source => AllowedBiologicalSources().Contains(source.Trim(), StringComparer.OrdinalIgnoreCase));

    private static IReadOnlyList<string> ValidateNames(IReadOnlyList<string> values, string label)
    {
        if (values is null || values.Count is < 1 or > 100) throw new ArgumentException($"Select between one and 100 {label}.");
        var names = values.Select(value => OrderText.Required(value, label, 255)).ToList();
        if (names.Distinct(StringComparer.OrdinalIgnoreCase).Count() != names.Count)
            throw new ArgumentException($"Each entry in {label} must be distinct.");
        return names;
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public enum LabServiceEntryMode { ManualQuote, ConfiguredDirect, SalesAssisted }

public sealed record ConfiguredLabServiceSnapshot(
    Guid OfferingId, Guid FamilyId, int OfferingVersion, long OfferingRecordVersion, string ProductName,
    Guid CatalogItemId, string CatalogCode, long CatalogItemVersion, string Currency, decimal UnitPrice,
    int SpecimenCount, decimal Subtotal, decimal Tax, decimal Total, IReadOnlyList<Guid> AnalysisIds,
    string AnalysesSnapshotJson, string IncludedOutputContract, int MinimumTurnaroundDays,
    int MaximumTurnaroundDays, DateTime CommittedAtUtc,
    IReadOnlyList<Guid>? SupportedSampleTypeIds = null, int? SequencingRunCount = null);

public sealed class LabServiceSampleType
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabServiceOfferingId { get; private set; }
    public Guid SampleTypeDefinitionId { get; private set; }
    private LabServiceSampleType() { }
    public LabServiceSampleType(Guid offeringId, Guid sampleTypeId)
    {
        if (offeringId == Guid.Empty || sampleTypeId == Guid.Empty) throw new ArgumentException("Service and sample-type revisions are required.");
        LabServiceOfferingId = offeringId;
        SampleTypeDefinitionId = sampleTypeId;
    }
}
