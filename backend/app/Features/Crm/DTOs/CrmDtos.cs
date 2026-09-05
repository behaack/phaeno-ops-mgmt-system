namespace PhaenoPortal.App.Features.Crm.DTOs;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;

public sealed record CrmContactDto(
    Guid Id,
    string FirstName,
    string LastName,
    string DisplayName,
    string? Email,
    string? Phone,
    string? PrimaryCompanyName,
    string? PrimaryCompanyTitle,
    Guid OwnerUserId,
    string OwnerName,
    CrmCommunicationPreference CommunicationPreference,
    string? LawfulContactBasis,
    string? CommunicationNotes,
    IReadOnlyList<string> Tags,
    IReadOnlyList<string> Aliases,
    Guid? MergedIntoContactId,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    long Version);

public sealed record CrmCompanyContactDto(
    Guid Id,
    Guid CompanyId,
    string CompanyName,
    Guid ContactId,
    string ContactName,
    string? JobTitle,
    string? RelationshipRole,
    bool IsPrimaryCompany,
    DateOnly EffectiveFrom,
    DateOnly? EffectiveTo,
    bool IsActive,
    long Version);

public sealed record UpsertCrmContactRequest(
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    Guid? OwnerUserId,
    CrmCommunicationPreference CommunicationPreference,
    string? LawfulContactBasis,
    string? CommunicationNotes,
    IReadOnlyList<string> Tags,
    long? Version);

public sealed record AssociateCrmContactRequest(
    Guid ContactId,
    string? JobTitle,
    string? RelationshipRole,
    bool IsPrimaryCompany,
    DateOnly EffectiveFrom);

public sealed record UpdateCrmCompanyContactRequest(
    string? JobTitle,
    string? RelationshipRole,
    bool IsPrimaryCompany,
    DateOnly EffectiveFrom,
    DateOnly? EffectiveTo,
    long Version);

public sealed record CrmCompanyPersonDto(
    string RecordKind,
    Guid? ContactAssociationId,
    Guid? ContactId,
    long? ContactVersion,
    Guid? PortalUserId,
    Guid? OrganizationMembershipId,
    Guid? InvitationId,
    Guid? ContactUserLinkId,
    long? ContactUserLinkVersion,
    string DisplayName,
    string FirstName,
    string LastName,
    string? Email,
    string? JobTitle,
    string? RelationshipRole,
    bool IsPrimaryCompany,
    bool IsContactActive,
    string PortalAccessState,
    bool IsOrganizationAdmin,
    IReadOnlyList<CrmPersonDepartmentAccessDto> Departments,
    Guid? SuggestedPortalUserId,
    Guid? SuggestedInvitationId,
    bool RequiresIdentityReview);

public sealed record CrmPersonDepartmentAccessDto(
    Guid DepartmentId,
    string DepartmentName,
    bool IsDepartmentAdmin,
    bool IsActive);

public sealed record LinkCrmContactUserRequest(
    Guid UserId,
    string Reason,
    long ContactVersion);

public sealed record UnlinkCrmContactUserRequest(
    string Reason,
    long Version);

public sealed record CrmLeadDto(
    Guid Id,
    CrmLeadKind Kind,
    string DisplayName,
    string? CompanyName,
    string? FirstName,
    string? LastName,
    string? Email,
    string? Phone,
    string? Source,
    CrmLeadStatus Status,
    string? QualificationNotes,
    string? DisqualificationReason,
    string? NextAction,
    Guid OwnerUserId,
    string OwnerName,
    IReadOnlyList<string> Tags,
    DateTime? ConvertedAt,
    Guid? ConvertedCompanyId,
    Guid? ConvertedContactId,
    Guid? ConvertedOpportunityId,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    long Version);

public sealed record UpsertCrmLeadRequest(
    CrmLeadKind Kind,
    string DisplayName,
    string? CompanyName,
    string? FirstName,
    string? LastName,
    string? Email,
    string? Phone,
    string? Source,
    string? NextAction,
    Guid? OwnerUserId,
    IReadOnlyList<string> Tags,
    long? Version);

public sealed record CrmLeadDecisionRequest(string Explanation, long Version);

public sealed record ConvertCrmLeadRequest(
    Guid? ExistingCompanyId,
    bool CreateCompany,
    bool CreateContact,
    bool CreateOpportunity,
    string? OpportunityName,
    Guid? PipelineId,
    long Version);

public sealed record CrmLeadConversionDto(
    CrmLeadDto Lead,
    Guid? CompanyId,
    Guid? ContactId,
    Guid? OpportunityId,
    IReadOnlyList<string> DuplicateWarnings);

