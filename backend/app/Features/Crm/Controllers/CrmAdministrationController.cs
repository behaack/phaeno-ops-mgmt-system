namespace PhaenoPortal.App.Features.Crm.Controllers;

using System.Globalization;
using System.Text;
using System.Text.Json;
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
[Route("api/platform/crm/administration")]
public sealed class CrmAdministrationController(PSeqOperationsDbContext dbContext, IExternalIdentityContext externalIdentityContext) : ControllerBase
{
    private static readonly IReadOnlyDictionary<CrmRecordType, HashSet<string>> ImportColumns =
        new Dictionary<CrmRecordType, HashSet<string>>
        {
            [CrmRecordType.Company] = new(["name", "domain", "phone", "industry", "source"], StringComparer.OrdinalIgnoreCase),
            [CrmRecordType.Contact] = new(["first_name", "last_name", "email", "phone", "job_title"], StringComparer.OrdinalIgnoreCase),
            [CrmRecordType.Lead] = new(["display_name", "company_name", "first_name", "last_name", "email", "phone", "source"], StringComparer.OrdinalIgnoreCase),
            [CrmRecordType.Opportunity] = new(["name", "company_name", "product_interest", "amount", "currency", "next_step"], StringComparer.OrdinalIgnoreCase)
        };

    [HttpGet("saved-views")]
    public async Task<IReadOnlyList<CrmSavedViewDto>> SavedViews([FromQuery] CrmRecordType? recordType, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var query = dbContext.CrmSavedViews.AsNoTracking().Where(value => value.IsActive && (value.IsShared || value.OwnerUserId == actor.Id));
        if (recordType.HasValue) query = query.Where(value => value.RecordType == recordType);
        return await query.OrderBy(value => value.RecordType).ThenBy(value => value.Name)
            .Select(value => new CrmSavedViewDto(value.Id, value.Name, value.RecordType, value.FilterJson, value.IsShared, value.OwnerUserId, value.IsActive, value.Version))
            .ToListAsync(cancellationToken);
    }

    [HttpPost("saved-views")]
    public async Task<ActionResult<CrmSavedViewDto>> CreateSavedView([FromBody] UpsertCrmSavedViewRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var value = Execute(() => new CrmSavedView(request.Name, request.RecordType, request.FilterJson, request.IsShared, actor.Id));
        dbContext.CrmSavedViews.Add(value);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/crm/administration/saved-views/{value.Id}", ToDto(value));
    }

