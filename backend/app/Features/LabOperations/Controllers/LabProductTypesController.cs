namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record LabProductTypeDto(Guid Id, string Name, string Description, string KitUse, bool IsActive, long Version, int ProductCount);
public sealed record SaveLabProductTypeRequest(string Name, string Description, string KitUse, bool IsActive = true, long Version = 0);

[ApiController]
[Authorize]
[Route("api/platform/lab-operations/product-types")]
public sealed class LabProductTypesController(PSeqOperationsDbContext db, OrderRequestContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<LabProductTypeDto>> List(CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        return await db.LabProductTypes.AsNoTracking().OrderBy(t => t.Name)
            .Select(t => new LabProductTypeDto(t.Id, t.Name, t.Description, t.KitUse.ToString(), t.IsActive, t.Version,
                db.LabSupplierProducts.Count(p => p.ProductTypeId == t.Id))).ToListAsync(ct);
    }
    [HttpPost]
    public async Task<LabProductTypeDto> Create([FromBody] SaveLabProductTypeRequest request, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        if (Use(request.KitUse) != LabSupplierProductKind.Other)
            throw Invalid("New product types use Other. Tube and Shipping Container are built-in types.");
        LabProductType type;
        try { type = new(request.Name, request.Description, Use(request.KitUse)); type.Update(request.Name, request.Description, Use(request.KitUse), request.IsActive); }
        catch (ArgumentException e) { throw Invalid(e.Message); }
        db.LabProductTypes.Add(type);
        await Save(ct);
        return Map(type, 0);
    }
    [HttpPut("{id:guid}")]
    public async Task<LabProductTypeDto> Update(Guid id, [FromBody] SaveLabProductTypeRequest request, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"product-type:{id}", ct);
        var type = await db.LabProductTypes.SingleOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new OrderManagementException("product_type_not_found", "The product type was not found.", 404);
        if (type.Version != request.Version) throw new OrderManagementException("product_type_changed", "This type changed. Close the editor and refresh before trying again.", 409);
        var requestedName = request.Name ?? string.Empty;
        if (type.Id == LabProductType.SequencingServiceId && (!string.Equals(requestedName.Trim(), "Sequencing service", StringComparison.Ordinal)
            || !request.IsActive || Use(request.KitUse) != LabSupplierProductKind.Other))
            throw new OrderManagementException("sequencing_type_protected", "The Sequencing service type is built in; its name, active status and kit use are fixed.", 409);
        if (type.Id == LabProductType.ReagentId && (!string.Equals(requestedName.Trim(), "Reagent", StringComparison.Ordinal)
            || !request.IsActive || Use(request.KitUse) != LabSupplierProductKind.Other))
            throw new OrderManagementException("reagent_type_protected", "The Reagent product type is fixed for Phaeno-made products.", 409);
        if (type.Id == LabProductType.TubeId && (!string.Equals(requestedName.Trim(), "Tube", StringComparison.Ordinal)
            || !request.IsActive || Use(request.KitUse) != LabSupplierProductKind.Tube))
            throw new OrderManagementException("tube_type_protected", "The Tube product type is built in; its name, active status, and kit use are fixed.", 409);
        if (type.Id == LabProductType.ShippingContainerId && (!string.Equals(requestedName.Trim(), "Shipping Container", StringComparison.Ordinal)
            || !request.IsActive || Use(request.KitUse) != LabSupplierProductKind.ShippingContainer))
            throw new OrderManagementException("shipping_container_type_protected", "The Shipping Container product type is built in; its name, active status, and kit use are fixed.", 409);
        var count = await db.LabSupplierProducts.CountAsync(p => p.ProductTypeId == id, ct);
        if (count > 0 && Use(request.KitUse) != type.KitUse) throw new OrderManagementException("product_type_in_use", "Kit use cannot change while products reference this type. Create a different type instead.", 409);
        if (Use(request.KitUse) != type.KitUse)
            throw Invalid("A product type's kit role is assigned automatically and cannot be changed.");
        try { type.Update(requestedName, request.Description, Use(request.KitUse), request.IsActive); }
        catch (ArgumentException e) { throw Invalid(e.Message); }
        await Save(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Map(type, count);
    }
    private async Task Save(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        { throw new OrderManagementException("product_type_duplicate", "A product type with this name already exists, including inactive types.", 409); }
    }
    private static LabProductTypeDto Map(LabProductType t, int count) => new(t.Id, t.Name, t.Description, t.KitUse.ToString(), t.IsActive, t.Version, count);
    private static LabSupplierProductKind Use(string value) => Enum.TryParse<LabSupplierProductKind>(value, out var result) && Enum.IsDefined(result) ? result : throw Invalid("Choose a valid kit use.");
    private static OrderManagementException Invalid(string message) => new("product_type_invalid", message);
}
