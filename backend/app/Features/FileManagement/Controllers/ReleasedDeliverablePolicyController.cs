namespace PhaenoPortal.App.Features.FileManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.DTOs;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api")]
public sealed class ReleasedDeliverablePolicyController(
    PSeqOperationsDbContext dbContext,
    IExternalIdentityContext externalIdentityContext) : ControllerBase
{
    [HttpGet("file-management/released-deliverable-policy")]
    public async Task<ReleasedDeliverablePolicyConfigurationDto> GetGlobal(
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var current = await EnsureGlobalAsync(actor.Id, cancellationToken);
        return await MapGlobalAsync(current, cancellationToken);
    }

    [HttpPatch("file-management/released-deliverable-policy")]
    public async Task<ReleasedDeliverablePolicyConfigurationDto> UpdateGlobal(
        [FromBody] UpdateReleasedDeliverablePolicyRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var current = await EnsureGlobalAsync(actor.Id, cancellationToken);
        EnsureVersion(current.Version, request.Version);

        var values = CreateValues(
            request.StandardRetentionDays,
            request.UndownloadedWarningLeadDays,
            request.UndownloadedGraceDays);
        if (current.ReadValues() == values)
        {
            throw Conflict(
                "released_deliverable_policy_unchanged",
                "Change at least one global retention value.");
        }

        var reason = NormalizeReason(request.Reason);
        var nextRevision = current.Revision + 1;
        var now = DateTime.UtcNow;

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        current.Deactivate(now, actor.Id, $"Superseded by global policy revision {nextRevision}.");
        await dbContext.SaveChangesAsync(cancellationToken);

        var replacement = new ReleasedDeliverablePolicyDefault(
            nextRevision,
            values,
            reason,
            current.Id);
        dbContext.ReleasedDeliverablePolicyDefaults.Add(replacement);
        AccountAudit.Add(
            dbContext,
            HttpContext,
            nameof(ReleasedDeliverablePolicyDefault),
            replacement.Id,
            "ReleasedDeliverablePolicyDefaultsChanged",
            organizationId: null,
            actor.Id,
            new
            {
                priorPolicyId = current.Id,
                priorRevision = current.Revision,
                replacement.Revision,
                replacement.StandardRetentionDays,
                replacement.UndownloadedWarningLeadDays,
                replacement.UndownloadedGraceDays,
                reason
            });
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await MapGlobalAsync(replacement, cancellationToken);
    }

    [HttpGet("organizations/{organizationId:guid}/released-deliverable-policy")]
    public async Task<OrganizationReleasedDeliverablePolicyDto> GetOrganizationPolicy(
        Guid organizationId,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var organization = await RequireExternalOrganizationAsync(organizationId, cancellationToken);
        var global = await EnsureGlobalAsync(actor.Id, cancellationToken);
        return await MapOrganizationAsync(organization, global, cancellationToken);
    }

    [HttpPut("organizations/{organizationId:guid}/released-deliverable-policy/override")]
    public async Task<OrganizationReleasedDeliverablePolicyDto> UpsertOrganizationOverride(
        Guid organizationId,
        [FromBody] UpsertOrganizationReleasedDeliverablePolicyOverrideRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var organization = await RequireExternalOrganizationAsync(organizationId, cancellationToken);
        var global = await EnsureGlobalAsync(actor.Id, cancellationToken);
        EnsureVersion(global.Version, request.GlobalVersion);

        var current = await dbContext.OrganizationReleasedDeliverablePolicyOverrides
            .FirstOrDefaultAsync(
                item => item.OrganizationId == organizationId && item.IsActive,
                cancellationToken);
        if (current == null)
        {
            if (request.OverrideVersion.HasValue)
            {
                throw new DbUpdateConcurrencyException();
            }
        }
        else
        {
            EnsureVersion(current.Version, request.OverrideVersion);
            if (current.StandardRetentionDays == request.StandardRetentionDays
                && current.UndownloadedWarningLeadDays == request.UndownloadedWarningLeadDays
                && current.UndownloadedGraceDays == request.UndownloadedGraceDays)
            {
                throw Conflict(
                    "released_deliverable_override_unchanged",
                    "Change at least one organization override value.");
            }
        }

        var revision = await dbContext.OrganizationReleasedDeliverablePolicyOverrides
            .Where(item => item.OrganizationId == organizationId)
            .Select(item => (int?)item.Revision)
            .MaxAsync(cancellationToken) ?? 0;
        revision++;

        OrganizationReleasedDeliverablePolicyOverride replacement;
        try
        {
            replacement = new OrganizationReleasedDeliverablePolicyOverride(
                organizationId,
                revision,
                request.StandardRetentionDays,
                request.UndownloadedWarningLeadDays,
                request.UndownloadedGraceDays,
                global.ReadValues(),
                request.Reason,
                current?.Id);
        }
        catch (ArgumentException exception)
        {
            throw Invalid("released_deliverable_override_invalid", exception.Message);
        }

        var now = DateTime.UtcNow;
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        if (current != null)
        {
            current.Deactivate(now, actor.Id, $"Superseded by organization override revision {revision}.");
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        dbContext.OrganizationReleasedDeliverablePolicyOverrides.Add(replacement);
        AccountAudit.Add(
            dbContext,
            HttpContext,
            nameof(OrganizationReleasedDeliverablePolicyOverride),
            replacement.Id,
            "OrganizationReleasedDeliverablePolicyOverrideChanged",
            organization.Id,
            actor.Id,
            new
            {
                organization.Name,
                organization.Kind,
                priorOverrideId = current?.Id,
                replacement.Revision,
                replacement.StandardRetentionDays,
                replacement.UndownloadedWarningLeadDays,
                replacement.UndownloadedGraceDays,
                replacement.ChangeReason
            });
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await MapOrganizationAsync(organization, global, cancellationToken);
    }

    [HttpDelete("organizations/{organizationId:guid}/released-deliverable-policy/override")]
    public async Task<OrganizationReleasedDeliverablePolicyDto> RemoveOrganizationOverride(
        Guid organizationId,
        [FromBody] RemoveOrganizationReleasedDeliverablePolicyOverrideRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var organization = await RequireExternalOrganizationAsync(organizationId, cancellationToken);
        var global = await EnsureGlobalAsync(actor.Id, cancellationToken);
        var current = await dbContext.OrganizationReleasedDeliverablePolicyOverrides
            .FirstOrDefaultAsync(
                item => item.OrganizationId == organizationId && item.IsActive,
                cancellationToken)
            ?? throw Missing(
                "released_deliverable_override_not_found",
                "The organization has no active released-deliverable override.");
        EnsureVersion(current.Version, request.Version);

        var reason = NormalizeReason(request.Reason);
        current.Deactivate(DateTime.UtcNow, actor.Id, reason);
        AccountAudit.Add(
            dbContext,
            HttpContext,
            nameof(OrganizationReleasedDeliverablePolicyOverride),
            current.Id,
            "OrganizationReleasedDeliverablePolicyOverrideRemoved",
            organization.Id,
            actor.Id,
            new
            {
                organization.Name,
                organization.Kind,
                current.Revision,
                reason
            });
        await dbContext.SaveChangesAsync(cancellationToken);

        return await MapOrganizationAsync(organization, global, cancellationToken);
    }

    private async Task<User> RequirePlatformAdminAsync(CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(
            HttpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken)
            ?? throw new FileManagementException(
                "active_actor_required",
                "An active portal user is required.",
                StatusCodes.Status401Unauthorized);

        if (!AccountAuthorization.IsPlatformAdmin(actor))
        {
            throw new FileManagementException(
                "file_management_configuration_required",
                "This Phaeno operation requires file-management configuration access.",
                StatusCodes.Status403Forbidden);
        }

        return actor;
    }

    private async Task<Organization> RequireExternalOrganizationAsync(
        Guid organizationId,
        CancellationToken cancellationToken)
    {
        return await dbContext.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.Id == organizationId
                    && item.Kind != OrganizationKind.Phaeno,
                cancellationToken)
            ?? throw Missing(
                "released_deliverable_policy_organization_not_found",
                "The Customer, Partner, or Prospect organization was not found.");
    }

    private async Task<ReleasedDeliverablePolicyDefault> EnsureGlobalAsync(
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var current = await dbContext.ReleasedDeliverablePolicyDefaults
            .FirstOrDefaultAsync(item => item.IsActive, cancellationToken);
        if (current != null)
        {
            return current;
        }

        var revision = await dbContext.ReleasedDeliverablePolicyDefaults
            .Select(item => (int?)item.Revision)
            .MaxAsync(cancellationToken) ?? 0;
        var initial = new ReleasedDeliverablePolicyDefault(
            revision + 1,
            ReleasedDeliverablePolicyValues.Create(
                ReleasedDeliverablePolicyDefault.InitialStandardRetentionDays,
                ReleasedDeliverablePolicyDefault.InitialWarningLeadDays,
                ReleasedDeliverablePolicyDefault.InitialGraceDays),
            "Initialized the approved global 30-day retention, 5-day warning, and 5-day grace defaults.");
        dbContext.ReleasedDeliverablePolicyDefaults.Add(initial);
        AccountAudit.Add(
            dbContext,
            HttpContext,
            nameof(ReleasedDeliverablePolicyDefault),
            initial.Id,
            "ReleasedDeliverablePolicyDefaultsInitialized",
            organizationId: null,
            actorUserId,
            new
            {
                initial.Revision,
                initial.StandardRetentionDays,
                initial.UndownloadedWarningLeadDays,
                initial.UndownloadedGraceDays
            });
        await dbContext.SaveChangesAsync(cancellationToken);
        return initial;
    }

    private async Task<ReleasedDeliverablePolicyConfigurationDto> MapGlobalAsync(
        ReleasedDeliverablePolicyDefault current,
        CancellationToken cancellationToken)
    {
        var history = await dbContext.ReleasedDeliverablePolicyDefaults
            .AsNoTracking()
            .OrderByDescending(item => item.Revision)
            .ToListAsync(cancellationToken);
        return new ReleasedDeliverablePolicyConfigurationDto(
            Map(current),
            history.Select(Map).ToList());
    }

    private async Task<OrganizationReleasedDeliverablePolicyDto> MapOrganizationAsync(
        Organization organization,
        ReleasedDeliverablePolicyDefault global,
        CancellationToken cancellationToken)
    {
        var history = await dbContext.OrganizationReleasedDeliverablePolicyOverrides
            .AsNoTracking()
            .Where(item => item.OrganizationId == organization.Id)
            .OrderByDescending(item => item.Revision)
            .ToListAsync(cancellationToken);
        var activeOverride = history.FirstOrDefault(item => item.IsActive);
        var globalValues = global.ReadValues();
        var effective = activeOverride?.Resolve(globalValues) ?? globalValues;

        return new OrganizationReleasedDeliverablePolicyDto(
            organization.Id,
            organization.Name,
            organization.Kind.ToString(),
            Map(global),
            activeOverride == null ? null : Map(activeOverride),
            new EffectiveReleasedDeliverablePolicyDto(
                effective.StandardRetentionDays,
                activeOverride?.StandardRetentionDays.HasValue == true
                    ? "organizationOverride"
                    : "global",
                effective.UndownloadedWarningLeadDays,
                activeOverride?.UndownloadedWarningLeadDays.HasValue == true
                    ? "organizationOverride"
                    : "global",
                effective.UndownloadedGraceDays,
                activeOverride?.UndownloadedGraceDays.HasValue == true
                    ? "organizationOverride"
                    : "global"),
            history.Select(Map).ToList());
    }

    private static ReleasedDeliverablePolicyVersionDto Map(
        ReleasedDeliverablePolicyDefault policy) => new(
        policy.Id,
        policy.Revision,
        new ReleasedDeliverablePolicyValuesDto(
            policy.StandardRetentionDays,
            policy.UndownloadedWarningLeadDays,
            policy.UndownloadedGraceDays),
        policy.ChangeReason,
        policy.SupersedesPolicyId,
        policy.IsActive,
        policy.DeactivatedAt,
        policy.DeactivatedByUserId,
        policy.DeactivationReason,
        policy.CreatedAt,
        policy.CreatedByUserId,
        policy.Version);

    private static OrganizationReleasedDeliverablePolicyOverrideDto Map(
        OrganizationReleasedDeliverablePolicyOverride policy) => new(
        policy.Id,
        policy.OrganizationId,
        policy.Revision,
        policy.StandardRetentionDays,
        policy.UndownloadedWarningLeadDays,
        policy.UndownloadedGraceDays,
        policy.ChangeReason,
        policy.SupersedesOverrideId,
        policy.IsActive,
        policy.DeactivatedAt,
        policy.DeactivatedByUserId,
        policy.DeactivationReason,
        policy.CreatedAt,
        policy.CreatedByUserId,
        policy.Version);

    private static ReleasedDeliverablePolicyValues CreateValues(
        int standardRetentionDays,
        int warningLeadDays,
        int graceDays)
    {
        try
        {
            return ReleasedDeliverablePolicyValues.Create(
                standardRetentionDays,
                warningLeadDays,
                graceDays);
        }
        catch (ArgumentException exception)
        {
            throw Invalid("released_deliverable_policy_invalid", exception.Message);
        }
    }

    private static string NormalizeReason(string reason)
    {
        try
        {
            return ReleasedDeliverablePolicyDefault.NormalizeReason(reason);
        }
        catch (ArgumentException exception)
        {
            throw Invalid("released_deliverable_policy_reason_invalid", exception.Message);
        }
    }

    private static void EnsureVersion(long current, long? supplied)
    {
        if (!supplied.HasValue || current != supplied.Value)
        {
            throw new DbUpdateConcurrencyException();
        }
    }

    private static FileManagementException Invalid(string code, string message) => new(code, message);

    private static FileManagementException Conflict(string code, string message) =>
        new(code, message, StatusCodes.Status409Conflict);

    private static FileManagementException Missing(string code, string message) =>
        new(code, message, StatusCodes.Status404NotFound);
}
