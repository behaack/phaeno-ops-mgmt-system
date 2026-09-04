namespace PhaenoPortal.App.Features.Accounts.Endpoints;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Common.Exceptions.Conflict;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class DepartmentEndpoints
{
    public static async Task<IResult> ListDepartments(
        Guid organizationId,
        [FromQuery] bool includeInactive,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var actor = await RequireActor(httpContext, dbContext, externalIdentityContext, cancellationToken);
        if (!CanViewOrganization(actor, organizationId))
        {
            return TypedResults.Forbid();
        }

        var query = dbContext.OrganizationDepartments.AsNoTracking()
            .Where(value => value.OrganizationId == organizationId);
        if (!CanManageOrganization(actor, organizationId))
        {
            var membershipId = actor.Memberships
                .Single(value => value.OrganizationId == organizationId && value.IsActive)
                .Id;
            query = query.Where(value => value.IsActive
                && dbContext.OrganizationDepartmentMemberships.Any(access =>
                    access.OrganizationMembershipId == membershipId
                    && access.DepartmentId == value.Id
                    && access.IsActive));
        }
        else if (!includeInactive)
        {
            query = query.Where(value => value.IsActive);
        }

        var departments = await query
            .OrderByDescending(value => value.IsDefault)
            .ThenBy(value => value.Name)
            .ToListAsync(cancellationToken);
        var counts = await dbContext.OrganizationDepartmentMemberships.AsNoTracking()
            .Where(value => value.IsActive
                && departments.Select(department => department.Id).Contains(value.DepartmentId))
            .GroupBy(value => value.DepartmentId)
            .Select(group => new { DepartmentId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(value => value.DepartmentId, value => value.Count, cancellationToken);

        return TypedResults.Ok(departments.Select(value => ToDto(value, counts.GetValueOrDefault(value.Id))).ToList());
    }

    public static async Task<IResult> CreateDepartment(
        Guid organizationId,
        [FromBody] UpsertDepartmentRequest request,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var actor = await RequireActor(httpContext, dbContext, externalIdentityContext, cancellationToken);
        if (!CanManageOrganization(actor, organizationId))
        {
            return TypedResults.Forbid();
        }

        var organizationExists = await dbContext.Organizations.AsNoTracking()
            .AnyAsync(value => value.Id == organizationId && value.IsActive, cancellationToken);
        if (!organizationExists)
        {
            throw new BadRequestException("The organization is inactive or unavailable.");
        }

        var department = Execute(() => new OrganizationDepartment(
            organizationId,
            request.Code,
            request.Name,
            request.Description));
        Execute(() => department.UpdateConfiguration(
            request.PurchaseOrderRequired,
            request.BillingContactEmail,
            request.NotificationEmail,
            request.ShippingInstructions,
            request.ResultDeliveryInstructions));
        dbContext.OrganizationDepartments.Add(department);
        AccountAudit.Add(dbContext, httpContext, nameof(OrganizationDepartment), department.Id,
            AccountAudit.DepartmentCreated, organizationId, actor.Id,
            new { department.Code, department.Name });
        await dbContext.SaveChangesAsync(cancellationToken);
        return TypedResults.Created($"/api/organizations/{organizationId}/departments/{department.Id}", ToDto(department, 0));
    }

    public static async Task<IResult> UpdateDepartment(
        Guid organizationId,
        Guid departmentId,
        [FromBody] UpsertDepartmentRequest request,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var actor = await RequireActor(httpContext, dbContext, externalIdentityContext, cancellationToken);
        if (!CanManageOrganization(actor, organizationId))
        {
            return TypedResults.Forbid();
        }

        var department = await RequireDepartment(dbContext, organizationId, departmentId, cancellationToken);
        EnsureVersion(department.Version, request.Version);
        Execute(() => department.Update(request.Code, request.Name, request.Description));
        Execute(() => department.UpdateConfiguration(
            request.PurchaseOrderRequired,
            request.BillingContactEmail,
            request.NotificationEmail,
            request.ShippingInstructions,
            request.ResultDeliveryInstructions));
        AccountAudit.Add(dbContext, httpContext, nameof(OrganizationDepartment), department.Id,
            AccountAudit.DepartmentUpdated, organizationId, actor.Id,
            new { department.Code, department.Name });
        await dbContext.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(ToDto(department, await ActiveMemberCount(dbContext, department.Id, cancellationToken)));
    }

    public static async Task<IResult> ChangeDepartmentActive(
        Guid organizationId,
        Guid departmentId,
        string lifecycleAction,
        [FromBody] ChangeDepartmentLifecycleRequest request,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var actor = await RequireActor(httpContext, dbContext, externalIdentityContext, cancellationToken);
        if (!CanManageOrganization(actor, organizationId))
        {
            return TypedResults.Forbid();
        }

        var department = await RequireDepartment(dbContext, organizationId, departmentId, cancellationToken);
        EnsureVersion(department.Version, request.Version);
        if (lifecycleAction == "deactivate")
        {
            var wouldStrandMembers = await dbContext.OrganizationDepartmentMemberships.AsNoTracking()
                .AnyAsync(value => value.DepartmentId == departmentId && value.IsActive
                    && value.OrganizationMembership.IsActive
                    && !value.OrganizationMembership.IsOrganizationAdmin
                    && !dbContext.OrganizationDepartmentMemberships.Any(other =>
                        other.OrganizationMembershipId == value.OrganizationMembershipId
                        && other.DepartmentId != departmentId && other.IsActive && other.Department.IsActive),
                    cancellationToken);
            if (wouldStrandMembers)
            {
                throw new BadRequestException("Assign each active member to another department before deactivating this department.");
            }

            Execute(department.Deactivate);
            foreach (var assignment in await dbContext.OrganizationDepartmentMemberships
                         .Where(value => value.DepartmentId == department.Id && value.IsActive)
                         .ToListAsync(cancellationToken))
            {
                assignment.Deactivate();
            }
        }
        else
        {
            department.Reactivate();
        }

        AccountAudit.Add(dbContext, httpContext, nameof(OrganizationDepartment), department.Id,
            lifecycleAction == "deactivate" ? AccountAudit.DepartmentDeactivated : AccountAudit.DepartmentReactivated,
            organizationId, actor.Id, new { department.Code, department.Name });
        await dbContext.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(ToDto(department, await ActiveMemberCount(dbContext, department.Id, cancellationToken)));
    }

    public static async Task<IResult> SetDefaultDepartment(
        Guid organizationId,
        Guid departmentId,
        [FromBody] SetDefaultDepartmentRequest request,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var actor = await RequireActor(httpContext, dbContext, externalIdentityContext, cancellationToken);
        if (!CanManageOrganization(actor, organizationId))
        {
            return TypedResults.Forbid();
        }

        var department = await RequireDepartment(dbContext, organizationId, departmentId, cancellationToken);
        EnsureVersion(department.Version, request.Version);
        if (!department.IsActive)
        {
            throw new BadRequestException("An inactive department cannot be the default.");
        }

        var currentDefault = await dbContext.OrganizationDepartments
            .SingleAsync(value => value.OrganizationId == organizationId && value.IsDefault, cancellationToken);
        if (currentDefault.Id != department.Id)
        {
            await using var ownedTransaction = dbContext.Database.CurrentTransaction is null
                ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
            var transaction = dbContext.Database.CurrentTransaction!;
            const string savepoint = "department_default_change";
            await transaction.CreateSavepointAsync(savepoint, cancellationToken);
            try
            {
                // PostgreSQL's partial unique index is immediate. Clear the old
                // default first, but keep both writes in one atomic transaction.
                currentDefault.ClearDefault();
                await dbContext.SaveChangesAsync(cancellationToken);
                department.MakeDefault();
                AccountAudit.Add(dbContext, httpContext, nameof(OrganizationDepartment), department.Id,
                    AccountAudit.DepartmentMadeDefault, organizationId, actor.Id,
                    new { PreviousDepartmentId = currentDefault.Id, department.Code, department.Name });
                await dbContext.SaveChangesAsync(cancellationToken);
                await transaction.ReleaseSavepointAsync(savepoint, cancellationToken);
                if (ownedTransaction is not null) await ownedTransaction.CommitAsync(cancellationToken);
            }
            catch
            {
                await transaction.RollbackToSavepointAsync(savepoint, CancellationToken.None);
                throw;
            }
        }

        return TypedResults.Ok(ToDto(department, await ActiveMemberCount(dbContext, department.Id, cancellationToken)));
    }

    public static async Task<IResult> ListDepartmentMembers(
        Guid organizationId,
        Guid departmentId,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var actor = await RequireActor(httpContext, dbContext, externalIdentityContext, cancellationToken);
        if (!await CanManageDepartment(actor, organizationId, departmentId, dbContext, cancellationToken))
        {
            return TypedResults.Forbid();
        }

        var assignments = await dbContext.OrganizationDepartmentMemberships.AsNoTracking()
            .Include(value => value.OrganizationMembership).ThenInclude(value => value.User)
            .Include(value => value.Department)
            .Where(value => value.DepartmentId == departmentId
                && value.Department.OrganizationId == organizationId
                && value.OrganizationMembership.OrganizationId == organizationId)
            .OrderBy(value => value.OrganizationMembership.User!.LastName)
            .ThenBy(value => value.OrganizationMembership.User!.FirstName)
            .ToListAsync(cancellationToken);
        return TypedResults.Ok(assignments.Select(ToDto).ToList());
    }

    public static async Task<IResult> UpsertDepartmentMember(
        Guid organizationId,
        Guid departmentId,
        Guid organizationMembershipId,
        [FromBody] UpsertDepartmentMembershipRequest request,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var actor = await RequireActor(httpContext, dbContext, externalIdentityContext, cancellationToken);
        if (!await CanManageDepartment(actor, organizationId, departmentId, dbContext, cancellationToken))
        {
            return TypedResults.Forbid();
        }

        var department = await RequireDepartment(dbContext, organizationId, departmentId, cancellationToken);
        if (!department.IsActive)
        {
            throw new BadRequestException("Users cannot be assigned to an inactive department.");
        }

        var organizationMembership = await dbContext.OrganizationMemberships
            .Include(value => value.User)
            .SingleOrDefaultAsync(value => value.Id == organizationMembershipId
                && value.OrganizationId == organizationId
                && value.IsActive, cancellationToken)
            ?? throw new BadRequestException("The active organization membership was not found.");
        var assignment = await dbContext.OrganizationDepartmentMemberships
            .Include(value => value.Department)
            .SingleOrDefaultAsync(value => value.OrganizationMembershipId == organizationMembershipId
                && value.DepartmentId == departmentId, cancellationToken);
        if (assignment is null)
        {
            if (request.Version.HasValue)
            {
                throw new DbUpdateConcurrencyException();
            }
            assignment = new OrganizationDepartmentMembership(organizationMembershipId, departmentId, request.IsDepartmentAdmin);
            dbContext.OrganizationDepartmentMemberships.Add(assignment);
        }
        else
        {
            EnsureVersion(assignment.Version, request.Version);
            assignment.SetDepartmentAdmin(request.IsDepartmentAdmin);
            assignment.Reactivate();
        }

        AccountAudit.Add(dbContext, httpContext, nameof(OrganizationDepartmentMembership), assignment.Id,
            AccountAudit.DepartmentMembershipUpdated, organizationId, actor.Id,
            new { organizationMembership.UserId, DepartmentId = departmentId, assignment.IsDepartmentAdmin, IsActive = true });
        await dbContext.SaveChangesAsync(cancellationToken);
        assignment = await dbContext.OrganizationDepartmentMemberships
            .Include(value => value.OrganizationMembership).ThenInclude(value => value.User)
            .Include(value => value.Department)
            .SingleAsync(value => value.Id == assignment.Id, cancellationToken);
        return TypedResults.Ok(ToDto(assignment));
    }

    public static async Task<IResult> DeactivateDepartmentMember(
        Guid organizationId,
        Guid departmentId,
        Guid organizationMembershipId,
        [FromBody] UpsertDepartmentMembershipRequest request,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var actor = await RequireActor(httpContext, dbContext, externalIdentityContext, cancellationToken);
        if (!await CanManageDepartment(actor, organizationId, departmentId, dbContext, cancellationToken))
        {
            return TypedResults.Forbid();
        }

        var organizationMembership = await dbContext.OrganizationMemberships.AsNoTracking()
            .SingleOrDefaultAsync(value => value.Id == organizationMembershipId
                && value.OrganizationId == organizationId, cancellationToken)
            ?? throw new BadRequestException("The organization membership was not found.");
        var assignment = await dbContext.OrganizationDepartmentMemberships
            .Include(value => value.OrganizationMembership).ThenInclude(value => value.User)
            .Include(value => value.Department)
            .SingleOrDefaultAsync(value => value.OrganizationMembershipId == organizationMembershipId
                && value.DepartmentId == departmentId, cancellationToken)
            ?? throw new BadRequestException("The department assignment was not found.");
        EnsureVersion(assignment.Version, request.Version);

        if (organizationMembership.IsActive && !organizationMembership.IsOrganizationAdmin)
        {
            var otherActiveCount = await dbContext.OrganizationDepartmentMemberships.AsNoTracking()
                .CountAsync(value => value.OrganizationMembershipId == organizationMembershipId
                    && value.DepartmentId != departmentId
                    && value.IsActive
                    && value.Department.IsActive, cancellationToken);
            if (otherActiveCount == 0)
            {
                throw new BadRequestException("An active organization member must retain at least one active department.");
            }
        }

        assignment.Deactivate();
        AccountAudit.Add(dbContext, httpContext, nameof(OrganizationDepartmentMembership), assignment.Id,
            AccountAudit.DepartmentMembershipUpdated, organizationId, actor.Id,
            new { organizationMembership.UserId, DepartmentId = departmentId, IsActive = false });
        await dbContext.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(ToDto(assignment));
    }

    public static void MapDepartmentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/organizations/{organizationId:guid}/departments")
            .WithTags("Departments")
            .RequireAuthorization();
        group.MapGet("/", ListDepartments).Produces<List<DepartmentDto>>();
        group.MapPost("/", CreateDepartment).Produces<DepartmentDto>(StatusCodes.Status201Created);
        group.MapPut("/{departmentId:guid}", UpdateDepartment).Produces<DepartmentDto>();
        group.MapPost("/{departmentId:guid}/{lifecycleAction:regex(^(deactivate|reactivate)$)}", ChangeDepartmentActive)
            .Produces<DepartmentDto>();
        group.MapPost("/{departmentId:guid}/default", SetDefaultDepartment).Produces<DepartmentDto>();
        group.MapGet("/{departmentId:guid}/members", ListDepartmentMembers).Produces<List<DepartmentMembershipDto>>();
        group.MapPut("/{departmentId:guid}/members/{organizationMembershipId:guid}", UpsertDepartmentMember)
            .Produces<DepartmentMembershipDto>();
        group.MapPost("/{departmentId:guid}/members/{organizationMembershipId:guid}/deactivate", DeactivateDepartmentMember)
            .Produces<DepartmentMembershipDto>();
    }

    private static async Task<User> RequireActor(
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken) =>
        await AccountAccess.ReadActiveActorAsync(httpContext, dbContext, externalIdentityContext, cancellationToken)
        ?? throw new BadRequestException("An active Portal user is required.");

    private static bool CanViewOrganization(User actor, Guid organizationId) =>
        AccountAuthorization.IsPlatformAdmin(actor)
        || AccountAuthorization.HasActiveMembership(actor, organizationId);

    private static bool CanManageOrganization(User actor, Guid organizationId) =>
        AccountAuthorization.IsPlatformAdmin(actor)
        || AccountAuthorization.IsOrganizationAdmin(actor, organizationId);

    private static async Task<bool> CanManageDepartment(
        User actor,
        Guid organizationId,
        Guid departmentId,
        PSeqOperationsDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (!await dbContext.OrganizationDepartments.AsNoTracking().AnyAsync(value =>
                value.Id == departmentId && value.OrganizationId == organizationId
                && value.Organization.IsActive, cancellationToken))
        {
            return false;
        }

        if (CanManageOrganization(actor, organizationId))
        {
            return true;
        }

        return await dbContext.OrganizationDepartmentMemberships.AsNoTracking().AnyAsync(value =>
            value.DepartmentId == departmentId
            && value.Department.OrganizationId == organizationId
            && value.Department.IsActive
            && value.IsActive
            && value.IsDepartmentAdmin
            && value.OrganizationMembership.UserId == actor.Id
            && value.OrganizationMembership.OrganizationId == organizationId
            && value.OrganizationMembership.IsActive,
            cancellationToken);
    }

    private static async Task<OrganizationDepartment> RequireDepartment(
        PSeqOperationsDbContext dbContext,
        Guid organizationId,
        Guid departmentId,
        CancellationToken cancellationToken) =>
        await dbContext.OrganizationDepartments.SingleOrDefaultAsync(value =>
            value.Id == departmentId && value.OrganizationId == organizationId, cancellationToken)
        ?? throw new BadRequestException("The department was not found.");

    private static async Task<int> ActiveMemberCount(
        PSeqOperationsDbContext dbContext,
        Guid departmentId,
        CancellationToken cancellationToken) =>
        await dbContext.OrganizationDepartmentMemberships.AsNoTracking()
            .CountAsync(value => value.DepartmentId == departmentId && value.IsActive, cancellationToken);

    private static DepartmentDto ToDto(OrganizationDepartment value, int activeMemberCount) => new()
    {
        Id = value.Id,
        OrganizationId = value.OrganizationId,
        Code = value.Code,
        Name = value.Name,
        Description = value.Description,
        IsDefault = value.IsDefault,
        IsActive = value.IsActive,
        PurchaseOrderRequired = value.PurchaseOrderRequired,
        BillingContactEmail = value.BillingContactEmail,
        NotificationEmail = value.NotificationEmail,
        ShippingInstructions = value.ShippingInstructions,
        ResultDeliveryInstructions = value.ResultDeliveryInstructions,
        ActiveMemberCount = activeMemberCount,
        CreatedAt = value.CreatedAt,
        UpdatedAt = value.UpdatedAt,
        Version = value.Version
    };

    private static DepartmentMembershipDto ToDto(OrganizationDepartmentMembership value) => new()
    {
        Id = value.Id,
        OrganizationMembershipId = value.OrganizationMembershipId,
        UserId = value.OrganizationMembership.UserId,
        UserName = $"{value.OrganizationMembership.User?.FirstName} {value.OrganizationMembership.User?.LastName}".Trim(),
        UserEmail = value.OrganizationMembership.User?.Email ?? string.Empty,
        DepartmentId = value.DepartmentId,
        DepartmentName = value.Department.Name,
        IsDepartmentAdmin = value.IsDepartmentAdmin,
        IsActive = value.IsActive,
        Version = value.Version
    };

    private static void EnsureVersion(long current, long? requested)
    {
        if (!requested.HasValue || current != requested.Value)
        {
            throw new DbUpdateConcurrencyException();
        }
    }

    private static void Execute(Action action)
    {
        try
        {
            action();
        }
        catch (Exception exception) when (exception is ArgumentException or InvalidOperationException)
        {
            throw new BadRequestException(exception.Message);
        }
    }

    private static T Execute<T>(Func<T> action)
    {
        try
        {
            return action();
        }
        catch (Exception exception) when (exception is ArgumentException or InvalidOperationException)
        {
            throw new BadRequestException(exception.Message);
        }
    }
}
