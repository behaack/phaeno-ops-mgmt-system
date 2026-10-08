namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;

public sealed partial class LabOperationsController
{
    private sealed record AutomaticPreparationSkip(LabServiceWorkflowStage Stage, LabProtocolStepDefinition Step);

    private static AutomaticPreparationSkip? FindAutomaticPreparationSkip(LabPreparationBatch batch,
        IReadOnlyList<LabSpecimenAttempt> attempts, IReadOnlyList<LabProtocolExecution> executions,
        IReadOnlyList<LabServiceWorkflowStage> stages, IReadOnlyDictionary<Guid, LabProtocolVersion> protocols, IReadOnlySet<LabRole> roles)
    {
        if (batch.Status != LabBatchStatus.InProgress || !roles.Any(r => r is LabRole.Operator or LabRole.Supervisor)) return null;
        var active = attempts.Where(a => a.State is not (LabSpecimenAttemptState.Failed or LabSpecimenAttemptState.Cancelled or LabSpecimenAttemptState.Succeeded)).ToList();
        if (active.Count == 0 || active.Any(a => a.State != LabSpecimenAttemptState.InProgress)) return null;
        foreach (var stage in stages.OrderBy(s => s.Sequence))
        {
            var current = active.Select(a => executions.SingleOrDefault(e => e.LabSpecimenAttemptId == a.Id && e.LabServiceWorkflowStageId == stage.Id)).ToList();
            if (current.Any(e => e is null || e.Status is not (LabExecutionStatus.InProgress or LabExecutionStatus.Blocked))) continue;
            var definition = LabProtocolDefinition.Parse(protocols[stage.LabProtocolVersionId].DefinitionJson);
            var step = LabPreparationConditionalReview.SkippableStep(definition, current.Select(e => LabProtocolEvidence.Read(e!.CapturedResultsJson)).ToList());
            if (step is not null && (step.RequiredRole is null || roles.Contains(Enum.Parse<LabRole>(step.RequiredRole)))) return new(stage, step);
        }
        return null;
    }

    private async Task ApplyAutomaticPreparationSkipAsync(LabPreparationBatch batch, List<LabPreparationMember> members,
        List<LabSpecimenAttempt> attempts, LabPreparationCommand parent, LabOperationsActor actor, CancellationToken ct)
    {
        if (batch.Status != LabBatchStatus.InProgress) return;
        var ids = attempts.Select(a => a.Id).ToList();
        // Tracking preserves evidence from the command currently being saved in this transaction.
        var executions = await dbContext.LabProtocolExecutions.Where(e => e.LabSpecimenAttemptId.HasValue && ids.Contains(e.LabSpecimenAttemptId.Value)).ToListAsync(ct);
        var stages = await dbContext.LabServiceWorkflowStages.Where(s => s.LabServiceWorkflowVersionId == batch.LabServiceWorkflowVersionId).ToListAsync(ct);
        var protocolIds = stages.Select(s => s.LabProtocolVersionId).ToList();
        var protocols = await dbContext.LabProtocolVersions.Where(p => protocolIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct);
        var candidate = FindAutomaticPreparationSkip(batch, attempts, executions, stages, protocols, EffectiveExecutionRoles(actor));
        if (candidate is null) return;
        var covered = members.Where(m => attempts.Any(a => a.Id == m.LabSpecimenAttemptId && a.State == LabSpecimenAttemptState.InProgress)).Select(m => m.Id).ToList();
        var step = new LabPreparationStepInput(candidate.Stage.Id, candidate.Step.Key, "record", "skipped", covered,
            new Dictionary<string, JsonElement>(), [], null, LabPreparationConditionalReview.SkipReason, true, false, false);
        var command = new LabPreparationCommand(Guid.NewGuid(), parent.Version, "step", Step: step);
        await RecordPreparationStepAsync(batch, members, attempts, command, actor, ct);
        var details = JsonSerializer.SerializeToNode(command, JsonOptions)!.AsObject();
        details["automatic"] = true;
        details["triggerRequestId"] = JsonSerializer.SerializeToNode(parent.RequestId);
        dbContext.LabPreparationRecords.Add(new(command.RequestId, batch.Id, actor.User.Id, "step", PreparationHash(new { parent.RequestId, step }), details.ToJsonString(), DateTime.UtcNow));
    }
}
