namespace PSeq.Operations.Commercial.OrderManagement.Domain;

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

public enum OrderNotificationStatus
{
    Pending,
    Sending,
    Sent,
    Failed
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
