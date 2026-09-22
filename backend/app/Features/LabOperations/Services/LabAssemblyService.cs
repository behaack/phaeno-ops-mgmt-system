namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

public sealed record StartAssemblyRequest(Guid Id, Guid LabSpecimenId, int SequencingRunNumber, string RecipeKey,
    IReadOnlyList<Guid> SequencingOutputIds, Guid? PreviousJobId = null, string? Reason = null);
public sealed record AssemblyReasonRequest(long Version, string Reason);
public sealed record AssemblyAnalysisRequest(long Version, Guid AnalysisRunId);
public sealed record AssemblyFrozenInputs(IReadOnlyList<AssemblyInput> Inputs, AssemblyInputVerification Verification, int AuthorizationVersion = 0);
public sealed record AssemblyJobDto(Guid Id, Guid LabWorkOrderId, Guid LabSpecimenId, string SampleName, int SequencingRunNumber,
    string State, DateTime RequestedAtUtc, DateTime? StartedAtUtc, DateTime? StoppedAtUtc, DateTime? DispositionAtUtc,
    double? DurationSeconds, bool IsTerminal, bool CancellationRequested, string? DispositionReason, string? AttentionReason,
    Guid? PreviousJobId, string? RetryReason, Guid? LabAnalysisRunId, bool OutputsDeclared, string ProviderKey,
    string? ProviderJobId, Guid RequestedByUserId, long Version, AssemblyProgress? Progress);

