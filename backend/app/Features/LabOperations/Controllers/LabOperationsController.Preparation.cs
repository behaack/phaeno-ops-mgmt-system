namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabOperationsController
{
    [HttpGet("preparation")]
    public async Task<object> PreparationIndex(CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, Enum.GetValues<LabRole>());
        var formats = await dbContext.LabTrayFormats.AsNoTracking().OrderBy(f => f.CreatedAt).ToListAsync(ct);
        var batches = await dbContext.LabPreparationBatches.AsNoTracking().OrderByDescending(b => b.CreatedAt).Take(250).ToListAsync(ct);
        var workflows = await ReadServiceWorkflowsAsync(ct);
        var versions = await dbContext.LabProtocolVersions.AsNoTracking().ToListAsync(ct);
        var stages = await dbContext.LabServiceWorkflowStages.AsNoTracking().OrderBy(s => s.Sequence).ToListAsync(ct);
        var compatible = stages.GroupBy(s => s.LabServiceWorkflowVersionId).Where(g => g.All(s =>
        {
            var p = versions.Single(v => v.Id == s.LabProtocolVersionId);
            try { return p.Status is LabProtocolStatus.Approved or LabProtocolStatus.Active && LabProtocolDefinition.Parse(p.DefinitionJson).PreparationBatchEnabled; }
            catch (ArgumentException) { return false; }
        }) && g.Any(s => LabProtocolDefinition.Parse(versions.Single(v => v.Id == s.LabProtocolVersionId).DefinitionJson).Steps.Any(step => step.QcGate is not null))).Select(g => g.Key).ToHashSet();
        return new { formats = formats.Select(f => new { f.Id, f.Version, f.IsActive, layout = LabTrayLayout.Read(f.LayoutJson) }),
            batches = batches.Select(b => new { b.Id, b.Name, status = b.Status.ToString(), b.Version, b.StartedAtUtc, b.CompletedAtUtc }),
            workflows, compatibleWorkflowVersionIds = compatible, canOperate = actor.HasAny(LabRole.Operator, LabRole.Supervisor),
            canConfigure = actor.HasAny(LabRole.Supervisor, LabRole.ProtocolAdministrator) };
    }

    [HttpPost("preparation/tray-formats")]
    public async Task<object> SaveTrayFormat([FromBody] SaveLabTrayFormatRequest request, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Supervisor, LabRole.ProtocolAdministrator);
        if (request.Id == Guid.Empty) throw Invalid("tray_id_required", "A tray format identifier is required.");
        var format = await dbContext.LabTrayFormats.SingleOrDefaultAsync(f => f.Id == request.Id, ct);
        if (format is null)
        {
            if (request.Version != 0) throw Conflict("tray_changed", "Reload the tray formats before saving.");
            Execute(() => request.Layout.Validate());
            format = new LabTrayFormat(request.Layout);
            format.Update(request.Layout, request.IsActive);
            // Client generated IDs make a retried create address the same format.
            dbContext.Entry(format).Property(f => f.Id).CurrentValue = request.Id;
            dbContext.LabTrayFormats.Add(format);
        }
        else
        {
            if (request.Version == 0 && LabTrayLayout.Read(format.LayoutJson).ToJson() == request.Layout.ToJson() && format.IsActive == request.IsActive)
                return await PreparationIndex(ct);
            EnsureVersion(format.Version, request.Version);
            Execute(() => format.Update(request.Layout, request.IsActive));
        }
        await dbContext.SaveChangesAsync(ct);
        return await PreparationIndex(ct);
    }

    [HttpPost("preparation/batches")]
    public async Task<object> CreatePreparation([FromBody] CreateLabPreparationRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        if (request.RequestId == Guid.Empty) throw Invalid("preparation_request_required", "A request identifier is required.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"lab-preparation-create:{request.RequestId}", ct);
        var hash = PreparationHash(request);
        var previous = await dbContext.LabPreparationRecords.AsNoTracking().SingleOrDefaultAsync(r => r.Id == request.RequestId, ct);
        if (previous is not null)
        {
            if (previous.RequestHash != hash || previous.ActorUserId != actor.User.Id) throw Conflict("preparation_request_reused", "This request was already used for different work.");
            return await ReadPreparation(previous.LabPreparationBatchId, ct);
        }
        // Serialize name allocation before reading mutable configuration so concurrent creates
        // receive distinct identifiers without making one another's tray snapshots stale.
        await SampleShippingPackingData.LockAsync(dbContext, "lab-preparation-name", ct);
        await RequirePreparationWorkflowAsync(request.WorkflowVersionId, ct);
        var format = await dbContext.LabTrayFormats.SingleOrDefaultAsync(f => f.Id == request.TrayFormatId, ct) ?? throw Missing();
        if (!format.IsActive) throw Conflict("tray_retired", "Choose an active tray format.");
        dbContext.Entry(format).Property(f => f.UpdatedAt).IsModified = true;
        if (request.Notes?.Length > 2000) throw Invalid("preparation_notes_invalid", "Use at most 2,000 characters for batch notes.");
        var serviceKey = await (from version in dbContext.LabServiceWorkflowVersions
            join workflow in dbContext.LabServiceWorkflows on version.LabServiceWorkflowId equals workflow.Id
            where version.Id == request.WorkflowVersionId select workflow.ServiceKey).SingleAsync(ct);
        var prefix = serviceKey == "pseq-lab-service" ? "PSeq" :
            new string(serviceKey.Where(c => char.IsAsciiLetterOrDigit(c) || c == '-').Take(80).ToArray());
        if (prefix.Length == 0) prefix = "Lab";
        var baseName = $"{prefix}-{DateTime.UtcNow.ToString("yyyyMMdd-HHmmss", System.Globalization.CultureInfo.InvariantCulture)}";
        var name = baseName;
        for (var suffix = 2; await dbContext.LabPreparationBatches.AnyAsync(b => b.Name == name, ct); suffix++)
            name = $"{baseName}-{suffix.ToString("D2", System.Globalization.CultureInfo.InvariantCulture)}";
        var batch = new LabPreparationBatch(name, format, request.WorkflowVersionId);
        dbContext.LabPreparationBatches.Add(batch);
        dbContext.LabPreparationRecords.Add(new(request.RequestId, batch.Id, actor.User.Id, "create", hash, JsonSerializer.Serialize(request, JsonOptions), DateTime.UtcNow));
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await ReadPreparation(batch.Id, ct);
    }

    [HttpGet("preparation/batches/{preparationBatchId:guid}")]
    public async Task<object> ReadPreparation(Guid preparationBatchId, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, Enum.GetValues<LabRole>());
        var batch = await dbContext.LabPreparationBatches.AsNoTracking().SingleOrDefaultAsync(b => b.Id == preparationBatchId, ct) ?? throw Missing();
        var members = await dbContext.LabPreparationMembers.AsNoTracking().Where(m => m.LabPreparationBatchId == batch.Id && !m.Removed).ToListAsync(ct);
        var ids = members.Select(m => m.LabSpecimenAttemptId).ToList();
        var attempts = await dbContext.LabSpecimenAttempts.AsNoTracking().Where(a => ids.Contains(a.Id)).ToListAsync(ct);
        var workIds = attempts.Select(a => a.LabWorkOrderId).ToList();
        var jobs = await dbContext.LabWorkOrders.AsNoTracking().Where(w => workIds.Contains(w.Id)).ToDictionaryAsync(w => w.Id, ct);
        var specimenIds = attempts.Select(a => a.LabSpecimenId).ToList();
        var specimens = await dbContext.LabSpecimens.AsNoTracking().Where(s => specimenIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, ct);
        var executions = await dbContext.LabProtocolExecutions.AsNoTracking().Where(e => e.LabSpecimenAttemptId.HasValue && ids.Contains(e.LabSpecimenAttemptId.Value)).ToListAsync(ct);
        var stages = await dbContext.LabServiceWorkflowStages.AsNoTracking().Where(s => s.LabServiceWorkflowVersionId == batch.LabServiceWorkflowVersionId).OrderBy(s => s.Sequence).ToListAsync(ct);
        var protocolIds = stages.Select(s => s.LabProtocolVersionId).ToList();
        var protocols = await dbContext.LabProtocolVersions.AsNoTracking().Where(p => protocolIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct);
        var records = await dbContext.LabPreparationRecords.AsNoTracking().Where(r => r.LabPreparationBatchId == batch.Id).OrderBy(r => r.RecordedAtUtc).ToListAsync(ct);
        var outputs = await dbContext.LabContainers.AsNoTracking().Where(c => members.Select(m => m.OutputContainerId).Contains(c.Id)).ToListAsync(ct);
        var libraries = await dbContext.LabLibraries.AsNoTracking().Where(l => members.Select(m => m.LabLibraryId).Contains(l.Id)).ToListAsync(ct);
        var availableOutputs = await dbContext.LabContainers.AsNoTracking().Where(c => c.LabSpecimenAttemptId.HasValue && ids.Contains(c.LabSpecimenAttemptId.Value)
            && c.Kind == LabContainerKind.Library && c.Status == LabContainerStatus.Available && c.Quantity > 0 && c.QuantityUnit != null
            && !dbContext.LabLibraries.Any(l => l.LibraryContainerId == c.Id)).ToListAsync(ct);
        var sequencing = await (from m in dbContext.LabBatchMembers.AsNoTracking() join b in dbContext.LabOperationalBatches.AsNoTracking() on m.LabOperationalBatchId equals b.Id
            where libraries.Select(l => l.Id).Contains(m.LabLibraryId) select new { m.LabLibraryId, b.Id, b.BatchNumber, b.Name }).ToListAsync(ct);
        var creation = records.FirstOrDefault(r => r.Action == "create");
        var notes = creation is null ? null : JsonSerializer.Deserialize<CreateLabPreparationRequest>(creation.DetailsJson, JsonOptions)?.Notes;
        return new { batch.Id, batch.Name, notes, batch.Version, status = batch.Status.ToString(), batch.LabServiceWorkflowVersionId,
            layout = LabTrayLayout.Read(batch.LayoutJson), batch.StartedAtUtc, batch.CompletedAtUtc,
            canOperate = actor.HasAny(LabRole.Operator, LabRole.Supervisor), canCorrect = actor.HasAny(LabRole.Supervisor), roles = EffectiveExecutionRoles(actor).Select(r => r.ToString()),
            stages = stages.Select(s => new { s.Id, s.Name, s.Sequence, requirement = s.Requirement.ToString(), definition = LabProtocolDefinition.Parse(protocols[s.LabProtocolVersionId].DefinitionJson) }),
            members = members.Select(m => { var a = attempts.Single(a => a.Id == m.LabSpecimenAttemptId); var w = jobs[a.LabWorkOrderId];
                return new { m.Id, m.Position, barcode = m.ConfirmedBarcode, attemptId = a.Id, a.Sequence, workOrderId = w.Id, jobName = w.OpaqueSubmitterReference,
                    specimenId = a.LabSpecimenId, specimenName = specimens[a.LabSpecimenId].AccessionNumber, state = a.State.ToString(), a.FailureEvidence,
                    blocker = w.Status is LabWorkOrderStatus.OnHold or LabWorkOrderStatus.Cancelled or LabWorkOrderStatus.ReadyForRelease ? "The job is held or closed." : a.HoldReason,
                    output = outputs.Where(o => o.Id == m.OutputContainerId).Select(o => new { o.Id, o.Barcode, o.Quantity, o.QuantityUnit, confirmed = m.OutputConfirmed }).SingleOrDefault(),
                    availableOutputs = availableOutputs.Where(o => o.LabSpecimenAttemptId == a.Id && !members.Any(other => other.OutputContainerId == o.Id))
                        .Select(o => new { o.Id, o.Barcode, o.Quantity, o.QuantityUnit }),
                    library = libraries.Where(l => l.Id == m.LabLibraryId).Select(l => new { l.Id, l.LibraryKey, status = l.Status.ToString(), sequencing = sequencing.FirstOrDefault(s => s.LabLibraryId == l.Id) }).SingleOrDefault(),
                    stageSkips = a.ReadStageSkips(), executions = executions.Where(e => e.LabSpecimenAttemptId == a.Id).Select(e => new { e.Id, stageId = e.LabServiceWorkflowStageId, status = e.Status.ToString(),
                        evidence = LabProtocolEvidence.Read(e.CapturedResultsJson), blockers = LabProtocolEvidence.Read(e.CapturedResultsJson).CompletionBlockers(LabProtocolDefinition.Parse(protocols[e.LabProtocolVersionId].DefinitionJson)),
                        stepPrerequisites = PreparationStepPrerequisites(e, protocols[e.LabProtocolVersionId]) }) }; }),
            records = records.Select(r => new { r.Id, r.Action, r.RecordedAtUtc, r.ActorUserId, details = JsonSerializer.Deserialize<JsonElement>(r.DetailsJson) }) };
    }

    [HttpGet("preparation/batches/{preparationBatchId:guid}/tubes")]
    public async Task<object> FindPreparationTubes(Guid preparationBatchId, string? query, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        var batch = await dbContext.LabPreparationBatches.AsNoTracking().SingleOrDefaultAsync(b => b.Id == preparationBatchId, ct) ?? throw Missing();
        var candidates = await (from t in dbContext.LabContainers.AsNoTracking() join s in dbContext.LabSpecimens.AsNoTracking() on t.LabSpecimenId equals s.Id
            join w in dbContext.LabWorkOrders.AsNoTracking() on t.LabWorkOrderId equals w.Id
            where t.Kind == LabContainerKind.SubmittedSpecimen && t.IntakeDisposition == LabSpecimenIntakeDisposition.Accepted && t.Status == LabContainerStatus.Available
                && w.LabServiceWorkflowVersionId == batch.LabServiceWorkflowVersionId && w.TubeUsePolicyKey == LabTubeUsePolicy.RunOneWithFailureFallback
                && w.Status != LabWorkOrderStatus.OnHold && w.Status != LabWorkOrderStatus.Cancelled && w.Status != LabWorkOrderStatus.ReadyForRelease
                && s.AccessionNumber != null && s.ReceivedAtUtc != null && s.IntakeDisposition != LabSpecimenIntakeDisposition.Cancelled
                && s.ProcessingState != LabSpecimenProcessingState.Succeeded && s.ProcessingState != LabSpecimenProcessingState.Failed
                && (query == null || t.Barcode.Contains(query) || (w.OpaqueSubmitterReference != null && w.OpaqueSubmitterReference.Contains(query)))
            orderby t.Barcode select new { t.Id, t.Barcode, t.Location, specimenId = s.Id, specimenName = s.AccessionNumber, jobName = w.OpaqueSubmitterReference }).Take(200).ToListAsync(ct);
        var specimenIds = candidates.Select(c => c.specimenId).ToList();
        var attempts = await dbContext.LabSpecimenAttempts.AsNoTracking().Where(a => specimenIds.Contains(a.LabSpecimenId) && a.State != LabSpecimenAttemptState.Cancelled).ToListAsync(ct);
        var reserved = await dbContext.LabPreparationMembers.AsNoTracking().Where(m => !m.Removed).Select(m => m.LabSpecimenAttemptId).ToListAsync(ct);
        return candidates.Where(c => !attempts.Any(a => a.LabSpecimenId == c.specimenId && (a.State != LabSpecimenAttemptState.Failed && (a.State != LabSpecimenAttemptState.Planned || a.SourceContainerId != c.Id || reserved.Contains(a.Id))
            || a.SourceContainerId == c.Id && a.State == LabSpecimenAttemptState.Failed))).ToList();
    }

    private static string PreparationHash(object request) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(request, JsonOptions))));

    private static Dictionary<string, IReadOnlyList<string>> PreparationStepPrerequisites(LabProtocolExecution execution, LabProtocolVersion protocol)
    {
        var definition = LabProtocolDefinition.Parse(protocol.DefinitionJson);
        var evidence = LabProtocolEvidence.Read(execution.CapturedResultsJson);
        return definition.Steps.ToDictionary(step => step.Key, step => (IReadOnlyList<string>)definition.Steps.TakeWhile(earlier => earlier.Key != step.Key)
            .Select(earlier => evidence.StepBlocker(definition, earlier)).OfType<string>().ToList());
    }

    private async Task<List<LabServiceWorkflowStage>> RequirePreparationWorkflowAsync(Guid id, CancellationToken ct)
    {
        var workflow = await dbContext.LabServiceWorkflowVersions.SingleOrDefaultAsync(w => w.Id == id, ct) ?? throw Missing();
        if (workflow.Status is not (LabServiceWorkflowStatus.Approved or LabServiceWorkflowStatus.Production)) throw Conflict("preparation_workflow_unavailable", "Choose an approved preparation workflow version.");
        dbContext.Entry(workflow).Property(w => w.UpdatedAt).IsModified = true;
        var stages = await dbContext.LabServiceWorkflowStages.Where(s => s.LabServiceWorkflowVersionId == id).OrderBy(s => s.Sequence).ToListAsync(ct);
        if (stages.Count == 0) throw Conflict("preparation_workflow_empty", "The workflow needs preparation stages.");
        await RequireCurrentProtocolsAsync(stages.Select(s => s.LabProtocolVersionId).ToArray(), ct);
        var hasQc = false;
        foreach (var stage in stages)
        {
            var protocol = await dbContext.LabProtocolVersions.SingleAsync(p => p.Id == stage.LabProtocolVersionId, ct);
            var definition = RequireProtocolDefinition(protocol.DefinitionJson);
            hasQc |= definition.Steps.Any(s => s.QcGate is not null);
            if (!definition.PreparationBatchEnabled)
                throw Conflict("preparation_scopes_required", $"{stage.Name}: publish a new protocol version with explicit preparation capture and QC scopes. Existing approved definitions are unchanged.");
        }
        if (!hasQc) throw Conflict("preparation_qc_required", "A preparation workflow needs a defined QC gate to establish library eligibility.");
        return stages;
    }
}
