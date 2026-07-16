namespace PhaenoPortal.App.Features.Accounts.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class AccountAccess
{
    public static async Task<User?> ReadActiveActorAsync(
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var identity = externalIdentityContext.Read(httpContext);
        if (identity == null)
        {
            return null;
        }

        var user = await dbContext.Users
            .Include(u => u.Memberships)
            .ThenInclude(m => m.Organization)
            .FirstOrDefaultAsync(
                u => u.ExternalIdentityProvider == identity.Provider
                    && u.ExternalSubjectId == identity.SubjectId,
                cancellationToken);

        if (user is not { IsActive: true, Status: UserAccountStatus.Active })
        {
            return null;
        }

        httpContext.Items[Infrastructure.Persistence.Auditing.HttpCurrentUserContext.InternalUserIdItemKey] = user.Id;

        return user;
    }
}
