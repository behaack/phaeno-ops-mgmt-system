namespace PSeq.Operations.Commercial.LabOperations.Application;

public static class LabOperationsContractVersions
{
    public const int V1 = 1;
}

public enum LabWorkAuthorizationSource
{
    CommercialOrder,
    TrialProject
}

public sealed record LabOperationsCommandMetadata(
    Guid CommandId,
    Guid CorrelationId,
    DateTime OccurredAtUtc,
    int ContractVersion = LabOperationsContractVersions.V1);

public sealed record AuthorizedSpecimen(
    Guid SubmittedSpecimenId,
    string SubmitterSpecimenReference,
    string DeclaredMaterialType,
    string DeclaredBiologicalSource,
    decimal DeclaredQuantity,
    string DeclaredQuantityUnit,
    string DeclaredStorageRequirements,
    string DeclaredSafetyInformation,
    DateTime? DeclaredCollectionDate,
    decimal? DeclaredConcentration,
    string? SubmissionNote,
    IReadOnlyList<string> RequestedServiceKeys);

public sealed record AuthorizeLabWorkCommand(
    LabOperationsCommandMetadata Metadata,
    Guid AuthorizationId,
    int AuthorizationVersion,
    LabWorkAuthorizationSource SourceType,
    Guid AuthorizationSourceId,
    Guid SubmittingOrganizationId,
    string ServiceKey,
    int ServiceVersion,
    string TurnaroundPolicyKey,
    string? OpaqueSubmitterReference,
    IReadOnlyList<AuthorizedSpecimen> Specimens);

public sealed record AmendLabWorkAuthorizationCommand(
    LabOperationsCommandMetadata Metadata,
    Guid AuthorizationId,
    int ExpectedAuthorizationVersion,
    int NewAuthorizationVersion,
    string CommercialReasonCode,
    AuthorizeLabWorkCommand ReplacementAuthorization);

public sealed record RequestLabWorkCancellationCommand(
    LabOperationsCommandMetadata Metadata,
    Guid AuthorizationId,
    int ExpectedAuthorizationVersion,
    string ReasonCode,
    IReadOnlyList<Guid>? SubmittedSpecimenIds);

public enum LabCommandDisposition
{
    Accepted,
    AlreadyApplied,
    Rejected,
    ManualReviewRequired
}

public sealed record LabCommandAcknowledgment(
    Guid CommandId,
    Guid CorrelationId,
    LabCommandDisposition Disposition,
    Guid? LabWorkOrderId,
    int? AppliedAuthorizationVersion,
    string? ReasonCode,
    DateTime AcknowledgedAtUtc);

public enum LabCancellationDisposition
{
    Accepted,
    PartiallyAccepted,
    Rejected,
    ManualReviewRequired
}

public sealed record LabCancellationOutcome(
    Guid CommandId,
    Guid CorrelationId,
    LabCancellationDisposition Disposition,
    Guid? LabWorkOrderId,
    IReadOnlyList<Guid> AffectedSubmittedSpecimenIds,
    string? ReasonCode,
    DateTime AcknowledgedAtUtc);

public static class LabCommandReasonCodes
{
    public const string AuthorizationInvalid = "authorization_invalid";
    public const string AuthorizationVersionConflict = "authorization_version_conflict";
    public const string UnsupportedService = "unsupported_service";
    public const string WorkAlreadyStarted = "work_already_started";
    public const string ChangeNotSafe = "change_not_safe";
    public const string CancellationNotPossible = "cancellation_not_possible";
    public const string ManualReviewRequired = "manual_review_required";
    public const string ProviderUnavailable = "provider_unavailable";
    public const string CommandIdConflict = "command_id_conflict";
}
