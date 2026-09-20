namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging.Abstractions;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.LabOperations.Controllers;
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
    public async Task RepeatedSequencingCountsPurchasedRunsAcrossLibraryReuseNewPreparationAndReanalysis()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext;
        await using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            var now = DateTime.UtcNow; now = now.AddTicks(-(now.Ticks % 10)); var actor = scope.PlatformUser.Id;
            var order = new LabServiceOrder(scope.CustomerOrganization.Id,
                scope.CustomerOrganization.Departments.Single(d => d.IsDefault).Id, $"LINEAGE-{scope.Suffix}",
                "TEST ONLY lineage", null, 1, false, "TEST ONLY source", "Frozen", "TEST ONLY safe", "TEST ONLY instructions");
            var sample = new LabSample(order.Id, "TEST-SAMPLE", "RNA", "TEST ONLY source", 1, "uL", "Frozen", "TEST ONLY safe", null, null, null, "[]");
            order.SetSequencingRunCount(20); sample.SetSequencingRunCount(20);
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
            db.Add(new LabWorkAuthorizationVersion(work.Id, Guid.NewGuid(), Guid.NewGuid(), 1, 1,
                JsonSerializer.Serialize(new { specimens = new[] { new { submittedSpecimenId = sample.Id, sequencingRunCount = 20 } } }), new string('A', 64), now));
            specimen.RecordProcessingState(LabSpecimenProcessingState.Succeeded, actor, now);
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
            var progress = new LabSequencingRunProgress(db);
            RegisterSequencingOutputRequest Output(int number) => new(Guid.NewGuid(), work.Id, specimen.Id, reserve.Library.Id,
                sendout.Id, "TEST provider", "same-machine-run", $"sample-index:{number}", $"file:{number}", new string('A', 64), 100,
                SequencingRunNumber: number, LibraryPreparationChoice: number == 1 ? "NewPreparation" : "ExistingLibrary");
            await Assert.ThrowsAsync<OrderManagementException>(() => service.RegisterOutputAsync(Output(21), actor, "lab-staff", default));
            await Assert.ThrowsAsync<OrderManagementException>(() => service.RegisterOutputAsync(Output(1) with { LibraryPreparationChoice = null }, actor, "lab-staff", default));
            await Assert.ThrowsAsync<OrderManagementException>(() => service.RegisterOutputAsync(Output(1) with { SequencingRunNumber = null }, actor, "lab-staff", default));
            var outputs = new List<LabSequencingOutput>();
            var analyses = new List<LabAnalysisRun>();
            for (var number = 1; number <= 20; number++)
            {
                var request = Output(number);
                var output = await service.RegisterOutputAsync(request, actor, "lab-staff", default);
                Assert.Equal(output.Id, (await service.RegisterOutputAsync(request, actor, "lab-staff", default)).Id);
                outputs.Add(output);
                analyses.Add(await service.RegisterAnalysisAsync(new(Guid.NewGuid(), work.Id, specimen.Id, "TEST analysis", $"analysis:{number}", [output.Id]), actor, "lab-staff", default));
            }
            Assert.Single(outputs.Select(o => o.LabLibraryId).Distinct());
            Assert.Single(outputs.Select(o => o.LabSpecimenAttemptId).Distinct());
            await Assert.ThrowsAsync<OrderManagementException>(() => service.RegisterOutputAsync(Output(2) with { LibraryPreparationChoice = "NewPreparation" }, actor, "lab-staff", default));
            reserve.Library.SetStatus(LabLibraryStatus.Batched);
            var nextBatch = new LabOperationalBatch($"REUSE-{scope.Suffix}", "TEST ONLY reuse", null);
            db.Add(nextBatch); await db.SaveChangesAsync();
            var controller = scope.CreateLabController();
            await Assert.ThrowsAsync<OrderManagementException>(() => controller.AddBatchMember(nextBatch.Id, new(work.Id, reserve.Library.Id), default));
            batch.Complete(now); await db.SaveChangesAsync();
            await controller.AddBatchMember(nextBatch.Id, new(work.Id, reserve.Library.Id), default);
            Assert.Equal(2, await db.LabBatchMembers.CountAsync(m => m.LabLibraryId == reserve.Library.Id));
            var extraFile = await service.RegisterOutputAsync(Output(1) with { ExternalFileReference = "file:1:additional" }, actor, "lab-staff", default);
            var reanalysis = await service.RegisterAnalysisAsync(new(Guid.NewGuid(), work.Id, specimen.Id, "TEST analysis", "reanalysis:1", [outputs[0].Id, extraFile.Id],
                analyses[0].Id, "TEST ONLY repeated analysis"), actor, "lab-staff", default);
            Assert.Equal(20, LabSequencingRunProgress.Count(analyses.Select(a => (Guid?)a.Id).Append(reanalysis.Id), await progress.AnalysisRunsAsync(work.Id, default)));

            // A new preparation may replace a failed sequencing execution without buying run 21.
            var fresh = await Prepare(3, false, reserve.Attempt.Id);
            var freshBatch = new LabOperationalBatch($"NEW-{scope.Suffix}", "TEST ONLY new preparation run", null); freshBatch.Start(now);
            var freshSendout = new LabNgsSendout(freshBatch.Id, "TEST provider", "TEST new submission", JsonSerializer.Serialize(new {
                members = new[] { new { libraryId = fresh.Library.Id, libraryKey = fresh.Library.LibraryKey, containerBarcode = $"LIBRARY-{scope.Suffix}-3" } }
            }), null);
            freshSendout.SetStatus(LabNgsSendoutStatus.Complete, now); db.AddRange(freshBatch, freshSendout); await db.SaveChangesAsync();
            var corrected = await service.RegisterOutputAsync(Output(20) with { LabLibraryId = fresh.Library.Id, LabNgsSendoutId = freshSendout.Id,
                ProviderRunReference = "replacement-machine-run", ExternalFileReference = "replacement:20", CorrectsOutputId = outputs[19].Id,
                CorrectionReason = "TEST ONLY repeat sequencing after failed output", LibraryPreparationChoice = "NewPreparation" }, actor, "lab-staff", default);
            Assert.Equal(fresh.Attempt.Id, corrected.LabSpecimenAttemptId);
            var correctedAnalysis = await service.RegisterAnalysisAsync(new(Guid.NewGuid(), work.Id, specimen.Id, "TEST analysis", "replacement:20", [corrected.Id]), actor, "lab-staff", default);
            analyses[19] = correctedAnalysis;
            work.RecordMilestone(LabWorkOrderStatus.ScientificReview);
            await db.SaveChangesAsync();
            var approvalOptions = Options.Create(new PSeqOrderToCashOptions {
                GovernedPSeqResults = true, DualControlEnforced = false,
                RequireResultTraceability = true, RequireScientificEvidence = false });
            var approvalController = new LabOperationsController(db,
                new LabOperationsRequestContext(db, new FixedIdentityContext(new ExternalIdentity(
                    scope.PlatformUser.ExternalIdentityProvider!, scope.PlatformUser.ExternalSubjectId!, scope.PlatformUser.Email, true)), approvalOptions, NullLogger<LabOperationsRequestContext>.Instance),
                traceabilityOptions: approvalOptions) {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };
            var numberOfPackages = 0;
            async Task Publish(LabAnalysisRun analysis, DateTime at)
            {
                var ordinal = ++numberOfPackages;
                var package = new ResultOutputPackage(order.OrganizationId, order.Id, work.Id, sample.Id, ordinal, null,
                    "TEST analysis", $"transfer:{ordinal}", $"repeat-{scope.Suffix}-{ordinal}", "{}", new string('C', 64), 1, labAnalysisRunId: analysis.Id);
                package.BeginScanning(); package.MarkReadyForReview(1, true, true);
                var artifact = new ResultArtifact(package.Id, "result", "result.tsv", "text/tab-separated-values", 50,
                    new string('D', 64), $"test-only/{scope.Suffix}/{ordinal}/result.tsv", $"sample:TEST/run:{ordinal}");
                artifact.BeginScan(); artifact.CompleteScan(true, "TEST ONLY simulated clean scan", at);
                db.AddRange(package, artifact); await db.SaveChangesAsync();
                await approvalController.ApproveScientificReview(work.Id, new("test", 1, null, work.Version, package.Id), default);
                Assert.Equal(ordinal <= 20 ? LabWorkOrderStatus.ScientificReview : LabWorkOrderStatus.ReadyForRelease, work.Status);
                Assert.Equal(ResultOutputPackageState.ReadyForRelease, package.State);
                Assert.Null(package.ReleasedAtUtc);
                package.Release(actor, at);
                var release = new LabResultRelease(order.OrganizationId, order.Id, sample.Id, ordinal, "test", "test", "test", "pass", "{}", at, analysis.Id, true, $"package:{package.Id}");
                release.MarkReady(false); release.Release(at); db.LabResultReleases.Add(release);
                await new LabJobDeliveryRecorder(db).RecordAsync(work.Id, [new(sample.Id, at)], default);
                await db.SaveChangesAsync();
            }
            for (var index = 0; index < 19; index++) await Publish(analyses[index], now.AddMinutes(index));
            await Publish(reanalysis, now.AddMinutes(19));
            Assert.Equal(19, (await progress.ApprovedCountsAsync(work.Id, default))[sample.Id]);
            Assert.Null(work.FirstDeliveredAtUtc);
            Assert.Empty(await new LabJobQuery(db).Releases().Where(r => r.SampleId == sample.Id).ToListAsync());
            Assert.DoesNotContain((await LabIntakeProgress.ReadAsync(db, work, default)).TerminalOutcomes!, o => o.Outcome == "Completed");
            await Publish(analyses[19], now.AddMinutes(20));
            Assert.Equal(20, (await progress.ApprovedCountsAsync(work.Id, default))[sample.Id]);
            Assert.Equal(now.AddMinutes(20), work.FirstDeliveredAtUtc);
            Assert.Contains((await LabIntakeProgress.ReadAsync(db, work, default)).TerminalOutcomes!, o => o.Outcome == "Completed");
            Assert.Equal(now.AddMinutes(20), await new LabJobQuery(db).Releases().Where(r => r.SampleId == sample.Id).MinAsync(r => r.ReleasedAtUtc));
            await Publish(reanalysis, now.AddMinutes(100));
            Assert.Equal(now.AddMinutes(20), await new LabJobQuery(db).Releases().Where(r => r.SampleId == sample.Id).MinAsync(r => r.ReleasedAtUtc));
        }
        finally { await transaction.RollbackAsync(); }
    }
}