    [HttpPut("saved-views/{id:guid}")]
    public async Task<CrmSavedViewDto> UpdateSavedView(Guid id, [FromBody] UpsertCrmSavedViewRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var value = await dbContext.CrmSavedViews.FirstOrDefaultAsync(item => item.Id == id && item.OwnerUserId == actor.Id, cancellationToken)
            ?? throw Missing("crm_saved_view_not_found", "The saved view was not found.");
        EnsureVersion(value.Version, request.Version ?? 0);
        if (request.RecordType != value.RecordType) throw Invalid("crm_saved_view_type_immutable", "A saved view's record type cannot be changed.");
        Execute(() => value.Update(request.Name, request.FilterJson, request.IsShared));
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    [HttpPost("saved-views/{id:guid}/deactivate")]
    public async Task<CrmSavedViewDto> DeactivateSavedView(Guid id, [FromBody] ChangeCrmCompanyActiveRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var value = await dbContext.CrmSavedViews.FirstOrDefaultAsync(item => item.Id == id && item.OwnerUserId == actor.Id, cancellationToken)
            ?? throw Missing("crm_saved_view_not_found", "The saved view was not found.");
        EnsureVersion(value.Version, request.Version);
        value.Deactivate();
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    [HttpGet("custom-fields")]
    public async Task<IReadOnlyList<CrmCustomFieldDefinitionDto>> CustomFields([FromQuery] CrmRecordType? recordType, [FromQuery] bool includeInactive = false, CancellationToken cancellationToken = default)
    {
        await RequireActor(cancellationToken);
        var query = dbContext.CrmCustomFieldDefinitions.AsNoTracking().AsQueryable();
        if (recordType.HasValue) query = query.Where(value => value.RecordType == recordType);
        if (!includeInactive) query = query.Where(value => value.IsActive);
        return await query.OrderBy(value => value.RecordType).ThenBy(value => value.Name).Select(value => ToDto(value)).ToListAsync(cancellationToken);
    }

    [HttpPost("custom-fields")]
    public async Task<ActionResult<CrmCustomFieldDefinitionDto>> CreateCustomField([FromBody] UpsertCrmCustomFieldDefinitionRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = Execute(() => new CrmCustomFieldDefinition(request.Name, request.RecordType, request.DataType, request.Sensitivity, request.OptionsJson, request.IsRequired));
        dbContext.CrmCustomFieldDefinitions.Add(value);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/crm/administration/custom-fields/{value.Id}", ToDto(value));
    }

    [HttpPut("custom-fields/{id:guid}")]
    public async Task<CrmCustomFieldDefinitionDto> UpdateCustomField(Guid id, [FromBody] UpsertCrmCustomFieldDefinitionRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await dbContext.CrmCustomFieldDefinitions.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw Missing("crm_custom_field_not_found", "The custom field was not found.");
        EnsureVersion(value.Version, request.Version ?? 0);
        if (request.RecordType != value.RecordType) throw Invalid("crm_custom_field_type_immutable", "A custom field's record type cannot be changed.");
        var proposed = Execute(() => new CrmCustomFieldDefinition(request.Name, request.RecordType, request.DataType, request.Sensitivity, request.OptionsJson, request.IsRequired));
        var existingValues = await dbContext.CrmCustomFieldValues.AsNoTracking()
            .Where(item => item.DefinitionId == id)
            .Select(item => item.ValueJson)
            .ToListAsync(cancellationToken);
        foreach (var existingValue in existingValues)
        {
            ValidateCustomValue(proposed, existingValue);
        }

        Execute(() => value.Update(request.Name, request.DataType, request.Sensitivity, request.OptionsJson, request.IsRequired));
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    [HttpPost("custom-fields/{id:guid}/{lifecycleAction:regex(^(deactivate|reactivate)$)}")]
    public async Task<CrmCustomFieldDefinitionDto> ChangeCustomField(Guid id, string lifecycleAction, [FromBody] ChangeCrmCompanyActiveRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await dbContext.CrmCustomFieldDefinitions.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw Missing("crm_custom_field_not_found", "The custom field was not found.");
        EnsureVersion(value.Version, request.Version);
        Execute(lifecycleAction == "reactivate" ? value.Reactivate : value.Deactivate);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    [HttpGet("custom-field-values/{recordId:guid}")]
    public async Task<IReadOnlyList<CrmCustomFieldValueDto>> CustomFieldValues(Guid recordId, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        return await dbContext.CrmCustomFieldValues.AsNoTracking().Where(value => value.RecordId == recordId && value.Definition.IsActive)
            .Select(value => new CrmCustomFieldValueDto(value.DefinitionId, value.RecordId, value.ValueJson, value.Version)).ToListAsync(cancellationToken);
    }

    [HttpPut("custom-field-values")]
    public async Task<CrmCustomFieldValueDto> SetCustomFieldValue([FromBody] UpsertCrmCustomFieldValueRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var definition = await dbContext.CrmCustomFieldDefinitions.FirstOrDefaultAsync(value => value.Id == request.DefinitionId && value.IsActive, cancellationToken)
            ?? throw Missing("crm_custom_field_not_found", "The active custom field was not found.");
        await EnsureRecordExists(definition.RecordType, request.RecordId, cancellationToken);
        ValidateCustomValue(definition, request.ValueJson);
        var value = await dbContext.CrmCustomFieldValues.FirstOrDefaultAsync(item => item.DefinitionId == request.DefinitionId && item.RecordId == request.RecordId, cancellationToken);
        if (value is null)
        {
            value = Execute(() => new CrmCustomFieldValue(request.DefinitionId, request.RecordId, request.ValueJson));
            dbContext.CrmCustomFieldValues.Add(value);
        }
        else
        {
            EnsureVersion(value.Version, request.Version ?? 0);
            Execute(() => value.Update(request.ValueJson));
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return new(value.DefinitionId, value.RecordId, value.ValueJson, value.Version);
    }

    [HttpGet("duplicates")]
    public async Task<IReadOnlyList<CrmDuplicateGroupDto>> Duplicates(CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var results = new List<CrmDuplicateGroupDto>();
        var companies = await dbContext.CrmCompanies.AsNoTracking().Where(value => value.IsActive).Select(value => new { value.Id, value.Name, value.DomainName }).ToListAsync(cancellationToken);
        results.AddRange(companies.GroupBy(value => value.Name.Trim(), StringComparer.OrdinalIgnoreCase).Where(group => group.Count() > 1)
            .Select(group => new CrmDuplicateGroupDto(CrmRecordType.Company, "Name", group.Key, group.Select(value => value.Id).ToList(), group.Select(value => value.Name).ToList())));
        results.AddRange(companies.Where(value => !string.IsNullOrWhiteSpace(value.DomainName)).GroupBy(value => value.DomainName!, StringComparer.OrdinalIgnoreCase).Where(group => group.Count() > 1)
            .Select(group => new CrmDuplicateGroupDto(CrmRecordType.Company, "Domain", group.Key, group.Select(value => value.Id).ToList(), group.Select(value => value.Name).ToList())));
        var contacts = await dbContext.CrmContacts.AsNoTracking().Where(value => value.IsActive && value.NormalizedEmail != null).Select(value => new { value.Id, value.FirstName, value.LastName, value.NormalizedEmail }).ToListAsync(cancellationToken);
        results.AddRange(contacts.GroupBy(value => value.NormalizedEmail!, StringComparer.OrdinalIgnoreCase).Where(group => group.Count() > 1)
            .Select(group => new CrmDuplicateGroupDto(CrmRecordType.Contact, "Email", group.Key, group.Select(value => value.Id).ToList(), group.Select(value => $"{value.FirstName} {value.LastName}".Trim()).ToList())));
        return results;
    }

    [HttpPost("imports/preview")]
    public async Task<ActionResult<CrmImportPreviewDto>> PreviewImport([FromBody] PreviewCrmImportRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        if (request.RecordType == CrmRecordType.Task) throw Invalid("crm_import_type_unsupported", "Task imports are not supported because tasks require an explicit CRM record link.");
        if (request.Rows.Count == 0) throw Invalid("crm_import_empty", "The import contains no data rows.");
        if (request.Rows.Count > 5000) throw Invalid("crm_import_too_large", "Import no more than 5,000 rows at a time.");
        var existing = await dbContext.CrmImportBatches.AsNoTracking().FirstOrDefaultAsync(value => value.IdempotencyKey == request.IdempotencyKey, cancellationToken);
        if (existing is not null) return ToDto(existing);
        var errors = new List<string>();
        var duplicateRows = 0;
        var normalizedRows = new List<IReadOnlyDictionary<string, string?>>(request.Rows.Count);
        var importKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (var index = 0; index < request.Rows.Count; index++)
        {
            var row = request.Rows[index].Values;
            var schemaError = ValidateImportColumns(request.RecordType, row);
            var normalizedRow = NormalizeImportRow(request.RecordType, row);
            normalizedRows.Add(normalizedRow);
            var error = schemaError ?? await ValidateImportRow(request.RecordType, normalizedRow, cancellationToken);
            if (error is not null) errors.Add($"Row {index + 1}: {error}");
            else
            {
                var importKey = ImportDuplicateKey(request.RecordType, normalizedRow);
                if ((importKey is not null && !importKeys.Add(importKey)) || await IsDuplicate(request.RecordType, normalizedRow, cancellationToken)) duplicateRows++;
            }
        }

        var rowsJson = JsonSerializer.Serialize(normalizedRows);
        var errorJson = errors.Count == 0 ? null : JsonSerializer.Serialize(errors);
        var value = Execute(() => new CrmImportBatch(request.RecordType, request.IdempotencyKey, request.FileName, rowsJson, request.Rows.Count, request.Rows.Count - errors.Count - duplicateRows, duplicateRows, errors.Count, errorJson));
        dbContext.CrmImportBatches.Add(value);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/crm/administration/imports/{value.Id}", ToDto(value, errors));
    }

    [HttpPost("imports/{id:guid}/commit")]
    public async Task<CrmImportPreviewDto> CommitImport(Guid id, [FromBody] CommitCrmImportRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var value = await dbContext.CrmImportBatches.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw Missing("crm_import_not_found", "The import preview was not found.");
        EnsureVersion(value.Version, request.Version);
        if (value.Status == CrmImportStatus.Committed) return ToDto(value);
        var rows = JsonSerializer.Deserialize<List<Dictionary<string, string?>>>(value.RowsJson) ?? [];
        var importKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in rows)
        {
            var importKey = ImportDuplicateKey(value.RecordType, row);
            if (importKey is not null && !importKeys.Add(importKey)) continue;
            await AddImportRow(value.RecordType, row, actor, cancellationToken);
        }
        Execute(() => value.Commit(DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    [HttpPost("exports")]
    public async Task<IActionResult> Export([FromBody] CreateCrmExportRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var (csv, count) = await BuildCsv(request.RecordType, request.FilterJson, cancellationToken);
        dbContext.CrmExportRecords.Add(Execute(() => new CrmExportRecord(request.RecordType, request.FilterJson, count, actor.Id, DateTime.UtcNow)));
        await dbContext.SaveChangesAsync(cancellationToken);
        return File(Encoding.UTF8.GetBytes(csv), "text/csv; charset=utf-8", $"crm-{request.RecordType.ToString().ToLowerInvariant()}-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv");
    }

    private async Task AddImportRow(CrmRecordType type, IReadOnlyDictionary<string, string?> row, User actor, CancellationToken cancellationToken)
    {
        if (await IsDuplicate(type, row, cancellationToken)) return;
        switch (type)
        {
            case CrmRecordType.Company:
                dbContext.CrmCompanies.Add(Execute(() => new CrmCompany(Get(row, "name")!, actor.Id, domainName: Get(row, "domain"), phone: Get(row, "phone"), industry: Get(row, "industry"), source: Get(row, "source"))));
                break;
            case CrmRecordType.Contact:
                dbContext.CrmContacts.Add(Execute(() => new CrmContact(Get(row, "first_name")!, Get(row, "last_name")!, actor.Id, Get(row, "email"), Get(row, "phone"), Get(row, "job_title"))));
                break;
            case CrmRecordType.Lead:
                var companyName = Get(row, "company_name");
                var kind = string.IsNullOrWhiteSpace(companyName) ? CrmLeadKind.Individual : CrmLeadKind.Company;
                dbContext.CrmLeads.Add(Execute(() => new CrmLead(kind, Get(row, "display_name")!, actor.Id, companyName, Get(row, "first_name"), Get(row, "last_name"), Get(row, "email"), Get(row, "phone"), Get(row, "source"))));
                break;
            case CrmRecordType.Opportunity:
                var company = await dbContext.CrmCompanies.FirstAsync(value => value.IsActive && value.Name.ToLower() == Get(row, "company_name")!.ToLower(), cancellationToken);
                var stage = await dbContext.CrmPipelineStages.Where(value => value.IsActive && value.Category == CrmPipelineStageCategory.Open && value.Pipeline.IsActive).OrderByDescending(value => value.Pipeline.IsDefault).ThenBy(value => value.Position).FirstAsync(cancellationToken);
                decimal? amount = decimal.TryParse(Get(row, "amount"), NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed) ? parsed : null;
                var opportunity = Execute(() => new CrmOpportunity(Get(row, "name")!, company.Id, stage, actor.Id, Get(row, "product_interest"), amount, Get(row, "currency") ?? "USD", null, Get(row, "next_step"), null, null, null));
                dbContext.CrmOpportunities.Add(opportunity);
                dbContext.CrmOpportunityStageHistory.Add(new CrmOpportunityStageHistory(opportunity.Id, null, stage.Id, "Opportunity imported.", actor.Id, DateTime.UtcNow));
                break;
            default:
                throw Invalid("crm_import_type_unsupported", "This CRM record type cannot be imported.");
        }
    }

    private async Task<string?> ValidateImportRow(CrmRecordType type, IReadOnlyDictionary<string, string?> row, CancellationToken cancellationToken)
    {
        try
        {
            var ownerId = Guid.NewGuid();
            switch (type)
            {
                case CrmRecordType.Company:
                    _ = new CrmCompany(Get(row, "name")!, ownerId, domainName: Get(row, "domain"), phone: Get(row, "phone"), industry: Get(row, "industry"), source: Get(row, "source"));
                    break;
                case CrmRecordType.Contact:
                    _ = new CrmContact(Get(row, "first_name")!, Get(row, "last_name")!, ownerId, Get(row, "email"), Get(row, "phone"), Get(row, "job_title"));
                    break;
                case CrmRecordType.Lead:
                    var companyName = Get(row, "company_name");
                    _ = new CrmLead(string.IsNullOrWhiteSpace(companyName) ? CrmLeadKind.Individual : CrmLeadKind.Company, Get(row, "display_name")!, ownerId, companyName, Get(row, "first_name"), Get(row, "last_name"), Get(row, "email"), Get(row, "phone"), Get(row, "source"));
                    break;
                case CrmRecordType.Opportunity:
                    var opportunityName = Get(row, "name");
                    var opportunityCompanyName = Get(row, "company_name");
                    if (string.IsNullOrWhiteSpace(opportunityName) || string.IsNullOrWhiteSpace(opportunityCompanyName)) return "name and company_name are required.";
                    if (!await dbContext.CrmCompanies.AnyAsync(value => value.IsActive && value.Name.ToLower() == opportunityCompanyName.ToLower(), cancellationToken)) return "company_name must exactly match an active Company.";
                    if (!decimal.TryParse(Get(row, "amount"), NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed) && !string.IsNullOrWhiteSpace(Get(row, "amount"))) return "amount must be a number.";
                    var stage = await dbContext.CrmPipelineStages.AsNoTracking().Where(value => value.IsActive && value.Category == CrmPipelineStageCategory.Open && value.Pipeline.IsActive).OrderByDescending(value => value.Pipeline.IsDefault).ThenBy(value => value.Position).FirstOrDefaultAsync(cancellationToken);
                    if (stage is null) return "an active pipeline with an open stage is required.";
                    _ = new CrmOpportunity(opportunityName, Guid.NewGuid(), stage, ownerId, Get(row, "product_interest"), string.IsNullOrWhiteSpace(Get(row, "amount")) ? null : parsed, Get(row, "currency") ?? "USD", null, Get(row, "next_step"), null, null, null);
                    break;
            }
        }
        catch (ArgumentException exception)
        {
            return exception.Message;
        }
        catch (InvalidOperationException exception)
        {
            return exception.Message;
        }

        return null;
    }

    private static string? ValidateImportColumns(CrmRecordType type, IReadOnlyDictionary<string, string?> row)
    {
        var allowed = ImportColumns[type];
        if (row.Keys.Any(key => !allowed.Contains(key.Trim()))) return "contains one or more unsupported columns. Use only the documented CRM import template columns.";
        if (row.Values.Any(value => value?.Length > 4000)) return "contains a value longer than 4,000 characters.";
        return null;
    }

    private static IReadOnlyDictionary<string, string?> NormalizeImportRow(CrmRecordType type, IReadOnlyDictionary<string, string?> row)
    {
        var allowed = ImportColumns[type];
        return row.Where(pair => allowed.Contains(pair.Key.Trim()))
            .ToDictionary(pair => pair.Key.Trim().ToLowerInvariant(), pair => pair.Value?.Trim(), StringComparer.OrdinalIgnoreCase);
    }

    private async Task<bool> IsDuplicate(CrmRecordType type, IReadOnlyDictionary<string, string?> row, CancellationToken cancellationToken) => type switch
    {
        CrmRecordType.Company => await dbContext.CrmCompanies.AnyAsync(value => value.IsActive && value.Name.ToLower() == Get(row, "name")!.ToLower(), cancellationToken),
        CrmRecordType.Contact when !string.IsNullOrWhiteSpace(Get(row, "email")) => await dbContext.CrmContacts.AnyAsync(value => value.IsActive && value.NormalizedEmail == Get(row, "email")!.Trim().ToUpper(), cancellationToken),
        CrmRecordType.Lead => await dbContext.CrmLeads.AnyAsync(value => value.IsActive && value.DisplayName.ToLower() == Get(row, "display_name")!.ToLower(), cancellationToken),
        CrmRecordType.Opportunity => await dbContext.CrmOpportunities.AnyAsync(value => value.IsActive && value.Name.ToLower() == Get(row, "name")!.ToLower(), cancellationToken),
        _ => false
    };

    private static string? ImportDuplicateKey(CrmRecordType type, IReadOnlyDictionary<string, string?> row) => type switch
    {
        CrmRecordType.Company => $"company:{Get(row, "name")}",
        CrmRecordType.Contact when !string.IsNullOrWhiteSpace(Get(row, "email")) => $"contact:{Get(row, "email")}",
        CrmRecordType.Lead => $"lead:{Get(row, "display_name")}",
        CrmRecordType.Opportunity => $"opportunity:{Get(row, "name")}",
        _ => null
    };

    private async Task<(string Csv, int Count)> BuildCsv(CrmRecordType type, string filterJson, CancellationToken cancellationToken)
    {
        IReadOnlyDictionary<string, JsonElement> filters;
        try
        {
            filters = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(filterJson) ?? new Dictionary<string, JsonElement>();
        }
        catch (JsonException)
        {
            throw Invalid("crm_export_filter_invalid", "The export filter is invalid.");
        }

        var rows = new List<string[]>();
        switch (type)
        {
            case CrmRecordType.Company:
                rows.Add(["id", "name", "domain", "phone", "industry", "lifecycle", "source", "active"]);
                var companyQuery = dbContext.CrmCompanies.AsNoTracking().AsQueryable();
                if (!FilterBool(filters, "includeInactive")) companyQuery = companyQuery.Where(value => value.IsActive);
                var companySearch = FilterText(filters, "search");
                if (companySearch is not null)
                {
                    var companyPattern = $"%{EscapeLike(companySearch)}%";
                    companyQuery = companyQuery.Where(value => EF.Functions.ILike(value.Name, companyPattern, "\\") || (value.DomainName != null && EF.Functions.ILike(value.DomainName, companyPattern, "\\")) || (value.Industry != null && EF.Functions.ILike(value.Industry, companyPattern, "\\")));
                }
                rows.AddRange((await companyQuery.OrderBy(value => value.Name).ToListAsync(cancellationToken)).Select(value => new[] { value.Id.ToString(), value.Name, value.DomainName ?? "", value.Phone ?? "", value.Industry ?? "", value.LifecycleState.ToString(), value.Source ?? "", value.IsActive.ToString() }));
                break;
            case CrmRecordType.Contact:
                rows.Add(["id", "first_name", "last_name", "email", "phone", "job_title", "preference", "active"]);
                var contactQuery = dbContext.CrmContacts.AsNoTracking().AsQueryable();
                if (!FilterBool(filters, "includeInactive")) contactQuery = contactQuery.Where(value => value.IsActive);
                var contactSearch = FilterText(filters, "search");
                if (contactSearch is not null)
                {
                    var contactPattern = $"%{EscapeLike(contactSearch)}%";
                    contactQuery = contactQuery.Where(value => EF.Functions.ILike(value.FirstName, contactPattern, "\\") || EF.Functions.ILike(value.LastName, contactPattern, "\\") || (value.Email != null && EF.Functions.ILike(value.Email, contactPattern, "\\")) || (value.JobTitle != null && EF.Functions.ILike(value.JobTitle, contactPattern, "\\")));
                }
                rows.AddRange((await contactQuery.OrderBy(value => value.LastName).ThenBy(value => value.FirstName).ToListAsync(cancellationToken)).Select(value => new[] { value.Id.ToString(), value.FirstName, value.LastName, value.Email ?? "", value.Phone ?? "", value.JobTitle ?? "", value.CommunicationPreference.ToString(), value.IsActive.ToString() }));
                break;
            case CrmRecordType.Lead:
                rows.Add(["id", "display_name", "company_name", "email", "phone", "source", "status", "active"]);
                var leadQuery = dbContext.CrmLeads.AsNoTracking().AsQueryable();
                if (!FilterBool(filters, "includeInactive")) leadQuery = leadQuery.Where(value => value.IsActive);
                var leadStatus = FilterEnum<CrmLeadStatus>(filters, "status");
                if (leadStatus.HasValue) leadQuery = leadQuery.Where(value => value.Status == leadStatus.Value);
                var leadSearch = FilterText(filters, "search");
                if (leadSearch is not null)
                {
                    var leadPattern = $"%{EscapeLike(leadSearch)}%";
                    leadQuery = leadQuery.Where(value => EF.Functions.ILike(value.DisplayName, leadPattern, "\\") || (value.CompanyName != null && EF.Functions.ILike(value.CompanyName, leadPattern, "\\")) || (value.Email != null && EF.Functions.ILike(value.Email, leadPattern, "\\")));
                }
                rows.AddRange((await leadQuery.OrderBy(value => value.DisplayName).ToListAsync(cancellationToken)).Select(value => new[] { value.Id.ToString(), value.DisplayName, value.CompanyName ?? "", value.Email ?? "", value.Phone ?? "", value.Source ?? "", value.Status.ToString(), value.IsActive.ToString() }));
                break;
            case CrmRecordType.Opportunity:
                rows.Add(["id", "name", "company", "pipeline", "stage", "amount", "currency", "probability", "expected_close", "active"]);
                var opportunityQuery = dbContext.CrmOpportunities.AsNoTracking().Include(value => value.Company).Include(value => value.Pipeline).Include(value => value.Stage).AsQueryable();
                if (!FilterBool(filters, "includeInactive")) opportunityQuery = opportunityQuery.Where(value => value.IsActive);
                var pipelineId = FilterGuid(filters, "pipelineId");
                var stageId = FilterGuid(filters, "stageId");
                if (pipelineId.HasValue) opportunityQuery = opportunityQuery.Where(value => value.PipelineId == pipelineId.Value);
                if (stageId.HasValue) opportunityQuery = opportunityQuery.Where(value => value.StageId == stageId.Value);
                var opportunitySearch = FilterText(filters, "search");
                if (opportunitySearch is not null)
                {
                    var opportunityPattern = $"%{EscapeLike(opportunitySearch)}%";
                    opportunityQuery = opportunityQuery.Where(value => EF.Functions.ILike(value.Name, opportunityPattern, "\\") || EF.Functions.ILike(value.Company.Name, opportunityPattern, "\\") || (value.ProductInterest != null && EF.Functions.ILike(value.ProductInterest, opportunityPattern, "\\")));
                }
                rows.AddRange((await opportunityQuery.OrderBy(value => value.Name).ToListAsync(cancellationToken)).Select(value => new[] { value.Id.ToString(), value.Name, value.Company.Name, value.Pipeline.Name, value.Stage.Name, value.Amount?.ToString(CultureInfo.InvariantCulture) ?? "", value.Currency, value.Probability.ToString(CultureInfo.InvariantCulture), value.ExpectedCloseDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "", value.IsActive.ToString() }));
                break;
            case CrmRecordType.Task:
                rows.Add(["id", "title", "owner_id", "priority", "status", "due_at", "active"]);
                var taskQuery = dbContext.CrmTasks.AsNoTracking().AsQueryable();
                if (!FilterBool(filters, "includeInactive")) taskQuery = taskQuery.Where(value => value.IsActive);
                var taskStatus = FilterEnum<CrmTaskStatus>(filters, "status");
                if (taskStatus.HasValue) taskQuery = taskQuery.Where(value => value.Status == taskStatus.Value);
                if (FilterBool(filters, "overdue"))
                {
                    var now = DateTime.UtcNow;
                    taskQuery = taskQuery.Where(value => value.DueAt < now && value.Status != CrmTaskStatus.Completed && value.Status != CrmTaskStatus.Cancelled);
                }
                rows.AddRange((await taskQuery.OrderBy(value => value.DueAt).ToListAsync(cancellationToken)).Select(value => new[] { value.Id.ToString(), value.Title, value.OwnerUserId.ToString(), value.Priority.ToString(), value.Status.ToString(), value.DueAt.HasValue ? value.DueAt.Value.ToString("O", CultureInfo.InvariantCulture) : "", value.IsActive.ToString() }));
                break;
        }
        return (string.Join(Environment.NewLine, rows.Select(row => string.Join(',', row.Select(Csv)))), Math.Max(0, rows.Count - 1));
    }

    private async Task EnsureRecordExists(CrmRecordType type, Guid id, CancellationToken cancellationToken)
    {
        var exists = type switch
        {
            CrmRecordType.Company => await dbContext.CrmCompanies.AnyAsync(value => value.Id == id, cancellationToken),
            CrmRecordType.Contact => await dbContext.CrmContacts.AnyAsync(value => value.Id == id, cancellationToken),
            CrmRecordType.Lead => await dbContext.CrmLeads.AnyAsync(value => value.Id == id, cancellationToken),
            CrmRecordType.Opportunity => await dbContext.CrmOpportunities.AnyAsync(value => value.Id == id, cancellationToken),
            CrmRecordType.Task => await dbContext.CrmTasks.AnyAsync(value => value.Id == id, cancellationToken),
            _ => false
        };
        if (!exists) throw Missing("crm_record_not_found", "The CRM record for this custom field value was not found.");
    }

    private static void ValidateCustomValue(CrmCustomFieldDefinition definition, string json)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            var kind = root.ValueKind;
            if (kind == JsonValueKind.Null)
            {
                if (definition.IsRequired)
                {
                    throw Invalid("crm_custom_field_value_required", $"{definition.Name} is required.");
                }

                return;
            }

            var valid = definition.DataType switch
            {
                CrmCustomFieldDataType.Text => kind == JsonValueKind.String,
                CrmCustomFieldDataType.Date => kind == JsonValueKind.String
                    && DateOnly.TryParseExact(root.GetString(), "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _),
                CrmCustomFieldDataType.Option => IsConfiguredOption(definition.OptionsJson, root),
                CrmCustomFieldDataType.Number => kind == JsonValueKind.Number,
                CrmCustomFieldDataType.Boolean => kind is JsonValueKind.True or JsonValueKind.False,
                _ => false
            };
            if (!valid) throw Invalid("crm_custom_field_value_invalid", $"Enter a valid {definition.DataType.ToString().ToLowerInvariant()} value.");
            if (definition.IsRequired && kind == JsonValueKind.String && string.IsNullOrWhiteSpace(root.GetString()))
            {
                throw Invalid("crm_custom_field_value_required", $"{definition.Name} is required.");
            }
        }
        catch (JsonException)
        {
            throw Invalid("crm_custom_field_value_invalid", "Enter a valid JSON value.");
        }
    }

    private static bool IsConfiguredOption(string? optionsJson, JsonElement value)
    {
        if (value.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(optionsJson)) return false;
        using var options = JsonDocument.Parse(optionsJson);
        return options.RootElement.ValueKind == JsonValueKind.Array
            && options.RootElement.EnumerateArray().Any(option => option.ValueKind == JsonValueKind.String
                && string.Equals(option.GetString(), value.GetString(), StringComparison.Ordinal));
    }

    private static string? FilterText(IReadOnlyDictionary<string, JsonElement> filters, string key) =>
        filters.TryGetValue(key, out var value) && value.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(value.GetString())
            ? value.GetString()!.Trim()
            : null;

    private static bool FilterBool(IReadOnlyDictionary<string, JsonElement> filters, string key) =>
        filters.TryGetValue(key, out var value) && value.ValueKind == JsonValueKind.True;

    private static Guid? FilterGuid(IReadOnlyDictionary<string, JsonElement> filters, string key) =>
        Guid.TryParse(FilterText(filters, key), out var value) ? value : null;

    private static TEnum? FilterEnum<TEnum>(IReadOnlyDictionary<string, JsonElement> filters, string key) where TEnum : struct, Enum =>
        Enum.TryParse<TEnum>(FilterText(filters, key), ignoreCase: true, out var value) ? value : null;

    private static string? Get(IReadOnlyDictionary<string, string?> row, string key) => row.FirstOrDefault(pair => string.Equals(pair.Key, key, StringComparison.OrdinalIgnoreCase)).Value?.Trim();
    private static string EscapeLike(string value) => value.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("%", "\\%", StringComparison.Ordinal).Replace("_", "\\_", StringComparison.Ordinal);
    private static string Csv(string value) => $"\"{value.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
    private static CrmSavedViewDto ToDto(CrmSavedView value) => new(value.Id, value.Name, value.RecordType, value.FilterJson, value.IsShared, value.OwnerUserId, value.IsActive, value.Version);
    private static CrmCustomFieldDefinitionDto ToDto(CrmCustomFieldDefinition value) => new(value.Id, value.Name, value.RecordType, value.DataType, value.Sensitivity, value.OptionsJson, value.IsRequired, value.IsActive, value.Version);
    private static CrmImportPreviewDto ToDto(CrmImportBatch value, IReadOnlyList<string>? errors = null) => new(value.Id, value.RecordType, value.Status, value.TotalRows, value.ValidRows, value.DuplicateRows, value.InvalidRows, errors ?? ReadErrors(value.ErrorReportJson), value.Version);
    private static IReadOnlyList<string> ReadErrors(string? json) => string.IsNullOrWhiteSpace(json) ? [] : JsonSerializer.Deserialize<List<string>>(json) ?? [];
    private async Task<User> RequireActor(CancellationToken cancellationToken) => await RequirePlatformAdminAsync(HttpContext, dbContext, externalIdentityContext, cancellationToken);
    private static CrmException Missing(string code, string message) => CrmAccess.NotFound(code, message);
    private static CrmException Invalid(string code, string message) => new(code, message);
}
