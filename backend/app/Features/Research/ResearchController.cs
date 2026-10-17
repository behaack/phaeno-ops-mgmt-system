namespace PhaenoPortal.App.Features.Research;

using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Research;

[ApiController, Authorize, Route("api/research")]
public sealed partial class ResearchController(PSeqOperationsDbContext db, IExternalIdentityContext identity) : ControllerBase
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private Task<ResearchActor> Actor(CancellationToken ct) => ResearchAccess.RequireAsync(HttpContext, db, identity, ct);
    private static OrderManagementException Missing() => new("research_record_not_found", "This research record is unavailable in the selected organization.", 404);
    private static void Version(long actual, long expected)
    { if (actual != expected) throw new OrderManagementException("research_version_conflict", "This record changed. Your input has been kept; review the latest saved content before saving again.", 409); }
    private static void Apply(Action action)
    {
        try { action(); }
        catch (ArgumentException ex) { throw new OrderManagementException("research_content_invalid", ex.Message, 400); }
        catch (InvalidOperationException ex) { throw new OrderManagementException("research_state_conflict", ex.Message, 409); }
    }
    private async Task<ResearchProject> Project(Guid id, Guid org, CancellationToken ct) =>
        await db.Set<ResearchProject>().SingleOrDefaultAsync(p => p.Id == id && p.OrganizationId == org, ct) ?? throw Missing();
    private async Task<ResearchExperiment> Experiment(Guid id, Guid org, CancellationToken ct) =>
        await db.Set<ResearchExperiment>().SingleOrDefaultAsync(e => e.Id == id && e.OrganizationId == org, ct) ?? throw Missing();
    private async Task<ResearchEntry> Entry(Guid id, Guid experimentId, Guid org, CancellationToken ct) =>
        await db.Set<ResearchEntry>().SingleOrDefaultAsync(e => e.Id == id && e.ResearchExperimentId == experimentId && e.OrganizationId == org, ct) ?? throw Missing();
    private static object ProjectData(ResearchProject p) => new { p.Id, p.Name, p.Description, p.CreatedAt, p.UpdatedAt, p.Version };
    private static object ExperimentData(ResearchExperiment e) => new { e.Id, e.ResearchProjectId, e.Title, e.ExperimentDate,
        status = e.Status.ToString(), e.LastActivityAtUtc, e.CreatedAt, e.UpdatedAt, e.Version };
    private static object EntryData(ResearchEntry e) => new { e.Id, e.ResearchExperimentId, e.Title, e.EntryDate,
        blocks = ResearchContent.Read(e.ContentJson), e.CreatedByUserId, e.CreatedAt, e.UpdatedByUserId, e.UpdatedAt, e.Version };
    private readonly List<Func<ResearchRevision>> pendingRevisions = [];
    private void Record(ResearchActor actor, string kind, Guid id, long version, string action, Func<object> snapshot) =>
        pendingRevisions.Add(() => new(actor.OrganizationId, kind, id, version, action,
            JsonSerializer.Serialize(snapshot(), Json), actor.UserId));
    private async Task Save(CancellationToken ct)
    {
        var revisions = pendingRevisions.ToArray(); pendingRevisions.Clear();
        await using var transaction = revisions.Length > 0 && db.Database.CurrentTransaction is null
            ? await db.Database.BeginTransactionAsync(ct) : null;
        var ambient = transaction is null && revisions.Length > 0 ? db.Database.CurrentTransaction : null;
        var savepoint = "research_" + Guid.NewGuid().ToString("N");
        if (ambient is not null) await ambient.CreateSavepointAsync(savepoint, ct);
        try
        {
            // The central interceptor stamps authors, timestamps and versions here.
            await db.SaveChangesAsync(ct);
            if (revisions.Length > 0)
            {
                db.AddRange(revisions.Select(create => create()));
                await db.SaveChangesAsync(ct);
            }
            if (ambient is not null) await ambient.ReleaseSavepointAsync(savepoint, ct);
            if (transaction is not null) await transaction.CommitAsync(ct);
        }
        catch (Exception ex)
        {
            if (ambient is not null) await ambient.RollbackToSavepointAsync(savepoint, CancellationToken.None);
            if (ex is DbUpdateConcurrencyException || ex is DbUpdateException { InnerException: Npgsql.PostgresException { SqlState: "23505" } postgres }
                && postgres.ConstraintName?.Contains("revisions", StringComparison.OrdinalIgnoreCase) == true)
                throw new OrderManagementException("research_version_conflict", "This record changed. Your input has been kept; review the latest saved content before saving again.", 409);
            throw;
        }
    }
    private async Task<object> Detail(ResearchExperiment experiment, CancellationToken ct)
    {
        var project = await Project(experiment.ResearchProjectId, experiment.OrganizationId, ct);
        var entryCount = await db.Set<ResearchEntry>().CountAsync(e => e.ResearchExperimentId == experiment.Id && e.OrganizationId == experiment.OrganizationId, ct);
        return new { experiment = ExperimentData(experiment), project = ProjectData(project), entryCount };
    }

    private async Task<object> EntryDetail(ResearchExperiment experiment, ResearchEntry entry, CancellationToken ct)
    {
        var authors = await db.Users.AsNoTracking().Where(u => u.Id == entry.CreatedByUserId || u.Id == entry.UpdatedByUserId)
            .Select(u => new { u.Id, name = u.FirstName + " " + u.LastName }).ToListAsync(ct);
        return new { experiment = ExperimentData(experiment), entry = EntryData(entry), authors };
    }

    private static DateOnly InitialEntryDate(ExperimentRequest request) => request.ExperimentDate ?? request.InitialEntryDate
        ?? throw new OrderManagementException("research_entry_date_required", "Provide the local date for the first notebook entry.", 400);

    [HttpGet("projects")]
    public async Task<object> Projects([FromQuery] string? search, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var actor = await Actor(ct); page = Math.Clamp(page, 1, 1000000);
        var query = db.Set<ResearchProject>().AsNoTracking().Where(p => p.OrganizationId == actor.OrganizationId);
        if (!string.IsNullOrWhiteSpace(search)) { var pattern = Pattern(search); query = query.Where(p => EF.Functions.ILike(p.Name + " " + (p.Description ?? ""), pattern, "\\")); }
        var count = await query.CountAsync(ct);
        var items = await query.OrderBy(p => p.Name).ThenBy(p => p.Id).Skip((page - 1) * 25).Take(25)
            .Select(p => new { p.Id, p.Name, p.Description, p.UpdatedAt, p.Version,
                experimentCount = db.Set<ResearchExperiment>().Count(e => e.OrganizationId == actor.OrganizationId && e.ResearchProjectId == p.Id) }).ToListAsync(ct);
        return new { items, totalCount = count, page, pageSize = 25 };
    }
    private static string Pattern(string search) => "%" + search.Trim()[..Math.Min(search.Trim().Length, 255)]
        .Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";

    [HttpGet("projects/{id:guid}")]
    public async Task<object> GetProject(Guid id, CancellationToken ct)
    { var actor = await Actor(ct); return ProjectData(await Project(id, actor.OrganizationId, ct)); }

    [HttpGet("projects/choices")]
    public async Task<object> ProjectChoices(CancellationToken ct)
    {
        var actor = await Actor(ct);
        return await db.Set<ResearchProject>().AsNoTracking().Where(p => p.OrganizationId == actor.OrganizationId)
            .OrderBy(p => p.Name).ThenBy(p => p.Id).Select(p => new { p.Id, p.Name }).ToListAsync(ct);
    }

    [HttpPost("projects")]
    public async Task<object> CreateProject(ProjectRequest request, CancellationToken ct)
    {
        var actor = await Actor(ct); ResearchProject p = null!;
        Apply(() => p = new(actor.OrganizationId, request.Name, request.Description));
        db.Add(p); Record(actor, "project", p.Id, 1, "Created", () => ProjectData(p)); await Save(ct); return ProjectData(p);
    }
    [HttpPut("projects/{id:guid}")]
    public async Task<object> UpdateProject(Guid id, ProjectRequest request, CancellationToken ct)
    {
        var actor = await Actor(ct); var p = await Project(id, actor.OrganizationId, ct); Version(p.Version, request.Version);
        Apply(() => p.Update(request.Name, request.Description));
        if (db.Entry(p).State == EntityState.Unchanged) db.Entry(p).Property(x => x.Name).IsModified = true;
        Record(actor, "project", p.Id, p.Version + 1, "Updated", () => ProjectData(p)); await Save(ct); return ProjectData(p);
    }
    [HttpGet("experiments")]
    public async Task<object> Experiments([FromQuery] Guid? projectId, [FromQuery] string? status,
        [FromQuery] string? search, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var actor = await Actor(ct); page = Math.Clamp(page, 1, 1000000);
        var query = db.Set<ResearchExperiment>().AsNoTracking().Where(e => e.OrganizationId == actor.OrganizationId);
        if (projectId.HasValue) query = query.Where(e => e.ResearchProjectId == projectId.Value);
        if (!string.IsNullOrEmpty(status)) {
            if (!Enum.TryParse<ResearchExperimentStatus>(status, out var parsed) || !Enum.IsDefined(parsed))
                throw new OrderManagementException("research_status_invalid", "Choose Active or Completed.", 400);
            query = query.Where(e => e.Status == parsed);
        }
        if (!string.IsNullOrWhiteSpace(search)) { var pattern = Pattern(search); query = query.Where(e => EF.Functions.ILike(e.Title + " " + e.SearchText, pattern, "\\")); }
        var count = await query.CountAsync(ct);
        var items = await query.OrderByDescending(e => e.LastActivityAtUtc).ThenBy(e => e.Id).Skip((page - 1) * 25).Take(25)
            .Join(db.Set<ResearchProject>().Where(p => p.OrganizationId == actor.OrganizationId), e => e.ResearchProjectId, p => p.Id,
                (e, p) => new { e.Id, e.ResearchProjectId, projectName = p.Name, e.Title, e.ExperimentDate, status = e.Status.ToString(), e.LastActivityAtUtc, e.Version }).ToListAsync(ct);
        return new { items, totalCount = count, page, pageSize = 25 };
    }
    [HttpGet("experiments/{id:guid}")]
    public async Task<object> GetExperiment(Guid id, CancellationToken ct)
    { var actor = await Actor(ct); return await Detail(await Experiment(id, actor.OrganizationId, ct), ct); }

    [HttpGet("experiments/{id:guid}/entries")]
    public async Task<object> Entries(Guid id, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var actor = await Actor(ct); await Experiment(id, actor.OrganizationId, ct); page = Math.Clamp(page, 1, 1000000);
        var query = db.Set<ResearchEntry>().AsNoTracking().Where(e => e.OrganizationId == actor.OrganizationId && e.ResearchExperimentId == id);
        var count = await query.CountAsync(ct);
        var items = await query.OrderBy(e => e.EntryDate).ThenBy(e => e.CreatedAt).ThenBy(e => e.Id).Skip((page - 1) * 25).Take(25)
            .Select(e => new { e.Id, e.ResearchExperimentId, e.Title, e.EntryDate, e.Version, e.CreatedAt, e.UpdatedAt,
                createdByName = db.Users.Where(u => u.Id == e.CreatedByUserId).Select(u => u.FirstName + " " + u.LastName).FirstOrDefault(),
                updatedByName = db.Users.Where(u => u.Id == e.UpdatedByUserId).Select(u => u.FirstName + " " + u.LastName).FirstOrDefault() }).ToListAsync(ct);
        return new { items, totalCount = count, page, pageSize = 25 };
    }

    [HttpGet("experiments/{id:guid}/entries/{entryId:guid}")]
    public async Task<object> GetEntry(Guid id, Guid entryId, CancellationToken ct)
    {
        var actor = await Actor(ct); var experiment = await Experiment(id, actor.OrganizationId, ct);
        return await EntryDetail(experiment, await Entry(entryId, id, actor.OrganizationId, ct), ct);
    }

    [HttpPost("experiments")]
    public async Task<object> CreateExperiment(ExperimentRequest request, CancellationToken ct)
    {
        var actor = await Actor(ct); await Project(request.ProjectId, actor.OrganizationId, ct);
        ResearchExperiment e = null!; Apply(() => e = new(actor.OrganizationId, request.ProjectId, request.Title, request.ExperimentDate));
        db.Add(e); var entry = new ResearchEntry(actor.OrganizationId, e.Id, "Experiment notebook", InitialEntryDate(request), ResearchContent.Initial());
        db.Add(entry); e.Touch(ResearchContent.SearchText([entry]));
        Record(actor, "experiment", e.Id, 1, "Created", () => ExperimentData(e)); Record(actor, "entry", entry.Id, 1, "Created", () => EntryData(entry));
        await Save(ct); return await Detail(e, ct);
    }
    [HttpPut("experiments/{id:guid}")]
    public async Task<object> UpdateExperiment(Guid id, ExperimentRequest request, CancellationToken ct)
    {
        var actor = await Actor(ct); var e = await Experiment(id, actor.OrganizationId, ct); Version(e.Version, request.Version);
        Apply(() => e.Update(request.Title, request.ExperimentDate));
        Record(actor, "experiment", e.Id, e.Version + 1, "Updated", () => ExperimentData(e)); await Save(ct); return await Detail(e, ct);
    }
    [HttpPost("experiments/{id:guid}/transition")]
    public async Task<object> Transition(Guid id, TransitionRequest request, CancellationToken ct)
    {
        var actor = await Actor(ct); var e = await Experiment(id, actor.OrganizationId, ct); Version(e.Version, request.Version);
        if (request.Action is not ("complete" or "reopen")) throw new OrderManagementException("research_transition_invalid", "Choose complete or reopen.", 400);
        Apply(() => e.Transition(request.Action == "complete" ? ResearchExperimentStatus.Completed : ResearchExperimentStatus.Active));
        Record(actor, "experiment", e.Id, e.Version + 1, request.Action == "complete" ? "Completed" : "Reopened", () => ExperimentData(e));
        await Save(ct); return await Detail(e, ct);
    }
    [HttpPost("experiments/{id:guid}/copy")]
    public async Task<object> Copy(Guid id, ExperimentRequest request, CancellationToken ct)
    {
        await using var snapshot = db.Database.CurrentTransaction is null
            ? await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead, ct) : null;
        var actor = await Actor(ct); var original = await Experiment(id, actor.OrganizationId, ct); Version(original.Version, request.Version);
        await Project(request.ProjectId, actor.OrganizationId, ct);
        var sourceEntries = await db.Set<ResearchEntry>().AsNoTracking().Where(e => e.OrganizationId == actor.OrganizationId && e.ResearchExperimentId == id)
            .OrderBy(e => e.CreatedAt).ThenBy(e => e.Id).ToListAsync(ct);
        ResearchExperiment copy = null!; Apply(() => copy = new(actor.OrganizationId, request.ProjectId, request.Title, request.ExperimentDate)); db.Add(copy);
        var entries = sourceEntries.Select(source => new ResearchEntry(actor.OrganizationId, copy.Id, source.Title,
            InitialEntryDate(request), ResearchContent.CopySetup(ResearchContent.Read(source.ContentJson)))).ToArray();
        db.AddRange(entries); copy.Touch(ResearchContent.SearchText(entries));
        Record(actor, "experiment", copy.Id, 1, "Setup copied", () => new { experiment = ExperimentData(copy), copiedFromExperimentId = original.Id });
        foreach (var entry in entries) Record(actor, "entry", entry.Id, 1, "Created", () => EntryData(entry));
        // The source version is read-checked; copy never changes its saved notebook.
        await Save(ct); if (snapshot is not null) await snapshot.CommitAsync(ct); return await Detail(copy, ct);
    }
    [HttpPost("experiments/{id:guid}/entries")]
    public async Task<object> AddEntry(Guid id, EntryRequest request, CancellationToken ct)
    {
        var actor = await Actor(ct); var e = await Experiment(id, actor.OrganizationId, ct); Version(e.Version, request.ExperimentVersion); Apply(e.RequireActive);
        ResearchEntry entry = null!; Apply(() => entry = new(actor.OrganizationId, id, request.Title, request.EntryDate, request.Blocks));
        await ValidateAttachments(actor.OrganizationId, id, entry.Id, request.Blocks, ct); db.Add(entry);
        var all = await db.Set<ResearchEntry>().Where(x => x.OrganizationId == actor.OrganizationId && x.ResearchExperimentId == id).ToListAsync(ct);
        e.Touch(ResearchContent.SearchText(all.Append(entry))); Record(actor, "entry", entry.Id, 1, "Created", () => EntryData(entry));
        Record(actor, "experiment", e.Id, e.Version + 1, "Entry added", () => ExperimentData(e)); await Save(ct); return await EntryDetail(e, entry, ct);
    }
    [HttpPut("experiments/{id:guid}/entries/{entryId:guid}")]
    public async Task<object> UpdateEntry(Guid id, Guid entryId, EntryRequest request, CancellationToken ct)
    {
        var actor = await Actor(ct); var e = await Experiment(id, actor.OrganizationId, ct); Version(e.Version, request.ExperimentVersion); Apply(e.RequireActive);
        var entry = await Entry(entryId, id, actor.OrganizationId, ct); Version(entry.Version, request.Version);
        Apply(() => entry.Update(request.Title, request.EntryDate, request.Blocks)); await ValidateAttachments(actor.OrganizationId, id, entryId, request.Blocks, ct);
        var all = await db.Set<ResearchEntry>().Where(x => x.OrganizationId == actor.OrganizationId && x.ResearchExperimentId == id).ToListAsync(ct);
        e.Touch(ResearchContent.SearchText(all));
        // Even an explicit no-content-change save has a unique revision/version.
        db.Entry(entry).Property(x => x.ContentJson).IsModified = true;
        Record(actor, "entry", entry.Id, entry.Version + 1, "Updated", () => EntryData(entry));
        Record(actor, "experiment", e.Id, e.Version + 1, "Entry updated", () => ExperimentData(e)); await Save(ct); return await EntryDetail(e, entry, ct);
    }
    private async Task ValidateAttachments(Guid org, Guid experiment, Guid entry, ResearchBlock[] blocks, CancellationToken ct)
    {
        var ids = blocks.Where(b => b.AttachmentId.HasValue).Select(b => b.AttachmentId!.Value).Distinct().ToArray();
        if (await db.Set<ResearchAttachment>().CountAsync(f => ids.Contains(f.Id) && f.OrganizationId == org
            && f.ResearchExperimentId == experiment && f.ResearchEntryId == entry, ct) != ids.Length)
            throw new OrderManagementException("research_attachment_invalid", "Choose files uploaded for this notebook entry.", 400);
    }
    [HttpGet("history/{kind}/{id:guid}")]
    public async Task<object> History(string kind, Guid id, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var actor = await Actor(ct);
        if (kind == "project") await Project(id, actor.OrganizationId, ct);
        else if (kind == "experiment") await Experiment(id, actor.OrganizationId, ct);
        else if (kind == "entry") { if (!await db.Set<ResearchEntry>().AnyAsync(e => e.Id == id && e.OrganizationId == actor.OrganizationId, ct)) throw Missing(); }
        else throw Missing();
        page = Math.Clamp(page, 1, 1000000);
        var query = db.Set<ResearchRevision>().AsNoTracking().Where(r => r.OrganizationId == actor.OrganizationId && r.RecordKind == kind && r.RecordId == id);
        var count = await query.CountAsync(ct);
        var items = await query.OrderByDescending(r => r.Revision).Skip((page - 1) * 25).Take(25)
            .Select(r => new { r.Id, r.Revision, r.Action, r.RecordedAtUtc, r.RecordedByUserId,
                authorName = db.Users.Where(u => u.Id == r.RecordedByUserId).Select(u => u.FirstName + " " + u.LastName).FirstOrDefault() }).ToListAsync(ct);
        return new { items, totalCount = count, page, pageSize = 25 };
    }

    [HttpGet("history/{kind}/{id:guid}/{revisionId:guid}")]
    public async Task<object> RevisionSnapshot(string kind, Guid id, Guid revisionId, CancellationToken ct)
    {
        var actor = await Actor(ct);
        var revision = await db.Set<ResearchRevision>().AsNoTracking().SingleOrDefaultAsync(r => r.Id == revisionId
            && r.OrganizationId == actor.OrganizationId && r.RecordKind == kind && r.RecordId == id, ct) ?? throw Missing();
        return new { revision.SnapshotJson };
    }
}

public sealed record ProjectRequest(string Name, string? Description, long Version = 0);
public sealed record ExperimentRequest(Guid ProjectId, string Title, DateOnly? ExperimentDate, long Version = 0, DateOnly? InitialEntryDate = null);
public sealed record TransitionRequest(string Action, long Version);
public sealed record EntryRequest(string Title, DateOnly EntryDate, ResearchBlock[] Blocks, long Version, long ExperimentVersion);
