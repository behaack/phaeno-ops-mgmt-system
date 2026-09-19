namespace PhaenoPortal.Test;

using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    private static JsonElement ScientificJson(object value) => JsonSerializer.SerializeToElement(value, new JsonSerializerOptions(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } });

    [PostgreSqlReferenceFact]
    public async Task ScientificWorkspaceScopesLibrariesHistoricalSendoutsAndPermissions()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var fixture = await SeedRestoreEvidence(scope, RestoreFiles(Path.Combine(Path.GetTempPath(), "phaeno-capture-" + Guid.NewGuid(), "files")));
            var db = scope.DbContext; var controller = scope.CreatePreparationController(db);
            var workspace = ScientificJson(await controller.ScientificEvidence(fixture.WorkId, fixture.SpecimenId, default));
            Assert.True(workspace.GetProperty("canRecord").GetBoolean());
            Assert.Single(workspace.GetProperty("libraries").EnumerateArray());
            Assert.Single(workspace.GetProperty("outputs").EnumerateArray());
            Assert.Equal(fixture.RunId, workspace.GetProperty("analyses")[0].GetProperty("id").GetGuid());
            var library = await db.LabLibraries.SingleAsync(l => l.LabSpecimenId == fixture.SpecimenId);
            // No current batch membership is needed: the immutable saved submission is authoritative.
            var sendouts = ScientificJson(await controller.ScientificSendouts(fixture.WorkId, fixture.SpecimenId, library.Id, default));
            Assert.Single(sendouts.EnumerateArray()); Assert.False(sendouts[0].TryGetProperty("manifestJson", out _));
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.ScientificSendouts(fixture.WorkId, fixture.SpecimenId, Guid.NewGuid(), default));
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.ScientificEvidence(Guid.NewGuid(), fixture.SpecimenId, default));
            await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreatePreparationController(db, true).ScientificEvidence(fixture.WorkId, fixture.SpecimenId, default));
            await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreatePreparationController(db, true).ScientificSendouts(fixture.WorkId, fixture.SpecimenId, library.Id, default));
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    [PostgreSqlReferenceFact]
    public async Task InvestigationHistoryScopesDeliveryDownloadsHoldsReissuesAndFreezesReports()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var fixture = await SeedRestoreEvidence(scope, RestoreFiles(Path.Combine(Path.GetTempPath(), "phaeno-history-" + Guid.NewGuid(), "files")));
            var db = scope.DbContext; var now = LabEvidenceTime.UtcNow; var org = scope.CustomerOrganization.Id; var actor = scope.CustomerUser.Id;
            var work = await db.LabWorkOrders.SingleAsync(w => w.Id == fixture.WorkId);
            var specimen = await db.LabSpecimens.SingleAsync(s => s.Id == fixture.SpecimenId);
            var artifact = await db.ResultArtifacts.SingleAsync(a => a.ResultOutputPackageId == fixture.PackageId);
            var otherSample = new LabSample(work.AuthorizationSourceId, "OTHER-HISTORY", "RNA", "TEST", 1, "uL", "Frozen", "TEST", null, null, null, "[]");
            var otherPackage = new ResultOutputPackage(org, work.AuthorizationSourceId, work.Id, otherSample.Id, 1, null, "TEST", "TEST", "other-history-" + scope.Suffix, "{}", new string('C', 64), 1);
            var otherArtifact = new ResultArtifact(otherPackage.Id, "result", "other-secret.txt", "text/plain", 10, new string('D', 64), "other-private-storage", "*");
            db.AddRange(otherSample, otherPackage, otherArtifact); await db.SaveChangesAsync();
            var download = OperationalFileDownload.ForPSeqArtifact(Guid.NewGuid(), artifact.Id, org, actor, fixture.PackageId, now, now.AddMinutes(5), "private-ip", "private-agent");
            var started = OperationalFileDownload.ForPSeqArtifact(Guid.NewGuid(), artifact.Id, org, actor, fixture.PackageId, now, now.AddMinutes(5), null, null);
            download.Complete(OperationalFileDownloadOutcome.Succeeded, now.AddSeconds(1), countsForReleasedPackageRetention: true);
            var otherDownload = OperationalFileDownload.ForPSeqArtifact(Guid.NewGuid(), otherArtifact.Id, org, actor, otherPackage.Id, now, now.AddMinutes(5), null, null);
            var crossOrg = OperationalFileDownload.ForPSeqArtifact(Guid.NewGuid(), artifact.Id, scope.OtherCustomerOrganization.Id, actor, fixture.PackageId, now, now.AddMinutes(5), null, null);
            db.AddRange(download, started, otherDownload, crossOrg);
            var commit = new OperationalDownloadCommitEvidence(download.Id, DownloadCommitPhase.Completion, "123456", now); commit.Observe(now.AddSeconds(1), now.AddSeconds(2));
            db.AddRange(commit, new ResultDeliveryEvidence(fixture.PackageId, artifact.Id, ResultDeliveryEvidenceKind.Download, actor, now, "{\"private\":\"secret-detail\"}"), new ResultDeliveryEvidence(otherPackage.Id, otherArtifact.Id, ResultDeliveryEvidenceKind.Download, actor, now, "{}"));
            var release = new LabResultRelease(org, work.AuthorizationSourceId, specimen.SubmittedSpecimenId, 1, "TEST", "1", "TEST", "TEST", "{}", now);
            var replacement = new LabResultRelease(org, work.AuthorizationSourceId, specimen.SubmittedSpecimenId, 2, "TEST", "1", "TEST", "TEST", "{}", now);
            var otherRelease = new LabResultRelease(org, work.AuthorizationSourceId, otherSample.Id, 1, "TEST", "1", "TEST", "TEST", "{}", now);
            var policy = await db.ReleasedDeliverablePolicyDefaults.SingleAsync(p => p.IsActive);
            db.AddRange(release, replacement, otherRelease); await db.SaveChangesAsync();
            var snapshot = ReleasedDeliverableRetentionSnapshot.ForLabResult(org, release.Id, policy, null, now);
            var next = ReleasedDeliverableRetentionSnapshot.ForLabResult(org, replacement.Id, policy, null, now);
            var otherSnapshot = ReleasedDeliverableRetentionSnapshot.ForLabResult(org, otherRelease.Id, policy, null, now);
            snapshot.CaptureReceiptLineage("{\"otherSample\":\"private-receipt\"}");
            db.AddRange(snapshot, next, otherSnapshot); await db.SaveChangesAsync();
            var hold = new ReleasedDeliverablePreservationHold(snapshot.Id, ReleasedDeliverableHoldKind.Preservation, actor, "Customer question", now);
            db.AddRange(new ResultRetentionSchedule(fixture.PackageId, snapshot), hold,
                new ReleasedDeliverableReissue(snapshot.Id, next.Id, actor, "Corrected release", now),
                new ReleasedDeliverableReissue(next.Id, otherSnapshot.Id, actor, "Cross-sample excluded", now));
            await db.SaveChangesAsync();
            var service = new LabInvestigationService(db);
            var history = await service.ReadAsync(work.Id, specimen.Id, default);
            var json = ScientificJson(history); var evidence = json.GetProperty("evidence");
            Assert.Single(evidence.GetProperty("delivery").EnumerateArray());
            Assert.Equal(2, evidence.GetProperty("downloads").GetArrayLength());
            var pending = evidence.GetProperty("downloads").EnumerateArray().Single(d => d.GetProperty("id").GetGuid() == started.Id);
            Assert.Equal("Started", pending.GetProperty("outcome").GetString()); Assert.Equal(JsonValueKind.Null, pending.GetProperty("completedAtUtc").ValueKind); Assert.False(pending.GetProperty("countsForReleasedPackageRetention").GetBoolean());
            Assert.Single(evidence.GetProperty("downloadCommitEvidence").EnumerateArray());
            Assert.Equal(2, evidence.GetProperty("retention").GetArrayLength());
            Assert.Single(evidence.GetProperty("preservationHolds").EnumerateArray()); Assert.Single(evidence.GetProperty("reissues").EnumerateArray());
            Assert.Contains(evidence.GetProperty("people").EnumerateArray(), p => p.GetProperty("id").GetGuid() == actor);
            foreach (var secret in new[] { "private-ip", "private-agent", "secret-detail", "private-receipt", "other-private-storage", "Cross-sample excluded", "sourceTransactionId" }) Assert.DoesNotContain(secret, json.ToString());
            Assert.Contains("downloads", (await service.ReadAsync(work.Id, specimen.Id, default, 1)).LimitedSections);
            var reportId = Guid.NewGuid(); var controller = scope.CreatePreparationController(db);
            await controller.GenerateInvestigationReport(work.Id, specimen.Id, new(reportId), default);
            var before = await db.LabInvestigationReports.AsNoTracking().SingleAsync(r => r.Id == reportId);
            Assert.Contains("Customer question", before.BodyJson); Assert.Contains("downloadCommitEvidence", before.BodyJson);
            hold.Release(scope.PlatformUser.Id, "Question resolved", now.AddSeconds(1)); await db.SaveChangesAsync();
            await controller.GenerateInvestigationReport(work.Id, specimen.Id, new(reportId), default);
            var after = await db.LabInvestigationReports.AsNoTracking().SingleAsync(r => r.Id == reportId);
            Assert.Equal(before.BodyJson, after.BodyJson); Assert.Equal(before.Sha256, after.Sha256); Assert.DoesNotContain("Question resolved", after.BodyJson);
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }
}
