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
            SourceSnapshotAt = NormalizeDatabaseTimestamp(
                datasetVersion.SourceSnapshotAt),
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
            OwnershipConfirmedAt = NormalizeDatabaseTimestamp(
                datasetVersion.OwnershipConfirmedAt),
            datasetVersion.DeidentificationMethod,
            datasetVersion.DeidentificationNotes,
            datasetVersion.DeidentificationConfirmedByUserId,
            DeidentificationConfirmedAt = NormalizeDatabaseTimestamp(
                datasetVersion.DeidentificationConfirmedAt),
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

    public static bool SemanticallyEquals(string leftJson, string rightJson)
    {
        using var left = JsonDocument.Parse(leftJson);
        using var right = JsonDocument.Parse(rightJson);
        return JsonElement.DeepEquals(left.RootElement, right.RootElement);
    }

    private static DateTime NormalizeDatabaseTimestamp(DateTime value)
    {
        const long ticksPerMicrosecond = 10;
        return new DateTime(
            value.Ticks - (value.Ticks % ticksPerMicrosecond),
            value.Kind);
    }
}