public sealed class LabAssemblyService(PSeqOperationsDbContext db, ILabAssemblyProvider provider,
    LabAssemblyProgress progress, IOptions<LabAssemblyOptions> options, IOptions<PSeqOrderToCashOptions> policy, TimeProvider time)
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly string[] TerminalStates = ["Succeeded", "Failed", "Terminated", "CancelledBeforeStart"];
    private DateTime Now => time.GetUtcNow().UtcDateTime;
    public AssemblyProviderAvailability Availability => !provider.Availability.Available ? provider.Availability
        : !options.Value.WorkerEnabled ? provider.Availability with { Available = false, Message = "Assembly dispatch is paused. Contact Operations before starting a job." }
        : !provider.SupportsIdempotentStart ? provider.Availability with { Available = false, Message = "Assembly start recovery has not been configured." }
        : provider.Availability;

    public async Task<IReadOnlyList<AssemblyJobDto>> ListAsync(Guid? workId, Guid? specimenId, CancellationToken ct)
    {
        var query = db.Set<LabAssemblyJob>().AsNoTracking();
        if (workId.HasValue) query = query.Where(j => j.LabWorkOrderId == workId);
        if (specimenId.HasValue) query = query.Where(j => j.LabSpecimenId == specimenId);
        var jobs = await query.OrderByDescending(j => j.RequestedAtUtc).Take(250).ToListAsync(ct);
        var ids = jobs.Select(j => j.LabSpecimenId).ToArray();
        var names = await db.LabSpecimens.AsNoTracking().Where(s => ids.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.AccessionNumber, ct);
        return jobs.Select(j => Map(j, names.GetValueOrDefault(j.LabSpecimenId))).ToArray();
    }

    public async Task<LabAssemblyJob> RequireJobAsync(Guid id, CancellationToken ct) =>
        await db.Set<LabAssemblyJob>().SingleOrDefaultAsync(j => j.Id == id, ct) ?? throw Error("Assembly job not found.", 404);

    public async Task<AssemblyJobDto> ReadAsync(Guid id, CancellationToken ct)
    {
        var job = await RequireJobAsync(id, ct);
        var specimen = await db.LabSpecimens.AsNoTracking().SingleAsync(s => s.Id == job.LabSpecimenId && s.LabWorkOrderId == job.LabWorkOrderId, ct);
        return Map(job, specimen.AccessionNumber);
    }

    public async Task<LabAssemblyJob> StartAsync(Guid workId, StartAssemblyRequest request, Guid actorId, CancellationToken ct)
    {
        if (request.Id == Guid.Empty || request.SequencingOutputIds is null || request.SequencingOutputIds.Count is < 1 or > 256
            || request.SequencingOutputIds.Contains(Guid.Empty) || request.SequencingOutputIds.Distinct().Count() != request.SequencingOutputIds.Count)
            throw Error("Select the registered sequencing inputs and a request identity.");
        var normalized = request with { SequencingOutputIds = request.SequencingOutputIds.Order().ToArray(), Reason = request.Reason?.Trim() };
        var hash = Hash(new { workId, request = normalized, actorId });
        await using var tx = await SampleShippingPackingData.BeginAsync(db, "assembly-request:" + request.Id, ct);
        var existing = await db.Set<LabAssemblyJob>().SingleOrDefaultAsync(j => j.Id == request.Id, ct);
        if (existing is not null)
        {
            if (existing.RequestSha256 != hash) throw Error("This request identity already belongs to different assembly instructions.", 409);
            return existing;
        }
        if (!Availability.Available) throw Error(Availability.Message, 409);
        var recipe = provider.Availability.Recipes.SingleOrDefault(r => r.Key == request.RecipeKey)
            ?? throw Error("Choose an available assembly recipe.");
        await SampleShippingPackingData.LockAsync(db, $"assembly-run:{request.LabSpecimenId}:{request.SequencingRunNumber}", ct);
        var work = await RequireStartableAsync(workId, request.LabSpecimenId, actorId, ct);
        if (await db.Set<LabAssemblyJob>().AnyAsync(j => j.LabSpecimenId == request.LabSpecimenId
            && j.SequencingRunNumber == request.SequencingRunNumber && !TerminalStates.Contains(j.State), ct))
            throw Error("This sequencing run already has an active assembly attempt.", 409);
        var history = await db.Set<LabAssemblyJob>().Where(j => j.LabSpecimenId == request.LabSpecimenId
            && j.SequencingRunNumber == request.SequencingRunNumber).OrderByDescending(j => j.RequestedAtUtc).FirstOrDefaultAsync(ct);
        if (history?.AttentionReason is not null) throw Error("Reconcile the earlier attempt's outcome before starting another assembly.", 409);
        if (history?.Id != request.PreviousJobId || request.PreviousJobId.HasValue && string.IsNullOrWhiteSpace(request.Reason))
            throw Error("A repeat assembly must reference the latest attempt and include a reason.", 409);
        var inputs = await db.LabSequencingOutputs.AsNoTracking().Where(o => normalized.SequencingOutputIds.Contains(o.Id)
            && o.LabWorkOrderId == workId && o.LabSpecimenId == request.LabSpecimenId).ToListAsync(ct);
        if (inputs.Count != normalized.SequencingOutputIds.Count || LabResultLineageService.RequireSinglePurchasedRun(inputs) != request.SequencingRunNumber
            || inputs.Select(o => o.LabSpecimenAttemptId).Distinct().Count() != 1 || inputs.Select(o => o.SourceContainerId).Distinct().Count() != 1)
            throw Error("Assembly inputs must belong to this sample, one producing tube attempt and one purchased sequencing run.");
        var specimen = await db.LabSpecimens.AsNoTracking().SingleAsync(s => s.Id == request.LabSpecimenId, ct);
        var allocations = await new LabSequencingRunProgress(db).AllocationsAsync(workId, ct);
        if (request.SequencingRunNumber < 1 || request.SequencingRunNumber > allocations.GetValueOrDefault(specimen.SubmittedSpecimenId, 1))
            throw Error("This sequencing run is outside the sample's authorized allocation.");
        var source = await db.LabSpecimenAttempts.SingleAsync(a => a.Id == inputs[0].LabSpecimenAttemptId, ct);
        if (source.State != LabSpecimenAttemptState.Succeeded || !source.StartedAtUtc.HasValue)
            throw Error("The inputs require a successfully completed preparation attempt.");
        var frozen = inputs.OrderBy(o => o.Id).Select(o => new AssemblyInput(o.Id, o.ExternalFileReference, o.Sha256, o.SizeBytes)).ToArray();
        var verification = await provider.VerifyInputsAsync(frozen, ct);
        ValidateVerification(frozen, verification, Now);
        var job = new LabAssemblyJob(request.Id, workId, specimen.Id, work.SubmittingOrganizationId, request.SequencingRunNumber,
            actorId, provider.Key, JsonSerializer.Serialize(recipe, Json), JsonSerializer.Serialize(new AssemblyFrozenInputs(frozen, verification, work.CurrentAuthorizationVersion), Json),
            hash, Now, request.PreviousJobId, request.Reason);
        db.Add(job); Record(job, "Requested", actorId);
        // Participate in concurrency with a new parent hold/cancellation.
        db.Entry(work).Property(w => w.UpdatedAt).IsModified = true;
        await db.SaveChangesAsync(ct);
        if (tx is not null) await tx.CommitAsync(ct);
        return job;
    }

    public async Task CancelAsync(Guid workId, Guid id, AssemblyReasonRequest request, Guid actorId, CancellationToken ct)
    {
        await using var tx = await SampleShippingPackingData.BeginAsync(db, "assembly-job:" + id, ct);
        var job = await RequireJobAsync(id, ct);
        if (job.LabWorkOrderId != workId) throw Error("Assembly job not found in this Lab Job.", 404);
        if (job.Version != request.Version) throw Error("This job changed. Refresh before requesting cancellation.", 409);
        if (job.State != "Queued" && (!provider.Availability.SupportsCancellation || job.ProviderKey != provider.Key))
            throw Error("The processing service does not currently support cancellation.", 409);
        try { if (job.RequestCancellation(actorId, request.Reason, Now)) Record(job, job.IsTerminal ? "CancelledBeforeStart" : "CancellationRequested", actorId); }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException) { throw Error(ex.Message, 409); }
        await db.SaveChangesAsync(ct); if (tx is not null) await tx.CommitAsync(ct);
        if (job.IsTerminal) progress.Forget(job.Id);
    }

    public async Task LinkAnalysisAsync(Guid workId, Guid id, AssemblyAnalysisRequest request, Guid actorId, CancellationToken ct)
    {
        await using var tx = await SampleShippingPackingData.BeginAsync(db, "assembly-job:" + id, ct);
        var job = await RequireJobAsync(id, ct);
        if (job.LabWorkOrderId != workId) throw Error("Assembly job not found in this Lab Job.", 404);
        if (job.LabAnalysisRunId == request.AnalysisRunId) return;
        if (job.Version != request.Version || job.State != "Succeeded" || job.AttentionReason is not null)
            throw Error("Refresh and reconcile the successful assembly before linking its analysis.", 409);
        var specimen = await db.LabSpecimens.SingleAsync(s => s.Id == job.LabSpecimenId, ct);
        var run = await new LabResultLineageService(db).RequireResultAsync(request.AnalysisRunId, true,
            job.OrganizationId, workId, specimen.SubmittedSpecimenId, ct, true, allowPendingAssemblyLink: true);
        var inputIds = await db.LabAnalysisInputs.Where(i => i.LabAnalysisRunId == request.AnalysisRunId).Select(i => i.LabSequencingOutputId).ToListAsync(ct);
        var frozen = JsonSerializer.Deserialize<AssemblyFrozenInputs>(job.InputsJson, Json)!;
        var evidence = run!.ScientificEvidenceJson is null ? null : JsonSerializer.Deserialize<LabScientificEvidence>(run.ScientificEvidenceJson, Json);
        if (!inputIds.Order().SequenceEqual(frozen.Inputs.Select(i => i.SequencingOutputId).Order())
            || run.ProviderKey != job.ProviderKey || run.RunReference != job.ProviderJobId
            || !SameExecutionTime(evidence?.RunStartedAtUtc, job.StartedAtUtc) || !SameExecutionTime(evidence?.RunCompletedAtUtc, job.StoppedAtUtc))
            throw Error("The completed analysis must match this execution's provider, exact inputs and actual start/stop times.");
        job.LinkAnalysis(run.Id); Record(job, "AnalysisLinked", actorId);
        await db.SaveChangesAsync(ct); if (tx is not null) await tx.CommitAsync(ct);
    }

    internal async Task<LabWorkOrder> RequireStartableAsync(Guid workId, Guid specimenId, Guid actorId, CancellationToken ct)
    {
        var work = await db.LabWorkOrders.SingleOrDefaultAsync(w => w.Id == workId, ct) ?? throw Error("Lab Job not found.", 404);
        if (!await db.LabSpecimens.AnyAsync(s => s.Id == specimenId && s.LabWorkOrderId == work.Id, ct)) throw Error("Sample not found in this Lab Job.", 404);
        if (work.Status is LabWorkOrderStatus.Cancelled or LabWorkOrderStatus.OnHold) throw Error("Resolve the Lab Job hold before starting assembly.", 409);
        // Match the controller Trial guard for worker dispatch, before acquiring sample-hold locks.
        if (work.AuthorizationSource == LabAuthorizationSource.TrialProject && db.Database.IsNpgsql())
        {
            var entity = db.Model.FindEntityType(typeof(PSeq.Operations.Commercial.Trials.Domain.TrialProject))!;
            var table = $"\"{entity.GetSchema()!.Replace("\"", "\"\"")}\".\"{entity.GetTableName()!.Replace("\"", "\"\"")}\"";
