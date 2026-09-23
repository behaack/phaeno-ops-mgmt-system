namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed partial class SampleShippingContainerCatalogService
{
    private async Task AddContentsAsync(SampleShippingContainerDefinition definition,
        IReadOnlyList<ShippingKitContentRequest>? requested, CancellationToken ct)
    {
        requested ??= [];
        var ids = requested.Select(item => item.SupplierProductId).Distinct().ToArray();
        var products = await (from product in dbContext.LabSupplierProducts.AsNoTracking()
            join supplier in dbContext.LabSuppliers.AsNoTracking() on product.SupplierId equals supplier.Id
            join type in dbContext.LabProductTypes.AsNoTracking() on product.ProductTypeId equals type.Id
            where ids.Contains(product.Id) && product.IsActive && supplier.IsActive && type.IsActive
            select new { product.Id, product.SupplierId, SupplierName = supplier.Name, product.ProductNumber,
                product.Description, type.KitUse, TypeName = type.Name }).ToDictionaryAsync(item => item.Id, ct);
        if (products.Count != ids.Length)
            throw Invalid("Choose active products from active suppliers and product types for every kit component.");
        try
        {
            var contents = requested.Select((item, position) =>
            {
                var product = products[item.SupplierProductId];
                return new ShippingKitContent(definition.Id, product.Id, product.SupplierId,
                    Enum.Parse<ShippingKitContentKind>(product.KitUse.ToString()), item.Quantity,
                    product.SupplierName, product.ProductNumber, product.Description, product.TypeName, position);
            }).ToArray();
            ShippingKitContent.ValidateRecipe(contents, definition.IsActive);
            foreach (var item in contents) definition.KitContents.Add(item);
        }
        catch (ArgumentException exception) { throw Invalid(exception.Message); }
    }
}
