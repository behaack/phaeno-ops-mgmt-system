namespace PhaenoPortal.App.Common.Exceptions.Accounts;

using PhaenoPortal.App.Common.Exceptions.Conflict;

/// <summary>
/// Exception thrown when a user with the given email already exists.
/// </summary>
public sealed class UserAlreadyExistsException : ConflictException
{
    public UserAlreadyExistsException(string email)
        : base($"User with email '{email}' already exists.") { }

    public override string ErrorCode => "user_already_exists";
}
