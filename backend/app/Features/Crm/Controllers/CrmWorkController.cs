namespace PhaenoPortal.App.Features.Crm.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Crm.DTOs;
using PhaenoPortal.App.Features.Crm.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using static PhaenoPortal.App.Features.Crm.Services.CrmAccess;

[ApiController]
[Authorize]
[Route("api/platform/crm")]
public sealed class CrmWorkController(PSeqOperationsDbContext dbContext, IExternalIdentityContext externalIdentityContext) : ControllerBase
{
    [HttpGet("activities")]
    public async Task<CrmPageDto<CrmActivityDto>> Activities([FromQuery] CrmActivityType? type, [FromQuery] Guid? companyId, [FromQuery] Guid? contactId, [FromQuery] Guid? leadId, [FromQuery] Guid? opportunityId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        await RequireActor(cancellationToken);
        EnsurePagination(page, pageSize);
        var query = ActivityQuery().Where(value => value.IsActive);
        if (type.HasValue) query = query.Where(value => value.Type == type);
        if (companyId.HasValue) query = query.Where(value => value.CompanyId == companyId);
        if (contactId.HasValue) query = query.Where(value => value.ContactId == contactId);
        if (leadId.HasValue) query = query.Where(value => value.LeadId == leadId);
        if (opportunityId.HasValue) query = query.Where(value => value.OpportunityId == opportunityId);
        var total = await query.CountAsync(cancellationToken);
        var values = await query.OrderByDescending(value => value.OccurredAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return new CrmPageDto<CrmActivityDto> { Items = values.Select(ToDto).ToList(), Page = page, PageSize = pageSize, TotalCount = total };
    }

    [HttpPost("activities")]
    public async Task<ActionResult<CrmActivityDto>> CreateActivity([FromBody] UpsertCrmActivityRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        await ValidateLinks(request.CompanyId, request.ContactId, request.LeadId, request.OpportunityId, cancellationToken);
        if (request.Type is CrmActivityType.System or CrmActivityType.PortalEvent or CrmActivityType.TaskEvent)
        {
            throw new CrmException("crm_activity_type_reserved", "Select Note, Call, Meeting, Email, or Status Change for manual logging.");
        }

        var value = Execute(() => new CrmActivity(request.Type, request.Subject, request.Body, request.OccurredAt, request.Visibility, actor.Id, request.CompanyId, request.ContactId, request.LeadId, request.OpportunityId));
        dbContext.CrmActivities.Add(value);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/crm/activities/{value.Id}", ToDto(await RequireActivity(value.Id, false, cancellationToken)));
    }

    [HttpPut("activities/{activityId:guid}")]
    public async Task<CrmActivityDto> UpdateActivity(Guid activityId, [FromBody] UpsertCrmActivityRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        if (request.Type is CrmActivityType.System or CrmActivityType.PortalEvent or CrmActivityType.TaskEvent)
        {
            throw new CrmException("crm_activity_type_reserved", "Select Note, Call, Meeting, Email, or Status Change for manual logging.");
        }
        var value = await RequireActivity(activityId, true, cancellationToken);
        EnsureVersion(value.Version, request.Version ?? 0);
        Execute(() => value.Update(request.Type, request.Subject, request.Body, request.OccurredAt, request.Visibility));
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    [HttpPost("activities/{activityId:guid}/deactivate")]
    public async Task<CrmActivityDto> DeactivateActivity(Guid activityId, [FromBody] ChangeCrmCompanyActiveRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await RequireActivity(activityId, true, cancellationToken);
        EnsureVersion(value.Version, request.Version);
        Execute(value.Deactivate);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    [HttpGet("tasks")]
    public async Task<CrmPageDto<CrmTaskDto>> Tasks([FromQuery] CrmTaskStatus? status, [FromQuery] Guid? ownerUserId, [FromQuery] Guid? companyId, [FromQuery] Guid? contactId, [FromQuery] Guid? leadId, [FromQuery] Guid? opportunityId, [FromQuery] bool overdueOnly = false, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        await RequireActor(cancellationToken);
        EnsurePagination(page, pageSize);
        var query = TaskQuery().Where(value => value.IsActive);
        if (status.HasValue) query = query.Where(value => value.Status == status);
        if (ownerUserId.HasValue) query = query.Where(value => value.OwnerUserId == ownerUserId);
        if (companyId.HasValue) query = query.Where(value => value.CompanyId == companyId);
        if (contactId.HasValue) query = query.Where(value => value.ContactId == contactId);
        if (leadId.HasValue) query = query.Where(value => value.LeadId == leadId);
        if (opportunityId.HasValue) query = query.Where(value => value.OpportunityId == opportunityId);
        if (overdueOnly)
        {
            var now = DateTime.UtcNow;
            query = query.Where(value => value.DueAt < now && value.Status != CrmTaskStatus.Completed && value.Status != CrmTaskStatus.Cancelled);
        }

        var total = await query.CountAsync(cancellationToken);
        var values = await query.OrderBy(value => value.Status == CrmTaskStatus.Completed || value.Status == CrmTaskStatus.Cancelled).ThenBy(value => value.DueAt).ThenByDescending(value => value.Priority)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return new CrmPageDto<CrmTaskDto> { Items = values.Select(value => ToDto(value)).ToList(), Page = page, PageSize = pageSize, TotalCount = total };
    }

    [HttpPost("tasks")]
    public async Task<ActionResult<CrmTaskDto>> CreateTask([FromBody] UpsertCrmTaskRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        await ValidateLinks(request.CompanyId, request.ContactId, request.LeadId, request.OpportunityId, cancellationToken);
        var owner = request.OwnerUserId.HasValue ? await RequireOwner(request.OwnerUserId.Value, cancellationToken) : actor;
        var value = Execute(() => new CrmTask(request.Title, request.Description, owner.Id, request.Priority, request.DueAt, request.ReminderAt, request.RecurrenceRule, request.CompanyId, request.ContactId, request.LeadId, request.OpportunityId));
        dbContext.CrmTasks.Add(value);
        dbContext.CrmActivities.Add(new CrmActivity(CrmActivityType.TaskEvent, "Task created", value.Title, DateTime.UtcNow, CrmActivityVisibility.Internal, actor.Id, request.CompanyId, request.ContactId, request.LeadId, request.OpportunityId));
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/crm/tasks/{value.Id}", ToDto(await RequireTask(value.Id, false, cancellationToken)));
    }

    [HttpPut("tasks/{taskId:guid}")]
    public async Task<CrmTaskDto> UpdateTask(Guid taskId, [FromBody] UpsertCrmTaskRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await RequireTask(taskId, true, cancellationToken);
        EnsureVersion(value.Version, request.Version ?? 0);
        Execute(() => value.Update(request.Title, request.Description, request.Priority, request.DueAt, request.ReminderAt, request.RecurrenceRule));
        User? owner = null;
        if (request.OwnerUserId.HasValue && request.OwnerUserId != value.OwnerUserId)
        {
            owner = await RequireOwner(request.OwnerUserId.Value, cancellationToken);
            value.AssignOwner(owner.Id);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return owner is null ? ToDto(value) : ToDto(value, owner);
    }

    [HttpPost("tasks/{taskId:guid}/status")]
    public async Task<CrmTaskDto> ChangeTaskStatus(Guid taskId, [FromBody] ChangeCrmTaskStatusRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var value = await RequireTask(taskId, true, cancellationToken);
        EnsureVersion(value.Version, request.Version);
        Execute(() => ApplyStatus(value, request.Status, request.Reason, actor.Id));
        dbContext.CrmActivities.Add(new CrmActivity(CrmActivityType.TaskEvent, $"Task {TaskStatusLabel(value.Status)}", value.Title, DateTime.UtcNow, CrmActivityVisibility.Internal, actor.Id, value.CompanyId, value.ContactId, value.LeadId, value.OpportunityId));
        if (value.Status == CrmTaskStatus.Completed) CreateNextRecurrence(value);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    [HttpGet("search")]
    public async Task<IReadOnlyList<CrmSearchResultDto>> Search([FromQuery] string query, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var normalized = query?.Trim();
        if (string.IsNullOrWhiteSpace(normalized) || normalized.Length < 2) return [];
        var pattern = $"%{EscapeLike(normalized)}%";
        var results = new List<CrmSearchResultDto>();
        var companies = await dbContext.CrmCompanies.AsNoTracking().Where(value => value.IsActive && (EF.Functions.ILike(value.Name, pattern, "\\") || (value.DomainName != null && EF.Functions.ILike(value.DomainName, pattern, "\\")))).OrderBy(value => value.Name).Take(8).Select(value => new { value.Id, value.Name, value.DomainName, value.LifecycleState, value.UpdatedAt }).ToListAsync(cancellationToken);
        results.AddRange(companies.Select(value => new CrmSearchResultDto(CrmRecordType.Company, value.Id, value.Name, value.DomainName, value.LifecycleState.ToString(), value.UpdatedAt)));
        var contacts = await dbContext.CrmContacts.AsNoTracking().Where(value => value.IsActive && (EF.Functions.ILike(value.FirstName, pattern, "\\") || EF.Functions.ILike(value.LastName, pattern, "\\") || (value.Email != null && EF.Functions.ILike(value.Email, pattern, "\\")))).OrderBy(value => value.LastName).Take(8).Select(value => new { value.Id, Title = value.FirstName + " " + value.LastName, value.Email, value.CommunicationPreference, value.UpdatedAt }).ToListAsync(cancellationToken);
        results.AddRange(contacts.Select(value => new CrmSearchResultDto(CrmRecordType.Contact, value.Id, value.Title, value.Email, value.CommunicationPreference.ToString(), value.UpdatedAt)));
        var leads = await dbContext.CrmLeads.AsNoTracking().Where(value => value.IsActive && EF.Functions.ILike(value.DisplayName, pattern, "\\")).OrderByDescending(value => value.UpdatedAt).Take(8).Select(value => new { value.Id, value.DisplayName, value.CompanyName, value.Status, value.UpdatedAt }).ToListAsync(cancellationToken);
        results.AddRange(leads.Select(value => new CrmSearchResultDto(CrmRecordType.Lead, value.Id, value.DisplayName, value.CompanyName, value.Status.ToString(), value.UpdatedAt)));
        results.AddRange(await dbContext.CrmOpportunities.AsNoTracking().Where(value => value.IsActive && (EF.Functions.ILike(value.Name, pattern, "\\") || EF.Functions.ILike(value.Company.Name, pattern, "\\"))).OrderByDescending(value => value.UpdatedAt).Take(8).Select(value => new CrmSearchResultDto(CrmRecordType.Opportunity, value.Id, value.Name, value.Company.Name, value.Stage.Name, value.UpdatedAt)).ToListAsync(cancellationToken));
        var tasks = await dbContext.CrmTasks.AsNoTracking().Where(value => value.IsActive && EF.Functions.ILike(value.Title, pattern, "\\")).OrderBy(value => value.DueAt).Take(8).Select(value => new { value.Id, value.Title, Owner = value.Owner.FirstName + " " + value.Owner.LastName, value.Status, value.UpdatedAt }).ToListAsync(cancellationToken);
        results.AddRange(tasks.Select(value => new CrmSearchResultDto(CrmRecordType.Task, value.Id, value.Title, value.Owner, value.Status.ToString(), value.UpdatedAt)));
        return results.OrderByDescending(value => value.UpdatedAt).Take(30).ToList();
    }

    [HttpGet("dashboard")]
    public async Task<CrmDashboardDto> Dashboard(CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var now = DateTime.UtcNow;
        var dueSoon = now.AddDays(7);
        var staleCutoff = now.AddDays(-30);
        var activeTaskQuery = dbContext.CrmTasks.Where(value => value.IsActive && value.Status != CrmTaskStatus.Completed && value.Status != CrmTaskStatus.Cancelled);
        var attention = new CrmAttentionDto(
            await activeTaskQuery.CountAsync(value => value.DueAt < now, cancellationToken),
            await activeTaskQuery.CountAsync(value => value.DueAt >= now && value.DueAt <= dueSoon, cancellationToken),
            await dbContext.CrmLeads.CountAsync(value => value.IsActive && value.Status != CrmLeadStatus.Converted && value.Status != CrmLeadStatus.Disqualified && (value.NextAction == null || value.NextAction == ""), cancellationToken),
            await dbContext.CrmOpportunities.CountAsync(value => value.IsActive && value.UpdatedAt < staleCutoff && value.Stage.Category == CrmPipelineStageCategory.Open, cancellationToken),
            await DataQualityWarningCount(cancellationToken));
        var tasks = await TaskQuery().Where(value => value.IsActive && value.OwnerUserId == actor.Id && value.Status != CrmTaskStatus.Completed && value.Status != CrmTaskStatus.Cancelled).OrderBy(value => value.DueAt).Take(10).ToListAsync(cancellationToken);
        var opportunities = await dbContext.CrmOpportunities.AsNoTracking().Include(value => value.Company).Include(value => value.Pipeline).Include(value => value.Stage).Include(value => value.Owner).Where(value => value.IsActive).OrderByDescending(value => value.UpdatedAt).Take(8).ToListAsync(cancellationToken);
        return new CrmDashboardDto(attention, tasks.Select(value => ToDto(value)).ToList(), opportunities.Select(value => CrmOpportunitiesController.ToDto(value)).ToList(), await PipelineReport(cancellationToken));
    }

    [HttpGet("reports")]
    public async Task<CrmReportsDto> Reports(CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var now = DateTime.UtcNow;
        var owners = await dbContext.Users.AsNoTracking().Where(value => value.IsActive && value.Memberships.Any(membership => membership.IsActive && membership.Organization!.Kind == OrganizationKind.Phaeno))
            .Select(value => new { value.Id, Name = value.FirstName + " " + value.LastName }).ToListAsync(cancellationToken);
        var workloads = new List<CrmOwnerWorkloadDto>();
        foreach (var owner in owners)
        {
            var openTasks = await dbContext.CrmTasks.CountAsync(value => value.OwnerUserId == owner.Id && value.IsActive && value.Status != CrmTaskStatus.Completed && value.Status != CrmTaskStatus.Cancelled, cancellationToken);
            var overdue = await dbContext.CrmTasks.CountAsync(value => value.OwnerUserId == owner.Id && value.IsActive && value.DueAt < now && value.Status != CrmTaskStatus.Completed && value.Status != CrmTaskStatus.Cancelled, cancellationToken);
            var leads = await dbContext.CrmLeads.CountAsync(value => value.OwnerUserId == owner.Id && value.IsActive, cancellationToken);
            var opportunities = await dbContext.CrmOpportunities.Where(value => value.OwnerUserId == owner.Id && value.IsActive && value.Stage.Category == CrmPipelineStageCategory.Open).Select(value => new { value.Amount, value.Currency, value.Probability }).ToListAsync(cancellationToken);
            workloads.Add(new CrmOwnerWorkloadDto(owner.Id, (owner.Name ?? string.Empty).Trim(), openTasks, overdue, leads, opportunities.Count, opportunities.Where(value => value.Currency == "USD").Sum(value => (value.Amount ?? 0m) * value.Probability / 100m)));
        }

        var leadSources = await dbContext.CrmLeads.AsNoTracking().GroupBy(value => value.Source ?? "Unspecified").Select(group => new { Source = group.Key, Leads = group.Count(), Qualified = group.Count(value => value.Status == CrmLeadStatus.Qualified || value.Status == CrmLeadStatus.Converted), Converted = group.Count(value => value.Status == CrmLeadStatus.Converted) }).ToListAsync(cancellationToken);
        var sourcePerformance = leadSources.Select(value => new CrmSourcePerformanceDto(value.Source ?? "Unspecified", value.Leads, value.Qualified, value.Converted, value.Leads == 0 ? 0 : Math.Round(value.Converted * 100d / value.Leads, 1))).ToList();
        var activityCount = await dbContext.CrmActivities.CountAsync(value => value.IsActive && value.OccurredAt >= now.AddDays(-30), cancellationToken);
        return new CrmReportsDto(await PipelineReport(cancellationToken), workloads, sourcePerformance, activityCount);
    }

    private async Task<CrmPipelineReportDto> PipelineReport(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var opportunities = await dbContext.CrmOpportunities.AsNoTracking().Include(value => value.Stage).Where(value => value.IsActive || value.ClosedAt >= now.AddDays(-365)).ToListAsync(cancellationToken);
        var open = opportunities.Where(value => value.Stage.Category == CrmPipelineStageCategory.Open).ToList();
        var won = opportunities.Count(value => value.Stage.Category == CrmPipelineStageCategory.Won);
        var lost = opportunities.Count(value => value.Stage.Category is CrmPipelineStageCategory.Lost or CrmPipelineStageCategory.Abandoned);
        var stages = opportunities.GroupBy(value => new { value.StageId, value.Stage.Name, value.Stage.Category, value.Stage.Position }).OrderBy(group => group.Key.Position)
            .Select(group => new CrmPipelineStageReportDto(group.Key.StageId, group.Key.Name, group.Key.Category, group.Count(), group.Where(value => value.Currency == "USD").Sum(value => value.Amount ?? 0m), group.Where(value => value.Currency == "USD").Sum(value => (value.Amount ?? 0m) * value.Probability / 100m), Math.Round(group.Average(value => Math.Max(0, (now - value.UpdatedAt).TotalDays)), 1))).ToList();
        return new CrmPipelineReportDto(open.Count, won, lost, open.Where(value => value.Currency == "USD").Sum(value => value.Amount ?? 0m), open.Where(value => value.Currency == "USD").Sum(value => (value.Amount ?? 0m) * value.Probability / 100m), won + lost == 0 ? 0 : Math.Round(won * 100d / (won + lost), 1), stages);
    }

    private async Task<int> DataQualityWarningCount(CancellationToken cancellationToken)
    {
        var duplicateCompanyNames = await dbContext.CrmCompanies.Where(value => value.IsActive).GroupBy(value => value.Name.ToLower()).Where(group => group.Count() > 1).CountAsync(cancellationToken);
        var duplicateEmails = await dbContext.CrmContacts.Where(value => value.IsActive && value.NormalizedEmail != null).GroupBy(value => value.NormalizedEmail).Where(group => group.Count() > 1).CountAsync(cancellationToken);
        var missingRequiredValues = 0;
        foreach (var definition in await dbContext.CrmCustomFieldDefinitions.AsNoTracking().Where(value => value.IsActive && value.IsRequired).Select(value => new { value.Id, value.RecordType }).ToListAsync(cancellationToken))
        {
            missingRequiredValues += definition.RecordType switch
            {
                CrmRecordType.Company => await dbContext.CrmCompanies.CountAsync(value => value.IsActive && !dbContext.CrmCustomFieldValues.Any(field => field.DefinitionId == definition.Id && field.RecordId == value.Id && field.ValueJson != "null" && field.ValueJson != "\"\""), cancellationToken),
                CrmRecordType.Contact => await dbContext.CrmContacts.CountAsync(value => value.IsActive && !dbContext.CrmCustomFieldValues.Any(field => field.DefinitionId == definition.Id && field.RecordId == value.Id && field.ValueJson != "null" && field.ValueJson != "\"\""), cancellationToken),
                CrmRecordType.Lead => await dbContext.CrmLeads.CountAsync(value => value.IsActive && !dbContext.CrmCustomFieldValues.Any(field => field.DefinitionId == definition.Id && field.RecordId == value.Id && field.ValueJson != "null" && field.ValueJson != "\"\""), cancellationToken),
                CrmRecordType.Opportunity => await dbContext.CrmOpportunities.CountAsync(value => value.IsActive && !dbContext.CrmCustomFieldValues.Any(field => field.DefinitionId == definition.Id && field.RecordId == value.Id && field.ValueJson != "null" && field.ValueJson != "\"\""), cancellationToken),
                CrmRecordType.Task => await dbContext.CrmTasks.CountAsync(value => value.IsActive && !dbContext.CrmCustomFieldValues.Any(field => field.DefinitionId == definition.Id && field.RecordId == value.Id && field.ValueJson != "null" && field.ValueJson != "\"\""), cancellationToken),
                _ => 0
            };
        }
        return duplicateCompanyNames + duplicateEmails + missingRequiredValues;
    }

    private void CreateNextRecurrence(CrmTask completed)
    {
        if (string.IsNullOrWhiteSpace(completed.RecurrenceRule) || !completed.DueAt.HasValue) return;
        var nextDue = completed.RecurrenceRule.Trim().ToLowerInvariant() switch
        {
            "daily" => completed.DueAt.Value.AddDays(1),
            "weekly" => completed.DueAt.Value.AddDays(7),
            "monthly" => completed.DueAt.Value.AddMonths(1),
            _ => (DateTime?)null
        };
        if (!nextDue.HasValue) return;
        var reminderOffset = completed.ReminderAt.HasValue ? completed.DueAt.Value - completed.ReminderAt.Value : (TimeSpan?)null;
        dbContext.CrmTasks.Add(new CrmTask(completed.Title, completed.Description, completed.OwnerUserId, completed.Priority, nextDue, reminderOffset.HasValue ? nextDue.Value - reminderOffset.Value : null, completed.RecurrenceRule, completed.CompanyId, completed.ContactId, completed.LeadId, completed.OpportunityId));
    }

    private static void ApplyStatus(CrmTask task, CrmTaskStatus status, string? reason, Guid actorId)
    {
        switch (status)
        {
            case CrmTaskStatus.Open: task.Reopen(); break;
            case CrmTaskStatus.InProgress: task.Start(); break;
            case CrmTaskStatus.Blocked: task.Block(reason ?? string.Empty); break;
            case CrmTaskStatus.Completed: task.Complete(actorId, DateTime.UtcNow); break;
            case CrmTaskStatus.Cancelled: task.Cancel(); break;
            default: throw new ArgumentOutOfRangeException(nameof(status));
        }
    }

    private async Task ValidateLinks(Guid? companyId, Guid? contactId, Guid? leadId, Guid? opportunityId, CancellationToken cancellationToken)
    {
        if (!companyId.HasValue && !contactId.HasValue && !leadId.HasValue && !opportunityId.HasValue) throw new CrmException("crm_record_link_required", "Select at least one CRM record.");
        if (companyId.HasValue && !await dbContext.CrmCompanies.AnyAsync(value => value.Id == companyId, cancellationToken)) throw NotFound("crm_company_not_found", "The CRM company was not found.");
        if (contactId.HasValue && !await dbContext.CrmContacts.AnyAsync(value => value.Id == contactId, cancellationToken)) throw NotFound("crm_contact_not_found", "The CRM contact was not found.");
        if (leadId.HasValue && !await dbContext.CrmLeads.AnyAsync(value => value.Id == leadId, cancellationToken)) throw NotFound("crm_lead_not_found", "The CRM lead was not found.");
        if (opportunityId.HasValue && !await dbContext.CrmOpportunities.AnyAsync(value => value.Id == opportunityId, cancellationToken)) throw NotFound("crm_opportunity_not_found", "The CRM opportunity was not found.");
    }

    private IQueryable<CrmActivity> ActivityQuery() => dbContext.CrmActivities.AsNoTracking().Include(value => value.ActorUser).Include(value => value.Company).Include(value => value.Contact).Include(value => value.Lead).Include(value => value.Opportunity);
    private IQueryable<CrmTask> TaskQuery() => dbContext.CrmTasks.AsNoTracking().Include(value => value.Owner).Include(value => value.Company).Include(value => value.Contact).Include(value => value.Lead).Include(value => value.Opportunity);
    private async Task<CrmActivity> RequireActivity(Guid id, bool tracking, CancellationToken cancellationToken)
    {
        var query = dbContext.CrmActivities.Include(value => value.ActorUser).Include(value => value.Company).Include(value => value.Contact).Include(value => value.Lead).Include(value => value.Opportunity).AsQueryable();
        if (!tracking) query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync(value => value.Id == id, cancellationToken) ?? throw NotFound("crm_activity_not_found", "The CRM activity was not found.");
    }

    private async Task<CrmTask> RequireTask(Guid id, bool tracking, CancellationToken cancellationToken)
    {
        var query = dbContext.CrmTasks.Include(value => value.Owner).Include(value => value.Company).Include(value => value.Contact).Include(value => value.Lead).Include(value => value.Opportunity).AsQueryable();
        if (!tracking) query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync(value => value.Id == id, cancellationToken) ?? throw NotFound("crm_task_not_found", "The CRM task was not found.");
    }

    private async Task<User> RequireOwner(Guid id, CancellationToken cancellationToken) => await dbContext.Users.FirstOrDefaultAsync(value => value.Id == id && value.IsActive && value.Memberships.Any(membership => membership.IsActive && membership.Organization!.Kind == OrganizationKind.Phaeno), cancellationToken) ?? throw NotFound("crm_owner_not_found", "The selected active Phaeno owner was not found.");
    private async Task<User> RequireActor(CancellationToken cancellationToken) => await RequirePlatformAdminAsync(HttpContext, dbContext, externalIdentityContext, cancellationToken);

    private static CrmActivityDto ToDto(CrmActivity value) => new(value.Id, value.Type, value.Subject, value.Body, value.OccurredAt, value.Visibility, value.ActorUserId, Name(value.ActorUser), value.CompanyId, value.Company?.Name, value.ContactId, value.Contact?.DisplayName, value.LeadId, value.Lead?.DisplayName, value.OpportunityId, value.Opportunity?.Name, value.IsActive, value.Version);
    private static CrmTaskDto ToDto(CrmTask value, User? owner = null) => new(value.Id, value.Title, value.Description, value.OwnerUserId, Name(owner ?? value.Owner), value.Priority, value.Status, value.DueAt, value.ReminderAt, value.RecurrenceRule, value.BlockedReason, value.CompletedAt, value.CompanyId, value.Company?.Name, value.ContactId, value.Contact?.DisplayName, value.LeadId, value.Lead?.DisplayName, value.OpportunityId, value.Opportunity?.Name, value.IsActive, value.Version);
    private static string Name(User value) => $"{value.FirstName} {value.LastName}".Trim();
    private static string TaskStatusLabel(CrmTaskStatus value) => value switch { CrmTaskStatus.InProgress => "started", CrmTaskStatus.Blocked => "blocked", CrmTaskStatus.Completed => "completed", CrmTaskStatus.Cancelled => "cancelled", _ => "reopened" };
    private static string EscapeLike(string value) => value.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("%", "\\%", StringComparison.Ordinal).Replace("_", "\\_", StringComparison.Ordinal);
    private static CrmException NotFound(string code, string message) => CrmAccess.NotFound(code, message);
    private static CrmException Conflict(string code, string message) => CrmAccess.Conflict(code, message);
}
