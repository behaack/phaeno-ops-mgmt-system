namespace PSeq.Operations.Commercial.Trials.Domain;

using System.Text.Json;
using System.Text.RegularExpressions;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public enum TrialStatus { Requested, UnderReview, AwaitingAcceptance, AwaitingSamples, InProgress, Completed, Declined, Expired, Cancelled, ClosedIncomplete }
public enum TrialApprovalDomain { Commercial, ScientificOperations }
public enum TrialDecisionKind { Approve, Decline, RequestChanges }
public enum TrialMaterialDisposition { Destroy, Return }
public enum TrialCommercialOutcome { FollowUpScheduled, ConvertedToCustomer, ConvertedToPartner, ClosedWithoutConversion }
public sealed record TrialAnalysisSnapshot(Guid Id, long Version, string Name, string Instructions, string RequiredInputsJson, string ResultContractJson);
public sealed record TrialDeliverableSnapshot(Guid Id, int Revision, string Key, string Name);
public sealed record TrialScopeValues(
    string Name, string Objective, int SampleAllowance, DateTime SubmissionOpensAtUtc, DateTime SubmissionClosesAtUtc,
    Guid WorkflowVersionId, IReadOnlyList<TrialAnalysisSnapshot> Analyses, IReadOnlyList<TrialDeliverableSnapshot> Deliverables,
    string SubmissionInstructions, string SuccessCriteria, decimal EstimatedRetailValue, decimal AnticipatedInternalCost,
    int ResidualRetentionDays, TrialMaterialDisposition MaterialDisposition, string? ReturnDestination,
    string? ReturnHandling, string? ReturnShippingPayer, string Terms)
{
    public void Validate()
    {
        TrialRules.Text(Name, 255); TrialRules.Text(Objective); TrialRules.Text(SubmissionInstructions);
        TrialRules.Text(SuccessCriteria); TrialRules.Text(Terms, 12000);
        if (SampleAllowance < 1 || ResidualRetentionDays < 0 || EstimatedRetailValue < 0 || AnticipatedInternalCost < 0)
            throw new ArgumentException("Use a positive sample allowance and non-negative cost and material-retention values.");
        TrialRules.Utc(SubmissionOpensAtUtc); TrialRules.Utc(SubmissionClosesAtUtc);
        if (SubmissionClosesAtUtc <= SubmissionOpensAtUtc) throw new ArgumentException("Submission closes after it opens.");
        if (WorkflowVersionId == Guid.Empty || Analyses.Count == 0 || Deliverables.Count == 0
            || Analyses.Any(value => value.Id == Guid.Empty || value.Version < 1)
            || Deliverables.Any(value => value.Id == Guid.Empty || value.Revision < 1)
            || Analyses.Select(value => value.Id).Distinct().Count() != Analyses.Count
            || Deliverables.Select(value => value.Key).Distinct(StringComparer.OrdinalIgnoreCase).Count() != Deliverables.Count)
            throw new ArgumentException("Select versioned PSeq analyses, a laboratory workflow and distinct deliverables.");
        if (!Enum.IsDefined(MaterialDisposition)) throw new ArgumentException("Select a material disposition.");
        if (MaterialDisposition == TrialMaterialDisposition.Return)
        { TrialRules.Text(ReturnDestination); TrialRules.Text(ReturnHandling); TrialRules.Text(ReturnShippingPayer, 255); }
    }
}

