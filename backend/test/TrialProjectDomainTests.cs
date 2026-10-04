namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.Trials.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.FileManagement.Domain;

public sealed class TrialProjectDomainTests
{
    [Fact] public void SourceCompositionRequiresDistinctPositiveCountsAndMatchingTotal()
    {
        var values = Scope();
        Assert.Throws<ArgumentException>(() => (values with { Sources = [] }).Validate());
        Assert.Throws<ArgumentException>(() => (values with { Sources = [new("Synthetic RNA", 0)] }).Validate());
        Assert.Throws<ArgumentException>(() => (values with { Sources = [new("Synthetic RNA", null)] }).Validate());
        Assert.Throws<ArgumentException>(() => (values with { Sources = [new("Synthetic RNA", 1), new(" synthetic   rna ", 1)] }).Validate());
        Assert.Throws<ArgumentException>(() => (values with { Sources = [new("Synthetic RNA", 1)] }).Validate());
        (values with { Sources = [new("Synthetic RNA", 1), new("Second source", 1)] }).Validate();
        new TrialScopeDraftValues(Sources: [new("", null)]).Validate();
    }

    [Fact] public void AmendmentsAndReplacementsPreserveSubmittedSourceLineage()
    {
        var trial = Accepted(); var original = Sample(trial, "RNA-1"); trial.AddSamples([original], Now);
        var values = trial.CurrentScope().Read(); var frozen = trial.CurrentScope().ValuesJson;
        Assert.Throws<InvalidOperationException>(() => trial.Propose(values with { Sources = [new("Different tissue", 2)] }, "Change sources", Guid.NewGuid(), Now));
        trial.AddSamples([Sample(trial, "RNA-2")], Now);
        Assert.Throws<InvalidOperationException>(() => trial.Propose(values with { Sources = [new("Synthetic research RNA", 1), new("Different tissue", 1)] }, "Reallocate quantities", Guid.NewGuid(), Now));
        Assert.Equal(frozen, trial.CurrentScope().ValuesJson); Assert.Equal(1, trial.CurrentScopeRevision);
        trial.Propose(values with { SampleAllowance = 3, Sources = [new("Synthetic research RNA", 2), new("Different tissue", 1)] }, "Add one source", Guid.NewGuid(), Now);
        Approve(trial); trial.Accept(2, TrialRules.TermsVersion, true, Guid.NewGuid(), Now);
        original.RecordFailure("Failed material"); var authority = new TrialReplacementAuthorization(trial.Id, original.Id, true, "Replacement", Guid.NewGuid(), Now);
        var wrongSource = new TrialSample(trial.Id, trial.CurrentScopeRevision, "RNA-1-R1", "Different tissue", 1, 100, "ng", 10, "Frozen", "Research material", "{}", original.Id, authority.Id, Guid.NewGuid(), Now);
        Assert.Throws<ArgumentException>(() => trial.AddSamples([wrongSource], Now));
        var replacement = Sample(trial, "RNA-1-R1", original, authority); authority.Consume(replacement); trial.AddSamples([replacement], Now);
        Assert.Equal(3, trial.Samples.Count); Assert.Equal(2, trial.Samples.Count(sample => !sample.ReplacesSampleId.HasValue));
    }

