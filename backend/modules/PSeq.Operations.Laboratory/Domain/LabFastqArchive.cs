namespace PSeq.Operations.Laboratory.Domain;

/// <summary>Private batch upload staging. The archive is never a substitute for admitted per-library FASTQ files.</summary>
public sealed class LabFastqArchive
{
    private LabFastqArchive() { }
    public LabFastqArchive(Guid id, Guid draft, Guid actor, string name, long bytes, string chunkManifest, DateTime expiry)
    { Id = id; LabVendorResultsDraftId = draft; UserId = actor; FileName = name; SizeBytes = bytes; ChunkManifestSha256 = chunkManifest; ExpiresAtUtc = expiry; }
    public Guid Id { get; private set; }
    public Guid LabVendorResultsDraftId { get; private set; }
    public Guid UserId { get; private set; }
    public string FileName { get; private set; } = "";
    public long SizeBytes { get; private set; }
    public string ChunkManifestSha256 { get; private set; } = "";
    public string ChunksJson { get; private set; } = "[]";
    public string? StorageKey { get; private set; }
    public string? Sha256 { get; private set; }
    public string? ManifestJson { get; private set; }
    public DateTime ExpiresAtUtc { get; private set; }
    public int Version { get; private set; }
    public void RecordChunks(string json) { if (StorageKey != null) throw new InvalidOperationException("This archive is already inspected."); ChunksJson = json; Version++; }
    public void Inspect(string key, string hash, string manifest) { StorageKey = key; Sha256 = hash; ManifestJson = manifest; Version++; }
    public void Expire() { ChunksJson = "[]"; StorageKey = null; Version++; }
}