public sealed class TrialProject : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Number { get; private set; } = null!;
    public Guid CrmHandoffId { get; private set; }
    public Guid CompanyId { get; private set; }
    public Guid OpportunityId { get; private set; }
    public Guid SalesOwnerUserId { get; private set; }
    public Guid? OrganizationId { get; private set; }
    public Guid? DepartmentId { get; private set; }
    public TrialStatus Status { get; private set; } = TrialStatus.Requested;
    public int CurrentScopeRevision { get; private set; }
    public int? ApprovedScopeRevision { get; private set; }
    public int? AcceptedScopeRevision { get; private set; }
    public DateTime? AcceptedAtUtc { get; private set; }
    public Guid? AcceptedByUserId { get; private set; }
    public string? AcceptedTermsVersion { get; private set; }
    public bool IsOnHold { get; private set; }
    public string? HoldReason { get; private set; }
    public string? ScheduleEstimate { get; private set; }
    public string? ClosureReason { get; private set; }
    public DateTime? ClosedAtUtc { get; private set; }
    public DateTime? ResidualRetainUntilUtc { get; private set; }
    public string? ActualMaterialDisposition { get; private set; }
    public DateTime? MaterialDisposedAtUtc { get; private set; }
    public Guid? MaterialDisposedByUserId { get; private set; }
    public TrialCommercialOutcome? CommercialOutcome { get; private set; }
    public string? CommercialOutcomeReason { get; private set; }
    public Guid? FollowUpOwnerUserId { get; private set; }
    public DateTime? FollowUpAtUtc { get; private set; }
    public Guid? CompleteReleaseId { get; private set; }
    public ICollection<TrialScope> Scopes { get; private set; } = new List<TrialScope>();
    public ICollection<TrialSample> Samples { get; private set; } = new List<TrialSample>();
    public bool IsTerminal => Status is TrialStatus.Completed or TrialStatus.Declined or TrialStatus.Expired or TrialStatus.Cancelled or TrialStatus.ClosedIncomplete;
    private TrialProject() { }
    public TrialProject(string number, Guid handoffId, Guid companyId, Guid opportunityId, Guid salesOwnerUserId)
    {
        Number = TrialRules.Text(number, 40);
        if (new[] { handoffId, companyId, opportunityId, salesOwnerUserId }.Contains(Guid.Empty))
            throw new ArgumentException("A CRM request, Company, Opportunity and Sales owner are required.");
        CrmHandoffId = handoffId; CompanyId = companyId; OpportunityId = opportunityId; SalesOwnerUserId = salesOwnerUserId;
    }
    public TrialScope Propose(TrialScopeValues values, string reason, Guid actorId, DateTime now)
    {
        EnsureOpen(); values.Validate();
        if (Samples.Count(value => !value.ReplacesSampleId.HasValue) > values.SampleAllowance)
            throw new InvalidOperationException("The allowance cannot be smaller than the original samples already submitted.");
        var approved = ApprovedScopeRevision.HasValue ? Scopes.Single(value => value.Revision == ApprovedScopeRevision).Read() : null;
        if (Samples.Count > 0 && approved is not null && (values.MaterialDisposition != approved.MaterialDisposition
            || values.ReturnDestination != approved.ReturnDestination || values.ReturnHandling != approved.ReturnHandling
            || values.ReturnShippingPayer != approved.ReturnShippingPayer))
            throw new InvalidOperationException("Return terms cannot change after the first sample submission.");
        var scope = new TrialScope(Id, ++CurrentScopeRevision, values, reason, actorId, now);
        Scopes.Add(scope); Status = TrialStatus.UnderReview; return scope;
    }
    public void BindOrganization(Guid organizationId, Guid departmentId)
    {
        EnsureOpen();
        if (organizationId == Guid.Empty || departmentId == Guid.Empty) throw new ArgumentException("An organization and Department are required.");
        if (ApprovedScopeRevision.HasValue && (OrganizationId != organizationId || DepartmentId != departmentId))
            throw new InvalidOperationException("Approved Trial ownership is immutable.");
        OrganizationId = organizationId; DepartmentId = departmentId;
    }
    public TrialDecision Decide(TrialApprovalDomain domain, TrialDecisionKind kind, Guid actorId, Guid authorityId, bool asDelegate, string reason, DateTime now)
    {
        EnsureOpen();
        if (Status != TrialStatus.UnderReview) throw new InvalidOperationException("Submit a scope for review first.");
        var scope = CurrentScope();
        if (kind == TrialDecisionKind.Approve && (!OrganizationId.HasValue || !DepartmentId.HasValue))
            throw new InvalidOperationException("Link the Prospect organization and Department before approval.");
        var decision = scope.Decide(domain, kind, actorId, authorityId, asDelegate, reason, now);
        if (kind == TrialDecisionKind.Decline) Close(TrialStatus.Declined, reason, now);
        else if (scope.IsApproved)
        { ApprovedScopeRevision = scope.Revision; AcceptedScopeRevision = null; Status = TrialStatus.AwaitingAcceptance; }
        return decision;
    }
    public void Accept(int scopeRevision, string termsVersion, bool affirmed, Guid actorId, DateTime now)
    {
        EnsureOpen(); TrialRules.Utc(now);
        if (IsOnHold || Status != TrialStatus.AwaitingAcceptance || scopeRevision != ApprovedScopeRevision
            || scopeRevision != CurrentScopeRevision || !affirmed || termsVersion != TrialRules.TermsVersion)
            throw new InvalidOperationException("Accept the current approved RUO/no-PHI terms before submitting samples.");
        if (now >= CurrentScope().Read().SubmissionClosesAtUtc) throw new InvalidOperationException("The submission window has closed. Phaeno must approve an amendment.");
        AcceptedScopeRevision = scopeRevision; AcceptedAtUtc = now; AcceptedByUserId = actorId;
        AcceptedTermsVersion = termsVersion; Status = Samples.Count == 0 ? TrialStatus.AwaitingSamples : TrialStatus.InProgress;
    }
    public string? SubmissionBlocker(DateTime now)
    {
        if (IsTerminal) return "This Trial is closed.";
        if (IsOnHold) return "This Trial is on hold.";
        if (CurrentScopeRevision == 0 || ApprovedScopeRevision != CurrentScopeRevision) return "The current scope needs both approvals.";
        if (AcceptedScopeRevision != CurrentScopeRevision) return "An organization administrator must accept the current Trial terms.";
        var values = CurrentScope().Read();
        if (now < values.SubmissionOpensAtUtc) return "The submission window has not opened.";
        if (now >= values.SubmissionClosesAtUtc) return "The submission window has closed.";
        return null;
    }
    public void AddSamples(IReadOnlyList<TrialSample> samples, DateTime now)
    {
        var blocker = SubmissionBlocker(now); if (blocker is not null) throw new InvalidOperationException(blocker);
        if (samples.Count == 0 || samples.Any(value => value.TrialProjectId != Id || value.ScopeRevision != CurrentScopeRevision))
            throw new ArgumentException("Submit samples for this Trial's current scope.");
        if (Samples.Count(value => !value.ReplacesSampleId.HasValue) + samples.Count(value => !value.ReplacesSampleId.HasValue) > CurrentScope().Read().SampleAllowance)
            throw new InvalidOperationException("The approved sample allowance is full.");
        if (Samples.Concat(samples).Select(value => value.Reference.ToUpperInvariant()).Distinct().Count() != Samples.Count + samples.Count)
            throw new InvalidOperationException("Each Trial sample identifier must be unique.");
        foreach (var sample in samples) Samples.Add(sample); Status = TrialStatus.InProgress;
    }
    public void SetHold(bool active, string reason) { HoldReason = TrialRules.Text(reason); IsOnHold = active; }
    public void SetSchedule(string estimate) { EnsureOpen(); ScheduleEstimate = TrialRules.Text(estimate, 2000); }
    public void Close(TrialStatus status, string reason, DateTime now)
    {
        EnsureOpen(); TrialRules.Utc(now);
        if (status is not (TrialStatus.Declined or TrialStatus.Expired or TrialStatus.Cancelled or TrialStatus.ClosedIncomplete))
            throw new ArgumentException("Choose a permitted closure outcome.");
        if (status == TrialStatus.Declined && Samples.Count > 0) throw new InvalidOperationException("Close submitted work incomplete instead of declining it.");
        ClosureReason = TrialRules.Text(reason); Status = status; RecordClosure(now);
    }
    public void Complete(Guid releaseId, DateTime now)
    {
        EnsureOpen(); TrialRules.Utc(now);
        var replacedIds = Samples.Where(value => value.ReplacesSampleId.HasValue).Select(value => value.ReplacesSampleId!.Value).ToHashSet();
        if (IsOnHold || Samples.Count == 0 || Samples.Any(value => !value.HasSuccessfulResult && !replacedIds.Contains(value.Id))
            || ApprovedScopeRevision != CurrentScopeRevision || releaseId == Guid.Empty)
            throw new InvalidOperationException("Complete and release every submitted sample's approved deliverables before completing the Trial.");
        CompleteReleaseId = releaseId; Status = TrialStatus.Completed; RecordClosure(now);
    }
    public void RecordMaterialDisposition(string disposition, Guid actorId, DateTime now)
    {
        TrialRules.Utc(now);
        if (!IsTerminal || !ClosedAtUtc.HasValue || MaterialDisposedAtUtc.HasValue || IsOnHold || !ApprovedScopeRevision.HasValue)
            throw new InvalidOperationException("Record physical disposition once after closure, when no hold applies.");
        var values = Scopes.Single(value => value.Revision == ApprovedScopeRevision).Read();
        if (disposition is not ("Destroyed" or "Returned" or "Exhausted")
            || (disposition == "Returned" && values.MaterialDisposition != TrialMaterialDisposition.Return)
            || (disposition == "Destroyed" && (values.MaterialDisposition != TrialMaterialDisposition.Destroy || now < ResidualRetainUntilUtc)))
            throw new InvalidOperationException("The physical disposition must follow the frozen material terms and due date.");
        ActualMaterialDisposition = disposition; MaterialDisposedAtUtc = now; MaterialDisposedByUserId = actorId;
    }
    public void RecordReissue(Guid releaseId)
    { if (Status != TrialStatus.Completed || releaseId == Guid.Empty) throw new InvalidOperationException("Reissue preserves a completed Trial."); CompleteReleaseId = releaseId; }
    public void RecordCommercialOutcome(TrialCommercialOutcome outcome, string reason, Guid? ownerId, DateTime? followUpAt)
    {
        if (!Enum.IsDefined(outcome)) throw new ArgumentException("Select a commercial outcome.");
        if (CommercialOutcome.HasValue && CommercialOutcome != TrialCommercialOutcome.FollowUpScheduled)
            throw new InvalidOperationException("A final commercial outcome has already been recorded.");
        if (outcome == TrialCommercialOutcome.FollowUpScheduled && (!ownerId.HasValue || ownerId == Guid.Empty || !followUpAt.HasValue))
            throw new ArgumentException("Follow-up needs an owner and date.");
        if (followUpAt.HasValue) TrialRules.Utc(followUpAt.Value);
        CommercialOutcome = outcome; CommercialOutcomeReason = TrialRules.Text(reason);
        FollowUpOwnerUserId = outcome == TrialCommercialOutcome.FollowUpScheduled ? ownerId : null;
        FollowUpAtUtc = outcome == TrialCommercialOutcome.FollowUpScheduled ? followUpAt : null;
    }
    public TrialScope CurrentScope() => Scopes.Single(value => value.Revision == CurrentScopeRevision);
    private void EnsureOpen() { if (IsTerminal) throw new InvalidOperationException("This Trial is closed; request a new Trial for new work."); }
    private void RecordClosure(DateTime now)
    { ClosedAtUtc = now; if (ApprovedScopeRevision.HasValue) ResidualRetainUntilUtc = now.AddDays(Scopes.Single(value => value.Revision == ApprovedScopeRevision).Read().ResidualRetentionDays); }
}

