namespace PSeq.Operations.Commercial.Accounts.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

/// <summary>
/// Represents a user in the system.
/// </summary>
public sealed class User : IAudit, IConcurrency
{
    /// <summary>
    /// Unique identifier for the user.
    /// </summary>
    public Guid Id { get; private set; } = Guid.NewGuid();

    /// <summary>
    /// Email address of the user.
    /// </summary>
    public string Email { get; private set; } = null!;

    /// <summary>
    /// Normalized email address used for identity matching and uniqueness.
    /// </summary>
    public string NormalizedEmail { get; private set; } = null!;

    /// <summary>
    /// External identity provider used for authentication after invite acceptance.
    /// </summary>
    public string? ExternalIdentityProvider { get; private set; }

    /// <summary>
    /// External provider subject identifier, such as a Clerk user ID.
    /// </summary>
    public string? ExternalSubjectId { get; private set; }

    /// <summary>
    /// First name of the user.
    /// </summary>
    public string FirstName { get; private set; } = null!;

    /// <summary>
    /// Last name of the user.
    /// </summary>
    public string LastName { get; private set; } = null!;

    /// <summary>
    /// Indicates whether the user account is active.
    /// </summary>
    public bool IsActive { get; private set; }

    /// <summary>
    /// Invitation-first lifecycle status for the user account.
    /// </summary>
    public UserAccountStatus Status { get; private set; } = UserAccountStatus.Invited;

    /// <summary>
    /// Date and time when the user was created.
    /// </summary>
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    /// <summary>
    /// User that created this user, when known.
    /// </summary>
    public Guid? CreatedByUserId { get; private set; }

    /// <summary>
    /// Date and time when the user was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    /// <summary>
    /// User that last updated this user, when known.
    /// </summary>
    public Guid? UpdatedByUserId { get; private set; }

    /// <summary>
    /// Optimistic concurrency version.
    /// </summary>
    public long Version { get; private set; } = 1;

    /// <summary>
    /// Date and time of the user's last login.
    /// </summary>
    public DateTime? LastLoginAt { get; private set; }

    /// <summary>
    /// Organization memberships for this user.
    /// </summary>
    public ICollection<OrganizationMembership> Memberships { get; } = [];

    /// <summary>
    /// Creates a new user instance.
    /// </summary>
    private User()
    {
    }

    /// <summary>
    /// Creates a new user instance.
    /// </summary>
    public User(
        string email,
        string firstName,
        string lastName)
    {
        SetEmail(email);
        FirstName = firstName;
        LastName = lastName;
    }

    /// <summary>
    /// Updates the user's profile information.
    /// </summary>
    public void UpdateProfile(string firstName, string lastName)
    {
        FirstName = firstName;
        LastName = lastName;
    }

    public static string NormalizeEmail(string email)
    {
        return email.Trim().ToUpperInvariant();
    }

    public void LinkExternalIdentity(string provider, string subjectId)
    {
        if (!string.IsNullOrWhiteSpace(ExternalIdentityProvider)
            || !string.IsNullOrWhiteSpace(ExternalSubjectId))
        {
            throw new InvalidOperationException("User is already linked to an external identity.");
        }

        ExternalIdentityProvider = provider.Trim().ToLowerInvariant();
        ExternalSubjectId = subjectId.Trim();
    }

    public void AcceptInvitation(string firstName, string lastName, string provider, string subjectId, DateTime utcNow)
    {
        FirstName = firstName;
        LastName = lastName;
        if (string.IsNullOrWhiteSpace(ExternalSubjectId))
        {
            LinkExternalIdentity(provider, subjectId);
        }
        else if (!IsLinkedTo(provider, subjectId))
        {
            throw new InvalidOperationException("User is linked to a different external identity.");
        }

        Status = UserAccountStatus.Active;
        IsActive = true;
    }

    /// <summary>
    /// Deactivates the user account.
    /// </summary>
    public void Deactivate()
    {
        IsActive = false;
        Status = UserAccountStatus.Disabled;
    }

    /// <summary>
    /// Activates the user account.
    /// </summary>
    public void Activate()
    {
        IsActive = true;
        Status = UserAccountStatus.Active;
    }

    public void RecordLogin(DateTime utcNow)
    {
        LastLoginAt = utcNow;
    }

    /// <summary>
    /// Records the user's login time.
    /// </summary>
    public void RecordLogin()
    {
        RecordLogin(DateTime.UtcNow);
    }

    private void SetEmail(string email)
    {
        Email = email.Trim();
        NormalizedEmail = NormalizeEmail(email);
    }    

    public bool HasLinkedExternalIdentity()
    {
        return !string.IsNullOrWhiteSpace(ExternalIdentityProvider)
            && !string.IsNullOrWhiteSpace(ExternalSubjectId);
    }

    public bool IsLinkedTo(string provider, string subjectId)
    {
        return string.Equals(ExternalIdentityProvider, provider.Trim().ToLowerInvariant(), StringComparison.Ordinal)
            && string.Equals(ExternalSubjectId, subjectId.Trim(), StringComparison.Ordinal);
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
}
