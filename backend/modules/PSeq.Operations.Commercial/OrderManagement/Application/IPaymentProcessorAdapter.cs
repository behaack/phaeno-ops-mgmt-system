namespace PSeq.Operations.Commercial.OrderManagement.Application;

public sealed record PaymentProcessorReference(
    string ProviderKey,
    string ExternalId,
    string MetadataJson);

/// <summary>
/// Reserved provider-neutral seam. No online processor is registered in v1.
/// </summary>
public interface IPaymentProcessorAdapter
{
    Task<PaymentProcessorReference?> ReconcileAsync(
        string localEntityType,
        Guid localEntityId,
        CancellationToken cancellationToken);
}
