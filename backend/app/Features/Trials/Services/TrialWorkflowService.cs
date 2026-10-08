namespace PhaenoPortal.App.Features.Trials.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Trials.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;
using PSeq.Operations.Commercial.DataProvisioning.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.Trials.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;
using static TrialAccess;

public sealed class TrialWorkflowService(PSeqOperationsDbContext db, ILabOperationsProvider lab, TrialAccess access,
    IOptions<InvitationOptions>? invitations = null)
{
    public IQueryable<TrialProject> Query => db.TrialProjects.Include(value => value.Scopes).ThenInclude(value => value.Decisions).Include(value => value.Samples).AsSplitQuery();
    public async Task<TrialProject> ReadAsync(Guid id, TrialActor actor, CancellationToken token) =>
        await Scope(Query, actor).SingleOrDefaultAsync(value => value.Id == id, token) ?? throw Missing();

    public async Task<TrialProject> CreateAsync(TrialActor actor, TrialCreateRequest request, CancellationToken token)
    {
        await access.RequireCreateAsync(actor, token);
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Objective)
            || request.SubmissionClosesAtUtc <= request.SubmissionOpensAtUtc)
            throw Error("trial_creation_details_invalid", "Provide a Trial name, objective, positive sample count, and a submission window that closes after it opens.");
        TrialRules.ValidateSources(request.Sources);
        await RequireSampleTypeAsync(request.SampleTypeId, token);
        var draft = new TrialScopeDraftValues(Name: request.Name.Trim(), Objective: request.Objective.Trim(),
            SampleAllowance: TrialRules.SourceCount(request.Sources), SubmissionOpensAtUtc: request.SubmissionOpensAtUtc,
            SubmissionClosesAtUtc: request.SubmissionClosesAtUtc, SampleTypeId: request.SampleTypeId,
            Sources: request.Sources.Select(value => value with { BiologicalSource = value.BiologicalSource.Trim() }).ToList());
        draft.Validate();
        var company = await db.CrmCompanies.SingleOrDefaultAsync(value => value.Id == request.CompanyId && value.IsActive, token)
            ?? throw Error("trial_company_invalid", "Select an active Company for the Trial.");
        var departmentId = await PhaenoPortal.App.Features.Crm.Services.CrmOpportunityDepartments.ResolveAsync(db, company, request.DepartmentId, token);
        var project = new TrialProject($"TR-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..24].ToUpperInvariant(),
            null, company.Id, null, actor.User.Id);
        if (departmentId.HasValue) project.BindOrganization((company.AccessOrganizationId ?? company.SetupOrganizationId)!.Value, departmentId.Value);
        project.SaveScopeDraft(draft with { DepartmentId = departmentId }, actor.User.Id, DateTime.UtcNow);
        db.TrialProjects.Add(project);
        Record(project, actor, "Requested", "Phaeno created the Trial with its initial scope draft. Its complete scope must be submitted before Prospect acceptance.", request);
        return project;
    }

    public async Task SaveDraftAsync(TrialProject trial, TrialActor actor, TrialScopeDraftRequest request, CancellationToken token)
    {
        RequireStaff(actor); Version(trial.Version, request.Version);
        if (request.Values is null) throw Error("trial_draft_invalid", "Provide the draft scope values.");
        request.Values.Validate();
        if (request.Values.SampleTypeId.HasValue) await RequireSampleTypeAsync(request.Values.SampleTypeId.Value, token);
        if (request.Values.DepartmentId.HasValue && !await (from company in db.CrmCompanies
            join department in db.OrganizationDepartments on company.AccessOrganizationId equals department.OrganizationId
            where company.Id == trial.CompanyId && company.IsActive && department.Id == request.Values.DepartmentId
                && department.IsActive && company.AccessOrganization != null && company.AccessOrganization.IsActive
                && company.AccessOrganization.Kind == OrganizationKind.Prospect
            select department.Id).AnyAsync(token))
            throw Error("trial_department_invalid", "Select an active Department of this Company's Prospect organization, or leave it blank in the draft.");
        if (trial.ApprovedScopeRevision.HasValue && request.Values.DepartmentId.HasValue && trial.DepartmentId != request.Values.DepartmentId)
            throw Error("trial_department_immutable", "The approved Trial's Department cannot change.");
        var values = request.Values;
        if (values.Sources is not null)
        {
            var total = TrialRules.SourceCount(values.Sources);
            values = values with { SampleAllowance = total > 0 ? total : null };
        }
        trial.SaveScopeDraft(values, actor.User.Id, DateTime.UtcNow);
    }

    public async Task ProposeAsync(TrialProject trial, TrialActor actor, TrialScopeRequest request, CancellationToken token)
    {
        RequireStaff(actor); Version(trial.Version, request.Version);
        var approveOnSubmission = await CanApproveScopeOnSubmissionAsync(db, actor, token);
        if (approveOnSubmission && trial.IsOnHold) throw Error("trial_on_hold", "Resolve the Trial hold before approving scope.", 409);
        if (request.AnalysisIds is null || request.DeliverableIds is null) throw Error("trial_scope_catalog_invalid", "Select PSeq analyses and deliverables.");
        TrialRules.ValidateSources(request.Sources);
        var sampleType = await RequireSampleTypeAsync(request.SampleTypeId, token);
        var company = await db.CrmCompanies.AsNoTracking().Include(value => value.AccessOrganization).SingleAsync(value => value.Id == trial.CompanyId, token);
        if (!company.IsActive || company.AccessOrganization is not { IsActive: true, Kind: OrganizationKind.Prospect })
            throw Error("trial_prospect_access_required", "Prepare the Company's Prospect Portal access before approving Trial scope.");
        if (!await db.OrganizationDepartments.AnyAsync(value => value.Id == request.DepartmentId && value.OrganizationId == company.AccessOrganizationId && value.IsActive, token))
            throw Error("trial_department_invalid", "Select an active Department of the Prospect organization.");
        if (!await (from workflow in db.LabServiceWorkflows
            join version in db.LabServiceWorkflowVersions on workflow.Id equals version.LabServiceWorkflowId
            where workflow.ServiceKey == OrderServiceKeys.PSeqLabService && version.Id == request.WorkflowVersionId && version.Status == LabServiceWorkflowStatus.Production
            select version.Id).AnyAsync(token)) throw Error("trial_workflow_invalid", "Select the current production PSeq laboratory workflow.");
        var analyses = await (from analysis in db.AnalysisDefinitions.AsNoTracking()
            join catalog in db.QboCatalogItems on analysis.QboCatalogItemId equals catalog.Id
            where request.AnalysisIds.Contains(analysis.Id) && analysis.IsActive && !analysis.IsSynthetic
                && catalog.ServiceFamily == CatalogServiceFamily.PSeqLabService
            select analysis).ToListAsync(token);
        var deliverables = await db.TrialDeliverableDefinitions.AsNoTracking().Where(value => request.DeliverableIds.Contains(value.Id) && value.IsActive).ToListAsync(token);
        if (analyses.Count != request.AnalysisIds.Count || analyses.Count == 0 || deliverables.Count != request.DeliverableIds.Count || deliverables.Count == 0)
            throw Error("trial_scope_catalog_invalid", "Select active PSeq analyses and Trial deliverables.");
        trial.BindOrganization(company.AccessOrganizationId!.Value, request.DepartmentId);
        var proposedScope = trial.Propose(new(request.Name, request.Objective, TrialRules.SourceCount(request.Sources), request.SubmissionOpensAtUtc,
            request.SubmissionClosesAtUtc, request.WorkflowVersionId,
            analyses.Select(value => new TrialAnalysisSnapshot(value.Id, value.Version, value.Name, value.SubmissionInstructions, value.RequiredIntakeFieldsJson, value.ResultContractJson)).ToList(),
            deliverables.Select(value => new TrialDeliverableSnapshot(value.Id, value.Revision, value.Key, value.Name)).ToList(),
            request.SubmissionInstructions, request.SuccessCriteria, request.EstimatedRetailValue, request.AnticipatedInternalCost,
            request.ResidualRetentionDays, request.MaterialDisposition, request.ReturnDestination, request.ReturnHandling, request.ReturnShippingPayer,
            request.Terms, new(sampleType.Id, sampleType.Version, sampleType.Name, sampleType.QuantityUnit, sampleType.MinimumQuantity, sampleType.MaximumQuantity),
            request.Sources.Select(value => value with { BiologicalSource = value.BiologicalSource.Trim() }).ToList()), request.Reason, actor.User.Id, DateTime.UtcNow);
        db.TrialScopes.Add(proposedScope);
        Record(trial, actor, "ScopeProposed", approveOnSubmission
            ? $"Scope revision {trial.CurrentScopeRevision} submitted with approval by the submitting user."
            : $"Scope revision {trial.CurrentScopeRevision} submitted for Commercial leadership review.", request);
        if (approveOnSubmission)
        {
            await ValidateApprovalAsync(trial, token);
            RecordDecision(trial, actor, TrialDecisionKind.Approve, request.Reason,
                actor.IsPlatformAdmin ? "Platform administrator approved the scope on submission." : "Commercial leadership approved the scope on submission.", request);
        }
    }

    public async Task DecideAsync(TrialProject trial, TrialActor actor, TrialDecisionRequest request, CancellationToken token)
    {
        Version(trial.Version, request.Version);
        await access.RequireRoleAsync(actor, BusinessRole.CommercialLeadership, token);
        if (request.Domain != TrialApprovalDomain.Commercial)
            throw Error("trial_approval_domain_invalid", "Trial scope requires Commercial leadership approval only.");
        if (trial.IsOnHold) throw Error("trial_on_hold", "Resolve the Trial hold before approving scope.", 409);
        if (request.Decision == TrialDecisionKind.Approve) await ValidateApprovalAsync(trial, token);
        RecordDecision(trial, actor, request.Decision, request.Reason, $"Commercial leadership review: {request.Decision}.", request);
    }
    private async Task ValidateApprovalAsync(TrialProject trial, CancellationToken token)
    {
        if (trial.IsOnHold) throw Error("trial_on_hold", "Resolve the Trial hold before approving scope.", 409);
        if (!await db.Organizations.AnyAsync(value => value.Id == trial.OrganizationId && value.IsActive && value.Kind == OrganizationKind.Prospect, token)
            || !await db.OrganizationDepartments.AnyAsync(value => value.Id == trial.DepartmentId && value.OrganizationId == trial.OrganizationId && value.IsActive, token))
            throw Error("trial_prospect_inactive", "The Prospect organization and Department must be active before approval.", 409);
        var values = trial.CurrentScope().Read();
        values.Validate();
        var sampleType = await RequireSampleTypeAsync(values.SampleType.Id, token);
        if (sampleType.Version != values.SampleType.Version)
            throw Error("trial_sample_type_changed", "The proposed sample type changed. Submit a revised scope.", 409);
        if (sampleType.ShippingProcedureId is not Guid shippingProcedureId || !await db.SampleShippingProcedures.AnyAsync(procedure =>
            db.SampleShippingProcedures.Any(anchor => anchor.Id == shippingProcedureId && anchor.DefinitionKey == procedure.DefinitionKey) && procedure.IsActive, token))
            throw Error("trial_shipping_instructions_unavailable", "Configure shipping instructions for the selected sample type before approval.");
        if (!await db.LabServiceWorkflowVersions.AnyAsync(value => value.Id == values.WorkflowVersionId && value.Status == LabServiceWorkflowStatus.Production, token))
            throw Error("trial_workflow_changed", "The proposed laboratory workflow is no longer in production. Submit a revised scope.", 409);
        foreach (var selected in values.Analyses)
            if (!await db.AnalysisDefinitions.AnyAsync(value => value.Id == selected.Id && value.Version == selected.Version && value.IsActive && !value.IsSynthetic, token))
                throw Error("trial_scope_configuration_changed", "An analysis changed during review. Propose a new scope before approving.", 409);
        foreach (var selected in values.Deliverables)
            if (!await db.TrialDeliverableDefinitions.AnyAsync(value => value.Id == selected.Id && value.Revision == selected.Revision && value.IsActive, token))
                throw Error("trial_scope_configuration_changed", "A deliverable changed during review. Propose a new scope before approving.", 409);
    }
    private void RecordDecision(TrialProject trial, TrialActor actor, TrialDecisionKind kind, string reason, string summary, object request)
    {
        var decision = trial.Decide(TrialApprovalDomain.Commercial, kind, actor.User.Id, null, false, reason, DateTime.UtcNow);
        db.TrialDecisions.Add(decision);
        Record(trial, actor, "DecisionRecorded", summary, request);
        if (trial.Status == TrialStatus.AwaitingAcceptance) Notice(trial, "trial-approved", "Trial ready for acceptance", "Phaeno approved your Trial scope. Review and accept the current no-charge RUO/no-PHI terms before submitting samples.");
    }
    public void Accept(TrialProject trial, TrialActor actor, TrialAcceptRequest request)
    {
        RequireTenantAdmin(actor, trial); Version(trial.Version, request.Version);
        trial.Accept(request.ScopeRevision, request.TermsVersion, request.RuoNoPhiConfirmed, actor.User.Id, DateTime.UtcNow);
        Record(trial, actor, "Accepted", $"The organization or assigned-department administrator accepted scope revision {request.ScopeRevision} and its RUO/no-PHI terms.", request);
    }

    public async Task SubmitAsync(TrialProject trial, TrialActor actor, TrialSubmitRequest request, CancellationToken token)
    {
        RequireTenantAdmin(actor, trial); Version(trial.Version, request.Version);
        if (!request.RuoNoPhiConfirmed) throw Error("trial_confirmation_required", "Confirm that the samples and entered information are RUO and contain no PHI.");
        if (request.Samples is null || request.Samples.Count is < 1 or > 100) throw Error("trial_samples_invalid", "Submit between 1 and 100 samples per batch, within the approved allowance.");
        var now = DateTime.UtcNow;
        var blocker = trial.SubmissionBlocker(now); if (blocker is not null) throw Error("trial_submission_unavailable", blocker, 409);
        var destination = await db.SampleShippingDestinations.SingleOrDefaultAsync(value => value.Id == request.DestinationId && value.IsActive
            && value.EffectiveFrom <= now && (value.EffectiveTo == null || value.EffectiveTo > now), token) ?? throw Error("trial_destination_unavailable", "Choose an active Phaeno shipping destination.");
        var values = trial.CurrentScope().Read();
        if (request.SampleTypeId != values.SampleType.Id) throw Error("trial_sample_type_mismatch", "Use the sample type in the approved Trial scope.");
        var sampleType = await db.SampleTypeDefinitions.SingleOrDefaultAsync(value => value.Id == request.SampleTypeId && value.IsActive
            && value.EffectiveFrom <= now && (value.EffectiveTo == null || value.EffectiveTo > now), token) ?? throw Error("trial_sample_type_unavailable", "Choose an active extracted-RNA sample type.");
        if (!string.Equals(sampleType.MaterialClass.Replace(" ", "").Replace("-", "").Replace("_", ""), "extractedrna", StringComparison.OrdinalIgnoreCase))
            throw Error("trial_material_invalid", "Initial Trials accept extracted RNA only.");
        if (sampleType.Version != values.SampleType.Version) throw Error("trial_sample_type_changed", "The approved sample type changed. Phaeno must approve a revised scope.", 409);
        if (sampleType.ShippingProcedureId is not Guid procedureId ||
            !await db.SampleShippingProcedures.AnyAsync(value =>
                db.SampleShippingProcedures.Any(anchor => anchor.Id == procedureId && anchor.DefinitionKey == value.DefinitionKey) &&
                value.IsActive, token))
            throw Error("trial_shipping_instructions_unavailable", "Phaeno must select an active shipping procedure for this sample type.");
        var samples = new List<TrialSample>();
        foreach (var input in request.Samples)
        {
            if (!values.Sources.Any(source => TrialRules.SourceKey(source.BiologicalSource) == TrialRules.SourceKey(input.BiologicalSource ?? "")))
                throw Error("trial_biological_source_mismatch", "Select a biological source from the approved Trial scope.");
            ValidateInputs(values, input);
            if (!string.Equals(input.QuantityUnit, sampleType.QuantityUnit, StringComparison.OrdinalIgnoreCase)
                || (sampleType.MinimumQuantity.HasValue && input.Quantity < sampleType.MinimumQuantity)
                || (sampleType.MaximumQuantity.HasValue && input.Quantity > sampleType.MaximumQuantity))
                throw Error("trial_quantity_invalid", "Sample quantity must meet the selected extracted-RNA type's requirements.");
            var sample = new TrialSample(trial.Id, trial.CurrentScopeRevision, input.Reference, values.Sources.Single(value => TrialRules.SourceKey(value.BiologicalSource) == TrialRules.SourceKey(input.BiologicalSource)).BiologicalSource, input.TubeCount,
                input.Quantity, input.QuantityUnit, input.Concentration, input.StorageRequirements, input.SafetyDeclaration,
                JsonSerializer.Serialize(input.Inputs), input.ReplacesSampleId, input.ReplacementAuthorizationId, actor.User.Id, now);
            if (input.ReplacementAuthorizationId.HasValue)
            {
                var replacement = await db.TrialReplacementAuthorizations.SingleOrDefaultAsync(value => value.Id == input.ReplacementAuthorizationId && value.TrialProjectId == trial.Id, token) ?? throw Missing();
                replacement.Consume(sample);
            }
            samples.Add(sample);
        }
        trial.AddSamples(samples, now);
        db.TrialSamples.AddRange(samples);
        var authorizationId = Guid.NewGuid();
        var command = new AuthorizeLabWorkCommand(new(Guid.NewGuid(), authorizationId, now, LabOperationsContractVersions.V2), authorizationId, 1,
            LabWorkAuthorizationSource.TrialProject, trial.Id, trial.OrganizationId!.Value, OrderServiceKeys.PSeqLabService, 1,
            "trial-schedule-no-sla", trial.Number, samples.Select(value => new AuthorizedSpecimen(value.Id, value.Reference,
                "Extracted RNA", value.BiologicalSource, value.Quantity, value.QuantityUnit, value.StorageRequirements,
                value.SafetyDeclaration, null, value.Concentration, null, [OrderServiceKeys.PSeqLabService])).ToList(), values.WorkflowVersionId,
            TubeUsePolicyKey: "run_one_with_failure_fallback", TubeUsePolicyVersion: 1);
        var acknowledgment = await lab.AuthorizeWorkAsync(command, token);
        if (acknowledgment.Disposition is not (LabCommandDisposition.Accepted or LabCommandDisposition.AlreadyApplied) || !acknowledgment.LabWorkOrderId.HasValue)
            throw Error("trial_lab_authorization_failed", "The Lab could not authorize this submission. No samples or shipment were created.", 409);
        foreach (var sample in samples) sample.Authorize(authorizationId, acknowledgment.LabWorkOrderId.Value);
        var shipment = new SampleShipment($"SHP-{now:yyyyMMdd}-{Guid.NewGuid():N}"[..24].ToUpperInvariant(), trial.OrganizationId.Value,
            trial.DepartmentId!.Value, SampleShipmentAuthorizationSource.ProspectTrialProject, trial.Id, trial.Number,
            values.Name, acknowledgment.LabWorkOrderId.Value, destination.Id);
        foreach (var sample in samples)
        {
            var item = new SampleShipmentItem(shipment.Id, sample.Id, sampleType.Id, sample.Reference, sample.Reference, sample.Quantity, sample.QuantityUnit);
            for (var ordinal = 1; ordinal <= sample.TubeCount; ordinal++) item.TubeSlots.Add(new(item.Id, ordinal));
            shipment.Items.Add(item);
        }
        db.SampleShipments.Add(shipment);
        Record(trial, actor, "SamplesSubmitted", $"{samples.Count} sample(s) submitted; the return kit is awaiting Phaeno preparation.", new { shipmentId = shipment.Id, authorizationId });
    }

    private async Task<SampleTypeDefinition> RequireSampleTypeAsync(Guid id, CancellationToken token)
    {
        var now = DateTime.UtcNow;
        var value = await db.SampleTypeDefinitions.SingleOrDefaultAsync(type => type.Id == id && type.IsActive
            && type.EffectiveFrom <= now && (type.EffectiveTo == null || type.EffectiveTo > now), token)
            ?? throw Error("trial_sample_type_unavailable", "Choose a current extracted RNA sample type.");
        if (!string.Equals(value.MaterialClass.Replace(" ", "").Replace("-", "").Replace("_", ""), "extractedrna", StringComparison.OrdinalIgnoreCase))
            throw Error("trial_material_invalid", "Trials accept extracted RNA only.");
        return value;
    }

    public async Task ActAsync(TrialProject trial, TrialActor actor, string action, TrialActionRequest request, CancellationToken token)
    {
        RequireStaff(actor); Version(trial.Version, request.Version); var now = DateTime.UtcNow;
        switch (action)
        {
            case "schedule": trial.SetSchedule(request.ScheduleEstimate ?? ""); break;
            case "hold":
                await access.RequireAuthorityAsync(actor, TrialApprovalDomain.ScientificOperations, token);
                trial.SetHold(request.Hold ?? true, request.Reason); break;
            case "replacement":
                await access.RequireAuthorityAsync(actor, TrialApprovalDomain.ScientificOperations, token);
                if (trial.IsTerminal || trial.IsOnHold) throw Error("trial_replacement_unavailable", "Replacement approval requires an open Trial without a hold.", 409);
                var sample = trial.Samples.SingleOrDefault(value => value.Id == request.SampleId) ?? throw Missing();
                if (sample.HasSuccessfulResult || await db.TrialReplacementAuthorizations.AnyAsync(value => value.OriginalSampleId == sample.Id, token))
                    throw Error("trial_replacement_unavailable", "This sample already has results or a replacement authorization.", 409);
                sample.RecordFailure(request.Reason);
                db.TrialReplacementAuthorizations.Add(new(trial.Id, sample.Id, request.PhaenoCausedFailure, request.Reason, actor.User.Id, now)); break;
            case "close":
                await access.RequireAuthorityAsync(actor, TrialApprovalDomain.ScientificOperations, token);
                trial.Close(request.ClosureStatus ?? TrialStatus.ClosedIncomplete, request.Reason, now);
                foreach (var authorization in trial.Samples.Where(value => value.LabWorkOrderId.HasValue).Select(value => value.AuthorizationId).Distinct())
                    await lab.RequestCancellationAsync(new(new(Guid.NewGuid(), trial.Id, now), authorization, 1, "trial-closed", null), token);
                break;
            case "material":
                await access.RequireAuthorityAsync(actor, TrialApprovalDomain.ScientificOperations, token);
                trial.RecordMaterialDisposition(request.MaterialDisposition ?? "", actor.User.Id, now); break;
            case "commercial-outcome":
                await access.RequireCommercialAsync(actor, token);
                if (!request.CommercialOutcome.HasValue) throw Error("trial_outcome_required", "Select a commercial outcome.");
                if (request.FollowUpOwnerUserId.HasValue && !await EligibleStaff().AnyAsync(value => value.Id == request.FollowUpOwnerUserId, token))
                    throw Error("trial_followup_owner_invalid", "Select an active Phaeno follow-up owner.");
                if (request.CommercialOutcome == TrialCommercialOutcome.ConvertedToCustomer && !await db.Organizations.AnyAsync(value => value.Id == trial.OrganizationId && value.Kind == OrganizationKind.Customer, token)
                    || request.CommercialOutcome == TrialCommercialOutcome.ConvertedToPartner && !await db.Organizations.AnyAsync(value => value.Id == trial.OrganizationId && value.Kind == OrganizationKind.Partner, token))
                    throw Error("trial_conversion_not_recorded", "Convert the Company through the explicit relationship workflow before recording that conversion outcome.", 409);
                trial.RecordCommercialOutcome(request.CommercialOutcome.Value, request.Reason, request.FollowUpOwnerUserId, request.FollowUpAtUtc); break;
            case "deactivate-prospect":
                if (!actor.IsPlatformAdmin) throw Error("trial_platform_admin_required", "A platform administrator must close Prospect access.", 403);
                TrialRules.Text(request.Reason);
                var organization = await db.Organizations.SingleOrDefaultAsync(value => value.Id == trial.OrganizationId, token) ?? throw Missing();
                if (organization.Kind != OrganizationKind.Prospect || !organization.IsActive)
                    throw Error("trial_deactivation_unavailable", "Only an active Prospect relationship can be closed here.", 409);
                if (await db.TrialProjects.AnyAsync(value => value.CompanyId == trial.CompanyId
                    && (value.ClosedAtUtc == null || value.IsOnHold || value.CommercialOutcome != TrialCommercialOutcome.ClosedWithoutConversion), token)
                    || await db.OrganizationDatasetGrants.AnyAsync(value => value.OrganizationId == organization.Id && value.Status == OrganizationDatasetGrantStatus.Active, token)
                    || await db.OrganizationServiceEntitlements.AnyAsync(value => value.OrganizationId == organization.Id && (value.EffectiveTo == null || value.EffectiveTo > now), token)
                    || await db.CrmOpportunities.AnyAsync(value => value.CompanyId == trial.CompanyId && value.IsActive && value.Stage.Category == CrmPipelineStageCategory.Open, token))
                    throw Error("trial_active_relationship_remains", "Close all Trials and their commercial evaluations, resolve holds, close open Opportunities, and end active data grants and service access before deactivating the Prospect.", 409);
                organization.Deactivate();
                (await db.CrmCompanies.SingleAsync(value => value.Id == trial.CompanyId, token)).Deactivate();
                break;
            default: throw Error("trial_action_invalid", "Select a supported Trial action.");
        }
        Record(trial, actor, action, action switch { "hold" => trial.IsOnHold ? "Phaeno placed the Trial on hold." : "Phaeno released the Trial hold.",
            "deactivate-prospect" => "Phaeno closed Prospect access after completing relationship review.",
            "schedule" => "Phaeno updated the non-binding schedule estimate.", "commercial-outcome" => "Phaeno recorded a commercial follow-up outcome.",
            "replacement" => "Phaeno approved a replacement sample.", "material" => "Phaeno recorded actual residual-material disposition.", _ => $"Phaeno closed the Trial: {trial.Status}." }, request);
    }

    public IQueryable<User> EligibleStaff() => db.Users.Where(value => value.IsActive && value.Status == UserAccountStatus.Active
        && value.Memberships.Any(member => member.IsActive && member.Organization != null && member.Organization.IsActive && member.Organization.Kind == OrganizationKind.Phaeno));
    public void Record(TrialProject trial, TrialActor actor, string kind, string summary, object? detail = null)
    {
        var now = DateTime.UtcNow;
        db.TrialEvents.Add(new(trial.Id, kind, summary, actor.User.Id, now, JsonSerializer.Serialize(detail ?? new { })));
        if (db.Entry(trial).State != EntityState.Added) db.Entry(trial).Property(value => value.UpdatedAt).IsModified = true;
    }
    public void Notice(TrialProject trial, string kind, string subject, string body)
    {
        if (trial.OrganizationId.HasValue && trial.DepartmentId.HasValue)
            db.OrderNotifications.Add(new(trial.OrganizationId.Value, null, "trial-project", trial.Id, kind, subject,
                $"{body} Open Trial {trial.Number} in the Portal:\n{(invitations?.Value ?? new InvitationOptions()).PublicBaseUrl.TrimEnd('/')}/order-operations/lab-services/trials/{trial.Id}\n{TrialRules.RuoStatement}", trial.DepartmentId));
    }
    private static void ValidateInputs(TrialScopeValues scope, TrialSampleInput input)
    {
        if (input is null || input.Inputs is null || input.Inputs.Any(value => string.IsNullOrWhiteSpace(value.Key) || value.Value is null))
            throw Error("trial_inputs_invalid", "Provide valid scientific sample inputs.");
        foreach (var key in input.Inputs.Keys) TrialRules.SampleReference(key);
        var required = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var analysis in scope.Analyses)
        {
            using var document = JsonDocument.Parse(analysis.RequiredInputsJson);
            var root = document.RootElement;
            if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("required", out var list)) root = list;
            if (root.ValueKind == JsonValueKind.Array) foreach (var value in root.EnumerateArray())
            {
                if (value.ValueKind == JsonValueKind.String) required.Add(value.GetString()!);
                else if (value.ValueKind == JsonValueKind.Object && value.TryGetProperty("name", out var name)
                    && (!value.TryGetProperty("required", out var needed) || needed.ValueKind == JsonValueKind.True)) required.Add(name.GetString()!);
            }
        }
        var submitted = new Dictionary<string, string>(input.Inputs, StringComparer.OrdinalIgnoreCase)
        { ["customerSampleId"] = input.Reference, ["biologicalSource"] = input.BiologicalSource,
            ["materialType"] = "Extracted RNA", ["quantity"] = input.Quantity.ToString(System.Globalization.CultureInfo.InvariantCulture),
            ["quantityUnit"] = input.QuantityUnit, ["concentration"] = input.Concentration?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? "", ["storageRequirements"] = input.StorageRequirements, ["safetyDeclaration"] = input.SafetyDeclaration };
        if (required.Any(key => !submitted.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value)))
            throw Error("trial_required_input_missing", "Complete every required input from the approved PSeq analyses.");
        if (input.Inputs.Values.Any(value => value.Length > 2000)) throw Error("trial_input_too_long", "Keep each scientific input within 2,000 characters.");
    }
}
