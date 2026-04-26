namespace PhaenoPortal.App.Features.Accounts.Domain;

using PhaenoPortal.App.Common.Persistence;

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
    /// The organization this user belongs to.
    /// </summary>
    public Guid OrganizationId { get; private set; }

    /// <summary>
    /// Navigation property to the organization.
    /// </summary>
    public Organization? Organization { get; private set; }

    /// <summary>
    /// Email address of the user.
    /// </summary>
    public string Email { get; private set; } = null!;

    /// <summary>
    /// First name of the user.
    /// </summary>
    public string FirstName { get; private set; } = null!;

    /// <summary>
    /// Last name of the user.
    /// </summary>
    public string LastName { get; private set; } = null!;

    /// <summary>
    /// Hashed password for the user.
    /// </summary>
    public string PasswordHash { get; private set; } = null!;

    /// <summary>
    /// Indicates whether the user account is active.
    /// </summary>
    public bool IsActive { get; private set; } = true;

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
    /// Creates a new user instance.
    /// </summary>
    private User()
    {
    }

    /// <summary>
    /// Creates a new user instance.
    /// </summary>
    public User(
        Guid organizationId,
        string email,
        string firstName,
        string lastName,
        string passwordHash)
    {
        OrganizationId = organizationId;
        Email = email;
        FirstName = firstName;
        LastName = lastName;
        PasswordHash = passwordHash;
    }

    /// <summary>
    /// Updates the user's profile information.
    /// </summary>
    public void UpdateProfile(string firstName, string lastName)
    {
        FirstName = firstName;
        LastName = lastName;
    }

    /// <summary>
    /// Updates the user's password hash.
    /// </summary>
    public void UpdatePassword(string passwordHash)
    {
        PasswordHash = passwordHash;
    }

    /// <summary>
    /// Deactivates the user account.
    /// </summary>
    public void Deactivate()
    {
        IsActive = false;
    }

    /// <summary>
    /// Activates the user account.
    /// </summary>
    public void Activate()
    {
        IsActive = true;
    }

    /// <summary>
    /// Records the user's login time.
    /// </summary>
    public void RecordLogin()
    {
        LastLoginAt = DateTime.UtcNow;
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
