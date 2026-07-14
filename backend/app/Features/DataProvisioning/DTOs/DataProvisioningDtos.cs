namespace PhaenoPortal.App.Features.DataProvisioning.DTOs;

using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.DataProvisioning.Domain;

public sealed record CreateSourceSampleRequest
{
    public required string Label { get; init; }

    public bool IsSynthetic { get; init; }
}

public sealed record UpdateSourceSampleRequest
{
    public required string Label { get; init; }

    public required string Description { get; init; }

    public required string BiologicalContext { get; init; }

    public required string AssayContext { get; init; }

    public required string AnalysisSummary { get; init; }

    public required string QcStatus { get; init; }

    public required string Provenance { get; init; }

    public required string OwnershipBasis { get; init; }

    public string? OwnershipEvidenceReference { get; init; }

    public required string DeidentificationMethod { get; init; }

    public string? DeidentificationNotes { get; init; }

    public required long Version { get; init; }
}

public sealed record VersionedCommandRequest
{
    public required long Version { get; init; }
}

public sealed record DiscardDraftRequest
{
    public required string Reason { get; init; }

    public required long Version { get; init; }
}

public sealed record SourceSampleDto
{
    public required Guid Id { get; init; }

    public required string Label { get; init; }

    public string? Description { get; init; }

    public string? BiologicalContext { get; init; }

    public string? AssayContext { get; init; }

    public string? AnalysisSummary { get; init; }

    public string? QcStatus { get; init; }

    public string? Provenance { get; init; }

    public required bool IsSynthetic { get; init; }

    public required int Revision { get; init; }

    public required SourceSampleStatus Status { get; init; }

    public string? OwnershipBasis { get; init; }

    public string? OwnershipEvidenceReference { get; init; }

    public Guid? OwnershipConfirmedByUserId { get; init; }

    public DateTime? OwnershipConfirmedAt { get; init; }

    public string? DeidentificationMethod { get; init; }

    public string? DeidentificationNotes { get; init; }

    public Guid? DeidentificationConfirmedByUserId { get; init; }

    public DateTime? DeidentificationConfirmedAt { get; init; }

    public DateTime? ReadyAt { get; init; }

    public DateTime? ArchivedAt { get; init; }

    public required IReadOnlyList<ManagedFileDto> Files { get; init; }

    public required DateTime CreatedAt { get; init; }

    public required DateTime UpdatedAt { get; init; }

    public required long Version { get; init; }
}

public sealed record ManagedFileDto
{
    public required Guid Id { get; init; }

    public required string FileName { get; init; }

    public required string FileKind { get; init; }

    public required string ContentType { get; init; }

    public required long SizeBytes { get; init; }

    public required string Sha256 { get; init; }

    public required ManagedFileScanStatus ScanStatus { get; init; }

    public string? ScanMessage { get; init; }
}

public sealed record CreateCuratedDatasetRequest
{
    public required string Name { get; init; }

    public required string Description { get; init; }
}

public sealed record CreateCuratedDatasetVersionRequest
{
    public required Guid SourceSampleId { get; init; }

    public required string ReleaseNotes { get; init; }

    public required long DatasetVersion { get; init; }
}

public sealed record SetDatasetEligibilityRequest
{
    public required Guid DatasetVersionId { get; init; }

    public required bool IsEligible { get; init; }

    public required long Version { get; init; }
}

public sealed record CuratedDatasetDto
{
    public required Guid Id { get; init; }

    public required string Name { get; init; }

    public required string Description { get; init; }

    public required bool IsActive { get; init; }

    public Guid? EligibleVersionId { get; init; }

    public DateTime? EligibilityApprovedAt { get; init; }

    public required IReadOnlyList<CuratedDatasetVersionDto> Versions { get; init; }

    public required DateTime CreatedAt { get; init; }

    public required DateTime UpdatedAt { get; init; }

    public required long Version { get; init; }
}

public sealed record CuratedDatasetVersionDto
{
    public required Guid Id { get; init; }

    public required Guid CuratedDatasetId { get; init; }

    public required int VersionNumber { get; init; }

    public required CuratedDatasetVersionStatus Status { get; init; }

    public required Guid SourceSampleId { get; init; }

    public required int SourceRevision { get; init; }

    public required DateTime SourceSnapshotAt { get; init; }

    public required bool IsSynthetic { get; init; }

    public required string SampleLabel { get; init; }

    public required string Description { get; init; }

    public required string BiologicalContext { get; init; }

    public required string AssayContext { get; init; }

    public required string AnalysisSummary { get; init; }

    public required string QcStatus { get; init; }

    public required string Provenance { get; init; }

    public required string OwnershipBasis { get; init; }

    public string? OwnershipEvidenceReference { get; init; }

    public required DateTime OwnershipConfirmedAt { get; init; }

    public required string DeidentificationMethod { get; init; }

    public string? DeidentificationNotes { get; init; }

    public required DateTime DeidentificationConfirmedAt { get; init; }

    public required string ReleaseNotes { get; init; }

    public required string ContentChecksum { get; init; }

    public DateTime? PublishedAt { get; init; }

    public required IReadOnlyList<ManagedFileDto> Files { get; init; }

    public required long Version { get; init; }
}

public sealed record GrantDatasetRequest
{
    public required Guid DatasetVersionId { get; init; }

    public required string IdempotencyKey { get; init; }
}

public sealed record RevokeDatasetGrantRequest
{
    public required string Reason { get; init; }

    public required long Version { get; init; }
}

public sealed record DatasetGrantDto
{
    public required Guid Id { get; init; }

    public required Guid OrganizationId { get; init; }

    public required string OrganizationName { get; init; }

    public required OrganizationKind OrganizationKind { get; init; }

    public required Guid CuratedDatasetId { get; init; }

    public required string DatasetName { get; init; }

    public required Guid CuratedDatasetVersionId { get; init; }

    public required int DatasetVersionNumber { get; init; }

    public required OrganizationDatasetGrantStatus Status { get; init; }

    public required DateTime GrantedAt { get; init; }

    public DateTime? RevokedAt { get; init; }

    public string? RevocationReason { get; init; }

    public required long Version { get; init; }
}

public sealed record ProvisioningResultDto
{
    public required Guid ProvisioningRunId { get; init; }

    public required ProvisioningRunStatus Status { get; init; }

    public required string IdempotencyKey { get; init; }

    public DatasetGrantDto? Grant { get; init; }

    public string? FailureCode { get; init; }

    public string? FailureMessage { get; init; }
}

public sealed record TenantDatasetDto
{
    public required Guid GrantId { get; init; }

    public required Guid DatasetId { get; init; }

    public required string Name { get; init; }

    public required string Description { get; init; }

    public required Guid DatasetVersionId { get; init; }

    public required int VersionNumber { get; init; }

    public required string SampleLabel { get; init; }

    public required string BiologicalContext { get; init; }

    public required string AssayContext { get; init; }

    public required string AnalysisSummary { get; init; }

    public required string QcStatus { get; init; }

    public required string Provenance { get; init; }

    public required string ContentChecksum { get; init; }

    public required DateTime PublishedAt { get; init; }

    public required IReadOnlyList<ManagedFileDto> Files { get; init; }
}

public sealed record DatasetDownloadAuditDto
{
    public required Guid Id { get; init; }

    public required Guid UserId { get; init; }

    public required string UserEmail { get; init; }

    public required Guid DatasetVersionId { get; init; }

    public required DatasetDownloadKind Kind { get; init; }

    public Guid? ManagedFileId { get; init; }

    public required DateTime DownloadedAt { get; init; }
}
