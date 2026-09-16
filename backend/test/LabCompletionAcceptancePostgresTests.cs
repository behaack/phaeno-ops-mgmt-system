namespace PhaenoPortal.Test;

using System.Security.Cryptography;
using System.Text;
using Npgsql;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using PhaenoPortal.App.Features.FileManagement.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task FailedProcessingRemainsBillableButCurrentLabHoldsBlockCompletion()
    {
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!);
        if (connection.Host is not ("localhost" or "127.0.0.1")) throw new InvalidOperationException("Requires disposable loopback PostgreSQL.");
        var name = $"pseq_handoff_test_{Guid.NewGuid():N}";
        await using var admin = new NpgsqlConnection(connection.ConnectionString); await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin)) await create.ExecuteNonQueryAsync();
        connection.Database = name; connection.Pooling = false;
        try
        {
            await using var scope = await HandoffTestScope.CreateAsync(isolatedConnection: connection.ConnectionString);
            var fixture = await scope.CreateQuotedOrderAsync("SIMULATED final failed processing", 2);
            var accepted = await scope.AcceptQuoteAsync(fixture);
            var first = await scope.AddReferenceSampleAsync(fixture.OrderId, accepted.Version);
            var second = await scope.AddReferenceSampleAsync(fixture.OrderId, first.Version);
            await scope.FinalizeSampleRosterAsync(fixture.OrderId, second.Version, new InternalLabOperationsProvider(scope.DbContext));
            var authorization = await scope.DbContext.CommercialLabAuthorizations.SingleAsync(value => value.CommercialOrderId == fixture.OrderId);
            var work = await scope.DbContext.LabWorkOrders.Include(value => value.Specimens).SingleAsync(value => value.Id == authorization.LabWorkOrderId);
            // This fixture arranges final scientific facts; it does not claim physical processing or a successful experiment.
            foreach (var specimen in work.Specimens)
            {
                specimen.RecordReceipt(DateTime.UtcNow, "SIMULATED intact receipt", null);
                specimen.RecordProcessingState(LabSpecimenProcessingState.Failed, scope.PlatformUser.Id, DateTime.UtcNow, "material_exhausted", "PRIVATE-INTERNAL simulated final failure evidence");
            }
            await scope.DbContext.SaveChangesAsync();
            var facts = await LabIntakeProgress.ReadAsync(scope.DbContext, work, default);
            await CommercialLabIntakeProgressService.ApplyAsync(scope.DbContext, authorization.AuthorizationId, work.Id, facts, scope.PlatformUser.Id, DateTime.UtcNow, default);
            var profile = new OrganizationCommercialProfile(scope.CustomerOrganization.Id);
            profile.UpdateBillingConfiguration("Test billing", "billing@example.invalid", "{\"line1\":\"Test address\"}", 30, EffectiveTaxDecision.Taxable, .1m, null);
            profile.ApproveTaxDecision(scope.PlatformUser.Id, DateTime.UtcNow, "SIMULATED approved tax");
            scope.DbContext.Add(profile); await scope.DbContext.SaveChangesAsync();
            var order = await scope.DbContext.LabServiceOrders.Include(value => value.Samples).SingleAsync(value => value.Id == fixture.OrderId);
            Assert.All(order.Samples, sample => { Assert.Equal(LabSampleStatus.Failed, sample.Status); Assert.DoesNotContain("PRIVATE-INTERNAL", sample.TenantSafeReason!); });
            var version = order.Version;
            await CommercialLabIntakeProgressService.ApplyAsync(scope.DbContext, authorization.AuthorizationId, work.Id, facts, scope.PlatformUser.Id, DateTime.UtcNow, default);
            await scope.DbContext.SaveChangesAsync(); Assert.Equal(version, order.Version);
            var hold = new LabException(work.Id, null, null, LabExceptionAudience.Internal, "review", "SIMULATED hold", "Review before completion", null, true, null);
            scope.DbContext.Add(hold); await scope.DbContext.SaveChangesAsync();
            var storage = new CompletionPdfStorage();
            var error = await Assert.ThrowsAsync<OrderManagementException>(() => scope.CompletionController(Guid.NewGuid().ToString("N"), storage).Complete(order.Id, new(version), default));
            Assert.Equal("laboratory_outcomes_not_final", error.ErrorCode); Assert.Empty(storage.Files);
            scope.DbContext.ChangeTracker.Clear();
            hold = await scope.DbContext.LabExceptions.SingleAsync(value => value.Id == hold.Id);
            hold.Resolve(scope.PlatformUser.Id, DateTime.UtcNow, "SIMULATED review complete");
            await scope.DbContext.SaveChangesAsync();
            var completed = await scope.CompletionController(Guid.NewGuid().ToString("N"), storage).Complete(order.Id, new(version), default);
            Assert.Equal("Completed", completed.Status);
            var invoice = Assert.Single(await scope.DbContext.Invoices.ToListAsync());
            Assert.Equal(200m, invoice.Subtotal); Assert.Equal(20m, invoice.TaxTotal); Assert.Equal(220m, invoice.Total);
            Assert.Equal(2m, (await scope.DbContext.InvoiceLines.SingleAsync()).Quantity);
            Assert.All(await scope.DbContext.LabSamples.ToListAsync(), sample => Assert.Equal(LabSampleStatus.Failed, sample.Status));
        }
        finally { await using var drop = new NpgsqlCommand($"DROP DATABASE {name} WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync(); }
    }

    private sealed partial class HandoffTestScope
    {
        public async Task VerifyScientificCompletionAndFrozenInvoice(Guid orderId, Guid packageId, Guid artifactId, byte[] resultBytes)
        {
            DbContext.ChangeTracker.Clear();
            var order = await DbContext.LabServiceOrders.Include(value => value.Samples).Include(value => value.Quotes).SingleAsync(value => value.Id == orderId);
            Assert.All(order.Samples, sample => Assert.Equal(LabSampleStatus.Completed, sample.Status));
            var accepted = order.Quotes.Single(value => value.Id == order.AcceptedQuoteId);
            var agreement = accepted.LinesJson;
            var placement = order.PlacementSnapshotJson;
            var profile = new OrganizationCommercialProfile(order.OrganizationId);
            profile.UpdateBillingConfiguration("Test billing", "billing@example.invalid", "{\"line1\":\"Test address\"}", 30, EffectiveTaxDecision.Taxable, .1m, null);
            profile.ApproveTaxDecision(PlatformUser.Id, DateTime.UtcNow, "SIMULATED Finance approval");
            DbContext.Add(profile);
            await DbContext.SaveChangesAsync();
            var storage = new CompletionPdfStorage();
            var reviewedVersion = order.Version;
            var key = Guid.NewGuid().ToString("N");
            var completed = await CompletionController(key, storage).Complete(order.Id, new(reviewedVersion), default);
            Assert.Equal("Completed", completed.Status);
            var invoice = await DbContext.Invoices.SingleAsync(value => value.LabServiceOrderId == order.Id);
            Assert.Equal(100m, invoice.Subtotal); Assert.Equal(10m, invoice.TaxTotal); Assert.Equal(110m, invoice.Balance);
            Assert.Equal(invoice.IssuedOn.AddDays(30), invoice.DueOn);
            Assert.Equal(accepted.Id, invoice.AcceptedQuoteId);
            var pdf = Assert.Single(storage.Files).Value.ToArray();
            Assert.StartsWith("%PDF-", Encoding.ASCII.GetString(pdf));
            Assert.Equal(invoice.PdfSha256, Convert.ToHexString(SHA256.HashData(pdf)));
            var frozen = (invoice.PdfStorageKey, invoice.PdfSha256, invoice.BillingContactSnapshotJson,
                invoice.BillingAddressSnapshotJson, invoice.TaxDecisionSnapshotJson, invoice.DueOn);
            var replay = await CompletionController(key, storage).Complete(order.Id, new(reviewedVersion), default);
            Assert.Equal(completed.Version, replay.Version); Assert.Equal(1, storage.SaveCount);
            Assert.Equal(1, await DbContext.Invoices.CountAsync(value => value.LabServiceOrderId == order.Id));
            // The invoice is still wholly unpaid; exercise the same published scientific download after issuance.
            using (var services = new ServiceCollection().AddLogging().AddControllers().Services.BuildServiceProvider())
            {
                var resultHttp = new DefaultHttpContext { RequestServices = services };
                resultHttp.Request.Method = "GET"; resultHttp.Response.Body = new MemoryStream();
                resultHttp.Request.Headers["X-Organization-Id"] = CustomerOrganization.Id.ToString();
                resultHttp.Request.Headers["X-Department-Id"] = order.DepartmentId.ToString();
                var results = new PSeqResultDownloadsController(DbContext, new(DbContext, new FixedIdentityContext(customerIdentity)),
                    new AcceptanceOutputStorage(resultBytes), new(DbContext, Options.Create(new OrderManagementOptions()), NullLogger<ReleasedDeliverableDownloadAttemptService>.Instance),
                    new(DbContext), NullLogger<CompletionTrackedFileStreamResult>.Instance) { ControllerContext = new() { HttpContext = resultHttp } };
                var package = Assert.Single(await results.List(orderId, default)); Assert.True(package.IsDownloadAvailable);
                var response = await results.Download(orderId, Assert.Single(order.Samples).Id, packageId, artifactId, default);
                await response.ExecuteResultAsync(new(resultHttp, new Microsoft.AspNetCore.Routing.RouteData(), new Microsoft.AspNetCore.Mvc.Abstractions.ActionDescriptor()));
                Assert.Equal(resultBytes, ((MemoryStream)resultHttp.Response.Body).ToArray()); Assert.Equal(110m, invoice.Balance);
            }
            profile.UpdateBillingConfiguration("Later billing", "later@example.invalid", "{\"line1\":\"Later address\"}", 60, EffectiveTaxDecision.Taxable, .2m, null);
            DbContext.Add(new BusinessRoleAssignment(PlatformUser.Id, BusinessRole.BillingOperator));
            await DbContext.SaveChangesAsync();
            var finance = new AccountsReceivableController(DbContext, new(DbContext, new FixedIdentityContext(platformIdentity)),
                Options.Create(new PSeqOrderToCashOptions { BusinessRoles = true }), NullLogger<AccountsReceivableController>.Instance)
                { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
            foreach (var adjustment in new[] { ("Credit", 10m, 100m), ("Debit", 15m, 115m), ("WriteOff", 115m, 0m) })
            {
                var before = invoice.Version;
                var adjusted = await finance.AdjustInvoice(invoice.Id, new(adjustment.Item1, adjustment.Item2, "SIMULATED reviewed remedy", before), default);
                Assert.Equal(adjustment.Item3, adjusted.Balance);
                Assert.Equal(frozen, (invoice.PdfStorageKey, invoice.PdfSha256, invoice.BillingContactSnapshotJson,
                    invoice.BillingAddressSnapshotJson, invoice.TaxDecisionSnapshotJson, invoice.DueOn));
                Assert.Equal(pdf, storage.Files[invoice.PdfStorageKey]);
                await Assert.ThrowsAsync<OrderManagementException>(() => finance.AdjustInvoice(invoice.Id,
                    new(adjustment.Item1, 1, "Stale decision", before), default));
            }
            Assert.Equal(3, await DbContext.InvoiceAdjustments.CountAsync(value => value.InvoiceId == invoice.Id));
            Assert.Equal(agreement, accepted.LinesJson); Assert.Equal(placement, order.PlacementSnapshotJson);
            var http = new DefaultHttpContext();
            http.Request.Headers["X-Organization-Id"] = CustomerOrganization.Id.ToString();
            http.Request.Headers["X-Department-Id"] = order.DepartmentId.ToString();
            var downloads = new CustomerInvoicesController(DbContext, new(DbContext, new FixedIdentityContext(customerIdentity)), storage)
                { ControllerContext = new() { HttpContext = http } };
            var downloaded = Assert.IsType<FileStreamResult>(await downloads.DownloadPdf(invoice.Id, default));
            await using var stream = downloaded.FileStream;
            using var buffer = new MemoryStream(); await stream.CopyToAsync(buffer);
            Assert.Equal(pdf, buffer.ToArray()); Assert.Equal("application/pdf", downloaded.ContentType);
            Assert.Equal(invoice.InvoiceNumber + ".pdf", downloaded.FileDownloadName);
            if (RecoveryExportDirectory is not null)
            {
                var directory = Path.Combine(RecoveryExportDirectory, "files", "order-files");
                Directory.CreateDirectory(directory);
                await File.WriteAllBytesAsync(Path.Combine(directory, invoice.PdfStorageKey), pdf);
            }
        }
    }
}
