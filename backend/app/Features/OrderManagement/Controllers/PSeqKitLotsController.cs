namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController, Authorize, Route("api/platform/order-configuration/kit-lots")]
public sealed class PSeqKitLotsController(PSeqOperationsDbContext db, OrderRequestContext context, OrderIdempotencyService idempotency) : ControllerBase
{
    [HttpGet]
    public async Task<PagedResult<PSeqKitLotDto>> List([FromQuery] Guid? catalogItemId, [FromQuery] string? search,
        [FromQuery] int page = 1, CancellationToken token = default)
    {
        await context.RequirePlatformAdminAsync(HttpContext, token);
        var query = db.PSeqKitLots.AsNoTracking();
        if (catalogItemId.HasValue) query = query.Where(x => x.CatalogItemId == catalogItemId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToUpperInvariant();
            query = query.Where(x => x.NormalizedLotNumber.Contains(term));
        }
        page = Math.Max(page, 1);
        var total = await query.CountAsync(token);
        var skip = (int)Math.Min((long)(page - 1) * 25, int.MaxValue);
        var rows = await Project(query.OrderByDescending(x => x.CreatedAt).ThenBy(x => x.Id).Skip(skip).Take(25)).ToListAsync(token);
        return new(rows, page, 25, total);
    }
    [HttpGet("{id:guid}")]
    public async Task<PSeqKitLotDto> Get(Guid id, CancellationToken token)
    {
        await context.RequirePlatformAdminAsync(HttpContext, token);
        return await Project(db.PSeqKitLots.AsNoTracking().Where(x => x.Id == id)).SingleOrDefaultAsync(token) ?? throw Missing();
    }
    [HttpPost]
    public async Task<PSeqKitLotDto> Create(CreatePSeqKitLotRequest request, CancellationToken token)
    {
        var actor = await context.RequirePlatformAdminAsync(HttpContext, token);
        var normalized = PSeqKitLot.Normalize(request.LotNumber ?? "");
        var scope = $"kit-lot-create:{request.CatalogItemId}:{normalized}";
        var result = await idempotency.ExecuteAsync(actor.Id, scope, idempotency.RequireKey(HttpContext), request, async ct =>
        {
            if (!await db.QboCatalogItems.AnyAsync(x => x.Id == request.CatalogItemId && x.IsActive, ct)
                || !await db.PartnerReagentOfferings.AnyAsync(x => x.QboCatalogItemId == request.CatalogItemId, ct))
                throw new OrderManagementException("kit_product_required", "Choose an active catalog product configured for PSeq kits.");
            if (await db.PSeqKitLots.AnyAsync(x => x.CatalogItemId == request.CatalogItemId && x.NormalizedLotNumber == normalized, ct))
                throw new OrderManagementException("kit_lot_duplicate", "This product already has that lot number.", 409);
            PSeqKitLot lot;
            try { lot = new(request.CatalogItemId, request.LotNumber!, request.ExpirationDate); }
            catch (ArgumentException error) { throw new OrderManagementException("kit_lot_invalid", error.Message); }
            db.PSeqKitLots.Add(lot); await db.SaveChangesAsync(ct);
            return await Project(db.PSeqKitLots.Where(x => x.Id == lot.Id)).SingleAsync(ct);
        }, 201, token, concurrencyScope: scope);
        Response.StatusCode = result.StatusCode; return result.Response;
    }
    [HttpPost("{id:guid}/recall")]
    public async Task<PSeqKitLotDto> Recall(Guid id, PSeqKitRecallRequest request, CancellationToken token)
    {
        var actor = await context.RequirePlatformAdminAsync(HttpContext, token);
        var result = await idempotency.ExecuteAsync(actor.Id, $"kit-lot:{id}:recall", idempotency.RequireKey(HttpContext), request, async ct =>
        {
            var lot = await db.PSeqKitLots.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw Missing();
            if (lot.Version != request.Version) throw new DbUpdateConcurrencyException();
            try { lot.SetRecall(request.IsRecalled, request.Reason, DateTime.UtcNow); }
            catch (Exception error) when (error is ArgumentException or InvalidOperationException)
            { throw new OrderManagementException("kit_recall_invalid", error.Message, 409); }
            await db.SaveChangesAsync(ct);
            return await Project(db.PSeqKitLots.Where(x => x.Id == id)).SingleAsync(ct);
        }, cancellationToken: token, concurrencyScope: $"kit-lot:{id}");
        return result.Response;
    }
    private IQueryable<PSeqKitLotDto> Project(IQueryable<PSeqKitLot> query)
        => from lot in query join product in db.QboCatalogItems on lot.CatalogItemId equals product.Id
           select new PSeqKitLotDto(lot.Id, lot.CatalogItemId, product.Name, lot.LotNumber, lot.ExpirationDate,
               lot.IsRecalled, lot.RecallReason, lot.RecallChangedAt, lot.Version);
    private static OrderManagementException Missing() => new("kit_lot_not_found", "The kit lot was not found.", 404);
}
