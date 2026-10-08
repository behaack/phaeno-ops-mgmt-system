namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed partial class SampleShippingContainerCatalogService
{
    private async Task<SampleShippingContainerDefinitionDto> CreateContainerSpecificationAsync(
        CreateSampleShippingContainerRequest request, CancellationToken ct)
    {
        SampleShippingContainerType type;
        SampleShippingContainerDefinition definition;
        try
        {
            type = new(request.Sku);
            definition = new(type.Id, 1, null, request.CommonName, request.TubeCapacity,
                Utc(request.EffectiveFrom), Utc(request.EffectiveTo), false, request.DisplayOrder,
                request.DryIceQuantity, request.DryIceUnit, request.TemperatureControlInstructions,
                request.SampleTypeDefinitionId.HasValue ? await SampleTypeAnchorAsync(request.SampleTypeDefinitionId.Value, ct) : null);
            definition.ConfigureAssembly(request.ShippingContainerProductId, request.AssemblyWorkflowId);
        }
        catch (ArgumentException error) { throw Invalid(error.Message); }
        await ValidateAssemblyConfigurationAsync(definition, ct);
        await AddContentsAsync(definition, request.KitContents, ct);
        type.Definitions.Add(definition);
        dbContext.SampleShippingContainerTypes.Add(type);
        await SaveAsync(ct);
        return Map(definition);
    }

    private async Task ValidateAssemblyConfigurationAsync(SampleShippingContainerDefinition definition, CancellationToken ct)
    {
        if (!definition.ShippingContainerProductId.HasValue) return;
        var product = await (from p in dbContext.LabSupplierProducts.AsNoTracking()
            join supplier in dbContext.LabSuppliers.AsNoTracking() on p.SupplierId equals supplier.Id
            join type in dbContext.LabProductTypes.AsNoTracking() on p.ProductTypeId equals type.Id
            where p.Id == definition.ShippingContainerProductId && p.IsActive && supplier.IsActive
                && !supplier.IsInternalProducer && type.IsActive && p.ProductTypeId == LabProductType.ShippingContainerId
            select new { p.DefaultQuantityUnit, p.TubeCapacity }).SingleOrDefaultAsync(ct)
            ?? throw Invalid("Choose an active purchased Shipping Container from an active supplier.");
        if (!string.Equals(product.DefaultQuantityUnit, "each", StringComparison.OrdinalIgnoreCase))
            throw Invalid("The selected Shipping Container inventory unit must be each.");
        if (definition.IsActive && (product.TubeCapacity is null || product.TubeCapacity < definition.TubeCapacity))
            throw Invalid("The selected Shipping Container must hold at least this kit's usable tube count.");
        if (definition.AssemblyWorkflowId.HasValue && !await dbContext.LabKitAssemblyWorkflows
            .AnyAsync(item => item.Id == definition.AssemblyWorkflowId, ct))
            throw Invalid("Choose an existing kit assembly workflow.");
    }
}
