namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;

[ApiController, Authorize, Route("api/platform/sample-shipping/procedures")]
public sealed class SampleShippingProceduresController(PSeqOperationsDbContext db, OrderRequestContext context) : ControllerBase
{
    [HttpPost]
    public async Task<SampleShippingProcedureDto> Create(SampleShippingProcedureWriteRequest request, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        await using var transaction = request.SupersedesProcedureId.HasValue
            ? await SampleShippingPackingData.BeginAsync(db, $"shipping-procedure:{request.SupersedesProcedureId.Value}", ct)
            : null;
        SampleShippingProcedure? previous = null;
        if (request.SupersedesProcedureId.HasValue)
        {
            previous = await db.SampleShippingProcedures.SingleOrDefaultAsync(x => x.Id == request.SupersedesProcedureId, ct)
                ?? throw new OrderManagementException("shipping_procedure_not_found", "The procedure was not found.", 404);
            if (previous.Version != request.SupersededVersion || await db.SampleShippingProcedures.AnyAsync(x => x.SupersedesProcedureId == previous.Id, ct))
                throw new OrderManagementException("shipping_procedure_conflict", "This procedure has changed. Open its latest revision.", 409);
        }
        SampleShippingProcedure procedure;
        try
        {
            procedure = new(previous?.DefinitionKey ?? Guid.NewGuid(), (previous?.Revision ?? 0) + 1, previous?.Id,
                request.Name, request.PackingInstructions, request.TemperatureInstructions, request.CarrierInstructions,
                request.DispatchInstructions, request.RequiredDocuments, request.ExceptionInstructions,
                request.InternationalCustomsInstructions, request.IsActive, request.Description);
        }
        catch (ArgumentException error) { throw new OrderManagementException("shipping_procedure_invalid", error.Message); }
        if (request.IsActive && previous is not null)
            await RetireActiveRevisionsAsync(previous.DefinitionKey, null, ct);
        db.SampleShippingProcedures.Add(procedure);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException error) when (error.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        { throw new OrderManagementException("shipping_procedure_conflict", "Another revision was saved. Refresh and try again.", 409); }
        if (transaction != null) await transaction.CommitAsync(ct);
        Response.StatusCode = 201;
        return Map(procedure);
    }

    [HttpPost("{id:guid}/deactivate")]
    public Task<SampleShippingProcedureDto> Deactivate(Guid id,
        [FromBody] DeactivateSampleShippingProcedureRequest request, CancellationToken ct)
        => ChangeStatusAsync(id, false, request.Version, ct);

    [HttpPost("{id:guid}/status")]
    public Task<SampleShippingProcedureDto> SetStatus(Guid id,
        [FromBody] SetSampleShippingProcedureStatusRequest request, CancellationToken ct)
        => ChangeStatusAsync(id, request.IsActive, request.Version, ct);

    private async Task<SampleShippingProcedureDto> ChangeStatusAsync(Guid id, bool isActive, long version, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"shipping-procedure:{id}", ct);
        var procedure = await db.SampleShippingProcedures.SingleOrDefaultAsync(item => item.Id == id, ct)
            ?? throw new OrderManagementException("shipping_procedure_not_found", "The procedure was not found.", 404);
        if (procedure.Version != version) throw new DbUpdateConcurrencyException();
        if (procedure.IsActive == isActive)
            throw new OrderManagementException("shipping_procedure_status_unchanged", "This procedure already has that status. Refresh and review its current revision.", 409);
        if (isActive)
        {
            if (await db.SampleShippingProcedures.AsNoTracking().AnyAsync(item =>
                item.DefinitionKey == procedure.DefinitionKey && item.Revision > procedure.Revision, ct))
                throw new OrderManagementException("shipping_procedure_already_superseded", "Activate the latest procedure revision instead.", 409);
            await RetireActiveRevisionsAsync(procedure.DefinitionKey, procedure.Id, ct);
            procedure.Activate();
        }
        else
        {
            if (!await db.SampleShippingProcedures.AsNoTracking().AnyAsync(item =>
                item.DefinitionKey == procedure.DefinitionKey && item.Revision > procedure.Revision, ct))
                await RetireActiveRevisionsAsync(procedure.DefinitionKey, procedure.Id, ct);
            procedure.Deactivate();
        }
        await db.SaveChangesAsync(ct);
        if (transaction != null) await transaction.CommitAsync(ct);
        return Map(procedure);
    }

    private async Task RetireActiveRevisionsAsync(Guid definitionKey, Guid? exceptId, CancellationToken ct)
    {
        var activeIds = await db.SampleShippingProcedures.AsNoTracking()
            .Where(item => item.DefinitionKey == definitionKey && item.IsActive && (!exceptId.HasValue || item.Id != exceptId.Value))
            .Select(item => item.Id).ToArrayAsync(ct);
        foreach (var activeId in activeIds.Order())
            await SampleShippingPackingData.LockAsync(db, $"shipping-procedure:{activeId}", ct);
        var active = await db.SampleShippingProcedures.Where(item => item.DefinitionKey == definitionKey
            && item.IsActive && (!exceptId.HasValue || item.Id != exceptId.Value)).ToListAsync(ct);
        foreach (var earlier in active) earlier.Deactivate();
    }

    internal static SampleShippingProcedureDto Map(SampleShippingProcedure item) => new(item.Id, item.DefinitionKey,
        item.Revision, item.SupersedesProcedureId, item.Name, item.Description, item.PackingInstructions, item.TemperatureInstructions,
        item.CarrierInstructions, item.DispatchInstructions, item.RequiredDocuments, item.ExceptionInstructions,
        item.InternationalCustomsInstructions, item.IsActive, item.Version);
}
