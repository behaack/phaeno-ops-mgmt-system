namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class SampleShippingContainerType : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Sku { get; private set; } = null!;
    public string NormalizedSku { get; private set; } = null!;
    public Guid? FinishedKitProductId { get; private set; }
    public Guid? SampleTypeAnchorId { get; private set; }
    public DateTime? SampleTypeLinkedAt { get; private set; }
    public Guid? SampleTypeLinkedByUserId { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<SampleShippingContainerDefinition> Definitions { get; private set; } = [];
    private SampleShippingContainerType() { }
    public SampleShippingContainerType(string sku, Guid? finishedKitProductId = null)
    {
        Sku = OrderText.Required(sku, "SKU", 100);
        NormalizedSku = Sku.ToUpperInvariant();
        if (finishedKitProductId == Guid.Empty) throw new ArgumentException("Choose a valid Transportation kit product.");
        FinishedKitProductId = finishedKitProductId;
    }
    public void LinkSampleType(Guid sampleTypeAnchorId, Guid actorUserId, DateTime utcNow)
    {
        if (sampleTypeAnchorId == Guid.Empty || actorUserId == Guid.Empty || utcNow.Kind != DateTimeKind.Utc)
            throw new ArgumentException("Choose a Sample type and record the actor and UTC time.");
        if (SampleTypeAnchorId.HasValue)
            throw new InvalidOperationException("A Transportation kit's Sample type cannot change after it is linked.");
        SampleTypeAnchorId = sampleTypeAnchorId;
        SampleTypeLinkedAt = utcNow;
        SampleTypeLinkedByUserId = actorUserId;
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
public sealed class SampleShippingContainerDefinition : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ContainerTypeId { get; private set; }
    public Guid? AssemblyWorkflowRevisionId { get; private set; }
    public Guid? SampleTypeAnchorId { get; private set; }
    public SampleShippingContainerType ContainerType { get; private set; } = null!;
    public int Revision { get; private set; }
    public Guid? SupersedesDefinitionId { get; private set; }
    public string CommonName { get; private set; } = null!;
    public int TubeCapacity { get; private set; }
    public string? SupplierName { get; private set; }
    public string? SupplierProductNumber { get; private set; }
    public string? PackingInstructions { get; private set; }
    public decimal? DryIceQuantity { get; private set; }
    public string? DryIceUnit { get; private set; }
    public string? TemperatureControlInstructions { get; private set; }
    public DateTime EffectiveFrom { get; private set; }
    public DateTime? EffectiveTo { get; private set; }
    public bool IsActive { get; private set; }
    public ShippingRevisionLifecycle Lifecycle { get; private set; } = ShippingRevisionLifecycle.Draft;
    public DateTime? DeactivatedAt { get; private set; }
    public int DisplayOrder { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<ShippingKitContent> KitContents { get; private set; } = [];
    private SampleShippingContainerDefinition() { }

    public SampleShippingContainerDefinition(Guid containerTypeId, int revision, Guid? supersedesDefinitionId,
        string commonName, int tubeCapacity, string? supplierName, string? supplierProductNumber,
        string? packingInstructions, DateTime effectiveFrom, DateTime? effectiveTo, bool isActive, int displayOrder,
        Guid? assemblyWorkflowRevisionId = null, decimal? dryIceQuantity = null,
        string? dryIceUnit = null, string? temperatureControlInstructions = null,
        Guid? sampleTypeAnchorId = null)
    {
        if (containerTypeId == Guid.Empty || revision < 1) throw new ArgumentException("A container type and revision are required.");
        if (tubeCapacity < 0 || tubeCapacity > 10000 || isActive && tubeCapacity == 0)
            throw new ArgumentException("Usable tube capacity must be between 1 and 10,000 before activation.");
        if (effectiveFrom.Kind != DateTimeKind.Utc || (effectiveTo.HasValue && (effectiveTo.Value.Kind != DateTimeKind.Utc || effectiveTo <= effectiveFrom)))
            throw new ArgumentException("Use valid UTC effective dates, with the end after the start.");
        if (displayOrder < 0) throw new ArgumentException("Display order cannot be negative.");
        if (dryIceQuantity is <= 0) throw new ArgumentException("Dry-ice quantity must be greater than zero.");
        if (dryIceQuantity.HasValue != !string.IsNullOrWhiteSpace(dryIceUnit))
            throw new ArgumentException("Enter both a dry-ice quantity and unit, or leave both empty.");
        ContainerTypeId = containerTypeId; Revision = revision; SupersedesDefinitionId = supersedesDefinitionId;
        AssemblyWorkflowRevisionId = assemblyWorkflowRevisionId;
        if (sampleTypeAnchorId == Guid.Empty) throw new ArgumentException("Choose a valid Sample type.");
        SampleTypeAnchorId = sampleTypeAnchorId;
        CommonName = OrderText.Required(commonName, "Kit specification name", 255); TubeCapacity = tubeCapacity;
        SupplierName = OrderText.Optional(supplierName, 255); SupplierProductNumber = OrderText.Optional(supplierProductNumber, 100);
        PackingInstructions = OrderText.Optional(packingInstructions, 8000);
        DryIceQuantity = dryIceQuantity;
        DryIceUnit = OrderText.Optional(dryIceUnit, 30);
        TemperatureControlInstructions = OrderText.Optional(temperatureControlInstructions, 2000);
        EffectiveFrom = effectiveFrom; EffectiveTo = effectiveTo; IsActive = isActive; DisplayOrder = displayOrder;
        Lifecycle = isActive ? ShippingRevisionLifecycle.Released : ShippingRevisionLifecycle.Draft;
    }

    public void CloseAt(DateTime utcNow)
    {
        if (utcNow.Kind != DateTimeKind.Utc || utcNow <= EffectiveFrom)
            throw new InvalidOperationException("A replacement must become effective after the preceding active revision starts.");
        if (!EffectiveTo.HasValue || EffectiveTo > utcNow) EffectiveTo = utcNow;
        if (Lifecycle == ShippingRevisionLifecycle.Released)
            Lifecycle = ShippingRevisionLifecycle.Superseded;
    }
    public void Deactivate(DateTime utcNow)
    {
        if (utcNow.Kind != DateTimeKind.Utc) throw new ArgumentException("Use a UTC deactivation time.");
        if (!IsActive || Lifecycle is not (ShippingRevisionLifecycle.Released or ShippingRevisionLifecycle.Superseded))
            throw new InvalidOperationException("Only a released specification can be deactivated.");
        IsActive = false;
        Lifecycle = ShippingRevisionLifecycle.Deactivated;
        DeactivatedAt ??= utcNow;
        if (utcNow > EffectiveFrom && (!EffectiveTo.HasValue || EffectiveTo > utcNow)) EffectiveTo = utcNow;
    }
    public void Activate(DateTime utcNow)
    {
        if (utcNow.Kind != DateTimeKind.Utc) throw new ArgumentException("Use a UTC activation time.");
        if (Lifecycle != ShippingRevisionLifecycle.Draft || DeactivatedAt.HasValue)
            throw new InvalidOperationException("Only a Draft specification can be activated.");
        var effectiveFrom = EffectiveFrom > utcNow ? EffectiveFrom : utcNow;
        if (EffectiveTo.HasValue && EffectiveTo <= effectiveFrom)
            throw new InvalidOperationException("An ended specification cannot be activated. Create a new revision.");
        if (IsActive) throw new InvalidOperationException("This specification is already active.");
        if (TubeCapacity is < 1 or > 10000)
            throw new InvalidOperationException("Enter a usable tube capacity before activation.");
        EffectiveFrom = effectiveFrom;
        IsActive = true;
        Lifecycle = ShippingRevisionLifecycle.Released;
    }

    public void SetDraftSampleType(Guid? sampleTypeAnchorId)
    {
        if (Lifecycle != ShippingRevisionLifecycle.Draft)
            throw new InvalidOperationException("Change the Sample type on a Draft specification.");
        if (sampleTypeAnchorId == Guid.Empty) throw new ArgumentException("Choose a valid Sample type.");
        SampleTypeAnchorId = sampleTypeAnchorId;
    }

    public void Discard()
    {
        if (Lifecycle != ShippingRevisionLifecycle.Draft)
            throw new InvalidOperationException("Only a Draft specification can be discarded.");
        Lifecycle = ShippingRevisionLifecycle.Discarded;
    }

    public void UpdateDraftFrom(SampleShippingContainerDefinition draft)
    {
        if (Lifecycle != ShippingRevisionLifecycle.Draft || draft.Lifecycle != ShippingRevisionLifecycle.Draft
            || draft.ContainerTypeId != ContainerTypeId || draft.Revision != Revision)
            throw new InvalidOperationException("Only the matching Draft specification can be edited.");
        CommonName = draft.CommonName; TubeCapacity = draft.TubeCapacity;
        SupplierName = draft.SupplierName; SupplierProductNumber = draft.SupplierProductNumber;
        PackingInstructions = draft.PackingInstructions; DryIceQuantity = draft.DryIceQuantity;
        DryIceUnit = draft.DryIceUnit; TemperatureControlInstructions = draft.TemperatureControlInstructions;
        EffectiveFrom = draft.EffectiveFrom; EffectiveTo = draft.EffectiveTo;
        DisplayOrder = draft.DisplayOrder; SampleTypeAnchorId = draft.SampleTypeAnchorId;
    }
    public void PinAssemblyWorkflowRevision(Guid? revisionId)
    {
        if (revisionId == Guid.Empty) throw new ArgumentException("Choose an approved kit assembly workflow revision.");
        if (IsActive) throw new InvalidOperationException("An active specification's assembly workflow revision is fixed.");
        AssemblyWorkflowRevisionId = revisionId;
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
