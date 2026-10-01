namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task NegotiatedDepartmentPriceIsFrozenAndPriceChangesRequireAnotherReview()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var (order, offering) = await scope.ConfigureStandardAsync();
        var organization = new LabServiceNegotiatedPrice(order.OrganizationId, null, offering.CatalogItemId, 900, DateTime.UtcNow.AddDays(-1), null, true);
        var department = new LabServiceNegotiatedPrice(order.OrganizationId, order.DepartmentId, offering.CatalogItemId, 850, DateTime.UtcNow.AddDays(-1), null, true);
        scope.DbContext.AddRange(organization, department); await scope.DbContext.SaveChangesAsync();
        var controller = scope.StandardController();
        var preview = await controller.PreviewStandard(order.Id, offering.Id, default);
        Assert.Equal(850, preview.Offering.UnitPrice); Assert.Equal("Department", preview.PriceProvenance!.Source);
        var selectedId = department.Id;
        department.Update(800, department.EffectiveFrom, null, true); await scope.DbContext.SaveChangesAsync();
        var stale = await Assert.ThrowsAsync<OrderManagementException>(() => controller.PlaceStandard(order.Id, StandardRequest(scope, preview), default));
        Assert.Equal("standard_review_expired", stale.ErrorCode);
        scope.DbContext.ChangeTracker.Clear();
        Assert.False(await scope.DbContext.LabServiceQuotes.AnyAsync(q => q.LabServiceOrderId == order.Id));
        var current = await controller.PreviewStandard(order.Id, offering.Id, default);
        var placed = await controller.PlaceStandard(order.Id, StandardRequest(scope, current), default);
        Assert.Equal(800, placed.StandardCommercialSnapshot!.UnitPrice);
        Assert.Equal(selectedId, placed.StandardCommercialSnapshot.PriceProvenance!.NegotiatedPriceId);
        var changed = await scope.DbContext.Set<LabServiceNegotiatedPrice>().SingleAsync(p => p.Id == selectedId);
        changed.Update(750, changed.EffectiveFrom, null, true); await scope.DbContext.SaveChangesAsync();
        Assert.Equal(800, (await controller.Get(order.Id, default)).StandardCommercialSnapshot!.UnitPrice);
        Assert.Single(await scope.DbContext.LabServiceQuotes.Where(q => q.LabServiceOrderId == order.Id).ToArrayAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task PlacementCannotBypassServiceSampleLimitOrMissingLimitConfiguration()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var (order, offering) = await scope.ConfigureStandardAsync();
        var catalog = await scope.DbContext.QboCatalogItems.SingleAsync(c => c.Id == offering.CatalogItemId);
        catalog.SetMaximumCustomerSamples(1); await scope.DbContext.SaveChangesAsync();
        var controller = scope.StandardController();
        var atLimit = await controller.PreviewStandard(order.Id, offering.Id, default);
        Assert.True(atLimit.CanPlaceStandardOrder, string.Join("; ", atLimit.Blockers));
        catalog.SetMaximumCustomerSamples(null); await scope.DbContext.SaveChangesAsync();
        var missing = await controller.PreviewStandard(order.Id, offering.Id, default);
        Assert.False(missing.CanPlaceStandardOrder); Assert.Contains(missing.Blockers, b => b.Contains("sample limit"));
        var blocked = await Assert.ThrowsAsync<OrderManagementException>(() => controller.PlaceStandard(order.Id, StandardRequest(scope, missing), default));
        Assert.Equal("standard_order_not_ready", blocked.ErrorCode);
        Assert.False(await scope.DbContext.LabServiceQuotes.AnyAsync(q => q.LabServiceOrderId == order.Id));
    }
}