    [Fact] public void IncompleteDraftDoesNotCreateScopeOrAuthorizeWorkAndSubmissionClearsIt()
    {
        var trial = Project(); var actor = Guid.NewGuid();
        trial.SaveScopeDraft(new(Name: "Research idea", MaterialDisposition: TrialMaterialDisposition.Return), actor, Now);
        Assert.Equal("Research idea", trial.ReadScopeDraft()!.Name);
        Assert.Equal(actor, trial.DraftSavedByUserId); Assert.Equal(Now, trial.DraftSavedAtUtc);
        Assert.Equal(TrialStatus.Requested, trial.Status); Assert.Equal(0, trial.CurrentScopeRevision);
        Assert.Empty(trial.Scopes); Assert.Null(trial.ApprovedScopeRevision); Assert.Null(trial.AcceptedScopeRevision);
        Assert.NotNull(trial.SubmissionBlocker(Now));
        Assert.Throws<ArgumentException>(() => trial.Propose(Scope() with { Objective = "" }, "Ready", actor, Now));
        Assert.NotNull(trial.ReadScopeDraft());
        trial.Propose(Scope(), "Ready for review", actor, Now);
        Assert.Null(trial.ReadScopeDraft()); Assert.Null(trial.DraftSavedByUserId); Assert.Null(trial.DraftSavedAtUtc);
        Assert.Equal(TrialStatus.UnderReview, trial.Status); Assert.Equal(1, trial.CurrentScopeRevision);
    }
    [Fact] public void SharedDraftPreservesAcceptedScopeAndHoldUntilAnAmendmentIsSubmitted()
    {
        var trial = Accepted(); var frozen = trial.CurrentScope().ValuesJson;
        trial.SaveScopeDraft(new(Name: "Possible amendment"), Guid.NewGuid(), Now);
        Assert.Equal(TrialStatus.AwaitingSamples, trial.Status); Assert.Equal(1, trial.CurrentScopeRevision);
        Assert.Equal(1, trial.ApprovedScopeRevision); Assert.Equal(1, trial.AcceptedScopeRevision);
        Assert.Equal(frozen, trial.CurrentScope().ValuesJson); Assert.Null(trial.SubmissionBlocker(Now));
        trial.SetHold(true, "Review logistics");
        trial.SaveScopeDraft(new(Objective: "Preparing a correction during hold"), Guid.NewGuid(), Now);
        Assert.True(trial.IsOnHold); Assert.Contains("hold", trial.SubmissionBlocker(Now));
    }
    [Fact] public void DraftRejectsInvalidEnteredValuesAndCannotChangeAClosedTrial()
    {
        var trial = Project(); var actor = Guid.NewGuid();
        Assert.Throws<ArgumentException>(() => trial.SaveScopeDraft(new(Name: new string('x', 256)), actor, Now));
        Assert.Throws<ArgumentException>(() => trial.SaveScopeDraft(new(SampleAllowance: 0), actor, Now));
        var id = Guid.NewGuid();
        Assert.Throws<ArgumentException>(() => trial.SaveScopeDraft(new(AnalysisIds: [id, id]), actor, Now));
        trial.SaveScopeDraft(new(Objective: "Retained draft"), actor, Now);
        trial.Close(TrialStatus.Cancelled, "Not proceeding", Now);
        Assert.Throws<InvalidOperationException>(() => trial.SaveScopeDraft(new(Objective: "Changed"), actor, Now));
        Assert.Equal("Retained draft", trial.ReadScopeDraft()!.Objective);
    }
    internal static readonly DateTime Now = new(2026, 9, 5, 12, 0, 0, DateTimeKind.Utc);
    internal static TrialScopeValues Scope(int allowance = 2) => new("PSeq evaluation", "Evaluate research RNA", allowance, Now.AddDays(-1), Now.AddDays(10), Guid.NewGuid(),
        [new(Guid.NewGuid(), 2, "Existing PSeq analysis", "RNA instructions", "[\"biologicalSource\"]", "{}")],
        [new(Guid.NewGuid(), 1, "FASTQ", "FASTQ reads")], "Use coded research samples", "Existing PSeq acceptance criteria", 2500, 600, 30, TrialMaterialDisposition.Destroy, null, null, null, "RUO; no PHI", new(Guid.NewGuid(), 1, "Extracted RNA", "ng", 1, 1000), [new("Synthetic research RNA", allowance)]);
    internal static TrialProject Project() { var trial = new TrialProject("TR-TEST", null, Guid.NewGuid(), null, Guid.NewGuid()); trial.BindOrganization(Guid.NewGuid(), Guid.NewGuid()); return trial; }
    internal static void Approve(TrialProject trial)
    {
        trial.Decide(TrialApprovalDomain.Commercial, TrialDecisionKind.Approve, Guid.NewGuid(), Guid.NewGuid(), false, "Commercial approval", Now);
    }
    internal static TrialSample Sample(TrialProject trial, string name, TrialSample? original = null, TrialReplacementAuthorization? authority = null) =>
        new(trial.Id, trial.CurrentScopeRevision, name, "Synthetic research RNA", 2, 100, "ng", 10, "Frozen", "Nonhazardous; no PHI", "{}", original?.Id, authority?.Id, Guid.NewGuid(), Now);
    internal static TrialProject Accepted(int allowance = 2)
    { var trial = Project(); trial.Propose(Scope(allowance), "Initial scope", Guid.NewGuid(), Now); Approve(trial); trial.Accept(1, TrialRules.TermsVersion, true, Guid.NewGuid(), Now); return trial; }

