namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    [HttpGet("performance-performers")]
    public async Task<object> PerformancePerformers(CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var rows = await dbContext.Users.AsNoTracking().Where(x => x.Memberships.Any(m => m.Organization != null && m.Organization.Kind == OrganizationKind.Phaeno))
            .OrderBy(x => x.LastName).ThenBy(x => x.FirstName).ThenBy(x => x.Id).Take(1001)
            .Select(x => new { x.Id, name = x.FirstName + " " + x.LastName, x.IsActive }).ToListAsync(ct);
        if (rows.Count > 1000) throw Conflict("performer_list_limit", "The performer directory exceeds the supported size. Contact an administrator.");
        return rows;
    }

    [HttpGet("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/performance-reviews")]
    public async Task<object> PerformanceReviews(Guid workOrderId, Guid specimenId, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        await RequireSpecimenAsync(workOrderId, specimenId, ct);
        var proposals = await dbContext.LabPerformanceProposals.AsNoTracking().Where(x => x.LabWorkOrderId == workOrderId && x.LabSpecimenId == specimenId)
            .OrderByDescending(x => x.RequestedAtUtc).ThenBy(x => x.Id).Take(1001).ToListAsync(ct);
        if (proposals.Count > 1000) throw Conflict("performance_history_limit", "This sample exceeds the supported performance-review history size.");
        var ids = proposals.Select(x => x.Id).ToArray();
        var decisions = await dbContext.LabPerformanceDecisions.AsNoTracking().Where(x => ids.Contains(x.Id)).ToListAsync(ct);
        return new { canPropose = actor.HasAny(LabRole.Supervisor), actorId = actor.User.Id, canReview = actor.HasAny(LabRole.Supervisor), proposals, decisions };
    }

    [HttpPost("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/performance-reviews")]
    public async Task<LabPerformanceProposal> ProposePerformance(Guid workOrderId, Guid specimenId, ProposeLabPerformanceRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Supervisor);
        await RequireSpecimenAsync(workOrderId, specimenId, ct);
        return await new LabPerformanceReviewService(dbContext).ProposeAsync(workOrderId, specimenId, request, actor.User.Id, ct);
    }

    [HttpPost("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/performance-reviews/{proposalId:guid}/decision")]
    public async Task<LabPerformanceDecision> DecidePerformance(Guid workOrderId, Guid specimenId, Guid proposalId, DecideLabPerformanceRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Supervisor);
        await RequireSpecimenAsync(workOrderId, specimenId, ct);
        return await new LabPerformanceReviewService(dbContext).DecideAsync(workOrderId, specimenId, proposalId, request, actor.User.Id, ct);
    }
}
