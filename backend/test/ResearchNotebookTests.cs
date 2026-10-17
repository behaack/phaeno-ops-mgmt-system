namespace PhaenoPortal.Test;

using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Research;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Research;

public sealed class ResearchNotebookTests
{
    [Theory]
    [InlineData(false)] [InlineData(true)]
    public void ResearcherAccessIsIndependentOfCommercialFlagsAndRequiresSelectedPhaeno(bool commercialFlag)
    {
        var user = new User("research@example.invalid", "Research", "Author"); user.Activate();
        var phaeno = new Organization("Phaeno", OrganizationKind.Phaeno);
        var membership = new OrganizationMembership(user.Id, phaeno.Id, false);
        typeof(OrganizationMembership).GetProperty(nameof(OrganizationMembership.Organization))!.SetValue(membership, phaeno);
        user.Memberships.Add(membership);
        Assert.False(ResearchAccess.CanAccess(user, membership, []));
        var session = SessionEndpoints.ToSession(user, [], "ready", membership, [BusinessRole.Researcher], commercialFlag);
        Assert.True(session.Capabilities.CanAccessResearch);
        Assert.False(session.Capabilities.CanOperateLabWork);
        Assert.False(session.Capabilities.CanAccessCrm);
        var external = new Organization("External", OrganizationKind.Customer);
        var externalMembership = new OrganizationMembership(user.Id, external.Id, true);
        typeof(OrganizationMembership).GetProperty(nameof(OrganizationMembership.Organization))!.SetValue(externalMembership, external);
        user.Memberships.Add(externalMembership);
        Assert.False(ResearchAccess.CanAccess(user, externalMembership, [BusinessRole.Researcher]));
        Assert.False(SessionEndpoints.ToSession(user, [], "disabled", membership, [BusinessRole.Researcher]).Capabilities.CanAccessResearch);
        membership.Deactivate();
        Assert.False(ResearchAccess.CanAccess(user, membership, [BusinessRole.Researcher]));
    }
    [Fact]
    public void CopyKeepsOnlyScientificSetupAndNeverOutcomesOrAttachmentReferences()
    {
        var blocks = ResearchContent.Initial().Select(b => b with { Text = "recorded " + b.Section }).ToList();
        blocks.Add(new(Guid.NewGuid(), "table", "results", "Yield (ng/µL)", null, ["Condition", "Yield (ng/µL)"], [["A", "42"]], null));
        blocks.Add(new(Guid.NewGuid(), "file", "method", "Method image", null, null, null, Guid.NewGuid()));
        blocks.Add(new(Guid.NewGuid(), "text", "custom", "Extra observations", "Do not copy", null, null, null));
        var copy = ResearchContent.CopySetup(blocks.ToArray());
        Assert.Equal("recorded method", copy.Single(b => b.Section == "method").Text);
        Assert.Equal("recorded purpose", copy.Single(b => b.Section == "purpose").Text);
        Assert.All(copy.Where(b => b.Kind == "text" && b.Section is not ("purpose" or "method")), b => Assert.Equal("", b.Text));
        Assert.Empty(copy.Single(b => b.Kind == "table").Rows!);
        Assert.DoesNotContain(copy, b => b.Kind == "file" || b.AttachmentId.HasValue);
        Assert.DoesNotContain(copy, b => blocks.Any(source => source.Id == b.Id));
        Assert.Contains("µL", copy.Single(b => b.Kind == "table").Columns![1]);
    }
    [Fact]
    public void EmptyNotebookCanCompleteButMustReopenBeforeChanges()
    {
        var experiment = new ResearchExperiment(Guid.NewGuid(), Guid.NewGuid(), "Exploratory run", null);
        experiment.Transition(ResearchExperimentStatus.Completed);
        Assert.Throws<InvalidOperationException>(() => experiment.Update("Correction", null));
        experiment.Transition(ResearchExperimentStatus.Active); experiment.Update("Correction", null);
        Assert.Equal("Correction", experiment.Title);
    }
    [Fact]
    public void StructuredTablesRejectRaggedRowsAndBlocksRejectMixedFileText()
    {
        Assert.Throws<ArgumentException>(() => ResearchContent.Serialize([new(Guid.NewGuid(), "table", "custom", "Result", null, ["A", "B"], [["one"]], null)]));
        Assert.Throws<ArgumentException>(() => ResearchContent.Serialize([new(Guid.NewGuid(), "file", "custom", "File", "hidden text", null, null, Guid.NewGuid())]));
        var initial = ResearchContent.Initial();
        Assert.Throws<ArgumentException>(() => ResearchContent.Serialize([initial[0], initial[0]]));
    }
    [Fact]
    public void ResearchSchemaKeepsScopeKeysAndRetainedEvidenceCannotBeDeleted()
    {
        using var db = new PSeqOperationsDbContext(new DbContextOptionsBuilder<PSeqOperationsDbContext>()
            .UseNpgsql("Host=localhost;Database=never_connected;Username=test;Password=test").Options, Options.Create(new PersistenceOptions()));
        var entities = db.Model.GetEntityTypes().Where(e => e.ClrType.Namespace == "PSeq.Operations.Laboratory.Research").ToArray();
        Assert.Equal(5, entities.Length); Assert.All(entities, e => Assert.Equal("research", e.GetSchema()));
        Assert.All(entities.SelectMany(e => e.GetForeignKeys()), fk => Assert.Equal("research", fk.PrincipalEntityType.GetSchema()));
        var receipt = new ResearchAttachment(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "result.csv", "application/octet-stream", "retained", new string('a', 64), 10, Guid.NewGuid());
        db.Attach(receipt); db.Remove(receipt);
        Assert.Throws<InvalidOperationException>(() => db.SaveChanges());
    }
}
