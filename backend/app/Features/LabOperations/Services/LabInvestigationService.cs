namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

/// <summary>Bounded, specimen-scoped evidence reads. A failed source fails the request; it never becomes an empty success.</summary>
public sealed class LabInvestigationService(PSeqOperationsDbContext db)
{
    public async Task<LabInvestigationDto> ReadAsync(Guid workId, Guid specimenId, CancellationToken ct, int limit = 1000)
    {
        var specimen = await db.LabSpecimens.AsNoTracking().SingleOrDefaultAsync(x => x.Id == specimenId && x.LabWorkOrderId == workId, ct)
            ?? throw new OrderManagementException("not_found", "The sample was not found in this job.", 404);
        var work = await db.LabWorkOrders.AsNoTracking().SingleAsync(x => x.Id == workId, ct);
        var evidence = new Dictionary<string, object>();
        var limited = new List<string>();
        async Task<List<T>> Read<T>(string key, IQueryable<T> query)
        {
            var rows = await query.Take(limit + 1).ToListAsync(ct);
            if (rows.Count > limit) { limited.Add(key); rows.RemoveAt(limit); }
            evidence[key] = rows;
            return rows;
        }
        var containers = await Read("containers", db.LabContainers.AsNoTracking().Where(x => x.LabWorkOrderId == workId && x.LabSpecimenId == specimenId).OrderBy(x => x.Id));
        var attempts = await Read("attempts", db.LabSpecimenAttempts.AsNoTracking().Where(x => x.LabWorkOrderId == workId && x.LabSpecimenId == specimenId).OrderBy(x => x.Sequence));
        var executions = await Read("executions", db.LabProtocolExecutions.AsNoTracking().Where(x => x.LabWorkOrderId == workId && x.LabSpecimenId == specimenId).OrderBy(x => x.Id));
        // Subqueries use the entire scoped source, rather than the bounded display page.
        var executionIds = db.LabProtocolExecutions.Where(x => x.LabWorkOrderId == workId && x.LabSpecimenId == specimenId).Select(x => x.Id);
        var protocolIds = db.LabProtocolExecutions.Where(x => x.LabWorkOrderId == workId && x.LabSpecimenId == specimenId).Select(x => x.LabProtocolVersionId);
        await Read("protocols", db.LabProtocolVersions.AsNoTracking().Where(x => protocolIds.Contains(x.Id)).OrderBy(x => x.Id));
        var materials = await Read("materials", db.LabMaterialConsumptions.AsNoTracking().Where(x => executionIds.Contains(x.LabProtocolExecutionId)).OrderBy(x => x.RecordedAtUtc).ThenBy(x => x.Id));
        var equipment = await Read("equipment", db.LabEquipmentUsages.AsNoTracking().Where(x => executionIds.Contains(x.LabProtocolExecutionId)).OrderBy(x => x.UsedAtUtc).ThenBy(x => x.Id));
        await Read("libraries", db.LabLibraries.AsNoTracking().Where(x => x.LabWorkOrderId == workId && x.LabSpecimenId == specimenId).OrderBy(x => x.Id));
        var outputs = await Read("sequencingOutputs", db.LabSequencingOutputs.AsNoTracking().Where(x => x.LabWorkOrderId == workId && x.LabSpecimenId == specimenId).OrderBy(x => x.RecordedAtUtc).ThenBy(x => x.Id));
        var runs = await Read("analysisRuns", db.LabAnalysisRuns.AsNoTracking().Where(x => x.LabWorkOrderId == workId && x.LabSpecimenId == specimenId).OrderBy(x => x.RecordedAtUtc).ThenBy(x => x.Id));
        var performanceProposals = await Read("performanceProposals", db.LabPerformanceProposals.AsNoTracking().Where(x => x.LabWorkOrderId == workId && x.LabSpecimenId == specimenId).OrderBy(x => x.RequestedAtUtc).ThenBy(x => x.Id));
        var proposalIds = db.LabPerformanceProposals.Where(x => x.LabWorkOrderId == workId && x.LabSpecimenId == specimenId).Select(x => x.Id);
        var performanceDecisions = await Read("performanceDecisions", db.LabPerformanceDecisions.AsNoTracking().Where(x => proposalIds.Contains(x.Id)).OrderBy(x => x.ReviewedAtUtc).ThenBy(x => x.Id));
        var runIds = db.LabAnalysisRuns.Where(x => x.LabWorkOrderId == workId && x.LabSpecimenId == specimenId).Select(x => x.Id);
        var analysisInputs = await Read("analysisInputs", db.LabAnalysisInputs.AsNoTracking().Where(x => runIds.Contains(x.LabAnalysisRunId)).OrderBy(x => x.Id));
        var scientificRequirements = runs.Select(run => new { id = run.Id, requirements = LabScientificRequirements.Assess(run,
            outputs.Where(output => analysisInputs.Any(input => input.LabAnalysisRunId == run.Id && input.LabSequencingOutputId == output.Id)).ToList()) }).ToList();
        evidence["scientificRequirements"] = scientificRequirements;
        var packagesQuery = db.ResultOutputPackages.AsNoTracking().Where(x => x.LabWorkOrderId == workId && x.OrganizationId == work.SubmittingOrganizationId
            && (x.LabSampleId == specimen.SubmittedSpecimenId || x.TrialSampleId == specimen.SubmittedSpecimenId));
        var packages = await Read("results", packagesQuery.OrderBy(x => x.Id).Select(x => new { x.Id, x.PackageVersion, x.State, x.LabAnalysisRunId, x.TraceabilityRequired,
            x.ManifestSha256, x.CorrectsPackageId, x.ExpectedArtifactCount, x.ReleasedAtUtc }));
        var packageIds = packagesQuery.Select(x => x.Id);
        await Read("artifacts", db.ResultArtifacts.AsNoTracking().Where(x => packageIds.Contains(x.ResultOutputPackageId)).OrderBy(x => x.Id)
            .Select(x => new { x.Id, x.ResultOutputPackageId, x.FileName, x.Sha256, x.SizeBytes, x.ResultLocator, x.DeletedAtUtc }));
        var legacy = await Read("legacyResults", db.LabResultReleases.AsNoTracking().Where(x => x.OrganizationId == work.SubmittingOrganizationId && x.LabSampleId == specimen.SubmittedSpecimenId)
            .OrderBy(x => x.Id).Select(x => new { x.Id, x.ReleaseVersion, x.LabAnalysisRunId, x.TraceabilityRequired, x.ResultLocator, x.ReleasedAt }));
        await Read("approvals", db.LabScientificApprovals.AsNoTracking().Where(x => x.LabWorkOrderId == workId && x.ResultOutputPackageId.HasValue && packageIds.Contains(x.ResultOutputPackageId.Value)).OrderBy(x => x.ApprovedAtUtc).ThenBy(x => x.Id));
        await Read("exceptions", db.LabExceptions.AsNoTracking().Where(x => x.LabWorkOrderId == workId && (x.LabSpecimenId == specimenId || x.LabProtocolExecutionId.HasValue && executionIds.Contains(x.LabProtocolExecutionId.Value))).OrderBy(x => x.Id));
        var containerIds = db.LabContainers.Where(x => x.LabWorkOrderId == workId && x.LabSpecimenId == specimenId).Select(x => x.Id);
        // Never expose custody for another sample in a shared sendout.
        await Read("custody", db.LabCustodyEvents.AsNoTracking().Where(x => x.LabContainerId.HasValue && containerIds.Contains(x.LabContainerId.Value)).OrderBy(x => x.OccurredAtUtc).ThenBy(x => x.Id));
        // Live events have a separate paged endpoint; saved reports include their full bounded source snapshot.
        if (limit > 1000) await Read("events", db.LabWorkEvents.AsNoTracking().Where(x => x.LabWorkOrderId == workId && x.LabSpecimenId == specimenId
            && x.EventCode != "InvestigationReportGenerated" && x.EventCode != "InvestigationReportDownloaded").OrderBy(x => x.OccurredAtUtc).ThenBy(x => x.Id));
        var steps = executions.SelectMany(x => LabProtocolEvidence.Read(x.CapturedResultsJson).Records).ToArray();
        var deliveryActors = await new LabInvestigationDeliveryHistory(db).ReadAsync(work, specimen, evidence, limited, limit, ct);
        var actorIds = steps.SelectMany(x => new[] { x.RecordedByUserId, x.Performance?.PerformedByUserId ?? x.RecordedByUserId })
            .Concat(performanceProposals.Select(x => x.RequestedByUserId)).Concat(performanceDecisions.Select(x => x.ReviewedByUserId))
            .Concat(performanceProposals.Select(x => System.Text.Json.JsonSerializer.Deserialize<LabStepPerformance>(x.PerformanceJson, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web))!.PerformedByUserId))
            .Concat(materials.Select(x => x.RecordedByUserId)).Concat(equipment.Select(x => x.UsedByUserId)).Concat(deliveryActors).Distinct().ToArray();
        evidence["people"] = await db.Users.AsNoTracking().Where(x => actorIds.Contains(x.Id))
            .Select(x => new { x.Id, name = x.FirstName + " " + x.LastName }).ToListAsync(ct);
        var preparationRecordIds = steps.Where(x => x.PreparationRecordId.HasValue).Select(x => x.PreparationRecordId!.Value).Distinct().ToArray();
        var preparationRecords = await db.LabPreparationRecords.AsNoTracking().Where(x => preparationRecordIds.Contains(x.Id)).OrderBy(x => x.RecordedAtUtc).Take(limit + 1).ToListAsync(ct);
        if (preparationRecords.Count > limit) { limited.Add("attachments"); preparationRecords.RemoveAt(limit); }
        var attachments = new List<object>();
        foreach (var record in preparationRecords)
        {
            using var details = System.Text.Json.JsonDocument.Parse(record.DetailsJson);
            foreach (var role in new[] { "preparationReport", "qcReport" })
                if (details.RootElement.TryGetProperty(role, out var file)) attachments.Add(new
                {
                    record.Id, record.LabPreparationBatchId, role, recordedByUserId = record.ActorUserId, record.RecordedAtUtc,
                    fileName = file.GetProperty("fileName").GetString(), sha256 = file.GetProperty("sha256").GetString(),
                    sizeBytes = file.GetProperty("sizeBytes").GetInt64(), scanStatus = file.GetProperty("scanStatus").GetString(),
                    availability = "Download checks current availability; this snapshot preserves metadata only."
                });
        }
        evidence["attachments"] = attachments;
        var coverage = new List<LabEvidenceCoverageDto>
        {
            new("Source tubes", containers.Count == 0 ? "Missing" : "Recorded", $"{containers.Count} containers; {attempts.Count} attempts. Result-specific attribution is checked separately."),
            new("Step performance", steps.Length == 0 ? "Pending work" : steps.Any(x => x.Outcome != "skipped" && x.Performance is null) ? "Legacy unknown" : "Recorded", "Performer/time evidence is distinct from entry time. Skips do not assert performance."),
            new("Resource snapshots", materials.Any(x => x.ResourceSnapshotJson == null) || equipment.Any(x => x.ResourceSnapshotJson == null) ? "Legacy unknown" : materials.Count + equipment.Count == 0 ? "Pending work" : "Recorded", "Snapshots describe the resource when recorded; late entries do not prove its historical condition."),
            new("Result attribution", packages.Any(x => x.LabAnalysisRunId == null) || legacy.Any(x => x.LabAnalysisRunId == null) ? "Legacy unknown" : packages.Count + legacy.Count == 0 ? "Pending work" : "Recorded", $"{outputs.Count} sequencing outputs; {runs.Count} analyses. Open a result to check its exact input and tube chain."),
            new("Scientific requirements", runs.Count == 0 ? "Pending work" : runs.Any(x => x.RequirementsSnapshotJson is null) ? "Legacy unknown"
                : scientificRequirements.Any(x => x.requirements.Any(r => r.Status == "Missing")) ? "Missing" : "Recorded",
                "Profile 1 requires run/QC evidence, analysis versions/settings/references, times and exact inputs. Explained exceptions remain visible. Source attribution cannot be waived; coverage does not certify scientific validity."),
            new("Performance review", performanceProposals.Any(x => performanceDecisions.All(d => d.Id != x.Id)) ? "Pending work"
                : steps.Any(step => step.Performance?.VerificationStatus == "PendingReview" && step.CorrectsRecordId is null
                    && !performanceProposals.Any(p => p.StepRecordId == step.Id && performanceDecisions.Any(d => d.Id == p.Id && d.Approved))) ? "Missing" : "Recorded",
                "On-behalf entries and performer/time amendments need a different supervisor's decision. Originals and review history are retained; rejected or unknown attribution cannot count as verified evidence.")
        };
        coverage.Insert(4, new("Scientific metadata", outputs.Count + runs.Count == 0 ? "Pending work"
            : outputs.Any(x => x.ScientificEvidenceJson == null) || runs.Any(x => x.ScientificEvidenceJson == null) ? "Legacy unknown" : "Recorded",
            "Producer-declared run mapping, versions, configuration/reference checksums, QC and document references. External file availability and scientific validity require separate verification."));
        if (limited.Count > 0) coverage.Add(new("History limits", "Unavailable", $"Some sections exceed {limit:N0} records. This view is partial; no complete-history claim is made."));
        return new(1, workId, specimenId, DateTime.UtcNow, specimen, coverage, evidence, limited);
    }
}
