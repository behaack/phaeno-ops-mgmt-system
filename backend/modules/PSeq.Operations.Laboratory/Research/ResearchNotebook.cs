namespace PSeq.Operations.Laboratory.Research;

using System.Text.Json;
using PSeq.Operations.Laboratory.Domain;

public sealed class ResearchProject : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public string Name { get; private set; } = null!;
    public string? Description { get; private set; }
    private ResearchProject() { }
    public ResearchProject(Guid organizationId, string name, string? description)
    { OrganizationId = organizationId; Update(name, description); }
    public void Update(string name, string? description)
    { Name = Required(name, nameof(name), 255); Description = Optional(description, 10000); }
}

public enum ResearchExperimentStatus { Active, Completed }

public sealed class ResearchExperiment : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid ResearchProjectId { get; private set; }
    public string Title { get; private set; } = null!;
    public DateOnly? ExperimentDate { get; private set; }
    public ResearchExperimentStatus Status { get; private set; }
    public string SearchText { get; private set; } = "";
    public DateTime LastActivityAtUtc { get; private set; } = DateTime.UtcNow;
    private ResearchExperiment() { }
    public ResearchExperiment(Guid organizationId, Guid projectId, string title, DateOnly? experimentDate)
    { OrganizationId = organizationId; ResearchProjectId = projectId; Update(title, experimentDate); }
    public void RequireActive()
    { if (Status != ResearchExperimentStatus.Active) throw new InvalidOperationException("Reopen this experiment before changing its notebook."); }
    public void Update(string title, DateOnly? date)
    { RequireActive(); Title = Required(title, nameof(title), 255); ExperimentDate = date; Touch(SearchText); }
    public void Touch(string searchText) { SearchText = searchText; LastActivityAtUtc = DateTime.UtcNow; }
    public void Transition(ResearchExperimentStatus status)
    {
        if (Status == status) throw new InvalidOperationException("The experiment already has this status.");
        Status = status; Touch(SearchText);
    }
}

public sealed class ResearchEntry : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid ResearchExperimentId { get; private set; }
    public string Title { get; private set; } = null!;
    public DateOnly EntryDate { get; private set; }
    public string ContentJson { get; private set; } = null!;
    private ResearchEntry() { }
    public ResearchEntry(Guid organizationId, Guid experimentId, string title, DateOnly date, ResearchBlock[] blocks)
    { OrganizationId = organizationId; ResearchExperimentId = experimentId; Update(title, date, blocks); }
    public void Update(string title, DateOnly date, ResearchBlock[] blocks)
    { Title = Required(title, nameof(title), 255); EntryDate = date; ContentJson = ResearchContent.Serialize(blocks); }
}

public sealed class ResearchRevision
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public string RecordKind { get; private set; } = null!;
    public Guid RecordId { get; private set; }
    public long Revision { get; private set; }
    public string Action { get; private set; } = null!;
    public string SnapshotJson { get; private set; } = null!;
    public Guid RecordedByUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    private ResearchRevision() { }
    public ResearchRevision(Guid organizationId, string recordKind, Guid recordId, long revision, string action,
        string snapshotJson, Guid actorId)
    {
        OrganizationId = organizationId; RecordKind = recordKind; RecordId = recordId; Revision = revision;
        Action = action; SnapshotJson = snapshotJson; RecordedByUserId = actorId; RecordedAtUtc = DateTime.UtcNow;
    }
}

/// <summary>Immutable receipt. Detaching a file never removes bytes referenced by notebook history.</summary>
public sealed class ResearchAttachment
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid ResearchExperimentId { get; private set; }
    public Guid ResearchEntryId { get; private set; }
    public string FileName { get; private set; } = null!;
    public string ContentType { get; private set; } = null!;
    public string StorageKey { get; private set; } = null!;
    public string Sha256 { get; private set; } = null!;
    public long SizeBytes { get; private set; }
    public Guid RecordedByUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    private ResearchAttachment() { }
    public ResearchAttachment(Guid org, Guid experiment, Guid entry, string name, string contentType,
        string key, string hash, long size, Guid actor)
    {
        OrganizationId = org; ResearchExperimentId = experiment; ResearchEntryId = entry;
        FileName = name; ContentType = contentType; StorageKey = key; Sha256 = hash; SizeBytes = size;
        RecordedByUserId = actor; RecordedAtUtc = DateTime.UtcNow;
    }
}

