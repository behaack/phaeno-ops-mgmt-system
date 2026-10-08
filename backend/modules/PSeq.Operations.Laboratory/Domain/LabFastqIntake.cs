namespace PSeq.Operations.Laboratory.Domain;

public sealed class LabVendorResultsDraft
{
    private LabVendorResultsDraft() { }
    public LabVendorResultsDraft(Guid id, Guid sendout, Guid actor, long sendoutVersion, DateTime now, int hours)
    { Id = id; LabNgsSendoutId = sendout; UserId = actor; SendoutVersion = sendoutVersion; CreatedAtUtc = now; ExpiresAtUtc = now.AddHours(hours); }
    public Guid Id { get; private set; }
    public Guid LabNgsSendoutId { get; private set; }
    public Guid UserId { get; private set; }
    public long SendoutVersion { get; private set; }
    public string PayloadJson { get; private set; } = "{}";
    public int Version { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }
    public DateTime ExpiresAtUtc { get; private set; }
    public DateTime? SavedAtUtc { get; private set; }
    public void Update(string json) { if (SavedAtUtc.HasValue) throw new InvalidOperationException("This draft is already saved."); PayloadJson = json; Version++; }
    public void Complete(DateTime now) { SavedAtUtc = now; Version++; }
}

/// <summary>Exact library/sample/run file-set identity. Sealing retains its original result binding.</summary>
public sealed class LabFastqSet
{
    private LabFastqSet() { }
    public LabFastqSet(Guid id, Guid draft, Guid member, Guid work, Guid specimen, Guid library, int run,
        string preparation, string layout, int setVersion, string policyJson, Guid actor, DateTime now)
    {
        Id = id; LabVendorResultsDraftId = draft; LabBatchMemberId = member; LabWorkOrderId = work;
        LabSpecimenId = specimen; LabLibraryId = library; SequencingRunNumber = run;
        LibraryPreparationChoice = preparation; ReadLayout = layout; SetVersion = setVersion;
        PolicyJson = policyJson; RecordedByUserId = actor; CreatedAtUtc = now;
    }
    public Guid Id { get; private set; }
    public Guid LabVendorResultsDraftId { get; private set; }
    public Guid LabBatchMemberId { get; private set; }
    public Guid LabWorkOrderId { get; private set; }
    public Guid LabSpecimenId { get; private set; }
    public Guid LabLibraryId { get; private set; }
    public int SequencingRunNumber { get; private set; }
    public string LibraryPreparationChoice { get; private set; } = "";
    public string ReadLayout { get; private set; } = "";
    public int SetVersion { get; private set; }
    public string PolicyJson { get; private set; } = "{}";
    public Guid RecordedByUserId { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }
    public Guid? LabVendorResultsVersionId { get; private set; }
    public void Seal(Guid result) { if (LabVendorResultsVersionId.HasValue) throw new InvalidOperationException("This file set is immutable."); LabVendorResultsVersionId = result; }
}

public sealed class LabFastqUpload
{
    private LabFastqUpload() { }
    public LabFastqUpload(Guid id, Guid set, string original, string canonical, int group, int read, int part,
        string grouping, long bytes, string chunkManifestSha256, Guid actor, DateTime expiry, Guid? archiveId = null, int? archiveEntryIndex = null)
    { Id = id; LabFastqSetId = set; OriginalFileName = original; FileName = canonical; GroupNumber = group; ReadNumber = read;
        PartNumber = part; GroupDescription = grouping; SizeBytes = bytes; ChunkManifestSha256 = chunkManifestSha256; UserId = actor; ExpiresAtUtc = expiry;
        LabFastqArchiveId = archiveId; ArchiveEntryIndex = archiveEntryIndex; }
    public Guid Id { get; private set; }
    public Guid LabFastqSetId { get; private set; }
    public string OriginalFileName { get; private set; } = "";
    public string FileName { get; private set; } = "";
    public int GroupNumber { get; private set; }
    public int ReadNumber { get; private set; }
    public int PartNumber { get; private set; }
    public string GroupDescription { get; private set; } = "";
    public long SizeBytes { get; private set; }
    public string ChunkManifestSha256 { get; private set; } = "";
    public Guid? LabFastqArchiveId { get; private set; }
    public int? ArchiveEntryIndex { get; private set; }
    public Guid UserId { get; private set; }
    public DateTime ExpiresAtUtc { get; private set; }
    public string ChunksJson { get; private set; } = "[]";
    public Guid? LabScientificFileId { get; private set; }
    public long? ReadCount { get; private set; }
    public string? ReadIdentifiersSha256 { get; private set; }
    public int Version { get; private set; }
    public void RecordChunks(string json) { if (LabScientificFileId.HasValue) throw new InvalidOperationException("The file is verified."); ChunksJson = json; Version++; }
    public void Complete(Guid file, long count, string identifiers) { LabScientificFileId = file; ReadCount = count; ReadIdentifiersSha256 = identifiers; Version++; }
    public void ClearStagingChunks() { ChunksJson = "[]"; Version++; }
}

/// <summary>Immutable review of one assembly's exact output package.</summary>
public sealed class LabAssemblyQc
{
    private LabAssemblyQc() { }
    public LabAssemblyQc(Guid id, Guid job, Guid analysis, Guid package, int number, Guid report, string decision,
        string note, string measurements, string inputCoverage, Guid actor, DateTime now)
    { Id = id; LabAssemblyJobId = job; LabAnalysisRunId = analysis; ResultOutputPackageId = package; ReviewVersion = number;
        LabScientificFileId = report; Decision = decision; Note = note; MeasurementsJson = measurements; InputCoverageJson = inputCoverage; RecordedByUserId = actor; RecordedAtUtc = now; }
    public Guid Id { get; private set; }
    public Guid LabAssemblyJobId { get; private set; }
    public Guid LabAnalysisRunId { get; private set; }
    public Guid ResultOutputPackageId { get; private set; }
    public int ReviewVersion { get; private set; }
    public Guid LabScientificFileId { get; private set; }
    public string Decision { get; private set; } = "";
    public string Note { get; private set; } = "";
    public string MeasurementsJson { get; private set; } = "[]";
    public string InputCoverageJson { get; private set; } = "[]";
    public Guid RecordedByUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
}
