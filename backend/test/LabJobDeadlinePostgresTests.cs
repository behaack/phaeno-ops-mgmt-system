namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task JobsQueuePagesBeyond250AndCountsAllMatchingOpenJobs()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext;
        await using (var transaction = await db.Database.BeginTransactionAsync())
        {
            for (var i = 0; i < 276; i++)
            {
                var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder,
                    Guid.NewGuid(), scope.CustomerOrganization.Id, "reference-service", 1, "reference-turnaround", $"TEST deadline-{scope.Suffix}-{i}");
                work.AdjustDeliveryDueDate(DateTime.UtcNow.AddDays(-10));
                var specimen = new LabSpecimen(work.Id, Guid.NewGuid());
                specimen.RecordReceipt(DateTime.UtcNow, "TEST receipt", null);
                work.Specimens.Add(specimen);
                db.LabWorkOrders.Add(work);
            }
            await db.SaveChangesAsync();
            var queue = await scope.CreateLabController().Jobs(CancellationToken.None, $"deadline-{scope.Suffix}", "Overdue", page: 12);
            Assert.Equal(276, queue.TotalCount);
            Assert.Equal(276, queue.Counts["Overdue"]);
            Assert.Single(queue.Items);
            Assert.Equal(12, queue.Page);
            await transaction.RollbackAsync();
        }
        scope.ClearTrackedState();
    }

    [PostgreSqlReferenceFact]
    public async Task JobsQueueRequiresDispatchOrReceiptButKeepsUnsentJobDetailsAvailable()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync();
        var db = scope.DbContext;
        await using (var transaction = await db.Database.BeginTransactionAsync())
        {
            var shipment = await db.SampleShipments.SingleAsync(s => s.Id == fixture.Shipment.Id);
            var query = new LabJobQuery(db);
            foreach (var status in Enum.GetValues<SampleShipmentStatus>())
            {
                // Isolate queue eligibility from packet/dispatch workflow setup.
                db.Entry(shipment).Property(s => s.Status).CurrentValue = status;
                await db.SaveChangesAsync();
                var expected = status is SampleShipmentStatus.Shipped or SampleShipmentStatus.Delivered or SampleShipmentStatus.Received;
                Assert.Equal(expected, await query.QueueRows().AnyAsync(j => j.Id == fixture.WorkOrder.Id));
                Assert.True(await query.Rows().AnyAsync(j => j.Id == fixture.WorkOrder.Id));
            }
            var specimen = await db.LabSpecimens.SingleAsync(s => s.Id == fixture.Specimen.Id);
            specimen.RecordReceipt(DateTime.UtcNow, "TEST historical receipt", null);
            await db.SaveChangesAsync();
            Assert.True(await query.QueueRows().AnyAsync(j => j.Id == fixture.WorkOrder.Id));
            await transaction.RollbackAsync();
        }
        scope.ClearTrackedState();
    }

    [PostgreSqlReferenceFact]
    public async Task JobsTabsKeepCancelledWorkClosedAndApplyDueDateBoundaries()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext;
        await using (var transaction = await db.Database.BeginTransactionAsync())
        {
            var start = new DateTime(2026, 9, 18, 7, 0, 0, DateTimeKind.Utc);
            var end = start.AddDays(1);
            var prefix = $"TEST tabs-{scope.Suffix}";
            for (var index = 0; index < 4; index++)
            {
                var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder,
                    Guid.NewGuid(), scope.CustomerOrganization.Id, "reference-service", 1, "reference-turnaround", $"{prefix}-{index}");
                if (index == 3) work.CancelBeforeExecution();
                else
                {
                    work.AdjustDeliveryDueDate(index == 0 ? start : index == 1 ? end.AddTicks(-1) : end);
                    var specimen = new LabSpecimen(work.Id, Guid.NewGuid());
                    specimen.RecordReceipt(start.AddDays(-1), "TEST receipt", null);
                    work.Specimens.Add(specimen);
                }
                db.LabWorkOrders.Add(work);
            }
            await db.SaveChangesAsync();
            var controller = scope.CreateLabController();
            var active = await controller.Jobs(CancellationToken.None, prefix, view: "Active", fromUtc: start, toExclusiveUtc: end);
            Assert.Equal(2, active.TotalCount);
            Assert.All(active.Items, item => Assert.Equal("AwaitingAcceptance", item.JobStatus));
            Assert.Equal(2, active.Counts.Values.Sum());
            var closed = await controller.Jobs(CancellationToken.None, prefix, view: "Closed", outcome: "Cancelled");
            Assert.Single(closed.Items);
            Assert.Equal("Cancelled", closed.Items[0].JobStatus);
            Assert.Empty(closed.Counts);
            Assert.Empty((await controller.Jobs(CancellationToken.None, prefix, view: "Closed", outcome: "Delivered")).Items);
            var created = closed.Items[0].Job.OrderCreatedAtUtc;
            Assert.Single((await controller.Jobs(CancellationToken.None, prefix, view: "Closed", fromUtc: created, toExclusiveUtc: created.AddSeconds(1))).Items);
            Assert.Empty((await controller.Jobs(CancellationToken.None, prefix, view: "Closed", toExclusiveUtc: created)).Items);
            await transaction.RollbackAsync();
        }
        scope.ClearTrackedState();
    }

    [PostgreSqlReferenceFact]
    public async Task JobDeliveryCountsDistinctSamplesAndKeepsItsFirstCompletionDeadline()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext;
        await using (var transaction = await db.Database.BeginTransactionAsync())
        {
            var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder,
                Guid.NewGuid(), scope.CustomerOrganization.Id, "reference-service", 1, "reference-turnaround", "TEST deadline delivery");
            var one = new LabSpecimen(work.Id, Guid.NewGuid());
            var two = new LabSpecimen(work.Id, Guid.NewGuid());
            work.Specimens.Add(one); work.Specimens.Add(two);
            var now = DateTime.UtcNow;
            work.AdjustDeliveryDueDate(now.AddDays(1));
            db.LabWorkOrders.Add(work);
            await db.SaveChangesAsync();
            var recorder = new LabJobDeliveryRecorder(db);
            await recorder.RecordAsync(work.Id, [new(one.SubmittedSpecimenId, now), new(one.SubmittedSpecimenId, now)], CancellationToken.None);
            Assert.Null(work.FirstDeliveredAtUtc);
            await recorder.RecordAsync(work.Id, [new(one.SubmittedSpecimenId, now), new(two.SubmittedSpecimenId, now.AddMinutes(1))], CancellationToken.None);
            Assert.Equal(now.AddMinutes(1), work.FirstDeliveredAtUtc);
            Assert.Equal(now.AddDays(1), work.DeliveryDueAtFirstDeliveryUtc);
            await db.SaveChangesAsync();
            await recorder.RecordAsync(work.Id, [], CancellationToken.None);
            Assert.Equal(now.AddMinutes(1), work.FirstDeliveredAtUtc);
            await transaction.RollbackAsync();
        }
        scope.ClearTrackedState();
    }
}
