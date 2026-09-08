namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task StandardLabOfferingDraftVersionPreservesCurrentAvailabilityUntilPublishedWindow()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var (_, original) = await scope.ConfigureStandardAsync();
        var controller = scope.StandardOfferingController();
        var future = DateTime.UtcNow.Date.AddDays(10);
        var body = new LabServiceOfferingWriteRequest(original.Name, original.Description, original.CatalogItemId,
            original.AnalysisIds(), original.AllowedMaterialTypes(), original.AllowedBiologicalSources(), original.IncludedOutputContract,
            8, 15, future, null, false, false, original.Version);
        var draft = await controller.CreateVersion(original.Id, body, default); scope.TrackStandardOffering(draft.Id);
        Assert.True((await scope.DbContext.LabServiceOfferings.AsNoTracking().SingleAsync(value => value.Id == original.Id)).IsActive);
        var published = await controller.CreateVersion(draft.Id, body with { Version = draft.Version, IsActive = true }, default);
        scope.TrackStandardOffering(published.Id);
        var previous = await scope.DbContext.LabServiceOfferings.AsNoTracking().SingleAsync(value => value.Id == original.Id);
        Assert.True(previous.IsEffectiveAt(DateTime.UtcNow)); Assert.Equal(future, previous.EffectiveTo);
        Assert.False(previous.IsEffectiveAt(future));
        Assert.True((await scope.DbContext.LabServiceOfferings.AsNoTracking().SingleAsync(value => value.Id == published.Id)).IsEffectiveAt(future));
    }
    [PostgreSqlReferenceFact]
    public async Task StandardLabCommitmentFreezesTheReviewedTotalAndReplaysWithoutAuthorizingLab()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var (order, offering) = await scope.ConfigureStandardAsync();
        var controller = scope.StandardController();
        var preview = await controller.PreviewStandard(order.Id, offering.Id, default);
        Assert.True(preview.CanPlaceStandardOrder, string.Join("; ", preview.Blockers));
        var expectedTotal = decimal.Round(preview.Offering.UnitPrice * 1.1m, 2, MidpointRounding.AwayFromZero);
        Assert.Equal(expectedTotal, preview.Total);
        var request = StandardRequest(preview);
        var placed = await controller.PlaceStandard(order.Id, request, default);
        var replay = await controller.PlaceStandard(order.Id, request, default);
        Assert.Equal(placed.Id, replay.Id); Assert.Equal("ConfiguredDirect", placed.EntryMode);
        Assert.Equal("PlacedAwaitingSamples", placed.Status); Assert.Empty(placed.Samples);
        Assert.Equal(expectedTotal, Assert.Single(placed.Quotes).Total);
        Assert.Equal(14, placed.StandardCommercialSnapshot!.MaximumTurnaroundDays);
        Assert.Single(await scope.DbContext.LabServiceQuotes.Where(value => value.LabServiceOrderId == order.Id).ToListAsync());
        Assert.False(await scope.DbContext.CommercialLabAuthorizations.AnyAsync(value => value.CommercialOrderId == order.Id));
        var summary = Assert.Single(await scope.DbContext.CommercialSaleSummaries.Where(value => value.OrderId == order.Id).ToListAsync());
        Assert.False(await new CommercialSaleSummaryService(scope.DbContext).ProjectAsync(summary.Id, default));
        Assert.Equal("company_link_missing", summary.FailureCode);
        Assert.Equal("PlacedAwaitingSamples", (await controller.Get(order.Id, default)).Status);
        var company = await scope.AddStandardCompanyAsync();
        Assert.True(await new CommercialSaleSummaryService(scope.DbContext).ProjectAsync(summary.Id, default));
        Assert.True(await new CommercialSaleSummaryService(scope.DbContext).ProjectAsync(summary.Id, default));
        Assert.Single(await scope.DbContext.CrmActivities.Where(value => value.CompanyId == company.Id).ToListAsync());
        var otherDepartment = new OrganizationDepartment(order.OrganizationId, $"other-{Guid.NewGuid():N}", "Another Department");
        scope.DbContext.Add(otherDepartment); await scope.DbContext.SaveChangesAsync();
        controller.HttpContext.Request.Headers["X-Department-Id"] = otherDepartment.Id.ToString();
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => controller.PlaceStandard(order.Id, request, default))).StatusCode);
    }

    [PostgreSqlReferenceFact]
    public async Task StandardLabRejectsChangedCatalogOrScientificReviewAndLeavesTheDraftIntact()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var (order, offering) = await scope.ConfigureStandardAsync(); var controller = scope.StandardController();
        var preview = await controller.PreviewStandard(order.Id, offering.Id, default);
        var analysis = await scope.DbContext.AnalysisDefinitions.SingleAsync(value => value.Id == offering.AnalysisIds().Single());
        analysis.Update(analysis.Name, "Changed scientific scope", analysis.SubmissionInstructions, analysis.RequiredIntakeFieldsJson,
            "[\"updated-output\"]", true, false); await scope.DbContext.SaveChangesAsync();
        var stale = await Assert.ThrowsAsync<OrderManagementException>(() => controller.PlaceStandard(order.Id, StandardRequest(preview), default));
        Assert.Equal("standard_review_expired", stale.ErrorCode);
        scope.DbContext.ChangeTracker.Clear();
        Assert.Equal(LabServiceOrderStatus.DraftRequest, (await scope.DbContext.LabServiceOrders.SingleAsync(value => value.Id == order.Id)).Status);
        Assert.False(await scope.DbContext.LabServiceQuotes.AnyAsync(value => value.LabServiceOrderId == order.Id));
        Assert.False(await scope.DbContext.CommercialSaleSummaries.AnyAsync(value => value.OrderId == order.Id));
        var current = await controller.PreviewStandard(order.Id, offering.Id, default);
        Assert.NotEqual(preview.ReviewToken, current.ReviewToken);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => controller.PlaceStandard(order.Id,
            StandardRequest(current) with { CatalogItemVersion = current.Offering.CatalogItemVersion - 1 }, default));
    }

    [PostgreSqlReferenceFact]
    public async Task PartnerStandardLabCommitmentRequiresOrganizationAdminAndKeepsOtherTenantsHidden()
    {
        await using var scope = await HandoffTestScope.CreateAsync(OrganizationKind.Partner);
        var (order, offering) = await scope.ConfigureStandardAsync(); var controller = scope.StandardController();
        var preview = await controller.PreviewStandard(order.Id, offering.Id, default);
        Assert.True(preview.CanPlaceStandardOrder, string.Join("; ", preview.Blockers));
        var session = await scope.ReadStandardSessionAsync();
        Assert.True(session.Capabilities.CanViewLabServiceOrders);
        Assert.True(session.Capabilities.CanViewSampleShipping);
        Assert.True(session.Capabilities.CanDownloadLabResults);
        controller.HttpContext.Request.Headers["X-Organization-Id"] = Guid.NewGuid().ToString();
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => controller.Get(order.Id, default))).StatusCode);
        controller.HttpContext.Request.Headers["X-Organization-Id"] = scope.CustomerOrganization.Id.ToString();
        var membership = await scope.DbContext.OrganizationMemberships.SingleAsync(value => value.UserId == scope.CustomerUser.Id);
        membership.SetOrganizationAdmin(false);
        scope.DbContext.Add(new OrganizationDepartmentMembership(membership.Id, order.DepartmentId, true));
        await scope.DbContext.SaveChangesAsync();
        Assert.True((await controller.Get(order.Id, default)).CanEdit);
        Assert.False((await controller.Get(order.Id, default)).CanPlaceStandardOrder);
        Assert.Equal(403, (await Assert.ThrowsAsync<OrderManagementException>(() => controller.PlaceStandard(order.Id, StandardRequest(preview), default))).StatusCode);
    }

    [PostgreSqlReferenceFact]
    public async Task StandardTimingOverrideKeepsPrivateHistoryAndQueuesOnlyLaterDateNotice()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var (order, _) = await scope.ConfigureStandardAsync();
        var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, order.Id,
            order.OrganizationId, OrderServiceKeys.PSeqLabService, 1, "configured", order.OrderNumber,
            minimumTurnaroundDays: 7, maximumTurnaroundDays: 14);
        var specimen = new LabSpecimen(work.Id, Guid.NewGuid()); work.Specimens.Add(specimen);
        specimen.RecordReceipt(DateTime.UtcNow.AddDays(-1), "Good", "Freezer"); specimen.AssignAccession($"STD-{Guid.NewGuid():N}");
        specimen.RecordIntakeDisposition(LabSpecimenIntakeDisposition.Accepted, null);
        work.RefreshAcceptedSpecimenTargets(); scope.DbContext.Add(work); await scope.DbContext.SaveChangesAsync();
        var controller = scope.CreatePlatformLabController();
        var expected = DateTime.UtcNow.Date.AddDays(25);
        var changed = await controller.OverrideOrderTiming(order.Id, new(work.Version, expected, "Other operational delay",
            "Additional processing is needed.", "Private diagnostic detail"), default);
        Assert.Equal(expected, changed.ExpectedCompletionAtUtc);
        Assert.Equal("Private diagnostic detail", Assert.Single(changed.Changes).InternalNote);
        var tenant = (await new LabServiceTimingService(scope.DbContext).ReadAsync(order.Id, order.OrganizationId, false, false, default))!;
        Assert.Null(Assert.Single(tenant.Changes).InternalNote); Assert.False(tenant.CanOverrideTiming);
        var notice = Assert.Single(await scope.DbContext.OrderNotifications.Where(value => value.WorkflowId == order.Id).ToListAsync());
        Assert.DoesNotContain("Private diagnostic detail", notice.Body);
        await Assert.ThrowsAsync<OrderManagementException>(() => controller.OverrideOrderTiming(order.Id,
            new(work.Version - 1, expected.AddDays(1), "Laboratory scheduling adjustment"), default));
        var earlier = await controller.OverrideOrderTiming(order.Id, new(changed.Version, expected.AddDays(-2), "Laboratory scheduling adjustment"), default);
        Assert.Equal(2, earlier.Changes.Count); Assert.False(earlier.Changes[1].NotificationRequired);
        Assert.Single(await scope.DbContext.OrderNotifications.Where(value => value.WorkflowId == order.Id).ToListAsync());
    }

    private static PlaceStandardLabOrderRequest StandardRequest(StandardLabOrderPreviewDto value) => new(value.OrderVersion,
        value.Offering.Id, value.Offering.OfferingVersion, value.Offering.Version, value.Offering.CatalogItemVersion,
        value.CommercialProfileVersion!.Value, value.DepartmentVersion, value.OrganizationVersion, value.ReviewToken, true);

    private sealed partial class HandoffTestScope
    {
        private readonly List<Guid> configuredOfferingIds = [];
        private readonly List<Guid> configuredAnalysisIds = [];
        private readonly List<Guid> configuredSystemIds = [];
        public LabServiceOrdersController StandardController() => CreateCustomerController(new InternalLabOperationsProvider(DbContext), Guid.NewGuid().ToString("N"));
        public LabServiceOfferingsAdminController StandardOfferingController() => new(DbContext,
            new OrderRequestContext(DbContext, new FixedIdentityContext(platformIdentity)))
            { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
        public void TrackStandardOffering(Guid id) => configuredOfferingIds.Add(id);
        public async Task<SessionDto> ReadStandardSessionAsync()
        {
            var http = new DefaultHttpContext(); http.Request.Headers["X-Organization-Id"] = CustomerOrganization.Id.ToString();
            var response = await SessionEndpoints.GetSession(http, DbContext, new FixedIdentityContext(customerIdentity),
                Options.Create(new BootstrapOptions()), Options.Create(new PSeqOrderToCashOptions()), default);
            return Assert.IsType<SessionDto>(Assert.IsAssignableFrom<IValueHttpResult>(response).Value);
        }
        public async Task<CrmCompany> AddStandardCompanyAsync()
        {
            var company = new CrmCompany($"Standard Company {Guid.NewGuid():N}", PlatformUser.Id);
            company.EnablePortalAccess(CustomerOrganization.Id); createdCrmCompanyIds.Add(company.Id);
            DbContext.Add(company); await DbContext.SaveChangesAsync(); return company;
        }
        public async Task<(LabServiceOrder Order, LabServiceOffering Offering)> ConfigureStandardAsync()
        {
            var now = DateTime.UtcNow;
            var catalog = await DbContext.QboCatalogItems.SingleAsync(value => value.ExternalItemId == OrderServiceKeys.PSeqLabService);
            var analysis = new AnalysisDefinition(catalog.Id, "Included analysis", "Reference scope", "Follow instructions", "[]", "[\"FASTQ\"]", true, false);
            configuredAnalysisIds.Add(analysis.Id);
            var offering = new LabServiceOffering(Guid.NewGuid(), 1, "Standard Lab", "Processing and assembly", catalog.Id,
                [analysis.Id], ["extracted_rna"], ["Human PBMC"], "FASTQ and assembled outputs", 7, 14, now.AddDays(-1), null, true, false);
            configuredOfferingIds.Add(offering.Id);
            var system = new OrderSystemConfiguration(30, "Follow shipping instructions", "{}");
            system.UpdatePSeqReadinessConfiguration("{\"mode\":\"ExactSampleRoster\"}", "{\"destination\":\"GovernedPortal\"}");
            configuredSystemIds.Add(system.Id);
            var profile = new OrganizationCommercialProfile(CustomerOrganization.Id);
            profile.UpdateBillingConfiguration("Billing", "billing@example.com", "{\"line1\":\"Reference address\"}", 30, EffectiveTaxDecision.Taxable, 0.1m, null);
            profile.ApproveTaxDecision(PlatformUser.Id, now, "Reference Finance approval");
            var department = await DbContext.OrganizationDepartments.SingleAsync(value => value.OrganizationId == CustomerOrganization.Id && value.IsDefault);
            var order = new LabServiceOrder(CustomerOrganization.Id, department.Id, $"STD-{Guid.NewGuid():N}", $"Study {Guid.NewGuid():N}",
                null, 1, false, "Human PBMC", "Frozen", "No hazards", "Follow shipping instructions");
            order.SourceGroups.Add(new LabServiceSourceGroup(order.Id, "Human PBMC", 1));
            DbContext.AddRange(analysis, offering, system, profile, order); await DbContext.SaveChangesAsync();
            await DbContext.OrderSystemConfigurations.Where(value => value.Id == system.Id).ExecuteUpdateAsync(update => update.SetProperty(value => value.CreatedAt, DateTime.UnixEpoch));
            DbContext.ChangeTracker.Clear(); return (order, offering);
        }
    }
}
