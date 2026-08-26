namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.Crm.Domain;

public class CrmCompanyDomainTests
{
    [Fact]
    public void CompanyNormalizesIdentityAndContactFields()
    {
        var ownerUserId = Guid.NewGuid();
        var company = new CrmCompany(
            "  Example Biosciences  ",
            ownerUserId,
            "https://www.example.com/about",
            "EXAMPLE.COM.",
            "  +1 555 0100  ",
            "  Biotechnology  ",
            "  Research relationship  ");

        Assert.Equal("Example Biosciences", company.Name);
        Assert.Equal("https://www.example.com/about", company.WebsiteUrl);
        Assert.Equal("example.com", company.DomainName);
        Assert.Equal("+1 555 0100", company.Phone);
        Assert.Equal("Biotechnology", company.Industry);
        Assert.Equal("Research relationship", company.Description);
        Assert.Equal(ownerUserId, company.OwnerUserId);
        Assert.True(company.IsActive);
    }

    [Fact]
    public void CompanyRejectsInvalidWebsiteAndDomain()
    {
        var ownerUserId = Guid.NewGuid();

        Assert.Throws<ArgumentException>(() =>
            new CrmCompany("Example", ownerUserId, websiteUrl: "ftp://example.com"));
        Assert.Throws<ArgumentException>(() =>
            new CrmCompany("Example", ownerUserId, domainName: "example/path"));
    }

    [Fact]
    public void CompanyLifecyclePreservesTheRecord()
    {
        var company = new CrmCompany("Example", Guid.NewGuid());
        var id = company.Id;

        company.Deactivate();
        Assert.False(company.IsActive);

        company.Reactivate();
        Assert.True(company.IsActive);
        Assert.Equal(id, company.Id);
    }

    [Fact]
    public void ContactNormalizesEmailTagsAndMergeHistory()
    {
        var contact = new CrmContact(
            " Ada ",
            " Lovelace ",
            Guid.NewGuid(),
            "Ada@example.com",
            tags: ["Decision maker", "decision maker", " Research "]);
        var targetId = Guid.NewGuid();

        contact.AddAlias("Ada Byron");
        contact.MergeInto(targetId);

        Assert.Equal("Ada Lovelace", contact.DisplayName);
        Assert.Equal("ADA@EXAMPLE.COM", contact.NormalizedEmail);
        Assert.Equal(["Decision maker", "Research"], contact.Tags);
        Assert.Equal(["Ada Byron"], contact.Aliases);
        Assert.False(contact.IsActive);
        Assert.Equal(targetId, contact.MergedIntoContactId);
    }

    [Fact]
    public void LeadMustBeQualifiedAndRetainsConversionIdentity()
    {
        var lead = new CrmLead(
            CrmLeadKind.Company,
            "Example interest",
            Guid.NewGuid(),
            companyName: "Example Biosciences");

        Assert.Throws<InvalidOperationException>(() =>
            lead.Convert(Guid.NewGuid(), null, null, DateTime.UtcNow));

        lead.StartWorking();
        lead.Qualify("Confirmed need, authority, and timing.");
        var companyId = Guid.NewGuid();
        var contactId = Guid.NewGuid();
        var opportunityId = Guid.NewGuid();
        var convertedAt = new DateTime(2026, 8, 26, 20, 0, 0, DateTimeKind.Utc);
        lead.Convert(companyId, contactId, opportunityId, convertedAt);

        Assert.Equal(CrmLeadStatus.Converted, lead.Status);
        Assert.Equal(companyId, lead.ConvertedCompanyId);
        Assert.Equal(opportunityId, lead.ConvertedOpportunityId);
        Assert.Equal(convertedAt, lead.ConvertedAt);
        Assert.False(lead.IsActive);
        Assert.Throws<InvalidOperationException>(() => lead.Reactivate());

        var survivingCompanyId = Guid.NewGuid();
        var survivingContactId = Guid.NewGuid();
        lead.ReassignConvertedCompany(survivingCompanyId);
        lead.ReassignConvertedContact(survivingContactId);
        Assert.Equal(survivingCompanyId, lead.ConvertedCompanyId);
        Assert.Equal(survivingContactId, lead.ConvertedContactId);
    }

    [Fact]
    public void PipelineStagesEnforceTerminalProbabilitiesAndReasons()
    {
        var pipeline = new CrmPipeline("General Sales", null, true);

        Assert.Throws<ArgumentException>(() =>
            new CrmPipelineStage(pipeline.Id, "Won", 5, CrmPipelineStageCategory.Won, 90, false));
        Assert.Throws<ArgumentException>(() =>
            new CrmPipelineStage(pipeline.Id, "Lost", 6, CrmPipelineStageCategory.Lost, 10, false));

        var lost = new CrmPipelineStage(
            pipeline.Id,
            "Lost",
            6,
            CrmPipelineStageCategory.Lost,
            0,
            false);

        Assert.True(lost.RequiresReason);
    }

