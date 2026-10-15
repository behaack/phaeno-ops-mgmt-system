namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;

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
        if (step.ProcessType == "masterMix")
        {
            try { LabMasterMixDefinition.ValidateStep(step); }
            catch (ArgumentException error) { throw Invalid("master_mix_step_invalid", error.Message); }
            await RequireMasterMixReagentsAsync(step, ct);
        }
        var captures = new List<LabProtocolCaptureDefinition>();
        foreach (var capture in step.Captures)
        {
            if (capture.Type != "material") { captures.Add(capture); continue; }
            if (string.IsNullOrWhiteSpace(capture.Unit)) throw Invalid("material_unit_required", "Define the quantity unit in the material configuration.");
            var material = capture.Material ?? throw Invalid("material_configuration_required", "Define the material in the step configuration.");
            if (new[] { material.ProductId.HasValue, material.MaterialDefinitionId.HasValue, material.MasterMixWorkflowId.HasValue }.Count(value => value) > 1)
                throw Invalid("material_identity_ambiguous", "Choose one catalog product, prepared reagent, or master-mix workflow.");
            if (capture.IncludeTracking && !material.ProductId.HasValue && !material.MaterialDefinitionId.HasValue)
                throw Invalid("material_identity_required", "Lot tracking requires a catalog product or a prepared-reagent definition.");
            if (material.MasterMixWorkflowId is Guid mixWorkflowId)
            {
                if (capture.IncludeTracking) throw Invalid("master_mix_tracking_invalid", "Master mix uses its preparation record, not an inventory lot.");
                var workflow = await dbContext.LabMasterMixWorkflows.SingleOrDefaultAsync(item =>
                    item.Id == mixWorkflowId && item.Status != LabMasterMixWorkflowStatus.Retired, ct)
                    ?? throw Invalid("master_mix_workflow_unavailable", "Choose an available master-mix workflow.");
                var revision = workflow.Revisions().SingleOrDefault(item =>
                    item.Revision == material.MasterMixWorkflowRevision && item.Status == nameof(LabMasterMixWorkflowStatus.Approved))
                    ?? throw Invalid("master_mix_revision_unavailable", "Select an approved master-mix workflow revision.");
                if (!string.Equals(capture.Unit.Trim(), revision.QuantityUnit, StringComparison.Ordinal))
                    throw Invalid("master_mix_unit_mismatch", $"Use the master-mix workflow unit ({revision.QuantityUnit}).");
                material = new(revision.Name, MasterMixWorkflowId: workflow.Id,
                    MasterMixWorkflowRevision: revision.Revision);
                // Join approval/save to the same optimistic-concurrency boundary as retirement.
                dbContext.Entry(workflow).Property(item => item.UpdatedAt).IsModified = true;
            }
            else if (material.ProductId is Guid productId)
            {
                var product = await dbContext.LabSupplierProducts.AsNoTracking().SingleOrDefaultAsync(p => p.Id == productId && p.IsActive && p.ProductTypeId != LabProductType.SequencingServiceId, ct) ?? throw Invalid("material_product_unavailable", "Select an active supplier product.");
                var supplier = await dbContext.LabSuppliers.AsNoTracking().SingleOrDefaultAsync(s => s.Id == product.SupplierId && s.IsActive, ct) ?? throw Invalid("material_vendor_unavailable", "Select a product from an active vendor.");
                if (supplier.IsInternalProducer)
                    throw Invalid("material_identity_invalid", "Choose this Phaeno product as an internally prepared reagent.");
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
        throw CatalogArchived();
    }

    [HttpPut("steps/{id:guid}")]
    public async Task<LabStepDto> UpdateLabStep(Guid id, UpdateLabStepRequest request, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.ProtocolAdministrator);
        throw CatalogArchived();
    }

    [HttpPost("steps/{id:guid}/versions")]
    public async Task<LabStepDto> SaveLabStepVersion(Guid id, SaveLabStepVersionRequest request, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.ProtocolAdministrator);
        throw CatalogArchived();
    }

    [HttpPost("steps/{id:guid}/transition")]
    public async Task<LabStepDto> TransitionLabStep(Guid id, LabStepTransitionRequest request, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.ProtocolAdministrator);
        throw CatalogArchived();
    }

    private async Task<LabProtocolDefinition> ResolveProcedureAsync(string json, CancellationToken ct, bool verifyIllustrations = false)
    {
        var definition = RequireProtocolDefinition(json);
        var resolved = new List<LabProtocolStepDefinition>();
        foreach (var entry in definition.Steps)
        {
            var step = await ResolveConfiguredMaterialsAsync(entry, ct);
            await RequireIllustrationsAsync(step.Illustrations, ct, verifyIllustrations);
            await RequireInstructionSourceAsync(step.CopiedFrom, "library", ct);
            resolved.Add(step);
        }
        return definition with { Steps = resolved };
    }
    private static PhaenoPortal.App.Features.OrderManagement.Services.OrderManagementException CatalogArchived() => Conflict("lab_step_catalog_archived",
        "The Lab-step catalog is historical. Author and approve the complete procedure in Protocols or Workflows.");

}
