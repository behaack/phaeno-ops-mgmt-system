namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Domain;

public sealed class LabPerformanceReviewService(PSeqOperationsDbContext db)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static OrderManagementException Invalid(string message) => new("performance_review_invalid", message, 409);

    public async Task RequirePerformerAsync(Guid id, CancellationToken ct)
    {
        // Former Phaeno staff can be named in historical evidence; this does not grant them current access.
        if (!await db.Users.AnyAsync(x => x.Id == id && x.Memberships.Any(m => m.Organization != null && m.Organization.Kind == OrganizationKind.Phaeno), ct))
            throw Invalid("Select an identified Phaeno staff member as the actual performer.");
    }

    public void CaptureOnBehalf(LabProtocolExecution execution, Guid actorId, DateTime now)
    {
        var record = LabProtocolEvidence.Read(execution.CapturedResultsJson).Records.Last();
        if (record.CorrectsRecordId is not null || record.Performance?.VerificationStatus != "PendingReview") return;
        if (!execution.LabSpecimenId.HasValue) throw Invalid("On-behalf performance needs an exact sample execution.");
        db.LabPerformanceProposals.Add(new(record.Id, execution.LabWorkOrderId, execution.LabSpecimenId.Value, execution.Id,
            record.Id, null, actorId, now, "OnBehalf", record.Performance.LateEntryReason!, record.Performance, null));
    }

    public static LabProtocolStepRecord RootRecord(LabProtocolExecution execution, Guid recordId)
    {
        var records = LabProtocolEvidence.Read(execution.CapturedResultsJson).Records;
        var record = records.SingleOrDefault(x => x.Id == recordId) ?? throw Invalid("The step record was not found in this execution.");
        var seen = new HashSet<Guid>();
        while (record.CorrectsRecordId.HasValue)
        {
            if (!seen.Add(record.Id)) throw Invalid("The saved correction chain is invalid.");
            record = records.SingleOrDefault(x => x.Id == record.CorrectsRecordId) ?? throw Invalid("The original step record is unavailable.");
        }
        if (record.Outcome == "skipped") throw Invalid("A skipped step cannot be assigned performed work.");
        return record;
    }

    public async Task<LabPerformanceProposal?> CurrentApprovedAsync(Guid executionId, Guid recordId, CancellationToken ct)
    {
        var approved = await (from proposal in db.LabPerformanceProposals.AsNoTracking()
            join decision in db.LabPerformanceDecisions.AsNoTracking() on proposal.Id equals decision.Id
            where proposal.LabProtocolExecutionId == executionId && proposal.StepRecordId == recordId && decision.Approved select proposal).ToListAsync(ct);
        var leaves = approved.Where(x => approved.All(y => y.BasedOnProposalId != x.Id)).ToArray();
        if (leaves.Length > 1) throw Invalid("The approved performance history conflicts. Investigate it before making another change.");
        return leaves.SingleOrDefault();
    }

    public async Task<LabPerformanceProposal> ProposeAsync(Guid workId, Guid specimenId, ProposeLabPerformanceRequest request, Guid actorId, CancellationToken ct)
    {
        if (request.RequestId == Guid.Empty || request.BasedOnProposalId == Guid.Empty) throw Invalid("Valid proposal and base identities are required.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, "performance:" + request.ExecutionId, ct);
        var execution = await RequireExecutionAsync(workId, specimenId, request.ExecutionId, ct);
        var root = RootRecord(execution, request.StepRecordId);
        await RequirePerformerAsync(request.PerformedByUserId, ct);
        LabStepPerformance performance;
        try { performance = LabStepPerformance.Capture(new("earlier", true, request.PerformedAt, request.Reason), request.PerformedByUserId, LabEvidenceTime.UtcNow); }
        catch (ArgumentException e) { throw Invalid(e.Message); }
        var current = await CurrentApprovedAsync(execution.Id, root.Id, ct);
        var proposal = new LabPerformanceProposal(request.RequestId, workId, specimenId, execution.Id, root.Id, request.BasedOnProposalId,
            actorId, LabEvidenceTime.UtcNow, "Amendment", request.Reason, performance,
            current is null ? root.Performance : JsonSerializer.Deserialize<LabStepPerformance>(current.PerformanceJson, JsonOptions));
        var existing = await db.LabPerformanceProposals.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.RequestId, ct);
        if (existing is not null)
        {
            if (existing.LabProtocolExecutionId != execution.Id || existing.StepRecordId != root.Id || existing.RequestedByUserId != actorId
                || existing.BasedOnProposalId != proposal.BasedOnProposalId || existing.Reason != proposal.Reason
                || JsonSerializer.Deserialize<LabStepPerformance>(existing.PerformanceJson, JsonOptions) != JsonSerializer.Deserialize<LabStepPerformance>(proposal.PerformanceJson, JsonOptions))
                throw Invalid("This request identity was already used for different performance evidence.");
            return existing;
        }
        if (current?.Id != request.BasedOnProposalId)
            throw Invalid("The approved performance changed. Reload it before proposing a correction.");
        db.LabPerformanceProposals.Add(proposal);
        AddEvent(proposal, "PerformanceChangeProposed", actorId, new { proposalId = proposal.Id, root.Id });
        await SaveAsync(execution, ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return proposal;
    }

    public async Task<LabPerformanceDecision> DecideAsync(Guid workId, Guid specimenId, Guid proposalId, DecideLabPerformanceRequest request, Guid actorId, CancellationToken ct)
    {
        var proposal = await db.LabPerformanceProposals.AsNoTracking().SingleOrDefaultAsync(x => x.Id == proposalId && x.LabWorkOrderId == workId && x.LabSpecimenId == specimenId, ct)
            ?? throw Invalid("The performance proposal was not found for this sample.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, "performance:" + proposal.LabProtocolExecutionId, ct);
        var execution = await RequireExecutionAsync(workId, specimenId, proposal.LabProtocolExecutionId, ct);
        LabPerformanceDecision decision;
        try { decision = new(proposal, actorId, LabEvidenceTime.UtcNow, request.Approved, request.Reason); }
        catch (ArgumentException e) { throw Invalid(e.Message); }
        var existing = await db.LabPerformanceDecisions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == proposal.Id, ct);
        if (existing is not null)
        {
            if (existing.Approved != decision.Approved || existing.ReviewedByUserId != actorId || existing.Reason != decision.Reason)
                throw Invalid("This proposal already has a different review decision.");
            return existing;
        }
        if (request.Approved && (await CurrentApprovedAsync(execution.Id, proposal.StepRecordId, ct))?.Id != proposal.BasedOnProposalId)
            throw Invalid("A newer performance change has been approved. Reject this stale proposal and submit a new one against the current evidence.");
        db.LabPerformanceDecisions.Add(decision);
        AddEvent(proposal, request.Approved ? "PerformanceChangeApproved" : "PerformanceChangeRejected", actorId, new { proposalId, decision.Reason });
        await SaveAsync(execution, ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return decision;
    }

    public async Task RequireReviewedAsync(Guid attemptId, bool requireRecorded, CancellationToken ct)
    {
        var executions = await db.LabProtocolExecutions.AsNoTracking().Where(x => x.LabSpecimenAttemptId == attemptId).ToListAsync(ct);
        var executionIds = executions.Select(x => x.Id).ToArray();
        var proposals = await db.LabPerformanceProposals.AsNoTracking().Where(x => executionIds.Contains(x.LabProtocolExecutionId)).ToListAsync(ct);
        var ids = proposals.Select(x => x.Id).ToArray();
        var decisions = await db.LabPerformanceDecisions.AsNoTracking().Where(x => ids.Contains(x.Id)).ToListAsync(ct);
        if (proposals.Any(p => decisions.All(d => d.Id != p.Id))) throw Invalid("A different supervisor must review pending performer/time entries before this result can be released.");
        foreach (var execution in executions)
        foreach (var record in LabProtocolEvidence.Read(execution.CapturedResultsJson).Records.Where(x => x.Outcome != "skipped" && x.CorrectsRecordId is null))
        {
            var reviewed = proposals.Any(p => p.LabProtocolExecutionId == execution.Id && p.StepRecordId == record.Id && decisions.Any(d => d.Id == p.Id && d.Approved));
            if (!reviewed && (record.Performance?.VerificationStatus == "PendingReview" || requireRecorded && record.Performance is null))
                throw Invalid("Verified performer and time evidence is missing for a producing step. Record and independently review the evidence before release.");
        }
    }

    private async Task<LabProtocolExecution> RequireExecutionAsync(Guid workId, Guid specimenId, Guid executionId, CancellationToken ct) =>
        await db.LabProtocolExecutions.SingleOrDefaultAsync(x => x.Id == executionId && x.LabWorkOrderId == workId && x.LabSpecimenId == specimenId, ct)
        ?? throw Invalid("The execution does not belong to this job and sample.");
    private void AddEvent(LabPerformanceProposal proposal, string code, Guid actorId, object details) =>
        db.LabWorkEvents.Add(new(proposal.LabWorkOrderId, proposal.LabSpecimenId, code, LabEvidenceTime.UtcNow, actorId, JsonSerializer.Serialize(details, JsonOptions)));
    private async Task SaveAsync(LabProtocolExecution execution, CancellationToken ct)
    {
        db.Entry(execution).Property(x => x.UpdatedAt).IsModified = true;
        if (execution.LabSpecimenAttemptId.HasValue)
        {
            var attempt = await db.LabSpecimenAttempts.SingleAsync(x => x.Id == execution.LabSpecimenAttemptId, ct);
            db.Entry(attempt).Property(x => x.UpdatedAt).IsModified = true;
        }
        await db.SaveChangesAsync(ct);
    }
}
