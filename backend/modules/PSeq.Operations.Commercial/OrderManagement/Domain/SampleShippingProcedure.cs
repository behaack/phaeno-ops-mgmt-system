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
        PackingInstructions = OrderText.Required(packingInstructions, "Common packing steps", 4000);
        TemperatureInstructions = OrderText.Required(temperatureInstructions, "Transit handling", 4000);
        CarrierInstructions = OrderText.Required(carrierInstructions, "Carrier guidance", 4000);
        DispatchInstructions = OrderText.Required(dispatchInstructions, "Dispatch guidance", 4000);
        RequiredDocuments = OrderText.Required(requiredDocuments, "Required documents", 4000);
        ExceptionInstructions = OrderText.Required(exceptionInstructions, "Exception instructions", 4000);
        InternationalCustomsInstructions = OrderText.Optional(internationalCustomsInstructions, 4000);
        IsActive = isActive;
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
    public void Deactivate()
    {
        if (!IsActive) throw new InvalidOperationException("The shipping procedure is already inactive.");
        IsActive = false;
    }

    public void Activate()
    {
        if (IsActive) throw new InvalidOperationException("The shipping procedure is already active.");
        IsActive = true;
    }
}
