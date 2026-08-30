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
[Route("api/platform/crm/contacts")]
public sealed class CrmContactsController(
    PSeqOperationsDbContext dbContext,
    IExternalIdentityContext externalIdentityContext) : ControllerBase
{
    [HttpGet]
    public async Task<CrmPageDto<CrmContactDto>> List(
        [FromQuery] string? search,
        [FromQuery] Guid? companyId,
        [FromQuery] bool includeInactive = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        await RequireActor(cancellationToken);
        EnsurePagination(page, pageSize);
        var query = dbContext.CrmContacts.AsNoTracking().Include(value => value.Owner).AsQueryable();
        if (!includeInactive) query = query.Where(value => value.IsActive);
        if (companyId.HasValue)
        {
            var contactIds = dbContext.CrmCompanyContacts
                .Where(value => value.CompanyId == companyId.Value && value.IsActive)
                .Select(value => value.ContactId);
            query = query.Where(value => contactIds.Contains(value.Id));
        }

        var normalizedSearch = search?.Trim();
        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            var pattern = $"%{EscapeLike(normalizedSearch)}%";
            query = query.Where(value =>
                EF.Functions.ILike(value.FirstName, pattern, "\\")
                || EF.Functions.ILike(value.LastName, pattern, "\\")
                || (value.Email != null && EF.Functions.ILike(value.Email, pattern, "\\"))
                || dbContext.CrmCompanyContacts.Any(association =>
                    association.ContactId == value.Id
                    && association.IsActive
                    && association.JobTitle != null
                    && EF.Functions.ILike(association.JobTitle, pattern, "\\")));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var values = await query.OrderBy(value => value.LastName).ThenBy(value => value.FirstName)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        var primaryPositions = await PrimaryPositions(values.Select(value => value.Id).ToList(), cancellationToken);
        return new CrmPageDto<CrmContactDto>
        {
            Items = values.Select(value => ToDto(value, primaryPosition: primaryPositions.GetValueOrDefault(value.Id))).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    [HttpGet("{contactId:guid}")]
    public async Task<CrmContactDto> Get(Guid contactId, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var contact = await Require(contactId, tracking: false, cancellationToken);
        var primaryPositions = await PrimaryPositions([contactId], cancellationToken);
        return ToDto(contact, primaryPosition: primaryPositions.GetValueOrDefault(contactId));
    }

    [HttpPost]
    public async Task<ActionResult<CrmContactDto>> Create([FromBody] UpsertCrmContactRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        await EnsureEmailWarningOnly(request.Email, null, cancellationToken);
        var owner = request.OwnerUserId.HasValue
            ? await RequireOwner(request.OwnerUserId.Value, cancellationToken)
            : actor;
        var value = Execute(() => new CrmContact(
            request.FirstName,
            request.LastName,
            owner.Id,
            request.Email,
            request.Phone,
            request.CommunicationPreference,
            request.LawfulContactBasis,
            request.CommunicationNotes,
            request.Tags));
        dbContext.CrmContacts.Add(value);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/crm/contacts/{value.Id}", ToDto(value, owner));
    }

    [HttpPut("{contactId:guid}")]
    public async Task<CrmContactDto> Update(Guid contactId, [FromBody] UpsertCrmContactRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await Require(contactId, tracking: true, cancellationToken);
        EnsureVersion(value.Version, request.Version ?? 0);
        await EnsureEmailWarningOnly(request.Email, contactId, cancellationToken);
        Execute(() => value.UpdateProfile(
            request.FirstName,
            request.LastName,
            request.Email,
            request.Phone,
            request.CommunicationPreference,
            request.LawfulContactBasis,
            request.CommunicationNotes,
            request.Tags));
        PSeq.Operations.Commercial.Accounts.Domain.User? updatedOwner = null;
        if (request.OwnerUserId.HasValue && request.OwnerUserId.Value != value.OwnerUserId)
        {
            updatedOwner = await RequireOwner(request.OwnerUserId.Value, cancellationToken);
            value.AssignOwner(updatedOwner.Id);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        var primaryPositions = await PrimaryPositions([contactId], cancellationToken);
        return ToDto(value, updatedOwner, primaryPositions.GetValueOrDefault(contactId));
    }

    [HttpPost("{contactId:guid}/{lifecycleAction:regex(^(deactivate|reactivate)$)}")]
    public async Task<CrmContactDto> ChangeActive(Guid contactId, string lifecycleAction, [FromBody] ChangeCrmCompanyActiveRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await Require(contactId, tracking: true, cancellationToken);
        EnsureVersion(value.Version, request.Version);
        Execute(lifecycleAction == "reactivate" ? value.Reactivate : value.Deactivate);
        await dbContext.SaveChangesAsync(cancellationToken);
        var primaryPositions = await PrimaryPositions([contactId], cancellationToken);
        return ToDto(value, primaryPosition: primaryPositions.GetValueOrDefault(contactId));
    }

    [HttpPost("{contactId:guid}/merge")]
    public async Task<CrmContactDto> Merge(Guid contactId, [FromBody] MergeCrmRecordRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var source = await Require(contactId, tracking: true, cancellationToken);
        EnsureVersion(source.Version, request.Version);
        var target = await Require(request.TargetId, tracking: true, cancellationToken);
        if (!target.IsActive || target.MergedIntoContactId.HasValue)
        {
            throw Conflict("crm_merge_target_invalid", "Select an active, unmerged target contact.");
        }

        var targetCompanyIds = await dbContext.CrmCompanyContacts.Where(value => value.ContactId == target.Id).Select(value => value.CompanyId).ToListAsync(cancellationToken);
        foreach (var association in await dbContext.CrmCompanyContacts.Where(value => value.ContactId == source.Id).ToListAsync(cancellationToken))
        {
            if (targetCompanyIds.Contains(association.CompanyId)) association.End(DateOnly.FromDateTime(DateTime.UtcNow) < association.EffectiveFrom ? association.EffectiveFrom : DateOnly.FromDateTime(DateTime.UtcNow));
            else association.ReassignContact(target.Id);
        }

        var targetOpportunityIds = await dbContext.CrmOpportunityContacts.Where(value => value.ContactId == target.Id).Select(value => value.OpportunityId).ToListAsync(cancellationToken);
        foreach (var association in await dbContext.CrmOpportunityContacts.Where(value => value.ContactId == source.Id).ToListAsync(cancellationToken))
        {
            if (targetOpportunityIds.Contains(association.OpportunityId)) association.Deactivate();
            else association.ReassignContact(target.Id);
        }

        foreach (var activity in await dbContext.CrmActivities.Where(value => value.ContactId == source.Id).ToListAsync(cancellationToken)) activity.ReassignContact(target.Id);
        foreach (var task in await dbContext.CrmTasks.Where(value => value.ContactId == source.Id).ToListAsync(cancellationToken)) task.ReassignContact(target.Id);
        foreach (var lead in await dbContext.CrmLeads.Where(value => value.ConvertedContactId == source.Id).ToListAsync(cancellationToken)) lead.ReassignConvertedContact(target.Id);
        var targetDefinitionIds = await dbContext.CrmCustomFieldValues.Where(value => value.RecordId == target.Id && value.Definition.RecordType == CrmRecordType.Contact).Select(value => value.DefinitionId).ToListAsync(cancellationToken);
        foreach (var fieldValue in await dbContext.CrmCustomFieldValues.AsNoTracking().Where(value => value.RecordId == source.Id && value.Definition.RecordType == CrmRecordType.Contact && !targetDefinitionIds.Contains(value.DefinitionId)).ToListAsync(cancellationToken))
        {
            dbContext.CrmCustomFieldValues.Add(Execute(() => new CrmCustomFieldValue(fieldValue.DefinitionId, target.Id, fieldValue.ValueJson)));
        }
        target.AddAlias(source.DisplayName);
        source.MergeInto(target.Id);
        dbContext.CrmMergeRecords.Add(new CrmMergeRecord(CrmRecordType.Contact, source.Id, target.Id, request.Reason, actor.Id, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        var primaryPositions = await PrimaryPositions([target.Id], cancellationToken);
        return ToDto(target, primaryPosition: primaryPositions.GetValueOrDefault(target.Id));
    }

    private async Task<PSeq.Operations.Commercial.Accounts.Domain.User> RequireActor(CancellationToken cancellationToken) =>
        await RequirePlatformAdminAsync(HttpContext, dbContext, externalIdentityContext, cancellationToken);

    private async Task<CrmContact> Require(Guid id, bool tracking, CancellationToken cancellationToken)
    {
        var query = dbContext.CrmContacts.Include(value => value.Owner).AsQueryable();
        if (!tracking) query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync(value => value.Id == id, cancellationToken)
            ?? throw NotFound("crm_contact_not_found", "The CRM contact was not found.");
    }

    private async Task<PSeq.Operations.Commercial.Accounts.Domain.User> RequireOwner(Guid id, CancellationToken cancellationToken) =>
        await dbContext.Users.FirstOrDefaultAsync(value => value.Id == id && value.IsActive && value.Memberships.Any(membership => membership.IsActive && membership.Organization!.Kind == OrganizationKind.Phaeno), cancellationToken)
        ?? throw NotFound("crm_owner_not_found", "The selected active Phaeno owner was not found.");

    private async Task EnsureEmailWarningOnly(string? email, Guid? excludedId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(email)) return;
        // Duplicates are permitted until staff completes an explicit merge; the
        // directory and import preview surface the warning rather than silently linking.
        _ = await dbContext.CrmContacts.AsNoTracking().AnyAsync(value =>
            (!excludedId.HasValue || value.Id != excludedId.Value)
            && value.NormalizedEmail == email.Trim().ToUpper(), cancellationToken);
    }

    private async Task<IReadOnlyDictionary<Guid, PrimaryCompanyPosition>> PrimaryPositions(
        IReadOnlyCollection<Guid> contactIds,
        CancellationToken cancellationToken)
    {
        if (contactIds.Count == 0)
        {
            return new Dictionary<Guid, PrimaryCompanyPosition>();
        }

        return await dbContext.CrmCompanyContacts.AsNoTracking()
            .Where(value => contactIds.Contains(value.ContactId) && value.IsActive && value.IsPrimaryCompany)
            .Select(value => new PrimaryCompanyPosition(value.ContactId, value.Company.Name, value.JobTitle))
            .ToDictionaryAsync(value => value.ContactId, cancellationToken);
    }

    private static CrmContactDto ToDto(
        CrmContact value,
        PSeq.Operations.Commercial.Accounts.Domain.User? owner = null,
        PrimaryCompanyPosition? primaryPosition = null)
    {
        var resolvedOwner = owner ?? value.Owner;
        return new CrmContactDto(value.Id, value.FirstName, value.LastName, value.DisplayName, value.Email, value.Phone,
            primaryPosition?.CompanyName, primaryPosition?.JobTitle,
            value.OwnerUserId, $"{resolvedOwner.FirstName} {resolvedOwner.LastName}".Trim(), value.CommunicationPreference,
            value.LawfulContactBasis, value.CommunicationNotes, value.Tags, value.Aliases, value.MergedIntoContactId,
            value.IsActive, value.CreatedAt, value.UpdatedAt, value.Version);
    }

    private sealed record PrimaryCompanyPosition(Guid ContactId, string CompanyName, string? JobTitle);

    private static string EscapeLike(string value) => value.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("%", "\\%", StringComparison.Ordinal).Replace("_", "\\_", StringComparison.Ordinal);
    private static CrmException NotFound(string code, string message) => CrmAccess.NotFound(code, message);
    private static CrmException Conflict(string code, string message) => CrmAccess.Conflict(code, message);
}
