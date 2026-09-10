namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class CommercialLabIntakeProgressService
{
    public static async Task ApplyAsync(PSeqOperationsDbContext db, Guid authorizationId, Guid workOrderId,
        LabIntakeProgress intake, Guid actorUserId, DateTime occurredAt, CancellationToken cancellationToken)
    {
        var authorization = await db.CommercialLabAuthorizations.AsNoTracking()
            .SingleOrDefaultAsync(item => item.AuthorizationId == authorizationId && item.LabWorkOrderId == workOrderId,
                cancellationToken);
        if (authorization is null) return; // Trial work has its own customer projection.
        var order = await db.LabServiceOrders.Include(item => item.Samples).SingleOrDefaultAsync(item =>
            item.Id == authorization.CommercialOrderId && item.OrganizationId == authorization.OrganizationId, cancellationToken);
        if (order is null || order.IsTerminal()) return;
        var before = order.Status;
        if (intake.HasPhysicalReceipt) order.RecordLaboratoryReceipt();
        if (before != order.Status) AddEvent(null, before.ToString(), order.Status.ToString());
        var changed = before != order.Status;
        foreach (var fact in intake.Specimens)
        {
            var sample = order.Samples.SingleOrDefault(item => item.Id == fact.SubmittedSpecimenId);
            if (sample is null) throw new InvalidOperationException("The Lab intake projection contains a specimen outside its authorized order.");
            var sampleBefore = sample.Status;
            if (!sample.ApplyLaboratoryIntake(fact.ReceivedAtUtc, fact.AccessionNumber)) continue;
            changed = true;
            AddEvent(sample.Id, sampleBefore.ToString(), sample.Status.ToString());
        }
        if (changed) db.Entry(order).Property(item => item.Version).IsModified = true;

        void AddEvent(Guid? sampleId, string from, string to) => db.OrderStatusEvents.Add(new OrderStatusEvent(
            order.OrganizationId, OrderWorkflowTypes.LabService, order.Id, sampleId, from, to,
            null, null, actorUserId, occurredAt));
    }
}
