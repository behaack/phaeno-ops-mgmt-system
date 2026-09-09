namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabServiceOrdersController
{
    private async Task<LabServiceOrder> ReadLockedRosterAsync(Guid orderId, OrderTenantContext tenant, CancellationToken token)
    {
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
