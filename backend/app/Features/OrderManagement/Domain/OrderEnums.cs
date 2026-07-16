namespace PhaenoPortal.App.Features.OrderManagement.Domain;

public enum LabServiceOrderStatus
{
    DraftRequest,
    SubmittedForQuote,
    ChangesRequested,
    QuoteInPreparation,
    QuoteIssued,
    PlacedAwaitingSamples,
    InProgress,
    ResultsAvailable,
    OnHold,
    CancellationRequested,
    Completed,
    Cancelled,
    Declined
}

public enum LabSampleStatus
{
    Expected,
    Received,
    Accessioned,
    LabAnalysis,
    DataProcessing,
    DataAvailable,
    Completed,
    OnHold,
    Rejected
}

public enum AssemblyRequestStatus
{
    Draft,
    Submitted,
    IntakeValidation,
    ChangesRequested,
    QuoteInPreparation,
    QuoteIssued,
    PlacedQueued,
    Processing,
    OutputReview,
    OutputAvailable,
    OnHold,
    CancellationRequested,
    Completed,
    Cancelled,
    Rejected
}

public enum QuoteStatus
{
    Draft,
    SyncPending,
    Issued,
    Superseded,
    Accepted,
    Expired,
    Declined
}

public enum QuotePurpose
{
    Initial,
    Change
}

public enum OperationalFilePurpose
{
    LabResult,
    AssemblyInput,
    AssemblyOutput,
    GeneratedDocument
}

public enum OperationalFileScanStatus
{
    Pending,
    Scanning,
    Clean,
    Rejected,
    Failed,
    Unavailable
}

public enum FileReleaseStatus
{
    Internal,
    Ready,
    PaymentHold,
    Released,
    Withdrawn
}
