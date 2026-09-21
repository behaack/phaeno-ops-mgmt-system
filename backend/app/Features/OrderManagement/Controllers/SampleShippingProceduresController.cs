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
                request.InternationalCustomsInstructions, request.IsActive);
        }
        catch (ArgumentException error) { throw new OrderManagementException("shipping_procedure_invalid", error.Message); }
        db.SampleShippingProcedures.Add(procedure);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException error) when (error.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        { throw new OrderManagementException("shipping_procedure_conflict", "Another revision was saved. Refresh and try again.", 409); }
        Response.StatusCode = 201;
        return Map(procedure);
    }

    internal static SampleShippingProcedureDto Map(SampleShippingProcedure item) => new(item.Id, item.DefinitionKey,
        item.Revision, item.SupersedesProcedureId, item.Name, item.PackingInstructions, item.TemperatureInstructions,
        item.CarrierInstructions, item.DispatchInstructions, item.RequiredDocuments, item.ExceptionInstructions,
        item.InternationalCustomsInstructions, item.IsActive, item.Version);
}
