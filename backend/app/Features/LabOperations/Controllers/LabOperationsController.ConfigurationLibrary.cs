namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;

public sealed record LabConfigurationLibraryItem(string Kind, Guid RecordId, string Revision, string Name,
    IReadOnlyList<LabProtocolStepDefinition> Steps);

public sealed partial class LabOperationsController
{
    [HttpGet("configuration-library")]
    public async Task<IReadOnlyList<LabConfigurationLibraryItem>> ReadConfigurationLibrary(string context, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        var result = new List<LabConfigurationLibraryItem>();
        switch (context) {
            case "library":
                var ids = await dbContext.LabProtocols.AsNoTracking().Where(p => p.RetiredAtUtc == null).Select(p => p.Id).ToArrayAsync(ct);
                var protocols = await dbContext.LabProtocols.AsNoTracking().Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct);
                foreach (var v in await dbContext.LabProtocolVersions.AsNoTracking().Where(v => ids.Contains(v.LabProtocolId)
                    && (v.Status == LabProtocolStatus.Approved || v.Status == LabProtocolStatus.Active)).ToArrayAsync(ct))
                    result.Add(new(context, v.LabProtocolId, v.ProtocolVersion.ToString(), protocols[v.LabProtocolId].Name,
                        LabProtocolDefinition.Parse(v.DefinitionJson).Steps));
                break;
            case "masterMix":
                foreach (var w in await dbContext.LabMasterMixWorkflows.AsNoTracking().Where(w => w.Status != LabMasterMixWorkflowStatus.Retired).ToArrayAsync(ct))
                    foreach (var v in w.Revisions().Where(v => v.ApprovedAtUtc.HasValue))
                        result.Add(new(context, w.Id, v.Revision.ToString(), v.Name, v.Steps));
                break;
            case "reagent":
                foreach (var w in await dbContext.LabReagentWorkflows.AsNoTracking().Where(w => w.Status != LabReagentWorkflowStatus.Retired).ToArrayAsync(ct))
                    foreach (var v in w.Revisions().Where(v => v.ApprovedAtUtc.HasValue))
                        result.Add(new(context, w.Id, v.Revision.ToString(), v.Name,
                            v.Steps.Select(s => PlainInstruction(s.Key, s.Name, s.Instructions, s.Illustrations, s.CopiedFrom)).ToArray()));
                break;
            case "kit":
                var kits = await dbContext.LabKitAssemblyWorkflows.AsNoTracking().ToDictionaryAsync(w => w.Id, ct);
                foreach (var v in await dbContext.LabKitAssemblyWorkflowRevisions.AsNoTracking().Where(v => v.Status == LabKitAssemblyRevisionStatus.Approved).ToArrayAsync(ct))
                    result.Add(new(context, v.WorkflowId, v.Revision.ToString(), kits[v.WorkflowId].Name,
                        v.Steps().Select(s => PlainInstruction(s.StepKey.ToString("D"), s.Name, s.Instructions, s.Illustrations, s.CopiedFrom)).ToArray()));
                break;
            default: throw Invalid("procedure_context_invalid", "Choose library, masterMix, reagent or kit.");
        }
        return result.OrderBy(r => r.Name).ThenBy(r => r.Revision).ToArray();
    }

    private static LabProtocolStepDefinition PlainInstruction(string key, string name, string text,
        IReadOnlyList<LabInstructionIllustration>? images, LabInstructionSource? source) => new() {
        Key = key, Name = name, Instructions = text, Illustrations = images, CopiedFrom = source,
        Required = true, Repeatable = false, OperatorConfirmation = true, Captures = [],
        InputMaterials = [], PreparedOutputs = [], EquipmentTypes = [],
    };

    private async Task RequireInstructionSourceAsync(LabInstructionSource? source, string context, CancellationToken ct)
    {
        Execute(() => LabInstructionSource.Validate(source));
        if (source is null) return;
        if (source.Kind != context) throw Invalid("procedure_source_context_invalid", "Copy from an approved procedure in the same scientific context.");
        var revision = int.Parse(source.Revision);
        var found = false;
        switch (context)
        {
            case "library":
                var protocol = await dbContext.LabProtocolVersions.AsNoTracking().SingleOrDefaultAsync(v => v.LabProtocolId == source.RecordId && v.ProtocolVersion == revision && v.ApprovedAtUtc != null, ct);
                found = protocol is not null && LabProtocolDefinition.Parse(protocol.DefinitionJson).Steps.Any(s => s.Key == source.StepKey);
                break;
            case "masterMix":
                var mix = await dbContext.LabMasterMixWorkflows.AsNoTracking().SingleOrDefaultAsync(w => w.Id == source.RecordId, ct);
                found = mix?.Revisions().Any(v => v.Revision == revision && v.ApprovedAtUtc.HasValue && v.Steps.Any(s => s.Key == source.StepKey)) == true;
                break;
            case "reagent":
                var reagent = await dbContext.LabReagentWorkflows.AsNoTracking().SingleOrDefaultAsync(w => w.Id == source.RecordId, ct);
                found = reagent?.Revisions().Any(v => v.Revision == revision && v.ApprovedAtUtc.HasValue && v.Steps.Any(s => s.Key == source.StepKey)) == true;
                break;
            case "kit":
                var kit = await dbContext.LabKitAssemblyWorkflowRevisions.AsNoTracking().SingleOrDefaultAsync(v => v.WorkflowId == source.RecordId && v.Revision == revision && v.ApprovedAtUtc != null, ct);
                found = kit is not null && kit.Steps().Any(s => s.StepKey.ToString("D") == source.StepKey);
                break;
        }
        if (!found) throw Invalid("procedure_source_unavailable", "The copied instruction must refer to a retained approved source occurrence.");
    }
}