    [Fact] public void OneCommercialLeadershipDecisionApprovesScopeAndScientificDecisionIsRejected()
    {
        var trial = Project(); trial.Propose(Scope(), "Initial", Guid.NewGuid(), Now); var actor = Guid.NewGuid();
        Assert.Throws<ArgumentException>(() => trial.Decide(TrialApprovalDomain.ScientificOperations, TrialDecisionKind.Approve, actor, null, false, "Invalid approval domain", Now));
        Assert.Equal(TrialStatus.UnderReview, trial.Status);
        trial.Decide(TrialApprovalDomain.Commercial, TrialDecisionKind.Approve, actor, null, false, "Leadership approved", Now);
        Assert.Equal(TrialStatus.AwaitingAcceptance, trial.Status); Assert.Equal(1, trial.ApprovedScopeRevision);
        Assert.Single(trial.CurrentScope().Decisions); Assert.Null(trial.CurrentScope().Decisions.Single().AuthorityId);
        Assert.Throws<InvalidOperationException>(() => trial.Accept(1, TrialRules.TermsVersion, false, actor, Now));
    }
    [Fact] public void AmendmentPreservesApprovalHistoryAndRequiresNewAcceptance()
    {
        var trial = Accepted(); var frozen = trial.CurrentScope().ValuesJson;
        trial.Propose(Scope(3), "Expanded evaluation", Guid.NewGuid(), Now);
        Assert.Equal(frozen, trial.Scopes.First().ValuesJson); Assert.Contains("Commercial approval", trial.SubmissionBlocker(Now));
        Approve(trial); Assert.Null(trial.AcceptedScopeRevision);
        Assert.Throws<InvalidOperationException>(() => trial.Accept(1, TrialRules.TermsVersion, true, Guid.NewGuid(), Now));
        trial.Accept(2, TrialRules.TermsVersion, true, Guid.NewGuid(), Now); Assert.Null(trial.SubmissionBlocker(Now));
        Assert.Equal(2, trial.Scopes.Sum(value => value.Decisions.Count));
    }
    [Fact] public void AllowanceWindowAndHoldAreEnforced()
    {
        var trial = Accepted(1); trial.AddSamples([Sample(trial, "RNA-1")], Now);
        Assert.Throws<InvalidOperationException>(() => trial.AddSamples([Sample(trial, "RNA-2")], Now));
        Assert.Contains("closed", trial.SubmissionBlocker(Now.AddDays(10)));
        trial.SetHold(true, "Shipping clarification"); Assert.Contains("hold", trial.SubmissionBlocker(Now));
        trial.SetHold(false, "Resolved"); Assert.Null(trial.SubmissionBlocker(Now));
    }
    [Fact] public void ReplacementConsumesOneAuthorizationWithoutChangingOriginalAllowance()
    {
        var trial = Accepted(1); var original = Sample(trial, "RNA-1"); trial.AddSamples([original], Now); original.RecordFailure("Phaeno handling failure");
        var authority = new TrialReplacementAuthorization(trial.Id, original.Id, true, "Replace failed material", Guid.NewGuid(), Now);
        var replacement = Sample(trial, "RNA-1-R1", original, authority); authority.Consume(replacement); trial.AddSamples([replacement], Now);
        Assert.Equal(1, trial.CurrentScope().Read().SampleAllowance); Assert.Equal(2, trial.Samples.Count);
        Assert.Throws<InvalidOperationException>(() => authority.Consume(Sample(trial, "RNA-1-R2", original, authority)));
        Assert.Throws<InvalidOperationException>(() => trial.Complete(Guid.NewGuid(), Now));
        replacement.Authorize(Guid.NewGuid(), Guid.NewGuid()); replacement.RecordReleased(); trial.Complete(Guid.NewGuid(), Now); Assert.Equal(TrialStatus.Completed, trial.Status);
    }
    [Fact] public void ReturnTermsFreezeAtFirstSubmissionAndDispositionHonorsDueDate()
    {
        var trial = Accepted(); trial.AddSamples([Sample(trial, "RNA-1")], Now);
        Assert.Throws<InvalidOperationException>(() => trial.Propose(trial.CurrentScope().Read() with { MaterialDisposition = TrialMaterialDisposition.Return, ReturnDestination = "Research lab", ReturnHandling = "Frozen", ReturnShippingPayer = "Prospect" }, "Return request", Guid.NewGuid(), Now));
        trial.Close(TrialStatus.ClosedIncomplete, "Insufficient material", Now);
        Assert.Equal(Now.AddDays(30), trial.ResidualRetainUntilUtc);
        Assert.Throws<InvalidOperationException>(() => trial.RecordMaterialDisposition("Destroyed", Guid.NewGuid(), Now.AddDays(29)));
        trial.RecordMaterialDisposition("Destroyed", Guid.NewGuid(), Now.AddDays(30));
        Assert.Throws<InvalidOperationException>(() => trial.RecordMaterialDisposition("Destroyed", Guid.NewGuid(), Now.AddDays(31)));
    }
    [Fact] public void ScientificCompletionDoesNotSetCommercialConversionOrExtendClosureOnReissue()
    {
        var trial = Accepted(); var sample = Sample(trial, "RNA-1"); trial.AddSamples([sample], Now); sample.Authorize(Guid.NewGuid(), Guid.NewGuid()); sample.RecordReleased(); trial.Complete(Guid.NewGuid(), Now);
        Assert.Null(trial.CommercialOutcome); trial.RecordReissue(Guid.NewGuid()); Assert.Equal(Now, trial.ClosedAtUtc);
        Assert.Throws<ArgumentException>(() => trial.RecordCommercialOutcome(TrialCommercialOutcome.FollowUpScheduled, "Follow up", null, Now));
        trial.RecordCommercialOutcome(TrialCommercialOutcome.FollowUpScheduled, "Follow up", Guid.NewGuid(), Now.AddDays(7));
        trial.RecordCommercialOutcome(TrialCommercialOutcome.ConvertedToCustomer, "Relationship conversion recorded", null, null);
        Assert.Equal(Now.AddDays(30), trial.ResidualRetainUntilUtc);
    }
    [Theory] [InlineData("MRN-123")] [InlineData("patient-123")] [InlineData("DOB-2000")] [InlineData("unsafe sample")]
    public void CodedReferencesRejectDirectIdentifierLabels(string value) => Assert.Throws<ArgumentException>(() => TrialRules.SampleReference(value));
    [Fact] public void ResultPackagesHaveExactlyOneAuthorizedParent()
    {
        var trialId = Guid.NewGuid(); var sampleId = Guid.NewGuid();
        var trialPackage = new ResultOutputPackage(Guid.NewGuid(), null, Guid.NewGuid(), null, 1, null, "fixture", "submission", "key", "{}", new string('A', 64), 1, trialId, sampleId);
        Assert.Equal(trialId, trialPackage.TrialProjectId); Assert.Null(trialPackage.LabServiceOrderId);
        Assert.Throws<ArgumentException>(() => new ResultOutputPackage(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, null, "fixture", "submission", "key", "{}", new string('A', 64), 1, trialId, sampleId));
    }
}