public sealed record ResearchBlock(Guid Id, string Kind, string Section, string Label, string? Text,
    string[]? Columns, string[][]? Rows, Guid? AttachmentId);

public static class ResearchContent
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public static ResearchBlock[] Initial() => new[] { "Purpose", "Method", "Observations", "Results", "Conclusions" }
        .Select(label => new ResearchBlock(Guid.NewGuid(), "text", label.ToLowerInvariant(), label, "", null, null, null)).ToArray();
    public static ResearchBlock[] Read(string json) => JsonSerializer.Deserialize<ResearchBlock[]>(json, Json) ?? [];
    public static string Serialize(ResearchBlock[] blocks)
    {
        if (blocks is null || blocks.Length > 200 || blocks.Any(b => b is null)
            || blocks.Any(b => b.Id == Guid.Empty) || blocks.Select(b => b.Id).Distinct().Count() != blocks.Length)
            throw new ArgumentException("Use up to 200 uniquely identified notebook blocks.");
        foreach (var b in blocks)
        {
            if (string.IsNullOrWhiteSpace(b.Label) || b.Label.Length > 255
                || b.Section is not ("purpose" or "method" or "observations" or "results" or "conclusions" or "custom"))
                throw new ArgumentException("Every block needs a label and a valid scientific section.");
            if (b.Kind == "text")
            {
                if (b.Text is null || b.Text.Length > 100000 || b.Columns is not null || b.Rows is not null || b.AttachmentId is not null)
                    throw new ArgumentException("Text blocks require text only, up to 100,000 characters.");
            }
            else if (b.Kind == "table")
            {
                if (b.Text is not null || b.AttachmentId is not null || b.Columns is null || b.Rows is null
                    || b.Columns.Length is < 1 or > 30 || b.Rows.Length > 1000
                    || b.Columns.Any(c => c is null || c.Length > 255)
                    || b.Rows.Any(r => r is null || r.Length != b.Columns.Length || r.Any(c => c is null || c.Length > 4000)))
                    throw new ArgumentException("Tables support 1–30 columns, up to 1,000 rows and 4,000 characters per cell.");
            }
            else if (b.Kind != "file" || b.AttachmentId is null || b.AttachmentId == Guid.Empty
                || b.Text is not null || b.Columns is not null || b.Rows is not null)
                throw new ArgumentException("File blocks require an uploaded attachment identity only.");
        }
        var json = JsonSerializer.Serialize(blocks, Json);
        if (System.Text.Encoding.UTF8.GetByteCount(json) > 2 * 1024 * 1024)
            throw new ArgumentException("An entry must not exceed 2 MiB of notebook content.");
        return json;
    }
    public static string SearchText(IEnumerable<ResearchEntry> entries) => string.Join('\n', entries.Select(e =>
        e.Title + "\n" + string.Join('\n', Read(e.ContentJson).Select(b => b.Label + "\n" + b.Text + "\n"
            + string.Join(' ', b.Columns ?? []) + "\n" + string.Join('\n', (b.Rows ?? []).Select(r => string.Join(' ', r)))))));
    public static ResearchBlock[] CopySetup(ResearchBlock[] blocks) => blocks.Where(b => b.Kind != "file").Select(b =>
        b with { Id = Guid.NewGuid(), Text = b.Kind == "text" ? b.Section is "purpose" or "method" ? b.Text : "" : null,
            Rows = b.Kind == "table" ? [] : null }).ToArray();
}
