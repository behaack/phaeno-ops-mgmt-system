namespace PhaenoPortal.App.Common.Exceptions.Accounts;

using PhaenoPortal.App.Common.Exceptions.Conflict;

/// <summary>
/// Exception thrown when a user is not found.
/// </summary>
public sealed class UserNotFoundException : ConflictException
{
    public UserNotFoundException(Guid id)
        : base($"User with ID '{id}' not found.") { }

    public UserNotFoundException(string email)
        : base($"User with email '{email}' not found.") { }

    public override string ErrorCode => "user_not_found";
}