public sealed record CrmPipelineStageDto(
    Guid Id,
    Guid PipelineId,
    string Name,
    int Position,
    CrmPipelineStageCategory Category,
    int Probability,
    bool RequiresReason,
    bool IsActive,
    long Version);

public sealed record CrmPipelineDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsDefault,
    bool IsActive,
    IReadOnlyList<CrmPipelineStageDto> Stages,
    long Version);

public sealed record UpsertCrmPipelineRequest(string Name, string? Description, bool IsDefault, long? Version);
public sealed record UpsertCrmPipelineStageRequest(string Name, int Position, CrmPipelineStageCategory Category, int Probability, bool RequiresReason, long? Version);

public sealed record CrmOpportunityDto(
    Guid Id,
    string OpportunityNumber,
    string Name,
    Guid CompanyId,
    string CompanyName,
    Guid PipelineId,
    string PipelineName,
    Guid StageId,
    string StageName,
    CrmPipelineStageCategory StageCategory,
    Guid OwnerUserId,
    string OwnerName,
    string? ProductInterest,
    decimal? Amount,
    string Currency,
    int Probability,
    DateOnly? ExpectedCloseDate,
    string? NextStep,
    string? Competitors,
    string? Description,
    IReadOnlyList<string> Tags,
    DateTime? ClosedAt,
    string? OutcomeReason,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    long Version);

public sealed record UpsertCrmOpportunityRequest(
    string Name,
    Guid CompanyId,
    Guid PipelineId,
    Guid? StageId,
    Guid? OwnerUserId,
    string? ProductInterest,
    decimal? Amount,
    string Currency,
    DateOnly? ExpectedCloseDate,
    string? NextStep,
    string? Competitors,
    string? Description,
    IReadOnlyList<string> Tags,
    long? Version);

public sealed record MoveCrmOpportunityStageRequest(Guid StageId, string? Reason, long Version);
public sealed record CrmOpportunityContactDto(Guid Id, Guid ContactId, string ContactName, string? Role, bool IsPrimary, bool IsActive, long Version);
public sealed record UpsertCrmOpportunityContactRequest(Guid ContactId, string? Role, bool IsPrimary);
public sealed record UpdateCrmOpportunityContactRequest(string? Role, bool IsPrimary, long Version);
public sealed record CrmOpportunityStageHistoryDto(Guid Id, Guid? FromStageId, string? FromStageName, Guid ToStageId, string ToStageName, string? Reason, string ChangedByName, DateTime ChangedAt);

public sealed record CrmActivityDto(
    Guid Id,
    CrmActivityType Type,
    string Subject,
    string? Body,
    DateTime OccurredAt,
    CrmActivityVisibility Visibility,
    Guid ActorUserId,
    string ActorName,
    Guid? CompanyId,
    string? CompanyName,
    Guid? ContactId,
    string? ContactName,
    Guid? LeadId,
    string? LeadName,
    Guid? OpportunityId,
    string? OpportunityName,
    bool IsActive,
    long Version);

public sealed record UpsertCrmActivityRequest(
    CrmActivityType Type,
    string Subject,
    string? Body,
    DateTime OccurredAt,
    CrmActivityVisibility Visibility,
    Guid? CompanyId,
    Guid? ContactId,
    Guid? LeadId,
    Guid? OpportunityId,
    long? Version);

public sealed record CrmTaskDto(
    Guid Id,
    string Title,
    string? Description,
    Guid OwnerUserId,
    string OwnerName,
    CrmTaskPriority Priority,
    CrmTaskStatus Status,
    DateTime? DueAt,
    DateTime? ReminderAt,
    string? RecurrenceRule,
    string? BlockedReason,
    DateTime? CompletedAt,
    Guid? CompanyId,
    string? CompanyName,
    Guid? ContactId,
    string? ContactName,
    Guid? LeadId,
    string? LeadName,
    Guid? OpportunityId,
    string? OpportunityName,
    bool IsActive,
    long Version);

public sealed record UpsertCrmTaskRequest(
    string Title,
    string? Description,
    Guid? OwnerUserId,
    CrmTaskPriority Priority,
    DateTime? DueAt,
    DateTime? ReminderAt,
    string? RecurrenceRule,
    Guid? CompanyId,
    Guid? ContactId,
    Guid? LeadId,
    Guid? OpportunityId,
    long? Version);

public sealed record ChangeCrmTaskStatusRequest(CrmTaskStatus Status, string? Reason, long Version);

