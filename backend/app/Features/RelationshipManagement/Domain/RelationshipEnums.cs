namespace PhaenoPortal.App.Features.RelationshipManagement.Domain;

public enum PortalService
{
    PSeqLabService = 1,
    PSeqKit = 2
}

public enum EntitlementConfigurationStatus
{
    Pending = 1,
    Ready = 2,
    Blocked = 3
}

public enum PortalIntegrationRequestType
{
    Onboarding = 1,
    Evaluation = 2,
    ServiceChange = 3,
    RelationshipChange = 4,
    SalesAssistedOrder = 5,
    Offboarding = 6
}

public enum PortalIntegrationRequestSource
{
    Manual = 1,
    HubSpot = 2
}

public enum PortalIntegrationRequestStatus
{
    PendingReview = 1,
    Approved = 2,
    Declined = 3,
    Applied = 4,
    Cancelled = 5
}
