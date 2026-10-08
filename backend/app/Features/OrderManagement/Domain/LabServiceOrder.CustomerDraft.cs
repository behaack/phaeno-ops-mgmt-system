namespace PhaenoPortal.App.Features.OrderManagement.Domain;

using System.Text.Json;

public sealed partial class LabServiceOrder
{
    public CustomerStandardOrderDraft? ReadCustomerDraft() => CustomerDraftJson is null ? null
        : JsonSerializer.Deserialize<CustomerStandardOrderDraft>(CustomerDraftJson, CommercialDraftRules.Json);

    public static LabServiceOrder CreateCustomerDraft(Guid organizationId, Guid departmentId,
        string orderNumber, CustomerStandardOrderDraft draft, string instructions)
    {
        if (organizationId == Guid.Empty || departmentId == Guid.Empty) throw new ArgumentException("Select a Department.");
        var order = new LabServiceOrder
        {
            OrganizationId = organizationId, DepartmentId = departmentId, OrderNumber = orderNumber,
            SubmissionInstructionsSnapshot = instructions, StorageRequirements = "", SafetyDeclaration = ""
        };
        order.SaveCustomerDraft(draft);
        return order;
    }

    public void SaveCustomerDraft(CustomerStandardOrderDraft draft)
    {
        EnsureStatus(LabServiceOrderStatus.DraftRequest);
        if (PlacedAt.HasValue || SubmittedAt.HasValue || SourceRequestId.HasValue || CommercialDraftJson is not null
            || Samples.Count > 0 || Phases.Any(p => p.ScopeJson is not null))
            throw new InvalidOperationException("Only an unplaced Customer Draft can be edited here.");
        draft.Validate(false);
        CustomerReference = draft.JobName.Trim(); NormalizedJobName = NormalizeJobName(CustomerReference);
        Description = draft.Notes?.Trim(); StorageRequirements = draft.StorageRequirements?.Trim() ?? "";
        SafetyDeclaration = draft.SafetyDeclaration?.Trim() ?? "";
        RequestedSpecimenCount = draft.Sources.Sum(s => s.SpecimenCount);
        SequencingRunCount = RequestedSpecimenCount;
        CustomerDraftJson = JsonSerializer.Serialize(draft, CommercialDraftRules.Json);
    }

    public void PrepareCustomerReview(Guid sampleTypeId, string materialClass, string defaultStorage)
    {
        var draft = ReadCustomerDraft() ?? throw new InvalidOperationException("Save the Customer Draft first.");
        draft.Validate(true);
        var storage = draft.StorageRequirements is null ? defaultStorage : draft.StorageRequirements.Trim();
        if (string.IsNullOrWhiteSpace(storage)) throw new ArgumentException("Configure Sample type storage, or enter different storage requirements.");
        StorageRequirements = storage;
        SelectSampleType(sampleTypeId, materialClass);
        HasMixedBiologicalSources = draft.Sources.Count > 1;
        SharedBiologicalSource = draft.Sources.Count == 1 ? draft.Sources[0].BiologicalSource.Trim() : null;
        TubeUsePolicyKey = "run_one_with_failure_fallback"; TubeUsePolicyVersion = 1;
        foreach (var source in draft.Sources) SourceGroups.Add(new(Id, source.BiologicalSource, source.SpecimenCount));
        Phases.Add(new(Id, 1, "Phase 1", RequestedSpecimenCount));
    }
}
