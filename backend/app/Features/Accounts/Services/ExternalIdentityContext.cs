namespace PhaenoPortal.App.Features.Accounts.Services;

using System.Security.Claims;

public interface IExternalIdentityContext
{
    ExternalIdentity? Read(HttpContext httpContext);
}

public sealed class ClaimsExternalIdentityContext : IExternalIdentityContext
{
    public ExternalIdentity? Read(HttpContext httpContext)
    {
        var user = httpContext.User;
        if (user.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        var subject = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub");
        var email = user.FindFirstValue(ClaimTypes.Email)
            ?? user.FindFirstValue("email");
        var emailVerified = string.Equals(
            user.FindFirstValue("email_verified"),
            "true",
            StringComparison.OrdinalIgnoreCase);

        if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        return new ExternalIdentity(
            Provider: "clerk",
            SubjectId: subject,
            Email: email,
            IsEmailVerified: emailVerified);
    }
}

public sealed record ExternalIdentity(
    string Provider,
    string SubjectId,
    string Email,
    bool IsEmailVerified);
