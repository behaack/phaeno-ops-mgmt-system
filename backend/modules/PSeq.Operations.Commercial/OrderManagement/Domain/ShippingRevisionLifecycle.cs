namespace PSeq.Operations.Commercial.OrderManagement.Domain;

/// <summary>The editorial state of one exact shipping content revision.</summary>
public enum ShippingRevisionLifecycle
{
    Draft,
    Released,
    Superseded,
    Deactivated,
    Discarded
}
