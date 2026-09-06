namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;

public sealed partial class LabOperationsController
{
    [HttpGet("executions/{executionId:guid}")]
    public async Task<LabExecutionDetailDto> ReadExecution(Guid executionId, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.ProtocolAdministrator,
            LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var execution = await dbContext.LabProtocolExecutions.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == executionId, cancellationToken) ?? throw Missing();
        return await ReadExecutionDetailAsync(execution, actor, cancellationToken);
    }

    [HttpPost("executions/{executionId:guid}/steps")]
    public async Task<LabExecutionDetailDto> RecordExecutionStep(Guid executionId,
        [FromBody] RecordLabExecutionStepRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.ProtocolAdministrator,
            LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var execution = await dbContext.LabProtocolExecutions
            .SingleOrDefaultAsync(item => item.Id == executionId, cancellationToken) ?? throw Missing();
        EnsureVersion(execution.Version, request.Version);
        await RequireOpenExecutionWorkAsync(execution.LabWorkOrderId, cancellationToken);
        var protocol = await dbContext.LabProtocolVersions.AsNoTracking()
            .SingleAsync(item => item.Id == execution.LabProtocolVersionId, cancellationToken);
        var utcNow = DateTime.UtcNow;
        Execute(() => execution.RecordStep(protocol,
            new(request.StepKey, request.Action, request.Outcome, request.Captures,
                request.OperatorConfirmed, request.ResourcesConfirmed, request.QcOutcome, request.Reason),
            actor.User.Id, EffectiveExecutionRoles(actor), utcNow));
        var record = LabProtocolEvidence.Read(execution.CapturedResultsJson).Records.Last();
        dbContext.LabWorkEvents.Add(new LabWorkEvent(execution.LabWorkOrderId, execution.LabSpecimenId,
            "ExecutionStepRecorded", utcNow, actor.User.Id,
            JsonSerializer.Serialize(new { execution.Id, execution.LabProtocolVersionId, record }, JsonOptions)));
        await dbContext.SaveChangesAsync(cancellationToken);
        return await ReadExecutionDetailAsync(execution, actor, cancellationToken);
    }

    private async Task<LabExecutionDetailDto> ReadExecutionDetailAsync(LabProtocolExecution execution,
        LabOperationsActor actor, CancellationToken cancellationToken)
    {
        var protocol = await dbContext.LabProtocolVersions.AsNoTracking()
            .SingleAsync(item => item.Id == execution.LabProtocolVersionId, cancellationToken);
        var identity = await dbContext.LabProtocols.AsNoTracking()
            .SingleAsync(item => item.Id == protocol.LabProtocolId, cancellationToken);
        var work = await RequireWorkOrderAsync(execution.LabWorkOrderId, cancellationToken);
        var specimen = execution.LabSpecimenId.HasValue
            ? await dbContext.LabSpecimens.AsNoTracking().SingleAsync(
                item => item.Id == execution.LabSpecimenId, cancellationToken) : null;
        LabProtocolDefinition? definition = null;
        LabProtocolEvidence? evidence = null;
        string? recoveryMessage = null;
        try
        {
            definition = LabProtocolDefinition.Parse(protocol.DefinitionJson);
            evidence = LabProtocolEvidence.Read(execution.CapturedResultsJson);
            evidence.CompletionBlockers(definition);
        }
        catch (Exception exception) when (exception is ArgumentException or InvalidOperationException)
        {
            evidence = null;
            recoveryMessage = $"{exception.Message} Historical records remain unchanged. Ask a Protocol Administrator to create a valid new version for new work.";
        }
        var roles = EffectiveExecutionRoles(actor);
        var canOperate = actor.HasAny(LabRole.Operator, LabRole.Supervisor);
        var active = execution.Status is LabExecutionStatus.InProgress or LabExecutionStatus.Blocked;
        var workOpen = work.Status is not (LabWorkOrderStatus.OnHold or LabWorkOrderStatus.Cancelled or LabWorkOrderStatus.ReadyForRelease);
        var steps = definition is null ? [] : definition.Steps.Select(step =>
        {
            var permitted = step.RequiredRole is null ? canOperate : roles.Contains(Enum.Parse<LabRole>(step.RequiredRole));
            var prior = evidence?.Records.Where(record => record.StepKey == step.Key).ToList() ?? [];
            var precedingBlocker = definition.Steps.TakeWhile(item => item.Key != step.Key)
                .Select(item => evidence?.StepBlocker(definition, item)).FirstOrDefault(value => value is not null);
            var canRecord = workOpen && active && recoveryMessage is null && permitted && precedingBlocker is null;
            return new LabExecutionStepDto(step, prior,
                evidence?.StepBlocker(definition, step),
                canRecord && prior.Count == 0,
                canRecord && prior.Count > 0 && step.Repeatable,
                canRecord && prior.Count > 0 && roles.Contains(LabRole.Supervisor),
                !workOpen ? "The laboratory job is held or finished. Resume a held job before recording work."
                    : !permitted ? $"Requires {step.RequiredRole ?? "Operator or Supervisor"}." : precedingBlocker);
        }).ToList();
        var actorIds = evidence?.Records.Select(record => record.RecordedByUserId).Distinct().ToList() ?? [];
        var actors = await dbContext.Users.AsNoTracking().Where(user => actorIds.Contains(user.Id))
            .Select(user => new LabExecutionRecorderDto(user.Id, user.FirstName + " " + user.LastName)).ToListAsync(cancellationToken);
        var materialUse = await (
            from usage in dbContext.LabMaterialConsumptions.AsNoTracking()
            join lot in dbContext.LabMaterialLots.AsNoTracking() on usage.LabMaterialLotId equals lot.Id
            join material in dbContext.LabMaterialDefinitions.AsNoTracking() on lot.MaterialDefinitionId equals material.Id
            where usage.LabProtocolExecutionId == execution.Id
            orderby usage.RecordedAtUtc
            select new LabExecutionResourceDto(usage.Id, $"{material.Name} · {lot.LotNumber}",
                usage.Quantity + " " + usage.QuantityUnit, usage.RecordedAtUtc)).ToListAsync(cancellationToken);
        var equipmentUse = await (
            from usage in dbContext.LabEquipmentUsages.AsNoTracking()
            join equipment in dbContext.LabEquipment.AsNoTracking() on usage.LabEquipmentId equals equipment.Id
            where usage.LabProtocolExecutionId == execution.Id
            orderby usage.UsedAtUtc
            select new LabExecutionResourceDto(usage.Id, equipment.Name,
                equipment.EquipmentType + " · " + equipment.AssetCode, usage.UsedAtUtc)).ToListAsync(cancellationToken);
        var completionBlockers = recoveryMessage is null
            ? evidence!.CompletionBlockers(definition!).ToList() : new List<string> { recoveryMessage };
        if (!workOpen) completionBlockers.Insert(0, "The laboratory job is held or finished. Resume a held job before recording work.");
        return new(MapExecution(execution), work.Id, identity.Name, protocol.ProtocolVersion,
            specimen?.AccessionNumber, steps, actors, materialUse, equipmentUse,
            completionBlockers,
            recoveryMessage, workOpen && canOperate && recoveryMessage is null,
            work.Status is not (LabWorkOrderStatus.Cancelled or LabWorkOrderStatus.ReadyForRelease)
                && canOperate && execution.Status is not (LabExecutionStatus.Completed or LabExecutionStatus.Abandoned));
    }

    private static HashSet<LabRole> EffectiveExecutionRoles(LabOperationsActor actor) =>
        Enum.GetValues<LabRole>().Where(role => actor.HasAny(role)).ToHashSet();

    private async Task<LabWorkOrder> RequireOpenExecutionWorkAsync(Guid workOrderId,
        CancellationToken cancellationToken, bool allowHold = false)
    {
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        if (work.Status is LabWorkOrderStatus.Cancelled or LabWorkOrderStatus.ReadyForRelease
            || !allowHold && work.Status == LabWorkOrderStatus.OnHold)
            throw Conflict("execution_work_unavailable", "Resume a held job before recording execution work. Finished jobs cannot accept new execution evidence.");
        // Serialize evidence with job hold/closure changes through the existing concurrency token.
        dbContext.Entry(work).Property(item => item.UpdatedAt).IsModified = true;
        return work;
    }

    private static LabProtocolDefinition RequireProtocolDefinition(string json)
    {
        try { return LabProtocolDefinition.Parse(json); }
        catch (ArgumentException exception) { throw Invalid("protocol_definition_invalid", exception.Message); }
    }
}
