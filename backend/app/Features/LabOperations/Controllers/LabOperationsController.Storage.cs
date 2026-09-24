namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record LabStorageLocationManagementDto(
    Guid Id, string Name, bool IsActive, long Version, int MaterialLotCount);
public sealed record CreateLabStorageLocationRequest(string Name);
public sealed record UpdateLabStorageLocationRequest(string Name, bool IsActive, long Version);

public sealed partial class LabOperationsController
{
    [HttpGet("storage-locations")]
    public async Task<IReadOnlyList<LabStorageLocationManagementDto>> ListStorageLocations(CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor,
            LabRole.ProtocolAdministrator, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        return await dbContext.LabStorageLocations.AsNoTracking().OrderBy(item => item.Name)
            .Select(item => new LabStorageLocationManagementDto(item.Id, item.Name, item.IsActive,
                item.Version, dbContext.LabMaterialLots.Count(lot => lot.StorageLocationId == item.Id)))
            .ToListAsync(ct);
    }

    [HttpPost("storage-locations")]
    public async Task<LabStorageLocationManagementDto> CreateStorageLocation(
        [FromBody] CreateLabStorageLocationRequest request, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor,
            LabRole.OperationsAdministrator);
        LabStorageLocation location;
        try { location = new LabStorageLocation(request.Name); }
        catch (ArgumentException error) { throw Invalid("storage_location_invalid", error.Message); }
        dbContext.LabStorageLocations.Add(location);
        await SaveStorageLocationAsync(ct);
        return new(location.Id, location.Name, location.IsActive, location.Version, 0);
    }

    [HttpPut("storage-locations/{id:guid}")]
    public async Task<LabStorageLocationManagementDto> UpdateStorageLocation(Guid id,
        [FromBody] UpdateLabStorageLocationRequest request, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Supervisor,
            LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"storage-location:{id}", ct);
        var location = await dbContext.LabStorageLocations.SingleOrDefaultAsync(item => item.Id == id, ct)
            ?? throw Missing();
        EnsureVersion(location.Version, request.Version);
        var count = await dbContext.LabMaterialLots.CountAsync(lot => lot.StorageLocationId == id, ct);
        if (count > 0 && !string.Equals(request.Name?.Trim(), location.Name, StringComparison.Ordinal))
            throw Conflict("storage_location_in_use",
                "A location used by material lots cannot be renamed. Create a new location and deactivate this one instead.");
        try { location.Rename(request.Name ?? string.Empty); }
        catch (ArgumentException error) { throw Invalid("storage_location_invalid", error.Message); }
        location.SetActive(request.IsActive);
        await SaveStorageLocationAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return new(location.Id, location.Name, location.IsActive, location.Version, count);
    }

    private async Task SaveStorageLocationAsync(CancellationToken ct)
    {
        try { await dbContext.SaveChangesAsync(ct); }
        catch (DbUpdateException error) when (error.InnerException is PostgresException
            { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            throw Conflict("storage_location_duplicate",
                "A storage location with this name already exists, including inactive locations.");
        }
    }
}
