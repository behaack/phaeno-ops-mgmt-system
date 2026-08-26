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
[Route("api/platform/crm/opportunities")]
public sealed class CrmOpportunitiesController(PSeqOperationsDbContext dbContext, IExternalIdentityContext externalIdentityContext) : ControllerBase
{
    [HttpGet]
    public async Task<CrmPageDto<CrmOpportunityDto>> List([FromQuery] string? search, [FromQuery] Guid? companyId, [FromQuery] Guid? pipelineId, [FromQuery] Guid? stageId, [FromQuery] bool includeInactive = false, [FromQuery] int page = 1, [FromQuery] int pageSize = 100, CancellationToken cancellationToken = default)
    {
        await RequireActor(cancellationToken);
        EnsurePagination(page, pageSize);
        var query = Query(tracking: false);
        if (!includeInactive) query = query.Where(value => value.IsActive);
        if (companyId.HasValue) query = query.Where(value => value.CompanyId == companyId);
        if (pipelineId.HasValue) query = query.Where(value => value.PipelineId == pipelineId);
        if (stageId.HasValue) query = query.Where(value => value.StageId == stageId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{EscapeLike(search.Trim())}%";
            query = query.Where(value => EF.Functions.ILike(value.Name, pattern, "\\")
                || EF.Functions.ILike(value.Company.Name, pattern, "\\")
                || (value.ProductInterest != null && EF.Functions.ILike(value.ProductInterest, pattern, "\\")));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var values = await query.OrderBy(value => value.Stage.Position).ThenBy(value => value.ExpectedCloseDate).ThenBy(value => value.Name)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return new CrmPageDto<CrmOpportunityDto> { Items = values.Select(value => ToDto(value)).ToList(), Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    [HttpGet("{opportunityId:guid}")]
    public async Task<CrmOpportunityDto> Get(Guid opportunityId, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        return ToDto(await Require(opportunityId, false, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<CrmOpportunityDto>> Create([FromBody] UpsertCrmOpportunityRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var company = await RequireCompany(request.CompanyId, cancellationToken);
        var stage = await RequireInitialStage(request.PipelineId, request.StageId, cancellationToken);
        var owner = request.OwnerUserId.HasValue ? await RequireOwner(request.OwnerUserId.Value, cancellationToken) : actor;
        var value = Execute(() => new CrmOpportunity(request.Name, company.Id, stage, owner.Id, request.ProductInterest, request.Amount, request.Currency, request.ExpectedCloseDate, request.NextStep, request.Competitors, request.Description, request.Tags));
        dbContext.CrmOpportunities.Add(value);
        dbContext.CrmOpportunityStageHistory.Add(new CrmOpportunityStageHistory(value.Id, null, stage.Id, "Opportunity created.", actor.Id, DateTime.UtcNow));
        dbContext.CrmActivities.Add(new CrmActivity(CrmActivityType.StatusChange, "Opportunity created", $"Created in {stage.Name}.", DateTime.UtcNow, CrmActivityVisibility.Internal, actor.Id, company.Id, opportunityId: value.Id));
        await dbContext.SaveChangesAsync(cancellationToken);
        value = await Require(value.Id, false, cancellationToken);
        return Created($"/api/platform/crm/opportunities/{value.Id}", ToDto(value));
    }

    [HttpPut("{opportunityId:guid}")]
    public async Task<CrmOpportunityDto> Update(Guid opportunityId, [FromBody] UpsertCrmOpportunityRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await Require(opportunityId, true, cancellationToken);
        EnsureVersion(value.Version, request.Version ?? 0);
        if (request.CompanyId != value.CompanyId) await RequireCompany(request.CompanyId, cancellationToken);
        Execute(() => value.UpdateProfile(request.Name, request.ProductInterest, request.Amount, request.Currency, request.ExpectedCloseDate, request.NextStep, request.Competitors, request.Description, request.Tags));
        if (request.CompanyId != value.CompanyId) value.ReassignCompany(request.CompanyId);
        User? owner = null;
        if (request.OwnerUserId.HasValue && request.OwnerUserId.Value != value.OwnerUserId)
        {
            owner = await RequireOwner(request.OwnerUserId.Value, cancellationToken);
            value.AssignOwner(owner.Id);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return await Get(opportunityId, cancellationToken);
    }

    [HttpPost("{opportunityId:guid}/stage")]
    public async Task<CrmOpportunityDto> MoveStage(Guid opportunityId, [FromBody] MoveCrmOpportunityStageRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var value = await Require(opportunityId, true, cancellationToken);
        EnsureVersion(value.Version, request.Version);
        var stage = await dbContext.CrmPipelineStages.FirstOrDefaultAsync(item => item.Id == request.StageId && item.IsActive, cancellationToken)
            ?? throw NotFound("crm_stage_not_found", "The active CRM stage was not found.");
        var priorStageId = value.StageId;
        var priorStageName = value.Stage.Name;
        Execute(() => value.MoveToStage(stage, request.Reason, DateTime.UtcNow));
        dbContext.CrmOpportunityStageHistory.Add(new CrmOpportunityStageHistory(value.Id, priorStageId, stage.Id, request.Reason, actor.Id, DateTime.UtcNow));
        dbContext.CrmActivities.Add(new CrmActivity(CrmActivityType.StatusChange, $"Opportunity moved to {stage.Name}", $"Previous stage: {priorStageName}.{(string.IsNullOrWhiteSpace(request.Reason) ? string.Empty : $" Reason: {request.Reason.Trim()}")}", DateTime.UtcNow, CrmActivityVisibility.Internal, actor.Id, value.CompanyId, opportunityId: value.Id));
        await dbContext.SaveChangesAsync(cancellationToken);
        dbContext.Entry(value).Reference(item => item.Stage).IsLoaded = false;
        await dbContext.Entry(value).Reference(item => item.Stage).LoadAsync(cancellationToken);
        return ToDto(value);
    }

    [HttpGet("{opportunityId:guid}/stage-history")]
    public async Task<IReadOnlyList<CrmOpportunityStageHistoryDto>> StageHistory(Guid opportunityId, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        return await dbContext.CrmOpportunityStageHistory.AsNoTracking()
            .Where(value => value.OpportunityId == opportunityId)
            .OrderByDescending(value => value.ChangedAt)
            .Select(value => new CrmOpportunityStageHistoryDto(value.Id, value.FromStageId, value.FromStage == null ? null : value.FromStage.Name, value.ToStageId, value.ToStage.Name, value.Reason, value.ChangedByUser.FirstName + " " + value.ChangedByUser.LastName, value.ChangedAt))
            .ToListAsync(cancellationToken);
    }

    [HttpGet("{opportunityId:guid}/contacts")]
    public async Task<IReadOnlyList<CrmOpportunityContactDto>> Contacts(Guid opportunityId, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        return await dbContext.CrmOpportunityContacts.AsNoTracking().Where(value => value.OpportunityId == opportunityId)
            .OrderByDescending(value => value.IsPrimary).ThenBy(value => value.Contact.LastName).ThenBy(value => value.Contact.FirstName)
            .Select(value => new CrmOpportunityContactDto(value.Id, value.ContactId, value.Contact.FirstName + " " + value.Contact.LastName, value.Role, value.IsPrimary, value.IsActive, value.Version))
            .ToListAsync(cancellationToken);
    }

    [HttpPost("{opportunityId:guid}/contacts")]
    public async Task<ActionResult<CrmOpportunityContactDto>> AddContact(Guid opportunityId, [FromBody] UpsertCrmOpportunityContactRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        await Require(opportunityId, false, cancellationToken);
        var contact = await dbContext.CrmContacts.FirstOrDefaultAsync(value => value.Id == request.ContactId && value.IsActive, cancellationToken)
            ?? throw NotFound("crm_contact_not_found", "The active CRM contact was not found.");
        var priorAssociation = await dbContext.CrmOpportunityContacts.FirstOrDefaultAsync(value => value.OpportunityId == opportunityId && value.ContactId == request.ContactId, cancellationToken);
        if (priorAssociation?.IsActive == true) throw Conflict("crm_opportunity_contact_exists", "This contact is already associated with the Opportunity.");
        if (request.IsPrimary)
        {
            foreach (var primary in await dbContext.CrmOpportunityContacts.Where(value => value.OpportunityId == opportunityId && value.IsActive && value.IsPrimary).ToListAsync(cancellationToken)) primary.MakeSecondary();
        }

        var value = priorAssociation ?? Execute(() => new CrmOpportunityContact(opportunityId, contact.Id, request.Role, request.IsPrimary));
        if (priorAssociation is null) dbContext.CrmOpportunityContacts.Add(value);
        else
        {
            Execute(value.Reactivate);
            Execute(() => value.Update(request.Role, request.IsPrimary));
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/crm/opportunities/{opportunityId}/contacts/{value.Id}", new CrmOpportunityContactDto(value.Id, contact.Id, contact.DisplayName, value.Role, value.IsPrimary, value.IsActive, value.Version));
    }

    [HttpPut("{opportunityId:guid}/contacts/{associationId:guid}")]
    public async Task<CrmOpportunityContactDto> UpdateContact(Guid opportunityId, Guid associationId, [FromBody] UpdateCrmOpportunityContactRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await dbContext.CrmOpportunityContacts.FirstOrDefaultAsync(item => item.Id == associationId && item.OpportunityId == opportunityId && item.IsActive, cancellationToken)
            ?? throw NotFound("crm_opportunity_contact_not_found", "The active Opportunity contact association was not found.");
        EnsureVersion(value.Version, request.Version);
        if (request.IsPrimary && !value.IsPrimary)
        {
            foreach (var primary in await dbContext.CrmOpportunityContacts.Where(item => item.OpportunityId == opportunityId && item.IsActive && item.IsPrimary && item.Id != associationId).ToListAsync(cancellationToken)) primary.MakeSecondary();
        }

        Execute(() => value.Update(request.Role, request.IsPrimary));
        await dbContext.SaveChangesAsync(cancellationToken);
        var contact = await dbContext.CrmContacts.AsNoTracking().FirstAsync(item => item.Id == value.ContactId, cancellationToken);
        return new CrmOpportunityContactDto(value.Id, value.ContactId, contact.DisplayName, value.Role, value.IsPrimary, value.IsActive, value.Version);
    }

    [HttpPost("{opportunityId:guid}/contacts/{associationId:guid}/deactivate")]
    public async Task<CrmOpportunityContactDto> RemoveContact(Guid opportunityId, Guid associationId, [FromBody] ChangeCrmCompanyActiveRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await dbContext.CrmOpportunityContacts.FirstOrDefaultAsync(item => item.Id == associationId && item.OpportunityId == opportunityId, cancellationToken)
            ?? throw NotFound("crm_opportunity_contact_not_found", "The Opportunity contact association was not found.");
        EnsureVersion(value.Version, request.Version);
        Execute(value.Deactivate);
        await dbContext.SaveChangesAsync(cancellationToken);
        var contact = await dbContext.CrmContacts.AsNoTracking().FirstAsync(item => item.Id == value.ContactId, cancellationToken);
        return new CrmOpportunityContactDto(value.Id, value.ContactId, contact.DisplayName, value.Role, value.IsPrimary, value.IsActive, value.Version);
    }

    private IQueryable<CrmOpportunity> Query(bool tracking)
    {
        var query = dbContext.CrmOpportunities.Include(value => value.Company).Include(value => value.Pipeline).Include(value => value.Stage).Include(value => value.Owner).AsQueryable();
        return tracking ? query : query.AsNoTracking();
    }

    private async Task<CrmOpportunity> Require(Guid id, bool tracking, CancellationToken cancellationToken) => await Query(tracking).FirstOrDefaultAsync(value => value.Id == id, cancellationToken) ?? throw NotFound("crm_opportunity_not_found", "The CRM opportunity was not found.");
    private async Task<CrmCompany> RequireCompany(Guid id, CancellationToken cancellationToken) => await dbContext.CrmCompanies.FirstOrDefaultAsync(value => value.Id == id && value.IsActive, cancellationToken) ?? throw NotFound("crm_company_not_found", "The active CRM company was not found.");
    private async Task<User> RequireOwner(Guid id, CancellationToken cancellationToken) => await dbContext.Users.FirstOrDefaultAsync(value => value.Id == id && value.IsActive && value.Memberships.Any(membership => membership.IsActive && membership.Organization!.Kind == OrganizationKind.Phaeno), cancellationToken) ?? throw NotFound("crm_owner_not_found", "The selected active Phaeno owner was not found.");
    private async Task<CrmPipelineStage> RequireInitialStage(Guid pipelineId, Guid? stageId, CancellationToken cancellationToken)
    {
        if (stageId.HasValue)
        {
            return await dbContext.CrmPipelineStages.FirstOrDefaultAsync(value => value.Id == stageId && value.PipelineId == pipelineId && value.IsActive && value.Category == CrmPipelineStageCategory.Open, cancellationToken)
                ?? throw NotFound("crm_open_stage_not_found", "The selected active open stage was not found in this pipeline.");
        }

        return await dbContext.CrmPipelineStages.Where(value => value.PipelineId == pipelineId && value.IsActive && value.Category == CrmPipelineStageCategory.Open).OrderBy(value => value.Position).FirstOrDefaultAsync(cancellationToken)
            ?? throw NotFound("crm_open_stage_not_found", "The selected pipeline has no active open stage.");
    }

    private async Task<User> RequireActor(CancellationToken cancellationToken) => await RequirePlatformAdminAsync(HttpContext, dbContext, externalIdentityContext, cancellationToken);

    internal static CrmOpportunityDto ToDto(CrmOpportunity value, User? owner = null)
    {
        var resolvedOwner = owner ?? value.Owner;
        return new(value.Id, value.Name, value.CompanyId, value.Company.Name, value.PipelineId, value.Pipeline.Name, value.StageId, value.Stage.Name, value.Stage.Category,
            value.OwnerUserId, $"{resolvedOwner.FirstName} {resolvedOwner.LastName}".Trim(), value.ProductInterest, value.Amount, value.Currency, value.Probability,
            value.ExpectedCloseDate, value.NextStep, value.Competitors, value.Description, value.Tags, value.ClosedAt, value.OutcomeReason, value.IsActive, value.CreatedAt, value.UpdatedAt, value.Version);
    }

    private static string EscapeLike(string value) => value.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("%", "\\%", StringComparison.Ordinal).Replace("_", "\\_", StringComparison.Ordinal);
    private static CrmException NotFound(string code, string message) => CrmAccess.NotFound(code, message);
    private static CrmException Conflict(string code, string message) => CrmAccess.Conflict(code, message);
}
