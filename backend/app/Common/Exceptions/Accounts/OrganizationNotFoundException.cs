namespace PhaenoPortal.App.Common.Exceptions.Accounts;

using PhaenoPortal.App.Common.Exceptions.Conflict;

/// <summary>
/// Exception thrown when an organization is not found.
/// </summary>
public sealed class OrganizationNotFoundException : ConflictException
{
    public OrganizationNotFoundException(Guid id)
        : base($"Organization with ID '{id}' not found.") { }

    public override string ErrorCode => "organization_not_found";
}
