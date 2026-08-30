namespace PSeq.Operations.Commercial.OrderManagement.Domain;

public static class OrderServiceKeys
{
    public const string PSeqLabService = "pseq-lab-service";

    public static bool IsPSeqLabService(string? value)
        => string.Equals(value?.Trim(), PSeqLabService, StringComparison.OrdinalIgnoreCase);
}

public static class OrderSalesUnits
{
    public const string Specimen = "specimen";

    public static bool IsSpecimen(string? value)
        => string.Equals(value?.Trim(), Specimen, StringComparison.OrdinalIgnoreCase);
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
