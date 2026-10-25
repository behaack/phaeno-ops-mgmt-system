namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record MasterMixPerformanceDecisionInput(bool Approved, string Reason);
public sealed partial class LabOperationsController
{
    [HttpGet("master-mixes/{id:guid}/performance-reviews")]
    public async Task<IReadOnlyList<LabMasterMixPerformanceDecision>> MasterMixPerformanceReviews(Guid id, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        var recordIds = dbContext.LabMasterMixStepRecords.Where(r => r.PreparationId == id).Select(r => r.Id);
        return await dbContext.Set<LabMasterMixPerformanceDecision>().AsNoTracking().Where(d => recordIds.Contains(d.Id)).ToListAsync(ct);
    }

    [HttpPost("master-mixes/{id:guid}/steps/{recordId:guid}/performance-review")]
    public async Task<LabMasterMixPerformanceDecision> ReviewMasterMixPerformance(Guid id, Guid recordId, [FromBody] MasterMixPerformanceDecisionInput input, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Supervisor);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"master-mix:{id}", ct);
        var record = await dbContext.LabMasterMixStepRecords.AsNoTracking().SingleOrDefaultAsync(r => r.Id == recordId && r.PreparationId == id, ct) ?? throw Missing();
        var evidence = JsonSerializer.Deserialize<LabProtocolStepRecord>(record.EvidenceJson, JsonOptions)!;
        if (evidence.CorrectsRecordId.HasValue) throw Conflict("master_mix_review_original", "Review the original performed entry; captured-value corrections preserve that attribution.");
        if (evidence.Performance?.VerificationStatus != "PendingReview" || record.PerformedByUserId == actor.User.Id)
            throw Conflict("master_mix_review_independent", "A different supervisor must review an attributed entry awaiting verification.");
        var existing = await dbContext.Set<LabMasterMixPerformanceDecision>().SingleOrDefaultAsync(d => d.Id == recordId, ct);
        if (existing is not null)
        {
            if (existing.Approved != input.Approved || existing.Reason != input.Reason.Trim() || existing.ReviewedByUserId != actor.User.Id)
                throw Conflict("master_mix_review_decided", "This entry already has an immutable review decision.");
            return existing;
        }
        LabMasterMixPerformanceDecision decision = null!;
        Execute(() => decision = new(recordId, actor.User.Id, input.Approved, input.Reason, DateTime.UtcNow));
        dbContext.Set<LabMasterMixPerformanceDecision>().Add(decision);
        await dbContext.SaveChangesAsync(ct); if (transaction is not null) await transaction.CommitAsync(ct);
        return decision;
    }

    private async Task RequireMasterMixPerformanceAsync(Guid id, CancellationToken ct)
    {
        var records = await dbContext.LabMasterMixStepRecords.AsNoTracking().Where(r => r.PreparationId == id).ToListAsync(ct);
        var recordIds = records.Select(r => r.Id).ToArray();
        var approved = await dbContext.Set<LabMasterMixPerformanceDecision>().Where(d => d.Approved && recordIds.Contains(d.Id)).Select(d => d.Id).ToListAsync(ct);
        foreach (var step in records.Select(r => new { r.Id, Evidence = JsonSerializer.Deserialize<LabProtocolStepRecord>(r.EvidenceJson, JsonOptions)! }).Where(s => !s.Evidence.CorrectsRecordId.HasValue))
            if (step.Evidence.Performance?.VerificationStatus == "PendingReview" && !approved.Contains(step.Id))
                throw Conflict("master_mix_performance_unverified", "An independent supervisor must approve the recorded step participants/performance before this mix can become ready.");
    }
}
