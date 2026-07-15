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

public enum ReagentOrderStatus
{
    Draft,
    Placed,
    UnderReview,
    Accepted,
    Processing,
    PartiallyShipped,
    Shipped,
    OnHold,
    CancellationRequested,
    Fulfilled,
    Cancelled,
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

public enum CommercialDocumentKind
{
    Estimate,
    Invoice,
    CreditMemo,
    Payment
}

public enum IntegrationStatus
{
    Pending,
    Processing,
    Succeeded,
    Failed,
    NeedsAttention
}

public enum IntegrationOperation
{
    SyncCatalog,
    UpsertCustomer,
    CreateEstimate,
    UpdateEstimate,
    CreateInvoice,
    CreateCreditMemo,
    RefreshPaymentStatus,
    SendNotification
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

public enum ReagentAdjustmentStatus
{
    Proposed,
    Approved,
    Declined,
    Cancelled
}

public enum CancellationRequestStatus
{
    Pending,
    Approved,
    PartiallyApproved,
    Declined
}

public enum OrderNotificationStatus
{
    Pending,
    Sending,
    Sent,
    Failed
}
