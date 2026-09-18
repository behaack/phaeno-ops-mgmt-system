namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;

public sealed partial class LabOperationsController
{
    [HttpGet("steps/material-products")]
    public async Task<IReadOnlyList<SupplierCatalogEntryDto>> ReadStepMaterialProducts(CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.ProtocolAdministrator);
        return await PreparationMaterialCatalogAsync(ct);
    }

    [HttpGet("steps/prepared-materials")]
    public async Task<IReadOnlyList<LabMaterialDefinitionDto>> ReadStepPreparedMaterials(CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.ProtocolAdministrator);
        return await dbContext.LabMaterialDefinitions.AsNoTracking().Where(d => d.IsActive && d.Kind == LabMaterialLotKind.PreparedReagent)
            .OrderBy(d => d.Name).Select(d => new LabMaterialDefinitionDto(d.Id, d.Key, d.Name, d.Kind.ToString(), d.IsActive)).ToListAsync(ct);
    }

    private async Task<LabProtocolStepDefinition> ResolveConfiguredMaterialsAsync(LabProtocolStepDefinition step, CancellationToken ct)
    {
        var captures = new List<LabProtocolCaptureDefinition>();
        foreach (var capture in step.Captures)
        {
            if (capture.Type != "material") { captures.Add(capture); continue; }
            if (string.IsNullOrWhiteSpace(capture.Unit)) throw Invalid("material_unit_required", "Define the quantity unit in the material configuration.");
            var material = capture.Material ?? throw Invalid("material_configuration_required", "Define the material in the step configuration.");
            if (material.ProductId.HasValue && material.MaterialDefinitionId.HasValue)
                throw Invalid("material_identity_ambiguous", "Choose either a catalog product or a prepared-reagent definition.");
            if (capture.IncludeTracking && !material.ProductId.HasValue && !material.MaterialDefinitionId.HasValue)
                throw Invalid("material_identity_required", "Lot tracking requires a catalog product or a prepared-reagent definition.");
            if (material.ProductId is Guid productId)
            {
                var product = await dbContext.LabSupplierProducts.AsNoTracking().SingleOrDefaultAsync(p => p.Id == productId && p.IsActive, ct) ?? throw Invalid("material_product_unavailable", "Select an active supplier product.");
                var supplier = await dbContext.LabSuppliers.AsNoTracking().SingleOrDefaultAsync(s => s.Id == product.SupplierId && s.IsActive, ct) ?? throw Invalid("material_vendor_unavailable", "Select a product from an active vendor.");
                if (!await dbContext.LabProductTypes.AnyAsync(t => t.Id == product.ProductTypeId && t.IsActive, ct)) throw Invalid("material_product_unavailable", "Select a product with an active type.");
                material = new(product.Description, supplier.Name, product.Id, supplier.Id, product.ProductNumber);
            }
            else if (material.MaterialDefinitionId is Guid definitionId)
            {
                var definition = await dbContext.LabMaterialDefinitions.AsNoTracking().SingleOrDefaultAsync(d => d.Id == definitionId && d.IsActive && d.Kind == LabMaterialLotKind.PreparedReagent, ct)
                    ?? throw Invalid("material_definition_unavailable", "Choose an active prepared-reagent definition.");
                material = new(definition.Name, MaterialDefinitionId: definition.Id);
            }
            captures.Add(capture with { Material = material });
        }
        return step with { Captures = captures };
    }

    [HttpGet("steps")]
    public async Task<IReadOnlyList<LabStepDto>> ReadLabSteps(CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor,
            LabRole.ProtocolAdministrator, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        return await ReadLabStepsAsync(ct);
    }

    private async Task<IReadOnlyList<LabStepDto>> ReadLabStepsAsync(CancellationToken ct)
    {
        var steps = await dbContext.LabSteps.AsNoTracking().OrderBy(s => s.Name).ToListAsync(ct);
        var versions = await dbContext.LabStepVersions.AsNoTracking().OrderBy(v => v.StepVersion).ToListAsync(ct);
        var protocols = await dbContext.LabProtocols.AsNoTracking().ToDictionaryAsync(p => p.Id, ct);
        var protocolVersions = await dbContext.LabProtocolVersions.AsNoTracking().ToListAsync(ct);
        var usage = new List<LabStepUsageDto>();
        foreach (var version in protocolVersions)
        {
            // Older stored formats must not make the catalog unreadable.
            try
            {
                foreach (var occurrence in LabProtocolDefinition.Parse(version.DefinitionJson).Steps.Where(s => s.LabStepVersionId.HasValue))
                    usage.Add(new(version.LabProtocolId, protocols[version.LabProtocolId].Name, version.Id,
                        version.ProtocolVersion, version.Status.ToString(), occurrence.Key, occurrence.LabStepVersionId!.Value));
            }
            catch (ArgumentException) { }
        }
        return steps.Select(s => new LabStepDto(s.Id, s.Key, s.Name, s.Description, s.LatestVersion, s.Version,
            s.RetiredAtUtc, s.RetirementReason,
            versions.Where(v => v.LabStepId == s.Id).Select(v => new LabStepVersionDto(v.Id, v.StepVersion,
                v.Status.ToString(), v.DefinitionJson, v.AuthoredByUserId, v.AuthoredAtUtc,
                v.ApprovedByUserId, v.ApprovedAtUtc, v.ApprovalOverrideReason)).ToList(),
            usage.Where(u => versions.Any(v => v.Id == u.StepVersionId && v.LabStepId == s.Id)).ToList())).ToList();
    }

    [HttpPost("steps")]
    public async Task<LabStepDto> CreateLabStep(CreateProtocolRequest request, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.ProtocolAdministrator);
        var keys = await dbContext.LabSteps.Select(s => s.Key).ToListAsync(ct);
        LabStep step = null!;
        Execute(() => step = new LabStep(LabIdentifierService.CreateProtocolKey(request.Name, keys), request.Name, request.Description));
        dbContext.LabSteps.Add(step);
        await dbContext.SaveChangesAsync(ct);
        return (await ReadLabStepsAsync(ct)).Single(s => s.Id == step.Id);
    }

    [HttpPost("steps/{id:guid}/versions")]
    public async Task<LabStepDto> SaveLabStepVersion(Guid id, SaveLabStepVersionRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.ProtocolAdministrator);
        var step = await dbContext.LabSteps.SingleOrDefaultAsync(s => s.Id == id, ct) ?? throw Missing();
        EnsureVersion(step.Version, request.Version);
        Execute(step.RequireCurrent);
        var draft = await dbContext.LabStepVersions.SingleOrDefaultAsync(v => v.LabStepId == id && v.Status == LabProtocolStatus.Draft, ct);
        var definition = RequireProtocolDefinition(request.DefinitionJson);
        var resolvedSteps = new List<LabProtocolStepDefinition>();
        foreach (var entry in definition.Steps) resolvedSteps.Add(await ResolveConfiguredMaterialsAsync(entry, ct));
        var definitionJson = (definition with { Steps = resolvedSteps }).ToJson();
        if (request.DraftId.HasValue)
        {
            if (draft?.Id != request.DraftId) throw Conflict("step_draft_changed", "The draft changed. Refresh before editing.");
            Execute(() => draft.UpdateDraft(definitionJson, actor.User.Id));
            dbContext.Entry(step).Property(s => s.UpdatedAt).IsModified = true;
        }
        else
        {
            if (draft is not null) throw Conflict("step_draft_exists", "Continue or discard the existing draft.");
            LabStepVersion version = null!;
            Execute(() => version = new LabStepVersion(id, step.LatestVersion + 1, definitionJson, actor.User.Id, DateTime.UtcNow));
            step.RecordVersion(version.StepVersion);
            dbContext.LabStepVersions.Add(version);
        }
        await dbContext.SaveChangesAsync(ct);
        return (await ReadLabStepsAsync(ct)).Single(s => s.Id == id);
    }

    [HttpPost("steps/{id:guid}/transition")]
    public async Task<LabStepDto> TransitionLabStep(Guid id, LabStepTransitionRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.ProtocolAdministrator);
        var step = await dbContext.LabSteps.SingleOrDefaultAsync(s => s.Id == id, ct) ?? throw Missing();
        EnsureVersion(step.Version, request.Version);
        Execute(step.RequireCurrent);
        if (request.ApprovalOverrideReason is not null && request.Action != "approve")
            throw Invalid("step_override_invalid", "An approval override applies only to approval.");
        if (request.Action == "retire") Execute(() => step.Retire(request.Reason ?? "", actor.User.Id, DateTime.UtcNow));
        else
        {
            var version = await dbContext.LabStepVersions.SingleOrDefaultAsync(v => v.Id == request.VersionId && v.LabStepId == id, ct) ?? throw Missing();
            if (request.Action == "discard") Execute(version.Discard);
            else if (request.Action == "approve")
            {
                if (request.ApprovalOverrideReason is not null)
                {
                    RequireApprovalOverrideAdministrator(actor);
                    Execute(() => version.ApproveWithOverride(actor.User.Id, DateTime.UtcNow, request.ApprovalOverrideReason));
                }
                else Execute(() => version.Approve(actor.User.Id, DateTime.UtcNow));
                // Older approved versions remain selectable exact versions; adoption is always explicit.
            }
            else throw Invalid("step_transition_invalid", "Choose approve, discard or retire.");
            dbContext.Entry(step).Property(s => s.UpdatedAt).IsModified = true;
        }
        await dbContext.SaveChangesAsync(ct);
        return (await ReadLabStepsAsync(ct)).Single(s => s.Id == id);
    }

    private async Task<LabProtocolDefinition> ResolveLabStepReferencesAsync(string json, string? previousJson, CancellationToken ct)
    {
        var definition = RequireProtocolDefinition(json);
        var previous = previousJson is null ? null : RequireProtocolDefinition(previousJson);
        var resolved = new List<LabProtocolStepDefinition>();
        foreach (var occurrence in definition.Steps)
        {
            if (occurrence.LabStepVersionId is not Guid versionId)
            {
                if (previous?.Steps.Any(s => s.Key == occurrence.Key && s.LabStepVersionId.HasValue) == true)
                    throw Invalid("step_provenance_removed", "A pinned occurrence cannot silently become an embedded step. Remove it and explicitly author a distinct step instead.");
                resolved.Add(await ResolveConfiguredMaterialsAsync(occurrence, ct)); continue;
            }
            var version = await dbContext.LabStepVersions.SingleOrDefaultAsync(v => v.Id == versionId, ct) ?? throw Missing();
            var identity = await dbContext.LabSteps.SingleAsync(s => s.Id == version.LabStepId, ct);
            var retained = previous?.Steps.Any(s => s.Key == occurrence.Key && s.LabStepVersionId == versionId) == true;
            if (version.Status != LabProtocolStatus.Approved || identity.RetiredAtUtc.HasValue && !retained)
                throw Conflict("step_version_unavailable", "Select an approved version of a current Lab step. Existing retired references can be retained.");
            Execute(version.RequireReleaseApproval);
            var source = LabProtocolDefinition.Parse(version.DefinitionJson).Steps.Single();
            var pinned = source with { Key = occurrence.Key, Required = occurrence.Required, Condition = occurrence.Condition, LabStepVersionId = versionId };
            if (JsonSerializer.Serialize(pinned, JsonOptions) != JsonSerializer.Serialize(occurrence, JsonOptions))
                throw Invalid("step_content_changed", "Pinned Lab step content cannot be overridden. Adopt a different approved version or author a new Lab step version.");
            // Participate in identity concurrency so a racing retirement cannot admit a new selection.
            dbContext.Entry(identity).Property(s => s.UpdatedAt).IsModified = true;
            resolved.Add(pinned);
        }
        return definition with { Steps = resolved };
    }
}
