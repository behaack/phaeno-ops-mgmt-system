namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record KitAssemblyStepRequest(long Version, int Sequence, string Notes);
public sealed record KitAssemblyComponentUseRequest(Guid SupplierProductId, decimal Quantity,
    Guid? SourceMaterialLotId = null);
public sealed record KitPackedContentsRequest(long Version, long StockKitVersion,
    IReadOnlyList<string> SupplierBarcodes, IReadOnlyList<KitAssemblyComponentUseRequest> Components,
    string? AssemblyNotes = null);
public sealed record KitAssemblyFinishRequest(long Version);
public sealed record KitAssemblySessionRequest(long Version, long StockKitVersion,
    IReadOnlyList<string> SupplierBarcodes, IReadOnlyList<KitAssemblyComponentUseRequest> Components,
    string? AssemblyNotes, bool Complete, IReadOnlyList<string>? VerificationBarcodes = null,
    string? ContainerBarcode = null);
public sealed record KitAssemblyAbandonRequest(long Version, string Reason);
public sealed record KitAssemblyUseDto(Guid Id, Guid SupplierProductId, Guid? SourceMaterialLotId,
    decimal Quantity, string QuantityUnit, Guid RecordedByUserId, DateTime RecordedAtUtc);
public sealed record KitAssemblyStepRecordDto(int Sequence, Guid LabStepVersionId, string Notes,
    Guid PerformedByUserId, DateTime PerformedAtUtc);
public sealed record KitAssemblyRunDto(Guid Id, Guid StockKitId, string KitNumber, string Status,
    long Version, Guid WorkflowRevisionId, IReadOnlyList<LabKitAssemblyStep> Steps,
    IReadOnlyList<KitAssemblyComponentDto> Components, IReadOnlyList<KitAssemblyUseDto> Uses,
    IReadOnlyList<KitAssemblyStepRecordDto> StepRecords, DateTime StartedAtUtc,
    DateTime? FinishedAtUtc, string? AbandonmentReason, string? DraftNotes = null,
    IReadOnlyList<string>? DraftVerificationBarcodes = null, DateTime? LabelPrintRequestedAtUtc = null,
    Guid? LabelPrintRequestedByUserId = null, DateTime? ContainerBarcodeVerifiedAtUtc = null,
    Guid? ContainerBarcodeVerifiedByUserId = null);

public sealed partial class LabOperationsController
{
    [HttpGet("kit-assembly/stock-kits/{kitId:guid}")]
    public async Task<KitAssemblyRunDto> ReadKitAssemblyRun(Guid kitId, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor,
            LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        return await MapKitAssemblyRunAsync(kitId, ct);
    }

