namespace PSeq.Operations.Commercial.OrderManagement.Application;

public sealed record PSeqResultManifestRegistration(
    Guid OrganizationId,
    Guid LabServiceOrderId,
    Guid LabWorkOrderId,
    Guid LabSampleId,
    int PackageVersion,
    string ManifestJson,
    string ManifestSha256,
    int ExpectedArtifactCount,
    string IdempotencyKey);

public sealed record PSeqResultTransferRegistration(
    string ProviderKey,
    string PipelineSubmissionId,
    IReadOnlyList<string> ObjectStorageUploadTargets);

/// <summary>
/// Service-authenticated pipeline seam. Implementations register manifests and
/// object-storage transfer targets; the API never proxies large deliverables.
/// </summary>
public interface IPSeqResultPipelineAdapter
{
    Task<PSeqResultTransferRegistration> RegisterManifestAsync(
        PSeqResultManifestRegistration registration,
        CancellationToken cancellationToken);
}
