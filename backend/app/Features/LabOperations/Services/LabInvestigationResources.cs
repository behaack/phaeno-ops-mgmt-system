namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

/// <summary>Read-only expansion of exact preparation coverage and structured reagent ancestry.</summary>
internal sealed class LabInvestigationResources(PSeqOperationsDbContext db)
{
    private static bool MissingMixEquipment(LabMasterMixPreparation mix, IReadOnlyList<LabMasterMixStepRecord> records)
    {
        var steps = mix.Steps();
        for (var sequence = 0; sequence < steps.Count; sequence++)
        {
            var fields = steps[sequence].Captures.Where(f => f.Type == "equipment").Select(f => f.Key).ToArray();
            if (fields.Length == 0) continue;
            var saved = records.Where(r => r.PreparationId == mix.Id && r.Sequence == sequence)
                .Select(r => JsonSerializer.Deserialize<LabProtocolStepRecord>(r.EvidenceJson, JsonSerializerOptions.Web)!).ToArray();
            if (saved.Length == 0 || saved.Any(r => r.Outcome != "skipped" && fields.Any(field =>
                r.EquipmentUses?.Any(e => e.FieldKey == field && e.EquipmentId != Guid.Empty && !string.IsNullOrWhiteSpace(e.ResourceSnapshotJson)) != true))) return true;
        }
        return false;
    }
    internal sealed record Binding(LabPreparationRecord Record, LabInvestigationResourceScope.Use Use);
    internal sealed record ReadResult(IReadOnlyCollection<Guid> Actors, bool HasResources, bool UnknownSnapshots,
        IReadOnlySet<Guid> MaterialUseIds, IReadOnlySet<Guid> EquipmentUseIds);

    private static async Task<List<T>> Bounded<T>(IQueryable<T> query, int limit, string section,
        List<string> limited, CancellationToken ct)
    {
        var rows = await query.Take(limit + 1).ToListAsync(ct);
        if (rows.Count > limit) { if (!limited.Contains(section)) limited.Add(section); rows.RemoveAt(limit); }
        return rows;
    }

