namespace PSeq.Operations.Commercial.LabOperations.Application;

public sealed record LabOperationsEventEnvelope<TPayload>(
    Guid EventId,
    Guid CorrelationId,
    Guid AuthorizationId,
    long ProjectionVersion,
    DateTime OccurredAtUtc,
    int ContractVersion,
    TPayload Payload);
