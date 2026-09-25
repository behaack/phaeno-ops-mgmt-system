namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record RecordLabMasterMixCorrectionRequest(Guid RequestId, Guid TargetEntryId,
    string TargetKind, string Action, string Reason, bool ConfirmedNoPhysicalUse, long Version);
public sealed record LabMasterMixCorrectionDto(Guid Id, Guid TargetEntryId, string TargetKind,
    string Action, string Reason, Guid RecordedByUserId, DateTime RecordedAtUtc);

public sealed partial class LabOperationsController
{
    [HttpPost("master-mixes/{id:guid}/corrections")]
    public async Task<LabMasterMixDto> RecordMasterMixCorrection(Guid id,
        [FromBody] RecordLabMasterMixCorrectionRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Supervisor, LabRole.OperationsAdministrator);
        if (request.RequestId == Guid.Empty || request.TargetEntryId == Guid.Empty
            || request.TargetKind is not ("Ingredient" or "TrayUse")
            || request.Action is not ("VerifiedVoid" or "Discrepancy")
            || request.Action == "VerifiedVoid" && !request.ConfirmedNoPhysicalUse
            || string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Length > 2000)
            throw Invalid("master_mix_correction_invalid", "Choose an entry and confirm the physical-use facts before recording a correction.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"master-mix:{id}", ct);
        var previous = await dbContext.LabMasterMixCorrections.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == request.RequestId, ct);
        if (previous is not null)
        {
            if (previous.PreparationId != id || previous.TargetEntryId != request.TargetEntryId
                || previous.TargetKind != request.TargetKind || previous.Action != request.Action
                || previous.Reason != request.Reason?.Trim() || previous.RecordedByUserId != actor.User.Id)
                throw Conflict("master_mix_request_reused", "This request already recorded a different correction.");
            return await ReadMasterMixWithoutAuthorizationAsync(id, ct);
        }
        var preparation = await RequireMasterMixForChangeAsync(id, request.Version, ct);
        if (await dbContext.LabMasterMixCorrections.AnyAsync(item => item.PreparationId == id
            && item.TargetEntryId == request.TargetEntryId, ct))
            throw Conflict("master_mix_entry_already_corrected", "This entry already has a correction. Review its audit record.");
        var now = DateTime.UtcNow;
        if (request.TargetKind == "Ingredient")
        {
            var ingredient = await dbContext.LabMasterMixIngredientUses.SingleOrDefaultAsync(item =>
                item.Id == request.TargetEntryId && item.PreparationId == id, ct) ?? throw Missing();
            if (ingredient.VoidedAtUtc.HasValue) throw Conflict("master_mix_entry_already_corrected", "This ingredient was already voided.");
            await SampleShippingPackingData.LockAsync(dbContext, $"material-lot:{ingredient.SourceMaterialLotId}", ct);
            var source = await dbContext.LabMaterialLots.SingleAsync(item => item.Id == ingredient.SourceMaterialLotId, ct);
            if (request.Action == "VerifiedVoid")
            {
                ingredient.VoidUndispensed(actor.User.Id, now);
                if (!ingredient.MaterialExhausted && source.QuantityHoldReason is null)
                    source.RestoreUndispensedMasterMixAmount(ingredient.Quantity, ingredient.Id, actor.User.Id, now);
                else if (source.QuantityHoldReason is null)
                    source.HoldQuantity("Master-mix ingredient void requires a physical count before restoring stock.", ingredient.Id, actor.User.Id, now);
            }
            else if (source.QuantityHoldReason is null)
                source.HoldQuantity("Master-mix ingredient discrepancy requires a physical stock count.", ingredient.Id, actor.User.Id, now);
            if (preparation.Status != LabMasterMixStatus.Discarded)
                preparation.Discard(ShortCorrectionReason($"Ingredient {request.Action}: {request.Reason}"), null, actor.User.Id, now);
        }
        else
        {
            var use = await dbContext.LabMasterMixTrayUses.SingleOrDefaultAsync(item =>
                item.Id == request.TargetEntryId && item.PreparationId == id, ct) ?? throw Missing();
            if (use.VoidedAtUtc.HasValue) throw Conflict("master_mix_entry_already_corrected", "This tray use was already voided.");
            if (request.Action == "VerifiedVoid")
            {
                use.VoidUndispensed(actor.User.Id, now);
                preparation.ReverseUndispensedUse(use.Quantity);
            }
            else if (preparation.Status != LabMasterMixStatus.Discarded)
                preparation.Discard(ShortCorrectionReason($"Tray-use discrepancy: {request.Reason}"), null, actor.User.Id, now);
        }
        LabMasterMixCorrection correction;
        try { correction = new(request.RequestId, id, request.TargetEntryId, request.TargetKind,
            request.Action, request.Reason, actor.User.Id, now); }
        catch (ArgumentException error) { throw Invalid("master_mix_correction_invalid", error.Message); }
        dbContext.LabMasterMixCorrections.Add(correction);
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await ReadMasterMixWithoutAuthorizationAsync(id, ct);
    }

    private static string ShortCorrectionReason(string reason) => reason[..Math.Min(2000, reason.Length)];
}