    internal async Task<List<Binding>> BindingsAsync(IQueryable<LabSpecimenAttempt> attempts,
        int limit, List<string> limited, CancellationToken ct)
    {
        var members = await Bounded((from member in db.LabPreparationMembers.AsNoTracking()
            join attempt in attempts on member.LabSpecimenAttemptId equals attempt.Id
            orderby member.Id select new { Member = member, attempt.LabSpecimenId }), limit, "preparationResources", limited, ct);
        if (members.Count == 0) return [];
        var batchIds = members.Select(m => m.Member.LabPreparationBatchId).Distinct().ToArray();
        var records = await Bounded(db.LabPreparationRecords.AsNoTracking().Where(r => batchIds.Contains(r.LabPreparationBatchId)
            && (r.Action == "step" || r.Action == "material" || r.Action == "equipment"))
            .OrderBy(r => r.RecordedAtUtc).ThenBy(r => r.Id), limit, "preparationResources", limited, ct);
        var commands = records.ToDictionary(r => r.Id, LabInvestigationResourceScope.Command);
        var stageIds = commands.Values.Where(c => c.Action == "step" && c.Step is not null).Select(c => c.Step!.StageId).Distinct().ToArray();
        var stages = await db.LabServiceWorkflowStages.AsNoTracking().Where(s => stageIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, ct);
        var protocolIds = stages.Values.Select(s => s.LabProtocolVersionId).Distinct().ToArray();
        var protocols = await db.LabProtocolVersions.AsNoTracking().Where(p => protocolIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct);
        var memberAttempts = members.Select(m => m.Member.LabSpecimenAttemptId).Distinct().ToArray();
        var executions = await Bounded(db.LabProtocolExecutions.AsNoTracking().Where(e => memberAttempts.Contains(e.LabSpecimenAttemptId!.Value))
            .OrderBy(e => e.Id), limit, "preparationResources", limited, ct);
        var evidence = executions.SelectMany(e => LabProtocolEvidence.Read(e.CapturedResultsJson).Records
            .Where(r => r.PreparationRecordId.HasValue && r.Outcome != "skipped")
            .Select(r => (AttemptId: e.LabSpecimenAttemptId!.Value, RecordId: r.PreparationRecordId!.Value,
                StageId: e.LabServiceWorkflowStageId ?? Guid.Empty, ProtocolId: e.LabProtocolVersionId, r.StepKey))).ToHashSet();
        var result = new List<Binding>();
        var membersById = members.ToDictionary(m => m.Member.Id);
        foreach (var record in records)
        {
            var command = commands[record.Id];
            LabProtocolStepDefinition? step = null;
            if (command.Step is { } input && stages.TryGetValue(input.StageId, out var stage)
                && protocols.TryGetValue(stage.LabProtocolVersionId, out var protocol))
                step = LabProtocolDefinition.Parse(protocol.DefinitionJson).Steps.SingleOrDefault(s => s.Key == input.StepKey);
            var coveredIds = command.Action == "step" ? command.Step?.CoveredMemberIds : command.CoveredMemberIds;
            foreach (var memberId in coveredIds ?? [])
            {
                if (!membersById.TryGetValue(memberId, out var member) || member.Member.LabPreparationBatchId != record.LabPreparationBatchId) continue;
                var hasEvidence = command.Step is { } stepInput && stages.TryGetValue(stepInput.StageId, out var savedStage)
                    && evidence.Contains((member.Member.LabSpecimenAttemptId, record.Id, savedStage.Id, savedStage.LabProtocolVersionId, stepInput.StepKey));
                // An incomplete source must not turn into a guessed exposure or a complete report.
                if (command.Action == "step" && !hasEvidence
                    && limited.Contains("preparationResources")) continue;
                foreach (var use in LabInvestigationResourceScope.Resolve(record, command, member.LabSpecimenId,
                    member.Member.Id, step, hasEvidence))
                {
                    if (result.Count == limit)
                    {
                        if (!limited.Contains("preparationResources")) limited.Add("preparationResources");
                        return result;
                    }
                    result.Add(new(record, use));
                }
            }
        }
        return result;
    }