#pragma warning disable EF1002
            await db.Database.ExecuteSqlRawAsync($"SELECT id FROM {table} WHERE id = {{0}} FOR SHARE", [work.AuthorizationSourceId], ct);
#pragma warning restore EF1002
        }
        await SampleShippingPackingData.LockAsync(db, "customer-hold:" + specimenId, ct);
        await LabCustomerHolds.RequireUnblockedAsync(db, [specimenId], ct);
        var user = await db.Users.Include(u => u.Memberships).ThenInclude(m => m.Organization).SingleOrDefaultAsync(u => u.Id == actorId, ct);
        var roles = await db.LabRoleAssignments.Where(r => r.UserId == actorId && r.IsActive).Select(r => r.Role).ToHashSetAsync(ct);
        if (user is null || !LabOperationsAuthorization.IsEligibleLabStaff(user)
            || !new LabOperationsActor(user, roles, policy.Value.DualControlEnforced, !policy.Value.DualControlEnforced).HasAny(LabRole.Operator, LabRole.Supervisor))
            throw Error("The requesting operator no longer has permission to start laboratory work.", 403);
        if (work.AuthorizationSource == LabAuthorizationSource.TrialProject)
        {
            var trial = await db.TrialProjects.AsNoTracking().SingleAsync(t => t.Id == work.AuthorizationSourceId, ct);
            if (trial.IsOnHold || trial.IsTerminal || trial.AcceptedScopeRevision != trial.ApprovedScopeRevision || trial.ApprovedScopeRevision != trial.CurrentScopeRevision)
                throw Error("The Trial requires current acceptance and approval without a hold before assembly.", 409);
        }
        return work;
    }

    internal void Record(LabAssemblyJob job, string kind, Guid? actorId = null)
    {
        var body = JsonSerializer.Serialize(new { job.Id, job.State, job.ProviderKey, job.ProviderJobId, job.SequencingRunNumber,
            job.StartedAtUtc, job.StoppedAtUtc, job.DispositionAtUtc, job.DispositionReason, job.AttentionReason,
            job.CancellationReason, job.LabAnalysisRunId }, Json);
        db.Add(new LabAssemblyEvent(job.Id, kind, Now, actorId, body));
        db.LabWorkEvents.Add(new LabWorkEvent(job.LabWorkOrderId, job.LabSpecimenId, "Assembly" + kind, Now, actorId, body));
    }

    private AssemblyJobDto Map(LabAssemblyJob j, string? name) => new(j.Id, j.LabWorkOrderId, j.LabSpecimenId,
        name ?? "Unaccessioned sample", j.SequencingRunNumber, j.State, j.RequestedAtUtc, j.StartedAtUtc, j.StoppedAtUtc, j.DispositionAtUtc,
        j.StartedAtUtc.HasValue && j.StoppedAtUtc.HasValue ? (j.StoppedAtUtc.Value - j.StartedAtUtc.Value).TotalSeconds : null,
        j.IsTerminal, j.CancellationRequestedAtUtc.HasValue, j.DispositionReason, j.AttentionReason, j.PreviousJobId, j.RetryReason,
        j.LabAnalysisRunId, j.OutputManifestJson is not null, j.ProviderKey, j.ProviderJobId, j.RequestedByUserId, j.Version, progress.Read(j.Id, j.IsTerminal));

    internal static void ValidateVerification(IReadOnlyList<AssemblyInput> inputs, AssemblyInputVerification receipt, DateTime now)
    {
        if (receipt.VerifiedAtUtc.Kind != DateTimeKind.Utc || receipt.VerifiedAtUtc > now.AddMinutes(5)
            || receipt.VerifiedAtUtc < now.AddMinutes(-10) || receipt.Files.Count != inputs.Count
            || receipt.Files.Select(f => f.SequencingOutputId).Distinct().Count() != inputs.Count)
            throw Error("A current, complete input verification receipt is required.");
        LabLineageText.Hash(receipt.ManifestSha256);
        foreach (var input in inputs)
        {
            var file = receipt.Files.SingleOrDefault(f => f.SequencingOutputId == input.SequencingOutputId);
            if (file is null || !string.Equals(file.Sha256, input.Sha256, StringComparison.OrdinalIgnoreCase) || file.SizeBytes != input.SizeBytes
                || string.IsNullOrWhiteSpace(file.Bucket) || string.IsNullOrWhiteSpace(file.Key)
                || (string.IsNullOrWhiteSpace(file.VersionId) || file.VersionId == "null") && !file.ImmutableObject)
                throw Error("The verified S3 objects must match every registered input's identity, checksum and size.");
        }
    }

    private static bool SameExecutionTime(DateTime? left, DateTime? right) => left.HasValue && right.HasValue && left.Value.Ticks / 10 == right.Value.Ticks / 10;
    private static string Hash(object value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value, Json))));
    internal static OrderManagementException Error(string message, int status = 400) => new("assembly_job_invalid", message, status);
}
