namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public static class LabCustomerHolds
{
    public static async Task RequireUnblockedAsync(PSeqOperationsDbContext db, IEnumerable<Guid> specimens, CancellationToken ct)
    {
        var ids = specimens.Distinct().Order().ToArray();
        foreach (var id in ids) await SampleShippingPackingData.LockAsync(db, "customer-hold:" + id, ct);
        if (await db.LabCustomerHolds.AsNoTracking().AnyAsync(h => ids.Contains(h.LabSpecimenId) && h.State != "Released", ct))
            throw new OrderManagementException("customer_hold_active", "A customer hold request blocks new work or release for this sample. Phaeno must explicitly approve resumption first.", 409);
    }
    public static async Task<object> ReadAsync(PSeqOperationsDbContext db, Guid work, bool canRequest, bool canDecide, CancellationToken ct)
    {
        var specimens = await (from specimen in db.LabSpecimens.AsNoTracking()
            join sample in db.LabSamples.AsNoTracking() on specimen.SubmittedSpecimenId equals sample.Id
            where specimen.LabWorkOrderId == work
            orderby sample.CustomerSampleId
            select new { specimen.Id, name = sample.CustomerSampleId }).ToListAsync(ct);
        var holds = await db.LabCustomerHolds.AsNoTracking().Where(h => h.LabWorkOrderId == work).OrderByDescending(h => h.RequestedAtUtc).ToListAsync(ct);
        var events = await db.LabWorkEvents.AsNoTracking().Where(e => e.LabWorkOrderId == work && e.EventCode.StartsWith("CustomerHold"))
            .OrderByDescending(e => e.OccurredAtUtc).Select(e => new { e.Id, e.LabSpecimenId, e.OccurredAtUtc, e.DetailsJson }).ToListAsync(ct);
        var history = events.Select(e => { using var details = JsonDocument.Parse(e.DetailsJson);
            return new { e.Id, e.LabSpecimenId, e.OccurredAtUtc, state = details.RootElement.GetProperty("State").GetString(), reason = details.RootElement.GetProperty("reason").GetString() }; }).ToArray();
        return new { workOrderId = work, specimens, holds, history, canRequest, canDecide };
    }
    public static void Event(PSeqOperationsDbContext db, LabCustomerHold hold, Guid actor, string action, string reason)
        => db.LabWorkEvents.Add(new LabWorkEvent(hold.LabWorkOrderId, hold.LabSpecimenId, "CustomerHold" + action, DateTime.UtcNow, actor,
            JsonSerializer.Serialize(new { hold.Id, hold.State, reason, hold.Version })));
}
