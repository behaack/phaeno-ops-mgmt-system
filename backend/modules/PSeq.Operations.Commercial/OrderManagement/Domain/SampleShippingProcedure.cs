namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class SampleShippingProcedure : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid DefinitionKey { get; private set; }
    public int Revision { get; private set; }
    public Guid? SupersedesProcedureId { get; private set; }
    public string Name { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public string PackingInstructions { get; private set; } = null!;
    public string TemperatureInstructions { get; private set; } = null!;
    public string CarrierInstructions { get; private set; } = null!;
    public string DispatchInstructions { get; private set; } = null!;
    public string RequiredDocuments { get; private set; } = null!;
    public string ExceptionInstructions { get; private set; } = null!;
    public string? InternationalCustomsInstructions { get; private set; }
    public bool IsActive { get; private set; }
    public ShippingRevisionLifecycle Lifecycle { get; private set; } = ShippingRevisionLifecycle.Draft;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    private SampleShippingProcedure() { }

    public SampleShippingProcedure(Guid definitionKey, int revision, Guid? supersedesProcedureId,
        string name, string packingInstructions, string temperatureInstructions, string carrierInstructions,
        string dispatchInstructions, string requiredDocuments, string exceptionInstructions,
        string? internationalCustomsInstructions, bool isActive, string? description = null)
    {
        if (definitionKey == Guid.Empty || revision < 1 || (revision == 1) != !supersedesProcedureId.HasValue)
            throw new ArgumentException("A valid procedure identity and predecessor are required.");
        DefinitionKey = definitionKey; Revision = revision; SupersedesProcedureId = supersedesProcedureId;
        Name = OrderText.Required(name, "Procedure name", 255);
        Description = OrderText.Optional(description, 4000) ?? string.Empty;
        PackingInstructions = OrderText.Optional(packingInstructions, 4000) ?? string.Empty;
        TemperatureInstructions = OrderText.Optional(temperatureInstructions, 4000) ?? string.Empty;
        CarrierInstructions = OrderText.Optional(carrierInstructions, 4000) ?? string.Empty;
        DispatchInstructions = OrderText.Optional(dispatchInstructions, 4000) ?? string.Empty;
        RequiredDocuments = OrderText.Optional(requiredDocuments, 4000) ?? string.Empty;
        ExceptionInstructions = OrderText.Optional(exceptionInstructions, 4000) ?? string.Empty;
        InternationalCustomsInstructions = OrderText.Optional(internationalCustomsInstructions, 4000);
        IsActive = isActive;
        Lifecycle = isActive ? ShippingRevisionLifecycle.Released : ShippingRevisionLifecycle.Draft;
        if (isActive) ValidateRelease();
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
    public void Deactivate()
    {
        if (Lifecycle != ShippingRevisionLifecycle.Released || !IsActive)
            throw new InvalidOperationException("Only a current released shipping procedure can be deactivated.");
        IsActive = false;
        Lifecycle = ShippingRevisionLifecycle.Deactivated;
    }

    public void Activate()
    {
        if (Lifecycle != ShippingRevisionLifecycle.Draft || IsActive)
            throw new InvalidOperationException("Only a Draft shipping procedure can be activated.");
        ValidateRelease();
        IsActive = true;
        Lifecycle = ShippingRevisionLifecycle.Released;
    }

    public void Supersede()
    {
        if (Lifecycle != ShippingRevisionLifecycle.Released || !IsActive)
            throw new InvalidOperationException("Only a released shipping procedure can be superseded.");
        IsActive = false;
        Lifecycle = ShippingRevisionLifecycle.Superseded;
    }

    public void Discard()
    {
        if (Lifecycle != ShippingRevisionLifecycle.Draft)
            throw new InvalidOperationException("Only a Draft shipping procedure can be discarded.");
        Lifecycle = ShippingRevisionLifecycle.Discarded;
    }

    public void EditDraft(string name, string? description, string? packingInstructions,
        string? temperatureInstructions, string? carrierInstructions, string? dispatchInstructions,
        string? requiredDocuments, string? exceptionInstructions, string? internationalCustomsInstructions)
    {
        if (Lifecycle != ShippingRevisionLifecycle.Draft)
            throw new InvalidOperationException("Only a Draft shipping procedure can be edited.");
        Name = OrderText.Required(name, "Procedure name", 255);
        Description = OrderText.Optional(description, 4000) ?? string.Empty;
        PackingInstructions = OrderText.Optional(packingInstructions, 4000) ?? string.Empty;
        TemperatureInstructions = OrderText.Optional(temperatureInstructions, 4000) ?? string.Empty;
        CarrierInstructions = OrderText.Optional(carrierInstructions, 4000) ?? string.Empty;
        DispatchInstructions = OrderText.Optional(dispatchInstructions, 4000) ?? string.Empty;
        RequiredDocuments = OrderText.Optional(requiredDocuments, 4000) ?? string.Empty;
        ExceptionInstructions = OrderText.Optional(exceptionInstructions, 4000) ?? string.Empty;
        InternationalCustomsInstructions = OrderText.Optional(internationalCustomsInstructions, 4000);
    }

    private void ValidateRelease()
    {
        OrderText.Required(Name, "Procedure name", 255);
        OrderText.Required(PackingInstructions, "Common packing steps", 4000);
        OrderText.Required(TemperatureInstructions, "Transit handling", 4000);
        OrderText.Required(CarrierInstructions, "Carrier guidance", 4000);
        OrderText.Required(DispatchInstructions, "Dispatch guidance", 4000);
        OrderText.Required(RequiredDocuments, "Required documents", 4000);
        OrderText.Required(ExceptionInstructions, "Exception instructions", 4000);
    }
}
