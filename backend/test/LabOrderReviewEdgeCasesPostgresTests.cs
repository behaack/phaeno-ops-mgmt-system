namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task EarlyPhaseCancellationFinalizesOnlyTheRemainingPhysicalCohort()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync("early-cancellation", 2, separateSamplePhases: true);
        var phases = await scope.DbContext.Set<LabJobPhase>().Where(p => p.LabServiceOrderId == fixture.OrderId).OrderBy(p => p.Position).ToArrayAsync();
        foreach (var phase in phases) phase.SetScope(new([new("synthetic_reference", 1)], 1, 1));
        await scope.DbContext.SaveChangesAsync();
        await scope.AcceptQuoteAsync(fixture);
        var provider = new InternalLabOperationsProvider(scope.DbContext);
        var plan = await new LabPhaseFacts(scope.DbContext).ReadAsync(fixture.OrderId, default);
        plan = await scope.CreateCustomerController(provider, Guid.NewGuid().ToString("N"))
            .RequestPhaseCancellation(fixture.OrderId, phases[1].Id, new(plan.Revision, "Unused phase before preparation"), default);
        var cancellation = Assert.Single(plan.Cancellations);
        await scope.CreatePlatformController(provider, Guid.NewGuid().ToString("N"))
            .DecidePhaseCancellation(fixture.OrderId, cancellation.Id, new(cancellation.Version, true, "Agreed unused scope"), default);
        scope.DbContext.ChangeTracker.Clear();
        var customer = scope.CreateCustomerController(provider, Guid.NewGuid().ToString("N"));
        var workspace = await customer.ReadSampleTubePairs(fixture.OrderId, default);
        Assert.Equal(1, workspace.ExpectedSampleCount);
        Assert.Equal(1, workspace.ExpectedSequencingRunCount);
        Assert.Equal(phases[0].Id, Assert.Single(workspace.PreparationPhaseIds));
        var order = await customer.Get(fixture.OrderId, default);
        var paired = await scope.AddReferenceSampleAsync(fixture.OrderId, order.Version);
        Assert.True(paired.CanFinalizeSamples);
        var finalized = await scope.FinalizeSampleRosterAsync(fixture.OrderId, paired.Version, provider);
        Assert.NotNull(finalized.SampleRosterFinalizedAt);
        Assert.Equal(2, finalized.RequestedSpecimenCount);
        Assert.Equal(phases[0].Id, Assert.Single(await scope.DbContext.LabSamples.Where(s => s.LabServiceOrderId == fixture.OrderId).ToArrayAsync()).LabJobPhaseId);
        var authorization = await scope.DbContext.CommercialLabAuthorizations.SingleAsync(a => a.CommercialOrderId == fixture.OrderId);
        Assert.Single(await scope.DbContext.LabSpecimens.Where(s => s.LabWorkOrderId == authorization.LabWorkOrderId).ToArrayAsync());
        var shipment = Assert.Single(await scope.DbContext.SampleShipments.Include(s => s.Items).Where(s => s.AuthorizationSourceId == fixture.OrderId).ToArrayAsync());
        Assert.Single(shipment.Items);
        Assert.Equal("Cancelled", (await new LabPhaseFacts(scope.DbContext).ReadAsync(fixture.OrderId, default)).Phases.Single(p => p.Id == phases[1].Id).Lifecycle);
    }

    [PostgreSqlReferenceFact]
    public async Task PreTaxPartialInvoicesReconcileRoundingWithoutRepricingEarlierTaxRates()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        await using var invoiceCleanup = new ReviewInvoiceCleanup(scope);
        var fixture = await scope.CreateQuotedOrderAsync("partial-tax-rounding");
        await scope.AcceptQuoteAsync(fixture);
        var order = await scope.DbContext.LabServiceOrders.Include(o => o.Phases).Include(o => o.Quotes).SingleAsync(o => o.Id == fixture.OrderId);
        Assert.Null(order.Quotes.Single(q => q.Id == fixture.QuoteId).TaxDecisionSnapshotJson);
        var profile = new OrganizationCommercialProfile(order.OrganizationId);
        profile.UpdateBillingConfiguration("Test billing", "billing@example.invalid", "{\"line1\":\"Test address\"}", 30, EffectiveTaxDecision.Taxable, .0725m, null);
        profile.ApproveTaxDecision(scope.PlatformUser.Id, DateTime.UtcNow, "SIMULATED approved tax");
        scope.DbContext.Add(profile);
        await scope.DbContext.SaveChangesAsync();
        var phaseId = Assert.Single(order.Phases).Id;
        var storage = new CompletionPdfStorage();
        for (var i = 0; i < 4; i++)
            await scope.CompletionController(Guid.NewGuid().ToString("N"), storage).IssuePhaseInvoice(order.Id,
                new(order.PhasePlanRevision, [new(phaseId, 25m)]), default);
        var invoices = await scope.DbContext.Invoices.Where(i => i.LabServiceOrderId == order.Id).ToArrayAsync();
        Assert.Equal(100m, invoices.Sum(i => i.Subtotal));
        Assert.Equal(7.25m, invoices.Sum(i => i.TaxTotal));
        Assert.Single(invoices, i => i.TaxTotal == 1.82m);

        var second = await scope.CreateQuotedOrderAsync("changed-partial-tax-rate");
        await scope.AcceptQuoteAsync(second);
        var secondOrder = await scope.DbContext.LabServiceOrders.Include(o => o.Phases).SingleAsync(o => o.Id == second.OrderId);
        var request = new LabPhaseInvoiceWriteRequest(secondOrder.PhasePlanRevision, [new(Assert.Single(secondOrder.Phases).Id, 25m)]);
        await scope.CompletionController(Guid.NewGuid().ToString("N"), storage).IssuePhaseInvoice(secondOrder.Id, request, default);
        profile = await scope.DbContext.OrganizationCommercialProfiles.SingleAsync(p => p.OrganizationId == order.OrganizationId);
        profile.UpdateBillingConfiguration("Test billing", "billing@example.invalid", "{\"line1\":\"Test address\"}", 30, EffectiveTaxDecision.Taxable, .1m, null);
        profile.ApproveTaxDecision(scope.PlatformUser.Id, DateTime.UtcNow, "SIMULATED new tax rate");
        await scope.DbContext.SaveChangesAsync();
        await scope.CompletionController(Guid.NewGuid().ToString("N"), storage).IssuePhaseInvoice(secondOrder.Id, request, default);
        var changed = await scope.DbContext.Invoices.Where(i => i.LabServiceOrderId == secondOrder.Id).ToArrayAsync();
        Assert.Equal([1.81m, 2.50m], changed.Select(i => i.TaxTotal).Order().ToArray());
    }

    private sealed class ReviewInvoiceCleanup(HandoffTestScope scope) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            var db = scope.DbContext;
            var ids = db.Invoices.Where(i => i.OrganizationId == scope.CustomerOrganization.Id).Select(i => i.Id);
            var allocations = db.Set<LabPhaseInvoiceAllocation>().Where(a => ids.Contains(a.InvoiceId)).Select(a => a.Id);
            await db.Set<LabPhaseBillingAssignment>().Where(a => allocations.Contains(a.LabPhaseInvoiceAllocationId)).ExecuteDeleteAsync();
            await db.Set<LabPhaseInvoiceAllocation>().Where(a => ids.Contains(a.InvoiceId)).ExecuteDeleteAsync();
            await db.InvoiceLines.Where(l => ids.Contains(l.InvoiceId)).ExecuteDeleteAsync();
            await db.Invoices.Where(i => ids.Contains(i.Id)).ExecuteDeleteAsync();
        }
    }
}
