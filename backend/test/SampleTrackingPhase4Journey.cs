namespace PhaenoPortal.Test;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Storage;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    private sealed record Phase4JourneyContext(HandoffTestScope Scope, LabOperationsController Lab, LabOperationsController Reviewer,
        Guid OrderId, Guid WorkId, Guid SpecimenId, Guid BatchId, ExternalIdentity OperatorIdentity, ExternalIdentity ReviewerIdentity);
    internal sealed record Phase4File(string StorageKey, string Sha256, long SizeBytes);
    internal sealed record Phase4Checkpoint(Guid OrderId, Guid WorkId, Guid SpecimenId, Guid SourceContainerId, string SourceBarcode,
        Guid AnalysisId, Guid PackageId, Guid ReportId, string ReportSha256, Guid SendoutId, Guid[] OutputIds,
        Guid PhysicalRequestId, PhysicalContainerInput PhysicalRequest, RecordVendorResultsRequest VendorRequest,
        ExternalIdentity OperatorIdentity, ExternalIdentity ReviewerIdentity, Phase4File[] Files);

    private static async Task CapturePhase4Journey()
    {
        var connection = SampleTrackingPhase4Support.Connection("source");
        await VerifyAuthorizedOperatorJourney(connection.ConnectionString, phase4: CompletePhase4Journey);
    }

    private static async Task CompletePhase4Journey(Phase4JourneyContext scene)
    {
        var (scope, lab, reviewer, orderId, workId, specimenId, batchId, operatorIdentity, reviewerIdentity) = scene;
        var db = scope.DbContext; var now = LabEvidenceTime.UtcNow;
        var files = SampleTrackingPhase4Support.Files("source");
        var sendout = await db.LabNgsSendouts.SingleAsync(s => s.LabOperationalBatchId == batchId);
        var member = await db.LabBatchMembers.SingleAsync(m => m.LabOperationalBatchId == batchId);
        var library = await db.LabLibraries.SingleAsync(l => l.Id == member.LabLibraryId);
        var specimen = await db.LabSpecimens.SingleAsync(s => s.Id == specimenId);
        var execution = await db.LabProtocolExecutions.SingleAsync(e => e.Id == library.PreparationExecutionId);
        var attempt = await db.LabSpecimenAttempts.SingleAsync(a => a.Id == execution.LabSpecimenAttemptId);
        var source = await db.LabContainers.SingleAsync(c => c.Id == attempt.SourceContainerId);
        Assert.NotNull(source.ExternalBarcodeReferenceId);
        Assert.NotNull(source.StorageBoxId);
        Assert.NotNull(specimen.ReceivedAtUtc); Assert.NotNull(specimen.AccessionNumber);
        Assert.True(await db.LabMaterialConsumptions.AnyAsync(u => u.LabProtocolExecutionId == library.PreparationExecutionId && u.ResourceSnapshotJson != null));
        Assert.True(await db.LabEquipmentUsages.AnyAsync(u => u.LabProtocolExecutionId == library.PreparationExecutionId && u.ResourceSnapshotJson != null));
        var originalStock = await db.LabMaterialLots.AsNoTracking().Select(l => new { l.Id, l.AvailableQuantity }).ToArrayAsync();
        var sourceOriginalQuantity = source.Quantity;
        var physicalRequest = new PhysicalContainerInput(Guid.NewGuid(), source.Version, "HoldPlaced", source.Barcode, "TEST ONLY preservation through recovery");
        await lab.RecordPhysicalContainer(source.Id, physicalRequest, default);
        db.ChangeTracker.Clear(); await lab.RecordPhysicalContainer(source.Id, physicalRequest, default);
        Assert.Equal(1, await db.Set<LabPhysicalEvent>().CountAsync(e => e.Id == physicalRequest.RequestId));

        var limits = Options.Create(new LabFastqOptions()); var scan = Options.Create(new FileScanningOptions());
        var draftId = Guid.NewGuid();
        await lab.SaveResultsDraft(sendout.Id, new(draftId, sendout.Version, null, JsonSerializer.SerializeToElement(new { scope = "TEST ONLY Phase 4" })), limits, default);
        var setId = Guid.NewGuid();
        await lab.BeginFastqSet(sendout.Id, new(setId, draftId, member.Id, 1, "NewPreparation", "SingleEnd"), limits, default);
        var bytes = Encoding.ASCII.GetBytes("@TEST-PHASE4/1\nACGT\n+\nIIII\n");
        var sha = Convert.ToHexString(SHA256.HashData(bytes));
        var fingerprint = Convert.ToHexString(SHA256.HashData(Encoding.ASCII.GetBytes(sha)));
        var uploadId = Guid.NewGuid();
        var uploadRequest = new LabOperationsController.FastqUploadRequest(uploadId, "TEST-PHASE4.fastq", bytes.Length, fingerprint, 1, 1, 1, "TEST lane");
        await lab.BeginFastqUpload(setId, uploadRequest, scan, default);
        lab.Request.Body = new MemoryStream(bytes); lab.Request.ContentLength = bytes.Length;
        await lab.UploadFastqChunk(uploadId, 0, files, default);
        // Simulate an uncertain response and a fresh controller over the same committed records.
        db.ChangeTracker.Clear(); lab = scope.CreateLabController(operatorIdentity, governed: true, requireEvidence: true);
        await lab.BeginFastqUpload(setId, uploadRequest, scan, default);
        lab.Request.Body = new MemoryStream(bytes); lab.Request.ContentLength = bytes.Length;
        await lab.UploadFastqChunk(uploadId, 0, files, default);
        var completed = JsonSerializer.SerializeToElement(await lab.CompleteFastqUpload(uploadId, files, new SampleTrackingPhase4Support.CleanScanner(), scan, default), JsonSerializerOptions.Web);
        var scientificFileId = completed.GetProperty("fileId").GetGuid();
        var completedAgain = JsonSerializer.SerializeToElement(await lab.CompleteFastqUpload(uploadId, files, new SampleTrackingPhase4Support.CleanScanner(), scan, default), JsonSerializerOptions.Web);
        Assert.Equal(scientificFileId, completedAgain.GetProperty("fileId").GetGuid());
        db.ChangeTracker.Clear(); sendout = await db.LabNgsSendouts.SingleAsync(s => s.Id == sendout.Id);
        var draft = await db.Set<LabVendorResultsDraft>().SingleAsync(d => d.Id == draftId);
        var runEvidence = new LabScientificEvidence(1, Instrument: "TEST instrument", Flowcell: "TEST flowcell", Lane: "1", IndexMapping: "TEST index",
            RunStartedAtUtc: now, RunCompletedAtUtc: now, QcSummary: "TEST synthetic QC passed",
            QcMetrics: new Dictionary<string, LabScientificMetric> { ["readCount"] = new(1, "reads") });
        var receiptRequest = new RecordVendorResultsRequest(draftId, sendout.Version, sendout.ProviderReference!, false, now, now, now,
            "Success", [], [setId], "TEST actual run differs from vendor job", draftId, draft.Version, true,
            [new(setId, 1, "TEST-ACTUAL-PHASE4-RUN", runEvidence)]);
        await lab.RecordVendorResults(sendout.Id, receiptRequest, default);
        var outputs = await db.LabSequencingOutputs.AsNoTracking().Where(o => o.LabWorkOrderId == workId && o.LabSpecimenId == specimenId).ToArrayAsync();
        Assert.Single(outputs); Assert.Equal("TEST-ACTUAL-PHASE4-RUN", outputs[0].ProviderRunReference);
        Assert.NotEqual(sendout.ProviderReference, outputs[0].ProviderRunReference);
        db.ChangeTracker.Clear(); await lab.RecordVendorResults(sendout.Id, receiptRequest, default);
        Assert.Equal(1, await db.LabSequencingOutputs.CountAsync(o => o.LabWorkOrderId == workId && o.LabSpecimenId == specimenId));
        var analysisRequest = new RegisterAnalysisRunRequest(Guid.NewGuid(), workId, specimenId, "TEST producer declaration", "TEST-PHASE4-ANALYSIS", outputs.Select(o => o.Id).ToArray(),
            ScientificEvidence: new(1, Software: [new("TEST analysis", "1.0", new string('A', 64))], ReferenceData: [new("TEST reference", "1", new string('B', 64))],
                ParametersSha256: new string('C', 64), InputRoles: outputs.Select(o => new LabScientificInputRole(o.Id, "single-end-read")).ToArray(),
                RunStartedAtUtc: now, RunCompletedAtUtc: now, QcSummary: "TEST producer QC"), RequirementsVersion: 1);
        var analysis = await lab.RegisterAnalysisRun(analysisRequest, default);
        db.ChangeTracker.Clear(); Assert.Equal(analysis.Id, (await lab.RegisterAnalysisRun(analysisRequest, default)).Id);
        Assert.NotNull(analysis.RequirementsSnapshotJson);

        var resultBytes = Encoding.UTF8.GetBytes("TEST ONLY Phase 4 scientific output\n");
        var stored = await files.SaveAsync(new MemoryStream(resultBytes), ".txt", 1024, default);
        // External analysis packaging/scan observations are synthetic. Independent approval/release use their owning commands.
        var package = new ResultOutputPackage(scope.CustomerOrganization.Id, orderId, workId, specimen.SubmittedSpecimenId, 1, null,
            "TEST producer declaration", "TEST-PHASE4-TRANSFER", "phase4-" + analysis.Id, "{\"scope\":\"TEST ONLY\"}", stored.Sha256, 1, labAnalysisRunId: analysis.Id, traceabilityRequired: true);
        var artifact = new ResultArtifact(package.Id, "report", "TEST-PHASE4-result.txt", "text/plain", stored.SizeBytes, stored.Sha256, stored.StorageKey, "whole-file");
        artifact.BeginScan(); artifact.CompleteScan(true, "TEST synthetic clean scan", LabEvidenceTime.UtcNow);
        package.BeginScanning(); package.MarkReadyForReview(1, true, true); db.AddRange(package, artifact); await db.SaveChangesAsync();
        var work = await lab.WorkOrder(workId, default);
        work = await lab.SetMilestone(workId, new("ScientificReview", work.WorkOrder.Version), default);
        await using (var validation = await db.Database.BeginTransactionAsync())
        {
            await new LabResultLineageService(db).RequirePackageAsync(package, default, new PSeqOrderToCashOptions());
            await validation.CommitAsync();
        }
        Assert.Equal("scientific_approval_contributor_conflict", (await Assert.ThrowsAsync<OrderManagementException>(() => lab.ApproveScientificReview(workId,
            new("TEST-PHASE4", 1, null, work.WorkOrder.Version, package.Id), default))).ErrorCode);
        await reviewer.ApproveScientificReview(workId, new("TEST-PHASE4", 1, "{\"scope\":\"TEST ONLY\"}", work.WorkOrder.Version, package.Id), default);
        await scope.VerifyGovernedPublicationAsync(package.Id, artifact.Id, resultBytes, requireEvidence: true);
        var trace = await reviewer.ResultLineage(workId, specimenId, package.Id, default);
        Assert.Equal(source.Id, trace.SourceContainerId); Assert.Equal(source.Barcode, trace.SourceBarcode); Assert.Equal(analysis.Id, trace.AnalysisRunId);
        var reportId = Guid.NewGuid(); await reviewer.GenerateInvestigationReport(workId, specimenId, new(reportId), default);
        var report = await db.LabInvestigationReports.AsNoTracking().SingleAsync(r => r.Id == reportId);
        Assert.Contains("Physical", report.BodyJson); Assert.Contains("TEST-ACTUAL-PHASE4-RUN", report.BodyJson);
        var rawFile = await db.LabScientificFiles.AsNoTracking().SingleAsync(f => f.Id == scientificFileId);
        Assert.Equal(sourceOriginalQuantity, (await db.LabContainers.AsNoTracking().SingleAsync(c => c.Id == source.Id)).Quantity);
        foreach (var before in originalStock) Assert.Equal(before.AvailableQuantity, (await db.LabMaterialLots.AsNoTracking().SingleAsync(l => l.Id == before.Id)).AvailableQuantity);
        var checkpoint = new Phase4Checkpoint(orderId, workId, specimenId, source.Id, source.Barcode, analysis.Id, package.Id, reportId, report.Sha256,
            sendout.Id, outputs.Select(o => o.Id).ToArray(), physicalRequest.RequestId, physicalRequest, receiptRequest, operatorIdentity, reviewerIdentity,
            [new(rawFile.StorageKey, rawFile.Sha256, rawFile.SizeBytes), new(stored.StorageKey, stored.Sha256, stored.SizeBytes)]);
        await File.WriteAllTextAsync(Path.Combine(SampleTrackingPhase4Support.Artifacts(), "checkpoint.json"), JsonSerializer.Serialize(checkpoint, new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true }));
    }
}

internal sealed class SampleTrackingPhase4FactAttribute : FactAttribute
{
    public SampleTrackingPhase4FactAttribute(string stage)
    {
        if (Environment.GetEnvironmentVariable("PSEQ_PHASE4_VALIDATION") != "1" || Environment.GetEnvironmentVariable("PSEQ_PHASE4_STAGE") != stage)
            Skip = "Use the opt-in isolated sample-tracking Phase 4 runner.";
    }
}
