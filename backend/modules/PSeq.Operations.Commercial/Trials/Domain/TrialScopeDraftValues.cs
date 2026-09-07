namespace PSeq.Operations.Commercial.Trials.Domain;

// Editable staff work is separate from the immutable, scientifically validated scope revisions.
public sealed record TrialScopeDraftValues(
    Guid? DepartmentId = null, string? Name = null, string? Objective = null, int? SampleAllowance = null,
    DateTime? SubmissionOpensAtUtc = null, DateTime? SubmissionClosesAtUtc = null, Guid? WorkflowVersionId = null,
    IReadOnlyList<Guid>? AnalysisIds = null, IReadOnlyList<Guid>? DeliverableIds = null,
    string? SubmissionInstructions = null, string? SuccessCriteria = null, decimal? EstimatedRetailValue = null,
    decimal? AnticipatedInternalCost = null, int? ResidualRetentionDays = null,
    TrialMaterialDisposition? MaterialDisposition = null, string? ReturnDestination = null,
    string? ReturnHandling = null, string? ReturnShippingPayer = null, string? Terms = null, string? Reason = null)
{
    public void Validate()
    {
        Limit(Name, 255); Limit(Objective); Limit(SubmissionInstructions); Limit(SuccessCriteria);
        Limit(ReturnDestination); Limit(ReturnHandling); Limit(ReturnShippingPayer, 255); Limit(Terms, 12000); Limit(Reason);
        if (SampleAllowance is < 1 || ResidualRetentionDays is < 0 || EstimatedRetailValue is < 0 || AnticipatedInternalCost is < 0)
            throw new ArgumentException("Use a positive sample allowance and non-negative cost and material-retention values, or leave them blank in the draft.");
        if (DepartmentId == Guid.Empty || WorkflowVersionId == Guid.Empty)
            throw new ArgumentException("Selected Department and workflow identifiers must be valid.");
        if (SubmissionOpensAtUtc.HasValue) TrialRules.Utc(SubmissionOpensAtUtc.Value);
        if (SubmissionClosesAtUtc.HasValue) TrialRules.Utc(SubmissionClosesAtUtc.Value);
        if (MaterialDisposition.HasValue && !Enum.IsDefined(MaterialDisposition.Value))
            throw new ArgumentException("Select a supported material disposition.");
        Choices(AnalysisIds); Choices(DeliverableIds);
    }

    private static void Limit(string? value, int maximum = 4000)
    {
        if (value?.Length > maximum) throw new ArgumentException($"Keep draft text within {maximum:N0} characters.");
    }

    private static void Choices(IReadOnlyList<Guid>? values)
    {
        if (values is not null && (values.Count > 100 || values.Contains(Guid.Empty) || values.Distinct().Count() != values.Count))
            throw new ArgumentException("Select up to 100 distinct valid entries for each draft catalog selection.");
    }
}
