namespace PhaenoPortal.App.Features.OrderManagement.Domain;

public sealed partial class LabServiceOrder
{
    // Accepted commercial quantities stay immutable. Cancellation changes the
    // outstanding physical preparation, not the agreement or existing identities.
    public LabPhaseScope ReadPreparationScope()
    {
        var cancelled = Phases.Where(p => p.SupersededAtUtc == null && p.CancelledAtUtc.HasValue).ToArray();
        if (cancelled.Sum(p => p.SampleCount) == RequestedSpecimenCount)
            return new([], null, 0);
        var counts = SourceGroups.ToDictionary(g => g.NormalizedBiologicalSource, g => g.SpecimenCount);
        var runs = RequestedSequencingRunCount;
        foreach (var phase in cancelled)
        {
            var scope = phase.ReadScope();
            if (scope is null)
            {
                var members = Samples.Where(s => s.LabJobPhaseId == phase.Id).ToArray();
                if (members.Length != phase.SampleCount)
                    throw new InvalidOperationException("Confirm this phase's biological sources and sequencing-run allocation before cancelling it.");
                scope = new(members.GroupBy(s => LabServiceSourceGroup.Normalize(s.BiologicalSource))
                    .Select(g => new PhaseSourceScope(g.First().BiologicalSource, g.Count())).ToArray(), null,
                    members.Sum(s => s.SequencingRunCount));
            }
            foreach (var source in scope.Sources)
                counts[LabServiceSourceGroup.Normalize(source.BiologicalSource)] -= source.SpecimenCount;
            runs -= scope.SequencingRunCount;
        }
        return new(SourceGroups.Where(g => counts[g.NormalizedBiologicalSource] > 0)
            .Select(g => new PhaseSourceScope(g.BiologicalSource, counts[g.NormalizedBiologicalSource])).ToArray(), null, runs);
    }

    public bool RequiresPreparation(Guid? phaseId) => !Phases.Any(p => p.Id == phaseId && p.CancelledAtUtc.HasValue);
}
