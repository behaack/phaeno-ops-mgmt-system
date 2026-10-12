namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.DataProvisioning.Controllers;
using PhaenoPortal.App.Features.DataProvisioning.Services;
using PSeq.Operations.Commercial.DataProvisioning.Application;
using PSeq.Operations.Commercial.DataProvisioning.Domain;

public sealed partial class DepartmentAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task DataHistoryPagesCountAllScopedRowsAndDoNotHideOlderGovernanceAttention()
    {
        await using var scope = await Scope.Create();
        var now = DateTime.UtcNow;
        var source = new SourceSample("TEST ONLY paged source", true);
        source.UpdateMetadata(source.Label, "Fixture", "Synthetic context", "Synthetic assay", "Synthetic analysis", "Passed", "Automated fixture");
        source.ConfirmOwnership("Synthetic fixture", "TEST ONLY", scope.Actor.Id, now);
        source.ConfirmDeidentification("Synthetic only", null, scope.Actor.Id, now);
        var file = new ManagedFile(source.Id, "fixture.json", "structured_fixture", "application/json", 2, new string('a', 64), "simulated/paged-history.json");
        file.RecordScan(ManagedFileScanStatus.Clean, "Simulated metadata only");
        source.Files.Add(file); source.MarkReady(scope.Actor.Id, now);
        var dataset = new CuratedDataset("TEST ONLY paged dataset", "Synthetic history fixture");
        var version = new CuratedDatasetVersion(dataset.Id, 1, source, "TEST ONLY", now);
        version.Files.Add(new CuratedDatasetVersionFile(version.Id, file));
        var manifest = DatasetManifestService.Build(version);
        version.SetManifest(manifest.ManifestJson, manifest.ContentChecksum); version.Publish(scope.Actor.Id, now);
        var grant = new OrganizationDatasetGrant(scope.Organization, dataset, version, scope.Actor.Id, now, scope.General);
        var otherGrant = new OrganizationDatasetGrant(scope.Organization, dataset, version, scope.Actor.Id, now, scope.Research);
        scope.Db.AddRange(source, dataset, version, grant, otherGrant);
        var own = Enumerable.Range(0, 505).Select(index => new DatasetDownloadAudit(scope.Organization.Id, scope.General.Id, grant.Id, version.Id,
            scope.Actor.Id, DatasetDownloadKind.Archive, null, now.AddSeconds(index), "synthetic paging", null)).ToArray();
        scope.Db.AddRange(own);
        scope.Db.Add(new DatasetDownloadAudit(scope.Organization.Id, scope.Research.Id, otherGrant.Id, version.Id, scope.Actor.Id, DatasetDownloadKind.Archive, null, now, null, null));
        scope.Db.AddRange(Enumerable.Range(0, 505).Select(index => new DataProvisioningNotice(scope.Organization, DataProvisioningNoticeKind.Grant,
            "Synthetic notice", "Synthetic body", now.AddSeconds(index), organizationDatasetGrantId: grant.Id)));
        var attention = new DataGovernanceIncident(source, Enum.GetValues<DataGovernanceConcernCategory>()[0],
            "Synthetic reason", "Synthetic external guidance", "Synthetic internal notes", now.AddDays(1));
        var active = new DataGovernanceAffectedOrganization(attention.Id, scope.Organization, 1);
        scope.Db.AddRange(attention, active);
        for (var index = 0; index < 505; index++)
        {
            var closed = new DataGovernanceIncident(source, Enum.GetValues<DataGovernanceConcernCategory>()[0],
                "Synthetic closed reason", "Synthetic guidance", "Synthetic notes", now.AddDays(1));
            closed.Clear("Synthetic resolved", scope.Actor.Id, now);
            var affected = new DataGovernanceAffectedOrganization(closed.Id, scope.Organization, 1);
            affected.MarkResumed(); scope.Db.AddRange(closed, affected);
        }
        await scope.Db.SaveChangesAsync();
        var controller = new CuratedDataController(scope.Db, scope.Identity, null!) { ControllerContext = new() { HttpContext = scope.Http } };
        var page = await controller.ListDownloadHistoryPage(default, 21, 25);
        Assert.Equal(505, page.TotalCount);
        Assert.Equal(5, page.Items.Count);
        Assert.All(page.Items, row => Assert.Contains(row.Id, own.Select(item => item.Id)));
        Assert.Equal(505, (await controller.ListActivityPage(default, 26, 20)).TotalCount);
        Assert.Equal(505, (await controller.ListDownloadHistory(default)).Count);
        var attentionPage = await controller.ListGovernanceIncidentsPage(default, activeOnly: true);
        Assert.Equal(1, attentionPage.TotalCount);
        Assert.Equal(attention.Id, Assert.Single(attentionPage.Items).Id);
        scope.AdminMembership.SetOrganizationAdmin(false);
        await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<DataProvisioningException>(() => controller.ListDownloadHistoryPage(default));
    }
}
