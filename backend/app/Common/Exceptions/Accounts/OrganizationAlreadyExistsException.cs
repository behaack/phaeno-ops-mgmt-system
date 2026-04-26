namespace PhaenoPortal.App.Common.Exceptions.Accounts;

using PhaenoPortal.App.Common.Exceptions.Conflict;

/// <summary>
/// Exception thrown when an organization with the given name already exists.
/// </summary>
public sealed class OrganizationAlreadyExistsException : ConflictException
{
    public OrganizationAlreadyExistsException(string name)
        : base($"Organization '{name}' already exists.") { }

    public override string ErrorCode => "organization_already_exists";
}
