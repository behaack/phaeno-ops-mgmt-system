namespace PSeq.Operations.Commercial.DataProvisioning.Domain;

public sealed class CuratedDatasetVersionFile
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public Guid CuratedDatasetVersionId { get; private set; }

    public CuratedDatasetVersion CuratedDatasetVersion { get; private set; } = null!;

    public Guid ManagedFileId { get; private set; }

    public ManagedFile ManagedFile { get; private set; } = null!;

    public string FileName { get; private set; } = null!;

    public string FileKind { get; private set; } = null!;

    public string ContentType { get; private set; } = null!;

    public long SizeBytes { get; private set; }

    public string Sha256 { get; private set; } = null!;

    private CuratedDatasetVersionFile()
    {
    }

    public CuratedDatasetVersionFile(Guid curatedDatasetVersionId, ManagedFile file)
    {
        CuratedDatasetVersionId = curatedDatasetVersionId;
        ManagedFileId = file.Id;
        ManagedFile = file;
        FileName = file.FileName;
        FileKind = file.FileKind;
        ContentType = file.ContentType;
        SizeBytes = file.SizeBytes;
        Sha256 = file.Sha256;
    }
}
