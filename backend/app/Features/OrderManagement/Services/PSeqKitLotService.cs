namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class PSeqKitLotService(PSeqOperationsDbContext db)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    public static string Snapshot(KitLotAssessmentDto assessment) => JsonSerializer.Serialize(assessment, JsonOptions);
    public static KitLotAssessmentDto Assess(PSeqKitLot lot, DateOnly? usedOn = null)
    {
        var date = usedOn ?? DateOnly.FromDateTime(DateTime.UtcNow);
        return new(lot.Id, lot.LotNumber, lot.ExpirationDate, lot.IsRecalled,
            lot.IsRecalled ? lot.RecallReason : null, lot.IsExpiredOn(date), !lot.ExpirationDate.HasValue, date, lot.Version);
    }
    public static KitLotSubmissionDto Map(PartnerKitLotSubmission submission, PSeqKitLot lot)
        => new(submission.Id, submission.EnteredLotNumber, submission.UsedOn, submission.CheckedAt, submission.Version,
            JsonSerializer.Deserialize<KitLotAssessmentDto>(submission.AssessmentJson, JsonOptions)
                ?? throw new InvalidOperationException("The saved lot assessment is missing."), Assess(lot, submission.UsedOn));

    public async Task<PSeqKitLot> ReadLotAsync(Guid id, bool lockForMutation, CancellationToken token)
    {
        if (lockForMutation) await new OrderIdempotencyService(db).AcquireOrderLockAsync($"kit-lot:{id}", token);
        return await db.PSeqKitLots.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, token)
            ?? throw new OrderManagementException("kit_lot_not_found", "The registered kit lot could not be found.", 404);
    }
    public async Task<PSeqKitLot> RequireShipmentLotAsync(Guid productId, string lotNumber, DateTime shippedAt, CancellationToken token)
    {
        var normalized = PSeqKitLot.Normalize(lotNumber ?? "");
        var id = await db.PSeqKitLots.Where(x => x.CatalogItemId == productId && x.NormalizedLotNumber == normalized)
            .Select(x => (Guid?)x.Id).SingleOrDefaultAsync(token)
            ?? throw new OrderManagementException("kit_lot_required", "Choose a registered lot for this PSeq kit product.");
        var lot = await ReadLotAsync(id, true, token);
        if (lot.IsRecalled) throw new OrderManagementException("kit_lot_recalled", "A recalled kit lot cannot be shipped.", 409);
        if (lot.IsExpiredOn(DateOnly.FromDateTime(shippedAt)))
            throw new OrderManagementException("kit_lot_expired", "A kit cannot ship after its labeled expiration.", 409);
        return lot;
    }
    public async Task<KitLotSubmissionDto?> ReadSubmissionAsync(KitAssemblyCase included, CancellationToken token)
    {
        var submission = await db.PartnerKitLotSubmissions.AsNoTracking().SingleOrDefaultAsync(x => x.KitAssemblyCaseId == included.Id
            && x.KitUnitId == included.CurrentKitUnitId && x.OrganizationId == included.OrganizationId && x.DepartmentId == included.DepartmentId, token);
        return submission is null ? null : Map(submission, await ReadLotAsync(submission.KitLotId, false, token));
    }
    public async Task<(PartnerKitLotSubmission Submission, KitLotAssessmentDto Assessment)> RequireAssemblyLotAsync(
        KitAssemblyCase included, long? expectedLotVersion, CancellationToken token)
    {
        var submission = await db.PartnerKitLotSubmissions.AsNoTracking().SingleOrDefaultAsync(x => x.KitAssemblyCaseId == included.Id
            && x.KitUnitId == included.CurrentKitUnitId && x.OrganizationId == included.OrganizationId && x.DepartmentId == included.DepartmentId, token)
            ?? throw new OrderManagementException("kit_lot_submission_required", "Submit the kit lot before submitting assembly inputs.", 409);
        if (!submission.UsedOn.HasValue)
            throw new OrderManagementException("kit_use_date_required", "Record the actual kit-use date before submitting assembly inputs.");
        var kit = await db.PartnerKitUnits.AsNoTracking().SingleAsync(x => x.Id == included.CurrentKitUnitId, token);
        if (kit.KitLotId != submission.KitLotId)
            throw new OrderManagementException("kit_lot_mismatch", "Review the lot for the case's current physical kit.", 409);
        var lot = await ReadLotAsync(submission.KitLotId, true, token);
        EnsureDisplayedVersion(lot, expectedLotVersion);
        return (submission, Assess(lot, submission.UsedOn));
    }
    public async Task<KitLotAssessmentDto?> CheckBeforeProcessingAsync(DataAssemblyRequest item, long? expectedLotVersion, CancellationToken token)
    {
        if (!item.KitAssemblyCaseId.HasValue) return null;
        var revision = item.InputRevisions.SingleOrDefault(x => x.Id == item.CurrentInputRevisionId);
        if (revision?.KitLotId is null || revision.KitUsedOn is null || revision.KitLotSubmissionId is null)
            throw new OrderManagementException("kit_lot_submission_required", "The submitted input revision must include verified kit lot and use-date evidence before assembly starts.", 409);
        var lot = await ReadLotAsync(revision.KitLotId.Value, true, token);
        EnsureDisplayedVersion(lot, expectedLotVersion);
        return Assess(lot, revision.KitUsedOn);
    }
    private static void EnsureDisplayedVersion(PSeqKitLot lot, long? expected)
    {
        if (expected != lot.Version) throw new OrderManagementException("kit_lot_changed",
            "The lot information changed. Refresh and review its current recall and expiration warnings before continuing.", 409);
    }
}
