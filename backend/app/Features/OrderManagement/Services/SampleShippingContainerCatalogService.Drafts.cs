namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed partial class SampleShippingContainerCatalogService
{
    public async Task<SampleShippingContainerDefinitionDto> EditDraftAsync(Guid id,
        EditSampleShippingContainerDraftRequest request, CancellationToken ct)
    {
        var typeId = await dbContext.SampleShippingContainerDefinitions.AsNoTracking()
            .Where(item => item.Id == id).Select(item => (Guid?)item.ContainerTypeId)
            .SingleOrDefaultAsync(ct) ?? throw Missing();
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"shipping-specification:{typeId}", ct);
        var item = await dbContext.SampleShippingContainerDefinitions.Include(value => value.ContainerType)
            .Include(value => value.KitContents).SingleAsync(value => value.Id == id, ct);
        if (item.Version != request.Version)
            throw Conflict("This Draft changed. Refresh it and review your edits before saving.");
        Guid? sampleTypeAnchorId = request.SampleTypeDefinitionId.HasValue
            ? await SampleTypeAnchorAsync(request.SampleTypeDefinitionId.Value, ct) : null;
        SampleShippingContainerDefinition candidate;
        try
        {
            candidate = new(item.ContainerTypeId, item.Revision, item.SupersedesDefinitionId,
                request.CommonName, request.TubeCapacity, request.SupplierName, request.SupplierProductNumber,
                request.PackingInstructions, Utc(request.EffectiveFrom), Utc(request.EffectiveTo), false,
                request.DisplayOrder, item.AssemblyWorkflowRevisionId, request.DryIceQuantity,
                request.DryIceUnit, request.TemperatureControlInstructions, sampleTypeAnchorId);
            item.UpdateDraftFrom(candidate);
        }
        catch (ArgumentException error) { throw Invalid(error.Message); }
        catch (InvalidOperationException error) { throw Conflict(error.Message); }
        var internalProduct = item.ContainerType.FinishedKitProductId is Guid productId
            && await (from product in dbContext.LabSupplierProducts.AsNoTracking()
                join supplier in dbContext.LabSuppliers.AsNoTracking() on product.SupplierId equals supplier.Id
                where product.Id == productId select supplier.IsInternalProducer).SingleAsync(ct);
        if (internalProduct && request.KitContents is not null)
        {
            await dbContext.Set<ShippingKitContent>()
                .Where(content => content.ContainerDefinitionId == item.Id)
                .ExecuteDeleteAsync(ct);
            foreach (var existing in item.KitContents.ToArray())
                dbContext.Entry(existing).State = EntityState.Detached;
            item.KitContents.Clear();
            await AddContentsAsync(item, request.KitContents, ct, finishedProduct: true);
        }
        else if (!internalProduct && request.KitContents is { Count: > 0 })
            throw Invalid("Purchased kit contents are recorded at receipt, not on the specification.");
        var released = await dbContext.SampleShippingContainerDefinitions.AsNoTracking()
            .Where(value => value.ContainerTypeId == typeId && value.Id != id
                && (value.Lifecycle == ShippingRevisionLifecycle.Released
                    || value.Lifecycle == ShippingRevisionLifecycle.Superseded
                    || value.Lifecycle == ShippingRevisionLifecycle.Deactivated))
            .OrderByDescending(value => value.Revision).FirstOrDefaultAsync(ct);
        if (released is not null && item.EffectiveFrom <= released.EffectiveFrom)
            throw Invalid("A Draft must begin after the preceding released specification.");
        item.ContainerType.MarkUpdated(DateTime.UtcNow, null);
        await SaveAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Map(item);
    }

    public async Task<SampleShippingContainerDefinitionDto> DiscardDraftAsync(Guid id, long version, CancellationToken ct)
    {
        var typeId = await dbContext.SampleShippingContainerDefinitions.AsNoTracking()
            .Where(item => item.Id == id).Select(item => (Guid?)item.ContainerTypeId)
            .SingleOrDefaultAsync(ct) ?? throw Missing();
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"shipping-specification:{typeId}", ct);
        var item = await dbContext.SampleShippingContainerDefinitions.Include(value => value.ContainerType)
            .Include(value => value.KitContents).SingleAsync(value => value.Id == id, ct);
        if (item.Version != version) throw Conflict("This Draft changed. Refresh it before discarding.");
        try { item.Discard(); }
        catch (InvalidOperationException error) { throw Conflict(error.Message); }
        item.ContainerType.MarkUpdated(DateTime.UtcNow, null);
        await SaveAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Map(item);
    }
}
