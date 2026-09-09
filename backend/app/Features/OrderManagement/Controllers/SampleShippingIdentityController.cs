namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record SampleShippingIdentityDto(string Kind, Guid Id, string Reference,
    IReadOnlyList<SampleShipmentWorkflowDto> Shipments);

[ApiController]
[Authorize]
[Route("api/platform/sample-shipping/identities")]
public sealed class SampleShippingIdentityController(PSeqOperationsDbContext db, OrderRequestContext context,
    SampleShippingWorkflowReader reader) : ControllerBase
{
    [HttpGet("scan")]
    public async Task<SampleShippingIdentityDto> Scan([FromQuery] string barcode, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        var value = barcode?.Trim().Trim('*').ToUpperInvariant();
        if (value is null || value.Length != 37 || !Guid.TryParseExact(value[5..], "N", out var id))
            throw new OrderManagementException("shipping_identity_invalid", "Scan an order, shipment or sample barcode from the manifest.");
        var query = db.SampleShipments.AsNoTracking();
        string kind;
        switch (value[..5])
        {
            case "PH-O-": kind = "Order"; query = query.Where(item => item.AuthorizationSourceId == id); break;
            case "PH-S-": kind = "Shipment"; query = query.Where(item => item.Id == id); break;
            case "PH-M-": kind = "Sample"; query = query.Where(item => item.Items.Any(sample => sample.SubmittedSpecimenId == id)); break;
            default: throw new OrderManagementException("shipping_identity_invalid", "This barcode does not identify an order, shipment or sample.");
        }
        var records = await query.Where(item => item.Status != PSeq.Operations.Commercial.OrderManagement.Domain.SampleShipmentStatus.Cancelled)
            .OrderBy(item => item.CreatedAt).Select(item => new { item.Id, item.ShipmentNumber, item.AuthorizationReference }).ToListAsync(ct);
        if (records.Count == 0) throw new OrderManagementException("shipping_identity_not_found", "No current shipment matches this barcode.", 404);
        var reference = kind == "Shipment" ? records[0].ShipmentNumber : records[0].AuthorizationReference;
        if (kind == "Sample") reference = await db.SampleShipmentItems.AsNoTracking().Where(item => item.SubmittedSpecimenId == id)
            .Select(item => item.CustomerSampleId).FirstAsync(ct);
        var shipments = new List<SampleShipmentWorkflowDto>();
        foreach (var record in records) shipments.Add(await reader.ReadAsync(record.Id, null, ct));
        return new(kind, id, reference, shipments);
    }
}
