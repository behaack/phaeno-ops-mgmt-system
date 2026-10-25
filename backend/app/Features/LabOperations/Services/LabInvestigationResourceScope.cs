namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

/// <summary>Resolve exposure from the saved command and pinned definition, never from display text or current tray contents.</summary>
internal static class LabInvestigationResourceScope
{
    internal sealed record Use(Guid RecordId, Guid BatchId, Guid SpecimenId, Guid MemberId, string Kind,
        Guid ResourceId, string? StepKey, string FieldKey, string Label, decimal? Quantity, string? Unit,
        string QuantityScope, bool AmountUnknown, string? ExceptionReason, string? RunReference);

    internal static LabPreparationCommand Command(LabPreparationRecord record)
    {
        try
        {
            var command = JsonSerializer.Deserialize<LabPreparationCommand>(record.DetailsJson, JsonSerializerOptions.Web);
            if (command is null || command.RequestId != record.Id || command.Action != record.Action)
                throw Invalid();
            var covered = command.Action == "step" ? command.Step?.CoveredMemberIds : command.CoveredMemberIds;
            if (command.Action == "step" && command.Step is null || covered is null || covered.Count == 0
                || covered.Contains(Guid.Empty) || covered.Count != covered.Distinct().Count()) throw Invalid();
            return command;
        }
        catch (JsonException) { throw Invalid(); }
    }

    internal static IReadOnlyList<Use> Resolve(LabPreparationRecord record, LabPreparationCommand command,
        Guid specimenId, Guid memberId, LabProtocolStepDefinition? step, bool hasStepEvidence)
    {
        if (command.Action is "material" or "equipment")
        {
            if (command.CoveredMemberIds?.Contains(memberId) != true) return [];
            if (command.ResourceId is not { } resourceId || resourceId == Guid.Empty) throw Invalid();
            return [new(record.Id, record.LabPreparationBatchId, specimenId, memberId, command.Action, resourceId,
                null, command.Action, command.Action == "material" ? "Material use" : "Equipment use", null,
                command.QuantityUnit, command.Action == "equipment" ? "Recorded equipment exposure" : "Shared command total; individual sample amount not recorded", false, null,
                command.Action == "equipment" ? Reference(command.Reason) : null)];
        }
        if (command.Action != "step") return [];
        var input = command.Step ?? throw Invalid();
        if (!input.CoveredMemberIds.Contains(memberId) || input.Action == "correct" || input.Outcome == "skipped") return [];
        if (!hasStepEvidence || step is null || step.Key != input.StepKey) throw Invalid();
        var entries = input.ResourceEntries ?? [];
        var uses = new List<Use>();
        foreach (var field in step.Captures.Where(c => c.Type is "material" or "equipment"))
        {
            var entry = field.Scope switch
            {
                "tube" => entries.SingleOrDefault(e => e.FieldKey == field.Key && e.MemberId == memberId),
                "batch" => entries.SingleOrDefault(e => e.FieldKey == field.Key && e.MemberId is null),
                "shared" => entries.SingleOrDefault(e => e.FieldKey == field.Key && e.MemberId == memberId)
                    ?? entries.SingleOrDefault(e => e.FieldKey == field.Key && e.MemberId is null),
                _ => throw Invalid()
            };
            if (entry?.ResourceId is not { } id) continue; // Untracked materials do not assert a lot identity.
            if (field.Type == "material" && !entry.AmountUnknown && entry.Quantity is not > 0) continue;
            var individual = field.Scope == "tube" || field.Scope == "shared" && entry.MemberId.HasValue
                || field.QuantityBasis != "total";
            uses.Add(new(record.Id, record.LabPreparationBatchId, specimenId, memberId,
                field.Material?.MasterMixWorkflowId.HasValue == true ? "masterMix" : field.Type,
                id, step.Key, field.Key, field.Label, individual ? entry.Quantity : null, entry.QuantityUnit,
                field.Type == "equipment" ? "Recorded equipment exposure" : individual ? "Sample amount" : "Shared field total; individual sample amount not recorded",
                entry.AmountUnknown, entry.ExceptionReason, Reference(entry.RunReference)));
        }
        return uses;
    }

    internal static OrderManagementException Invalid() => new("investigation_scope_invalid",
        "Saved preparation coverage could not be resolved. Investigate the original command before using this evidence.", 409);
    private static string? Reference(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
