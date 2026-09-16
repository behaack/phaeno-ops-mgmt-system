namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class KitBundlePostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task SimulatedTwoUnitShipmentRejectsEarlyAndExcessWritesAndKeepsIndependentSources()
    {
        await using var scope = await Scope.Create();
        var order = await scope.PlaceOrder(2);
        var lineId = Assert.Single(order.Lines).Id;
        var early = new CreateShipmentRequest(order.Version, "SIMULATED", null, "EARLY", DateTime.UtcNow, [new(lineId, 1, "TEST LOT", null)]);
        Assert.Equal("shipment_not_allowed", (await Assert.ThrowsAsync<OrderManagementException>(() => scope.Platform().CreateShipment(order.Id, early, default))).ErrorCode);
        Assert.False(await scope.Db.ReagentShipments.AnyAsync(x => x.PartnerReagentOrderId == order.Id));
        var lab = scope.Platform(); lab.HttpContext.Request.Path = "/api/platform/lab-operations/reagent-orders/" + order.Id;
        Assert.Equal(409, (await Assert.ThrowsAsync<OrderManagementException>(() =>
            lab.StartProcessing(order.Id, new(order.Version), default))).StatusCode);
        order = await scope.Platform().Accept(order.Id, new(order.Version), default);
        var at = DateTime.UtcNow.AddDays(-1); at = at.AddTicks(-(at.Ticks % 10));
        var expiry = at.AddMonths(2);
        var key = Guid.NewGuid().ToString();
        var first = new CreateShipmentRequest(order.Version, "SIMULATED", null, "FIRST", at, [new(lineId, 1, "LOT-1", expiry)]);
        order = await scope.Platform(key).CreateShipment(order.Id, first, default);
        var replay = await scope.Platform(key).CreateShipment(order.Id, first, default);
        Assert.Equal(order.Version, replay.Version);
        Assert.Equal(1, Assert.Single(order.Lines).RemainingQuantity);
        Assert.Equal(1, order.KitUnits!.Count(x => x.Status == "Shipped"));
        var excessive = new CreateShipmentRequest(order.Version, "SIMULATED", null, "EXCESS", at, [new(lineId, 2, "LOT-X", null)]);
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.Platform().CreateShipment(order.Id, excessive, default));
        Assert.Single(await scope.Db.ReagentShipments.AsNoTracking().Where(x => x.PartnerReagentOrderId == order.Id).ToListAsync());
        Assert.Single(await scope.Db.CommercialDocumentLinks.AsNoTracking().Where(x => x.WorkflowId == order.Id && x.Kind == CommercialDocumentKind.Invoice).ToListAsync());
        order = await scope.Platform().CreateShipment(order.Id, new(order.Version, "SIMULATED", null, "SECOND", at.AddHours(1), [new(lineId, 1, "LOT-2", null)]), default);
        order = await scope.Platform().Fulfill(order.Id, new(order.Version), default);
        var external = await scope.TenantController().Get(order.Id, default);
        Assert.Equal("KitFulfilledAssemblyPending", external.Status);
        Assert.Equal(0, Assert.Single(external.Lines).RemainingQuantity);
        Assert.Equal(2, external.AssemblyCases!.Count);
        Assert.Contains(external.AssemblyCases, x => x.SubmissionDeadlineAt == expiry.AddDays(90));
        Assert.Contains(external.AssemblyCases, x => x.SubmissionDeadlineAt == at.AddHours(1).AddMonths(12));
        var cases = await scope.Db.KitAssemblyCases.AsNoTracking().Where(x => x.PartnerReagentOrderId == order.Id).ToListAsync();
        Assert.Equal(2, cases.Select(x => x.BillingShipmentId).Distinct().Count());
        Assert.Equal(2, cases.Select(x => x.BillingDocumentId).Distinct().Count());
        Assert.All(cases, x => Assert.Null(x.AssemblyRequestId));
    }

    [PostgreSqlReferenceFact]
    public async Task SimulatedSubstitutionRequiresEligiblePartnerApprovalAndRetainsBothDecisions()
    {
        await using var scope = await Scope.Create();
        var order = await scope.PlaceOrder(1);
        order = await scope.Platform().Accept(order.Id, new(order.Version), default);
        order = await scope.Platform().StartProcessing(order.Id, new(order.Version), default);
        var originalLine = Assert.Single(order.Lines);
        var replacementItem = new QboCatalogItem("SIMULATED-REPLACEMENT-" + Guid.NewGuid().ToString("N"), "SIMULATED alternative Kit", "Same included Assembly scope", "kit", 125m, "USD", true, DateTime.UtcNow);
        var replacement = new PartnerReagentOffering(scope.Partner.Id, replacementItem.Id, 125m, "USD", "kit", 1, 1, 100, "{}", DateTime.UtcNow.AddDays(-1), null, true);
        replacement.SetIncludedAssemblyProfile(scope.Profile.Id);
        scope.Db.AddRange(replacementItem, replacement); await scope.Db.SaveChangesAsync();
        order = await scope.Platform().ProposeAdjustment(order.Id, new(order.Version, originalLine.Id, replacement.Id, 1, "SIMULATED substitution +25"), default);
        var proposed = Assert.Single(order.Adjustments);
        Assert.Equal(25m, proposed.TotalDifference);
        Assert.Equal(originalLine.OfferingId, Assert.Single(order.Lines).OfferingId);
        Assert.Equal(100m, Assert.Single(order.Lines).UnitPrice);

        // Current Partner guidance allows organization or Department admins to
        // decide substitutions. An ordinary member cannot give that consent.
        var membership = await scope.Db.OrganizationMemberships.SingleAsync(x => x.Id == scope.Membership.Id);
        membership.SetOrganizationAdmin(false);
        scope.Db.Add(new OrganizationDepartmentMembership(membership.Id, scope.Department.Id, false));
        await scope.Db.SaveChangesAsync();
        Assert.Equal(403, (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.TenantController().DecideAdjustment(order.Id, proposed.Id, new(order.Version, true), default))).StatusCode);
        scope.Db.ChangeTracker.Clear();
        Assert.Equal("Proposed", (await scope.Db.ReagentOrderAdjustments.AsNoTracking().SingleAsync(x => x.Id == proposed.Id)).Status.ToString());
        var departmentAccess = await scope.Db.OrganizationDepartmentMemberships.SingleAsync(x => x.OrganizationMembershipId == scope.Membership.Id && x.DepartmentId == scope.Department.Id);
        departmentAccess.SetDepartmentAdmin(true); await scope.Db.SaveChangesAsync();
        order = await scope.TenantController().DecideAdjustment(order.Id, proposed.Id, new(order.Version, false), default);
        Assert.Equal("Declined", Assert.Single(order.Adjustments).Status);
        Assert.Equal(originalLine.OfferingId, Assert.Single(order.Lines).OfferingId);
        membership = await scope.Db.OrganizationMemberships.SingleAsync(x => x.Id == scope.Membership.Id);
        membership.SetOrganizationAdmin(true); await scope.Db.SaveChangesAsync();
        order = await scope.Platform().ProposeAdjustment(order.Id, new(order.Version, originalLine.Id, replacement.Id, 1, "SIMULATED second reviewed proposal"), default);
        var next = Assert.Single(order.Adjustments, x => x.Status == "Proposed");
        order = await scope.TenantController().DecideAdjustment(order.Id, next.Id, new(order.Version, true), default);
        Assert.Contains(order.Adjustments, x => x.Id == proposed.Id && x.Status == "Declined");
        Assert.Contains(order.Adjustments, x => x.Id == next.Id && x.Status == "Approved");
        Assert.Equal(125m, Assert.Single(order.Lines).UnitPrice);
        Assert.Equal(replacement.Id, Assert.Single(order.Lines).OfferingId);
        Assert.Equal(replacementItem.Id, Assert.Single(order.Lines).QboCatalogItemId);
        Assert.Equal(scope.Profile.Id, Assert.Single(order.AssemblyCases!).Profile.Id);
        order = await scope.Platform().CreateShipment(order.Id, new(order.Version, "SIMULATED", null, "APPROVED", DateTime.UtcNow, [new(originalLine.Id, 1, "APPROVED LOT", null)]), default);
        var invoice = Assert.Single(await scope.Db.CommercialDocumentLinks.AsNoTracking().Where(x => x.WorkflowId == order.Id && x.Kind == CommercialDocumentKind.Invoice).ToListAsync());
        Assert.Equal(125m, invoice.Total);
        Assert.Single(order.AssemblyCases!);
    }

    [PostgreSqlReferenceFact]
    public async Task SimulatedCaseExtensionCancellationAndRepeatDraftPreserveBundleAndLegacyHistory()
    {
        await using var scope = await Scope.Create();
        var order = await scope.ShipAndFulfill(2);
        var first = order.AssemblyCases![0]; var second = order.AssemblyCases[1];
        var originalDeadline = first.SubmissionDeadlineAt!.Value;
        var key = Guid.NewGuid().ToString();
        var extension = new KitCaseExtensionRequest(first.Version, originalDeadline.AddDays(7), "SIMULATED reviewed extension");
        order = await scope.Platform(key).ExtendIncludedCase(order.Id, first.Id, extension, default);
        await scope.Platform(key).ExtendIncludedCase(order.Id, first.Id, extension, default);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => scope.Platform().ExtendIncludedCase(order.Id, first.Id, extension, default));
        var unauthorized = new PlatformReagentOrdersController(scope.Db, new(scope.Db, new IdentityContext(scope.PartnerIdentity)), new(scope.Db))
            { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
        Assert.Equal(403, (await Assert.ThrowsAsync<OrderManagementException>(() => unauthorized.ExtendIncludedCase(order.Id, first.Id, extension, default))).StatusCode);
        var stored = await scope.Db.KitAssemblyCases.AsNoTracking().Include(x => x.History).SingleAsync(x => x.Id == first.Id);
        Assert.Equal(originalDeadline.AddDays(7), stored.SubmissionDeadlineAt);
        Assert.Single(stored.History, x => x.EventType == "DeadlineExtended");
        order = await scope.Platform().CancelIncludedCase(order.Id, first.Id, new(stored.Version, "SIMULATED unused case cancellation"), default);
        Assert.Equal("KitFulfilledAssemblyPending", order.Status);
        Assert.Equal("AwaitingSubmission", Assert.Single(order.AssemblyCases!, x => x.Id == second.Id).Status);
        second = Assert.Single(order.AssemblyCases!, x => x.Id == second.Id);
        order = await scope.Platform().CancelIncludedCase(order.Id, second.Id, new(second.Version, "SIMULATED second unused case cancellation"), default);
        Assert.Equal("Completed", order.Status);
        Assert.Single(await scope.Db.CommercialDocumentLinks.Where(x => x.WorkflowId == order.Id && x.Kind == CommercialDocumentKind.Invoice && x.Total == 200m).ToListAsync());
        var frozen = (await scope.TenantController().Get(order.Id, default)).PlacementSnapshotJson;
        var offering = await scope.Db.PartnerReagentOfferings.SingleAsync(x => x.Id == scope.Offering.Id);
        offering.Update(140m, "USD", "kit", 1, 1, 100, "{}", DateTime.UtcNow.AddDays(-1), null, true);
        await scope.Db.SaveChangesAsync();
        var repeatKey = Guid.NewGuid().ToString();
        var repeat = await scope.TenantController(repeatKey).CreateDraftFromPrior(order.Id, default);
        Assert.Equal(repeat.Id, (await scope.TenantController(repeatKey).CreateDraftFromPrior(order.Id, default)).Id);
        Assert.NotEqual(order.Id, repeat.Id); Assert.Equal("Draft", repeat.Status); Assert.Null(repeat.PurchaseOrderNumber);
        Assert.Equal(140m, Assert.Single(repeat.Lines).UnitPrice);
        Assert.Empty(repeat.KitUnits!); Assert.Empty(repeat.AssemblyCases!);
        Assert.Equal(frozen, (await scope.TenantController().Get(order.Id, default)).PlacementSnapshotJson);
        offering = await scope.Db.PartnerReagentOfferings.SingleAsync(x => x.Id == scope.Offering.Id);
        offering.Update(140m, "USD", "kit", 1, 1, 100, "{}", DateTime.UtcNow.AddDays(-1), null, false);
        await scope.Db.SaveChangesAsync();
        Assert.Equal("reagent_prior_order_has_no_eligible_lines", (await Assert.ThrowsAsync<OrderManagementException>(() => scope.TenantController().CreateDraftFromPrior(order.Id, default))).ErrorCode);

        var legacy = new PartnerReagentOrder(scope.Partner.Id, scope.Department.Id, "SIMULATED-HISTORICAL-REAGENT");
        var assembly = new DataAssemblyRequest(scope.Partner.Id, scope.Department.Id, "SIMULATED-HISTORICAL-ASSEMBLY", "Historical terms", scope.Profile.Id, 1, "Original profile", "Original instructions", "{}", "Original outputs", null, true);
        var historicalRevision = new AssemblyInputRevision(assembly.Id, 1, null, "{}", null, "{}", scope.Actor.Id, DateTime.UtcNow.AddDays(-3));
        assembly.Submit(historicalRevision.Id, DateTime.UtcNow.AddDays(-3)); assembly.BeginIntakeValidation(); assembly.BeginQuotePreparation();
        var historicalQuote = new DataAssemblyQuote(assembly.Id, 1, QuotePurpose.Initial, "[]", 300m, 30m, "USD", DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddDays(10));
        historicalQuote.MarkIssued(); assembly.MarkQuoteIssued(historicalQuote.Id);
        scope.Db.AddRange(legacy, assembly, historicalRevision, historicalQuote); await scope.Db.SaveChangesAsync();
        var oldOrder = await scope.TenantController().Get(legacy.Id, default);
        var oldAssembly = await scope.Assembly().Get(assembly.Id, default);
        Assert.False(oldOrder.IsKitBundle); Assert.Empty(oldOrder.AssemblyCases!);
        Assert.False(oldAssembly.IsIncludedAssembly); Assert.Null(oldAssembly.KitAssemblyCaseId);
        Assert.Equal("Original outputs", oldAssembly.RequestedOutput);
        Assert.True(oldAssembly.CanAcceptQuote);
        Assert.Equal(330m, Assert.Single(oldAssembly.Quotes).Total);
        Assert.Equal("included_kit_case_required", (await Assert.ThrowsAsync<OrderManagementException>(() => scope.Assembly().Create(new(scope.Profile.Id, "New standalone denied", "{}", "Outputs", null, true), default))).ErrorCode);
    }
}
