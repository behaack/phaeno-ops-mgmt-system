namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Crm.Controllers;
using PhaenoPortal.App.Features.Crm.DTOs;
using PhaenoPortal.App.Features.Crm.Services;

public sealed partial class CrmCommercialAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ConversionRequiresMissingCompanyNameWithoutSavingAndUsesTrimmedEnteredName()
    {
        await using var scope = await Scope.Create();
        var lead = new CrmLead(CrmLeadKind.Individual, "TEST ONLY person", scope.Actor.Id, firstName: "Test");
        lead.Qualify("Reviewed fit");
        scope.Db.CrmLeads.Add(lead);
        await scope.Db.SaveChangesAsync();
        var controller = scope.Controller(new CrmLeadsController(scope.Db, scope.Identity));
        var request = new ConvertCrmLeadRequest(null, true, false, false, null, null, lead.Version);
        var companyCount = await scope.Db.CrmCompanies.CountAsync();
        foreach (var name in new string?[] { null, "", "   ", new string('x', 256) })
        {
            var error = await Assert.ThrowsAsync<CrmException>(() => controller.Convert(lead.Id, request with { CompanyName = name }, default));
            Assert.Equal(400, error.StatusCode);
            Assert.Equal(companyCount, await scope.Db.CrmCompanies.CountAsync());
            Assert.Empty(await scope.Db.CrmActivities.Where(value => value.LeadId == lead.Id).ToListAsync());
            Assert.Equal(CrmLeadStatus.Qualified, (await controller.Get(lead.Id, default)).Status);
        }
        var companyName = $"TEST ONLY named conversion {Guid.NewGuid():N}";
        var result = await controller.Convert(lead.Id, request with { CompanyName = $"  {companyName}  " }, default);
        scope.Db.ChangeTracker.Clear();
        var company = await scope.Db.CrmCompanies.SingleAsync(value => value.Id == result.CompanyId);
        Assert.Equal(companyName, company.Name);
        Assert.Null(company.AccessOrganizationId);
        Assert.Equal(CrmLeadStatus.Converted, result.Lead.Status);
        Assert.Null((await controller.Get(lead.Id, default)).CompanyName);
    }

    [PostgreSqlReferenceFact]
    public async Task ConversionChecksEnteredCompanyNameForDuplicatesBeforeSaving()
    {
        await using var scope = await Scope.Create();
        var company = new CrmCompany($"TEST ONLY duplicate {Guid.NewGuid():N}", scope.Actor.Id);
        var lead = new CrmLead(CrmLeadKind.Individual, "TEST ONLY duplicate person", scope.Actor.Id, firstName: "Test");
        lead.Qualify("Reviewed fit");
        scope.Db.AddRange(company, lead);
        await scope.Db.SaveChangesAsync();
        var controller = scope.Controller(new CrmLeadsController(scope.Db, scope.Identity));
        var request = new ConvertCrmLeadRequest(null, true, false, false, null, null, lead.Version, $" {company.Name.ToUpperInvariant()} ");
        var error = await Assert.ThrowsAsync<CrmException>(() => controller.Convert(lead.Id, request, default));
        Assert.Equal("crm_lead_company_duplicate", error.ErrorCode);
        Assert.Equal(CrmLeadStatus.Qualified, (await controller.Get(lead.Id, default)).Status);
        Assert.Empty(await scope.Db.CrmActivities.Where(value => value.LeadId == lead.Id).ToListAsync());
        var linked = await controller.Convert(lead.Id, request with { CreateCompany = false, ExistingCompanyId = company.Id, CompanyName = null }, default);
        Assert.Equal(company.Id, linked.CompanyId);
    }

    [PostgreSqlReferenceFact]
    public async Task ConversionPreservesRecordedCompanyNameAndContactOnlyNeedsNoCompanyName()
    {
        await using var scope = await Scope.Create();
        var companyName = $"TEST ONLY recorded name {Guid.NewGuid():N}";
        var named = new CrmLead(CrmLeadKind.Company, "TEST ONLY named lead", scope.Actor.Id, companyName);
        var person = new CrmLead(CrmLeadKind.Individual, "TEST ONLY contact only", scope.Actor.Id, firstName: "Test");
        named.Qualify("Reviewed fit");
        person.Qualify("Reviewed fit");
        scope.Db.AddRange(named, person);
        await scope.Db.SaveChangesAsync();
        var controller = scope.Controller(new CrmLeadsController(scope.Db, scope.Identity));
        var converted = await controller.Convert(named.Id, new(null, true, false, false, null, null, named.Version, "Do not replace the recorded name"), default);
        Assert.Equal(companyName, (await scope.Db.CrmCompanies.SingleAsync(value => value.Id == converted.CompanyId)).Name);
        var contactOnly = await controller.Convert(person.Id, new(null, false, true, false, null, null, person.Version), default);
        Assert.Null(contactOnly.CompanyId);
        Assert.NotNull(contactOnly.ContactId);
    }
}
