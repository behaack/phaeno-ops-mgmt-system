namespace PhaenoPortal.App.Features.Trials.Services;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Trials.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.Trials.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;

public sealed class TrialReader(PSeqOperationsDbContext db, TrialWorkflowService workflow, IOptions<PSeqOrderToCashOptions>? pseq = null, IOptions<OrderManagementOptions>? orders = null)
{
    public async Task<IReadOnlyList<TrialListDto>> ListAsync(TrialActor actor, string? search, CancellationToken token, string? status = null, Guid? ownerId = null)
    {
        var query = TrialAccess.Scope(workflow.Query, actor);
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(value => value.Number.Contains(search.Trim())
            || db.CrmCompanies.Any(company => company.Id == value.CompanyId && company.Name.Contains(search.Trim())));
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (status == "OnHold") query = query.Where(value => value.IsOnHold);
            else if (Enum.TryParse<TrialStatus>(status, out var parsed)) query = query.Where(value => value.Status == parsed);
        }
        if (actor.IsStaff && ownerId.HasValue) query = query.Where(value => value.SalesOwnerUserId == ownerId);
        var projects = await query.OrderByDescending(value => value.UpdatedAt).Take(250).ToListAsync(token);
        var companyIds = projects.Select(value => value.CompanyId).Distinct().ToArray();
        var names = await db.CrmCompanies.AsNoTracking().Where(value => companyIds.Contains(value.Id)).ToDictionaryAsync(value => value.Id, value => value.Name, token);
        var ownerIds = projects.Select(value => value.SalesOwnerUserId).Distinct().ToList();
        var owners = actor.IsStaff ? await db.Users.Where(value => ownerIds.Contains(value.Id)).ToDictionaryAsync(value => value.Id, value => value.FirstName + " " + value.LastName, token) : new Dictionary<Guid, string>();
        return projects.Select(value =>
        {
            var scope = VisibleScope(value, actor)?.Read();
            return new TrialListDto(value.Id, value.Number, scope?.Name ?? "Trial request", names[value.CompanyId], value.Status.ToString(),
                value.IsOnHold, value.Samples.Count, scope?.SampleAllowance, scope?.SubmissionClosesAtUtc, value.UpdatedAt, value.Version, actor.IsStaff ? value.SalesOwnerUserId : null, actor.IsStaff ? owners.GetValueOrDefault(value.SalesOwnerUserId) : null, value.CreatedAt, actor.IsStaff ? value.FollowUpAtUtc ?? scope?.SubmissionClosesAtUtc : scope?.SubmissionClosesAtUtc);
        }).ToList();
    }
    public async Task<TrialDetailDto> DetailAsync(TrialProject trial, TrialActor actor, CancellationToken token)
    {
        var now = DateTime.UtcNow;
        var name = await db.CrmCompanies.AsNoTracking().Where(value => value.Id == trial.CompanyId).Select(value => value.Name).SingleAsync(token);
        var domains = actor.IsStaff ? await db.TrialApprovalAuthorities.AsNoTracking().Where(value => value.UserId == actor.User.Id && value.RevokedAtUtc == null && value.EffectiveAtUtc <= now
            && (value.IsPrimary || db.TrialApprovalAuthorities.Any(primary => primary.Id == value.PrimaryAuthorityId && primary.RevokedAtUtc == null)))
            .Select(value => value.Domain.ToString()).ToListAsync(token) : [];
        var sampleIds = trial.Samples.Select(value => value.AuthorizationId).ToList();
        var projections = await db.CommercialLabWorkProjections.AsNoTracking().Where(value => sampleIds.Contains(value.AuthorizationId)).ToDictionaryAsync(value => value.AuthorizationId, token);
        var scopes = trial.Scopes.Where(value => actor.IsStaff || value.IsApproved).OrderByDescending(value => value.Revision).Select(value => MapScope(value, actor.IsStaff)).ToList();
        var scope = VisibleScope(trial, actor);
        var remaining = Math.Max(0, (scope?.Read().SampleAllowance ?? 0) - trial.Samples.Count(value => !value.ReplacesSampleId.HasValue));
        var replacements = await db.TrialReplacementAuthorizations.AsNoTracking().Where(value => value.TrialProjectId == trial.Id).ToListAsync(token);
        var blocker = trial.SubmissionBlocker(now);
        if (blocker is null && !actor.IsOrganizationAdmin) blocker = "An organization administrator submits Trial samples.";
        if (blocker is null && actor.Tenant?.Organization.Kind != OrganizationKind.Prospect) blocker = "New Trial submissions require Prospect status; contact Phaeno for further work.";
        if (blocker is null && remaining == 0 && !replacements.Any(value => !value.UsedBySampleId.HasValue)) blocker = "The approved sample allowance is full.";
        var releases = await db.TrialResultReleases.AsNoTracking().Where(value => value.TrialProjectId == trial.Id).OrderByDescending(value => value.ReleaseVersion).ToListAsync(token);
        var releaseIds = releases.Select(value => value.Id).ToArray();
        var snapshots = await db.ReleasedDeliverableRetentionSnapshots.AsNoTracking().Where(value => value.TrialResultReleaseId != null && releaseIds.Contains(value.TrialResultReleaseId.Value))
            .ToDictionaryAsync(value => value.TrialResultReleaseId!.Value, token);
        var files = await db.ManagedOperationalFiles.AsNoTracking().Where(value => value.WorkflowType == "trial-project" && value.WorkflowId == trial.Id).ToListAsync(token);
        var releaseDtos = new List<TrialReleaseDto>();
        if (releases.Count > 0) now = await RetentionTransaction.ClockAsync(db, token);
        var fileIds = files.Select(value => value.Id).ToList();
        var attempts = releases.Count > 0 ? await db.OperationalFileDownloads.AsNoTracking().Where(value => value.OrganizationId == trial.OrganizationId
            && value.ReleasedPackageType == ReleasedDeliverablePackageType.TrialResult
            && (releaseIds.Contains(value.ReleasedPackageId) || value.ManagedOperationalFileId != null && fileIds.Contains(value.ManagedOperationalFileId.Value))).ToListAsync(token) : [];
        var verified = snapshots.Count > 0 ? await new DownloadCommitEvidenceService(db).ReadCompletionsAsync(attempts, token) : null;
        foreach (var release in releases)
        {
            var ids = ReleasedDeliverableManifest.ReadFileIds(release.ManifestJson);
            var releaseFiles = files.Where(file => ids.Contains(file.Id)).ToList();
            var snapshot = snapshots.GetValueOrDefault(release.Id);
            var download = ReleasedDeliverableDownloadProjection.Create(ids, attempts, now, verified);
            if (snapshot is not null) download = download with { RetentionDecision = ReleasedDeliverableRetentionDecision.Evaluate(snapshot,
                download.Files.Values.Select(value => value.DownloadedAtUtc).ToList(), now) };
            var retention = snapshot?.ToDto(download);
            var unavailable = release.IsWithdrawn ? "Phaeno withdrew this release."
                : trial.CompleteReleaseId.HasValue && !release.IsCompletePackage ? "Superseded by the complete Trial package; retained as release history."
                : trial.IsOnHold ? "Downloads are paused while this Trial is on hold."
                : snapshot?.IsQuarantined == true ? "Access is suspended. Contact Phaeno."
                : snapshot?.ByteDeletedAtUtc is not null ? "Files were deleted. Contact Phaeno for an authorized reissue."
                : retention?.DownloadAccessClosedAtUtc is not null ? "The download period has ended. Contact Phaeno for an authorized reissue."
                : orders?.Value.ReleasedDeliverableRetentionEnforcement != true ? "Downloads are awaiting Phaeno configuration."
                : releaseFiles.Count == 0 || releaseFiles.Count != ids.Count || releaseFiles.Any(file => file.ReleaseStatus != FileReleaseStatus.Released || file.ScanStatus != OperationalFileScanStatus.Clean) ? "Some files are unavailable. Refresh this Trial or contact Phaeno."
                : null;
            releaseDtos.Add(new(release.Id, release.ReleaseVersion, release.ScopeRevision, release.IsCompletePackage, release.IsWithdrawn,
                release.ReleasedAtUtc, snapshot?.Id, releaseFiles.Select(file => new TrialFileDto(file.Id, file.FileName, file.FileKind, file.SizeBytes, file.Sha256)).ToList(),
                !actor.IsStaff && unavailable is null, unavailable, retention));
        }
        var timeline = await db.TrialEvents.AsNoTracking().Where(value => value.TrialProjectId == trial.Id && (actor.IsStaff || value.Kind != "commercial-outcome"))
            .OrderByDescending(value => value.OccurredAtUtc).Take(100).Select(value => new TrialTimelineDto(value.Kind, value.Summary, value.OccurredAtUtc)).ToListAsync(token);
        return new(trial.Id, trial.Number, name, actor.IsStaff ? trial.CompanyId : Guid.Empty, actor.IsStaff ? trial.OpportunityId : Guid.Empty,
            trial.OrganizationId, trial.DepartmentId, trial.Status.ToString(), trial.Version, actor.IsStaff, actor.IsStaff,
            actor.IsOrganizationAdmin && actor.Tenant?.Organization.Kind == OrganizationKind.Prospect && !trial.IsOnHold && trial.Status == TrialStatus.AwaitingAcceptance
                && scope?.Read().SubmissionClosesAtUtc > now,
            !actor.IsStaff && blocker is null, blocker, domains, remaining, trial.IsOnHold, trial.HoldReason,
            trial.ScheduleEstimate, trial.ClosureReason, trial.ClosedAtUtc, trial.ResidualRetainUntilUtc, trial.ActualMaterialDisposition,
            actor.IsStaff ? trial.CommercialOutcome?.ToString() : null, actor.IsStaff ? trial.CommercialOutcomeReason : null,
            actor.IsStaff ? trial.FollowUpOwnerUserId : null, actor.IsStaff ? trial.FollowUpAtUtc : null,
            trial.ApprovedScopeRevision, trial.AcceptedScopeRevision, scope is null ? null : MapScope(scope, actor.IsStaff), scopes,
            trial.Samples.OrderBy(value => value.SubmittedAtUtc).Select(value => new TrialSampleDto(value.Id, value.Reference, value.BiologicalSource,
                value.TubeCount, value.Status, projections.GetValueOrDefault(value.AuthorizationId)?.Milestone,
                projections.GetValueOrDefault(value.AuthorizationId)?.CustomerSafeSummary, actor.IsStaff ? value.LabWorkOrderId : null,
                value.ReplacesSampleId, value.OutcomeReason, value.SubmittedAtUtc)).ToList(),
            replacements.Select(value => new TrialReplacementDto(value.Id, value.OriginalSampleId, value.PhaenoCausedFailure, value.Reason, value.UsedBySampleId)).ToList(),
            releaseDtos, timeline, actor.IsStaff ? await db.TrialEvents.CountAsync(value => value.TrialProjectId == trial.Id && !db.CrmActivities.Any(activity => activity.Id == value.Id), token) : 0,
            actor.IsStaff && (actor.IsPlatformAdmin || domains.Contains("Commercial") || await db.BusinessRoleAssignments.AnyAsync(value => value.UserId == actor.User.Id && value.IsActive && value.Role == BusinessRole.CommercialOperator, token)),
            actor.IsPlatformAdmin && trial.IsTerminal && trial.CommercialOutcome == TrialCommercialOutcome.ClosedWithoutConversion
                && await db.Organizations.AnyAsync(value => value.Id == trial.OrganizationId && value.IsActive && value.Kind == OrganizationKind.Prospect, token),
            actor.IsStaff && (actor.IsPlatformAdmin && !(pseq?.Value.BusinessRoles == true || pseq?.Value.DualControlEnforced == true)
                || await db.BusinessRoleAssignments.AnyAsync(value => value.UserId == actor.User.Id && value.IsActive && value.Role == BusinessRole.ResultReleaseManager, token)));
    }
    public async Task<TrialConfigurationDto> ConfigurationAsync(TrialActor actor, Guid? companyId, CancellationToken token)
    {
        var now = DateTime.UtcNow;
        var primaryDomains = actor.IsStaff ? await db.TrialApprovalAuthorities.AsNoTracking().Where(value => value.UserId == actor.User.Id && value.IsPrimary && value.RevokedAtUtc == null)
            .Select(value => value.Domain.ToString()).ToListAsync(token) : [];
        var handoffs = actor.IsStaff ? await db.CrmHandoffs.AsNoTracking().Where(value => value.Type == CrmHandoffType.TrialProject
            && value.RelationshipRequest.Status != PSeq.Operations.Commercial.Relationships.Domain.PortalIntegrationRequestStatus.Declined
            && value.RelationshipRequest.Status != PSeq.Operations.Commercial.Relationships.Domain.PortalIntegrationRequestStatus.Cancelled
            && value.Company.IsActive && value.OpportunityId != null && value.Opportunity!.IsActive && !db.TrialProjects.Any(trial => trial.CrmHandoffId == value.Id))
            .Select(value => new TrialHandoffChoiceDto(value.Id, value.Company.Name, value.Opportunity!.Name, value.RelationshipRequest.Summary)).Take(250).ToListAsync(token) : [];
        var analyses = actor.IsStaff ? await (from analysis in db.AnalysisDefinitions.AsNoTracking()
            join catalog in db.QboCatalogItems on analysis.QboCatalogItemId equals catalog.Id
            where analysis.IsActive && !analysis.IsSynthetic && catalog.ExternalItemId == OrderServiceKeys.PSeqLabService
            select new TrialChoiceDto(analysis.Id, analysis.Name, analysis.Version)).ToListAsync(token) : [];
        var workflows = actor.IsStaff ? await (from workflow in db.LabServiceWorkflows.AsNoTracking()
            join version in db.LabServiceWorkflowVersions on workflow.Id equals version.LabServiceWorkflowId
            where workflow.ServiceKey == OrderServiceKeys.PSeqLabService && version.Status == LabServiceWorkflowStatus.Production
            select new TrialChoiceDto(version.Id, workflow.Name + " · version " + version.WorkflowVersion, version.WorkflowVersion)).ToListAsync(token) : [];
        var definitions = actor.IsStaff ? await db.TrialDeliverableDefinitions.AsNoTracking().Where(value => value.IsActive).OrderBy(value => value.Key).ToListAsync(token) : [];
        var organizationId = actor.Tenant?.Organization.Id;
        if (actor.IsStaff && companyId.HasValue) organizationId = await db.CrmCompanies.Where(value => value.Id == companyId).Select(value => value.AccessOrganizationId).SingleOrDefaultAsync(token);
        var departments = organizationId.HasValue ? await db.OrganizationDepartments.AsNoTracking().Where(value => value.OrganizationId == organizationId && value.IsActive && (actor.IsStaff || value.Id == actor.Tenant!.Department.Id))
            .OrderBy(value => value.Name).Select(value => new TrialChoiceDto(value.Id, value.Name, value.Version)).ToListAsync(token) : [];
        var destinations = await db.SampleShippingDestinations.AsNoTracking().Where(value => value.IsActive && value.EffectiveFrom <= now && (value.EffectiveTo == null || value.EffectiveTo > now))
            .Select(value => new TrialChoiceDto(value.Id, value.Name, value.Version)).ToListAsync(token);
        var types = await db.SampleTypeDefinitions.AsNoTracking().Where(value => value.IsActive && value.EffectiveFrom <= now && (value.EffectiveTo == null || value.EffectiveTo > now))
            .Select(value => new { value.Id, value.Name, value.Version, value.MaterialClass, value.QuantityUnit, value.MinimumQuantity, value.MaximumQuantity }).ToListAsync(token);
        var staff = actor.IsStaff ? await workflow.EligibleStaff().AsNoTracking().OrderBy(value => value.LastName)
            .Select(value => new TrialChoiceDto(value.Id, value.FirstName + " " + value.LastName, value.Version)).ToListAsync(token) : [];
        var authorities = actor.IsStaff ? await (from authority in db.TrialApprovalAuthorities.AsNoTracking()
            join user in db.Users on authority.UserId equals user.Id
            select new TrialAuthorityDto(authority.Id, authority.UserId, user.FirstName + " " + user.LastName, authority.Domain.ToString(),
                authority.IsPrimary, authority.PrimaryAuthorityId, authority.RevokedAtUtc, authority.Version, authority.DesignatedByUserId, authority.EffectiveAtUtc, authority.Reason, authority.RevocationReason)).ToListAsync(token) : [];
        return new(actor.IsStaff && authorities.Any(value => value.UserId == actor.User.Id && value.Domain == "ScientificOperations" && value.RevokedAtUtc == null), actor.IsPlatformAdmin, primaryDomains, handoffs, analyses, workflows,
            definitions.Select(value => new TrialDeliverableSnapshot(value.Id, value.Revision, value.Key, value.Name)).ToList(), definitions.Where(value => value.IsDefault).Select(value => value.Id).ToList(),
            departments, destinations, types.Where(value => string.Equals(value.MaterialClass.Replace(" ", "").Replace("-", ""), "extractedrna", StringComparison.OrdinalIgnoreCase))
                .Select(value => new TrialSampleTypeDto(value.Id, value.Name, value.Version, value.QuantityUnit, value.MinimumQuantity, value.MaximumQuantity)).ToList(), staff, authorities);
    }
    public async Task<TrialHandoffPageDto> HandoffsAsync(TrialActor actor, string? search, int page, Guid? companyId, Guid? requestId, CancellationToken token)
    {
        TrialAccess.RequireStaff(actor);
        var query = db.CrmHandoffs.AsNoTracking().Where(value => value.Type == CrmHandoffType.TrialProject
            && value.RelationshipRequest.Status != PSeq.Operations.Commercial.Relationships.Domain.PortalIntegrationRequestStatus.Declined
            && value.RelationshipRequest.Status != PSeq.Operations.Commercial.Relationships.Domain.PortalIntegrationRequestStatus.Cancelled
            && value.Company.IsActive && value.OpportunityId != null && value.Opportunity!.IsActive && !db.TrialProjects.Any(trial => trial.CrmHandoffId == value.Id));
        if (companyId.HasValue) query = query.Where(value => value.CompanyId == companyId);
        if (requestId.HasValue) query = query.Where(value => value.Id == requestId);
        if (!string.IsNullOrWhiteSpace(search)) { var term = search.Trim(); query = query.Where(value => value.Company.Name.Contains(term) || value.Opportunity!.Name.Contains(term) || value.RelationshipRequest.Summary.Contains(term)); }
        const int size = 25; page = Math.Max(0, page);
        var total = await query.CountAsync(token);
        var items = await query.OrderBy(value => value.Company.Name).ThenBy(value => value.Id).Skip(page * size).Take(size)
            .Select(value => new TrialHandoffChoiceDto(value.Id, value.Company.Name, value.Opportunity!.Name, value.RelationshipRequest.Summary)).ToListAsync(token);
        return new(items, total, page, size);
    }
    private static TrialScope? VisibleScope(TrialProject trial, TrialActor actor) => trial.Scopes.FirstOrDefault(value => value.Revision == (actor.IsStaff ? trial.CurrentScopeRevision : trial.ApprovedScopeRevision));
    private static TrialScopeDto MapScope(TrialScope scope, bool staff)
    {
        var value = scope.Read(); return new(scope.Revision, staff ? value : null, value.Name, value.Objective, value.SampleAllowance,
            value.SubmissionOpensAtUtc, value.SubmissionClosesAtUtc, value.SubmissionInstructions, value.SuccessCriteria, value.Terms,
            TrialRules.TermsVersion, TrialRules.RuoStatement, value.ResidualRetentionDays, value.MaterialDisposition.ToString(),
            value.ReturnDestination, value.ReturnHandling, value.ReturnShippingPayer, value.Analyses, value.Deliverables,
            scope.Decisions.Select(decision => new TrialDecisionDto(decision.Domain.ToString(), decision.Kind.ToString(), staff ? decision.Reason : null,
                staff ? decision.ActorUserId : null, staff ? decision.AsDelegate : null, decision.DecidedAtUtc)).ToList());
    }
}
