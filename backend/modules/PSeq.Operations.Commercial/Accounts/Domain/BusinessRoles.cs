namespace PSeq.Operations.Commercial.Accounts.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

/// <summary>
/// Additive POMS business roles. Platform administration remains a configuration
/// role and does not imply these operational capabilities.
/// </summary>
public enum BusinessRole
{
    CommercialOperator = 1,
    ResultReleaseManager = 2,
    BillingOperator = 3,
    CashOperator = 4,
    CashReconciler = 5
}

public sealed class BusinessRoleAssignment : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid UserId { get; private set; }
    public BusinessRole Role { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private BusinessRoleAssignment() { }

    public BusinessRoleAssignment(Guid userId, BusinessRole role)
    {
        UserId = userId != Guid.Empty
            ? userId
            : throw new ArgumentException("A user is required.", nameof(userId));
        Role = role;
    }

    public void SetActive(bool isActive) => IsActive = isActive;
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class BusinessRoleInvitationIntent : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationInvitationId { get; private set; }
    public BusinessRole Role { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private BusinessRoleInvitationIntent() { }

    public BusinessRoleInvitationIntent(Guid organizationInvitationId, BusinessRole role)
    {
        OrganizationInvitationId = organizationInvitationId != Guid.Empty
            ? organizationInvitationId
            : throw new ArgumentException("An invitation is required.", nameof(organizationInvitationId));
        Role = role;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
