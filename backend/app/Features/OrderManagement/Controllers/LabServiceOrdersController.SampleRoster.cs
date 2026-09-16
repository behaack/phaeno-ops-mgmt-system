namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabServiceOrdersController
{
    private async Task<List<Guid>> AuthorizedSampleIdsAsync(Guid orderId, CancellationToken token)
    {
        var snapshot = await dbContext.CommercialLabAuthorizations.AsNoTracking().Where(a => a.CommercialOrderId == orderId)
            .Select(a => a.AuthorizationSnapshotJson).SingleOrDefaultAsync(token);
        return snapshot is null ? [] : System.Text.Json.JsonSerializer.Deserialize<PSeq.Operations.Commercial.LabOperations.Application.AuthorizeLabWorkCommand>(snapshot, JsonSerializerOptions)!
            .Specimens.Select(s => s.SubmittedSpecimenId).ToList();
    }

    private async Task RequireUnfinalizedSampleAsync(LabServiceOrder order, Guid sampleId, CancellationToken token)
    {
        if ((await AuthorizedSampleIdsAsync(order.Id, token)).Contains(sampleId))
            throw Conflict("sample_already_authorized", "An authorized sample cannot be edited or removed from the additional sample list.");
    }
    private async Task<LabServiceOrder> ReadLockedRosterAsync(Guid orderId, OrderTenantContext tenant, CancellationToken token)
    {
        await idempotency.AcquireOrderLockAsync($"lab-order:{orderId}", token);
        await idempotency.AcquireOrderLockAsync($"lab-order:{orderId}:sample-roster", token);
        var order = await ReadOrderAsync(orderId, tenant, token);
        await dbContext.Entry(order).ReloadAsync(token);
        if (order.IsDiscarded || order.OrganizationId != tenant.Organization.Id || order.DepartmentId != tenant.Department.Id)
            throw Missing();
        // A reused context may hold samples changed or removed before the lock.
        // Detach that read snapshot, then reload the full persisted roster once.
        foreach (var sample in order.Samples.ToList()) dbContext.Entry(sample).State = EntityState.Detached;
        order.Samples.Clear();
        await dbContext.LabSamples.Where(sample => sample.LabServiceOrderId == order.Id).LoadAsync(token);
        foreach (var quote in order.Quotes) await dbContext.Entry(quote).ReloadAsync(token);
        await dbContext.LabServiceQuotes.Where(q => q.LabServiceOrderId == order.Id).LoadAsync(token);
        foreach (var group in order.SourceGroups) await dbContext.Entry(group).ReloadAsync(token);
        await dbContext.LabServiceSourceGroups.Where(g => g.LabServiceOrderId == order.Id).LoadAsync(token);
        return order;
    }

    private static void EnsureRosterSourceCapacity(LabServiceOrder order, string source, Guid? existingSampleId = null)
    {
        try { order.EnsureSampleSourceCapacity(source, existingSampleId); }
        catch (InvalidOperationException exception)
        {
            throw Conflict("sample_source_count_exceeded", exception.Message);
        }
    }
}
