namespace PSeq.Operations.Laboratory.Domain;

/// <summary>A frozen internal investigation snapshot. Result-file expiry does not delete it.</summary>
public sealed class LabInvestigationReport
{
    public Guid Id { get; private set; }
    public Guid LabWorkOrderId { get; private set; }
    public Guid LabSpecimenId { get; private set; }
    public Guid GeneratedByUserId { get; private set; }
    public DateTime GeneratedAtUtc { get; private set; }
    public int FormatVersion { get; private set; } = 1;
    public string BodyJson { get; private set; } = null!;
    public string Sha256 { get; private set; } = null!;

    private LabInvestigationReport() { }
    public bool HasValidChecksum() => string.Equals(Sha256,
        Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(BodyJson))), StringComparison.OrdinalIgnoreCase);

    public LabInvestigationReport(Guid id, Guid workId, Guid specimenId, Guid actorId, DateTime now, string body)
    {
        if (new[] { id, workId, specimenId, actorId }.Contains(Guid.Empty) || now.Kind != DateTimeKind.Utc)
            throw new ArgumentException("Report, job, specimen, author and UTC generation time are required.");
        if (string.IsNullOrWhiteSpace(body) || System.Text.Encoding.UTF8.GetByteCount(body) > 8 * 1024 * 1024)
            throw new ArgumentException("An investigation report must contain at most 8 MB of evidence.");
        using var document = System.Text.Json.JsonDocument.Parse(body);
        Id = id; LabWorkOrderId = workId; LabSpecimenId = specimenId; GeneratedByUserId = actorId;
        GeneratedAtUtc = now; BodyJson = body;
        Sha256 = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(body)));
    }
}
