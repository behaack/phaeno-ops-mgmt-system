namespace PhaenoPortal.App.Features.DataProvisioning.Services;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using PhaenoPortal.App.Features.DataProvisioning.Domain;

public static class DatasetManifestService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static (string ManifestJson, string ContentChecksum) Build(
        CuratedDatasetVersion datasetVersion)
    {
        var manifest = new
        {
            datasetVersion.SourceSampleId,
            datasetVersion.SourceRevision,
            datasetVersion.SourceSnapshotAt,
            datasetVersion.SampleLabel,
            datasetVersion.Description,
            datasetVersion.BiologicalContext,
            datasetVersion.AssayContext,
            datasetVersion.AnalysisSummary,
            datasetVersion.QcStatus,
            datasetVersion.Provenance,
            datasetVersion.OwnershipBasis,
            datasetVersion.OwnershipEvidenceReference,
            datasetVersion.OwnershipConfirmedByUserId,
            datasetVersion.OwnershipConfirmedAt,
            datasetVersion.DeidentificationMethod,
            datasetVersion.DeidentificationNotes,
            datasetVersion.DeidentificationConfirmedByUserId,
            datasetVersion.DeidentificationConfirmedAt,
            files = datasetVersion.Files
                .OrderBy(file => file.FileName, StringComparer.Ordinal)
                .ThenBy(file => file.Id)
                .Select(file => new
                {
                    file.Id,
                    file.FileName,
                    file.FileKind,
                    file.ContentType,
                    file.SizeBytes,
                    file.Sha256
                })
        };

        var manifestJson = JsonSerializer.Serialize(manifest, JsonOptions);
        var checksum = Convert.ToHexString(
                SHA256.HashData(Encoding.UTF8.GetBytes(manifestJson)))
            .ToLowerInvariant();
        return (manifestJson, checksum);
    }
}
