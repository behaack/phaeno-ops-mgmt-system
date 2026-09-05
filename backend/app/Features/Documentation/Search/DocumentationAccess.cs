namespace PhaenoPortal.App.Features.Documentation.Search;

using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;

public interface IDocumentationAccess
{
    Task<string> RequireAudienceAsync(HttpContext context, CancellationToken cancellationToken);
    Task<Guid> RequirePlatformAdminAsync(HttpContext context, CancellationToken cancellationToken);
}

public sealed class DocumentationAccess(PSeqOperationsDbContext db, IExternalIdentityContext externalIdentity) : IDocumentationAccess
{
    public async Task<string> RequireAudienceAsync(HttpContext context, CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(context, db, externalIdentity, cancellationToken);
        return ResolveAudience(actor, context.Request.Headers["X-Organization-Id"].ToString());
    }

    internal static string ResolveAudience(User? actor, string selectedOrganization)
    {
        if (actor is not { IsActive: true, Status: UserAccountStatus.Active })
            throw new DocumentationSearchException("active_actor_required", "An active Portal user is required.", 401);
        if (!Guid.TryParse(selectedOrganization, out var organizationId))
            throw new DocumentationSearchException("selected_organization_required", "Select an organization to search documentation.");
        var membership = actor.Memberships.FirstOrDefault(value => value.OrganizationId == organizationId
            && value.IsActive && value.Organization is { IsActive: true });
        return membership?.Organization?.Kind switch
        {
            OrganizationKind.Prospect => "prospect",
            OrganizationKind.Customer => "customer",
            OrganizationKind.Partner => "partner",
            OrganizationKind.Phaeno => "phaeno",
            _ => throw new DocumentationSearchException("documentation_scope_unavailable", "Documentation is unavailable for this organization.", 403)
        };
    }

    public async Task<Guid> RequirePlatformAdminAsync(HttpContext context, CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(context, db, externalIdentity, cancellationToken);
        if (actor is null) throw new DocumentationSearchException("active_actor_required", "An active Portal user is required.", 401);
        if (!AccountAuthorization.IsPlatformAdmin(actor))
            throw new DocumentationSearchException("platform_admin_required", "A platform administrator is required.", 403);
        return actor.Id;
    }
}
