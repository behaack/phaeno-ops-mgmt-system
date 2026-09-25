namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record StartLabMasterMixRequest(Guid RequestId, Guid WorkflowId, int WorkflowRevision);
public sealed record RecordLabMasterMixStepRequest(Guid RequestId, int Sequence, string Notes, long Version);
public sealed record RecordLabMasterMixIngredientRequest(Guid RequestId, Guid SourceMaterialLotId,
    decimal Quantity, string QuantityUnit, bool MaterialExhausted, long Version, string? QuantityText = null);
public sealed record CompleteLabMasterMixRequest(decimal PreparedQuantity, long Version, string? PreparedQuantityText = null);
public sealed record ApproveLabMasterMixDeviationRequest(string Reason, long Version);
public sealed record DiscardLabMasterMixRequest(string Reason, decimal? MeasuredDiscardQuantity, long Version,
    string? MeasuredDiscardQuantityText = null);
public sealed record LabMasterMixSummaryDto(Guid Id, string Barcode, Guid WorkflowId, int WorkflowRevision,
    string WorkflowName, string QuantityUnit, string Status, long Version, decimal? RemainingQuantity,
    string? RemainingQuantityText, DateTime StartedAtUtc, DateTime UseByUtc);
public sealed record LabMasterMixPageDto(IReadOnlyList<LabMasterMixSummaryDto> Items, int Page, int PageSize, int Total);
public sealed record LabMasterMixStepDto(Guid Id, int Sequence, string Notes, Guid PerformedByUserId, DateTime PerformedAtUtc);
public sealed record LabMasterMixActorDto(Guid Id, string Name);
public sealed record LabMasterMixIngredientDto(Guid Id, Guid SourceMaterialLotId, string SourceName,
    string SourceLotNumber, decimal Quantity, string QuantityText, string QuantityUnit, bool MaterialExhausted,
    Guid RecordedByUserId, DateTime RecordedAtUtc, Guid? VoidedByUserId, DateTime? VoidedAtUtc);
public sealed record LabMasterMixTrayUseDto(Guid Id, Guid LabPreparationBatchId, string TrayName,
    Guid LabPreparationRecordId, string FieldKey, decimal Quantity, string QuantityText, string QuantityUnit,
    Guid RecordedByUserId, DateTime RecordedAtUtc, Guid? VoidedByUserId, DateTime? VoidedAtUtc);
public sealed record LabMasterMixDto(Guid Id, string Barcode, Guid WorkflowId, int WorkflowRevision,
    string WorkflowName, string QuantityUnit, string Status, long Version,
    decimal? PreparedQuantity, decimal UsedQuantity, decimal? RemainingQuantity, string? RemainingQuantityText,
    string? PreparedQuantityText, string UsedQuantityText, string? MeasuredDiscardQuantityText,
    Guid StartedByUserId, DateTime StartedAtUtc, DateTime UseByUtc, Guid? PreparedByUserId, DateTime? PreparedAtUtc,
    Guid? DiscardedByUserId, DateTime? DiscardedAtUtc, decimal? MeasuredDiscardQuantity,
    string? DiscardReason, string? RecipeDeviationReason, Guid? RecipeDeviationApprovedByUserId,
    DateTime? RecipeDeviationApprovedAtUtc, bool RecipeDeviationApprovalCurrent, bool RecipeMatches,
    IReadOnlyList<LabReagentStep> Steps, IReadOnlyList<LabMasterMixRecipeIngredient> RecipeIngredients,
    IReadOnlyList<LabMasterMixStepDto> RecordedSteps,
    IReadOnlyList<LabMasterMixIngredientDto> Ingredients,
    IReadOnlyList<LabMasterMixTrayUseDto> TrayUses,
    IReadOnlyList<LabMasterMixCorrectionDto> Corrections,
    IReadOnlyList<LabMasterMixActorDto> Actors);

