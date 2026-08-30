namespace PSeq.Operations.Commercial.Accounts.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public enum InvitationDeliveryState
{
    Queued = 1,
    Sending = 2,
    Accepted = 3,
    Delivered = 4,
    Bounced = 5,
    Failed = 6,
    NeedsAttention = 7
}

/// <summary>
/// Durable, retryable delivery of one invitation token rotation. The protected
/// payload is encrypted by the API host and is never returned from an API.
/// </summary>
public sealed class InvitationDeliveryAttempt : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationInvitationId { get; private set; }
    public Guid OrganizationId { get; private set; }
    public string RecipientEmail { get; private set; } = null!;
    public string ProtectedPayload { get; private set; } = null!;
    public InvitationDeliveryState State { get; private set; } = InvitationDeliveryState.Queued;
    public int AttemptCount { get; private set; }
    public int MaximumAttempts { get; private set; }
    public DateTime NextAttemptAtUtc { get; private set; }
    public DateTime? LeaseExpiresAtUtc { get; private set; }
    public string? ProviderMessageId { get; private set; }
    public string? LastError { get; private set; }
    public DateTime? DeliveredAtUtc { get; private set; }
    public DateTime? BouncedAtUtc { get; private set; }
    public string? BounceType { get; private set; }
    public DateTime? AcceptedAtUtc { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private InvitationDeliveryAttempt() { }

    public InvitationDeliveryAttempt(
        Guid invitationId,
        Guid organizationId,
        string recipientEmail,
        string protectedPayload,
        int maximumAttempts,
        DateTime queuedAtUtc)
    {
        if (invitationId == Guid.Empty || organizationId == Guid.Empty)
            throw new ArgumentException("Invitation and organization identifiers are required.");
        if (maximumAttempts is < 1 or > 20)
            throw new ArgumentOutOfRangeException(nameof(maximumAttempts));

        OrganizationInvitationId = invitationId;
        OrganizationId = organizationId;
        RecipientEmail = Required(recipientEmail, nameof(recipientEmail), 255);
        ProtectedPayload = Required(protectedPayload, nameof(protectedPayload), 8000);
        MaximumAttempts = maximumAttempts;
        NextAttemptAtUtc = RequireUtc(queuedAtUtc, nameof(queuedAtUtc));
    }

    public bool CanBeClaimed(DateTime utcNow) =>
        ((State is InvitationDeliveryState.Queued or InvitationDeliveryState.Failed)
            && NextAttemptAtUtc <= utcNow)
        || (State == InvitationDeliveryState.Sending
            && LeaseExpiresAtUtc <= utcNow);

    public void Claim(DateTime utcNow, TimeSpan lease)
    {
        if (!CanBeClaimed(utcNow))
            throw new InvalidOperationException("The invitation delivery is not ready to be claimed.");
        if (lease <= TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(nameof(lease));

        State = InvitationDeliveryState.Sending;
        AttemptCount++;
        LeaseExpiresAtUtc = utcNow.Add(lease);
        LastError = null;
    }

    public void RecordAccepted(DateTime utcNow)
    {
        AcceptedAtUtc = RequireUtc(utcNow, nameof(utcNow));
        if (State is InvitationDeliveryState.Queued
            or InvitationDeliveryState.Sending
            or InvitationDeliveryState.Failed)
            State = InvitationDeliveryState.Accepted;
        ProtectedPayload = string.Empty;
        LeaseExpiresAtUtc = null;
    }

    public void RecordProviderAccepted(string? providerMessageId, DateTime utcNow)
    {
        if (State != InvitationDeliveryState.Sending)
            throw new InvalidOperationException("Only a claimed delivery can be accepted by the provider.");
        ProviderMessageId = Optional(providerMessageId, 255);
        State = InvitationDeliveryState.Accepted;
        NextAttemptAtUtc = RequireUtc(utcNow, nameof(utcNow));
        LeaseExpiresAtUtc = null;
        LastError = null;
        ProtectedPayload = string.Empty;
    }

    public void RecordDelivered(DateTime deliveredAtUtc)
    {
        DeliveredAtUtc = RequireUtc(deliveredAtUtc, nameof(deliveredAtUtc));
        State = InvitationDeliveryState.Delivered;
        LeaseExpiresAtUtc = null;
        LastError = null;
    }

    public void RecordBounce(DateTime bouncedAtUtc, string? bounceType, bool hardBounce)
    {
        BouncedAtUtc = RequireUtc(bouncedAtUtc, nameof(bouncedAtUtc));
        BounceType = Optional(bounceType, 100);
        State = hardBounce
            ? InvitationDeliveryState.NeedsAttention
            : InvitationDeliveryState.Bounced;
        LeaseExpiresAtUtc = null;
        LastError = hardBounce
            ? "Hard bounce. Revoke this invitation and create a new invitation for the corrected address."
            : "The provider reported a soft bounce.";
    }

    public void RecordFailure(string error, DateTime utcNow, TimeSpan retryDelay)
    {
        LastError = Required(error, nameof(error), 2000);
        LeaseExpiresAtUtc = null;
        if (AttemptCount >= MaximumAttempts)
        {
            State = InvitationDeliveryState.NeedsAttention;
            NextAttemptAtUtc = utcNow;
            ProtectedPayload = string.Empty;
            return;
        }

        State = InvitationDeliveryState.Failed;
        NextAttemptAtUtc = utcNow.Add(retryDelay);
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;

    private static DateTime RequireUtc(DateTime value, string name) =>
        value.Kind == DateTimeKind.Utc
            ? value
            : throw new ArgumentException("A UTC timestamp is required.", name);

    private static string Required(string? value, string name, int maxLength)
    {
        var normalized = string.IsNullOrWhiteSpace(value)
            ? throw new ArgumentException("A value is required.", name)
            : value.Trim();
        return normalized.Length <= maxLength
            ? normalized
            : throw new ArgumentException($"The value cannot exceed {maxLength} characters.", name);
    }

    private static string? Optional(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var normalized = value.Trim();
        return normalized.Length <= maxLength
            ? normalized
            : throw new ArgumentException($"The value cannot exceed {maxLength} characters.", nameof(value));
    }
}

/// <summary>Immutable provider event receipt used for webhook deduplication.</summary>
public sealed class InvitationProviderEvent
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string ProviderEventIdentity { get; private set; } = null!;
    public string EventType { get; private set; } = null!;
    public string? ProviderMessageId { get; private set; }
    public string PayloadSha256 { get; private set; } = null!;
    public DateTime ProviderOccurredAtUtc { get; private set; }
    public DateTime ReceivedAtUtc { get; private set; }

    private InvitationProviderEvent() { }

    public InvitationProviderEvent(string providerEventIdentity, string eventType,
        string? providerMessageId, string payloadSha256, DateTime providerOccurredAtUtc,
        DateTime receivedAtUtc)
    {
        ProviderEventIdentity = Required(providerEventIdentity, nameof(providerEventIdentity), 500);
        EventType = Required(eventType, nameof(eventType), 100);
        ProviderMessageId = string.IsNullOrWhiteSpace(providerMessageId) ? null : providerMessageId.Trim();
        PayloadSha256 = Required(payloadSha256, nameof(payloadSha256), 64).ToLowerInvariant();
        if (PayloadSha256.Length != 64 || PayloadSha256.Any(character => !Uri.IsHexDigit(character)))
            throw new ArgumentException("Payload SHA-256 must be hexadecimal.", nameof(payloadSha256));
        ProviderOccurredAtUtc = providerOccurredAtUtc;
        ReceivedAtUtc = receivedAtUtc;
    }

    private static string Required(string? value, string name, int maxLength)
    {
        var normalized = string.IsNullOrWhiteSpace(value)
            ? throw new ArgumentException("A value is required.", name)
            : value.Trim();
        return normalized.Length <= maxLength
            ? normalized
            : throw new ArgumentException($"The value cannot exceed {maxLength} characters.", name);
    }
}