    public async Task<ReadResult> ReadAsync(Guid workId, Guid specimenId,
        Dictionary<string, object> evidence, List<string> limited, int limit, CancellationToken ct)
    {
        var bindings = await BindingsAsync(db.LabSpecimenAttempts.AsNoTracking().Where(a => a.LabWorkOrderId == workId
            && a.LabSpecimenId == specimenId), limit, limited, ct);
        var recordIds = bindings.Select(b => b.Record.Id).Distinct().ToArray();
        var materials = await Bounded(db.LabMaterialConsumptions.AsNoTracking().Where(u => u.LabPreparationRecordId.HasValue
            && recordIds.Contains(u.LabPreparationRecordId.Value)).OrderBy(u => u.Id), limit, "preparationResources", limited, ct);
        var equipment = await Bounded(db.LabEquipmentUsages.AsNoTracking().Where(u => u.LabPreparationRecordId.HasValue
            && recordIds.Contains(u.LabPreparationRecordId.Value)).OrderBy(u => u.Id), limit, "preparationResources", limited, ct);
        materials = materials.Where(u => bindings.Any(b => b.Record.Id == u.LabPreparationRecordId
            && b.Use.Kind == "material" && b.Use.ResourceId == u.LabMaterialLotId)).ToList();
        equipment = equipment.Where(u => bindings.Any(b => b.Record.Id == u.LabPreparationRecordId
            && b.Use.Kind == "equipment" && b.Use.ResourceId == u.LabEquipmentId && b.Use.RunReference == u.RunReference)).ToList();
        var mixUses = await Bounded(db.LabMasterMixTrayUses.AsNoTracking().Where(u => recordIds.Contains(u.LabPreparationRecordId))
            .OrderBy(u => u.Id), limit, "preparationResources", limited, ct);
        evidence["preparationResources"] = bindings.GroupBy(b => (b.Record.Id, b.Use.Kind, b.Use.ResourceId))
            .Select(group =>
            {
                var first = group.First();
                var materialUses = materials.Where(u => u.LabPreparationRecordId == group.Key.Id && u.LabMaterialLotId == group.Key.ResourceId).ToArray();
                var equipmentUses = equipment.Where(u => u.LabPreparationRecordId == group.Key.Id && u.LabEquipmentId == group.Key.ResourceId
                    && group.Any(b => b.Use.RunReference == u.RunReference)).ToArray();
                var mixes = mixUses.Where(u => u.LabPreparationRecordId == group.Key.Id && u.PreparationId == group.Key.ResourceId
                    && group.Any(b => b.Use.FieldKey == u.FieldKey)).ToArray();
                return new
                {
                    id = $"{group.Key.Id:N}:{group.Key.Kind}:{group.Key.ResourceId:N}", labPreparationRecordId = group.Key.Id,
                    title = first.Use.Label,
                    first.Record.LabPreparationBatchId, resourceType = group.Key.Kind, group.Key.ResourceId,
                    first.Record.ActorUserId, first.Record.RecordedAtUtc,
                    sampleUses = group.Select(b => new { b.Use.MemberId, b.Use.StepKey, b.Use.FieldKey, b.Use.Label,
                        b.Use.Quantity, quantityUnit = b.Use.Unit, b.Use.QuantityScope, b.Use.AmountUnknown, b.Use.ExceptionReason, b.Use.RunReference }).ToArray(),
                    physicalQuantity = limited.Contains("preparationResources") || group.Key.Kind == "equipment" ? (decimal?)null
                        : group.Key.Kind == "masterMix" ? mixes.Length == 0 ? null : mixes.Where(u => u.VoidedAtUtc is null).Sum(u => u.Quantity)
                        : materialUses.Length == 0 ? null : materialUses.Sum(u => u.Quantity),
                    physicalQuantityUnit = group.Key.Kind == "masterMix" ? mixes.FirstOrDefault()?.QuantityUnit : materialUses.FirstOrDefault()?.QuantityUnit,
                    physicalQuantityScope = "Total recorded for this resource across the saved preparation command; not an individual sample allocation.",
                    recordedMaterialUses = materialUses.Select(u => new { u.Id, u.RecordedAtUtc, u.RecordedByUserId, u.ResourceSnapshotJson }).ToArray(),
                    recordedEquipmentUses = equipmentUses.Select(u => new { u.Id, u.UsedAtUtc, u.UsedByUserId, u.RunReference, u.ResourceSnapshotJson }).ToArray(),
                    recordedMixUses = mixes.Select(u => new { u.Id, u.FieldKey, u.RecordedAtUtc, u.RecordedByUserId, u.VoidedAtUtc, u.VoidedByUserId }).ToArray()
                };
            }).ToArray();
        var mixIds = bindings.Where(b => b.Use.Kind == "masterMix").Select(b => b.Use.ResourceId).Distinct().ToArray();
        var mixes = await Bounded(db.LabMasterMixPreparations.AsNoTracking().Where(m => mixIds.Contains(m.Id)).OrderBy(m => m.Id), limit, "masterMixes", limited, ct);
        var ingredients = await Bounded(db.LabMasterMixIngredientUses.AsNoTracking().Where(u => mixIds.Contains(u.PreparationId))
            .OrderBy(u => u.RecordedAtUtc).ThenBy(u => u.Id), limit, "masterMixes", limited, ct);
        var mixSteps = await Bounded(db.LabMasterMixStepRecords.AsNoTracking().Where(s => mixIds.Contains(s.PreparationId)).OrderBy(s => s.PerformedAtUtc).ThenBy(s => s.Id), limit, "masterMixes", limited, ct);
        var mixStepIds = mixSteps.Select(s => s.Id).ToArray();
        var mixReviews = await Bounded(db.Set<LabMasterMixPerformanceDecision>().AsNoTracking().Where(d => mixStepIds.Contains(d.Id)).OrderBy(d => d.ReviewedAtUtc), limit, "masterMixes", limited, ct);
        evidence["masterMixes"] = mixes.Select(m => new { m.Id, m.Barcode, m.WorkflowId, m.WorkflowRevision, m.WorkflowName,
            m.StartedByUserId, m.StartedAtUtc, m.PreparedByUserId, m.PreparedAtUtc,
            procedure = m.Steps(), equipmentAvailability = MissingMixEquipment(m, mixSteps) ? "Unknown: original equipment conditions were not captured." : "Frozen equipment evidence is retained on the recorded steps; no equipment use is inferred.",
            stepPerformance = mixSteps.Where(s => s.PreparationId == m.Id).Select(s => new { s.Id, s.Sequence, evidence = System.Text.Json.JsonSerializer.Deserialize<LabProtocolStepRecord>(s.EvidenceJson, System.Text.Json.JsonSerializerOptions.Web) }),
            performanceReviews = mixReviews.Where(d => mixSteps.Any(s => s.PreparationId == m.Id && s.Id == d.Id)),
            ingredients = ingredients.Where(u => u.PreparationId == m.Id).Select(u => new { u.Id, u.SourceMaterialLotId,
                u.Quantity, u.QuantityUnit, u.StepSequence, u.FieldKey, u.RecordedByUserId, u.RecordedAtUtc, u.VoidedAtUtc,
                u.VoidedByUserId, u.ResourceSnapshotJson,
                historicalCondition = u.ResourceSnapshotJson == null ? "Unknown: no lot-condition snapshot was recorded at ingredient withdrawal."
                    : "Frozen lot conditions at ingredient withdrawal; later QC and catalog changes do not rewrite this evidence." }).ToArray() }).ToArray();
        var directLots = await db.LabMaterialConsumptions.AsNoTracking().Where(u => db.LabProtocolExecutions.Any(e => e.Id == u.LabProtocolExecutionId
            && e.LabWorkOrderId == workId && e.LabSpecimenId == specimenId)).Select(u => u.LabMaterialLotId).Distinct().ToArrayAsync(ct);
        var lotIds = bindings.Where(b => b.Use.Kind == "material").Select(b => b.Use.ResourceId)
            .Concat(ingredients.Select(u => u.SourceMaterialLotId)).Concat(directLots).Distinct().ToHashSet();
        var components = new List<LabPreparedReagentComponent>();
        var frontier = lotIds.ToArray();
        for (var depth = 0; frontier.Length > 0; depth++)
        {
            if (depth == 100) { limited.Add("reagentComponents"); break; }
            var next = await Bounded(db.LabPreparedReagentComponents.AsNoTracking().Where(c => frontier.Contains(c.PreparedMaterialLotId))
                .OrderBy(c => c.Id), Math.Max(0, limit - components.Count), "reagentComponents", limited, ct);
            components.AddRange(next);
            frontier = next.Select(c => c.ComponentMaterialLotId).Where(lotIds.Add).ToArray();
            if (limited.Contains("reagentComponents")) break;
        }
        var lots = await Bounded(db.LabMaterialLots.AsNoTracking().Where(l => lotIds.Contains(l.Id)).OrderBy(l => l.Id), limit, "reagentComponents", limited, ct);
        var withdrawals = await Bounded((from run in db.LabReagentManufacturingRuns.AsNoTracking()
            join use in db.LabReagentMaterialUses.AsNoTracking() on run.Id equals use.RunId
            where lotIds.Contains(run.MaterialLotId)
            orderby use.RecordedAtUtc, use.Id
            select new { run.MaterialLotId, use.Id, use.SourceMaterialLotId, use.Quantity, use.QuantityUnit,
                use.RecordedByUserId, use.RecordedAtUtc, use.ResourceSnapshotJson }), limit, "reagentComponents", limited, ct);
        evidence["reagentComponents"] = components.Select(c => new { c.Id, c.PreparedMaterialLotId, c.ComponentMaterialLotId,
            c.Quantity, c.QuantityUnit,
            withdrawals = withdrawals.Where(u => u.MaterialLotId == c.PreparedMaterialLotId && u.SourceMaterialLotId == c.ComponentMaterialLotId).ToArray(),
            historicalCondition = withdrawals.Any(u => u.MaterialLotId == c.PreparedMaterialLotId && u.SourceMaterialLotId == c.ComponentMaterialLotId)
                && withdrawals.Where(u => u.MaterialLotId == c.PreparedMaterialLotId && u.SourceMaterialLotId == c.ComponentMaterialLotId).All(u => u.ResourceSnapshotJson != null)
                ? "Frozen original withdrawals; current component QC is not historical preparation evidence."
                : "Unknown: one or more original component conditions were not captured." }).ToArray();
        evidence["resourceLots"] = lots.Select(l => new { l.Id, title = l.LotNumber, l.LotNumber, l.MaterialDefinitionId, l.SupplierId, l.SupplierProductId }).ToArray();
        var actors = bindings.Select(b => b.Record.ActorUserId).Concat(ingredients.Select(u => u.RecordedByUserId)).Concat(withdrawals.Select(u => u.RecordedByUserId))
            .Concat(mixSteps.SelectMany(s => { var performance = System.Text.Json.JsonSerializer.Deserialize<LabProtocolStepRecord>(s.EvidenceJson, System.Text.Json.JsonSerializerOptions.Web)?.Performance; return new[] { s.PerformedByUserId }.Concat(performance is null ? [] : new[] { performance.PerformedByUserId }).Concat((performance?.Participants ?? []).Select(p => p.UserId)); }))
            .Concat(mixReviews.Select(d => d.ReviewedByUserId))
            .Concat(mixes.Select(m => m.StartedByUserId)).Concat(mixes.Where(m => m.PreparedByUserId.HasValue).Select(m => m.PreparedByUserId!.Value)).Distinct().ToArray();
        var unknown = materials.Any(u => u.ResourceSnapshotJson is null) || equipment.Any(u => u.ResourceSnapshotJson is null)
            || ingredients.Any(u => u.ResourceSnapshotJson == null)
            || mixes.Any(m => !ingredients.Any(u => u.PreparationId == m.Id) || MissingMixEquipment(m, mixSteps))
            || components.Any(c => !withdrawals.Any(u => u.MaterialLotId == c.PreparedMaterialLotId && u.SourceMaterialLotId == c.ComponentMaterialLotId)
                || withdrawals.Any(u => u.MaterialLotId == c.PreparedMaterialLotId && u.SourceMaterialLotId == c.ComponentMaterialLotId && u.ResourceSnapshotJson == null))
            || bindings.Any(b => b.Use.Kind == "material" && !materials.Any(u => u.LabPreparationRecordId == b.Record.Id && u.LabMaterialLotId == b.Use.ResourceId)
                || b.Use.Kind == "equipment" && !equipment.Any(u => u.LabPreparationRecordId == b.Record.Id && u.LabEquipmentId == b.Use.ResourceId && u.RunReference == b.Use.RunReference));
        return new(actors, bindings.Count > 0, unknown, materials.Select(u => u.Id).ToHashSet(), equipment.Select(u => u.Id).ToHashSet());
    }