public sealed partial class LabOperationsController
{
    [HttpGet("master-mixes")]
    public async Task<LabMasterMixPageDto> ListMasterMixes([FromQuery] string? search,
        [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        await RequireMasterMixReaderAsync(ct);
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);
        var query = dbContext.LabMasterMixPreparations.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (string.Equals(status, "Overdue", StringComparison.OrdinalIgnoreCase))
                query = query.Where(item => item.Status != LabMasterMixStatus.Discarded && item.UseByUtc <= DateTime.UtcNow);
            else if (!Enum.TryParse<LabMasterMixStatus>(status, true, out var parsedStatus)
                || !Enum.IsDefined(parsedStatus))
                throw Invalid("master_mix_status_invalid", "Choose a valid master-mix status.");
            else query = query.Where(item => item.Status == parsedStatus);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            var barcodeId = term.StartsWith("PH-MX-", StringComparison.OrdinalIgnoreCase)
                && Guid.TryParseExact(term[6..], "N", out var parsedId) ? parsedId : Guid.Empty;
            query = query.Where(item => item.Id == barcodeId || EF.Functions.ILike(item.WorkflowName, $"%{term}%"));
        }
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(item => item.StartedAtUtc).ThenByDescending(item => item.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new(items.Select(MapMasterMixSummary).ToArray(), page, pageSize, total);
    }

    [HttpGet("master-mixes/ready")]
    public async Task<IReadOnlyList<LabMasterMixSummaryDto>> ListReadyMasterMixes(CancellationToken ct)
    {
        await RequireMasterMixReaderAsync(ct);
        var now = DateTime.UtcNow;
        var items = await dbContext.LabMasterMixPreparations.AsNoTracking()
            .Where(item => item.Status == LabMasterMixStatus.Ready && item.UseByUtc > now
                && item.PreparedQuantity > item.UsedQuantity)
            .OrderByDescending(item => item.StartedAtUtc).ToListAsync(ct);
        return items.Select(MapMasterMixSummary).ToArray();
    }

    private static LabMasterMixSummaryDto MapMasterMixSummary(LabMasterMixPreparation item) =>
        new(item.Id, item.Barcode, item.WorkflowId, item.WorkflowRevision, item.WorkflowName,
            item.QuantityUnit, item.Status.ToString(), item.Version, item.RemainingQuantity,
            item.RemainingQuantity?.ToString(CultureInfo.InvariantCulture), item.StartedAtUtc, item.UseByUtc);

    [HttpGet("master-mixes/{id:guid}")]
    public async Task<LabMasterMixDto> ReadMasterMix(Guid id, CancellationToken ct)
    {
        await RequireMasterMixReaderAsync(ct);
        return (await ReadMasterMixesAsync([
            await dbContext.LabMasterMixPreparations.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing()
        ], ct)).Single();
    }

    [HttpPost("master-mixes")]
    public async Task<LabMasterMixDto> StartMasterMix([FromBody] StartLabMasterMixRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        if (request.RequestId == Guid.Empty) throw Invalid("master_mix_request_required", "A request identifier is required.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"master-mix:{request.RequestId}", ct);
        var previous = await dbContext.LabMasterMixPreparations.SingleOrDefaultAsync(item => item.Id == request.RequestId, ct);
        if (previous is not null)
        {
            if (previous.WorkflowId != request.WorkflowId || previous.WorkflowRevision != request.WorkflowRevision
                || previous.StartedByUserId != actor.User.Id)
                throw Conflict("master_mix_request_reused", "This request already started a different preparation.");
            return (await ReadMasterMixesAsync([previous], ct)).Single();
        }
        await SampleShippingPackingData.LockAsync(dbContext, $"master-mix-workflow:{request.WorkflowId}", ct);
        var workflow = await dbContext.LabMasterMixWorkflows.AsNoTracking().SingleOrDefaultAsync(item =>
            item.Id == request.WorkflowId && item.Status != LabMasterMixWorkflowStatus.Retired, ct)
            ?? throw Invalid("master_mix_workflow_unavailable", "Select an available master-mix workflow.");
        LabMasterMixPreparation preparation;
        try { preparation = new(workflow, request.WorkflowRevision, actor.User.Id, DateTime.UtcNow, request.RequestId); }
        catch (ArgumentException error) { throw Invalid("master_mix_invalid", error.Message); }
        catch (InvalidOperationException error) { throw Conflict("master_mix_revision_unavailable", error.Message); }
        dbContext.LabMasterMixPreparations.Add(preparation);
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await ReadMasterMixesAsync([preparation], ct)).Single();
    }

