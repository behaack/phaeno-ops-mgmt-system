namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class SampleShippingContainerType : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Sku { get; private set; } = null!;
    public string NormalizedSku { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<SampleShippingContainerDefinition> Definitions { get; private set; } = [];
    private SampleShippingContainerType() { }
    public SampleShippingContainerType(string sku)
    {
        Sku = OrderText.Required(sku, "SKU", 100);
        NormalizedSku = Sku.ToUpperInvariant();
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class SampleShippingContainerDefinition : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ContainerTypeId { get; private set; }
    public SampleShippingContainerType ContainerType { get; private set; } = null!;
    public int Revision { get; private set; }
    public Guid? SupersedesDefinitionId { get; private set; }
    public string CommonName { get; private set; } = null!;
    public int TubeCapacity { get; private set; }
    public string? SupplierName { get; private set; }
    public string? SupplierProductNumber { get; private set; }
    public string? PackingInstructions { get; private set; }
    public DateTime EffectiveFrom { get; private set; }
    public DateTime? EffectiveTo { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime? DeactivatedAt { get; private set; }
    public int DisplayOrder { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<SampleShippingContainerCompatibility> Compatibilities { get; private set; } = [];
    private SampleShippingContainerDefinition() { }

    public SampleShippingContainerDefinition(Guid containerTypeId, int revision, Guid? supersedesDefinitionId,
        string commonName, int tubeCapacity, string? supplierName, string? supplierProductNumber,
        string? packingInstructions, DateTime effectiveFrom, DateTime? effectiveTo, bool isActive, int displayOrder)
    {
        if (containerTypeId == Guid.Empty || revision < 1) throw new ArgumentException("A container type and revision are required.");
        if (tubeCapacity is < 1 or > 10000) throw new ArgumentException("Usable tube capacity must be between 1 and 10,000.");
        if (effectiveFrom.Kind != DateTimeKind.Utc || (effectiveTo.HasValue && (effectiveTo.Value.Kind != DateTimeKind.Utc || effectiveTo <= effectiveFrom)))
            throw new ArgumentException("Use valid UTC effective dates, with the end after the start.");
        if (displayOrder < 0) throw new ArgumentException("Display order cannot be negative.");
        ContainerTypeId = containerTypeId; Revision = revision; SupersedesDefinitionId = supersedesDefinitionId;
        CommonName = OrderText.Required(commonName, "Common name", 255); TubeCapacity = tubeCapacity;
        SupplierName = OrderText.Optional(supplierName, 255); SupplierProductNumber = OrderText.Optional(supplierProductNumber, 100);
        PackingInstructions = OrderText.Optional(packingInstructions, 8000);
        EffectiveFrom = effectiveFrom; EffectiveTo = effectiveTo; IsActive = isActive; DisplayOrder = displayOrder;
    }

    public void CloseAt(DateTime utcNow)
    {
        if (utcNow.Kind != DateTimeKind.Utc || utcNow <= EffectiveFrom)
            throw new InvalidOperationException("A replacement must become effective after the preceding active revision starts.");
        if (!EffectiveTo.HasValue || EffectiveTo > utcNow) EffectiveTo = utcNow;
    }
    public void Deactivate(DateTime utcNow)
    {
        if (utcNow.Kind != DateTimeKind.Utc) throw new ArgumentException("Use a UTC deactivation time.");
        IsActive = false;
        DeactivatedAt ??= utcNow;
        if (utcNow > EffectiveFrom && (!EffectiveTo.HasValue || EffectiveTo > utcNow)) EffectiveTo = utcNow;
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class SampleShippingContainerCompatibility
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ContainerDefinitionId { get; private set; }
    public Guid SampleTypeDefinitionId { get; private set; }
    public Guid InstructionRuleId { get; private set; }
    private SampleShippingContainerCompatibility() { }
    public SampleShippingContainerCompatibility(Guid containerDefinitionId, Guid sampleTypeDefinitionId, Guid instructionRuleId)
    {
        if (containerDefinitionId == Guid.Empty || sampleTypeDefinitionId == Guid.Empty || instructionRuleId == Guid.Empty)
            throw new ArgumentException("A container, sample type, and handling rule are required.");
        ContainerDefinitionId = containerDefinitionId; SampleTypeDefinitionId = sampleTypeDefinitionId; InstructionRuleId = instructionRuleId;
    }
}
