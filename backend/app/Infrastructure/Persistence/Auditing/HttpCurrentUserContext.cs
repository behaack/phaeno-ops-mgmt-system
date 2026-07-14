using System.Security.Claims;

namespace PhaenoPortal.App.Infrastructure.Persistence.Auditing;

public sealed class HttpCurrentUserContext(IHttpContextAccessor httpContextAccessor) : ICurrentUserContext
{
    public const string InternalUserIdItemKey = "PhaenoPortal.InternalUserId";

    public Guid? UserId => ReadInternalUserId() ?? ReadGuidClaim(
        ClaimTypes.NameIdentifier,
        "sub",
        "user_id");

    public Guid? OrganizationId => ReadGuidClaim(
        "organization_id",
        "org_id");

    public string? RequestId => httpContextAccessor.HttpContext?.TraceIdentifier;

    private Guid? ReadInternalUserId()
    {
        return httpContextAccessor.HttpContext?.Items.TryGetValue(
            InternalUserIdItemKey,
            out object? value) == true
            && value is Guid internalUserId
                ? internalUserId
                : null;
    }

    private Guid? ReadGuidClaim(params string[] claimTypes)
    {
        var user = httpContextAccessor.HttpContext?.User;
        if (user is null)
        {
            return null;
        }

        foreach (string claimType in claimTypes)
        {
            string? value = user.FindFirstValue(claimType);
            if (Guid.TryParse(value, out Guid parsed))
            {
                return parsed;
            }
        }

        return null;
    }
}