    [HttpPost("master-mixes/{id:guid}/steps")]
    public async Task<LabMasterMixDto> RecordMasterMixStep(Guid id,
        [FromBody] RecordLabMasterMixStepRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        if (request.RequestId == Guid.Empty) throw Invalid("master_mix_request_required", "A request identifier is required.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"master-mix:{id}", ct);
        var previous = await dbContext.LabMasterMixStepRecords.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == request.RequestId, ct);
        if (previous is not null)
        {
            if (previous.PreparationId != id || previous.Sequence != request.Sequence
                || previous.Notes != request.Notes?.Trim() || previous.PerformedByUserId != actor.User.Id)
                throw Conflict("master_mix_request_reused", "This request already recorded a different step.");
            return await ReadMasterMixWithoutAuthorizationAsync(id, ct);
        }
        var preparation = await RequireMasterMixForChangeAsync(id, request.Version, ct);
        var steps = preparation.Steps();
        if (request.Sequence < 0 || request.Sequence >= steps.Count)
            throw Invalid("master_mix_step_invalid", "Select the next procedure step.");
        LabMasterMixStepRecord record;
        try
        {
            record = new(request.RequestId, id, request.Sequence, request.Notes, actor.User.Id, DateTime.UtcNow);
            preparation.RecordStep(request.Sequence, DateTime.UtcNow);
        }
        catch (ArgumentException error) { throw Invalid("master_mix_step_invalid", error.Message); }
        catch (InvalidOperationException error) { throw Conflict("master_mix_step_unavailable", error.Message); }
        dbContext.LabMasterMixStepRecords.Add(record);
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await ReadMasterMixWithoutAuthorizationAsync(id, ct);
    }

    [HttpPost("master-mixes/{id:guid}/ingredients")]
    public async Task<LabMasterMixDto> RecordMasterMixIngredient(Guid id,
        [FromBody] RecordLabMasterMixIngredientRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        if (request.RequestId == Guid.Empty) throw Invalid("master_mix_request_required", "A request identifier is required.");
        var quantity = request.Quantity;
        if (request.QuantityText is not null && !ExactDecimalQuantity.TryParse(request.QuantityText, out quantity))
            throw Invalid("master_mix_source_invalid", "Enter an exact positive decimal ingredient amount.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"master-mix:{id}", ct);
        var previous = await dbContext.LabMasterMixIngredientUses.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == request.RequestId, ct);
        if (previous is not null)
        {
            if (previous.VoidedAtUtc.HasValue)
                throw Conflict("master_mix_ingredient_voided", "This ingredient use was voided. Review the mix correction record.");
            if (previous.PreparationId != id || previous.SourceMaterialLotId != request.SourceMaterialLotId
                || previous.Quantity != quantity || previous.QuantityUnit != request.QuantityUnit?.Trim()
                || previous.MaterialExhausted != request.MaterialExhausted || previous.RecordedByUserId != actor.User.Id)
                throw Conflict("master_mix_request_reused", "This request already recorded a different ingredient use.");
            return await ReadMasterMixWithoutAuthorizationAsync(id, ct);
        }
        var preparation = await RequireMasterMixForChangeAsync(id, request.Version, ct);
        await SampleShippingPackingData.LockAsync(dbContext, $"material-lot:{request.SourceMaterialLotId}", ct);
        var source = await dbContext.LabMaterialLots.SingleOrDefaultAsync(item => item.Id == request.SourceMaterialLotId, ct)
            ?? throw Missing();
        if (source.QcDisposition is not (LabQcDisposition.Passed or LabQcDisposition.ApprovedException)
            || source.ExpirationOrRetestDate < DateOnly.FromDateTime(DateTime.UtcNow))
            throw Conflict("master_mix_source_unavailable", "The source lot must pass QC and be in date.");
        if (!string.Equals(source.QuantityUnit, request.QuantityUnit?.Trim(), StringComparison.Ordinal))
            throw Invalid("master_mix_source_unit_mismatch", "Use the source lot's quantity unit.");
        LabMasterMixIngredientUse ingredient;
        var now = DateTime.UtcNow;
        try
        {
            ingredient = new(request.RequestId, id, source.Id, quantity, source.QuantityUnit,
                request.MaterialExhausted, actor.User.Id, now);
            source.Consume(quantity, request.MaterialExhausted, ingredient.Id, actor.User.Id, now);
            preparation.RecordIngredientUse(now);
        }
        catch (ArgumentException error) { throw Invalid("master_mix_source_invalid", error.Message); }
        catch (InvalidOperationException error) { throw Conflict("master_mix_source_unavailable", error.Message); }
        dbContext.LabMasterMixIngredientUses.Add(ingredient);
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await ReadMasterMixWithoutAuthorizationAsync(id, ct);
    }

