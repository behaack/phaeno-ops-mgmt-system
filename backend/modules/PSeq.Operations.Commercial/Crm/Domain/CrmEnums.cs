namespace PSeq.Operations.Commercial.Crm.Domain;

public enum CrmCompanyLifecycleState
{
    Target,
    Engaged,
    ActiveCustomer,
    Partner,
    FormerRelationship,
    Other
}

public enum CrmCommunicationPreference
{
    Unknown,
    Permitted,
    OptedOut,
    DoNotContact
}

public enum CrmLeadKind
{
    Individual,
    Company
}

public enum CrmLeadStatus
{
    New,
    Working,
    Qualified,
    Disqualified,
    Converted
}

public enum CrmPipelineStageCategory
{
    Open,
    Won,
    Lost,
    Abandoned
}

public enum CrmActivityType
{
    Note,
    Call,
    Meeting,
    Email,
    StatusChange,
    TaskEvent,
    PortalEvent,
    System
}

public enum CrmActivityVisibility
{
    Internal,
    Restricted
}

public enum CrmTaskPriority
{
    Low,
    Normal,
    High,
    Urgent
}

public enum CrmTaskStatus
{
    Open,
    InProgress,
    Blocked,
    Completed,
    Cancelled
}

public enum CrmRecordType
{
    Company,
    Contact,
    Lead,
    Opportunity,
    Task
}

public enum CrmCustomFieldDataType
{
    Text,
    Number,
    Date,
    Boolean,
    Option
}

public enum CrmFieldSensitivity
{
    Internal,
    Restricted
}

public enum CrmHandoffType
{
    PortalOnboarding,
    PortalEvaluation,
    TrialProject,
    CustomWork,
    ServiceChange,
    RelationshipChange,
    Offboarding
}

public enum CrmImportStatus
{
    Previewed,
    Committed,
    Failed
}
