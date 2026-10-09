namespace PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed record LabJobSequencingLibraryDto(
    Guid MemberId, Guid LibraryId, Guid SpecimenId, string LibraryKey,
    string? SequencingTubeBarcode, string? Outcome, string? OutcomeReason);

public sealed record LabJobSequencingBatchDto(
    LabBatchDto Batch, DateTime? SequencingStartedAtUtc, DateTime? SequencingCompletedAtUtc,
    IReadOnlyList<LabJobSequencingLibraryDto> Libraries);
