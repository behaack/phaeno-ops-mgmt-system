namespace PhaenoPortal.App.Features.Trials.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Trials.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Trials.DTOs;
using PhaenoPortal.App.Features.Trials.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using static Services.TrialAccess;

[ApiController, Authorize, Route("api/trials")]
public sealed class TrialProjectsController(PSeqOperationsDbContext db, TrialAccess access, TrialWorkflowService workflow,
    TrialReader reader, OrderIdempotencyService idempotency) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<TrialListDto>> List([FromQuery] string? search, CancellationToken token, [FromQuery] string? status = null, [FromQuery] Guid? ownerId = null) =>
        await reader.ListAsync(await access.ReadAsync(HttpContext, token), search, token, status, ownerId);
    [HttpGet("configuration")]
    public async Task<TrialConfigurationDto> Configuration([FromQuery] Guid? companyId, CancellationToken token) =>
        await reader.ConfigurationAsync(await access.ReadAsync(HttpContext, token), companyId, token);
    [HttpGet("requests")]
    public async Task<TrialHandoffPageDto> Requests(CancellationToken token, [FromQuery] string? search = null, [FromQuery] int page = 0, [FromQuery] Guid? companyId = null, [FromQuery] Guid? requestId = null) =>
        await reader.HandoffsAsync(await access.ReadAsync(HttpContext, token), search, page, companyId, requestId, token);
    [HttpGet("{id:guid}")]
    public async Task<TrialDetailDto> Detail(Guid id, CancellationToken token)
    { var actor = await access.ReadAsync(HttpContext, token); return await reader.DetailAsync(await workflow.ReadAsync(id, actor, token), actor, token); }

    [HttpPost]
    public async Task<TrialDetailDto> Create([FromBody] TrialCreateRequest request, CancellationToken token)
    {
        var actor = await access.ReadAsync(HttpContext, token); RequireStaff(actor);
        return await ExecuteAsync(actor, $"trial-create:{request.CrmHandoffId}", request, async () =>
        {
            var trial = await workflow.CreateAsync(actor, request, token); await db.SaveChangesAsync(token);
            return await reader.DetailAsync(trial, actor, token);
        }, token);
    }
    [HttpPost("{id:guid}/scope")]
    public Task<TrialDetailDto> Scope(Guid id, [FromBody] TrialScopeRequest request, CancellationToken token) =>
        MutateAsync(id, request, (trial, actor) => workflow.ProposeAsync(trial, actor, request, token), token);
    [HttpPost("{id:guid}/decisions")]
    public Task<TrialDetailDto> Decide(Guid id, [FromBody] TrialDecisionRequest request, CancellationToken token) =>
        MutateAsync(id, request, (trial, actor) => workflow.DecideAsync(trial, actor, request, token), token);
    [HttpPost("{id:guid}/accept")]
    public Task<TrialDetailDto> Accept(Guid id, [FromBody] TrialAcceptRequest request, CancellationToken token) =>
        MutateAsync(id, request, (trial, actor) => { workflow.Accept(trial, actor, request); return Task.CompletedTask; }, token);
    [HttpPost("{id:guid}/samples")]
    public Task<TrialDetailDto> Submit(Guid id, [FromBody] TrialSubmitRequest request, CancellationToken token) =>
        MutateAsync(id, request, (trial, actor) => workflow.SubmitAsync(trial, actor, request, token), token);
    [HttpPost("{id:guid}/actions/{action}")]
    public Task<TrialDetailDto> Act(Guid id, string action, [FromBody] TrialActionRequest request, CancellationToken token) =>
        MutateAsync(id, new { action, request }, (trial, actor) => workflow.ActAsync(trial, actor, action, request, token), token);

    [HttpPost("{id:guid}/crm/retry")]
    public async Task<TrialDetailDto> RetryCrm(Guid id, CancellationToken token)
    {
        var actor = await access.ReadAsync(HttpContext, token); RequireStaff(actor);
        var trial = await workflow.ReadAsync(id, actor, token);
        await new TrialCrmProjection(db).PublishAsync(id, token);
        return await reader.DetailAsync(trial, actor, token);
    }
    [HttpPost("configuration/authorities")]
    public async Task<TrialConfigurationDto> AssignAuthority([FromBody] TrialAuthorityRequest request, CancellationToken token)
    {
        var actor = await access.ReadAsync(HttpContext, token); RequireStaff(actor);
        return await ExecuteAsync(actor, $"trial-authority:{request.Domain}", request, async () =>
        {
            Guid? primaryId = null;
            if (request.IsPrimary) { if (!actor.IsPlatformAdmin) throw Error("trial_primary_assignment_forbidden", "A Phaeno platform administrator assigns the primary approvers.", 403); }
            else
            {
                var primary = await access.RequireAuthorityAsync(actor, request.Domain, token);
                if (!primary.IsPrimary) throw Error("trial_delegate_assignment_forbidden", "Only the primary approver may designate a delegate.", 403);
                primaryId = primary.Id;
            }
            if (!await workflow.EligibleStaff().AnyAsync(value => value.Id == request.UserId, token))
                throw Error("trial_authority_user_invalid", "Select an active Phaeno user.");
            if (await db.TrialApprovalAuthorities.AnyAsync(value => value.Domain == request.Domain && value.RevokedAtUtc == null
                && (value.UserId == request.UserId || request.IsPrimary && value.IsPrimary), token))
                throw Error("trial_authority_exists", "Revoke the existing authority before replacing it.", 409);
            db.TrialApprovalAuthorities.Add(new(request.UserId, request.Domain, request.IsPrimary, primaryId, actor.User.Id, request.Reason, DateTime.UtcNow));
            await db.SaveChangesAsync(token); return await reader.ConfigurationAsync(actor, null, token);
        }, token);
    }
    [HttpPost("configuration/authorities/{id:guid}/revoke")]
    public async Task<TrialConfigurationDto> RevokeAuthority(Guid id, [FromBody] TrialRevokeAuthorityRequest request, CancellationToken token)
    {
        var actor = await access.ReadAsync(HttpContext, token); RequireStaff(actor);
        return await ExecuteAsync(actor, $"trial-authority:{id}", request, async () =>
        {
            var authority = await db.TrialApprovalAuthorities.SingleOrDefaultAsync(value => value.Id == id, token) ?? throw Missing();
            Version(authority.Version, request.Version);
            if (authority.IsPrimary)
            { if (!actor.IsPlatformAdmin) throw Error("trial_primary_assignment_forbidden", "A Phaeno platform administrator manages primary assignments.", 403); }
            else
            {
                var primary = await access.RequireAuthorityAsync(actor, authority.Domain, token);
                if (!primary.IsPrimary || authority.PrimaryAuthorityId != primary.Id) throw Error("trial_delegate_assignment_forbidden", "The designating primary approver must revoke this delegate.", 403);
            }
            var now = DateTime.UtcNow; authority.Revoke(actor.User.Id, request.Reason, now);
            if (authority.IsPrimary)
                foreach (var child in await db.TrialApprovalAuthorities.Where(value => value.PrimaryAuthorityId == id && value.RevokedAtUtc == null).ToListAsync(token))
                    child.Revoke(actor.User.Id, "Primary authority revoked: " + request.Reason, now);
            await db.SaveChangesAsync(token); return await reader.ConfigurationAsync(actor, null, token);
        }, token);
    }
    [HttpPost("configuration/deliverables")]
    public async Task<TrialConfigurationDto> DefineDeliverable([FromBody] TrialDeliverableRequest request, CancellationToken token)
    {
        var actor = await access.ReadAsync(HttpContext, token);
        return await ExecuteAsync(actor, $"trial-deliverable:{request.Key.Trim().ToUpperInvariant()}", request, async () =>
        {
            await access.RequireAuthorityAsync(actor, TrialApprovalDomain.ScientificOperations, token);
            TrialRules.Text(request.Reason);
            var key = TrialRules.SampleReference(request.Key).ToUpperInvariant();
            var previous = await db.TrialDeliverableDefinitions.Where(value => value.Key == key).ToListAsync(token);
            foreach (var item in previous.Where(value => value.IsActive)) item.Retire();
            await db.SaveChangesAsync(token);
            var definition = new TrialDeliverableDefinition(key, request.Name, previous.Count == 0 ? 1 : previous.Max(value => value.Revision) + 1, request.IsDefault);
            db.TrialDeliverableDefinitions.Add(definition);
            PhaenoPortal.App.Features.Accounts.Services.AccountAudit.Add(db, HttpContext, nameof(TrialDeliverableDefinition), definition.Id,
                "TrialDeliverableDefined", null, actor.User.Id, new { definition.Key, definition.Name, definition.Revision, definition.IsDefault, request.Reason });
            await db.SaveChangesAsync(token); return await reader.ConfigurationAsync(actor, null, token);
        }, token);
    }
    [HttpPost("configuration/deliverables/{id:guid}/retire")]
    public async Task<TrialConfigurationDto> RetireDeliverable(Guid id, [FromBody] TrialActionRequest request, CancellationToken token)
    {
        var actor = await access.ReadAsync(HttpContext, token);
        return await ExecuteAsync(actor, $"trial-deliverable:{id}", request, async () =>
        {
            await access.RequireAuthorityAsync(actor, TrialApprovalDomain.ScientificOperations, token);
            TrialRules.Text(request.Reason);
            var definition = await db.TrialDeliverableDefinitions.SingleOrDefaultAsync(value => value.Id == id, token) ?? throw Missing();
            definition.Retire();
            PhaenoPortal.App.Features.Accounts.Services.AccountAudit.Add(db, HttpContext, nameof(TrialDeliverableDefinition), definition.Id,
                "TrialDeliverableRetired", null, actor.User.Id, new { definition.Key, definition.Revision, request.Reason });
            await db.SaveChangesAsync(token);
            return await reader.ConfigurationAsync(actor, null, token);
        }, token);
    }
    private async Task<TrialDetailDto> MutateAsync(Guid id, object request, Func<TrialProject, TrialActor, Task> action, CancellationToken token)
    {
        var actor = await access.ReadAsync(HttpContext, token);
        return await ExecuteAsync(actor, $"trial:{id}", request, async () =>
        {
            var trial = await workflow.ReadAsync(id, actor, token); await action(trial, actor); await db.SaveChangesAsync(token);
            return await reader.DetailAsync(trial, actor, token);
        }, token);
    }
    private async Task<T> ExecuteAsync<T>(TrialActor actor, string scope, object request, Func<Task<T>> action, CancellationToken token) where T : class
    {
        try
        {
            return (await idempotency.ExecuteAsync(actor.User.Id, scope + ":" + Request.Path, idempotency.RequireKey(HttpContext), request,
                _ => action(), cancellationToken: token, concurrencyScope: scope)).Response;
        }
        catch (ArgumentException error) { throw Error("trial_invalid", error.Message); }
        catch (InvalidOperationException error) { throw Error("trial_conflict", error.Message, 409); }
    }
}
