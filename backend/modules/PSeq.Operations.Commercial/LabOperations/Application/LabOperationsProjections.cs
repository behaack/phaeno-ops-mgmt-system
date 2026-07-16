namespace PSeq.Operations.Commercial.LabOperations.Application;

public enum LabWorkMilestone
{
    AwaitingSpecimens,
    Received,
    OnHold,
    Processing,
    AwaitingExternalSequencing,
    DataProcessing,
    ScientificReview,
    ReadyForRelease,
    Cancelled
}

public enum LabScheduleHealth
{
    OnTrack,
    AtRisk,
    Delayed,
    Complete
}

public sealed record LabWorkProjection(
    Guid AuthorizationId,
    Guid LabWorkOrderId,
    int AuthorizationVersion,
    LabWorkMilestone Milestone,
    LabScheduleHealth ScheduleHealth,
    DateTime? CurrentExpectedCompletionAtUtc,
    int ActiveCustomerActionCount,
    DateTime LastChangedAtUtc,
    long ProjectionVersion);

public enum LabExceptionAudience
{
    Internal,
    CustomerActionRequired
}

public enum LabExceptionSeverity
{
    Advisory,
    Blocking
}

public sealed record LabExceptionProjection(
    Guid LabExceptionId,
    Guid AuthorizationId,
    Guid? SubmittedSpecimenId,
    LabExceptionAudience Audience,
    LabExceptionSeverity Severity,
    string ActionCode,
    DateTime RaisedAtUtc,
    DateTime? ResponseDueAtUtc,
    bool IsResolved,
    long ProjectionVersion);