public sealed class TrialScope : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid TrialProjectId { get; private set; }
    public int Revision { get; private set; }
    public string ValuesJson { get; private set; } = null!;
    public string AmendmentReason { get; private set; } = null!;
    public Guid ProposedByUserId { get; private set; }
    public DateTime ProposedAtUtc { get; private set; }
    public ICollection<TrialDecision> Decisions { get; private set; } = new List<TrialDecision>();
    public bool IsApproved => Decisions.Count == 2 && Decisions.All(value => value.Kind == TrialDecisionKind.Approve) && Decisions.Select(value => value.ActorUserId).Distinct().Count() == 2;
    private TrialScope() { }
    public TrialScope(Guid trialId, int revision, TrialScopeValues values, string reason, Guid actorId, DateTime now)
    { values.Validate(); TrialRules.Utc(now); TrialProjectId = trialId; Revision = revision; ValuesJson = JsonSerializer.Serialize(values);
        AmendmentReason = TrialRules.Text(reason); ProposedByUserId = actorId; ProposedAtUtc = now; }
    public TrialScopeValues Read() => JsonSerializer.Deserialize<TrialScopeValues>(ValuesJson)!;
    public TrialDecision Decide(TrialApprovalDomain domain, TrialDecisionKind kind, Guid actorId, Guid authorityId, bool asDelegate, string reason, DateTime now)
    {
        if (!Enum.IsDefined(domain) || !Enum.IsDefined(kind) || actorId == Guid.Empty || authorityId == Guid.Empty)
            throw new ArgumentException("A valid domain, decision and acting authority are required.");
        if (Decisions.Any(value => value.Domain == domain || value.Kind != TrialDecisionKind.Approve))
            throw new InvalidOperationException("Revise the scope before recording a new decision for this domain.");
        if (kind == TrialDecisionKind.Approve && Decisions.Any(value => value.ActorUserId == actorId))
            throw new InvalidOperationException("Two different people must approve each scope version.");
        var value = new TrialDecision(Id, domain, kind, actorId, authorityId, asDelegate, reason, now); Decisions.Add(value); return value;
    }
}
public sealed class TrialDecision
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid TrialScopeId { get; private set; }
    public TrialApprovalDomain Domain { get; private set; }
    public TrialDecisionKind Kind { get; private set; }
    public Guid ActorUserId { get; private set; }
    public Guid AuthorityId { get; private set; }
    public bool AsDelegate { get; private set; }
    public string Reason { get; private set; } = null!;
    public DateTime DecidedAtUtc { get; private set; }
    private TrialDecision() { }
    public TrialDecision(Guid scopeId, TrialApprovalDomain domain, TrialDecisionKind kind, Guid actorId, Guid authorityId, bool asDelegate, string reason, DateTime now)
    { TrialRules.Utc(now); TrialScopeId = scopeId; Domain = domain; Kind = kind; ActorUserId = actorId; AuthorityId = authorityId;
        AsDelegate = asDelegate; Reason = TrialRules.Text(reason); DecidedAtUtc = now; }
}

public static partial class TrialRules
{
    public const string TermsVersion = "trial-ruo-no-phi-v1";
    public const string RuoStatement = "For Research Use Only. Not for use in diagnostic procedures.";
    public static string Text(string? text, int max = 4000) => OrderText.Required(text, nameof(text), max);
    public static void Utc(DateTime value) { if (value == default || value.Kind != DateTimeKind.Utc) throw new ArgumentException("A UTC timestamp is required."); }
    public static string SampleReference(string reference)
    {
        var value = Text(reference, 100);
        if (!SafeReference().IsMatch(value) || ProhibitedIdentifier().IsMatch(value))
            throw new ArgumentException("Use a non-PHI sample code containing letters, digits, dots, underscores or hyphens, without patient identifiers.");
        return value;
    }
    [GeneratedRegex("^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$", RegexOptions.CultureInvariant)] private static partial Regex SafeReference();
    [GeneratedRegex("(?:patient|mrn|dob|ssn|social.security)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)] private static partial Regex ProhibitedIdentifier();
}
