namespace PSeq.Operations.Commercial.Accounts.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

/// <summary>
/// Pending invitation to create or reactivate one organization membership for an email.
/// </summary>
public sealed class OrganizationInvitation : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public Guid OrganizationId { get; private set; }

    public Organization? Organization { get; private set; }

    public string Email { get; private set; } = null!;

    public string NormalizedEmail { get; private set; } = null!;

    public string FirstName { get; private set; } = null!;

    public string LastName { get; private set; } = null!;

    public bool IsOrganizationAdmin { get; private set; }

    public string TokenHash { get; private set; } = null!;

    public DateTime ExpiresAt { get; private set; }

    public InvitationStatus Status { get; private set; } = InvitationStatus.Pending;

    public Guid? AcceptedByUserId { get; private set; }

    public DateTime? AcceptedAt { get; private set; }

    public Guid? RevokedByUserId { get; private set; }

    public DateTime? RevokedAt { get; private set; }

    public Guid? DeclinedByUserId { get; private set; }

    public DateTime? DeclinedAt { get; private set; }

    public DateTime? LastSentAt { get; private set; }

    public Guid? LastSentByUserId { get; private set; }

    public int SendCount { get; private set; }

    public string? LastEmailProviderMessageId { get; private set; }

    public string? LastSendError { get; private set; }

    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? CreatedByUserId { get; private set; }

    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? UpdatedByUserId { get; private set; }

    public long Version { get; private set; } = 1;

    private OrganizationInvitation()
    {
    }

    public OrganizationInvitation(
        Guid organizationId,
        string email,
        string firstName,
        string lastName,
        bool isOrganizationAdmin,
        string tokenHash,
        DateTime expiresAt)
    {
        OrganizationId = organizationId;
        SetEmail(email);
        SetInviteeName(firstName, lastName);
        IsOrganizationAdmin = isOrganizationAdmin;
        TokenHash = tokenHash;
        ExpiresAt = expiresAt;
    }

    public bool IsExpired(DateTime utcNow)
    {
        return Status == InvitationStatus.Pending && ExpiresAt <= utcNow;
    }

    public bool CanBeAccepted(DateTime utcNow)
    {
        return Status == InvitationStatus.Pending && ExpiresAt > utcNow;
    }

    public void RotateToken(string tokenHash, DateTime expiresAt)
    {
        if (Status != InvitationStatus.Pending)
        {
            throw new InvalidOperationException("Only pending invitations can be resent.");
        }

        TokenHash = tokenHash;
        ExpiresAt = expiresAt;
    }

    public void UpdateIntent(
        string firstName,
        string lastName,
        bool isOrganizationAdmin)
    {
        if (Status != InvitationStatus.Pending)
        {
            throw new InvalidOperationException("Only pending invitations can be updated.");
        }

        SetInviteeName(firstName, lastName);
        IsOrganizationAdmin = isOrganizationAdmin;
    }

    public void RecordSend(DateTime utcNow, Guid? senderUserId, string? providerMessageId, string? sendError = null)
    {
        LastSentAt = utcNow;
        LastSentByUserId = senderUserId;
        LastEmailProviderMessageId = providerMessageId;
        LastSendError = sendError;
        SendCount++;
    }

    public void Accept(Guid acceptedByUserId, DateTime utcNow)
    {
        if (!CanBeAccepted(utcNow))
        {
            throw new InvalidOperationException("Invitation cannot be accepted.");
        }

        Status = InvitationStatus.Accepted;
        AcceptedByUserId = acceptedByUserId;
        AcceptedAt = utcNow;
    }

    public void Revoke(Guid revokedByUserId, DateTime utcNow)
    {
        if (Status != InvitationStatus.Pending)
        {
            throw new InvalidOperationException("Only pending invitations can be revoked.");
        }

        Status = InvitationStatus.Revoked;
        RevokedByUserId = revokedByUserId;
        RevokedAt = utcNow;
    }

    public void Decline(Guid? declinedByUserId, DateTime utcNow)
    {
        if (!CanBeAccepted(utcNow))
        {
            throw new InvalidOperationException("Invitation cannot be declined.");
        }

        Status = InvitationStatus.Declined;
        DeclinedByUserId = declinedByUserId;
        DeclinedAt = utcNow;
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

    public void IncrementVersion()
    {
        Version++;
    }

    private void SetEmail(string email)
    {
        Email = email.Trim();
        NormalizedEmail = User.NormalizeEmail(email);
    }

    private void SetInviteeName(string firstName, string lastName)
    {
        FirstName = RequiredName(firstName, nameof(firstName));
        LastName = RequiredName(lastName, nameof(lastName));
    }

    private static string RequiredName(string value, string parameterName)
    {
        var normalized = string.IsNullOrWhiteSpace(value)
            ? throw new ArgumentException("A value is required.", parameterName)
            : value.Trim();
        return normalized.Length <= 100
            ? normalized
            : throw new ArgumentException(
                "The value cannot exceed 100 characters.",
                parameterName);
    }
}