    [HttpPost("kit-assembly/stock-kits/{kitId:guid}/steps")]
    public async Task<KitAssemblyRunDto> RecordKitAssemblyStep(Guid kitId,
        [FromBody] KitAssemblyStepRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator,
            LabRole.Supervisor, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"kit-assembly:{kitId}", ct);
        var run = await RequireKitAssemblyRunAsync(kitId, request.Version, ct);
        var steps = run.Steps();
        if (request.Sequence < 0 || request.Sequence >= steps.Count)
            throw Invalid("kit_assembly_step_invalid", "Select the next approved assembly step.");
        Execute(() => run.RecordStep(request.Sequence));
        LabKitAssemblyStepRecord record;
        try { record = new(run.Id, request.Sequence, steps[request.Sequence].LabStepVersionId,
            request.Notes, actor.User.Id, DateTime.UtcNow); }
        catch (ArgumentException error) { throw Invalid("kit_assembly_step_invalid", error.Message); }
        dbContext.LabKitAssemblyStepRecords.Add(record);
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await MapKitAssemblyRunAsync(kitId, ct);
    }

    [HttpPost("kit-assembly/stock-kits/{kitId:guid}/packed-contents")]
    public Task<KitAssemblyRunDto> RecordKitPackedContents(Guid kitId,
        [FromBody] KitPackedContentsRequest request, CancellationToken ct)
        => RecordKitPackedContentsCore(kitId, request, ct);

    [HttpPost("kit-assembly/stock-kits/{kitId:guid}/session")]
    public Task<KitAssemblyRunDto> SaveKitAssemblySession(Guid kitId,
        [FromBody] KitAssemblySessionRequest request, CancellationToken ct)
        => RecordKitPackedContentsCore(kitId, new(request.Version, request.StockKitVersion,
            request.SupplierBarcodes, request.Components, request.AssemblyNotes), ct, request);

    [HttpPost("kit-assembly/stock-kits/{kitId:guid}/print-label")]
    public async Task<KitAssemblyRunDto> RequestKitAssemblyLabelPrint(Guid kitId,
        [FromBody] KitAssemblyFinishRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator,
            LabRole.Supervisor, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"kit-assembly:{kitId}", ct);
        var run = await RequireKitAssemblyRunAsync(kitId, request.Version, ct);
        await SampleShippingPackingData.LockAsync(dbContext, $"stock-kit:{kitId}", ct);
        var kit = await dbContext.SampleShippingStockKits.SingleAsync(item => item.Id == kitId, ct);
        if (kit.WithdrawnAt.HasValue || kit.FulfilledAt.HasValue || kit.AssemblyCompletedAt.HasValue)
            throw Conflict("kit_packing_unavailable", "This assembly is no longer active.");
        Execute(() => run.RequestLabelPrint(actor.User.Id, DateTime.UtcNow));
        dbContext.Entry(run).Property(item => item.Version).IsModified = true;
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await MapKitAssemblyRunAsync(kitId, ct);
    }

    private async Task<KitAssemblyRunDto> RecordKitPackedContentsCore(Guid kitId,
        KitPackedContentsRequest request, CancellationToken ct, KitAssemblySessionRequest? session = null)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator,
            LabRole.Supervisor, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"kit-assembly:{kitId}", ct);
        var run = await RequireKitAssemblyRunAsync(kitId, request.Version, ct);
        if (run.Status != LabKitAssemblyRunStatus.InProgress)
            throw Conflict("kit_assembly_finished", "This assembly is no longer active.");
        if (request.Components is null
            || request.Components.Any(item => item is null)
            || request.Components.Select(item => item.SupplierProductId).Distinct().Count() != request.Components.Count)
            throw Invalid("kit_components_invalid", "Record at least one component, with each product listed once.");
        await SampleShippingPackingData.LockAsync(dbContext, $"stock-kit:{kitId}", ct);
        var kit = await dbContext.SampleShippingStockKits.Include(item => item.Tubes).SingleAsync(item => item.Id == kitId, ct);
        EnsureVersion(kit.Version, request.StockKitVersion);
        if (kit.WithdrawnAt.HasValue || kit.FulfilledAt.HasValue || kit.AssemblyCompletedAt.HasValue)
            throw Conflict("kit_packing_unavailable", "This kit can no longer have packed contents recorded.");
        var contents = RequiredKitContents(kit);
        var steps = run.Steps();
        if (steps.Count != 1)
            throw Conflict("kit_assembly_step_invalid", "This physical kit must use an approved workflow with one assembly step.");
        var recordedUses = await dbContext.LabKitAssemblyUses.AsNoTracking()
            .Where(item => item.RunId == run.Id).ToListAsync(ct);
        var exactContents = contents.All(line => recordedUses.Where(use => use.SupplierProductId == line.SupplierProductId).Sum(use => use.Quantity)
                + request.Components.Where(component => component.SupplierProductId == line.SupplierProductId).Sum(component => component.Quantity) == line.Quantity)
            && recordedUses.All(use => contents.Any(line => line.SupplierProductId == use.SupplierProductId))
            && request.Components.All(component => contents.Any(line => line.SupplierProductId == component.SupplierProductId));
        if (session?.Complete == true && !exactContents)
            throw Conflict("kit_bom_incomplete", "Record the exact approved quantity of every component before completion.");
        var recordStep = exactContents && run.RecordedStepCount == 0 && (session is null || session.Complete);
        if (session is null && request.Components.Count == 0 && !recordStep)
            throw Invalid("kit_components_invalid", "Record a packed component or complete the assembly step after all contents are recorded.");
        if (session is null && !recordStep && !string.IsNullOrWhiteSpace(request.AssemblyNotes))
            throw Invalid("kit_assembly_notes_unavailable", "Completion notes can be recorded once, when the exact required contents are packed.");
        if (request.AssemblyNotes?.Trim().Length > 4000)
            throw Invalid("kit_assembly_notes_invalid", "Use 4,000 characters or fewer for assembly completion notes.");
        if (request.SupplierBarcodes is { Count: > 0 })
        {
            if (!actor.IsPlatformAdmin)
                throw new OrderManagementException("platform_capability_required",
                    "Registering physical kit tubes requires a Phaeno order-management platform capability.", StatusCodes.Status403Forbidden);
            if (!request.Components.Any(item => contents.Any(line => line.SupplierProductId == item.SupplierProductId && line.Kind == "Tube")))
                throw Invalid("kit_tube_use_missing", "Record the tube component together with its barcodes.");
            await SampleShippingStockTubeRegistration.AddAsync(dbContext, kit, request.SupplierBarcodes, ct);
        }
        // Every batch acquires shared source-lot locks in the same order.
        foreach (var lotId in request.Components.Where(item => item.SourceMaterialLotId.HasValue)
            .Select(item => item.SourceMaterialLotId!.Value).Distinct().Order())
            await SampleShippingPackingData.LockAsync(dbContext, $"material-lot:{lotId}", ct);
        var now = DateTime.UtcNow;
        foreach (var component in request.Components)
        {
            var bom = contents.SingleOrDefault(item => item.SupplierProductId == component.SupplierProductId)
                ?? throw Invalid("kit_component_unapproved", "Choose a component from this physical kit's approved specification.");
            var used = recordedUses.Where(item => item.SupplierProductId == component.SupplierProductId).Sum(item => item.Quantity);
            if (component.Quantity <= 0 || used + component.Quantity > bom.Quantity)
                throw Invalid("kit_component_quantity_invalid", "Record a positive use no greater than the remaining approved component quantity.");
            if (bom.Kind == "Tube")
            {
                if (component.Quantity != kit.Tubes.Count - used)
                    throw Invalid("kit_tube_quantity_mismatch", "The tube quantity must equal the unique scanned tubes not already recorded.");
            }
            var product = await dbContext.LabSupplierProducts.AsNoTracking().SingleAsync(item => item.Id == component.SupplierProductId, ct);
            if (string.IsNullOrWhiteSpace(product.DefaultQuantityUnit))
                throw Conflict("kit_component_unit_missing", "Set the component product's inventory unit before recording use.");
            if (bom.Kind is "Tube" or "ShippingContainer"
                && (component.Quantity != decimal.Truncate(component.Quantity)
                    || !string.Equals(product.DefaultQuantityUnit, "each", StringComparison.OrdinalIgnoreCase)))
                throw Invalid("kit_component_quantity_invalid", "Count whole tubes and outer shippers in each.");
            var hasLots = await dbContext.LabMaterialLots.AsNoTracking().AnyAsync(item => item.SupplierProductId == product.Id, ct);
            if (hasLots && !component.SourceMaterialLotId.HasValue)
                throw Invalid("kit_component_lot_required", "Select the source lot for this inventory-tracked component.");
            LabMaterialLot? source = null;
            if (component.SourceMaterialLotId.HasValue)
            {
                source = await dbContext.LabMaterialLots.SingleOrDefaultAsync(item => item.Id == component.SourceMaterialLotId
                    && item.SupplierProductId == product.Id, ct)
                    ?? throw Invalid("kit_component_lot_invalid", "Choose a lot of the approved component product.");
                if (source.QcDisposition is not (LabQcDisposition.Passed or LabQcDisposition.ApprovedException)
                    || source.ExpirationOrRetestDate < DateOnly.FromDateTime(DateTime.UtcNow)
                    || !string.Equals(source.QuantityUnit, product.DefaultQuantityUnit, StringComparison.OrdinalIgnoreCase))
                    throw Conflict("kit_component_lot_unavailable", "The source lot must pass QC, be in date, and use the product's saved unit.");
            }
            if (bom.Kind == "Tube" && source is not null)
            {
                var priorLotIds = await dbContext.LabKitAssemblyUses.AsNoTracking()
                    .Where(item => item.RunId == run.Id && item.SupplierProductId == product.Id)
                    .Select(item => item.SourceMaterialLotId).Distinct().ToArrayAsync(ct);
                try { run.EnsureSingleTubeSourceLot(source.Id, priorLotIds); }
                catch (InvalidOperationException error) { throw Conflict("kit_tube_lot_mismatch", error.Message); }
                try { kit.ConfirmTubeLotNumber(source.LotNumber); }
                catch (InvalidOperationException error) { throw Conflict("kit_tube_lot_mismatch", error.Message); }
            }
            var use = new LabKitAssemblyUse(run.Id, product.Id, source?.Id, component.Quantity,
                product.DefaultQuantityUnit, actor.User.Id, now);
            if (source is not null) Execute(() => source.Consume(component.Quantity, false, use.Id, actor.User.Id, now));
            dbContext.LabKitAssemblyUses.Add(use);
        }
        if (session is not null)
        {
            var verification = session.VerificationBarcodes ?? [];
            if (verification.Count > kit.TubeCapacity || verification.Any(value => value is null || value.Length > 100))
                throw Invalid("kit_verification_invalid", "Enter no more than one complete barcode per required tube.");
            Execute(() => run.SaveDraftEvidence(request.AssemblyNotes, verification));
            if (!string.IsNullOrWhiteSpace(session.ContainerBarcode))
            {
                if (!SupplierTubeBarcode.TryNormalize(session.ContainerBarcode, out var containerCode))
                    throw Invalid("kit_label_invalid", "Scan the attached container barcode.");
                Execute(() => run.ConfirmContainerBarcode(containerCode, kit.KitNumber, actor.User.Id, now));
            }
            if (session.Complete)
            {
                Execute(run.RequireContainerLabel);
                Execute(() => kit.EnsurePhysicallyUsable(now));
                Execute(kit.EnsureCompleteTubeRoster);
                if (verification.Count > 0)
                {
                    if (!actor.IsPlatformAdmin)
                        throw new OrderManagementException("platform_capability_required",
                            "Verifying physical kit tubes requires a Phaeno order-management platform capability.", StatusCodes.Status403Forbidden);
                    var verifiedCodes = new List<string>();
                    foreach (var value in verification)
                    {
                        if (!SupplierTubeBarcode.TryNormalize(value, out var code))
                            throw Invalid("kit_verification_invalid", "Rescan a complete permanent barcode on every packed tube.");
                        verifiedCodes.Add(code);
                    }
                    if (verifiedCodes.Count != verifiedCodes.Distinct(StringComparer.Ordinal).Count())
                        throw Invalid("kit_verification_invalid", "A tube was scanned twice. Verify every physical tube once.");
                    Execute(() => kit.VerifyTubeRoster(actor.User.Id, verifiedCodes, now));
                }
            }
        }
        if (recordStep)
        {
            Execute(() => run.RecordStep(0));
            dbContext.LabKitAssemblyStepRecords.Add(new(run.Id, 0, steps[0].LabStepVersionId,
                request.AssemblyNotes, actor.User.Id, now));
        }
        if (session?.Complete == true)
        {
            Execute(() => run.Complete(actor.User.Id, now));
            Execute(() => kit.CompleteAssembly(now));
        }
        dbContext.Entry(run).Property(item => item.Version).IsModified = true;
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await MapKitAssemblyRunAsync(kitId, ct);
    }

    [HttpPost("kit-assembly/stock-kits/{kitId:guid}/complete")]
    public async Task<KitAssemblyRunDto> CompleteKitAssembly(Guid kitId,
        [FromBody] KitAssemblyFinishRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator,
            LabRole.Supervisor, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"kit-assembly:{kitId}", ct);
        var run = await RequireKitAssemblyRunAsync(kitId, request.Version, ct);
        await SampleShippingPackingData.LockAsync(dbContext, $"stock-kit:{kitId}", ct);
        var kit = await dbContext.SampleShippingStockKits.Include(item => item.Tubes)
            .SingleAsync(item => item.Id == kitId, ct);
        var bom = RequiredKitContents(kit);
        var uses = await dbContext.LabKitAssemblyUses.AsNoTracking()
            .Where(item => item.RunId == run.Id).ToListAsync(ct);
        if (bom.Any(item => uses.Where(use => use.SupplierProductId == item.SupplierProductId)
                .Sum(use => use.Quantity) != item.Quantity)
            || uses.Any(item => bom.All(line => line.SupplierProductId != item.SupplierProductId)))
            throw Conflict("kit_bom_incomplete", "Record the exact approved quantity of every component before completing assembly.");
        Execute(kit.EnsureCompleteTubeRoster);
        Execute(run.RequireContainerLabel);
        var now = DateTime.UtcNow;
        Execute(() => kit.EnsurePhysicallyUsable(now));
        Execute(() => run.Complete(actor.User.Id, now));
        Execute(() => kit.CompleteAssembly(now));
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await MapKitAssemblyRunAsync(kitId, ct);
    }

    [HttpPost("kit-assembly/stock-kits/{kitId:guid}/abandon")]
    public async Task<KitAssemblyRunDto> AbandonKitAssembly(Guid kitId,
        [FromBody] KitAssemblyAbandonRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Supervisor,
            LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"kit-assembly:{kitId}", ct);
        var run = await RequireKitAssemblyRunAsync(kitId, request.Version, ct);
        Execute(() => run.Abandon(request.Reason, actor.User.Id, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await MapKitAssemblyRunAsync(kitId, ct);
    }

    private async Task<LabKitAssemblyRun> RequireKitAssemblyRunAsync(Guid kitId, long version, CancellationToken ct)
    {
        var run = await dbContext.LabKitAssemblyRuns.SingleOrDefaultAsync(item => item.StockKitId == kitId, ct)
            ?? throw Missing();
        EnsureVersion(run.Version, version);
        return run;
    }

    private async Task<KitAssemblyRunDto> MapKitAssemblyRunAsync(Guid kitId, CancellationToken ct)
    {
        var run = await dbContext.LabKitAssemblyRuns.AsNoTracking().SingleOrDefaultAsync(item => item.StockKitId == kitId, ct)
            ?? throw Missing();
        var kit = await dbContext.SampleShippingStockKits.AsNoTracking().SingleAsync(item => item.Id == kitId, ct);
        var bom = RequiredKitContents(kit);
        var uses = await dbContext.LabKitAssemblyUses.AsNoTracking().Where(item => item.RunId == run.Id)
            .OrderBy(item => item.RecordedAtUtc).ToListAsync(ct);
        var steps = await dbContext.LabKitAssemblyStepRecords.AsNoTracking().Where(item => item.RunId == run.Id)
            .OrderBy(item => item.Sequence).ToListAsync(ct);
        return new(run.Id, kitId, kit.KitNumber, run.Status.ToString(), run.Version, run.WorkflowRevisionId,
            run.Steps(), bom.Select(item => new KitAssemblyComponentDto(item.SupplierProductId, item.Quantity,
                item.Kind, item.SupplierName, item.ProductNumber, item.ProductDescription)).ToArray(),
            uses.Select(item => new KitAssemblyUseDto(item.Id, item.SupplierProductId, item.SourceMaterialLotId,
                item.Quantity, item.QuantityUnit, item.RecordedByUserId, item.RecordedAtUtc)).ToArray(),
            steps.Select(item => new KitAssemblyStepRecordDto(item.Sequence, item.LabStepVersionId,
                item.Notes, item.PerformedByUserId, item.PerformedAtUtc)).ToArray(),
            run.StartedAtUtc, run.FinishedAtUtc, run.AbandonmentReason, run.DraftNotes,
            string.IsNullOrWhiteSpace(run.DraftVerificationJson) ? [] : JsonSerializer.Deserialize<string[]>(run.DraftVerificationJson),
            run.LabelPrintRequestedAtUtc, run.LabelPrintRequestedByUserId,
            run.ContainerBarcodeVerifiedAtUtc, run.ContainerBarcodeVerifiedByUserId);
    }

    private IReadOnlyList<ShippingKitContentDto> RequiredKitContents(SampleShippingStockKit kit)
    {
        var snapshot = JsonSerializer.Deserialize<SampleShippingContainerDefinitionDto>(kit.ContainerSnapshotJson,
            new JsonSerializerOptions(JsonSerializerDefaults.Web));
        if (snapshot?.KitContents is not { Count: > 0 } contents)
            throw Conflict("kit_contents_missing", "This physical kit has no pinned specification contents. Review its configuration before assembly.");
        return contents;
    }
}
