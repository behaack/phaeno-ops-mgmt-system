namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Trials.Domain;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Trials.Services;
using PhaenoPortal.App.Features.Trials.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class TrialProjectPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task CrmApprovalAcceptanceSubmissionPinsLabWorkWithoutCreatingAnOrder()
    {
        await using var scope = await Fixture.Create();
        var trial = await scope.CreateApprovedTrial();
        var commercialView = await scope.Reader.DetailAsync(trial, scope.Commercial, default);
        var externalView = await scope.Reader.DetailAsync(trial, scope.Prospect, default);
        Assert.NotNull(commercialView.Scope!.InternalValues); Assert.Null(externalView.Scope!.InternalValues);
        Assert.All(externalView.Scope.Decisions, value => { Assert.Null(value.ActorUserId); Assert.Null(value.Reason); });
        Assert.True(externalView.CanAccept);
        var replay = await scope.Workflow.CreateAsync(scope.Commercial, new(scope.Handoff.Id), default);
        Assert.Equal(trial.Id, replay.Id);
        await scope.Submit(trial, "RNA-1");
        var sample = Assert.Single(trial.Samples);
        var work = await scope.Db.LabWorkOrders.SingleAsync(value => value.Id == sample.LabWorkOrderId);
        Assert.Equal(LabAuthorizationSource.TrialProject, work.AuthorizationSource);
        Assert.Equal(trial.Id, work.AuthorizationSourceId); Assert.Equal(scope.WorkflowVersion.Id, work.LabServiceWorkflowVersionId);
        var shipment = await scope.Db.SampleShipments.Include(value => value.Items).ThenInclude(value => value.TubeSlots).SingleAsync(value => value.AuthorizationSourceId == trial.Id);
        Assert.Equal(SampleShipmentAuthorizationSource.ProspectTrialProject, shipment.AuthorizationSource);
        Assert.Equal(2, Assert.Single(shipment.Items).TubeSlots.Count);
        Assert.False(await scope.Db.LabServiceOrders.AnyAsync(value => value.SourceRequestId == scope.Handoff.RelationshipRequestId));
        Assert.True(await new TrialCrmProjection(scope.Db).PublishAsync(trial.Id, default) > 0);
        Assert.Equal(0, await new TrialCrmProjection(scope.Db).PublishAsync(trial.Id, default));
        Assert.True(await scope.Db.CrmActivities.AnyAsync(value => value.CompanyId == scope.Company.Id && value.Subject.Contains("SamplesSubmitted")));
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.Workflow.SubmitAsync(trial, scope.Prospect, scope.Submission(trial, "RNA-2") with { Version = trial.Version - 1 }, default));
    }

    [PostgreSqlReferenceFact]
    public async Task DepartmentAdminCannotAcceptOrSubmitAndOtherDepartmentCannotRead()
    {
        await using var scope = await Fixture.Create(); var trial = await scope.CreateApprovedTrial();
        var membership = new OrganizationMembership(scope.Customer.Id, scope.Organization.Id, false);
        var departmentAdmin = new TrialActor(scope.Customer, false, false, new(scope.Customer, scope.Organization, membership, scope.Department, true));
        Assert.Throws<OrderManagementException>(() => scope.Workflow.Accept(trial, departmentAdmin, new(trial.Version, 1, TrialRules.TermsVersion, true)));
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.Workflow.SubmitAsync(trial, departmentAdmin, scope.Submission(trial, "RNA-1"), default));
        var other = new OrganizationDepartment(scope.Organization.Id, "OTHER", "Other department"); scope.Db.Add(other); await scope.Db.SaveChangesAsync();
        var otherActor = scope.Prospect with { Tenant = scope.Prospect.Tenant! with { Department = other } };
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.Workflow.ReadAsync(trial.Id, otherActor, default));
        Assert.Single((await scope.Reader.ConfigurationAsync(scope.Prospect, null, default)).Departments);
    }

    [PostgreSqlReferenceFact]
    public async Task PartialThenWholeTrialReleaseFreezesRetentionAndSurvivesConversion()
    {
        await using var scope = await Fixture.Create(); var trial = await scope.CreateApprovedTrial();
        await scope.Submit(trial, "RNA-1"); await scope.Submit(trial, "RNA-2");
        var samples = trial.Samples.ToArray(); var first = await scope.ReadyPackage(samples[0]); var second = await scope.ReadyPackage(samples[1]);
        await scope.Results.ReleaseAsync(trial, scope.Scientific, new(trial.Version, [first.Id], false, "Partial ready"), default); await scope.Db.SaveChangesAsync();
        Assert.Equal(TrialStatus.InProgress, trial.Status); Assert.Null(trial.ClosedAtUtc);
        var partial = await scope.Db.TrialResultReleases.SingleAsync(value => value.TrialProjectId == trial.Id);
        Assert.False(await scope.Db.ReleasedDeliverableRetentionSnapshots.AnyAsync(value => value.TrialResultReleaseId == partial.Id));
        var managed = new ManagedReleaseRetentionService(scope.Db); var partialPackage = await managed.ReadPackageAsync(ReleasedDeliverablePackageType.TrialResult, partial.Id, default);
        Assert.True(await managed.HasAccessAsync(ReleasedDeliverablePackageType.TrialResult, partial.Id, scope.Organization.Id, scope.Customer.Id, partialPackage!.FileIds, default));
        await scope.Results.ReleaseAsync(trial, scope.Scientific, new(trial.Version, [first.Id, second.Id], true, "Complete approved package"), default); await scope.Db.SaveChangesAsync();
        Assert.Equal(TrialStatus.Completed, trial.Status); Assert.Null(trial.CommercialOutcome);
        var snapshot = await scope.Db.ReleasedDeliverableRetentionSnapshots.SingleAsync(value => value.TrialResultReleaseId == trial.CompleteReleaseId);
        Assert.Equal(snapshot.ReleasedAtUtc.AddDays(30), snapshot.StandardDeletionAtUtc);
        Assert.False(await managed.HasAccessAsync(ReleasedDeliverablePackageType.TrialResult, partial.Id, scope.Organization.Id, scope.Customer.Id, partialPackage.FileIds, default));
        scope.Organization.ConvertProspectTo(OrganizationKind.Partner); await scope.Db.SaveChangesAsync();
        var full = await managed.ReadPackageAsync(ReleasedDeliverablePackageType.TrialResult, trial.CompleteReleaseId!.Value, default);
        Assert.True(await managed.HasAccessAsync(ReleasedDeliverablePackageType.TrialResult, trial.CompleteReleaseId.Value, scope.Organization.Id, scope.Customer.Id, full!.FileIds, default));
        await scope.Db.Entry(snapshot).ReloadAsync(); var originalDeadline = snapshot.StandardDeletionAtUtc;
        trial.SetHold(true, "Preserve while reviewing"); await scope.Db.SaveChangesAsync();
        Assert.False(await managed.HasAccessAsync(ReleasedDeliverablePackageType.TrialResult, trial.CompleteReleaseId.Value, scope.Organization.Id, scope.Customer.Id, full.FileIds, default));
        await scope.Db.Entry(snapshot).ReloadAsync(); Assert.Equal(originalDeadline, snapshot.StandardDeletionAtUtc);
    }

    [PostgreSqlReferenceFact]
    public async Task RevocationBlocksNewDecisionsButPreservesPriorApproval()
    {
        await using var scope = await Fixture.Create(); var trial = await scope.CreateApprovedTrial();
        var approval = trial.CurrentScope().Decisions.Single(value => value.Domain == TrialApprovalDomain.ScientificOperations);
        scope.ScientificAuthority.Revoke(scope.Commercial.User.Id, "Responsibility reassigned", DateTime.UtcNow); await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.Access.RequireAuthorityAsync(scope.Scientific, TrialApprovalDomain.ScientificOperations, default));
        Assert.True(trial.CurrentScope().IsApproved); Assert.Equal(scope.ScientificAuthority.Id, approval.AuthorityId);
    }

    [PostgreSqlReferenceFact]
    public async Task CloseoutRequiresFinalEvaluationAndNoOtherRelationship()
    {
        await using var scope = await Fixture.Create(); var trial = await scope.CreateApprovedTrial();
        await Assert.ThrowsAsync<OrderManagementException>(() => TrialAccess.GuardProspectDeactivationAsync(scope.Db, scope.Organization.Id, default));
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.Workflow.ActAsync(trial, scope.Scientific, "commercial-outcome", new(trial.Version, "Evaluation complete", CommercialOutcome: TrialCommercialOutcome.ClosedWithoutConversion), default));
        await scope.Workflow.ActAsync(trial, scope.Scientific, "close", new(trial.Version, "Evaluation ended", ClosureStatus: TrialStatus.ClosedIncomplete), default); await scope.Db.SaveChangesAsync();
        await scope.Workflow.ActAsync(trial, scope.Commercial, "commercial-outcome", new(trial.Version, "No conversion", CommercialOutcome: TrialCommercialOutcome.ClosedWithoutConversion), default); await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.Workflow.ActAsync(trial, scope.Commercial, "deactivate-prospect", new(trial.Version, "Relationship reviewed"), default));
        Assert.True(scope.Organization.IsActive);
        var opportunity = await scope.Db.CrmOpportunities.Include(value => value.Stage).SingleAsync(value => value.Id == trial.OpportunityId);
        var lost = new CrmPipelineStage(opportunity.Stage.PipelineId, "Closed", 2, CrmPipelineStageCategory.Lost, 0, false); scope.Db.Add(lost);
        opportunity.MoveToStage(lost, "Evaluation closed", DateTime.UtcNow); await scope.Db.SaveChangesAsync();
        await scope.Workflow.ActAsync(trial, scope.Commercial, "deactivate-prospect", new(trial.Version, "All relationships reviewed"), default); await scope.Db.SaveChangesAsync();
        Assert.False(scope.Organization.IsActive); Assert.False(scope.Company.IsActive);
        Assert.Contains("All relationships reviewed", (await scope.Db.TrialEvents.SingleAsync(value => value.TrialProjectId == trial.Id && value.Kind == "deactivate-prospect")).InternalDetailsJson);
    }

    [PostgreSqlReferenceFact]
    public async Task ReleaseRequiresCurrentLaboratoryReadiness()
    {
        await using var scope = await Fixture.Create(); var trial = await scope.CreateApprovedTrial(); await scope.Submit(trial, "RNA-01");
        var package = await scope.ReadyPackage(trial.Samples.Single());
        var work = await scope.Db.LabWorkOrders.SingleAsync(value => value.Id == package.LabWorkOrderId);
        // Simulate stale imported readiness; normal terminal work cannot regress.
        scope.Db.Entry(work).Property(value => value.Status).CurrentValue = LabWorkOrderStatus.Processing; await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.Results.ReleaseAsync(trial, scope.Commercial, new(trial.Version, [package.Id], false, "Review changed"), default));
        Assert.False(await scope.Db.TrialResultReleases.AnyAsync(value => value.TrialProjectId == trial.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task SharedScientificActionCannotBypassTrialHold()
    {
        await using var scope = await Fixture.Create(); var trial = await scope.CreateApprovedTrial(); await scope.Submit(trial, "RNA-01");
        trial.SetHold(true, "Review material"); await scope.Db.SaveChangesAsync();
        var http = new DefaultHttpContext(); http.Request.Method = "POST"; http.Request.Path = "/api/lab-operations/work-orders/fixture/protocols";
        var action = new Microsoft.AspNetCore.Mvc.ActionContext(http, new(), new(), new());
        var filters = new List<Microsoft.AspNetCore.Mvc.Filters.IFilterMetadata>();
        var executing = new Microsoft.AspNetCore.Mvc.Filters.ActionExecutingContext(action, filters, new Dictionary<string, object?> { ["workOrderId"] = trial.Samples.Single().LabWorkOrderId }, new object());
        var called = false;
        var guard = new TrialWorkGuard(scope.Db, new(scope.Db, new NullIdentity()));
        await Assert.ThrowsAsync<OrderManagementException>(() => guard.OnActionExecutionAsync(executing, () => { called = true; return Task.FromResult(new Microsoft.AspNetCore.Mvc.Filters.ActionExecutedContext(action, filters, new object())); }));
        Assert.True(called); Assert.True(trial.IsOnHold);
    }
    private sealed class NullIdentity : IExternalIdentityContext { public ExternalIdentity? Read(HttpContext context) => null; }

    [PostgreSqlReferenceFact]
    public async Task TrialWarningGraceHoldCleanupAndReissuePreserveOriginalDatesAndMetadata()
    {
        await using var scope = await Fixture.Create(); var trial = await scope.CreateApprovedTrial(); await scope.Submit(trial, "RNA-01");
        var original = await scope.ReadyPackage(trial.Samples.Single());
        await scope.Results.ReleaseAsync(trial, scope.Commercial, new(trial.Version, [original.Id], true, "Complete scope"), default); await scope.Db.SaveChangesAsync();
        var releaseId = trial.CompleteReleaseId!.Value;
        var snapshot = await scope.Db.ReleasedDeliverableRetentionSnapshots.SingleAsync(value => value.TrialResultReleaseId == releaseId);
        // Backdate this isolated fixture's frozen policy to exercise due checkpoints now.
        foreach (var property in new[] { nameof(snapshot.ReleasedAtUtc), nameof(snapshot.WarningAtUtc), nameof(snapshot.StandardDeletionAtUtc), nameof(snapshot.PotentialFinalDeletionAtUtc) })
            scope.Db.Entry(snapshot).Property<DateTime>(property).CurrentValue = scope.Db.Entry(snapshot).Property<DateTime>(property).CurrentValue.AddDays(-40);
        await scope.Db.SaveChangesAsync(); await scope.Db.Entry(snapshot).ReloadAsync(); var deadline = snapshot.StandardDeletionAtUtc; var closed = trial.ClosedAtUtc;
        var notices = new GovernedRetentionCheckpointService(scope.Db, Options.Create(new InvitationOptions()));
        var checkpoints = new ManagedReleaseRetentionCheckpointService(scope.Db, notices);
        await checkpoints.ProcessAsync(ReleasedDeliverablePackageType.TrialResult, releaseId, default, snapshot.WarningAtUtc.AddMinutes(1));
        Assert.NotNull(snapshot.WarningNotificationId);
        await checkpoints.ProcessAsync(ReleasedDeliverablePackageType.TrialResult, releaseId, default, snapshot.StandardDeletionAtUtc.AddMinutes(1));
        Assert.NotNull(snapshot.GraceNotificationId); Assert.Equal(deadline, snapshot.GraceActivatedAtUtc);
        var storage = new TrialStorage(); var lifecycle = new ReleasedDeliverableLifecycleService(scope.Db, storage, notices, checkpoints);
        trial.SetHold(true, "Preserve for review"); await scope.Db.SaveChangesAsync();
        await lifecycle.ProcessCleanupAsync(snapshot.Id, default); Assert.Empty(storage.Deleted); Assert.Null(snapshot.ByteDeletedAtUtc);
        trial.SetHold(false, "Review complete"); await scope.Db.SaveChangesAsync();
        await lifecycle.ProcessCleanupAsync(snapshot.Id, default); Assert.Single(storage.Deleted); Assert.NotNull(snapshot.ByteDeletedAtUtc);
        Assert.True((await scope.Db.ResultArtifacts.SingleAsync(value => value.ResultOutputPackageId == original.Id)).DeletedAtUtc.HasValue);
        Assert.True(scope.Organization.IsActive); Assert.True(await scope.Db.TrialResultReleases.AnyAsync(value => value.Id == releaseId));
        var replacement = await scope.ReadyPackage(trial.Samples.Single(), original.Id);
        await scope.Results.ReleaseAsync(trial, scope.Commercial, new(trial.Version, [replacement.Id], true, "Approved reissue", releaseId), default); await scope.Db.SaveChangesAsync();
        Assert.NotEqual(releaseId, trial.CompleteReleaseId); Assert.Equal(closed, trial.ClosedAtUtc);
        await scope.Db.Entry(snapshot).ReloadAsync(); Assert.Equal(deadline, snapshot.StandardDeletionAtUtc);
        Assert.True(await scope.Db.ReleasedDeliverableReissues.AnyAsync(value => value.OriginalSnapshotId == snapshot.Id));
    }
    private sealed class TrialStorage : IOperationalFileStorage
    {
        public List<string> Deleted { get; } = [];
        public Task DeleteIfExistsAsync(string key, CancellationToken token) { Deleted.Add(key); return Task.CompletedTask; }
        public Task<Stream> OpenReadAsync(string key, CancellationToken token) => throw new NotSupportedException();
        public Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maximum, CancellationToken token) => throw new NotSupportedException();
    }

    private sealed class Fixture(PSeqOperationsDbContext db, IDbContextTransaction transaction) : IAsyncDisposable
    {
        public PSeqOperationsDbContext Db => db;
        public Organization Organization { get; private set; } = null!;
        public OrganizationDepartment Department => Organization.Departments.Single();
        public User Customer { get; private set; } = null!;
        public TrialActor Prospect { get; private set; } = null!;
        public TrialActor Commercial { get; private set; } = null!;
        public TrialActor Scientific { get; private set; } = null!;
        public TrialApprovalAuthority ScientificAuthority { get; private set; } = null!;
        public CrmCompany Company { get; private set; } = null!;
        public CrmHandoff Handoff { get; private set; } = null!;
        public LabServiceWorkflowVersion WorkflowVersion { get; private set; } = null!;
        private AnalysisDefinition analysis = null!;
        private SampleShippingDestination destination = null!;
        private SampleTypeDefinition sampleType = null!;
        public TrialAccess Access => new(db, new Identity(), new(db, new Identity()));
        public TrialWorkflowService Workflow => new(db, new InternalLabOperationsProvider(db), Access);
        public TrialReader Reader => new(db, Workflow);
        public TrialResultService Results => new(db, Workflow, Options.Create(new PSeqOrderToCashOptions { GovernedPSeqResults = true, PipelineServiceSecret = new string('s', 24), PipelineProviderKey = "fixture", ObjectStorageTransferBaseUrl = "https://storage.example.test" }), Options.Create(new OrderManagementOptions { ReleasedDeliverableRetentionEnforcement = true }));
        public static async Task<Fixture> Create()
        {
            var db = new PSeqOperationsDbContext(new DbContextOptionsBuilder<PSeqOperationsDbContext>().UseNpgsql(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!).AddInterceptors(new AuditSaveChangesInterceptor(new Audit())).Options, Options.Create(new PersistenceOptions()));
            var fixture = new Fixture(db, await db.Database.BeginTransactionAsync()); var now = DateTime.UtcNow;
            var phaeno = new Organization($"Trial Phaeno {Guid.NewGuid():N}", OrganizationKind.Phaeno); fixture.Organization = new($"Trial Prospect {Guid.NewGuid():N}", OrganizationKind.Prospect);
            User User(string name) { var value = new User($"trial-{Guid.NewGuid():N}@example.test", name, "Fixture"); value.Activate(); db.Add(value); return value; }
            var commercial = User("Commercial"); var scientific = User("Scientific"); fixture.Customer = User("Prospect");
            scientific.LinkExternalIdentity("clerk", "trial-science-" + scientific.Id); db.Add(new LabRoleAssignment(scientific.Id, LabRole.ScientificReviewer));
            var membership = new OrganizationMembership(fixture.Customer.Id, fixture.Organization.Id, true);
            db.AddRange(phaeno, fixture.Organization, membership, new OrganizationMembership(commercial.Id, phaeno.Id, true), new OrganizationMembership(scientific.Id, phaeno.Id, false));
            fixture.Commercial = new(commercial, true, true, null); fixture.Scientific = new(scientific, true, false, null);
            fixture.Prospect = new(fixture.Customer, false, false, new(fixture.Customer, fixture.Organization, membership, fixture.Department, true));
            var commercialAuthority = new TrialApprovalAuthority(commercial.Id, TrialApprovalDomain.Commercial, true, null, commercial.Id, "Fixture commercial authority", now);
            fixture.ScientificAuthority = new(scientific.Id, TrialApprovalDomain.ScientificOperations, true, null, commercial.Id, "Fixture scientific authority", now);
            // Reference fixtures are isolated by rollback; existing assignments are restored with it.
            foreach (var current in await db.TrialApprovalAuthorities.Where(value => value.RevokedAtUtc == null).ToListAsync()) current.Revoke(commercial.Id, "Isolated fixture", now);
            await db.SaveChangesAsync(); db.AddRange(commercialAuthority, fixture.ScientificAuthority);
            fixture.Company = new($"Trial Company {Guid.NewGuid():N}", commercial.Id); fixture.Company.EnablePortalAccess(fixture.Organization.Id);
            var pipeline = new CrmPipeline($"Trial pipeline {Guid.NewGuid():N}", "Fixture"); var stage = new CrmPipelineStage(pipeline.Id, "Evaluation", 1, CrmPipelineStageCategory.Open, 10, false);
            var opportunity = new CrmOpportunity("Trial opportunity", fixture.Company.Id, stage, commercial.Id, CrmProductInterests.PSeqLabService, null, "USD", null, null, null, "Commercial context", []);
            var request = new PortalIntegrationRequest(fixture.Organization.Id, fixture.Organization.Name, PortalIntegrationRequestType.Evaluation, PortalIntegrationRequestSource.FirstPartyCrm, OrganizationKind.Prospect, null, "Trial request", null, commercial.Id, []);
            fixture.Handoff = new(fixture.Company.Id, opportunity.Id, CrmHandoffType.TrialProject, request.Id, Guid.NewGuid().ToString());
            db.AddRange(fixture.Company, pipeline, stage, opportunity, request, fixture.Handoff);
            var catalog = await db.QboCatalogItems.SingleOrDefaultAsync(value => value.ExternalItemId == OrderServiceKeys.PSeqLabService);
            if (catalog is null) { catalog = new(OrderServiceKeys.PSeqLabService, "PSeq", "Fixture", "sample", 100, "USD", true, now); db.Add(catalog); }
            fixture.analysis = new(catalog.Id, "Trial PSeq analysis", "Fixture", "Extracted RNA", "[\"biologicalSource\",\"organism\"]", "{}", true, false); db.Add(fixture.analysis);
            var workflow = await db.LabServiceWorkflows.SingleOrDefaultAsync(value => value.ServiceKey == OrderServiceKeys.PSeqLabService);
            if (workflow is null) { workflow = new(OrderServiceKeys.PSeqLabService, "PSeq workflow", "Fixture"); db.Add(workflow); }
            var versions = await db.LabServiceWorkflowVersions.Where(value => value.LabServiceWorkflowId == workflow.Id).ToListAsync();
            foreach (var version in versions.Where(value => value.Status == LabServiceWorkflowStatus.Production)) version.Retire(); await db.SaveChangesAsync();
            fixture.WorkflowVersion = new(workflow.Id, versions.Count == 0 ? 1 : versions.Max(value => value.WorkflowVersion) + 1, commercial.Id, now);
            fixture.WorkflowVersion.Approve(scientific.Id, now); fixture.WorkflowVersion.PromoteToProduction(scientific.Id, now); db.Add(fixture.WorkflowVersion);
            fixture.destination = new(Guid.NewGuid(), 1, null, $"TRIAL_{Guid.NewGuid():N}"[..20], "Trial lab", "Receiving", "Phaeno", "123 Example St", null, "San Diego", "CA", "92101", "US", null, null, "Weekdays", "America/Los_Angeles", null, "Receiving dock", null, false, now.AddDays(-1), true);
            fixture.sampleType = new(Guid.NewGuid(), 1, null, $"RNA_{Guid.NewGuid():N}"[..20], "Extracted RNA", "Fixture", "Extracted RNA", 1, 1000, "ng", "Sealed tubes", "Frozen", null, "Containment", "Coded reference", "No PHI", "Nonhazardous", null, 48, now.AddDays(-1), true);
            var rule = new SampleShippingInstructionRule(Guid.NewGuid(), 1, null, fixture.destination.Id, fixture.sampleType.Id, "RNA", "Containment", "Frozen", "Traceable", "Weekday", "Receiving", "Packet", "Contact Phaeno", null, false, now.AddDays(-1), true);
            db.AddRange(fixture.destination, fixture.sampleType, rule); await db.SaveChangesAsync(); return fixture;
        }
        public async Task<TrialProject> CreateApprovedTrial()
        {
            var trial = await Workflow.CreateAsync(Commercial, new(Handoff.Id), default); await db.SaveChangesAsync();
            var deliverable = await db.TrialDeliverableDefinitions.SingleAsync(value => value.Key == "FASTQ" && value.IsActive);
            await Workflow.ProposeAsync(trial, Commercial, new(trial.Version, Department.Id, "Trial evaluation", "Research objective", 2, DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(10), WorkflowVersion.Id, [analysis.Id], [deliverable.Id], "Frozen extracted RNA", "Existing PSeq criteria", 2000, 500, 30, TrialMaterialDisposition.Destroy, null, null, null, "RUO; no PHI", "Initial scope"), default); await db.SaveChangesAsync();
            await Workflow.DecideAsync(trial, Commercial, new(trial.Version, TrialApprovalDomain.Commercial, TrialDecisionKind.Approve, "Commercially appropriate"), default); await db.SaveChangesAsync();
            await Workflow.DecideAsync(trial, Scientific, new(trial.Version, TrialApprovalDomain.ScientificOperations, TrialDecisionKind.Approve, "Scientifically appropriate"), default); await db.SaveChangesAsync(); return trial;
        }
        public TrialSubmitRequest Submission(TrialProject trial, string reference) => new(trial.Version, destination.Id, sampleType.Id, true, [new(reference, "Synthetic RNA", 2, 100, "ng", 10, "Frozen", "Nonhazardous; no PHI", new() { ["organism"] = "Synthetic organism" }, null, null)]);
        public async Task Submit(TrialProject trial, string reference)
        { if (trial.Status == TrialStatus.AwaitingAcceptance) { Workflow.Accept(trial, Prospect, new(trial.Version, trial.CurrentScopeRevision, TrialRules.TermsVersion, true)); await db.SaveChangesAsync(); } await Workflow.SubmitAsync(trial, Prospect, Submission(trial, reference), default); await db.SaveChangesAsync(); }
        public async Task<ResultOutputPackage> ReadyPackage(TrialSample sample, Guid? corrects = null)
        {
            var work = await db.LabWorkOrders.SingleAsync(value => value.Id == sample.LabWorkOrderId);
            if (work.Status != LabWorkOrderStatus.ReadyForRelease) { work.RecordMilestone(LabWorkOrderStatus.Processing); work.RecordMilestone(LabWorkOrderStatus.ScientificReview); }
            var package = new ResultOutputPackage(Organization.Id, null, work.Id, null, corrects.HasValue ? 2 : 1, corrects, "fixture", Guid.NewGuid().ToString(), Guid.NewGuid().ToString(), "{}", new string('A', 64), 1, sample.TrialProjectId, sample.Id);
            var artifact = new ResultArtifact(package.Id, "FASTQ", sample.Reference + ".fastq", "application/octet-stream", 10, new string('A', 64), $"trial-fixture/{Guid.NewGuid():N}"); artifact.BeginScan(); artifact.CompleteScan(true, null, DateTime.UtcNow);
            package.BeginScanning(); package.MarkReadyForReview(1, true, true);
            db.AddRange(package, artifact); await db.SaveChangesAsync();
            var identity = new ScientificIdentity(new("clerk", Scientific.User.ExternalSubjectId!, Scientific.User.Email, true));
            var labContext = new LabOperationsRequestContext(db, identity, Options.Create(new PSeqOrderToCashOptions { GovernedPSeqResults = true }), Microsoft.Extensions.Logging.Abstractions.NullLogger<LabOperationsRequestContext>.Instance);
            var controller = new PhaenoPortal.App.Features.LabOperations.Controllers.LabOperationsController(db, labContext)
                { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
            await controller.ApproveScientificReview(work.Id, new("trial", 1, null, work.Version, package.Id), default);
            return package;
        }
        private sealed class ScientificIdentity(ExternalIdentity identity) : IExternalIdentityContext { public ExternalIdentity? Read(HttpContext context) => identity; }
        public async ValueTask DisposeAsync() { await transaction.RollbackAsync(); await transaction.DisposeAsync(); await db.DisposeAsync(); }
        private sealed class Identity : IExternalIdentityContext { public ExternalIdentity? Read(HttpContext context) => null; }
        private sealed class Audit : ICurrentUserContext { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => "trial-reference"; }
    }
}
