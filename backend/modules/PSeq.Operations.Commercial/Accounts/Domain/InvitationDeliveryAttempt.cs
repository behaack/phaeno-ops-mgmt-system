namespace PSeq.Operations.Commercial.Accounts.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public enum InvitationDeliveryState
{
    Queued,
    Sending,
    Accepted,
    Delivered,
    Bounced,
    Failed,
    NeedsAttention
}

/// <summary>
/// Durable delivery ledger for one invitation email. Access lifecycle remains
/// owned by <see cref="OrganizationInvitation"/> and is intentionally separate.
/// </summary>
public sealed class InvitationDeliveryAttempt : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationInvitationId { get; private set; }
    public InvitationDeliveryState State { get; private set; } = InvitationDeliveryState.Queued;
    public string ProtectedPayload { get; private set; } = null!;
    public int AttemptCount { get; private set; }
    public DateTime QueuedAtUtc { get; private set; }
    public DateTime? LastAttemptAtUtc { get; private set; }
    public DateTime? NextAttemptAtUtc { get; private set; }
    public DateTime? ProviderAcceptedAtUtc { get; private set; }
    public DateTime? DeliveredAtUtc { get; private set; }
    public DateTime? BouncedAtUtc { get; private set; }
    public bool IsHardBounce { get; private set; }
    public string? ProviderMessageId { get; private set; }
    public string? LastError { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private InvitationDeliveryAttempt() { }

    public InvitationDeliveryAttempt(
        Guid organizationInvitationId,
        string protectedPayload,
        DateTime queuedAtUtc)
    {
        OrganizationInvitationId = organizationInvitationId != Guid.Empty
            ? organizationInvitationId
            : throw new ArgumentException("An invitation is required.", nameof(organizationInvitationId));
        ProtectedPayload = Required(protectedPayload, nameof(protectedPayload), 16000);
        QueuedAtUtc = queuedAtUtc;
    }

    public bool IsDispatchable(DateTime utcNow) =>
        (State is InvitationDeliveryState.Queued or InvitationDeliveryState.Failed)
        && (!NextAttemptAtUtc.HasValue || NextAttemptAtUtc <= utcNow);

    public void MarkSending(DateTime utcNow)
    {
        if (!IsDispatchable(utcNow))
        {
            throw new InvalidOperationException("Only a due queued or failed invitation delivery can be sent.");
        }

        State = InvitationDeliveryState.Sending;
        AttemptCount++;
        LastAttemptAtUtc = utcNow;
        NextAttemptAtUtc = null;
        LastError = null;
    }

    public void MarkAccepted(string? providerMessageId, DateTime utcNow)
    {
        if (State != InvitationDeliveryState.Sending)
        {
            throw new InvalidOperationException("Only a sending invitation delivery can be accepted by the provider.");
        }

        State = InvitationDeliveryState.Accepted;
        ProviderMessageId = Optional(providerMessageId, 255);
        ProviderAcceptedAtUtc = utcNow;
        LastError = null;
    }

    public void MarkFailure(string error, DateTime utcNow, int maximumAttempts, TimeSpan retryDelay)
    {
        if (State != InvitationDeliveryState.Sending)
        {
            throw new InvalidOperationException("Only a sending invitation delivery can fail.");
        }

        LastError = Required(error, nameof(error), 2000);
        if (AttemptCount >= maximumAttempts)
        {
            State = InvitationDeliveryState.NeedsAttention;
            NextAttemptAtUtc = null;
            return;
        }

        State = InvitationDeliveryState.Failed;
        NextAttemptAtUtc = utcNow.Add(retryDelay);
    }

    public void MarkDelivered(DateTime deliveredAtUtc)
    {
        if (State == InvitationDeliveryState.Delivered)
        {
            return;
        }

        if (State is not (InvitationDeliveryState.Accepted or InvitationDeliveryState.Sending))
        {
            throw new InvalidOperationException("Only a provider-accepted delivery can be marked delivered.");
        }

        State = InvitationDeliveryState.Delivered;
        DeliveredAtUtc = deliveredAtUtc;
        LastError = null;
    }

    public void MarkBounced(DateTime bouncedAtUtc, bool isHardBounce, string? description)
    {
        if (State == InvitationDeliveryState.Bounced)
        {
            IsHardBounce |= isHardBounce;
            return;
        }

        if (State is not (InvitationDeliveryState.Accepted
            or InvitationDeliveryState.Delivered
            or InvitationDeliveryState.Sending))
        {
            throw new InvalidOperationException("Only a provider-accepted delivery can be marked bounced.");
        }

        State = InvitationDeliveryState.Bounced;
        BouncedAtUtc = bouncedAtUtc;
        IsHardBounce = isHardBounce;
        LastError = Optional(description, 2000);
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId)
    {
        CreatedAt = utcNow;
        CreatedByUserId = actorUserId;
    }

    public void MarkUpdated(DateTime utcNow, Guid? actorUserId)
    {
        UpdatedAt = utcNow;
        UpdatedByUserId = actorUserId;
    }

    public void IncrementVersion() => Version++;

    private static string Required(string? value, string parameterName, int maximumLength)
    {
        var normalized = string.IsNullOrWhiteSpace(value)
            ? throw new ArgumentException("A value is required.", parameterName)
            : value.Trim();
        return normalized.Length <= maximumLength
            ? normalized
            : throw new ArgumentException($"The value cannot exceed {maximumLength} characters.", parameterName);
    }

    private static string? Optional(string? value, int maximumLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var normalized = value.Trim();
        return normalized.Length <= maximumLength
            ? normalized
            : throw new ArgumentException($"The value cannot exceed {maximumLength} characters.", nameof(value));
    }
}

/// <summary>Provider webhook receipt used solely for replay-safe deduplication.</summary>
public sealed class InvitationDeliveryWebhookEvent
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string ProviderEventId { get; private set; } = null!;
    public Guid InvitationDeliveryAttemptId { get; private set; }
    public string EventType { get; private set; } = null!;
    public DateTime ProviderOccurredAtUtc { get; private set; }
    public DateTime ReceivedAtUtc { get; private set; }

    private InvitationDeliveryWebhookEvent() { }

    public InvitationDeliveryWebhookEvent(
        string providerEventId,
        Guid invitationDeliveryAttemptId,
        string eventType,
        DateTime providerOccurredAtUtc,
        DateTime receivedAtUtc)
    {
        ProviderEventId = Required(providerEventId, nameof(providerEventId), 512);
        InvitationDeliveryAttemptId = invitationDeliveryAttemptId != Guid.Empty
            ? invitationDeliveryAttemptId
            : throw new ArgumentException("A delivery attempt is required.", nameof(invitationDeliveryAttemptId));
        EventType = Required(eventType, nameof(eventType), 100);
        ProviderOccurredAtUtc = providerOccurredAtUtc;
        ReceivedAtUtc = receivedAtUtc;
    }

    private static string Required(string? value, string parameterName, int maximumLength)
    {
        var normalized = string.IsNullOrWhiteSpace(value)
            ? throw new ArgumentException("A value is required.", parameterName)
            : value.Trim();
        return normalized.Length <= maximumLength
            ? normalized
            : throw new ArgumentException($"The value cannot exceed {maximumLength} characters.", parameterName);
    }
}
