namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record LabReagentWorkflowDto(Guid Id, string Name, Guid MaterialDefinitionId,
    string MaterialName, string? OutputUnit, IReadOnlyList<LabReagentStep> Steps, int Revision, string Status,
    Guid AuthoredByUserId, Guid? ApprovedByUserId, DateTime? ApprovedAtUtc,
    string? ApprovalOverrideReason, long Version);
public sealed record SaveLabReagentWorkflowRequest(string Name, Guid? MaterialDefinitionId,
    string? NewMaterialName, IReadOnlyList<LabReagentStep> Steps, long Version = 0,
    string? OutputUnit = null);
public sealed record ApproveLabReagentWorkflowRequest(long Version, string? ApprovalOverrideReason = null);
public sealed record StartLabReagentRunRequest(Guid MaterialDefinitionId, Guid StorageLocationId);
public sealed record RecordLabReagentStepRequest(int Sequence, string Notes, long Version);
public sealed record RecordLabReagentUseRequest(Guid SourceMaterialLotId, decimal Quantity,
    string QuantityUnit, bool MaterialExhausted, long Version);
public sealed record CompleteLabReagentRunRequest(decimal ProducedQuantity,
    DateOnly? ExpirationOrRetestDate, long Version);
public sealed record AbandonLabReagentRunRequest(string Reason, long Version);
public sealed record LabReagentRunStepDto(int Sequence, string StepKey, string Name,
    string Instructions, string Notes, Guid PerformedByUserId, DateTime PerformedAtUtc);
public sealed record LabReagentUseDto(Guid Id, Guid SourceMaterialLotId, string SourceName,
    string SourceLotNumber, decimal Quantity, string QuantityUnit, bool MaterialExhausted,
    Guid RecordedByUserId, DateTime RecordedAtUtc);
public sealed record LabReagentRunDto(Guid Id, Guid WorkflowId, int WorkflowRevision,
    string WorkflowName, Guid MaterialLotId, string MaterialName, string LotNumber,
    Guid StorageLocationId, string StorageLocation, string QuantityUnit,
    decimal AvailableQuantity, string QcDisposition, string Status,
    IReadOnlyList<LabReagentStep> Steps, IReadOnlyList<LabReagentRunStepDto> RecordedSteps,
    IReadOnlyList<LabReagentUseDto> MaterialUses, Guid StartedByUserId,
    DateTime StartedAtUtc, Guid? FinishedByUserId, DateTime? FinishedAtUtc,
    string? AbandonmentReason, long Version);

public sealed partial class LabOperationsController
{
    [HttpGet("reagent-workflows")]
    public async Task<IReadOnlyList<LabReagentWorkflowDto>> ListReagentWorkflows(CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor,
            LabRole.ProtocolAdministrator, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var definitions = await dbContext.LabMaterialDefinitions.AsNoTracking()
            .ToDictionaryAsync(item => item.Id, ct);
        return (await dbContext.LabReagentWorkflows.AsNoTracking().OrderBy(item => item.Name)
            .ToListAsync(ct)).Select(item => MapReagentWorkflow(item, definitions)).ToList();
    }

    [HttpPost("reagent-workflows")]
    public async Task<LabReagentWorkflowDto> CreateReagentWorkflow(
        [FromBody] SaveLabReagentWorkflowRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct,
            LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        await using var transaction = dbContext.Database.CurrentTransaction is null
            ? await dbContext.Database.BeginTransactionAsync(ct) : null;
        if (!string.IsNullOrWhiteSpace(request.NewMaterialName))
            await SampleShippingPackingData.LockAsync(dbContext,
                $"reagent-material-name:{request.NewMaterialName.Trim().ToUpperInvariant()}", ct);
        var definition = await ResolveMaterialDefinitionAsync(LabMaterialLotKind.PreparedReagent,
            request.MaterialDefinitionId, request.NewMaterialName, ct);
        await SampleShippingPackingData.LockAsync(dbContext,
            $"reagent-material:{definition.Id}", ct);
        if (await dbContext.LabReagentWorkflows.AnyAsync(item =>
            item.MaterialDefinitionId == definition.Id, ct))
            throw Conflict("reagent_already_has_workflow",
                "This reagent already has a workflow. Revise its existing workflow instead.");
        try { definition.SetPreparedReagentUnit(request.OutputUnit!); }
        catch (ArgumentException error) { throw Invalid("reagent_unit_invalid", error.Message); }
        catch (InvalidOperationException error) { throw Conflict("reagent_unit_conflict", error.Message); }
        LabReagentWorkflow workflow;
        try { workflow = new(request.Name, definition.Id, request.Steps, actor.User.Id); }
        catch (ArgumentException error) { throw Invalid("reagent_workflow_invalid", error.Message); }
        await RequireUniqueReagentWorkflowNameAsync(workflow.Name, null, ct);
        dbContext.LabReagentWorkflows.Add(workflow);
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return MapReagentWorkflow(workflow, new Dictionary<Guid, LabMaterialDefinition> { [definition.Id] = definition });
    }

