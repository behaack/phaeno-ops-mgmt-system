namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task EvidenceGovernancePreservesReportsAndRequiresIndependentReviewAndScientificCoverage()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        var db = scope.DbContext;
        try
        {
            var files = RestoreFiles(Path.Combine(Path.GetTempPath(), "phaeno-governance-" + Guid.NewGuid().ToString("N"), "files"));
            var fixture = await SeedRestoreEvidence(scope, files);
            var protectedFiles = new InvestigationPreservingFileStorage(files, db);
            var preserved = await Assert.ThrowsAsync<OrderManagementException>(() => protectedFiles.DeleteIfExistsAsync(fixture.StorageKey, default));
            Assert.Equal("investigation_file_preserved", preserved.ErrorCode);
            await using (var attachment = await protectedFiles.OpenReadAsync(fixture.StorageKey, default)) Assert.True(attachment.Length > 0);
            var artifact = await db.ResultArtifacts.SingleAsync(x => x.ResultOutputPackageId == fixture.PackageId);
            await protectedFiles.DeleteIfExistsAsync(artifact.ObjectStorageKey, default);
            await Assert.ThrowsAsync<OrderManagementException>(() => files.OpenReadAsync(artifact.ObjectStorageKey, default));

            var organizationId = await db.OrganizationMemberships.Where(x => x.UserId == scope.PlatformUser.Id).Select(x => x.OrganizationId).SingleAsync();
            var reviewer = new User("governance-" + scope.Suffix + "@example.test", "Independent", "Supervisor");
            db.AddRange(reviewer, new OrganizationMembership(reviewer.Id, organizationId, true));
            await db.SaveChangesAsync();
            var execution = await db.LabProtocolExecutions.SingleAsync(x => x.LabSpecimenId == fixture.SpecimenId);
            var original = execution.CapturedResultsJson;
            var root = LabProtocolEvidence.Read(original).Records.Single();
            var service = new LabPerformanceReviewService(db);
            var request = new ProposeLabPerformanceRequest(Guid.NewGuid(), execution.Id, root.Id, reviewer.Id,
                LabEvidenceTime.UtcNow.AddHours(-1).ToString("yyyy-MM-ddTHH:mm+00:00"), "Signed operator worksheet");
            var proposal = await service.ProposeAsync(fixture.WorkId, fixture.SpecimenId, request, scope.PlatformUser.Id, default);
            Assert.Equal(proposal.Id, (await service.ProposeAsync(fixture.WorkId, fixture.SpecimenId, request, scope.PlatformUser.Id, default)).Id);
            await Assert.ThrowsAsync<OrderManagementException>(() => service.ProposeAsync(fixture.WorkId, fixture.SpecimenId, request with { Reason = "Changed retry" }, scope.PlatformUser.Id, default));
            await Assert.ThrowsAsync<OrderManagementException>(() => service.RequireReviewedAsync(execution.LabSpecimenAttemptId!.Value, true, default));
            await Assert.ThrowsAsync<OrderManagementException>(() => service.DecideAsync(fixture.WorkId, fixture.SpecimenId, proposal.Id, new(true, "Self review"), scope.PlatformUser.Id, default));
            await Assert.ThrowsAsync<OrderManagementException>(() => service.DecideAsync(fixture.WorkId, Guid.NewGuid(), proposal.Id, new(true, "Wrong sample"), reviewer.Id, default));
            var competing = await service.ProposeAsync(fixture.WorkId, fixture.SpecimenId, request with { RequestId = Guid.NewGuid(), Reason = "Alternative worksheet" }, scope.PlatformUser.Id, default);
            var decision = await service.DecideAsync(fixture.WorkId, fixture.SpecimenId, proposal.Id, new(true, "Verified signed worksheet"), reviewer.Id, default);
            Assert.Equal(decision.Id, (await service.DecideAsync(fixture.WorkId, fixture.SpecimenId, proposal.Id, new(true, "Verified signed worksheet"), reviewer.Id, default)).Id);
            await Assert.ThrowsAsync<OrderManagementException>(() => service.DecideAsync(fixture.WorkId, fixture.SpecimenId, competing.Id, new(true, "Stale approval"), reviewer.Id, default));
            await service.DecideAsync(fixture.WorkId, fixture.SpecimenId, competing.Id, new(false, "Superseded by the verified proposal"), reviewer.Id, default);
            await service.RequireReviewedAsync(execution.LabSpecimenAttemptId!.Value, true, default);
            Assert.Equal(original, execution.CapturedResultsJson);
            Assert.Equal(2, await db.LabPerformanceProposals.CountAsync(x => x.LabProtocolExecutionId == execution.Id));
            var next = await service.ProposeAsync(fixture.WorkId, fixture.SpecimenId, request with { RequestId = Guid.NewGuid(), BasedOnProposalId = proposal.Id, Reason = "Follow-up correction" }, scope.PlatformUser.Id, default);
            Assert.Equal(System.Text.Json.JsonSerializer.Deserialize<LabStepPerformance>(proposal.PerformanceJson, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)),
                System.Text.Json.JsonSerializer.Deserialize<LabStepPerformance>(next.OriginalPerformanceJson, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)));
            await service.DecideAsync(fixture.WorkId, fixture.SpecimenId, next.Id, new(true, "Verified follow-up"), reviewer.Id, default);
            Assert.Equal(next.Id, (await service.CurrentApprovedAsync(execution.Id, root.Id, default))!.Id);
            var customerController = scope.CreatePreparationController(db, customer: true);
            await Assert.ThrowsAsync<OrderManagementException>(() => customerController.PerformanceReviews(fixture.WorkId, fixture.SpecimenId, default));

            var lineage = new LabResultLineageService(db);
            var specimen = await db.LabSpecimens.SingleAsync(x => x.Id == fixture.SpecimenId);
            var work = await db.LabWorkOrders.SingleAsync(x => x.Id == fixture.WorkId);
            var legacyPackage = await db.ResultOutputPackages.SingleAsync(p => p.Id == fixture.PackageId);
            await Assert.ThrowsAsync<OrderManagementException>(() => lineage.RequirePackageAsync(legacyPackage, default));
            var legacyRelease = new LabResultRelease(work.SubmittingOrganizationId, work.AuthorizationSourceId, specimen.SubmittedSpecimenId, 1, "TEST", "1", "TEST", "pass", "{}", LabEvidenceTime.UtcNow, fixture.RunId, true, "*");
            await Assert.ThrowsAsync<OrderManagementException>(() => lineage.RequireReleaseAsync(legacyRelease, default));
            await Assert.ThrowsAsync<OrderManagementException>(() => lineage.RequireResultAsync(fixture.RunId, true, work.SubmittingOrganizationId, work.Id, specimen.SubmittedSpecimenId, default, true));
            var source = await db.LabSequencingOutputs.SingleAsync(x => x.LabSpecimenId == specimen.Id);
            var incomplete = await lineage.RegisterAnalysisAsync(new(Guid.NewGuid(), work.Id, specimen.Id, "TEST analysis", "incomplete", [source.Id]), scope.PlatformUser.Id, "lab-staff", default, true);
            Assert.NotNull(incomplete.RequirementsSnapshotJson);
            Assert.Contains(LabScientificRequirements.Assess(incomplete, [source]), x => x.Status == "Missing");
            await Assert.ThrowsAsync<OrderManagementException>(() => lineage.RequireResultAsync(incomplete.Id, true, work.SubmittingOrganizationId, work.Id, specimen.SubmittedSpecimenId, default));
            var now = LabEvidenceTime.UtcNow;
            var qc = new LabScientificEvidence(1, RunStartedAtUtc: now.AddHours(-2), RunCompletedAtUtc: now.AddHours(-1), QcSummary: "TEST QC passed", QcMetrics: new Dictionary<string, LabScientificMetric> { ["read-count"] = new(100, "reads") });
            var corrected = await lineage.RegisterOutputAsync(new(Guid.NewGuid(), work.Id, specimen.Id, source.LabLibraryId, source.LabNgsSendoutId,
                source.ProviderKey, source.ProviderRunReference, source.SampleMappingReference, source.ExternalFileReference, source.Sha256, source.SizeBytes, source.Id, "Attach verified run evidence", qc), scope.PlatformUser.Id, "lab-staff", default);
            var scientific = new LabScientificEvidence(1, Software: [new("TEST aligner", "1")], ParametersSha256: new string('D', 64),
                InputRoles: [new(corrected.Id, "reads")], RunStartedAtUtc: now.AddMinutes(-30), RunCompletedAtUtc: now.AddMinutes(-10),
                NotApplicable: new Dictionary<string, string> { ["referenceData"] = "TEST de novo analysis" });
            var complete = await lineage.RegisterAnalysisAsync(new(Guid.NewGuid(), work.Id, specimen.Id, "TEST analysis", "complete", [corrected.Id], incomplete.Id, "Complete evidence", scientific), scope.PlatformUser.Id, "lab-staff", default, true);
            Assert.DoesNotContain(LabScientificRequirements.Assess(complete, [corrected]), x => x.Status == "Missing");
            Assert.Equal(complete.Id, (await lineage.RequireResultAsync(complete.Id, true, work.SubmittingOrganizationId, work.Id, specimen.SubmittedSpecimenId, default, true))!.Id);
            var replacementPackage = new ResultOutputPackage(work.SubmittingOrganizationId, work.AuthorizationSourceId, work.Id, specimen.SubmittedSpecimenId, 2, legacyPackage.Id, "TEST", "TEST", "enforced-" + scope.Suffix, "{\"correctionReason\":\"Complete captured evidence\"}", new string('C', 64), 1, labAnalysisRunId: complete.Id);
            db.AddRange(replacementPackage, new ResultArtifact(replacementPackage.Id, "result", "test.txt", "text/plain", 10, new string('D', 64), "test-only/enforcement", "*"));
            await db.SaveChangesAsync();
            await lineage.RequirePackageAsync(replacementPackage, default);
            var replacementRelease = new LabResultRelease(work.SubmittingOrganizationId, work.AuthorizationSourceId, specimen.SubmittedSpecimenId, 2, "TEST", "1", "TEST", "pass", "{}", now, complete.Id, true, "*");
            await lineage.RequireReleaseAsync(replacementRelease, default);
            var investigation = await new LabInvestigationService(db).ReadAsync(work.Id, specimen.Id, default);
            Assert.True(investigation.Evidence.ContainsKey("performanceDecisions"));
            Assert.True(investigation.Evidence.ContainsKey("scientificRequirements"));
            var onBehalf = new LabProtocolExecution(work.Id, specimen.Id, execution.LabProtocolVersionId, scope.PlatformUser.Id);
            onBehalf.AttachAttempt(await db.LabSpecimenAttempts.SingleAsync(x => x.Id == execution.LabSpecimenAttemptId));
            var protocol = await db.LabProtocolVersions.SingleAsync(x => x.Id == execution.LabProtocolVersionId);
            now = LabEvidenceTime.UtcNow;
            onBehalf.Start(now);
            onBehalf.RecordStep(protocol, LabProtocolTestData.Input() with { Performance = new("now", false, null, "Operator worksheet", reviewer.Id) }, scope.PlatformUser.Id, new HashSet<LabRole> { LabRole.Operator }, now);
            onBehalf.Complete(protocol, null, now);
            db.LabProtocolExecutions.Add(onBehalf);
            service.CaptureOnBehalf(onBehalf, scope.PlatformUser.Id, now);
            await db.SaveChangesAsync();
            var onBehalfProposal = await db.LabPerformanceProposals.SingleAsync(x => x.LabProtocolExecutionId == onBehalf.Id);
            Assert.Equal("OnBehalf", onBehalfProposal.Kind);
            await Assert.ThrowsAsync<OrderManagementException>(() => lineage.RequireResultAsync(complete.Id, true, work.SubmittingOrganizationId, work.Id, specimen.SubmittedSpecimenId, default));
            await service.DecideAsync(work.Id, specimen.Id, onBehalfProposal.Id, new(false, "Time needs correction"), reviewer.Id, default);
            await Assert.ThrowsAsync<OrderManagementException>(() => service.RequireReviewedAsync(execution.LabSpecimenAttemptId.Value, true, default));
            var amendment = await service.ProposeAsync(work.Id, specimen.Id, request with { RequestId = Guid.NewGuid(), ExecutionId = onBehalf.Id, StepRecordId = onBehalfProposal.StepRecordId }, scope.PlatformUser.Id, default);
            await service.DecideAsync(work.Id, specimen.Id, amendment.Id, new(true, "Corrected time confirmed"), reviewer.Id, default);
            await service.RequireReviewedAsync(execution.LabSpecimenAttemptId.Value, true, default);
            db.LabPerformanceDecisions.Remove(await db.LabPerformanceDecisions.SingleAsync(x => x.Id == decision.Id));
            await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }
}
