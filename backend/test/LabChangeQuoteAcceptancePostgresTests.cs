namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Npgsql;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.LabOperations.Services;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public Task ManualQuoteRetainsCorrectionAndIndependentPriceReview() => WithChangeDatabase(scope => scope.VerifyManualQuoteLifecycleAsync());

    [PostgreSqlReferenceFact]
    public Task ChangeQuotePreservesAgreementAndRequiresCurrentCustomerAcceptance() => WithChangeDatabase(async scope =>
    {
        var fixture = await scope.CreateQuotedOrderAsync("Change acceptance", 2);
        var accepted = await scope.AcceptQuoteAsync(fixture);
        var original = await scope.DbContext.LabServiceOrders.AsNoTracking().SingleAsync(o => o.Id == fixture.OrderId);
        var departmentMembership = await scope.DbContext.OrganizationMemberships.SingleAsync(value => value.UserId == scope.CustomerUser.Id);
        departmentMembership.SetOrganizationAdmin(false);
        var departmentOrder = await scope.DbContext.LabServiceOrders.SingleAsync(value => value.Id == fixture.OrderId);
        scope.DbContext.Add(new OrganizationDepartmentMembership(departmentMembership.Id, departmentOrder.DepartmentId, true));
        await scope.DbContext.SaveChangesAsync();
        var originalSnapshot = original.PlacementSnapshotJson;
        var proposed = await scope.IssueAddition(fixture.OrderId, accepted.Version);
        Assert.Equal(2, proposed.RequestedSpecimenCount);
        Assert.Equal("PlacedAwaitingSamples", proposed.Status);
        Assert.Empty(await scope.DbContext.LabWorkOrders.ToListAsync());
        var quote = proposed.Quotes.Single(q => q.Purpose == "Change");
        Assert.Equal(100m, quote.Subtotal);
        Assert.NotNull(quote.ChangeScopeSnapshotJson);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => scope.AcceptAddition(fixture.OrderId, quote.Id, accepted.Version));
        var expanded = await scope.AcceptAddition(fixture.OrderId, quote.Id, proposed.Version);
        Assert.Equal(3, expanded.RequestedSpecimenCount);
        Assert.Equal(3, expanded.SourceGroups!.Sum(g => g.SpecimenCount));
        Assert.Equal(originalSnapshot, (await scope.DbContext.LabServiceOrders.AsNoTracking().SingleAsync(o => o.Id == fixture.OrderId)).PlacementSnapshotJson);
        Assert.Equal(fixture.QuoteId, (await scope.DbContext.LabServiceOrders.AsNoTracking().SingleAsync(o => o.Id == fixture.OrderId)).AcceptedQuoteId);
        Assert.Empty(await scope.DbContext.LabWorkOrders.ToListAsync());
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => scope.AcceptAddition(fixture.OrderId, quote.Id, proposed.Version));
        var replacement = await scope.IssueAddition(fixture.OrderId, expanded.Version);
        var declinedQuote = replacement.Quotes.Single(q => q.Purpose == "Change" && q.Status == "Issued");
        var declined = await scope.DeclineAddition(fixture.OrderId, declinedQuote.Id, replacement.Version);
        Assert.Equal(3, declined.RequestedSpecimenCount);
        Assert.Equal("Declined", declined.Quotes.Single(q => q.Id == declinedQuote.Id).Status);
        Assert.Equal("PlacedAwaitingSamples", declined.Status);
    });

    [PostgreSqlReferenceFact]
    public Task ChangeQuoteAppendsWorkAndChargesWithoutChangingAuthorizedSamples() => WithChangeDatabase(async scope =>
    {
        var fixture = await scope.CreateQuotedOrderAsync("Started work addition");
        var authorized = await scope.AuthorizeSampleRosterAsync(fixture, new InternalLabOperationsProvider(scope.DbContext));
        var originalSample = authorized.Samples.Single();
        var work = await scope.DbContext.LabWorkOrders.Include(w => w.Specimens).SingleAsync();
        work.Specimens.Single().RecordReceipt(DateTime.UtcNow, "SIMULATED receipt", null);
        // Exercise a started work state while retaining all original custody and configuration.
        scope.DbContext.Entry(work).Property(w => w.Status).CurrentValue = LabWorkOrderStatus.Processing;
        await scope.DbContext.SaveChangesAsync();
        var proposal = await scope.IssueAddition(fixture.OrderId, authorized.Version);
        var change = proposal.Quotes.Single(q => q.Purpose == "Change");
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.AddReferenceSampleAsync(fixture.OrderId, proposal.Version));
        var accepted = await scope.AcceptAddition(fixture.OrderId, change.Id, proposal.Version);
        Assert.Contains(originalSample.Id, accepted.AuthorizedSampleIds!);
        var controller = scope.CreateChangeCustomerController();
        await Assert.ThrowsAsync<OrderManagementException>(() => controller.DeleteSample(fixture.OrderId, originalSample.Id, new(originalSample.Version), default));
        var roster = await scope.AddReferenceSampleAsync(fixture.OrderId, accepted.Version);
        var finalized = await scope.FinalizeSampleRosterAsync(fixture.OrderId, roster.Version, new InternalLabOperationsProvider(scope.DbContext));
        Assert.Equal(authorized.SampleRosterFinalizedAt!.Value.Ticks / 10, finalized.SampleRosterFinalizedAt!.Value.Ticks / 10);
        Assert.False(finalized.CanEditSamples);
        work = await scope.DbContext.LabWorkOrders.Include(w => w.Specimens).SingleAsync();
        Assert.Equal(LabWorkOrderStatus.Processing, work.Status);
        Assert.Equal(2, work.CurrentAuthorizationVersion);
        Assert.Equal(2, work.Specimens.Count);
        Assert.NotNull(work.Specimens.Single(s => s.SubmittedSpecimenId == originalSample.Id).ReceivedAtUtc);
        Assert.Equal(2, await scope.DbContext.LabWorkAuthorizationVersions.CountAsync());
        Assert.Equal(2, await scope.DbContext.SampleShipments.CountAsync());
        Assert.Equal(2, await scope.DbContext.SampleShipmentItems.Select(s => s.SubmittedSpecimenId).Distinct().CountAsync());
        var authorization = await scope.DbContext.CommercialLabAuthorizations.SingleAsync();
        foreach (var specimen in work.Specimens)
        {
            if (!specimen.ReceivedAtUtc.HasValue) specimen.RecordReceipt(DateTime.UtcNow, "SIMULATED receipt", null);
            specimen.RecordProcessingState(LabSpecimenProcessingState.Failed, scope.PlatformUser.Id, DateTime.UtcNow, "material_exhausted", "SIMULATED terminal evidence");
        }
        await scope.DbContext.SaveChangesAsync();
        var facts = await LabIntakeProgress.ReadAsync(scope.DbContext, work, default);
        await CommercialLabIntakeProgressService.ApplyAsync(scope.DbContext, authorization.AuthorizationId, work.Id, facts, scope.PlatformUser.Id, DateTime.UtcNow, default);
        var profile = new OrganizationCommercialProfile(scope.CustomerOrganization.Id);
        profile.UpdateBillingConfiguration("Test billing", "billing@example.invalid", "{\"line1\":\"Test address\"}", 30, EffectiveTaxDecision.Taxable, .1m, null);
        profile.ApproveTaxDecision(scope.PlatformUser.Id, DateTime.UtcNow, "SIMULATED approved tax");
        scope.DbContext.Add(profile); await scope.DbContext.SaveChangesAsync();
        var order = await scope.DbContext.LabServiceOrders.Include(o => o.Samples).SingleAsync(o => o.Id == fixture.OrderId);
        var storage = new CompletionPdfStorage();
        var key = Guid.NewGuid().ToString("N");
        var version = order.Version;
        await scope.CompletionController(key, storage).Complete(order.Id, new(version), default);
        var invoice = await scope.DbContext.Invoices.SingleAsync();
        Assert.Equal(200m, invoice.Subtotal);
        Assert.Equal(20m, invoice.TaxTotal);
        Assert.Equal(220m, invoice.Total);
        Assert.Equal(2, await scope.DbContext.InvoiceLines.CountAsync());
        await scope.CompletionController(key, storage).Complete(order.Id, new(version), default);
        Assert.Equal(1, await scope.DbContext.Invoices.CountAsync());
    });

    [PostgreSqlReferenceFact]
    public Task ChangeQuoteRejectsSupersededExpiredAndUnauthorizedDecisions() => WithChangeDatabase(async scope =>
    {
        var fixture = await scope.CreateQuotedOrderAsync("Change decision guards");
        var accepted = await scope.AcceptQuoteAsync(fixture);
        var first = await scope.IssueAddition(fixture.OrderId, accepted.Version);
        var firstId = first.Quotes.Single(q => q.Purpose == "Change").Id;
        var second = await scope.IssueAddition(fixture.OrderId, first.Version);
        var secondId = second.Quotes.Single(q => q.Purpose == "Change" && q.Status == "Issued").Id;
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.AcceptAddition(fixture.OrderId, firstId, second.Version));
        scope.DbContext.ChangeTracker.Clear();
        var member = await scope.DbContext.OrganizationMemberships.SingleAsync(m => m.UserId == scope.CustomerUser.Id);
        member.SetOrganizationAdmin(false); await scope.DbContext.SaveChangesAsync();
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.AcceptAddition(fixture.OrderId, secondId, second.Version));
        scope.DbContext.ChangeTracker.Clear();
        member = await scope.DbContext.OrganizationMemberships.SingleAsync(m => m.UserId == scope.CustomerUser.Id);
        member.SetOrganizationAdmin(true);
        var expiring = await scope.DbContext.LabServiceQuotes.SingleAsync(q => q.Id == secondId);
        scope.DbContext.Entry(expiring).Property(q => q.ExpiresAt).CurrentValue = DateTime.UtcNow.AddMinutes(-1);
        await scope.DbContext.SaveChangesAsync();
        var error = await Assert.ThrowsAsync<OrderManagementException>(() => scope.AcceptAddition(fixture.OrderId, secondId, second.Version));
        Assert.Equal("quote_expired", error.ErrorCode);
        scope.DbContext.ChangeTracker.Clear();
        Assert.Equal(1, (await scope.DbContext.LabServiceOrders.SingleAsync(o => o.Id == fixture.OrderId)).RequestedSpecimenCount);
        Assert.Empty(await scope.DbContext.CommercialLabAuthorizations.ToListAsync());
    });

    private static async Task WithChangeDatabase(Func<HandoffTestScope, Task> action)
    {
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!);
        if (connection.Host is not ("localhost" or "127.0.0.1")) throw new InvalidOperationException("Requires disposable loopback PostgreSQL.");
        var name = $"pseq_handoff_test_{Guid.NewGuid():N}";
        await using var admin = new NpgsqlConnection(connection.ConnectionString); await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin)) await create.ExecuteNonQueryAsync();
        connection.Database = name; connection.Pooling = false;
        try { await using var scope = await HandoffTestScope.CreateAsync(isolatedConnection: connection.ConnectionString); await action(scope); }
        finally { await using var drop = new NpgsqlCommand($"DROP DATABASE {name} WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync(); }
    }

    private sealed partial class HandoffTestScope
    {
        public async Task VerifyManualQuoteLifecycleAsync()
        {
            DbContext.Add(new BusinessRoleAssignment(PlatformUser.Id, BusinessRole.CommercialOperator));
            await DbContext.SaveChangesAsync();
            var input = new LabOrderWriteRequest("Manual quote acceptance", "Original profile", false,
                "synthetic_reference", "frozen", "No hazards", [], RequestedSpecimenCount: 2,
                SourceGroups: [new("synthetic_reference", 2)],
                SampleTypeDefinitionId: shippingConfiguration.ActiveSampleTypeId);
            var draft = await CreateChangeCustomerController().Create(input, default);
            var submitted = await CreateChangeCustomerController().Submit(draft.Id, new(draft.Version), default);
            var revision1 = await DbContext.LabServiceRequestRevisions.AsNoTracking().SingleAsync(r => r.LabServiceOrderId == draft.Id);
            var staff = CreatePlatformController(new InternalLabOperationsProvider(DbContext), dualControl: true);
            var correction = await staff.RequestChanges(draft.Id, new(submitted.Version, "Clarify storage"), default);
            var edited = await CreateChangeCustomerController().Update(draft.Id,
                input with { Description = "Corrected profile", StorageRequirements = "Store at -80 C", Version = correction.Version }, default);
            var revised = await CreateChangeCustomerController().Submit(draft.Id, new(edited.Version), default);
            var revisions = await DbContext.LabServiceRequestRevisions.AsNoTracking().Where(r => r.LabServiceOrderId == draft.Id).OrderBy(r => r.Revision).ToListAsync();
            Assert.Equal(2, revisions.Count);
            Assert.Equal(revision1.SnapshotJson, revisions[0].SnapshotJson);
            Assert.Equal(revision1.Id, revisions[1].PreviousRevisionId);
            Assert.Equal("Clarify storage", revisions[1].CorrectionReason);
            Assert.Contains("Corrected profile", revisions[1].SnapshotJson);
            Assert.Empty(await DbContext.LabSamples.ToListAsync());
            Assert.Empty(await DbContext.LabWorkOrders.ToListAsync());
            var item = await DbContext.QboCatalogItems.SingleAsync(i => i.ExternalItemId == OrderServiceKeys.PSeqLabService);
            var request = new IssueQuoteRequest(revised.Version, [new(item.Id, "PSeq Lab Service", 2, 100m)], 0, "USD", null);
            Task<LabServiceOrderDto> Issue(IssueQuoteRequest value)
            {
                staff.HttpContext.Request.Headers["Idempotency-Key"] = Guid.NewGuid().ToString("N");
                return staff.IssueQuote(draft.Id, value, default);
            }
            async Task<OrderManagementException> Reject(IssueQuoteRequest value)
            {
                DbContext.ChangeTracker.Clear();
                return await Assert.ThrowsAsync<OrderManagementException>(() => Issue(value));
            }
            Assert.Equal("quote_lines_required", (await Reject(request with { Lines = [] })).ErrorCode);
            Assert.Equal("catalog_item_unavailable", (await Reject(request with { Lines = [new(Guid.NewGuid(), "Missing", 2, 100m)] })).ErrorCode);
            Assert.Equal("quote_lab_service_quantity_mismatch", (await Reject(request with { Lines = [new(item.Id, "PSeq", 1, 100m)] })).ErrorCode);
            DbContext.ChangeTracker.Clear();
            var inactive = await DbContext.QboCatalogItems.SingleAsync(i => i.Id == item.Id);
            DbContext.Entry(inactive).Property(i => i.IsActive).CurrentValue = false;
            await DbContext.SaveChangesAsync();
            Assert.Equal("lab_service_offering_unavailable", (await Reject(request)).ErrorCode);
            inactive = await DbContext.QboCatalogItems.SingleAsync(i => i.Id == item.Id);
            DbContext.Entry(inactive).Property(i => i.IsActive).CurrentValue = true;
            var pricedOrder = await DbContext.LabServiceOrders.SingleAsync(o => o.Id == draft.Id);
            // Explicit negative fixture: a recorded proposed price attributed to the issuing actor.
            DbContext.Entry(pricedOrder).Property(o => o.ProposedUnitPrice).CurrentValue = 100m;
            DbContext.Entry(pricedOrder).Property(o => o.PriceProposedByUserId).CurrentValue = PlatformUser.Id;
            await DbContext.SaveChangesAsync();
            request = request with { Version = pricedOrder.Version };
            Assert.Equal("price_proposal_self_approval_not_allowed", (await Reject(request)).ErrorCode);
            pricedOrder = await DbContext.LabServiceOrders.SingleAsync(o => o.Id == draft.Id);
            DbContext.Entry(pricedOrder).Property(o => o.PriceProposedByUserId).CurrentValue = CustomerUser.Id;
            await DbContext.SaveChangesAsync();
            request = request with { Version = pricedOrder.Version };
            DbContext.ChangeTracker.Clear();
            var preTaxOrder = await Issue(request);
            var preTax = preTaxOrder.Quotes.Single();
            Assert.Equal(200m, preTax.Total);
            Assert.Null(preTax.TaxDecisionSnapshotJson);
            Assert.Equal(PlatformUser.Id, preTax.PricingDecidedByUserId);
            Assert.NotEqual(CustomerUser.Id, preTax.PricingDecidedByUserId);
            var profile = new OrganizationCommercialProfile(CustomerOrganization.Id);
            profile.UpdateBillingConfiguration("Test billing", "billing@example.invalid", "{\"line1\":\"Test address\"}", 30, EffectiveTaxDecision.Taxable, .1m, null);
            profile.ApproveTaxDecision(PlatformUser.Id, DateTime.UtcNow, "SIMULATED approved tax");
            DbContext.Add(profile); await DbContext.SaveChangesAsync();
            DbContext.ChangeTracker.Clear();
            var taxedOrder = await Issue(request with { Version = preTaxOrder.Version });
            var taxed = taxedOrder.Quotes.Single(q => q.Status == "Issued");
            Assert.Equal(220m, taxed.Total);
            Assert.NotNull(taxed.TaxDecisionSnapshotJson);
            Assert.Equal("Superseded", taxedOrder.Quotes.Single(q => q.Id == preTax.Id).Status);
            await Assert.ThrowsAsync<OrderManagementException>(() => AcceptAddition(draft.Id, preTax.Id, taxedOrder.Version));
            DbContext.ChangeTracker.Clear();
            var member = await DbContext.OrganizationMemberships.SingleAsync(m => m.UserId == CustomerUser.Id);
            member.SetOrganizationAdmin(false); await DbContext.SaveChangesAsync();
            await Assert.ThrowsAsync<OrderManagementException>(() => AcceptAddition(draft.Id, taxed.Id, taxedOrder.Version));
            DbContext.ChangeTracker.Clear();
            member = await DbContext.OrganizationMemberships.SingleAsync(m => m.UserId == CustomerUser.Id);
            member.SetOrganizationAdmin(true);
            var expiring = await DbContext.LabServiceQuotes.SingleAsync(q => q.Id == taxed.Id);
            DbContext.Entry(expiring).Property(q => q.ExpiresAt).CurrentValue = DateTime.UtcNow.AddMinutes(-1);
            await DbContext.SaveChangesAsync();
            Assert.Equal("quote_expired", (await Assert.ThrowsAsync<OrderManagementException>(() => AcceptAddition(draft.Id, taxed.Id, taxedOrder.Version))).ErrorCode);
            DbContext.ChangeTracker.Clear();
            var current = await Issue(request with { Version = taxedOrder.Version });
            var eligible = current.Quotes.Single(q => q.Status == "Issued");
            var accepted = await AcceptAddition(draft.Id, eligible.Id, current.Version);
            Assert.Equal("PlacedAwaitingSamples", accepted.Status);
            Assert.Equal(eligible.Id, (await DbContext.LabServiceOrders.SingleAsync(o => o.Id == draft.Id)).AcceptedQuoteId);
            Assert.Empty(await DbContext.LabWorkOrders.ToListAsync());
            Assert.Equal(220m, accepted.Quotes.Single(q => q.Id == eligible.Id).Total);
        }
        public PhaenoPortal.App.Features.OrderManagement.Controllers.LabServiceOrdersController CreateChangeCustomerController()
            => CreateCustomerController(new InternalLabOperationsProvider(DbContext), Guid.NewGuid().ToString("N"));
        public async Task<LabServiceOrderDto> IssueAddition(Guid orderId, long version)
        {
            DbContext.ChangeTracker.Clear();
            var item = await DbContext.QboCatalogItems.SingleAsync(i => i.ExternalItemId == OrderServiceKeys.PSeqLabService);
            return await CreatePlatformController(new InternalLabOperationsProvider(DbContext), Guid.NewGuid().ToString("N"))
                .IssueQuote(orderId, new(version, [new(item.Id, "Additional PSeq samples", 1, 100m)], 0, "USD", null, "Change",
                    AdditionalSources: [new("synthetic_reference", 1)]), default);
        }
        public Task<LabServiceOrderDto> AcceptAddition(Guid orderId, Guid quoteId, long version)
            => AcceptQuoteAsync(new(orderId, quoteId, version));
        public async Task<LabServiceOrderDto> DeclineAddition(Guid orderId, Guid quoteId, long version)
        {
            DbContext.ChangeTracker.Clear();
            return await CreateChangeCustomerController().DeclineChangeQuote(orderId, quoteId, new(version), default);
        }
    }
}
