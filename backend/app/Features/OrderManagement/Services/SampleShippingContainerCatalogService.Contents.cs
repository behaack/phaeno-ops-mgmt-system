namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed partial class SampleShippingContainerCatalogService
{
    private async Task AddContentsAsync(SampleShippingContainerDefinition definition,
        IReadOnlyList<ShippingKitContentRequest>? requested, CancellationToken ct, bool finishedProduct = false)
    {
        requested ??= [];
        var ids = requested.Select(item => item.SupplierProductId).Distinct().ToArray();
        var products = await (from product in dbContext.LabSupplierProducts.AsNoTracking()
            join supplier in dbContext.LabSuppliers.AsNoTracking() on product.SupplierId equals supplier.Id
            join type in dbContext.LabProductTypes.AsNoTracking() on product.ProductTypeId equals type.Id
            where ids.Contains(product.Id)
            select new { product.Id, product.SupplierId, SupplierName = supplier.Name, supplier.IsInternalProducer,
                product.DefaultQuantityUnit, product.ProductTypeId, product.ProductNumber,
                product.Description, type.KitUse, TypeName = type.Name }).ToDictionaryAsync(item => item.Id, ct);
        if (products.Count != ids.Length)
            throw Invalid("Choose existing catalog products for every kit component.");
        if (finishedProduct && products.Values.Any(item => item.IsInternalProducer
            || item.ProductTypeId == PSeq.Operations.Laboratory.Domain.LabProductType.TransportationKitId))
            throw Invalid("Choose purchased component products, not a finished Transportation kit.");
        try
        {
            var contents = requested.Select((item, position) =>
            {
                var product = products[item.SupplierProductId];
                return new ShippingKitContent(definition.Id, product.Id, product.SupplierId,
                    Enum.Parse<ShippingKitContentKind>(product.KitUse.ToString()), item.Quantity,
                    product.SupplierName, product.ProductNumber, product.Description, product.TypeName, position);
            }).ToArray();
            ShippingKitContent.ValidateRecipe(contents, definition.IsActive && finishedProduct);
            if (finishedProduct && definition.IsActive)
            {
                var tubeLines = contents.Where(item => item.Kind == ShippingKitContentKind.Tube).ToArray();
                var shippers = contents.Where(item => item.Kind == ShippingKitContentKind.ShippingContainer).ToArray();
                if (tubeLines.Length != 1 || tubeLines[0].Quantity != definition.TubeCapacity || shippers.Length != 1 || shippers[0].Quantity != 1)
                    throw new ArgumentException("An active kit product needs exactly one tube product with the approved tube count and one outer shipper product with quantity one.");
            }
            foreach (var item in contents) definition.KitContents.Add(item);
        }
        catch (ArgumentException exception) { throw Invalid(exception.Message); }
    }
}
