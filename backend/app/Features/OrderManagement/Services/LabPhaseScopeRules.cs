namespace PhaenoPortal.App.Features.OrderManagement.Services;

using PhaenoPortal.App.Features.OrderManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public static class LabPhaseScopeRules
{
    public static LabJobPhase Resolve(LabServiceOrder order, Guid? phaseId)
    {
        var phases = order.Phases.Where(p => p.SupersededAtUtc == null && p.CancelledAtUtc == null).ToArray();
        var available = phases.Where(p => order.Samples.Count(s => s.LabJobPhaseId == p.Id) < p.SampleCount).ToArray();
        var phase = phaseId.HasValue ? phases.SingleOrDefault(p => p.Id == phaseId) : phases.Length == 1 ? phases[0]
            : available.Length == 1 ? available[0] : phases.All(p => p.ScopeJson == null) ? available.FirstOrDefault() : null;
        return phase ?? throw LabPhaseOperations.Error("sample_phase_required", "Choose the current phase this sample belongs to.");
    }

    public static void Validate(LabJobPhase phase, string source, int runs,
        IEnumerable<(string Source, int Runs)> current)
    {
        if (phase.CancelledAtUtc.HasValue)
            throw LabPhaseOperations.Error("phase_cancelled", "This phase is cancelled and does not require sample preparation.");
        var saved = current.ToArray();
        if (saved.Length >= phase.SampleCount)
            throw LabPhaseOperations.Error("phase_scope_full", "Every sample position in this phase is already assigned.");
        var scope = phase.ReadScope();
        if (scope is null) return;
        var normalized = LabServiceSourceGroup.Normalize(source);
        var expected = scope.Sources.SingleOrDefault(s => LabServiceSourceGroup.Normalize(s.BiologicalSource) == normalized);
        if (expected is null || saved.Count(s => LabServiceSourceGroup.Normalize(s.Source) == normalized) >= expected.SpecimenCount)
            throw LabPhaseOperations.Error("phase_source_scope_full", "Choose a biological source with a remaining sample position in this phase.");
        if (scope.RunsPerSample.HasValue && scope.RunsPerSample != runs || saved.Sum(s => s.Runs) + runs > scope.SequencingRunCount)
            throw LabPhaseOperations.Error("phase_run_scope_invalid", "The sample’s sequencing runs must match its phase’s purchased scope.");
    }
}
