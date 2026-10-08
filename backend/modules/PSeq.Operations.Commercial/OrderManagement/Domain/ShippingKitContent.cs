namespace PSeq.Operations.Commercial.OrderManagement.Domain;

public enum ShippingKitContentKind { ShippingContainer, Tube, Other }

public sealed class ShippingKitContent
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ContainerDefinitionId { get; private set; }
    public Guid SupplierProductId { get; private set; }
    public Guid SupplierId { get; private set; }
    public ShippingKitContentKind Kind { get; private set; }
    public int Quantity { get; private set; }
    public int Position { get; private set; }
    public string ProductTypeName { get; private set; } = null!;
    public string SupplierName { get; private set; } = null!;
    public string ProductNumber { get; private set; } = null!;
    public string ProductDescription { get; private set; } = null!;

    private ShippingKitContent() { }

    public ShippingKitContent(Guid containerDefinitionId, Guid supplierProductId, Guid supplierId,
        ShippingKitContentKind kind, int quantity, string supplierName, string productNumber, string productDescription,
        string productTypeName, int position)
    {
        if (containerDefinitionId == Guid.Empty || supplierProductId == Guid.Empty || supplierId == Guid.Empty)
            throw new ArgumentException("Choose a supplier product for each kit component.");
        if (!Enum.IsDefined(kind) || quantity < 1 || position < 0)
            throw new ArgumentException("Each kit component needs a valid product type, position and positive whole-number quantity.");
        ContainerDefinitionId = containerDefinitionId; SupplierProductId = supplierProductId; SupplierId = supplierId;
        Kind = kind; Quantity = quantity; Position = position;
        ProductTypeName = OrderText.Required(productTypeName, "Product type", 255);
        SupplierName = OrderText.Required(supplierName, "Supplier", 255);
        ProductNumber = OrderText.Required(productNumber, "Product name", 100);
        ProductDescription = OrderText.Required(productDescription, "Product description", 1000);
    }

    public static void ValidateRecipe(IReadOnlyList<ShippingKitContent> contents, bool active)
    {
        if (contents.Select(item => item.SupplierProductId).Distinct().Count() != contents.Count)
            throw new ArgumentException("List each product once and use its quantity for multiple items.");
        if (active && contents.Count == 0)
            throw new ArgumentException("Add at least one supplier product and quantity before activating this revision.");
    }
}