    public async Task<IReadOnlyCollection<Guid>> RelatedAsync(Guid organizationId, string kind, string reference, CancellationToken ct)
    {
        const int limit = 10000;
        var limited = new List<string>();
        var lotIds = (await Bounded(db.LabMaterialLots.AsNoTracking().Where(l => kind == "lot" && l.LotNumber == reference)
            .OrderBy(l => l.Id).Select(l => l.Id), limit, "exposure", limited, ct)).ToHashSet();
        var frontier = lotIds.ToArray();
        for (var depth = 0; frontier.Length > 0; depth++)
        {
            if (depth == 100) { limited.Add("exposure"); break; }
            var parents = await Bounded(db.LabPreparedReagentComponents.AsNoTracking().Where(c => frontier.Contains(c.ComponentMaterialLotId))
                .OrderBy(c => c.Id).Select(c => c.PreparedMaterialLotId), limit, "exposure", limited, ct);
            frontier = parents.Where(lotIds.Add).ToArray();
            if (lotIds.Count > limit) { limited.Add("exposure"); break; }
        }
        var mixIds = await Bounded(db.LabMasterMixIngredientUses.AsNoTracking().Where(u => lotIds.Contains(u.SourceMaterialLotId)
            && u.VoidedAtUtc == null).OrderBy(u => u.Id).Select(u => u.PreparationId), limit, "exposure", limited, ct);
        var equipmentIds = await Bounded(db.LabEquipment.AsNoTracking().Where(e => kind == "equipment" && e.AssetCode == reference)
            .OrderBy(e => e.Id).Select(e => e.Id), limit, "exposure", limited, ct);
        if (limited.Count == 0 && (kind == "lot" ? lotIds.Count == 0 : equipmentIds.Count == 0)) return [];
        var attempts = db.LabSpecimenAttempts.AsNoTracking().Where(a => db.LabWorkOrders.Any(w => w.Id == a.LabWorkOrderId && w.SubmittingOrganizationId == organizationId));
        var bindings = await BindingsAsync(attempts, limit, limited, ct);
        if (kind == "equipment")
        {
            var usedMixIds = bindings.Where(b => b.Use.Kind == "masterMix").Select(b => b.Use.ResourceId).Distinct().ToArray();
            var usedMixes = await Bounded(db.LabMasterMixPreparations.AsNoTracking().Where(m => usedMixIds.Contains(m.Id)).OrderBy(m => m.Id), limit, "exposure", limited, ct);
            var usedSteps = await Bounded(db.LabMasterMixStepRecords.AsNoTracking().Where(s => usedMixIds.Contains(s.PreparationId)).OrderBy(s => s.Id), limit, "exposure", limited, ct);
            var activeMixIds = await Bounded(db.LabMasterMixTrayUses.AsNoTracking().Where(u => usedMixIds.Contains(u.PreparationId) && u.VoidedAtUtc == null)
                .Select(u => u.PreparationId).Distinct().Order(), limit, "exposure", limited, ct);
            if (usedMixes.Any(m => activeMixIds.Contains(m.Id) && MissingMixEquipment(m, usedSteps)))
                throw new OrderManagementException("investigation_exposure_unknown", "Some shared mixes have unknown original equipment evidence. No complete set of affected samples can be asserted; review their original records.", 409);
            mixIds = usedSteps.Where(s => activeMixIds.Contains(s.PreparationId)
                && JsonSerializer.Deserialize<LabProtocolStepRecord>(s.EvidenceJson, JsonSerializerOptions.Web)!.EquipmentUses?.Any(e => equipmentIds.Contains(e.EquipmentId)) == true)
                .Select(s => s.PreparationId).Distinct().ToList();
        }
        var mixRecordIds = await Bounded(db.LabMasterMixTrayUses.AsNoTracking().Where(u => mixIds.Contains(u.PreparationId)
            && u.VoidedAtUtc == null).OrderBy(u => u.Id).Select(u => u.LabPreparationRecordId), limit, "exposure", limited, ct);
        var direct = await Bounded((from use in db.LabMaterialConsumptions.AsNoTracking()
            join execution in db.LabProtocolExecutions on use.LabProtocolExecutionId equals execution.Id
            join work in db.LabWorkOrders on execution.LabWorkOrderId equals work.Id
            where kind == "lot" && work.SubmittingOrganizationId == organizationId && execution.LabSpecimenId.HasValue
                && lotIds.Contains(use.LabMaterialLotId) select execution.LabSpecimenId!.Value).Distinct().Order(), limit, "exposure", limited, ct);
        if (limited.Count > 0) throw new OrderManagementException("investigation_exposure_limit",
            "This resource search exceeds the supported evidence size. No partial set of affected samples is returned.", 409);
        return direct.Concat(bindings.Where(b => kind == "equipment" ? b.Use.Kind == "equipment" && equipmentIds.Contains(b.Use.ResourceId)
                || b.Use.Kind == "masterMix" && mixIds.Contains(b.Use.ResourceId) && mixRecordIds.Contains(b.Record.Id)
            : b.Use.Kind == "material" && lotIds.Contains(b.Use.ResourceId)
                || b.Use.Kind == "masterMix" && mixIds.Contains(b.Use.ResourceId) && mixRecordIds.Contains(b.Record.Id))
            .Select(b => b.Use.SpecimenId)).Distinct().ToArray();
    }
}
