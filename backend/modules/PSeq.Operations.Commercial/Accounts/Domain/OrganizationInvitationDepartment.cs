namespace PSeq.Operations.Commercial.Accounts.Domain;

/// <summary>
/// Department access intended by an Organization invitation.
/// </summary>
public sealed class OrganizationInvitationDepartment
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationInvitationId { get; private set; }
    public OrganizationInvitation OrganizationInvitation { get; private set; } = null!;
    public Guid DepartmentId { get; private set; }
    public OrganizationDepartment Department { get; private set; } = null!;
    public bool IsDepartmentAdmin { get; private set; }

    private OrganizationInvitationDepartment()
    {
    }

    public OrganizationInvitationDepartment(
        Guid organizationInvitationId,
        Guid departmentId,
        bool isDepartmentAdmin)
    {
        if (organizationInvitationId == Guid.Empty || departmentId == Guid.Empty)
        {
            throw new ArgumentException("An invitation and department are required.");
        }

        OrganizationInvitationId = organizationInvitationId;
        DepartmentId = departmentId;
        IsDepartmentAdmin = isDepartmentAdmin;
    }

    public void SetDepartmentAdmin(bool isDepartmentAdmin) => IsDepartmentAdmin = isDepartmentAdmin;
}
