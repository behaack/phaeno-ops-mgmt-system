namespace PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed record LabAccessionedTubeDto(Guid Id, string Barcode, string? Location,
    string? IntakeDisposition, string Status, string UseStatus);

public sealed record LabAccessionedSampleDto(Guid Id, Guid LabWorkOrderId, string CustomerSampleId,
    string? AccessionNumber, string OrganizationName, string JobReference, string IntakeDisposition,
    DateTime? ReceivedAtUtc, string UseStatus, IReadOnlyList<LabAccessionedTubeDto> Tubes, string? ProcessingState = null, string? JobStatus = null,
    bool Historical = false, bool Blocked = false, string? NextAction = null);

public sealed record LabAccessionedSamplePageDto(IReadOnlyList<LabAccessionedSampleDto> Items,
    int Page, int PageSize, int TotalCount);
