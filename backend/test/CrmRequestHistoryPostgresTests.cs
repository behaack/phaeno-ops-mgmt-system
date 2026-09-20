namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.RelationshipManagement.Controllers;
using PhaenoPortal.App.Features.RelationshipManagement.Services;
using PSeq.Operations.Commercial.Relationships.Application;
using PSeq.Operations.Commercial.Relationships.Domain;

public sealed partial class CrmCommercialAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task RequestHistorySearchesAllPagesAndExcludesActiveAndNonCrmRequests()
    {
        await using var scope = await Scope.Create();
        var controller = scope.Controller(new RelationshipManagementController(scope.Db, scope.Identity));
        await Assert.ThrowsAsync<RelationshipManagementException>(() => controller.ListRequestHistory(null, null, default));
        scope.Membership.SetOrganizationAdmin(true);
        var completed = Enumerable.Range(0, 27).Select(i => new PortalIntegrationRequest(null,
            $"History Company {i:D2}", PortalIntegrationRequestType.ServiceChange,
            PortalIntegrationRequestSource.FirstPartyCrm, null, null, "Service review", null, scope.Actor.Id, [])).ToList();
        foreach (var request in completed)
        {
            request.Decide(true, "Approved", scope.Actor.Id, DateTime.UtcNow);
            request.MarkApplied("Configured service", scope.Actor.Id, DateTime.UtcNow);
        }
        var pending = new PortalIntegrationRequest(null, "Pending Company", PortalIntegrationRequestType.ServiceChange,
            PortalIntegrationRequestSource.FirstPartyCrm, null, null, "Service review", null, scope.Actor.Id, []);
        var imported = new PortalIntegrationRequest(null, "Imported Company", PortalIntegrationRequestType.ServiceChange,
            PortalIntegrationRequestSource.Manual, null, null, "Service review", null, scope.Actor.Id, []);
        imported.Decide(false, "Declined", scope.Actor.Id, DateTime.UtcNow);
        scope.Db.AddRange(completed);
        scope.Db.AddRange(pending, imported);
        await scope.Db.SaveChangesAsync();
        var first = await controller.ListRequestHistory(null, null, default);
        var second = await controller.ListRequestHistory(null, null, default, page: 2);
        Assert.Equal(27, first.TotalCount);
        Assert.Equal(25, first.Items.Count);
        Assert.Equal(2, second.Items.Count);
        Assert.Empty(first.Items.Select(x => x.Id).Intersect(second.Items.Select(x => x.Id)));
        var target = second.Items[0];
        var matched = await controller.ListRequestHistory("  " + target.CandidateOrganizationName.ToUpperInvariant() + "  ", null, default, page: 99);
        Assert.Equal(1, matched.Page);
        Assert.Equal(target.Id, Assert.Single(matched.Items).Id);
        Assert.Equal(target.Id, Assert.Single((await controller.ListRequestHistory(target.RequestNumber, null, default)).Items).Id);
        Assert.Equal(27, (await controller.ListRequestHistory("configured service", null, default)).TotalCount);
        Assert.Empty((await controller.ListRequestHistory("no matching company", null, default)).Items);
        Assert.Equal(target.Id, Assert.Single((await controller.ListRequestHistory(null, target.Id, default)).Items).Id);
        Assert.Equal(pending.Id, Assert.Single(await controller.ListRequests(null, null, default, activeOnly: true)).Id);
    }
}
