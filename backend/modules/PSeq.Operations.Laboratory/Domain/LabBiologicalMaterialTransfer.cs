namespace PSeq.Operations.Laboratory.Domain;

/// <summary>Immutable physical transfer evidence. Quantity is the actual aliquot, never the exhaustion adjustment.</summary>
public sealed class LabBiologicalMaterialTransfer
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid RequestId { get; private set; }
    public string RequestHash { get; private set; } = null!;
    public Guid LabWorkOrderId { get; private set; }
    public Guid LabSpecimenId { get; private set; }
    public Guid LabSpecimenAttemptId { get; private set; }
    public Guid SourceContainerId { get; private set; }
    public Guid DestinationContainerId { get; private set; }
    public Guid? PreparationMemberId { get; private set; }
    public Guid? SequencingBatchMemberId { get; private set; }
    public decimal Quantity { get; private set; }
    public string QuantityUnit { get; private set; } = null!;
    public decimal? SourceQuantityBefore { get; private set; }
    public decimal? SourceQuantityAfter { get; private set; }
    public string? SourceQuantityBasis { get; private set; }
    public bool ExhaustedOverride { get; private set; }
    public decimal? BalanceAdjustmentQuantity { get; private set; }
    public string? ExhaustionReason { get; private set; }
    public Guid PerformedByUserId { get; private set; }
    public DateTime PerformedAtUtc { get; private set; }
    public Guid RecordedByUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    private LabBiologicalMaterialTransfer() { }

    public static LabBiologicalMaterialTransfer Record(Guid requestId, string requestHash, LabContainer source,
        LabContainer destination, LabSpecimenAttempt attempt, decimal quantity, string unit, bool materialExhausted,
        Guid actorId, DateTime recordedAtUtc, Guid? preparationMemberId = null, Guid? sequencingBatchMemberId = null,
        Guid? performedByUserId = null, DateTime? performedAtUtc = null, string? exhaustionReason = null)
    {
        if (requestId == Guid.Empty || actorId == Guid.Empty || source.Id == destination.Id
            || preparationMemberId.HasValue == sequencingBatchMemberId.HasValue
            || preparationMemberId == Guid.Empty || sequencingBatchMemberId == Guid.Empty)
            throw new ArgumentException("A transfer requires a command, recorder and exactly one preparation or sequencing member.");
        if (source.LabWorkOrderId != attempt.LabWorkOrderId || source.LabSpecimenId != attempt.LabSpecimenId
            || destination.LabWorkOrderId != attempt.LabWorkOrderId || destination.LabSpecimenId != attempt.LabSpecimenId
            || destination.LabSpecimenAttemptId != attempt.Id || destination.ParentContainerId != source.Id
            || preparationMemberId.HasValue && (source.Id != attempt.SourceContainerId || destination.Kind != LabContainerKind.Library)
            || sequencingBatchMemberId.HasValue && (source.LabSpecimenAttemptId != attempt.Id || source.Kind != LabContainerKind.Library || destination.Kind != LabContainerKind.Sequencing))
            throw new ArgumentException("The transfer must retain its selected source, specimen, attempt and destination tube lineage.");
        if (sequencingBatchMemberId.HasValue && (attempt.State != LabSpecimenAttemptState.Succeeded || !attempt.StartedAtUtc.HasValue))
            throw new InvalidOperationException("Only material from a successful preparation attempt can be transferred for sequencing.");
        if (recordedAtUtc.Kind != DateTimeKind.Utc || performedAtUtc.HasValue && (performedAtUtc.Value.Kind != DateTimeKind.Utc || performedAtUtc > recordedAtUtc)
            || performedByUserId == Guid.Empty)
            throw new ArgumentException("Transfer performance must have a valid performer and UTC time no later than recording.");
        unit = LabAuditedEntity.Required(unit, nameof(unit), 50);
        // Validate the destination before changing the source in memory.
        if (destination.Status != LabContainerStatus.Available || destination.Quantity.HasValue &&
            (destination.QuantityBasis != "Transferred" || destination.QuantityUnit != unit || sequencingBatchMemberId.HasValue)
            || destination.Quantity.HasValue && quantity > decimal.MaxValue - destination.Quantity.Value)
            throw new InvalidOperationException("Choose the allocated tube; additional input must use its recorded unit before prepared yield is recorded.");
        var transfer = new LabBiologicalMaterialTransfer
        {
            RequestId = requestId, RequestHash = LabAuditedEntity.Required(requestHash, nameof(requestHash), 64),
            LabWorkOrderId = attempt.LabWorkOrderId, LabSpecimenId = attempt.LabSpecimenId, LabSpecimenAttemptId = attempt.Id,
            SourceContainerId = source.Id, DestinationContainerId = destination.Id, PreparationMemberId = preparationMemberId,
            SequencingBatchMemberId = sequencingBatchMemberId, Quantity = quantity, QuantityUnit = unit,
            SourceQuantityBefore = source.Quantity, SourceQuantityBasis = source.QuantityBasis, ExhaustedOverride = materialExhausted,
            ExhaustionReason = LabAuditedEntity.Optional(exhaustionReason, 2000), PerformedByUserId = performedByUserId ?? actorId,
            PerformedAtUtc = performedAtUtc ?? recordedAtUtc, RecordedByUserId = actorId, RecordedAtUtc = recordedAtUtc
        };
        source.ConsumeBiologicalMaterial(quantity, unit, materialExhausted, transfer.Id, actorId, recordedAtUtc, exhaustionReason);
        destination.ReceiveBiologicalMaterial(quantity, unit, transfer.Id, actorId, recordedAtUtc);
        transfer.SourceQuantityAfter = source.Quantity;
        transfer.BalanceAdjustmentQuantity = materialExhausted && transfer.SourceQuantityBefore.HasValue
            ? transfer.SourceQuantityBefore.Value - quantity : null;
        return transfer;
    }
}
