namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record KitAssemblyStepRequest(long Version, int Sequence, string Notes);
public sealed record KitAssemblyUseRequest(long Version, Guid SupplierProductId, decimal Quantity,
    Guid? SourceMaterialLotId = null);
public sealed record KitAssemblyFinishRequest(long Version);
public sealed record KitAssemblyAbandonRequest(long Version, string Reason);
public sealed record KitAssemblyUseDto(Guid Id, Guid SupplierProductId, Guid? SourceMaterialLotId,
    decimal Quantity, string QuantityUnit, Guid RecordedByUserId, DateTime RecordedAtUtc);
public sealed record KitAssemblyStepRecordDto(int Sequence, Guid LabStepVersionId, string Notes,
    Guid PerformedByUserId, DateTime PerformedAtUtc);
public sealed record KitAssemblyRunDto(Guid Id, Guid StockKitId, string KitNumber, string Status,
    long Version, Guid WorkflowRevisionId, IReadOnlyList<LabKitAssemblyStep> Steps,
    IReadOnlyList<KitAssemblyComponentDto> Components, IReadOnlyList<KitAssemblyUseDto> Uses,
    IReadOnlyList<KitAssemblyStepRecordDto> StepRecords, DateTime StartedAtUtc,
    DateTime? FinishedAtUtc, string? AbandonmentReason);

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

    [HttpPost("kit-assembly/stock-kits/{kitId:guid}/uses")]
    public async Task<KitAssemblyRunDto> RecordKitAssemblyUse(Guid kitId,
        [FromBody] KitAssemblyUseRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator,
            LabRole.Supervisor, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"kit-assembly:{kitId}", ct);
        var run = await RequireKitAssemblyRunAsync(kitId, request.Version, ct);
        if (run.Status != LabKitAssemblyRunStatus.InProgress)
            throw Conflict("kit_assembly_finished", "This assembly is no longer active.");
        var bom = await dbContext.LabKitAssemblyComponents.AsNoTracking()
            .SingleOrDefaultAsync(item => item.WorkflowRevisionId == run.WorkflowRevisionId
                && item.SupplierProductId == request.SupplierProductId, ct)
            ?? throw Invalid("kit_component_unapproved", "Choose a component from the approved bill of materials.");
        var used = await dbContext.LabKitAssemblyUses.AsNoTracking()
            .Where(item => item.RunId == run.Id && item.SupplierProductId == request.SupplierProductId)
            .SumAsync(item => item.Quantity, ct);
        if (request.Quantity <= 0 || used + request.Quantity > bom.Quantity)
            throw Invalid("kit_component_quantity_invalid", "Record a positive use no greater than the remaining approved component quantity.");
        var product = await dbContext.LabSupplierProducts.AsNoTracking().SingleAsync(item => item.Id == request.SupplierProductId, ct);
        if (string.IsNullOrWhiteSpace(product.DefaultQuantityUnit))
            throw Conflict("kit_component_unit_missing", "Set the component product's inventory unit before recording use.");
        try { bom.ValidateActualUse(request.Quantity, product.DefaultQuantityUnit); }
        catch (InvalidOperationException error) { throw Invalid("kit_component_quantity_invalid", error.Message); }
        var hasLots = await dbContext.LabMaterialLots.AsNoTracking().AnyAsync(item => item.SupplierProductId == product.Id, ct);
        if (hasLots && !request.SourceMaterialLotId.HasValue)
            throw Invalid("kit_component_lot_required", "Select the source lot for this inventory-tracked component.");
        LabMaterialLot? source = null;
        if (request.SourceMaterialLotId.HasValue)
        {
            await SampleShippingPackingData.LockAsync(dbContext, $"material-lot:{request.SourceMaterialLotId}", ct);
            source = await dbContext.LabMaterialLots.SingleOrDefaultAsync(item => item.Id == request.SourceMaterialLotId
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
            var kit = await dbContext.SampleShippingStockKits.SingleAsync(item => item.Id == kitId, ct);
            try { kit.ConfirmTubeLotNumber(source.LotNumber); }
            catch (InvalidOperationException error) { throw Conflict("kit_tube_lot_mismatch", error.Message); }
        }
        var now = DateTime.UtcNow;
        var use = new LabKitAssemblyUse(run.Id, product.Id, source?.Id, request.Quantity,
            product.DefaultQuantityUnit, actor.User.Id, now);
        if (source is not null) Execute(() => source.Consume(request.Quantity, false, use.Id, actor.User.Id, now));
        dbContext.LabKitAssemblyUses.Add(use);
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
        var kit = await dbContext.SampleShippingStockKits.Include(item => item.Tubes)
            .SingleAsync(item => item.Id == kitId, ct);
        var bom = await dbContext.LabKitAssemblyComponents.AsNoTracking()
            .Where(item => item.WorkflowRevisionId == run.WorkflowRevisionId).ToListAsync(ct);
        var uses = await dbContext.LabKitAssemblyUses.AsNoTracking()
            .Where(item => item.RunId == run.Id).ToListAsync(ct);
        if (bom.Any(item => uses.Where(use => use.SupplierProductId == item.SupplierProductId)
                .Sum(use => use.Quantity) != item.Quantity)
            || uses.Any(item => bom.All(line => line.SupplierProductId != item.SupplierProductId)))
            throw Conflict("kit_bom_incomplete", "Record the exact approved quantity of every component before completing assembly.");
        if (!kit.TubesVerifiedAt.HasValue || kit.Tubes.Count != kit.TubeCapacity)
            throw Conflict("kit_tube_roster_unverified", "Register and rescan every physical tube before completing assembly.");
        var now = DateTime.UtcNow;
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
        var bom = await dbContext.LabKitAssemblyComponents.AsNoTracking()
            .Where(item => item.WorkflowRevisionId == run.WorkflowRevisionId).OrderBy(item => item.Position).ToListAsync(ct);
        var productIds = bom.Select(item => item.SupplierProductId).ToArray();
        var products = await (from p in dbContext.LabSupplierProducts.AsNoTracking()
            join s in dbContext.LabSuppliers.AsNoTracking() on p.SupplierId equals s.Id
            where productIds.Contains(p.Id)
            select new { p.Id, p.ProductNumber, p.Description, SupplierName = s.Name }).ToDictionaryAsync(item => item.Id, ct);
        var uses = await dbContext.LabKitAssemblyUses.AsNoTracking().Where(item => item.RunId == run.Id)
            .OrderBy(item => item.RecordedAtUtc).ToListAsync(ct);
        var steps = await dbContext.LabKitAssemblyStepRecords.AsNoTracking().Where(item => item.RunId == run.Id)
            .OrderBy(item => item.Sequence).ToListAsync(ct);
        return new(run.Id, kitId, kit.KitNumber, run.Status.ToString(), run.Version, run.WorkflowRevisionId,
            run.Steps(), bom.Select(item => new KitAssemblyComponentDto(item.SupplierProductId, item.Quantity,
                item.Kind, products[item.SupplierProductId].SupplierName, products[item.SupplierProductId].ProductNumber,
                products[item.SupplierProductId].Description)).ToArray(),
            uses.Select(item => new KitAssemblyUseDto(item.Id, item.SupplierProductId, item.SourceMaterialLotId,
                item.Quantity, item.QuantityUnit, item.RecordedByUserId, item.RecordedAtUtc)).ToArray(),
            steps.Select(item => new KitAssemblyStepRecordDto(item.Sequence, item.LabStepVersionId,
                item.Notes, item.PerformedByUserId, item.PerformedAtUtc)).ToArray(),
            run.StartedAtUtc, run.FinishedAtUtc, run.AbandonmentReason);
    }
}
