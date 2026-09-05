namespace PhaenoPortal.App.Features.Trials.DTOs;

using PSeq.Operations.Commercial.Trials.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed record TrialCreateRequest(Guid CrmHandoffId);
public sealed record TrialScopeRequest(long Version, Guid DepartmentId, string Name, string Objective, int SampleAllowance,
    DateTime SubmissionOpensAtUtc, DateTime SubmissionClosesAtUtc, Guid WorkflowVersionId,
    IReadOnlyList<Guid> AnalysisIds, IReadOnlyList<Guid> DeliverableIds, string SubmissionInstructions,
    string SuccessCriteria, decimal EstimatedRetailValue, decimal AnticipatedInternalCost, int ResidualRetentionDays,
    TrialMaterialDisposition MaterialDisposition, string? ReturnDestination, string? ReturnHandling, string? ReturnShippingPayer, string Terms, string Reason);
public sealed record TrialDecisionRequest(long Version, TrialApprovalDomain Domain, TrialDecisionKind Decision, string Reason);
public sealed record TrialAcceptRequest(long Version, int ScopeRevision, string TermsVersion, bool RuoNoPhiConfirmed);
public sealed record TrialSampleInput(string Reference, string BiologicalSource, int TubeCount, decimal Quantity,
    string QuantityUnit, decimal? Concentration, string StorageRequirements, string SafetyDeclaration,
    Dictionary<string, string> Inputs, Guid? ReplacesSampleId, Guid? ReplacementAuthorizationId);
public sealed record TrialSubmitRequest(long Version, Guid DestinationId, Guid SampleTypeId, bool RuoNoPhiConfirmed, IReadOnlyList<TrialSampleInput> Samples);
public sealed record TrialActionRequest(long Version, string Reason, TrialStatus? ClosureStatus = null,
    bool? Hold = null, string? ScheduleEstimate = null, Guid? SampleId = null, bool PhaenoCausedFailure = false,
    string? MaterialDisposition = null, TrialCommercialOutcome? CommercialOutcome = null, Guid? FollowUpOwnerUserId = null, DateTime? FollowUpAtUtc = null);
public sealed record TrialReleaseRequest(long Version, IReadOnlyList<Guid> OutputPackageIds, bool CompletePackage, string Reason, Guid? SupersedesReleaseId = null);
public sealed record TrialAuthorityRequest(Guid UserId, TrialApprovalDomain Domain, bool IsPrimary, string Reason);
public sealed record TrialRevokeAuthorityRequest(long Version, string Reason);
public sealed record TrialDeliverableRequest(string Key, string Name, bool IsDefault, string Reason);
public sealed record TrialDecisionDto(string Domain, string Decision, string? Reason, Guid? ActorUserId, bool? AsDelegate, DateTime AtUtc);
public sealed record TrialScopeDto(int Revision, TrialScopeValues? InternalValues, string Name, string Objective, int SampleAllowance,
    DateTime SubmissionOpensAtUtc, DateTime SubmissionClosesAtUtc, string SubmissionInstructions, string SuccessCriteria,
    string Terms, string TermsVersion, string RuoStatement, int ResidualRetentionDays, string MaterialDisposition,
    string? ReturnDestination, string? ReturnHandling, string? ReturnShippingPayer,
    IReadOnlyList<TrialAnalysisSnapshot> Analyses, IReadOnlyList<TrialDeliverableSnapshot> Deliverables, IReadOnlyList<TrialDecisionDto> Decisions);
public sealed record TrialSampleDto(Guid Id, string Reference, string BiologicalSource, int TubeCount, string Status,
    string? LabMilestone, string? CustomerSafeSummary, Guid? LabWorkOrderId, Guid? ReplacesSampleId, string? OutcomeReason, DateTime SubmittedAtUtc);
