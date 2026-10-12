namespace PhaenoPortal.App.Features.WorkAttention;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;
using System.Data;
using System.Text.Json;

public sealed record WorkAttentionResponse(IReadOnlyList<WorkItem> Items, int Page, int PageSize, int TotalCount,
    int ActionCount, int WaitingCount, int UpdateCount, DateTime EvaluatedAtUtc, IReadOnlyList<string> DisabledSources);
public sealed class WorkItem
{
    public Guid SourceId { get; init; }
    public Guid? TargetId { get; init; }
    public string SourceType { get; init; } = "";
    public string Domain { get; init; } = "";
    public string MessageKey { get; init; } = "";
    public string RecordLabel { get; init; } = "";
    public string Destination { get; init; } = "";
    public string Kind { get; init; } = "action";
    public Guid? OwnerUserId { get; init; }
    public string? OwnerName { get; set; }
    public DateTime? DueAtUtc { get; init; }
    public DateTime? CreatedAtUtc { get; init; }
    public int Priority { get; init; } = 3;
    public string Key => $"{SourceType}:{SourceId:N}:{MessageKey}";
}

[ApiController, Authorize, Route("api/work-attention")]
public sealed class WorkAttentionController(PSeqOperationsDbContext db, IExternalIdentityContext identity,
    IOptions<BootstrapOptions> bootstrap, IOptions<PSeqOrderToCashOptions> options) : ControllerBase
{
    [HttpGet]
    public async Task<WorkAttentionResponse> Read(CancellationToken token, [FromQuery] string view = "mine",
        [FromQuery] string? domain = null, [FromQuery] string kind = "action", [FromQuery] int page = 1, [FromQuery] int pageSize = 25, [FromQuery] int? priority = null)
    {
        await using var snapshot = await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, token);
        // A work poll cannot bootstrap or relink an identity. Resolve an already-active actor first.
        var actor = await AccountAccess.ReadActiveActorAsync(HttpContext, db, identity, token)
            ?? throw new OrderManagementException("active_actor_required", "An active Portal account is required.", 401);
        var result = await SessionEndpoints.GetSession(HttpContext, db, identity, bootstrap, options, token);
        var session = (result as IValueHttpResult)?.Value as SessionDto;
        if (session is not { State: "ready", SelectedOrganization.IsAvailable: true, SelectedDepartment.IsAvailable: true })
            throw new OrderManagementException("work_scope_unavailable", "Select an active organization and Department.", 403);
        async Task<WorkAttentionResponse> Complete(WorkAttentionResponse response)
        {
            await snapshot.CommitAsync(token);
            await snapshot.DisposeAsync();
            db.ChangeTracker.Clear();
            if (await AccountAccess.ReadActiveActorAsync(HttpContext, db, identity, token) is null)
                throw new OrderManagementException("work_scope_changed", "Your access changed. Refresh the work list.", 403);
            var latestResult = await SessionEndpoints.GetSession(HttpContext, db, identity, bootstrap, options, token);
            var latest = (latestResult as IValueHttpResult)?.Value as SessionDto;
            if (latest is not { State: "ready", SelectedOrganization.IsAvailable: true, SelectedDepartment.IsAvailable: true }
                || latest.IsPlatformAdmin != session.IsPlatformAdmin || latest.SelectedOrganization?.OrganizationId != session.SelectedOrganization.OrganizationId
                || latest.SelectedDepartment?.DepartmentId != session.SelectedDepartment.DepartmentId
                || latest.SelectedDepartment.IsDepartmentAdmin != session.SelectedDepartment.IsDepartmentAdmin
                || JsonSerializer.Serialize(latest.Capabilities) != JsonSerializer.Serialize(session.Capabilities))
                throw new OrderManagementException("work_scope_changed", "Your access changed. Refresh the work list.", 403);
            return response;
        }
        if (view is not ("mine" or "team" or "unassigned") || kind is not ("action" or "waiting" or "update"))
            throw new OrderManagementException("work_filter_invalid", "Choose a valid work view.");
        if (priority.HasValue && priority is < 0 or > 4)
            throw new OrderManagementException("work_filter_invalid", "Choose a valid work priority.");
        page = Math.Clamp(page, 1, 100000); pageSize = Math.Clamp(pageSize, 1, 100);
        var membership = session.Memberships.Single(m => m.OrganizationId == session.SelectedOrganization.OrganizationId);
        var staff = membership.OrganizationKind == OrganizationKind.Phaeno;
        if (!staff && view != "mine") throw new OrderManagementException("work_view_unavailable", "This work view is unavailable.", 403);
        var now = DateTime.UtcNow;
        var reader = new WorkAttentionReader(db, options.Value, session, staff, now);
        var sources = reader.Queries();
        if (!staff)
        {
            var domainWork = await reader.ReadExternalDomainActionsAsync(token);
            var projected = sources.Count == 0 ? [] : await sources.Aggregate((left, right) => left.Concat(right)).ToArrayAsync(token);
            var externalWork = projected.Concat(domainWork).ToArray();
            var externalUpdates = await reader.ReadExternalUpdatesAsync(token);
            var selected = (kind == "update" ? externalUpdates : externalWork.Where(item => item.Kind == kind))
                .Where(item => string.IsNullOrWhiteSpace(domain) || item.Domain == domain)
                .Where(item => !priority.HasValue || item.Priority == priority);
            var ordered = selected.OrderBy(item => item.Priority).ThenBy(item => item.DueAtUtc ?? DateTime.MaxValue)
                .ThenBy(item => item.CreatedAtUtc).ThenBy(item => item.SourceType).ThenBy(item => item.SourceId).ToArray();
            return await Complete(new(ordered.Skip((page - 1) * pageSize).Take(pageSize).ToArray(), page, pageSize, ordered.Length,
                externalWork.Count(item => item.Kind == "action"), externalWork.Count(item => item.Kind == "waiting"), externalUpdates.Count, now, reader.DisabledSources));
        }
        // Same projection and ordering for preview, list and counts; no controller caps or writes.
        if (sources.Count == 0) return await Complete(new([], page, pageSize, 0, 0, 0, 0, now, reader.DisabledSources));
        var all = await reader.WithScientificEligibilityAsync(sources.Aggregate((left, right) => left.Concat(right)), token);
        var personal = all.Where(item => item.OwnerUserId == null || item.OwnerUserId == actor.Id);
        var actions = await personal.CountAsync(item => item.Kind == "action", token);
        var waiting = await personal.CountAsync(item => item.Kind == "waiting", token);
        const int updates = 0;
        if (kind == "update")
        {
            return await Complete(new([], page, pageSize, 0, actions, waiting, updates, now, reader.DisabledSources));
        }
        var filtered = (view == "team" ? all : view == "unassigned" ? all.Where(item => item.OwnerUserId == null) : personal).Where(item => item.Kind == kind);
        if (priority.HasValue)
        {
            if (priority is < 0 or > 4) throw new OrderManagementException("work_filter_invalid", "Choose a valid work priority.");
            filtered = filtered.Where(item => item.Priority == priority);
        }
        if (!string.IsNullOrWhiteSpace(domain)) filtered = filtered.Where(item => item.Domain == domain);
        var rows = await Infrastructure.Api.RecordPage.ReadAsync(filtered.OrderBy(item => item.Priority)
            .ThenBy(item => item.DueAtUtc ?? DateTime.MaxValue).ThenBy(item => item.CreatedAtUtc).ThenBy(item => item.SourceType).ThenBy(item => item.SourceId), page, pageSize, token);
        var ownerIds = rows.Items.Where(item => item.OwnerUserId.HasValue).Select(item => item.OwnerUserId!.Value).Distinct().ToArray();
        var owners = await db.Users.AsNoTracking().Where(user => ownerIds.Contains(user.Id))
            .ToDictionaryAsync(user => user.Id, user => user.FirstName + " " + user.LastName, token);
        foreach (var item in rows.Items) if (item.OwnerUserId.HasValue) item.OwnerName = owners.GetValueOrDefault(item.OwnerUserId.Value);
        return await Complete(new(rows.Items, rows.Page, rows.PageSize, rows.TotalCount, actions, waiting, updates, now, reader.DisabledSources));
    }
}
