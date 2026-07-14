namespace PhaenoPortal.App.Common.Exceptions.Accounts;

using PhaenoPortal.App.Common.Exceptions;

public sealed class OrganizationKindNotAllowedException(string message) : DomainException(message)
{
    public override string ErrorCode => "organization_kind_not_allowed";
}
