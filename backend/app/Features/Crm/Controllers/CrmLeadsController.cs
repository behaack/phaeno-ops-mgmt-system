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
[Route("api/platform/crm/leads")]
public sealed class CrmLeadsController(PSeqOperationsDbContext dbContext, IExternalIdentityContext externalIdentityContext) : ControllerBase
{
    [HttpGet]
    public async Task<CrmPageDto<CrmLeadDto>> List([FromQuery] string? search, [FromQuery] CrmLeadStatus? status, [FromQuery] bool includeInactive = false, [FromQuery] int page = 1, [FromQuery] int pageSize = 25, CancellationToken cancellationToken = default)
    {
        await RequireActor(cancellationToken);
        EnsurePagination(page, pageSize);
        var query = dbContext.CrmLeads.AsNoTracking().Include(value => value.Owner).AsQueryable();
        if (!includeInactive) query = query.Where(value => value.IsActive);
        if (status.HasValue) query = query.Where(value => value.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{EscapeLike(search.Trim())}%";
            query = query.Where(value => EF.Functions.ILike(value.DisplayName, pattern, "\\")
                || (value.CompanyName != null && EF.Functions.ILike(value.CompanyName, pattern, "\\"))
                || (value.Email != null && EF.Functions.ILike(value.Email, pattern, "\\")));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var values = await query.OrderBy(value => value.Status).ThenByDescending(value => value.UpdatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return new CrmPageDto<CrmLeadDto> { Items = values.Select(value => ToDto(value)).ToList(), Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    [HttpGet("{leadId:guid}")]
    public async Task<CrmLeadDto> Get(Guid leadId, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        return ToDto(await Require(leadId, false, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<CrmLeadDto>> Create([FromBody] UpsertCrmLeadRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var owner = request.OwnerUserId.HasValue ? await RequireOwner(request.OwnerUserId.Value, cancellationToken) : actor;
        var value = Execute(() => new CrmLead(request.Kind, request.DisplayName, owner.Id, request.CompanyName, request.FirstName, request.LastName, request.Email, request.Phone, request.Source, request.NextAction, request.Tags));
        dbContext.CrmLeads.Add(value);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/crm/leads/{value.Id}", ToDto(value, owner));
    }

    [HttpPut("{leadId:guid}")]
    public async Task<CrmLeadDto> Update(Guid leadId, [FromBody] UpsertCrmLeadRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await Require(leadId, true, cancellationToken);
        EnsureVersion(value.Version, request.Version ?? 0);
        Execute(() => value.UpdateProfile(request.Kind, request.DisplayName, request.CompanyName, request.FirstName, request.LastName, request.Email, request.Phone, request.Source, request.NextAction, request.Tags));
        User? owner = null;
        if (request.OwnerUserId.HasValue && request.OwnerUserId.Value != value.OwnerUserId)
        {
            owner = await RequireOwner(request.OwnerUserId.Value, cancellationToken);
            value.AssignOwner(owner.Id);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value, owner);
    }

    [HttpPost("{leadId:guid}/working")]
    public async Task<CrmLeadDto> StartWorking(Guid leadId, [FromBody] ChangeCrmCompanyActiveRequest request, CancellationToken cancellationToken) =>
        await Change(leadId, request.Version, value => value.StartWorking(), cancellationToken);

    [HttpPost("{leadId:guid}/qualify")]
    public async Task<CrmLeadDto> Qualify(Guid leadId, [FromBody] CrmLeadDecisionRequest request, CancellationToken cancellationToken) =>
        await Change(leadId, request.Version, value => value.Qualify(request.Explanation), cancellationToken);

    [HttpPost("{leadId:guid}/disqualify")]
    public async Task<CrmLeadDto> Disqualify(Guid leadId, [FromBody] CrmLeadDecisionRequest request, CancellationToken cancellationToken) =>
        await Change(leadId, request.Version, value => value.Disqualify(request.Explanation), cancellationToken);

    [HttpPost("{leadId:guid}/convert")]
    public async Task<CrmLeadConversionDto> Convert(Guid leadId, [FromBody] ConvertCrmLeadRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var lead = await Require(leadId, true, cancellationToken);
        EnsureVersion(lead.Version, request.Version);
        if (lead.Status != CrmLeadStatus.Qualified) throw Conflict("crm_lead_not_qualified", "Qualify the lead before conversion.");

        var duplicateWarnings = await DuplicateWarnings(lead, cancellationToken);
        if (request.CreateCompany && duplicateWarnings.Any(value => value.StartsWith("Company", StringComparison.Ordinal)))
        {
            throw Conflict("crm_lead_company_duplicate", "A likely Company match exists. Select the existing Company or resolve the duplicate before conversion.");
        }

        if (request.CreateContact && duplicateWarnings.Any(value => value.StartsWith("Contact", StringComparison.Ordinal)))
        {
            throw Conflict("crm_lead_contact_duplicate", "A likely Contact match exists. Associate the existing Contact or resolve the duplicate before conversion.");
        }

        CrmCompany? company = null;
        if (request.ExistingCompanyId.HasValue)
        {
            company = await dbContext.CrmCompanies.FirstOrDefaultAsync(value => value.Id == request.ExistingCompanyId && value.IsActive, cancellationToken)
                ?? throw NotFound("crm_company_not_found", "The selected active CRM company was not found.");
        }
        else if (request.CreateCompany)
        {
            company = Execute(() => new CrmCompany(lead.CompanyName ?? lead.DisplayName, lead.OwnerUserId, source: lead.Source, tags: lead.Tags));
            dbContext.CrmCompanies.Add(company);
        }

        CrmContact? contact = null;
        if (request.CreateContact)
        {
            contact = Execute(() => new CrmContact(lead.FirstName ?? lead.DisplayName, lead.LastName ?? "Contact", lead.OwnerUserId, lead.Email, lead.Phone, tags: lead.Tags));
            dbContext.CrmContacts.Add(contact);
            if (company is not null)
            {
                dbContext.CrmCompanyContacts.Add(new CrmCompanyContact(company.Id, contact.Id, null, "Lead contact", true, DateOnly.FromDateTime(DateTime.UtcNow)));
            }
        }

        CrmOpportunity? opportunity = null;
        if (request.CreateOpportunity)
        {
            if (company is null) throw new CrmException("crm_opportunity_company_required", "Create or select a Company for the Opportunity.");
            var pipelineQuery = dbContext.CrmPipelines.Include(value => value.Stages).Where(value => value.IsActive);
            var pipeline = request.PipelineId.HasValue
                ? await pipelineQuery.FirstOrDefaultAsync(value => value.Id == request.PipelineId, cancellationToken)
                : await pipelineQuery.OrderByDescending(value => value.IsDefault).FirstOrDefaultAsync(cancellationToken);
            if (pipeline is null) throw NotFound("crm_pipeline_not_found", "No active CRM pipeline is configured.");
            var stage = pipeline.Stages.Where(value => value.IsActive && value.Category == CrmPipelineStageCategory.Open).OrderBy(value => value.Position).FirstOrDefault()
                ?? throw Conflict("crm_pipeline_open_stage_missing", "The selected pipeline has no active open stage.");
            opportunity = Execute(() => new CrmOpportunity(request.OpportunityName ?? $"{company.Name} opportunity", company.Id, stage, lead.OwnerUserId, null, null, "USD", null, lead.NextAction, null, lead.QualificationNotes, lead.Tags));
            dbContext.CrmOpportunities.Add(opportunity);
            dbContext.CrmOpportunityStageHistory.Add(new CrmOpportunityStageHistory(opportunity.Id, null, stage.Id, "Created from qualified lead.", actor.Id, DateTime.UtcNow));
            if (contact is not null) dbContext.CrmOpportunityContacts.Add(new CrmOpportunityContact(opportunity.Id, contact.Id, "Lead contact", true));
        }

        Execute(() => lead.Convert(company?.Id, contact?.Id, opportunity?.Id, DateTime.UtcNow));
        dbContext.CrmActivities.Add(new CrmActivity(CrmActivityType.StatusChange, "Lead converted", "The qualified lead was converted into durable CRM records.", DateTime.UtcNow, CrmActivityVisibility.Internal, actor.Id, company?.Id, contact?.Id, lead.Id, opportunity?.Id));
        await dbContext.SaveChangesAsync(cancellationToken);
        return new CrmLeadConversionDto(ToDto(lead), company?.Id, contact?.Id, opportunity?.Id, duplicateWarnings);
    }

    private async Task<CrmLeadDto> Change(Guid id, long version, Action<CrmLead> action, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var value = await Require(id, true, cancellationToken);
        EnsureVersion(value.Version, version);
        Execute(() => action(value));
        dbContext.CrmActivities.Add(new CrmActivity(CrmActivityType.StatusChange, $"Lead status: {value.Status}", null, DateTime.UtcNow, CrmActivityVisibility.Internal, actor.Id, leadId: value.Id));
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    private async Task<IReadOnlyList<string>> DuplicateWarnings(CrmLead lead, CancellationToken cancellationToken)
    {
        var warnings = new List<string>();
        if (!string.IsNullOrWhiteSpace(lead.CompanyName) && await dbContext.CrmCompanies.AnyAsync(value => value.IsActive && value.Name.ToLower() == lead.CompanyName.ToLower(), cancellationToken)) warnings.Add("Company name matches an existing Company.");
        if (!string.IsNullOrWhiteSpace(lead.NormalizedEmail) && await dbContext.CrmContacts.AnyAsync(value => value.IsActive && value.NormalizedEmail == lead.NormalizedEmail, cancellationToken)) warnings.Add("Contact email matches an existing Contact.");
        return warnings;
    }

    private async Task<User> RequireActor(CancellationToken cancellationToken) => await RequirePlatformAdminAsync(HttpContext, dbContext, externalIdentityContext, cancellationToken);
    private async Task<User> RequireOwner(Guid id, CancellationToken cancellationToken) => await dbContext.Users.FirstOrDefaultAsync(value => value.Id == id && value.IsActive && value.Memberships.Any(membership => membership.IsActive && membership.Organization!.Kind == OrganizationKind.Phaeno), cancellationToken) ?? throw NotFound("crm_owner_not_found", "The selected active Phaeno owner was not found.");
    private async Task<CrmLead> Require(Guid id, bool tracking, CancellationToken cancellationToken)
    {
        var query = dbContext.CrmLeads.Include(value => value.Owner).AsQueryable();
        if (!tracking) query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync(value => value.Id == id, cancellationToken) ?? throw NotFound("crm_lead_not_found", "The CRM lead was not found.");
    }

    private static CrmLeadDto ToDto(CrmLead value, User? owner = null)
    {
        var resolvedOwner = owner ?? value.Owner;
        return new(value.Id, value.Kind, value.DisplayName, value.CompanyName, value.FirstName, value.LastName, value.Email, value.Phone, value.Source, value.Status, value.QualificationNotes, value.DisqualificationReason, value.NextAction, value.OwnerUserId, $"{resolvedOwner.FirstName} {resolvedOwner.LastName}".Trim(), value.Tags, value.ConvertedAt, value.ConvertedCompanyId, value.ConvertedContactId, value.ConvertedOpportunityId, value.IsActive, value.CreatedAt, value.UpdatedAt, value.Version);
    }

    private static string EscapeLike(string value) => value.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("%", "\\%", StringComparison.Ordinal).Replace("_", "\\_", StringComparison.Ordinal);
    private static CrmException NotFound(string code, string message) => CrmAccess.NotFound(code, message);
    private static CrmException Conflict(string code, string message) => CrmAccess.Conflict(code, message);
}