    [Fact]
    public void OpportunityTransitionsPreserveOutcomeRulesAndCanReopen()
    {
        var pipeline = new CrmPipeline("General Sales", null, true);
        var discovery = new CrmPipelineStage(
            pipeline.Id,
            "Discovery",
            0,
            CrmPipelineStageCategory.Open,
            20,
            false);
        var lost = new CrmPipelineStage(
            pipeline.Id,
            "Lost",
            6,
            CrmPipelineStageCategory.Lost,
            0,
            true);
        var opportunity = new CrmOpportunity(
            "Example opportunity",
            Guid.NewGuid(),
            discovery,
            Guid.NewGuid(),
            null,
            125000m,
            "usd",
            null,
            null,
            null,
            null,
            null);

        Assert.Throws<ArgumentException>(() =>
            opportunity.MoveToStage(lost, null, DateTime.UtcNow));

        var closedAt = new DateTime(2026, 8, 26, 21, 0, 0, DateTimeKind.Utc);
        opportunity.MoveToStage(lost, "Budget deferred", closedAt);
        Assert.Equal(0, opportunity.Probability);
        Assert.Equal(closedAt, opportunity.ClosedAt);
        Assert.Equal("Budget deferred", opportunity.OutcomeReason);

        opportunity.MoveToStage(discovery, "Reopened after funding", closedAt.AddDays(1));
        Assert.Equal(20, opportunity.Probability);
        Assert.Null(opportunity.ClosedAt);
        Assert.Null(opportunity.OutcomeReason);
        Assert.True(opportunity.IsActive);
    }

    [Fact]
    public void TaskRequiresARecordAndPreservesBlockedAndCompletionState()
    {
        var ownerId = Guid.NewGuid();
        Assert.Throws<ArgumentException>(() => new CrmTask(
            "Follow up",
            null,
            ownerId,
            CrmTaskPriority.High,
            null,
            null,
            null));

        var task = new CrmTask(
            "Follow up",
            null,
            ownerId,
            CrmTaskPriority.High,
            new DateTime(2026, 8, 28, 17, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 27, 17, 0, 0, DateTimeKind.Utc),
            "P1W",
            companyId: Guid.NewGuid());

        task.Block("Waiting for customer response");
        Assert.Equal(CrmTaskStatus.Blocked, task.Status);
        Assert.Equal("Waiting for customer response", task.BlockedReason);

        var completedAt = new DateTime(2026, 8, 27, 18, 0, 0, DateTimeKind.Utc);
        task.Complete(ownerId, completedAt);
        Assert.Equal(CrmTaskStatus.Completed, task.Status);
        Assert.Equal(completedAt, task.CompletedAt);
        Assert.Throws<InvalidOperationException>(() => task.Start());
    }

    [Fact]
    public void PortalTimelineActivitiesAreImmutable()
    {
        var activity = new CrmActivity(
            CrmActivityType.PortalEvent,
            "Portal account linked",
            null,
            DateTime.UtcNow,
            CrmActivityVisibility.Internal,
            Guid.NewGuid(),
            companyId: Guid.NewGuid());

        Assert.Throws<InvalidOperationException>(() => activity.Update(
            CrmActivityType.Note,
            "Changed",
            null,
            DateTime.UtcNow,
            CrmActivityVisibility.Internal));
        Assert.Throws<InvalidOperationException>(activity.Deactivate);
    }

    [Fact]
    public void OptionCustomFieldsRequireTextChoices()
    {
        Assert.Throws<ArgumentException>(() => new CrmCustomFieldDefinition(
            "Region",
            CrmRecordType.Company,
            CrmCustomFieldDataType.Option,
            CrmFieldSensitivity.Internal,
            "{}",
            false));

        var definition = new CrmCustomFieldDefinition(
            "Region",
            CrmRecordType.Company,
            CrmCustomFieldDataType.Option,
            CrmFieldSensitivity.Internal,
            "[\"North America\",\"Europe\"]",
            true);

        Assert.Equal("[\"North America\",\"Europe\"]", definition.OptionsJson);
        Assert.True(definition.IsRequired);
    }

    [Fact]
    public void CompanyContactRelationshipCanEndWithoutLosingItsEffectiveDates()
    {
        var association = new CrmCompanyContact(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Scientific sponsor",
            true,
            new DateOnly(2026, 1, 15));

        association.End(new DateOnly(2026, 8, 26));

        Assert.False(association.IsActive);
        Assert.False(association.IsPrimaryCompany);
        Assert.Equal(new DateOnly(2026, 1, 15), association.EffectiveFrom);
        Assert.Equal(new DateOnly(2026, 8, 26), association.EffectiveTo);
    }
}
