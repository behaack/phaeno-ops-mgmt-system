namespace PhaenoPortal.App.Features.OrderManagement.Domain;

using System.Text.Json;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed record PhaseSourceScope(string BiologicalSource, int SpecimenCount);
public sealed record LabPhaseScope(IReadOnlyList<PhaseSourceScope> Sources, int? RunsPerSample, int SequencingRunCount);
public sealed record CommercialDraftPhase(string Name, IReadOnlyList<PhaseSourceScope> Sources,
    int? RunsPerSample, int? TurnaroundBusinessDays, decimal? ProposedUnitPrice, string? PricingNote, bool ProposePrice = false,
    decimal? ProposedAdditionalRunPrice = null);
public sealed record CommercialLabOrderDraft(string JobName, Guid? SampleTypeDefinitionId,
    string? StorageRequirements, string? SafetyDeclaration, string? Notes, bool UsesPhases,
    IReadOnlyList<CommercialDraftPhase> Phases, Guid? CatalogItemId = null);

public static class CommercialDraftRules
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static void Validate(CommercialLabOrderDraft draft, bool submission)
    {
        if (draft is null || string.IsNullOrWhiteSpace(draft.JobName) || draft.JobName.Trim().Length > 255)
            throw new ArgumentException("Enter a Job name of up to 255 characters before saving the Draft.");
        if (draft.Phases is null || draft.Phases.Count is < 1 or > 100 || !draft.UsesPhases && draft.Phases.Count != 1
            || draft.UsesPhases && draft.Phases.Count < 2)
            throw new ArgumentException("Use one scope, or enable phases and choose between 2 and 100 phases.");
        if (new[] { draft.StorageRequirements, draft.SafetyDeclaration, draft.Notes }.Any(x => x?.Length > 2000))
            throw new ArgumentException("Job notes, storage requirements and safety declarations allow up to 2,000 characters each.");
        if (submission && (!draft.SampleTypeDefinitionId.HasValue || string.IsNullOrWhiteSpace(draft.SafetyDeclaration)))
            throw new ArgumentException("Select a Sample type and complete the safety declaration before submitting for pricing.");
        if (submission && draft.StorageRequirements is not null && string.IsNullOrWhiteSpace(draft.StorageRequirements))
            throw new ArgumentException("Enter the different storage requirements, or use the Sample type requirements.");
        long samples = 0, runs = 0;
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var phase in draft.Phases)
        {
            if (phase is null || phase.Name is null || phase.Name.Length > 150 || phase.Sources is null || phase.Sources.Count > 100
                || phase.RunsPerSample is < 1 or > 10000 || phase.TurnaroundBusinessDays is < 1 or > 365
                || phase.ProposedUnitPrice is <= 0 || phase.ProposedUnitPrice.HasValue && decimal.Round(phase.ProposedUnitPrice.Value, 2) != phase.ProposedUnitPrice
                || phase.ProposedAdditionalRunPrice is <= 0 || phase.ProposedAdditionalRunPrice.HasValue && decimal.Round(phase.ProposedAdditionalRunPrice.Value, 2) != phase.ProposedAdditionalRunPrice
                || phase.PricingNote?.Length > 1000)
                throw new ArgumentException("Check phase names, run counts, business-day targets and proposed prices.");
            if (submission && (string.IsNullOrWhiteSpace(phase.Name) || !names.Add(phase.Name.Trim())
                || !phase.RunsPerSample.HasValue || phase.Sources.Count == 0 || phase.ProposePrice && !phase.ProposedUnitPrice.HasValue))
                throw new ArgumentException("Every phase needs a distinct name, at least one biological source and a runs-per-sample value before submission.");
            if (submission && phase.ProposePrice && phase.RunsPerSample > 1 && !phase.ProposedAdditionalRunPrice.HasValue)
                throw new ArgumentException("Enter a separate price per additional sequencing run for every proposed phase with more than one run per sample.");
            var sources = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var source in phase.Sources)
            {
                if (source is null || source.BiologicalSource is null || source.BiologicalSource.Length > 500 || source.SpecimenCount is < 0 or > 10000)
                    throw new ArgumentException("Check biological sources and sample counts.");
                if (submission && (string.IsNullOrWhiteSpace(source.BiologicalSource) || source.SpecimenCount < 1
                    || !sources.Add(LabServiceSourceGroup.Normalize(source.BiologicalSource))))
                    throw new ArgumentException("Enter distinct biological sources with positive sample counts within each phase.");
                samples += source.SpecimenCount;
                runs += (long)source.SpecimenCount * (phase.RunsPerSample ?? 0);
            }
        }
        if (samples > 10000 || runs > 10000 || submission && (samples < 1 || runs < samples))
            throw new ArgumentException("The order must contain 1 to 10,000 samples and no more than 10,000 purchased sequencing runs.");
    }
}
