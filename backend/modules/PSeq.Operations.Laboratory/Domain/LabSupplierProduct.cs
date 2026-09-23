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
    public bool IsActive { get; private set; } = true;
    public bool CanExpire { get; private set; }

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
}
