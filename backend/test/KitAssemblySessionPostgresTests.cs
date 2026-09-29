namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task KitAssemblySessionRequiresPrintedAttachedLabelAndExactScannedContentsAtomically()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var definition = await scope.CreateContainerAsync(await scope.CreateShipmentAsync(20), 20);
        var stock = scope.StockController();
        var created = await stock.Create(await scope.CatalogKitRequestAsync(definition.Id), default);
        var kit = Assert.IsType<StockKitDto>(Assert.IsType<CreatedResult>(created.Result).Value);
        scope.ClearTrackedState();
        var lab = scope.CreateLabController();
        var run = await lab.ReadKitAssemblyRun(kit.Id, default);
        var codes = Enumerable.Range(1, 20).Select(index => $"SESSION-{scope.Suffix}-{index:00}").ToArray();
        var request = new KitAssemblySessionRequest(run.Version, kit.Version, codes,
            run.Components.Select(item => new KitAssemblyComponentUseRequest(item.SupplierProductId, item.Quantity)).ToArray(),
            null, true, ContainerBarcode: kit.KitNumber);
        async Task Rejected(KitAssemblySessionRequest input)
        {
            await Assert.ThrowsAsync<OrderManagementException>(() => lab.SaveKitAssemblySession(kit.Id, input, default));
            scope.ClearTrackedState();
            var unchanged = await lab.ReadKitAssemblyRun(kit.Id, default);
            Assert.Empty(unchanged.Uses);
            Assert.Empty(unchanged.StepRecords);
            Assert.Null(unchanged.ContainerBarcodeVerifiedAtUtc);
            var unchangedKit = await stock.Read(kit.Id, default);
            Assert.Empty(unchangedKit.Tubes);
            Assert.Null(unchangedKit.AssemblyCompletedAt);
            Assert.Null(unchangedKit.TubesVerifiedAt);
        }
        await Rejected(request); // A label scan alone cannot bypass Print.
        run = await lab.RequestKitAssemblyLabelPrint(kit.Id, new(run.Version), default);
        Assert.NotNull(run.LabelPrintRequestedAtUtc);
        Assert.Equal(scope.PlatformUser.Id, run.LabelPrintRequestedByUserId);
        scope.ClearTrackedState();
        request = request with { Version = run.Version };
        await Rejected(request with { ContainerBarcode = "KIT-WRONG-CONTAINER" });
        await Rejected(request with { VerificationBarcodes = codes[..19] });
        await Rejected(request with { VerificationBarcodes = [.. codes[..19], codes[0]] });
        await Rejected(request with { AssemblyNotes = new string('x', 4001) });
        await Rejected(request with { SupplierBarcodes = codes[..19], Components = run.Components.Select(item =>
            new KitAssemblyComponentUseRequest(item.SupplierProductId, item.Kind == "Tube" ? 19 : item.Quantity)).ToArray() });
        await Rejected(request with { SupplierBarcodes = [.. codes[..19], codes[0]] });
        var savedKit = await scope.DbContext.SampleShippingStockKits.SingleAsync(item => item.Id == kit.Id);
        var expirySnapshot = savedKit.ProductExpirySnapshotJson;
        scope.DbContext.Entry(savedKit).Property(item => item.ProductExpirySnapshotJson).CurrentValue =
            "[{\"canExpire\":true,\"expirationDate\":\"2000-01-01\"}]";
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        kit = await stock.Read(kit.Id, default);
        request = request with { StockKitVersion = kit.Version };
        await Rejected(request); // Expired saved component evidence cannot enter Inventory.
        savedKit = await scope.DbContext.SampleShippingStockKits.SingleAsync(item => item.Id == kit.Id);
        scope.DbContext.Entry(savedKit).Property(item => item.ProductExpirySnapshotJson).CurrentValue = expirySnapshot;
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        kit = await stock.Read(kit.Id, default);
        request = request with { StockKitVersion = kit.Version };

        var shipper = run.Components.Single(item => item.Kind == "ShippingContainer");
        var tube = run.Components.Single(item => item.Kind == "Tube");
        run = await lab.SaveKitAssemblySession(kit.Id, request with {
            Complete = false, SupplierBarcodes = codes[..18], Components = [new(shipper.SupplierProductId, 1), new(tube.SupplierProductId, 18)],
            AssemblyNotes = "Draft packing notes.", VerificationBarcodes = codes[..8]
        }, default);
        Assert.Equal("InProgress", run.Status);
        Assert.Empty(run.StepRecords);
        Assert.Equal("Draft packing notes.", run.DraftNotes);
        Assert.Equal(codes[..8], run.DraftVerificationBarcodes);
        Assert.NotNull(run.ContainerBarcodeVerifiedAtUtc);
        scope.ClearTrackedState();
        kit = await stock.Read(kit.Id, default);
        Assert.Null(kit.AssemblyCompletedAt);
        Assert.Null(kit.TubesVerifiedAt);
        var final = request with { Version = run.Version, StockKitVersion = kit.Version,
            SupplierBarcodes = codes[18..], Components = [new(tube.SupplierProductId, 2)] };
        run = await lab.SaveKitAssemblySession(kit.Id, final, default);
        Assert.Equal("Completed", run.Status);
        var completedStep = Assert.Single(run.StepRecords);
        Assert.Empty(completedStep.Notes);
        Assert.Equal(scope.PlatformUser.Id, completedStep.PerformedByUserId);
        Assert.True(completedStep.PerformedAtUtc >= run.StartedAtUtc);
        Assert.Equal(20, run.Uses.Where(item => item.SupplierProductId == tube.SupplierProductId).Sum(item => item.Quantity));
        Assert.Equal(1, run.Uses.Where(item => item.SupplierProductId == shipper.SupplierProductId).Sum(item => item.Quantity));
        scope.ClearTrackedState();
        kit = await stock.Read(kit.Id, default);
        Assert.NotNull(kit.AssemblyCompletedAt);
        Assert.Null(kit.TubesVerifiedAt);
        Assert.Null(kit.TubesVerifiedByUserId);
        var stale = await Assert.ThrowsAsync<OrderManagementException>(() => lab.SaveKitAssemblySession(kit.Id, final, default));
        Assert.Equal(409, stale.StatusCode);
        scope.ClearTrackedState();
        Assert.Single((await lab.ReadKitAssemblyRun(kit.Id, default)).StepRecords);
    }

    [PostgreSqlReferenceFact]
    public async Task KitAssemblyCreationRetryReusesPermanentIdentityAndFullDraftCanResumeWithoutMoreConsumption()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var definition = await scope.CreateContainerAsync(await scope.CreateShipmentAsync(20), 20);
        var stock = scope.StockController();
        var creation = (await scope.CatalogKitRequestAsync(definition.Id)) with { AssemblyRequestId = Guid.NewGuid() };
        var first = Assert.IsType<StockKitDto>(Assert.IsType<CreatedResult>((await stock.Create(creation, default)).Result).Value);
        scope.ClearTrackedState();
        var retry = Assert.IsType<StockKitDto>(Assert.IsType<OkObjectResult>((await stock.Create(creation, default)).Result).Value);
        Assert.Equal(first.Id, retry.Id);
        Assert.Equal(first.KitNumber, retry.KitNumber);
        Assert.Equal(1, await scope.DbContext.SampleShippingStockKits.CountAsync(item => item.KitNumber == first.KitNumber));
        var lab = scope.CreateLabController();
        var run = await lab.ReadKitAssemblyRun(first.Id, default);
        var codes = Enumerable.Range(1, 20).Select(index => $"DRAFT-{scope.Suffix}-{index:00}").ToArray();
        run = await lab.SaveKitAssemblySession(first.Id, new(run.Version, first.Version, codes,
            run.Components.Select(item => new KitAssemblyComponentUseRequest(item.SupplierProductId, item.Quantity)).ToArray(), null, false), default);
        Assert.Empty(run.StepRecords);
        Assert.Equal("InProgress", run.Status);
        scope.ClearTrackedState();
        var kit = await stock.Read(first.Id, default);
        Assert.Null(kit.AssemblyCompletedAt);
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.CompleteKitAssembly(first.Id, new(run.Version), default));
        scope.ClearTrackedState();
        run = await lab.RequestKitAssemblyLabelPrint(first.Id, new(run.Version), default);
        run = await lab.SaveKitAssemblySession(first.Id, new(run.Version, kit.Version, [], [], null, true, ContainerBarcode: kit.KitNumber), default);
        Assert.Equal("Completed", run.Status);
        Assert.Equal(2, run.Uses.Count);
        Assert.Single(run.StepRecords);
    }
}
