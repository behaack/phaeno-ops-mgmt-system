namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class LabServiceQuoteExtensionRequest : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabServiceOrderId { get; private set; }
    public Guid QuoteId { get; private set; }
    public Guid RequestedByUserId { get; private set; }
    public string? Reason { get; private set; }
    public DateTime RequestedAt { get; private set; }
    public Guid? ReplacementQuoteId { get; private set; }
    public DateTime? ResolvedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private LabServiceQuoteExtensionRequest() { }

    public LabServiceQuoteExtensionRequest(Guid orderId, Guid quoteId, Guid requestedByUserId, string? reason, DateTime utcNow)
    {
        if (orderId == Guid.Empty || quoteId == Guid.Empty || requestedByUserId == Guid.Empty)
            throw new ArgumentException("A quote, order, and requesting user are required.");
        if (utcNow.Kind != DateTimeKind.Utc) throw new ArgumentException("Request time must be UTC.");
        LabServiceOrderId = orderId;
        QuoteId = quoteId;
        RequestedByUserId = requestedByUserId;
        Reason = OrderText.Optional(reason, 2000);
        RequestedAt = utcNow;
    }

    public void Resolve(Guid replacementQuoteId, DateTime utcNow)
    {
        if (replacementQuoteId == Guid.Empty || replacementQuoteId == QuoteId)
            throw new ArgumentException("A new quote revision is required.");
        if (ReplacementQuoteId.HasValue)
        {
            if (ReplacementQuoteId != replacementQuoteId) throw new InvalidOperationException("This request has already been resolved.");
            return;
        }
        if (utcNow.Kind != DateTimeKind.Utc || utcNow < RequestedAt) throw new ArgumentException("Resolution time must follow the request.");
        ReplacementQuoteId = replacementQuoteId;
        ResolvedAt = utcNow;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
