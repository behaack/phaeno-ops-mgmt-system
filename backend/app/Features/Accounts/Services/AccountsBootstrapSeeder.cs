namespace PhaenoPortal.App.Features.Accounts.Services;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class AccountsBootstrapSeeder
{
    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var options = scope.ServiceProvider
            .GetRequiredService<IOptions<BootstrapOptions>>()
            .Value;

        if (string.IsNullOrWhiteSpace(options.AdminEmail))
        {
            return;
        }

        var dbContext = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
        var clerkProvisioner = scope.ServiceProvider.GetRequiredService<IClerkBootstrapUserProvisioner>();
        var organizationName = string.IsNullOrWhiteSpace(options.PhaenoOrganizationName)
            ? "Phaeno"
            : options.PhaenoOrganizationName.Trim();

        var organization = await dbContext.Organizations
            .FirstOrDefaultAsync(
                o => o.Name == organizationName && o.Kind == OrganizationKind.Phaeno,
                cancellationToken);

        if (organization == null)
        {
            organization = new Organization(organizationName, OrganizationKind.Phaeno);
            dbContext.Organizations.Add(organization);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        else if (!organization.IsActive)
        {
            organization.Activate();
        }

        var normalizedEmail = User.NormalizeEmail(options.AdminEmail);
        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail, cancellationToken);

        if (user == null)
        {
            user = new User(
                options.AdminEmail,
                options.AdminFirstName,
                options.AdminLastName);
            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        else
        {
            user.UpdateProfile(options.AdminFirstName, options.AdminLastName);
        }

        user.Activate();
        var clerkUser = await clerkProvisioner.EnsureUserAsync(options, cancellationToken);
        if (clerkUser != null)
        {
            if (!user.HasLinkedExternalIdentity())
            {
                user.LinkExternalIdentity("clerk", clerkUser.UserId);
            }
            else if (!user.IsLinkedTo("clerk", clerkUser.UserId))
            {
                throw new InvalidOperationException("Bootstrap user is linked to a different Clerk user.");
            }
        }

        var membership = await dbContext.OrganizationMemberships
            .FirstOrDefaultAsync(
                m => m.UserId == user.Id && m.OrganizationId == organization.Id,
                cancellationToken);

        if (membership == null)
        {
            membership = new OrganizationMembership(
                user.Id,
                organization.Id,
                isOrganizationAdmin: true);
            dbContext.OrganizationMemberships.Add(membership);
        }
        else
        {
            membership.Activate();
            membership.SetOrganizationAdmin(isOrganizationAdmin: true);
        }

        var defaultDepartment = await dbContext.OrganizationDepartments
            .SingleOrDefaultAsync(value => value.OrganizationId == organization.Id && value.IsDefault, cancellationToken);
        if (defaultDepartment is null)
        {
            defaultDepartment = new OrganizationDepartment(
                organization.Id,
                OrganizationDepartment.DefaultCode,
                OrganizationDepartment.DefaultName,
                "Default organization-wide department.",
                isDefault: true);
            dbContext.OrganizationDepartments.Add(defaultDepartment);
        }

        var departmentMembership = await dbContext.OrganizationDepartmentMemberships
            .SingleOrDefaultAsync(value => value.OrganizationMembershipId == membership.Id
                && value.DepartmentId == defaultDepartment.Id, cancellationToken);
        if (departmentMembership is null)
        {
            dbContext.OrganizationDepartmentMemberships.Add(
                new OrganizationDepartmentMembership(membership.Id, defaultDepartment.Id, isDepartmentAdmin: true));
        }
        else
        {
            departmentMembership.Reactivate();
            departmentMembership.SetDepartmentAdmin(isDepartmentAdmin: true);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
