namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ResultLineagePreservesReserveTubeThroughInputsPackageAndReleaseAndRejectsConflictingCapture()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext;
        await using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            var now = DateTime.UtcNow; var actor = scope.PlatformUser.Id;
            var order = new LabServiceOrder(scope.CustomerOrganization.Id,
                scope.CustomerOrganization.Departments.Single(d => d.IsDefault).Id, $"LINEAGE-{scope.Suffix}",
                "TEST ONLY lineage", null, 1, false, "TEST ONLY source", "Frozen", "TEST ONLY safe", "TEST ONLY instructions");
            var sample = new LabSample(order.Id, "TEST-SAMPLE", "RNA", "TEST ONLY source", 1, "uL", "Frozen", "TEST ONLY safe", null, null, null, "[]");
            order.Samples.Add(sample);
            var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, order.Id,
                scope.CustomerOrganization.Id, "lineage-test", 1, "test", null);
            work.RecordMilestone(LabWorkOrderStatus.Received);
            work.RecordMilestone(LabWorkOrderStatus.Processing);
            work.RecordMilestone(LabWorkOrderStatus.DataProcessing);
            var specimen = new LabSpecimen(work.Id, sample.Id); work.Specimens.Add(specimen);
            var protocol = new LabProtocol($"lin-{scope.Suffix}", "TEST ONLY lineage", null);
            var version = new LabProtocolVersion(protocol.Id, 1, LabProtocolTestData.Definition(), actor, now);
            version.Approve(scope.CustomerUser.Id, now);
            var workflow = new LabServiceWorkflow($"lin-{scope.Suffix}", "TEST ONLY lineage", null);
            var workflowVersion = new LabServiceWorkflowVersion(workflow.Id, 1, actor, now);
            workflowVersion.Approve(scope.CustomerUser.Id, now);
            var stage = new LabServiceWorkflowStage(workflowVersion.Id, 1, "Preparation", version.Id, LabServiceWorkflowStageRequirement.Required, null, null);
            db.AddRange(order, work, protocol, version, workflow, workflowVersion, stage);
            await db.SaveChangesAsync();

            async Task<(LabSpecimenAttempt Attempt, LabContainer Tube, LabLibrary Library)> Prepare(int sequence, bool failed, Guid? previous = null)
            {
                var source = new LabContainer(work.Id, specimen.Id, null, LabContainerKind.SubmittedSpecimen,
                    $"SOURCE-{scope.Suffix}-{sequence}", "TEST ONLY source", "TEST FREEZER", 1, "uL", null);
                source.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, actor, now);
                var attempt = new LabSpecimenAttempt(work.Id, specimen.Id, source.Id, workflowVersion.Id, sequence, previous);
                attempt.Start(source.Barcode, source.Barcode, now);
                var output = new LabContainer(work.Id, specimen.Id, source.Id, LabContainerKind.Library,
                    $"LIBRARY-{scope.Suffix}-{sequence}", "TEST ONLY library", "TEST FREEZER", 1, "uL", null);
                output.AttachAttempt(attempt);
                var execution = new LabProtocolExecution(work.Id, specimen.Id, version.Id, actor, stage.Id);
                execution.AttachAttempt(attempt); execution.Start(now);
                execution.RecordStep(version, LabProtocolTestData.Input(), actor, new HashSet<LabRole> { LabRole.Operator }, now);
                execution.Complete(version, null, now);
                var library = new LabLibrary(work.Id, specimen.Id, source.Id, output.Id, execution.Id, $"LIB-{scope.Suffix}-{sequence}");
                library.RecordQc(true, "{}");
                db.AddRange(source, attempt, output, execution, library);
                await db.SaveChangesAsync();
                if (failed) attempt.Fail("analysis_failed", "TEST ONLY failed attempt", execution.Id, actor, now);
                else attempt.Refresh(false, true, actor, now);
                await db.SaveChangesAsync();
                return (attempt, source, library);
            }

            var failed = await Prepare(1, true);
            var reserve = await Prepare(2, false, failed.Attempt.Id);
            var batch = new LabOperationalBatch($"SEQ-{scope.Suffix}", "TEST ONLY sequencing", null); batch.Start(now);
            var sendout = new LabNgsSendout(batch.Id, "TEST provider", "TEST submission", JsonSerializer.Serialize(new
            {
                members = new[] { new { libraryId = reserve.Library.Id, libraryKey = reserve.Library.LibraryKey,
                    containerBarcode = $"LIBRARY-{scope.Suffix}-2" } }
            }), null);
            sendout.SetStatus(LabNgsSendoutStatus.Complete, now);
            db.AddRange(batch, sendout, new LabBatchMember(batch.Id, work.Id, reserve.Library.Id, now));
            await db.SaveChangesAsync();
            var service = new LabResultLineageService(db);
            var request = new RegisterSequencingOutputRequest(Guid.NewGuid(), work.Id, specimen.Id, reserve.Library.Id,
                sendout.Id, "TEST provider", "actual-sequencing-run", "index:ATCG/sample:TEST", "raw-file-version:R1", new string('A', 64), 100,
                ScientificEvidence: new(1, Instrument: "TEST instrument", Flowcell: "TEST flowcell", Lane: "1", IndexMapping: "ATCG", QcSummary: "TEST ONLY declared QC"));
            await Assert.ThrowsAsync<OrderManagementException>(() => service.RegisterOutputAsync(request with
                { Id = Guid.NewGuid(), LabLibraryId = failed.Library.Id }, actor, "lab-staff", default));
            await Assert.ThrowsAsync<OrderManagementException>(() => service.RegisterOutputAsync(request with
                { Id = Guid.NewGuid(), LabSpecimenId = Guid.NewGuid() }, actor, "lab-staff", default));
            var first = await service.RegisterOutputAsync(request, actor, "lab-staff", default);
            var replay = await service.RegisterOutputAsync(request, actor, "lab-staff", default);
            Assert.Equal(first.Id, replay.Id);
            await Assert.ThrowsAsync<OrderManagementException>(() => service.RegisterOutputAsync(request with
                { ProviderRunReference = "conflicting-run" }, actor, "lab-staff", default));
            await Assert.ThrowsAsync<OrderManagementException>(() => service.RegisterOutputAsync(request with
                { Id = Guid.NewGuid(), Sha256 = new string('B', 64) }, actor, "lab-staff", default));
            var second = await service.RegisterOutputAsync(request with { Id = Guid.NewGuid(), ExternalFileReference = "raw-file-version:R2" }, actor, "lab-staff", default);
            var analysisRequest = new RegisterAnalysisRunRequest(Guid.NewGuid(), work.Id, specimen.Id, "TEST analysis", "actual-analysis-run", [first.Id, second.Id],
                ScientificEvidence: new(1, WorkflowVersion: "TEST workflow:v1", Software: [new("TEST aligner", "1", new string('B', 64))],
                    ParametersSha256: new string('C', 64), InputRoles: [new(first.Id, "R1"), new(second.Id, "R2")],
                    RunStartedAtUtc: now.AddHours(-2), RunCompletedAtUtc: now.AddHours(-1)));
            await Assert.ThrowsAsync<OrderManagementException>(() => service.RegisterAnalysisAsync(analysisRequest with
                { Id = Guid.NewGuid(), SequencingOutputIds = [first.Id, Guid.NewGuid()] }, actor, "lab-staff", default));
            var run = await service.RegisterAnalysisAsync(analysisRequest, actor, "lab-staff", default);
            Assert.Contains("TEST aligner", run.ScientificEvidenceJson);
            await Assert.ThrowsAsync<OrderManagementException>(() => service.RegisterAnalysisAsync(analysisRequest with {
                ScientificEvidence = analysisRequest.ScientificEvidence! with { WorkflowVersion = "Changed without reanalysis" } }, actor, "lab-staff", default));
            Assert.Equal(run.Id, (await service.RegisterAnalysisAsync(analysisRequest with { SequencingOutputIds = [second.Id, first.Id] }, actor, "lab-staff", default)).Id);
            await Assert.ThrowsAsync<OrderManagementException>(() => service.RequireResultAsync(run.Id, true,
                scope.OtherCustomerOrganization.Id, work.Id, sample.Id, default));
            await Assert.ThrowsAsync<OrderManagementException>(() => service.RequireResultAsync(run.Id, true,
                order.OrganizationId, work.Id, Guid.NewGuid(), default));
            Assert.Equal(run.Id, (await service.RequireResultAsync(run.Id, true, order.OrganizationId, work.Id, sample.Id, default))!.Id);

            var package = new ResultOutputPackage(order.OrganizationId, order.Id, work.Id, sample.Id, 1, null,
                "TEST analysis", "transfer-only", $"lineage-{scope.Suffix}", "{}", new string('C', 64), 1, labAnalysisRunId: run.Id);
            db.ResultOutputPackages.Add(package);
            var artifact = new ResultArtifact(package.Id, "result", "result.tsv", "text/tab-separated-values", 50, new string('D', 64),
                $"test-only/{scope.Suffix}/result.tsv", "sample:TEST/result:01");
            db.ResultArtifacts.Add(artifact);
            var release = new LabResultRelease(order.OrganizationId, order.Id, sample.Id, 1, "test", "test", "test", "pass",
                JsonSerializer.Serialize(new { resultOutputPackageId = package.Id }), now, run.Id, true, $"package:{package.Id}");
            db.LabResultReleases.Add(release);
            await db.SaveChangesAsync();
            // This fixture intentionally covers pre-profile lineage compatibility; default-on scientific enforcement has separate governance coverage.
            var legacyPolicy = new PhaenoPortal.App.Features.Accounts.Services.PSeqOrderToCashOptions { RequireResultTraceability = false, RequireScientificEvidence = false };
            await service.RequirePackageAsync(package, default, legacyPolicy);
            await service.RequireReleaseAsync(release, default, legacyPolicy);
            artifact.BeginScan(); artifact.CompleteScan(true, "Simulated clean scan", now);
            package.BeginScanning(); package.MarkReadyForReview(1, true, true);
            var approvalId = Guid.NewGuid();
            package.RecordScientificApproval(approvalId, scope.CustomerUser.Id, now);
            package.MarkReadyForRelease(approvalId); package.Release(actor, now);
            release.MarkReady(false); release.Release(now);
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
            var saved = await db.ResultOutputPackages.AsNoTracking().SingleAsync(p => p.Id == package.Id);
            Assert.Equal(ResultOutputPackageState.Released, saved.State);
            var inputs = await (from i in db.LabAnalysisInputs join o in db.LabSequencingOutputs on i.LabSequencingOutputId equals o.Id
                where i.LabAnalysisRunId == saved.LabAnalysisRunId select o).ToListAsync();
            Assert.Equal(2, inputs.Count);
            Assert.All(inputs, input => { Assert.Equal(reserve.Attempt.Id, input.LabSpecimenAttemptId); Assert.Equal(reserve.Tube.Id, input.SourceContainerId); });
            Assert.DoesNotContain(inputs, input => input.SourceContainerId == failed.Tube.Id);
            using var snapshot = JsonDocument.Parse(inputs[0].LineageSnapshotJson);
            Assert.Equal(reserve.Tube.Barcode, snapshot.RootElement.GetProperty("sourceBarcode").GetString());
            Assert.Equal("sample:TEST/result:01", (await db.ResultArtifacts.SingleAsync(a => a.Id == artifact.Id)).ResultLocator);
            var history = await scope.CreateLabController().ResultLineage(work.Id, specimen.Id, saved.Id, default);
            Assert.Equal(reserve.Tube.Id, history.SourceContainerId);
            Assert.Equal("Captured", history.Coverage);
            var controller = scope.CreateLabController();
            var investigation = await controller.Investigation(work.Id, specimen.Id, default);
            Assert.Empty(investigation.LimitedSections);
            var manifest = JsonSerializer.Serialize(investigation, new JsonSerializerOptions(JsonSerializerDefaults.Web));
            Assert.Contains(reserve.Tube.Barcode, manifest);
            Assert.Contains(failed.Tube.Barcode, manifest);
            Assert.Contains("Scientific requirements", manifest);
            Assert.DoesNotContain(artifact.ObjectStorageKey, manifest);
            var reportId = Guid.NewGuid();
            await controller.GenerateInvestigationReport(work.Id, specimen.Id, new(reportId), default);
            await controller.GenerateInvestigationReport(work.Id, specimen.Id, new(reportId), default);
            Assert.Equal(1, await db.LabInvestigationReports.CountAsync(x => x.Id == reportId));
            var frozen = await db.LabInvestigationReports.AsNoTracking().SingleAsync(x => x.Id == reportId);
            var downloaded = Assert.IsType<Microsoft.AspNetCore.Mvc.FileContentResult>(await controller.DownloadInvestigationReport(work.Id, specimen.Id, reportId, default));
            Assert.Equal(frozen.BodyJson, System.Text.Encoding.UTF8.GetString(downloaded.FileContents));
            Assert.Equal(frozen.Sha256, Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(downloaded.FileContents)));
            var readable = Assert.IsType<Microsoft.AspNetCore.Mvc.FileContentResult>(await controller.DownloadInvestigationReport(work.Id, specimen.Id, reportId, default, "html"));
            Assert.Contains(reserve.Tube.Barcode, System.Text.Encoding.UTF8.GetString(readable.FileContents));
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.DownloadInvestigationReport(work.Id, Guid.NewGuid(), reportId, default));
            var related = JsonSerializer.Serialize(await controller.RelatedInvestigationSamples(work.Id, "sequencing-run", first.ProviderRunReference, default));
            Assert.Contains(specimen.Id.ToString(), related);
            var otherWork = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, Guid.NewGuid(), scope.OtherCustomerOrganization.Id, "test-other", 1, "test", null);
            db.Add(otherWork); await db.SaveChangesAsync();
            Assert.Equal("[]", JsonSerializer.Serialize(await controller.RelatedInvestigationSamples(otherWork.Id, "sequencing-run", first.ProviderRunReference, default)));
            db.LabWorkEvents.Add(new LabWorkEvent(work.Id, specimen.Id, "LaterInvestigationNote", DateTime.UtcNow, actor, "{\"note\":\"Later evidence\"}"));
            await db.SaveChangesAsync(); db.ChangeTracker.Clear();
            Assert.Equal(frozen.BodyJson, (await db.LabInvestigationReports.AsNoTracking().SingleAsync(x => x.Id == reportId)).BodyJson);
            var eventTime = LabEvidenceTime.UtcNow;
            db.LabWorkEvents.AddRange(Enumerable.Range(0, 10000).Select(i => new LabWorkEvent(work.Id, specimen.Id, "TESTLongHistory", eventTime, actor, "{}")));
            await db.SaveChangesAsync(); db.ChangeTracker.Clear();
            var seenEvents = new HashSet<Guid>();
            DateTime? before = null; Guid? beforeId = null;
            do
            {
                var page = JsonSerializer.SerializeToElement(await controller.InvestigationEvents(work.Id, specimen.Id, default, eventTime, before, beforeId), new JsonSerializerOptions(JsonSerializerDefaults.Web));
                Assert.InRange(page.GetProperty("rows").GetArrayLength(), 1, 50);
                foreach (var row in page.GetProperty("rows").EnumerateArray()) Assert.True(seenEvents.Add(row.GetProperty("id").GetGuid()), "An event must not appear on two pages.");
                if (page.GetProperty("next").ValueKind == JsonValueKind.Null) break;
                before = page.GetProperty("next").GetProperty("before").GetDateTime(); beforeId = page.GetProperty("next").GetProperty("beforeId").GetGuid();
            } while (true);
            Assert.Equal(await db.LabWorkEvents.CountAsync(x => x.LabWorkOrderId == work.Id && x.LabSpecimenId == specimen.Id && x.OccurredAtUtc <= eventTime), seenEvents.Count);
            await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreateLabController().ResultLineage(Guid.NewGuid(), specimen.Id, saved.Id, default));
        }
        finally
        {
            await transaction.RollbackAsync();
            db.ChangeTracker.Clear();
        }
    }
}
