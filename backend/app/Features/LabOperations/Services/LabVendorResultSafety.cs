namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

/// <summary>Protect downstream decisions while retaining unaffected immutable inputs.</summary>
public sealed class LabVendorResultSafety(PSeqOperationsDbContext db)
{
    public static VendorResultsFastqSetSnapshot? RetainedSet(VendorResultsSnapshot? previous, RecordVendorResultsRequest request, Guid setId)
        => previous is { RunNotPerformed: false } && !request.RunNotPerformed
            && previous.VendorJobReference == request.VendorJobReference.Trim()
            && previous.RunStartedAtUtc == request.RunStartedAtUtc
            && previous.RunCompletedAtUtc == request.RunCompletedAtUtc
            && previous.ResultsReceivedAtUtc == request.ResultsReceivedAtUtc
            ? previous.FastqSets?.SingleOrDefault(s => s.SetId == setId) : null;

    public async Task<IReadOnlyList<ProtectedVendorPackage>> ProtectedPackagesAsync(IReadOnlyList<Guid> outputIds, CancellationToken ct)
    {
        var analyses = db.LabAnalysisInputs.Where(i => outputIds.Contains(i.LabSequencingOutputId)).Select(i => i.LabAnalysisRunId);
        return await db.ResultOutputPackages.AsNoTracking().Where(p => p.LabAnalysisRunId.HasValue && analyses.Contains(p.LabAnalysisRunId.Value)
            && (p.State == ResultOutputPackageState.ScientificallyApproved || p.State == ResultOutputPackageState.ReadyForRelease || p.State == ResultOutputPackageState.Released))
            .Select(p => new ProtectedVendorPackage(p.Id, p.PackageVersion, p.State.ToString(), p.TrialProjectId)).ToListAsync(ct);
    }

    public async Task RequireCorrectionAllowedAsync(IReadOnlyList<Guid> invalidated, CancellationToken ct)
    {
        if (invalidated.Count == 0) return;
        var protectedPackages = await ProtectedPackagesAsync(invalidated, ct);
        var analyses = db.LabAnalysisInputs.Where(i => invalidated.Contains(i.LabSequencingOutputId)).Select(i => i.LabAnalysisRunId);
        var publishedRelease = await db.LabResultReleases.AnyAsync(r => r.LabAnalysisRunId.HasValue && analyses.Contains(r.LabAnalysisRunId.Value)
            && r.ReleaseStatus != FileReleaseStatus.Internal && r.ReleaseStatus != FileReleaseStatus.Withdrawn, ct);
        if (protectedPackages.Count > 0 || publishedRelease)
            throw new OrderManagementException("vendor_results_withdrawal_required", "These changes affect an approved or published result. Ask the result release manager to withdraw the affected package or release before correcting the vendor results. Unchanged files and notes-only edits can be retained.", 409);
        var workIds = await db.LabSequencingOutputs.Where(o => invalidated.Contains(o.Id)).Select(o => o.LabWorkOrderId).Distinct().ToArrayAsync(ct);
        var active = await db.Set<LabAssemblyJob>().AsNoTracking().Where(j => workIds.Contains(j.LabWorkOrderId)
            && j.State != "Queued" && j.State != "Succeeded" && j.State != "Failed" && j.State != "Terminated" && j.State != "CancelledBeforeStart").ToListAsync(ct);
        if (active.Any(j => JsonSerializer.Deserialize<AssemblyFrozenInputs>(j.InputsJson, LabAssemblyService.Json)!.Inputs.Any(i => invalidated.Contains(i.SequencingOutputId))))
            throw new OrderManagementException("vendor_results_assembly_active", "An assembly using these inputs is being dispatched or is running. Cancel and reconcile it, or wait for its final disposition, before changing these vendor results.", 409);
    }
}

public sealed record ProtectedVendorPackage(Guid Id, int PackageVersion, string State, Guid? TrialProjectId);
