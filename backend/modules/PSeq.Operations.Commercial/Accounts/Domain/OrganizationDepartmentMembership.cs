namespace PSeq.Operations.Commercial.Accounts.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

/// <summary>
/// Grants one Organization membership access to one Department.
/// </summary>
public sealed class OrganizationDepartmentMembership : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationMembershipId { get; private set; }
    public OrganizationMembership OrganizationMembership { get; private set; } = null!;
    public Guid DepartmentId { get; private set; }
    public OrganizationDepartment Department { get; private set; } = null!;
    public bool IsDepartmentAdmin { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private OrganizationDepartmentMembership()
    {
    }

    public OrganizationDepartmentMembership(
        Guid organizationMembershipId,
        Guid departmentId,
        bool isDepartmentAdmin = false)
    {
        if (organizationMembershipId == Guid.Empty || departmentId == Guid.Empty)
        {
            throw new ArgumentException("An organization membership and department are required.");
        }

        OrganizationMembershipId = organizationMembershipId;
        DepartmentId = departmentId;
        IsDepartmentAdmin = isDepartmentAdmin;
    }

    public void SetDepartmentAdmin(bool isDepartmentAdmin) => IsDepartmentAdmin = isDepartmentAdmin;
    public void Deactivate() => IsActive = false;
    public void Reactivate() => IsActive = true;

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
}
