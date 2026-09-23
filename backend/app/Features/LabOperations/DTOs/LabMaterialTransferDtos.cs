namespace PhaenoPortal.App.Features.LabOperations.DTOs;

using PSeq.Operations.Laboratory.Domain;

public sealed record LabSequencingTubeWorkspaceDto(Guid BatchId, long BatchVersion, string BatchStatus,
    bool HasSendout, IReadOnlyList<LabSequencingTubeMemberDto> Members);
public sealed record LabSequencingTubeMemberDto(Guid Id, Guid LabWorkOrderId, Guid LabLibraryId,
    string LibraryKey, LabContainerDto Source, LabContainerDto? SequencingTube,
    LabMaterialTransferDto? Transfer);
public sealed record LabMaterialTransferDto(Guid Id, Guid SourceContainerId, string SourceBarcode,
    Guid DestinationContainerId, string DestinationBarcode, decimal Quantity, string QuantityUnit,
    decimal? SourceQuantityBefore, decimal? SourceQuantityAfter, string? SourceQuantityBasis,
    bool ExhaustedOverride, decimal? BalanceAdjustmentQuantity, Guid PerformedByUserId,
    DateTime PerformedAtUtc, Guid RecordedByUserId, DateTime RecordedAtUtc);
public sealed record LabSequencingTubeCommand(Guid RequestId, long BatchVersion, string Action,
    string? BarcodeSource = null, string? Barcode = null, string? Location = null,
    decimal? Quantity = null, string? QuantityUnit = null, bool MaterialExhausted = false,
    long? SourceVersion = null, long? DestinationVersion = null,
    string? ConfirmedSourceBarcode = null, string? ConfirmedDestinationBarcode = null,
    LabStepPerformanceInput? Performance = null);