public sealed record TrialReplacementDto(Guid Id, Guid OriginalSampleId, bool PhaenoCausedFailure, string Reason, Guid? UsedBySampleId);
public sealed record TrialTimelineDto(string Kind, string Summary, DateTime AtUtc);
public sealed record TrialListDto(Guid Id, string Number, string Name, string CompanyName, string Status,
    bool IsOnHold, int SampleCount, int? SampleAllowance, DateTime? SubmissionClosesAtUtc, DateTime UpdatedAtUtc, long Version, Guid? SalesOwnerUserId = null, string? SalesOwnerName = null, DateTime? RequestedAtUtc = null, DateTime? DueAtUtc = null);
public sealed record TrialReleaseDto(Guid Id, int ReleaseVersion, int ScopeRevision, bool IsCompletePackage,
    bool IsWithdrawn, DateTime ReleasedAtUtc, Guid? RetentionSnapshotId, IReadOnlyList<TrialFileDto> Files,
    bool IsDownloadAvailable = false, string? DownloadUnavailableReason = null, ReleasedDeliverableRetentionDto? Retention = null);
public sealed record TrialFileDto(Guid Id, string FileName, string FileKind, long SizeBytes, string Sha256);
public sealed record TrialDetailDto(Guid Id, string Number, string CompanyName, Guid CompanyId, Guid OpportunityId,
    Guid? OrganizationId, Guid? DepartmentId, string Status, long Version, bool IsStaff, bool CanManage,
    bool CanAccept, bool CanSubmit, string? SubmissionBlocker, IReadOnlyList<string> ApprovalDomains,
    int OriginalSamplesRemaining, bool IsOnHold, string? HoldReason, string? ScheduleEstimate, string? ClosureReason,
    DateTime? ClosedAtUtc, DateTime? ResidualRetainUntilUtc, string? ActualMaterialDisposition,
    string? CommercialOutcome, string? CommercialOutcomeReason, Guid? FollowUpOwnerUserId, DateTime? FollowUpAtUtc,
    int? ApprovedScopeRevision, int? AcceptedScopeRevision, TrialScopeDto? Scope, IReadOnlyList<TrialScopeDto> ScopeHistory,
    IReadOnlyList<TrialSampleDto> Samples, IReadOnlyList<TrialReplacementDto> Replacements,
    IReadOnlyList<TrialReleaseDto> Releases, IReadOnlyList<TrialTimelineDto> Timeline, int CrmPendingMilestones = 0, bool CanRecordCommercialOutcome = false, bool CanDeactivateProspect = false, bool CanReleaseResults = false);
public sealed record TrialChoiceDto(Guid Id, string Name, long Version = 1);
public sealed record TrialSampleTypeDto(Guid Id, string Name, long Version, string QuantityUnit, decimal? MinimumQuantity, decimal? MaximumQuantity);
public sealed record TrialHandoffPageDto(IReadOnlyList<TrialHandoffChoiceDto> Items, int Total, int Page, int PageSize);
public sealed record TrialHandoffChoiceDto(Guid Id, string CompanyName, string OpportunityName, string Summary);
public sealed record TrialAuthorityDto(Guid Id, Guid UserId, string UserName, string Domain, bool IsPrimary, Guid? PrimaryAuthorityId, DateTime? RevokedAtUtc, long Version, Guid DesignatedByUserId, DateTime EffectiveAtUtc, string Reason, string? RevocationReason);
public sealed record TrialConfigurationDto(bool CanManageConfiguration, bool CanAssignPrimary, IReadOnlyList<string> PrimaryDomains,
    IReadOnlyList<TrialHandoffChoiceDto> Handoffs, IReadOnlyList<TrialChoiceDto> Analyses, IReadOnlyList<TrialChoiceDto> Workflows,
    IReadOnlyList<TrialDeliverableSnapshot> Deliverables, IReadOnlyList<Guid> DefaultDeliverableIds, IReadOnlyList<TrialChoiceDto> Departments,
    IReadOnlyList<TrialChoiceDto> Destinations, IReadOnlyList<TrialSampleTypeDto> SampleTypes,
    IReadOnlyList<TrialChoiceDto> Staff, IReadOnlyList<TrialAuthorityDto> Authorities);