public sealed record CrmSearchResultDto(CrmRecordType RecordType, Guid Id, string Title, string? Subtitle, string Status, DateTime UpdatedAt);
public sealed record CrmAttentionDto(int OverdueTasks, int DueSoonTasks, int LeadsNeedingNextAction, int StaleOpportunities, int DataQualityWarnings);
public sealed record CrmDashboardDto(CrmAttentionDto Attention, IReadOnlyList<CrmTaskDto> Tasks, IReadOnlyList<CrmOpportunityDto> RecentlyChangedOpportunities, CrmPipelineReportDto Pipeline);
public sealed record CrmPipelineStageReportDto(Guid StageId, string StageName, CrmPipelineStageCategory Category, int OpportunityCount, decimal Amount, decimal WeightedAmount, double AverageAgeDays);
public sealed record CrmPipelineReportDto(int OpenOpportunities, int WonOpportunities, int LostOpportunities, decimal OpenAmount, decimal WeightedForecast, double WinRate, IReadOnlyList<CrmPipelineStageReportDto> Stages);
public sealed record CrmOwnerWorkloadDto(Guid OwnerUserId, string OwnerName, int OpenTasks, int OverdueTasks, int OpenLeads, int OpenOpportunities, decimal WeightedForecast);
public sealed record CrmSourcePerformanceDto(string Source, int Leads, int Qualified, int Converted, double ConversionRate);
public sealed record CrmReportsDto(CrmPipelineReportDto Pipeline, IReadOnlyList<CrmOwnerWorkloadDto> OwnerWorkload, IReadOnlyList<CrmSourcePerformanceDto> SourcePerformance, int ActivitiesLast30Days);

public sealed record CrmSavedViewDto(Guid Id, string Name, CrmRecordType RecordType, string FilterJson, bool IsShared, Guid OwnerUserId, bool IsActive, long Version);
public sealed record UpsertCrmSavedViewRequest(string Name, CrmRecordType RecordType, string FilterJson, bool IsShared, long? Version);
public sealed record CrmCustomFieldDefinitionDto(Guid Id, string Name, CrmRecordType RecordType, CrmCustomFieldDataType DataType, CrmFieldSensitivity Sensitivity, string? OptionsJson, bool IsRequired, bool IsActive, long Version);
public sealed record UpsertCrmCustomFieldDefinitionRequest(string Name, CrmRecordType RecordType, CrmCustomFieldDataType DataType, CrmFieldSensitivity Sensitivity, string? OptionsJson, bool IsRequired, long? Version);
public sealed record CrmCustomFieldValueDto(Guid DefinitionId, Guid RecordId, string ValueJson, long Version);
public sealed record UpsertCrmCustomFieldValueRequest(Guid DefinitionId, Guid RecordId, string ValueJson, long? Version);

public sealed record CrmImportRowDto(IReadOnlyDictionary<string, string?> Values);
public sealed record PreviewCrmImportRequest(CrmRecordType RecordType, string IdempotencyKey, string FileName, IReadOnlyList<CrmImportRowDto> Rows);
public sealed record CrmImportPreviewDto(Guid BatchId, CrmRecordType RecordType, CrmImportStatus Status, int TotalRows, int ValidRows, int DuplicateRows, int InvalidRows, IReadOnlyList<string> Errors, long Version);
public sealed record CommitCrmImportRequest(long Version);
public sealed record CreateCrmExportRequest(CrmRecordType RecordType, string FilterJson);
public sealed record CrmDuplicateGroupDto(CrmRecordType RecordType, string MatchReason, string MatchValue, IReadOnlyList<Guid> RecordIds, IReadOnlyList<string> RecordNames);

public sealed record CreateCrmHandoffRequest(
    CrmHandoffType Type,
    Guid? OpportunityId,
    string IdempotencyKey,
    OrganizationKind? RequestedOrganizationKind,
    IReadOnlyList<PortalService> RequestedServices,
    string Summary,
    string? InternalNotes);

public sealed record CrmHandoffDto(
    Guid Id,
    Guid CompanyId,
    Guid? OpportunityId,
    CrmHandoffType Type,
    Guid RelationshipRequestId,
    string RequestNumber,
    PortalIntegrationRequestStatus Status,
    OrganizationKind? RequestedOrganizationKind,
    Guid? OrganizationId,
    string IdempotencyKey,
    DateTime CreatedAt,
    long RequestVersion,
    Guid? OrderId = null,
    string? OrderNumber = null,
    string? OrderStatus = null,
    bool CanStartCustomerOrder = false,
    string? OrderBlockingReason = null, Guid? TrialProjectId = null);
public sealed record CrmOrderHandoffDto(
    CrmHandoffDto Handoff,
    string CompanyName,
    string? OpportunityName,
    string? OrganizationName,
    string Summary);
