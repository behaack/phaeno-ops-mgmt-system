namespace PhaenoPortal.App.Common.Exceptions.Accounts;

using PhaenoPortal.App.Common.Exceptions;

public sealed class OrganizationConversionException(string message) : DomainException(message)
{
    public override string ErrorCode => "organization_conversion_invalid";
}
