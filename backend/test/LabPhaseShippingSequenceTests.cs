namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class LabPhaseShippingSequenceTests
{
    private static LabServiceOrder Order()
    {
        var order = new LabServiceOrder(Guid.NewGuid(), Guid.NewGuid(), "SEQUENCE", "Study", null,
            4, false, "PBMC", "Frozen", "No known hazards", "Instructions");
        order.Phases.Clear();
        foreach (var position in new[] { 2, 1 })
        {
            var phase = new LabJobPhase(order.Id, position, $"Phase {position}", 2, 14);
            order.Phases.Add(phase);
            for (var n = 0; n < 2; n++)
            {
                var sample = new LabSample(order.Id, $"S-{position}-{n}", "RNA", "PBMC", 1, "tube",
                    "Frozen", "Research", null, null, null, "[]");
                sample.AssignPhase(phase.Id);
                order.Samples.Add(sample);
            }
        }
        return order;
    }

    private static SampleShipment Shipment(LabServiceOrder order, IEnumerable<LabSample> samples, bool sent)
    {
        var shipment = new SampleShipment("SHIP-TEST", order.OrganizationId, order.DepartmentId,
            SampleShipmentAuthorizationSource.CustomerLabServiceOrder, order.Id, "JOB-TEST", "Study", Guid.NewGuid(), Guid.NewGuid());
        foreach (var sample in samples)
            shipment.Items.Add(new SampleShipmentItem(shipment.Id, sample.Id, Guid.NewGuid(), sample.CustomerSampleId,
                "Synthetic sample", 1, "tube"));
        if (sent)
        {
            shipment.PacketRevisions.Add(new SampleShippingPacketRevision(shipment.Id, 1, "INSERT-TEST",
                SampleShippingBarcode.Create(), "{}", "{}", "{}", DateTime.UtcNow));
            shipment.MarkReadyToShip();
            shipment.RecordShipment("Synthetic carrier", "TEST-TRACKING", DateTime.UtcNow);
        }
        return shipment;
    }

    [Fact]
    public void EveryRequiredShipmentUnlocksNextPhaseWithoutResults()
    {
        var order = Order();
        var first = order.Phases.Single(p => p.Position == 1);
        var second = order.Phases.Single(p => p.Position == 2);
        first.CompletePreparation(DateTime.UtcNow);
        var members = order.Samples.Where(s => s.LabJobPhaseId == first.Id).ToArray();
        var shipments = new List<SampleShipment>();
        Assert.Equal(first.Id, LabPhaseShippingSequence.CurrentPhaseId(order, shipments));
        shipments.Add(Shipment(order, members.Take(1), true));
        Assert.Equal(first.Id, LabPhaseShippingSequence.CurrentPhaseId(order, shipments));
        var pending = Shipment(order, members.Skip(1), false);
        shipments.Add(pending);
        Assert.Equal(first.Id, LabPhaseShippingSequence.CurrentPhaseId(order, shipments));
        shipments.Remove(pending);
        shipments.Add(Shipment(order, members.Skip(1), true));
        Assert.Null(first.FirstDeliveredAtUtc);
        Assert.Equal(second.Id, LabPhaseShippingSequence.CurrentPhaseId(order, shipments));
        second.CompletePreparation(DateTime.UtcNow);
        shipments.Add(Shipment(order, order.Samples.Where(s => s.LabJobPhaseId == second.Id), true));
        Assert.Null(LabPhaseShippingSequence.CurrentPhaseId(order, shipments));
    }

    [Fact]
    public void ResultsDoNotSubstituteForShippingAndCancelledPhasesAreSkipped()
    {
        var order = Order();
        var first = order.Phases.Single(p => p.Position == 1);
        var second = order.Phases.Single(p => p.Position == 2);
        first.RecordDelivery(DateTime.UtcNow);
        Assert.Equal(first.Id, LabPhaseShippingSequence.CurrentPhaseId(order, []));
        var cancelled = Order();
        cancelled.Phases.Single(p => p.Position == 1).Cancel(Guid.NewGuid(), "Unneeded phase", DateTime.UtcNow);
        Assert.Equal(cancelled.Phases.Single(p => p.Position == 2).Id, LabPhaseShippingSequence.CurrentPhaseId(cancelled, []));
    }

    [Fact]
    public void MissingSampleIdentityAndMixedPhaseShipmentDoNotCompleteShipping()
    {
        var order = Order();
        var first = order.Phases.Single(p => p.Position == 1);
        first.CompletePreparation(DateTime.UtcNow);
        var members = order.Samples.Where(s => s.LabJobPhaseId == first.Id).ToArray();
        Assert.Equal(first.Id, LabPhaseShippingSequence.CurrentPhaseId(order, [Shipment(order, order.Samples, true)]));
        var shipment = Shipment(order, members, true);
        order.Samples.Remove(members[0]);
        Assert.Equal(first.Id, LabPhaseShippingSequence.CurrentPhaseId(order, [shipment]));
    }
}
