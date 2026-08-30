namespace PhaenoPortal.App.Features.Crm.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class CrmAccess
{
    public static async Task<User> RequirePlatformAdminAsync(
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
        if (actor == null || !AccountAuthorization.IsPlatformAdmin(actor))
        {
            throw new CrmException(
                "crm_access_forbidden",
                "Phaeno CRM access is required.",
                StatusCodes.Status403Forbidden);
        }

        return actor;
    }

    public static void EnsureVersion(long currentVersion, long requestedVersion)
    {
        if (currentVersion != requestedVersion) throw new DbUpdateConcurrencyException();
    }

    public static void EnsurePagination(int page, int pageSize)
    {
        if (page < 1 || pageSize is < 1 or > 100)
        {
            throw new CrmException(
                "crm_pagination_invalid",
                "Page must be at least 1 and page size must be between 1 and 100.");
        }
    }

    public static T Execute<T>(Func<T> action)
    {
        try
        {
            return action();
        }
        catch (ArgumentException exception)
        {
            throw new CrmException("invalid_crm_record", exception.Message);
        }
        catch (InvalidOperationException exception)
        {
            throw Conflict("invalid_crm_record_state", exception.Message);
        }
    }

    public static void Execute(Action action) => Execute(() =>
    {
        action();
        return true;
    });

    public static CrmException NotFound(string code, string message) =>
        new(code, message, StatusCodes.Status404NotFound);

    public static CrmException Conflict(string code, string message) =>
        new(code, message, StatusCodes.Status409Conflict);
}
