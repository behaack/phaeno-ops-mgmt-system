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
    public string? PasswordHash { get; private set; }

    /// <summary>
    /// Indicates whether the user account is active.
    /// </summary>
    public bool IsActive { get; private set; } = true;

    /// <summary>
    /// Indicates whether the user can administer users in their own organization.
    /// </summary>
    public bool IsOrganizationAdmin { get; private set; }

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

    public DateTime InvitedAt { get; private set; } = DateTime.UtcNow;

    public Guid? InvitedByUserId { get; private set; }

    public DateTime? InvitationAcceptedAt { get; private set; }

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
        bool isOrganizationAdmin,
        Guid? invitedByUserId = null)
    {
        OrganizationId = organizationId;
        Email = email;
        FirstName = firstName;
        LastName = lastName;
        IsOrganizationAdmin = isOrganizationAdmin;
        InvitedByUserId = invitedByUserId;
    }

    /// <summary>
    /// Updates the user's profile information.
    /// </summary>
    public void UpdateProfile(string firstName, string lastName)
    {
        FirstName = firstName;
        LastName = lastName;
    }

    public void SetOrganizationAdmin(bool isOrganizationAdmin)
    {
        IsOrganizationAdmin = isOrganizationAdmin;
    }

    /// <summary>
    /// Updates the user's password hash.
    /// </summary>
    public void UpdatePassword(string passwordHash)
    {
        PasswordHash = passwordHash;
    }

    public void AcceptInvitation(string firstName, string lastName, string passwordHash)
    {
        FirstName = firstName;
        LastName = lastName;
        PasswordHash = passwordHash;
        Status = UserAccountStatus.Active;
        IsActive = true;
        InvitationAcceptedAt = DateTime.UtcNow;
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

    public bool CanAccessOrganization(Guid organizationId)
    {
        if (Organization?.IsPhaeno() == true)
        {
            return true;
        }

        return OrganizationId == organizationId;
    }

    public bool CanManageUsersForOrganization(Guid organizationId)
    {
        if (OrganizationId == organizationId)
        {
            return IsOrganizationAdmin;
        }

        return Organization?.IsPhaeno() == true;
    }

    public bool CanManageCustomerOrganizations()
    {
        return Organization?.IsPhaeno() == true;
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
