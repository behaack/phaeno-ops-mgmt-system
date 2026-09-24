namespace PSeq.Operations.Laboratory.Domain;

public sealed class LabProductType : LabAuditedEntity
{
    public static readonly Guid TubeId = Guid.Parse("90000000-0000-4000-8000-000000000001");
    public static readonly Guid ShippingContainerId = Guid.Parse("90000000-0000-4000-8000-000000000002");
    public static readonly Guid ReagentId = Guid.Parse("90000000-0000-4000-8000-000000000003");
    public static readonly Guid TransportationKitId = Guid.Parse("90000000-0000-4000-8000-000000000004");
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = null!;
    public string NormalizedName { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public LabSupplierProductKind KitUse { get; private set; }
    public bool IsActive { get; private set; } = true;
    private LabProductType() { }
    public LabProductType(string name, string description, LabSupplierProductKind kitUse)
        => Update(name, description, kitUse, true);
    public void Update(string name, string description, LabSupplierProductKind kitUse, bool isActive)
    {
        if (!Enum.IsDefined(kitUse)) throw new ArgumentException("Choose how this type is used in transportation kits.");
        Name = Required(name, nameof(name), 100);
        NormalizedName = Name.ToUpperInvariant();
        Description = Required(description, nameof(description), 1000);
        KitUse = kitUse;
        IsActive = isActive;
    }
}