    [HttpPost("master-mixes/{id:guid}/complete")]
    public async Task<LabMasterMixDto> CompleteMasterMix(Guid id,
        [FromBody] CompleteLabMasterMixRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        var quantity = request.PreparedQuantity;
        if (request.PreparedQuantityText is not null && !ExactDecimalQuantity.TryParse(request.PreparedQuantityText, out quantity))
            throw Invalid("master_mix_quantity_invalid", "Enter an exact positive decimal amount made.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"master-mix:{id}", ct);
        var preparation = await dbContext.LabMasterMixPreparations.SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing();
        if (preparation.Status == LabMasterMixStatus.Ready && preparation.PreparedQuantity == quantity
            && preparation.PreparedByUserId == actor.User.Id) return await ReadMasterMixWithoutAuthorizationAsync(id, ct);
        EnsureVersion(preparation.Version, request.Version);
        var recipeMatches = await MasterMixRecipeMatchesAsync(preparation, ct);
        try { preparation.Complete(quantity, recipeMatches, actor.User.Id, DateTime.UtcNow); }
        catch (ArgumentException error) { throw Invalid("master_mix_quantity_invalid", error.Message); }
        catch (InvalidOperationException error) { throw Conflict("master_mix_incomplete", error.Message); }
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await ReadMasterMixWithoutAuthorizationAsync(id, ct);
    }

    [HttpPost("master-mixes/{id:guid}/approve-deviation")]
    public async Task<LabMasterMixDto> ApproveMasterMixDeviation(Guid id,
        [FromBody] ApproveLabMasterMixDeviationRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Supervisor);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"master-mix:{id}", ct);
        var preparation = await RequireMasterMixForChangeAsync(id, request.Version, ct);
        if (preparation.StartedByUserId == actor.User.Id)
            throw Conflict("master_mix_independent_deviation_approval_required", "A different supervisor must approve this preparation's recipe deviation.");
        if (await MasterMixRecipeMatchesAsync(preparation, ct))
            throw Conflict("master_mix_recipe_matches", "The recorded ingredients match the approved recipe; no deviation approval is needed.");
        try { preparation.ApproveRecipeDeviation(request.Reason, actor.User.Id, DateTime.UtcNow); }
        catch (ArgumentException error) { throw Invalid("master_mix_deviation_invalid", error.Message); }
        catch (InvalidOperationException error) { throw Conflict("master_mix_deviation_unavailable", error.Message); }
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await ReadMasterMixWithoutAuthorizationAsync(id, ct);
    }

    [HttpPost("master-mixes/{id:guid}/discard")]
    public async Task<LabMasterMixDto> DiscardMasterMix(Guid id,
        [FromBody] DiscardLabMasterMixRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        decimal? measuredQuantity = request.MeasuredDiscardQuantity;
        if (request.MeasuredDiscardQuantityText is not null)
        {
            if (System.Text.RegularExpressions.Regex.IsMatch(request.MeasuredDiscardQuantityText, "^0+(?:\\.0+)?$")) measuredQuantity = 0;
            else if (ExactDecimalQuantity.TryParse(request.MeasuredDiscardQuantityText, out var parsed)) measuredQuantity = parsed;
            else throw Invalid("master_mix_discard_invalid", "Enter an exact nonnegative measured amount or leave it blank.");
        }
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"master-mix:{id}", ct);
        var preparation = await dbContext.LabMasterMixPreparations.SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing();
        if (preparation.Status == LabMasterMixStatus.Discarded
            && preparation.DiscardedByUserId == actor.User.Id && preparation.DiscardReason == request.Reason?.Trim()
            && preparation.MeasuredDiscardQuantity == measuredQuantity)
            return await ReadMasterMixWithoutAuthorizationAsync(id, ct);
        EnsureVersion(preparation.Version, request.Version);
        try { preparation.Discard(request.Reason ?? string.Empty, measuredQuantity, actor.User.Id, DateTime.UtcNow); }
        catch (ArgumentException error) { throw Invalid("master_mix_discard_invalid", error.Message); }
        catch (InvalidOperationException error) { throw Conflict("master_mix_discard_unavailable", error.Message); }
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await ReadMasterMixWithoutAuthorizationAsync(id, ct);
    }

    private async Task RequireMasterMixReaderAsync(CancellationToken ct) =>
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor,
            LabRole.ProtocolAdministrator, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);

    private async Task<LabMasterMixPreparation> RequireMasterMixForChangeAsync(Guid id, long version, CancellationToken ct)
    {
        var preparation = await dbContext.LabMasterMixPreparations.SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing();
        EnsureVersion(preparation.Version, version);
        return preparation;
    }

    private async Task<LabMasterMixDto> ReadMasterMixWithoutAuthorizationAsync(Guid id, CancellationToken ct) =>
        (await ReadMasterMixesAsync([
            await dbContext.LabMasterMixPreparations.AsNoTracking().SingleAsync(item => item.Id == id, ct)
        ], ct)).Single();

    private async Task<bool> MasterMixRecipeMatchesAsync(LabMasterMixPreparation preparation, CancellationToken ct)
    {
        var uses = await dbContext.LabMasterMixIngredientUses.AsNoTracking()
            .Where(item => item.PreparationId == preparation.Id && item.VoidedAtUtc == null).ToArrayAsync(ct);
        var lotIds = uses.Select(item => item.SourceMaterialLotId).Distinct().ToArray();
        var lots = await dbContext.LabMaterialLots.AsNoTracking().Where(item => lotIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, ct);
        return RecipeMatches(preparation, uses, lots);
    }

    private static bool RecipeMatches(LabMasterMixPreparation preparation,
        IReadOnlyCollection<LabMasterMixIngredientUse> uses, IReadOnlyDictionary<Guid, LabMaterialLot> lots)
    {
        var expected = preparation.Ingredients();
        if (uses.Count == 0 || uses.Any(item => !lots.ContainsKey(item.SourceMaterialLotId))) return false;
        var actual = uses.GroupBy(item => (lots[item.SourceMaterialLotId].MaterialDefinitionId, item.QuantityUnit))
            .ToDictionary(group => group.Key, group => group.Sum(item => item.Quantity));
        return actual.Count == expected.Count && expected.All(item =>
            actual.TryGetValue((item.MaterialDefinitionId, item.QuantityUnit), out var amount) && amount == item.Quantity);
    }

    private async Task<IReadOnlyList<LabMasterMixDto>> ReadMasterMixesAsync(
        IReadOnlyList<LabMasterMixPreparation> preparations, CancellationToken ct)
    {
        if (preparations.Count == 0) return [];
        var ids = preparations.Select(item => item.Id).ToArray();
        var steps = await dbContext.LabMasterMixStepRecords.AsNoTracking()
            .Where(item => ids.Contains(item.PreparationId)).ToListAsync(ct);
        var ingredients = await dbContext.LabMasterMixIngredientUses.AsNoTracking()
            .Where(item => ids.Contains(item.PreparationId)).ToListAsync(ct);
        var uses = await dbContext.LabMasterMixTrayUses.AsNoTracking()
            .Where(item => ids.Contains(item.PreparationId)).ToListAsync(ct);
        var corrections = await dbContext.LabMasterMixCorrections.AsNoTracking()
            .Where(item => ids.Contains(item.PreparationId)).ToListAsync(ct);
        var lotIds = ingredients.Select(item => item.SourceMaterialLotId).Distinct().ToArray();
        var lots = await dbContext.LabMaterialLots.AsNoTracking().Where(item => lotIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, ct);
        var definitionIds = lots.Values.Select(item => item.MaterialDefinitionId).Distinct().ToArray();
        var definitions = await dbContext.LabMaterialDefinitions.AsNoTracking()
            .Where(item => definitionIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, ct);
        var trayIds = uses.Select(item => item.LabPreparationBatchId).Distinct().ToArray();
        var trays = await dbContext.LabPreparationBatches.AsNoTracking()
            .Where(item => trayIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, ct);
        var actorIds = preparations.Select(item => item.StartedByUserId)
            .Concat(preparations.SelectMany(item => new[] { item.PreparedByUserId, item.DiscardedByUserId, item.RecipeDeviationApprovedByUserId }.OfType<Guid>()))
            .Concat(steps.Select(item => item.PerformedByUserId))
            .Concat(ingredients.SelectMany(item => new[] { (Guid?)item.RecordedByUserId, item.VoidedByUserId }.OfType<Guid>()))
            .Concat(uses.SelectMany(item => new[] { (Guid?)item.RecordedByUserId, item.VoidedByUserId }.OfType<Guid>()))
            .Concat(corrections.Select(item => item.RecordedByUserId)).Distinct().ToArray();
        var actors = await dbContext.Users.AsNoTracking().Where(item => actorIds.Contains(item.Id))
            .Select(item => new LabMasterMixActorDto(item.Id, item.FirstName + " " + item.LastName)).ToArrayAsync(ct);
        return preparations.Select(item => new LabMasterMixDto(item.Id, item.Barcode, item.WorkflowId,
            item.WorkflowRevision, item.WorkflowName, item.QuantityUnit, item.Status.ToString(), item.Version,
            item.PreparedQuantity, item.UsedQuantity, item.RemainingQuantity,
            item.RemainingQuantity?.ToString(CultureInfo.InvariantCulture),
            item.PreparedQuantity?.ToString(CultureInfo.InvariantCulture),
            item.UsedQuantity.ToString(CultureInfo.InvariantCulture),
            item.MeasuredDiscardQuantity?.ToString(CultureInfo.InvariantCulture),
            item.StartedByUserId, item.StartedAtUtc, item.UseByUtc, item.PreparedByUserId, item.PreparedAtUtc,
            item.DiscardedByUserId, item.DiscardedAtUtc, item.MeasuredDiscardQuantity, item.DiscardReason,
            item.RecipeDeviationReason, item.RecipeDeviationApprovedByUserId, item.RecipeDeviationApprovedAtUtc,
            item.RecipeDeviationApprovedIngredientCount == item.IngredientUseCount && item.RecipeDeviationApprovedByUserId.HasValue,
            RecipeMatches(item, ingredients.Where(use => use.PreparationId == item.Id && use.VoidedAtUtc == null).ToArray(), lots),
            item.Steps(), item.Ingredients(), steps.Where(step => step.PreparationId == item.Id).OrderBy(step => step.Sequence)
                .Select(step => new LabMasterMixStepDto(step.Id, step.Sequence, step.Notes,
                    step.PerformedByUserId, step.PerformedAtUtc)).ToArray(),
            ingredients.Where(use => use.PreparationId == item.Id).OrderBy(use => use.RecordedAtUtc)
                .Select(use => new LabMasterMixIngredientDto(use.Id, use.SourceMaterialLotId,
                    definitions[lots[use.SourceMaterialLotId].MaterialDefinitionId].Name,
                    lots[use.SourceMaterialLotId].LotNumber, use.Quantity,
                    use.Quantity.ToString(CultureInfo.InvariantCulture), use.QuantityUnit,
                    use.MaterialExhausted, use.RecordedByUserId, use.RecordedAtUtc,
                    use.VoidedByUserId, use.VoidedAtUtc)).ToArray(),
            uses.Where(use => use.PreparationId == item.Id).OrderBy(use => use.RecordedAtUtc)
                .Select(use => new LabMasterMixTrayUseDto(use.Id, use.LabPreparationBatchId,
                    trays[use.LabPreparationBatchId].Name, use.LabPreparationRecordId, use.FieldKey,
                    use.Quantity, use.Quantity.ToString(CultureInfo.InvariantCulture), use.QuantityUnit,
                    use.RecordedByUserId, use.RecordedAtUtc,
                    use.VoidedByUserId, use.VoidedAtUtc)).ToArray(),
            corrections.Where(correction => correction.PreparationId == item.Id).OrderBy(correction => correction.RecordedAtUtc)
                .Select(correction => new LabMasterMixCorrectionDto(correction.Id, correction.TargetEntryId,
                    correction.TargetKind, correction.Action, correction.Reason, correction.RecordedByUserId,
                    correction.RecordedAtUtc)).ToArray(), actors)).ToArray();
    }
}
