namespace PSeq.Operations.Laboratory.Domain;

public sealed record LabInstructionIllustration(Guid AssetId, string AltText, string? Caption = null);
public sealed record LabInstructionSource(string Kind, Guid RecordId, string Revision, string? StepKey = null)
{
    public static void Validate(LabInstructionSource? source)
    {
        if (source is null) return;
        if (source.Kind is not ("library" or "masterMix" or "reagent" or "kit") || source.RecordId == Guid.Empty
            || !int.TryParse(source.Revision, out var revision) || revision <= 0
            || string.IsNullOrWhiteSpace(source.StepKey) || source.StepKey.Length > 100)
            throw new ArgumentException("A copied instruction must identify its exact approved source revision and occurrence.");
    }
}

public sealed class LabConfigurationAsset
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string FileName { get; private set; } = null!;
    public string ContentType { get; private set; } = null!;
    public string StorageKey { get; private set; } = null!;
    public string Sha256 { get; private set; } = null!;
    public long SizeBytes { get; private set; }
    public Guid RecordedByUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    private LabConfigurationAsset() { }
    public LabConfigurationAsset(string name, string contentType, string storageKey, string sha256,
        long size, Guid actorId, DateTime utcNow)
    {
        if (size is <= 0 or > 10_485_760 || actorId == Guid.Empty || utcNow.Kind != DateTimeKind.Utc
            || contentType is not ("image/png" or "image/jpeg" or "image/webp")
            || name.Length is < 1 or > 255 || name.Any(char.IsControl)
            || sha256.Length != 64 || string.IsNullOrWhiteSpace(storageKey))
            throw new ArgumentException("A scanned static illustration and its exact file receipt are required.");
        FileName = name; ContentType = contentType; StorageKey = storageKey; Sha256 = sha256;
        SizeBytes = size; RecordedByUserId = actorId; RecordedAtUtc = utcNow;
    }
    public static void Validate(IReadOnlyList<LabInstructionIllustration>? images)
    {
        if (images is null) return;
        if (images.Count > 12 || images.Any(x => x is null) || images.Select(x => x.AssetId).Distinct().Count() != images.Count
            || images.Any(x => x.AssetId == Guid.Empty || string.IsNullOrWhiteSpace(x.AltText)
                || x.AltText.Length > 500 || x.Caption?.Length > 1000))
            throw new ArgumentException("Use up to 12 distinct illustrations, each with descriptive alternative text (500 characters) and an optional caption (1,000 characters).");
    }
}

/// <summary>Unmodified pre-conversion JSON, retained for provenance and recovery.</summary>
public sealed class LabConfigurationDefinitionArchive
{
    public Guid Id { get; private set; }
    public string SourceTable { get; private set; } = null!;
    public Guid SourceId { get; private set; }
    public string SourceColumn { get; private set; } = null!;
    public string DefinitionJson { get; private set; } = null!;
    public DateTime ArchivedAtUtc { get; private set; }
}
