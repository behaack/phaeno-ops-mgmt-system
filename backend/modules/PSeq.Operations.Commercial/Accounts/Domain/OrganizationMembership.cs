namespace PSeq.Operations.Commercial.Accounts.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

/// <summary>
/// Links a user to an organization with organization-scoped capabilities.
/// </summary>
public sealed class OrganizationMembership : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public Guid UserId { get; private set; }

    public User? User { get; private set; }

    public Guid OrganizationId { get; private set; }

    public Organization? Organization { get; private set; }

    public bool IsOrganizationAdmin { get; private set; }

    public bool IsActive { get; private set; } = true;

    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? CreatedByUserId { get; private set; }

    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? UpdatedByUserId { get; private set; }

    public long Version { get; private set; } = 1;

    private OrganizationMembership()
    {
    }

    public OrganizationMembership(Guid userId, Guid organizationId, bool isOrganizationAdmin)
    {
        UserId = userId;
        OrganizationId = organizationId;
        IsOrganizationAdmin = isOrganizationAdmin;
    }

    public void SetOrganizationAdmin(bool isOrganizationAdmin)
    {
        IsOrganizationAdmin = isOrganizationAdmin;
    }

    public void Deactivate()
    {
        IsActive = false;
    }

    public void Activate()
    {
        IsActive = true;
    }

    public bool GrantsPlatformAdmin()
    {
        return IsActive
            && IsOrganizationAdmin
            && Organization?.IsActive == true
            && Organization.IsPhaeno();
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
