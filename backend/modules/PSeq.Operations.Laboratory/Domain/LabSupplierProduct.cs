namespace PSeq.Operations.Laboratory.Domain;

public enum LabSupplierProductKind { Tube, ShippingContainer, Other }

public sealed class LabSupplierProduct : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid SupplierId { get; private set; }
    public string ProductNumber { get; private set; } = null!;
    public string NormalizedProductNumber { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public Guid ProductTypeId { get; private set; }
    public Guid? MaterialDefinitionId { get; private set; }
    public bool IsActive { get; private set; } = true;
    public bool CanExpire { get; private set; }
    public string? DefaultQuantityUnit { get; private set; }
    public int? TubeCapacity { get; private set; }
    public decimal? MaximumSampleAmount { get; private set; }
    public string? SampleAmountUnit { get; private set; }

    private LabSupplierProduct() { }
    public LabSupplierProduct(Guid supplierId, string productNumber, string description, Guid productTypeId, bool canExpire = false)
    {
        if (supplierId == Guid.Empty) throw new ArgumentException("Choose a supplier.");
        SupplierId = supplierId;
        Update(productNumber, description, productTypeId, true, canExpire);
    }
    public void Update(string productNumber, string description, Guid productTypeId, bool isActive, bool? canExpire = null)
    {
        if (productTypeId == Guid.Empty) throw new ArgumentException("Choose a product type.");
        ProductNumber = Required(productNumber, nameof(productNumber), 100);
        NormalizedProductNumber = ProductNumber.ToUpperInvariant();
        Description = Required(description, nameof(description), 1000);
        ProductTypeId = productTypeId;
        IsActive = isActive;
        if (canExpire.HasValue) CanExpire = canExpire.Value;
    }

    public void SetDefaultQuantityUnit(string? unit)
    {
        DefaultQuantityUnit = string.IsNullOrWhiteSpace(unit)
            ? null : Required(unit, nameof(unit), 50);
    }

    public void SetTubeCapacity(int? capacity)
    {
        if (capacity is <= 0) throw new ArgumentException("Enter a positive whole-number tube capacity.");
        TubeCapacity = capacity;
    }

    public void SetMaximumSampleAmount(decimal? amount, string? unit)
    {
        if (amount.HasValue != !string.IsNullOrWhiteSpace(unit))
            throw new ArgumentException("Enter both the tube's maximum sample amount and its unit.");
        if (amount is <= 0 || amount is > 999999999999.999999m ||
            amount.HasValue && decimal.Round(amount.Value, 6) != amount.Value)
            throw new ArgumentException("Enter a positive tube maximum with no more than six decimal places.");
        if (unit is not null && unit.Trim() is not ("µL" or "mL"))
            throw new ArgumentException("Choose µL or mL for the tube maximum.");
        MaximumSampleAmount = amount;
        SampleAmountUnit = unit?.Trim();
    }

    public void LinkPreparedReagent(Guid materialDefinitionId)
    {
        if (ProductTypeId != LabProductType.ReagentId || materialDefinitionId == Guid.Empty
            || MaterialDefinitionId.HasValue)
            throw new InvalidOperationException("Only a new Phaeno reagent product can be linked to a reagent identity.");
        MaterialDefinitionId = materialDefinitionId;
    }
}
