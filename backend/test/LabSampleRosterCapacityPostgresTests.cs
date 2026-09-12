namespace PhaenoPortal.Test;

using System.Text.Json;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task SampleSourceCapacitySerializesSimultaneousAddsToTheLastSourceSlot()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var order = await scope.CreateSampleCapacityOrderAsync();
        await using var firstContext = scope.CreateRosterRaceContext();
        await using var secondContext = scope.CreateRosterRaceContext();
        var first = scope.CreateRosterRaceController(firstContext);
        var second = scope.CreateRosterRaceController(secondContext);
        var outcomes = await Task.WhenAll(Add(first, "A-1"), Add(second, "A-2"));
        Assert.Single(outcomes, exception => exception is null);
        Assert.Single(outcomes, exception => exception is DbUpdateConcurrencyException
            or OrderManagementException { ErrorCode: "sample_source_count_exceeded" });
        Assert.Equal(1, await scope.DbContext.LabSamples.CountAsync(sample => sample.LabServiceOrderId == order.Id));

        async Task<Exception?> Add(LabServiceOrdersController controller, string sampleId)
        {
            try
            {
                await controller.AddSample(order.Id, new LabSampleRosterWriteRequest(sampleId, "Human PBMCs", 2, OrderVersion: order.Version), default);
                return null;
            }
            catch (Exception exception) { return exception; }
        }
    }

    [PostgreSqlReferenceFact]
    public async Task SampleSourceCapacityRejectsExtraSourceSampleWhileOtherSourcesRemainAvailable()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        Assert.Null(scope.DbContext.Model.FindEntityType(typeof(LabServiceOrder))!.FindProperty(nameof(LabServiceOrder.HasAcceptedSampleSourceCounts)));
        var order = await scope.CreateSampleCapacityOrderAsync();
        var first = await scope.ExtensionCustomerController().AddSample(order.Id,
            new LabSampleRosterWriteRequest("A-1", " Human PBMCs ", 4, OrderVersion: order.Version), default);
        Assert.Single(first.Samples);
        var error = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ExtensionCustomerController().AddSample(order.Id,
            new LabSampleRosterWriteRequest("A-2", "human pbmcs", 1, OrderVersion: first.Version), default));
        Assert.Equal("sample_source_count_exceeded", error.ErrorCode);
        Assert.Contains("1 of 1", error.Message);
        var second = await scope.ExtensionCustomerController().AddSample(order.Id,
            new LabSampleRosterWriteRequest("B-1", "Mouse liver", 2, OrderVersion: first.Version), default);
        Assert.Equal(2, second.Samples.Count);
        Assert.Equal(4, second.Samples.Single(sample => sample.CustomerSampleId == "A-1").Quantity);
        Assert.False(second.CanFinalizeSamples);
        Assert.True(second.Version > first.Version);
    }

    [PostgreSqlReferenceFact]
    public async Task SampleSourceCapacityPreservesLegacyRowsAndAllowsMetadataEditMoveAndRemoval()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var order = await scope.CreateSampleCapacityOrderAsync();
        await scope.AddLegacyCapacitySampleAsync(order.Id, "A-1", "Human PBMCs");
        var excess = await scope.AddLegacyCapacitySampleAsync(order.Id, "A-2", "human pbmcs");
        var updated = await scope.ExtensionCustomerController().UpdateSample(order.Id, excess.Id,
            new LabSampleRosterWriteRequest("A-2", " HUMAN PBMCS ", 3, Notes: "Correcting source next", Version: excess.Version), default);
        Assert.Equal(2, updated.Samples.Count);
        Assert.Equal(3, updated.Samples.Single(sample => sample.Id == excess.Id).Quantity);
        Assert.False(updated.CanFinalizeSamples);
        var version = updated.Samples.Single(sample => sample.Id == excess.Id).Version;
        var recovered = await scope.ExtensionCustomerController().UpdateSample(order.Id, excess.Id,
            new LabSampleRosterWriteRequest("B-1", "Mouse liver", 3, Version: version), default);
        Assert.Equal("Mouse liver", recovered.Samples.Single(sample => sample.Id == excess.Id).BiologicalSource);
        var failure = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ExtensionCustomerController().UpdateSample(order.Id, excess.Id,
            new LabSampleRosterWriteRequest("B-1", "Human PBMCs", 3, Version: recovered.Samples.Single(sample => sample.Id == excess.Id).Version), default));
        Assert.Equal("sample_source_count_exceeded", failure.ErrorCode);
        var deleted = await scope.ExtensionCustomerController().DeleteSample(order.Id, excess.Id,
            new VersionRequest(recovered.Samples.Single(sample => sample.Id == excess.Id).Version), default);
        Assert.Single(deleted.Samples);
    }

    [PostgreSqlReferenceFact]
    public async Task SampleSourceCapacityBlocksFinalizationOfBalancedTotalWithWrongComposition()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var order = await scope.CreateSampleCapacityOrderAsync();
        await scope.AddLegacyCapacitySampleAsync(order.Id, "A-1", "Human PBMCs");
        var excess = await scope.AddLegacyCapacitySampleAsync(order.Id, "A-2", "Human PBMCs");
        await scope.AddLegacyCapacitySampleAsync(order.Id, "B-1", "Mouse liver");
        var detail = await scope.ExtensionCustomerController().Get(order.Id, default);
        Assert.Equal(3, detail.Samples.Count);
        Assert.False(detail.CanFinalizeSamples);
        var error = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ExtensionCustomerController().FinalizeSampleRoster(order.Id,
            new FinalizeLabSampleRosterRequest(detail.Version, true), default));
        Assert.Contains(error.Message, new[] {
            "Biological source 'Human PBMCs' requires 1 samples; 2 are entered.",
            "Biological source 'Mouse liver' requires 2 samples; 1 are entered." });
        Assert.False(await scope.DbContext.SampleShipments.AnyAsync(value => value.AuthorizationSourceId == order.Id));
        var corrected = await scope.ExtensionCustomerController().UpdateSample(order.Id, excess.Id,
            new LabSampleRosterWriteRequest("B-2", "Mouse liver", 2, Version: excess.Version), default);
        Assert.True(corrected.CanFinalizeSamples);
    }

    [PostgreSqlReferenceFact]
    public async Task SampleSourceCapacityRechecksStoredImportRowsBeforeReplacingExistingRoster()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var order = await scope.CreateSampleCapacityOrderAsync();
        var retained = await scope.AddLegacyCapacitySampleAsync(order.Id, "KEEP", "Human PBMCs");
        var rows = new[] { new LabSampleImportRowDto(2, "A-1", "Human PBMCs", 1),
            new LabSampleImportRowDto(3, "A-2", "Human PBMCs", 1), new LabSampleImportRowDto(4, "B-1", "Mouse liver", 1) };
        var preview = new LabSampleImportPreview(order.Id, scope.CustomerOrganization.Id, scope.CustomerUser.Id,
            "reference", JsonSerializer.Serialize(rows, new JsonSerializerOptions(JsonSerializerDefaults.Web)), "[]", 3, 0, DateTime.UtcNow.AddMinutes(10));
        scope.DbContext.LabSampleImportPreviews.Add(preview);
        await scope.DbContext.SaveChangesAsync();
        var error = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ExtensionCustomerController().ConfirmSampleImport(order.Id, preview.Id,
            new ConfirmLabSampleImportRequest(order.Version), default));
        Assert.Equal("sample_import_has_errors", error.ErrorCode);
        Assert.Equal(retained.Id, await scope.DbContext.LabSamples.Where(sample => sample.LabServiceOrderId == order.Id).Select(sample => sample.Id).SingleAsync());
        var bytes = Encoding.UTF8.GetBytes("customer_sample_id,biological_source,tube_count\nA-1,Human PBMCs,2\nB-1,Mouse liver,1\nB-2,Mouse liver,1\n");
        using var stream = new MemoryStream(bytes);
        var validPreview = await scope.ExtensionCustomerController().PreviewSampleImport(order.Id,
            new FormFile(stream, 0, bytes.Length, "file", "samples.csv"), order.Version, default);
        Assert.Empty(validPreview.Errors);
        var imported = await scope.ExtensionCustomerController().ConfirmSampleImport(order.Id, validPreview.PreviewId,
            new ConfirmLabSampleImportRequest(order.Version), default);
        Assert.Equal(3, imported.Samples.Count);
        Assert.Equal(3, imported.Samples.Select(sample => sample.Id).Distinct().Count());
        Assert.True(imported.CanFinalizeSamples);
    }

    private sealed partial class HandoffTestScope
    {
        public PSeqOperationsDbContext CreateRosterRaceContext()
            => new((DbContextOptions<PSeqOperationsDbContext>)DbContext.GetService<IDbContextOptions>(), Options.Create(new PersistenceOptions
            {
                CommercialSchema = ReadEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_COMMERCIAL_SCHEMA", "commercial_ops"),
                LaboratorySchema = ReadEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_LABORATORY_SCHEMA", "lab_ops"),
                MigrationsHistorySchema = ReadEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_MIGRATIONS_HISTORY_SCHEMA", "public")
            }.Validate()));

        public LabServiceOrdersController CreateRosterRaceController(PSeqOperationsDbContext context)
        {
            var httpContext = new DefaultHttpContext();
            httpContext.Request.Headers["X-Organization-Id"] = CustomerOrganization.Id.ToString();
            var orderOptions = Options.Create(new OrderManagementOptions());
            return new LabServiceOrdersController(context,
                new OrderRequestContext(context, new FixedIdentityContext(customerIdentity)),
                new OrderIdempotencyService(context), NullOperationalFileStorage.Instance,
                Options.Create(new PSeqOrderToCashOptions { NativePSeqAccountsReceivable = true }),
                new InternalLabOperationsProvider(context),
                new ReleasedDeliverableDownloadAttemptService(context, orderOptions, NullLogger<ReleasedDeliverableDownloadAttemptService>.Instance),
                new ReleasedDeliverableDownloadProjectionService(context),
                NullLogger<CompletionTrackedFileStreamResult>.Instance, NullLogger<CompletionTrackedArchiveResult>.Instance)
            { ControllerContext = new ControllerContext { HttpContext = httpContext } };
        }

        public async Task<LabServiceOrder> CreateSampleCapacityOrderAsync()
        {
            var now = DateTime.UtcNow;
            var order = new LabServiceOrder(CustomerOrganization.Id, CustomerOrganization.Departments.Single(value => value.IsDefault).Id,
                OrderNumberGenerator.Lab(), $"source-capacity-{Guid.NewGuid():N}", null, 3, true, null, "Frozen", "No hazards", "Ship cold");
            order.SourceGroups.Add(new LabServiceSourceGroup(order.Id, "Human PBMCs", 1));
            order.SourceGroups.Add(new LabServiceSourceGroup(order.Id, "Mouse liver", 2));
            order.Submit(CustomerUser.Id, now); order.BeginQuotePreparation();
            var quote = new LabServiceQuote(order.Id, 1, QuotePurpose.Initial, "[]", 300, 0, "USD", now, now.AddDays(30));
            quote.MarkIssued(); order.Quotes.Add(quote); order.MarkQuoteIssued(quote.Id);
            quote.Accept(CustomerUser.Id, now); order.AcceptQuote(quote.Id, now);
            DbContext.LabServiceOrders.Add(order); await DbContext.SaveChangesAsync();
            return order;
        }

        public async Task<LabSample> AddLegacyCapacitySampleAsync(Guid orderId, string sampleId, string source)
        {
            var sample = new LabSample(orderId, sampleId, "RNA", source, 1, "tubes", "Frozen", "No hazards", null, null, null, "[]");
            DbContext.LabSamples.Add(sample); await DbContext.SaveChangesAsync();
            return sample;
        }
    }
}
