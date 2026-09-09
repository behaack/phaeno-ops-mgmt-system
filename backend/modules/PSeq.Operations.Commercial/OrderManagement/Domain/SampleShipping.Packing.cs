namespace PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class SampleShipment
{
    public Guid? ContainerDefinitionId { get; private set; }
    public string? ContainerSnapshotJson { get; private set; }
    public bool IsPackingPool { get; private set; }

    public void SelectContainer(Guid definitionId, string snapshotJson)
    {
        EnsureUnpacked();
        if (definitionId == Guid.Empty) throw new ArgumentException("Choose a container type.");
        ContainerDefinitionId = definitionId;
        ContainerSnapshotJson = OrderText.Json(snapshotJson);
        IsPackingPool = false;
    }

    public void MarkPackingPool()
    {
        EnsureUnpacked();
        ContainerDefinitionId = null;
        ContainerSnapshotJson = null;
        IsPackingPool = true;
    }

    private void EnsureUnpacked()
    {
        if (Status != SampleShipmentStatus.Preparing || ReturnKit is not null
            || PacketRevisions.Any(packet => !packet.IsVoided)
            || Items.Any(item => item.RegisteredSampleTubeId.HasValue
                || item.TubeSlots.Any(slot => slot.RegisteredSampleTubeId.HasValue)))
            throw new InvalidOperationException("Clear tube assignments and resolve the current kit or packet before repacking.");
    }
}

public sealed partial class SampleShipmentItem
{
    public void SetTubeQuantity(int count)
    {
        if (count < 1) throw new ArgumentOutOfRangeException(nameof(count));
        if (QuantityUnit.Equals("tubes", StringComparison.OrdinalIgnoreCase)
            || QuantityUnit.Equals("tube", StringComparison.OrdinalIgnoreCase)) Quantity = count;
    }
}

public sealed partial class SampleShipmentTubeSlot
{
    public void MoveTo(Guid shipmentItemId)
    {
        if (shipmentItemId == Guid.Empty) throw new ArgumentException("Choose a shipment item.");
        if (RegisteredSampleTubeId.HasValue)
            throw new InvalidOperationException("A matched tube must be explicitly cleared before repacking.");
        SampleShipmentItemId = shipmentItemId;
    }
}

public sealed partial class RegisteredSampleTube
{
    public DateTime? ReceivedAt { get; private set; }

    public void RecordReceipt(DateTime receivedAt)
    {
        if (Status is not (RegisteredSampleTubeStatus.Assigned or RegisteredSampleTubeStatus.Accessioned))
            throw new InvalidOperationException("Only a matched physical tube can be received.");
        if (receivedAt.Kind != DateTimeKind.Utc || receivedAt > DateTime.UtcNow.AddMinutes(5)
            || (AssignedAt.HasValue && receivedAt < AssignedAt.Value))
            throw new ArgumentException("Enter a valid receipt time after the tube was assigned.");
        ReceivedAt ??= receivedAt;
    }
}

public static class SampleShippingIdentity
{
    public static string Order(Guid id) => $"PH-O-{id:N}".ToUpperInvariant();
    public static string Shipment(Guid id) => $"PH-S-{id:N}".ToUpperInvariant();
    public static string Sample(Guid id) => $"PH-M-{id:N}".ToUpperInvariant();
}