    [HttpPut("reagent-workflows/{id:guid}")]
    public async Task<LabReagentWorkflowDto> ReviseReagentWorkflow(Guid id,
        [FromBody] SaveLabReagentWorkflowRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct,
            LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"reagent-workflow:{id}", ct);
        var workflow = await dbContext.LabReagentWorkflows.SingleOrDefaultAsync(item => item.Id == id, ct)
            ?? throw Missing();
        await SampleShippingPackingData.LockAsync(dbContext,
            $"reagent-material:{workflow.MaterialDefinitionId}", ct);
        EnsureVersion(workflow.Version, request.Version);
        var definition = await ResolveMaterialDefinitionAsync(LabMaterialLotKind.PreparedReagent,
            request.MaterialDefinitionId, request.NewMaterialName, ct);
        if (definition.Id != workflow.MaterialDefinitionId)
            throw Invalid("reagent_workflow_reassignment_forbidden",
                "A workflow stays with its reagent. Revise the existing procedure without changing the reagent.");
        if (!string.IsNullOrWhiteSpace(request.OutputUnit))
        {
            try { definition.SetPreparedReagentUnit(request.OutputUnit); }
            catch (InvalidOperationException error) { throw Conflict("reagent_unit_conflict", error.Message); }
            catch (ArgumentException error) { throw Invalid("reagent_unit_invalid", error.Message); }
        }
        await RequireUniqueReagentWorkflowNameAsync(request.Name, workflow.Id, ct);
        Execute(() => workflow.Revise(request.Name, definition.Id, request.Steps, actor.User.Id));
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return MapReagentWorkflow(workflow, new Dictionary<Guid, LabMaterialDefinition> { [definition.Id] = definition });
    }

    [HttpPost("reagent-workflows/{id:guid}/approve")]
    public async Task<LabReagentWorkflowDto> ApproveReagentWorkflow(Guid id,
        [FromBody] ApproveLabReagentWorkflowRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct,
            LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"reagent-workflow:{id}", ct);
        var workflow = await dbContext.LabReagentWorkflows.SingleOrDefaultAsync(item => item.Id == id, ct)
            ?? throw Missing();
        await SampleShippingPackingData.LockAsync(dbContext,
            $"reagent-material:{workflow.MaterialDefinitionId}", ct);
        EnsureVersion(workflow.Version, request.Version);
        var ownApproval = workflow.AuthoredByUserId == actor.User.Id;
        if (ownApproval && !actor.IsPlatformAdmin)
            throw Conflict("reagent_workflow_independent_approval_required",
                "A different administrator must approve this reagent workflow.");
        Execute(() => workflow.Approve(actor.User.Id, DateTime.UtcNow,
            ownApproval && actor.IsPlatformAdmin, request.ApprovalOverrideReason));
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        var definition = await dbContext.LabMaterialDefinitions.AsNoTracking()
            .SingleAsync(item => item.Id == workflow.MaterialDefinitionId, ct);
        return MapReagentWorkflow(workflow, new Dictionary<Guid, LabMaterialDefinition> { [definition.Id] = definition });
    }

    [HttpPost("reagent-workflows/{id:guid}/retire")]
    public async Task<LabReagentWorkflowDto> RetireReagentWorkflow(Guid id,
        [FromBody] ApproveLabReagentWorkflowRequest request, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct,
            LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"reagent-workflow:{id}", ct);
        var workflow = await dbContext.LabReagentWorkflows.SingleOrDefaultAsync(item => item.Id == id, ct)
            ?? throw Missing();
        await SampleShippingPackingData.LockAsync(dbContext,
            $"reagent-material:{workflow.MaterialDefinitionId}", ct);
        EnsureVersion(workflow.Version, request.Version);
        Execute(workflow.Retire);
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        var definition = await dbContext.LabMaterialDefinitions.AsNoTracking()
            .SingleAsync(item => item.Id == workflow.MaterialDefinitionId, ct);
        return MapReagentWorkflow(workflow, new Dictionary<Guid, LabMaterialDefinition> { [definition.Id] = definition });
    }

    [HttpGet("reagent-runs")]
    public async Task<IReadOnlyList<LabReagentRunDto>> ListReagentRuns(CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor,
            LabRole.ProtocolAdministrator, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var runs = await dbContext.LabReagentManufacturingRuns.AsNoTracking()
            .OrderByDescending(item => item.StartedAtUtc).Take(250).ToListAsync(ct);
        return await ReadReagentRunsAsync(runs, ct);
    }

    [HttpGet("reagent-runs/{id:guid}")]
    public async Task<LabReagentRunDto> ReadReagentRun(Guid id, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor,
            LabRole.ProtocolAdministrator, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        return (await ReadReagentRunsAsync([
            await dbContext.LabReagentManufacturingRuns.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing()
        ], ct)).Single();
    }

    [HttpPost("reagent-runs")]
    public async Task<LabReagentRunDto> StartReagentRun(
        [FromBody] StartLabReagentRunRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"reagent-material:{request.MaterialDefinitionId}", ct);
        var workflow = await dbContext.LabReagentWorkflows.SingleOrDefaultAsync(
            item => item.MaterialDefinitionId == request.MaterialDefinitionId
                && item.Status == LabReagentWorkflowStatus.Approved, ct)
            ?? throw Invalid("reagent_workflow_unavailable", "Select a reagent with an approved workflow.");
        var definition = await dbContext.LabMaterialDefinitions.SingleOrDefaultAsync(item =>
            item.Id == request.MaterialDefinitionId && item.IsActive
            && item.Kind == LabMaterialLotKind.PreparedReagent, ct)
            ?? throw Invalid("reagent_material_unavailable", "The selected reagent is unavailable.");
        if (string.IsNullOrWhiteSpace(definition.DefaultQuantityUnit))
            throw Conflict("reagent_unit_unconfigured", "Set this reagent's inventory unit in Lab settings before starting a run.");
        var storage = await dbContext.LabStorageLocations.SingleOrDefaultAsync(item =>
            item.Id == request.StorageLocationId && item.IsActive, ct)
            ?? throw Invalid("reagent_storage_unavailable", "Select an active storage location.");
        var producer = await RequirePhaenoProducerAsync(ct);
        var now = DateTime.UtcNow;
        var lotNumber = await LabIdentifierService.AllocateReagentLotNumberAsync(dbContext, now, ct);
        LabMaterialLot lot;
        try { lot = new(LabMaterialLotKind.PreparedReagent, workflow.MaterialDefinitionId,
            lotNumber, null, null, storage.Id, 0, definition.DefaultQuantityUnit); }
        catch (ArgumentException error) { throw Invalid("reagent_run_invalid", error.Message); }
        lot.AssignInternalProducer(producer.Id);
        var run = new LabReagentManufacturingRun(workflow, lot.Id, actor.User.Id, now);
        dbContext.LabMaterialLots.Add(lot);
        dbContext.LabReagentManufacturingRuns.Add(run);
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await ReadReagentRunsAsync([run], ct)).Single();
    }

    [HttpPost("reagent-runs/{id:guid}/steps")]
    public async Task<LabReagentRunDto> RecordReagentStep(Guid id,
        [FromBody] RecordLabReagentStepRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"reagent-run:{id}", ct);
        var run = await RequireReagentRunAsync(id, request.Version, ct);
        var steps = run.Steps();
        if (request.Sequence < 0 || request.Sequence >= steps.Count)
            throw Invalid("reagent_step_invalid", "Select the next step in this workflow.");
        LabReagentRunStep record;
        try { record = new(run.Id, request.Sequence, steps[request.Sequence].Key,
            request.Notes, actor.User.Id, DateTime.UtcNow); }
        catch (ArgumentException error) { throw Invalid("reagent_step_invalid", error.Message); }
        Execute(() => run.RecordStep(request.Sequence));
        dbContext.LabReagentRunSteps.Add(record);
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await ReadReagentRunsAsync([run], ct)).Single();
    }

    [HttpPost("reagent-runs/{id:guid}/materials")]
    public async Task<LabReagentRunDto> RecordReagentMaterialUse(Guid id,
        [FromBody] RecordLabReagentUseRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"reagent-run:{id}", ct);
        var run = await RequireReagentRunAsync(id, request.Version, ct);
        if (run.Status != LabReagentRunStatus.InProgress)
            throw Conflict("reagent_run_finished", "This reagent run is no longer active.");
        if (request.SourceMaterialLotId == run.MaterialLotId)
            throw Invalid("reagent_source_invalid", "A reagent cannot use its own output lot.");
        await SampleShippingPackingData.LockAsync(dbContext,
            $"material-lot:{request.SourceMaterialLotId}", ct);
        var source = await dbContext.LabMaterialLots.SingleOrDefaultAsync(
            item => item.Id == request.SourceMaterialLotId, ct) ?? throw Missing();
        if (source.QcDisposition is not (LabQcDisposition.Passed or LabQcDisposition.ApprovedException)
            || source.ExpirationOrRetestDate < DateOnly.FromDateTime(DateTime.UtcNow))
            throw Conflict("reagent_source_unavailable", "Source material must pass QC and be in date.");
        if (!string.Equals(source.QuantityUnit, request.QuantityUnit, StringComparison.OrdinalIgnoreCase))
            throw Invalid("reagent_source_unit_mismatch", "Use the source lot's tracked unit.");
        var now = DateTime.UtcNow;
        LabReagentMaterialUse use;
        try
        {
            use = new(run.Id, source.Id, request.Quantity, source.QuantityUnit,
                request.MaterialExhausted, actor.User.Id, now);
            source.Consume(request.Quantity, request.MaterialExhausted, use.Id, actor.User.Id, now);
            run.RecordMaterialUse();
        }
        catch (ArgumentException error) { throw Invalid("reagent_source_invalid", error.Message); }
        catch (InvalidOperationException error) { throw Conflict("reagent_source_unavailable", error.Message); }
        dbContext.LabReagentMaterialUses.Add(use);
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await ReadReagentRunsAsync([run], ct)).Single();
    }

    [HttpPost("reagent-runs/{id:guid}/complete")]
    public async Task<LabReagentRunDto> CompleteReagentRun(Guid id,
        [FromBody] CompleteLabReagentRunRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"reagent-run:{id}", ct);
        var run = await RequireReagentRunAsync(id, request.Version, ct);
        var lot = await dbContext.LabMaterialLots.SingleAsync(item => item.Id == run.MaterialLotId, ct);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (request.ExpirationOrRetestDate < today)
            throw Invalid("reagent_expiration_invalid", "Expiration or retest date cannot be in the past.");
        if (request.ProducedQuantity <= 0)
            throw Invalid("reagent_quantity_invalid", "Enter the positive amount produced.");
        Execute(() => run.Complete(actor.User.Id, DateTime.UtcNow));
        Execute(() => lot.CompleteInternalProduction(request.ProducedQuantity,
            request.ExpirationOrRetestDate));
        var uses = await dbContext.LabReagentMaterialUses.AsNoTracking()
            .Where(item => item.RunId == id).ToListAsync(ct);
        foreach (var group in uses.GroupBy(item => new { item.SourceMaterialLotId, item.QuantityUnit }))
            dbContext.LabPreparedReagentComponents.Add(new(lot.Id,
                group.Key.SourceMaterialLotId, group.Sum(item => item.Quantity), group.Key.QuantityUnit));
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await ReadReagentRunsAsync([run], ct)).Single();
    }

    [HttpPost("reagent-runs/{id:guid}/abandon")]
    public async Task<LabReagentRunDto> AbandonReagentRun(Guid id,
        [FromBody] AbandonLabReagentRunRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct,
            LabRole.Supervisor, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"reagent-run:{id}", ct);
        var run = await RequireReagentRunAsync(id, request.Version, ct);
        Execute(() => run.Abandon(request.Reason, actor.User.Id, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await ReadReagentRunsAsync([run], ct)).Single();
    }

    private async Task<LabReagentManufacturingRun> RequireReagentRunAsync(
        Guid id, long version, CancellationToken ct)
    {
        var run = await dbContext.LabReagentManufacturingRuns.SingleOrDefaultAsync(
            item => item.Id == id, ct) ?? throw Missing();
        EnsureVersion(run.Version, version);
        return run;
    }

    private async Task RequireUniqueReagentWorkflowNameAsync(string name, Guid? exceptId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(name)) return;
        var normalized = name.Trim().ToUpperInvariant();
        await SampleShippingPackingData.LockAsync(dbContext,
            $"reagent-workflow-name:{normalized}", ct);
        if (await dbContext.LabReagentWorkflows.AsNoTracking().AnyAsync(item =>
            item.Id != exceptId && item.Name.ToUpper() == normalized, ct))
            throw Conflict("reagent_workflow_name_exists",
                "A reagent workflow with this name already exists.");
    }

    private static LabReagentWorkflowDto MapReagentWorkflow(LabReagentWorkflow workflow,
        IReadOnlyDictionary<Guid, LabMaterialDefinition> definitions) =>
        new(workflow.Id, workflow.Name, workflow.MaterialDefinitionId,
            definitions[workflow.MaterialDefinitionId].Name,
            definitions[workflow.MaterialDefinitionId].DefaultQuantityUnit,
            workflow.Steps(),
            workflow.Revision, workflow.Status.ToString(), workflow.AuthoredByUserId,
            workflow.ApprovedByUserId, workflow.ApprovedAtUtc,
            workflow.ApprovalOverrideReason, workflow.Version);

    private async Task<IReadOnlyList<LabReagentRunDto>> ReadReagentRunsAsync(
        IReadOnlyList<LabReagentManufacturingRun> runs, CancellationToken ct)
    {
        if (runs.Count == 0) return [];
        var runIds = runs.Select(item => item.Id).ToArray();
        var lotIds = runs.Select(item => item.MaterialLotId).ToArray();
        var recordedSteps = await dbContext.LabReagentRunSteps.AsNoTracking()
            .Where(item => runIds.Contains(item.RunId)).ToListAsync(ct);
        var uses = await dbContext.LabReagentMaterialUses.AsNoTracking()
            .Where(item => runIds.Contains(item.RunId)).OrderBy(item => item.RecordedAtUtc).ToListAsync(ct);
        var sourceIds = uses.Select(item => item.SourceMaterialLotId).ToArray();
        var lots = await dbContext.LabMaterialLots.AsNoTracking()
            .Where(item => lotIds.Contains(item.Id) || sourceIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, ct);
        var definitionIds = lots.Values.Select(item => item.MaterialDefinitionId).Distinct().ToArray();
        var definitions = await dbContext.LabMaterialDefinitions.AsNoTracking()
            .Where(item => definitionIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, ct);
        var locationIds = lots.Values.Where(item => lotIds.Contains(item.Id))
            .Select(item => item.StorageLocationId).Distinct().ToArray();
        var locations = await dbContext.LabStorageLocations.AsNoTracking()
            .Where(item => locationIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, ct);
        return runs.Select(run =>
        {
            var lot = lots[run.MaterialLotId];
            var steps = run.Steps();
            return new LabReagentRunDto(run.Id, run.WorkflowId, run.WorkflowRevision,
                run.WorkflowName, lot.Id, definitions[lot.MaterialDefinitionId].Name,
                lot.LotNumber, lot.StorageLocationId, locations[lot.StorageLocationId].Name,
                lot.QuantityUnit, lot.AvailableQuantity, lot.QcDisposition.ToString(),
                run.Status.ToString(), steps,
                recordedSteps.Where(item => item.RunId == run.Id).OrderBy(item => item.Sequence)
                    .Select(item => new LabReagentRunStepDto(item.Sequence, item.StepKey,
                        steps[item.Sequence].Name, steps[item.Sequence].Instructions,
                        item.Notes, item.PerformedByUserId, item.PerformedAtUtc)).ToList(),
                uses.Where(item => item.RunId == run.Id).Select(item =>
                {
                    var source = lots[item.SourceMaterialLotId];
                    return new LabReagentUseDto(item.Id, source.Id,
                        definitions[source.MaterialDefinitionId].Name, source.LotNumber,
                        item.Quantity, item.QuantityUnit, item.MaterialExhausted,
                        item.RecordedByUserId, item.RecordedAtUtc);
                }).ToList(), run.StartedByUserId, run.StartedAtUtc,
                run.FinishedByUserId, run.FinishedAtUtc, run.AbandonmentReason, run.Version);
        }).ToList();
    }
}
