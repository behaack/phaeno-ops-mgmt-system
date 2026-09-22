namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

public sealed class CatalogItemPolicyTests
{
    [Fact]
    public void SpecificOfferingCanJoinFamilyWithoutChangingReferencePriceOrStatus()
    {
        var item = Item(true);
        item.SetServiceFamily(CatalogServiceFamily.PSeqLabService);
        Assert.Equal("ITEM-RNA", item.ExternalItemId);
        Assert.True(item.IsActive);
        Assert.Equal(1250m, item.BasePrice);
        Assert.Equal(CatalogServiceFamily.PSeqLabService, item.ServiceFamily);
        item.Sync(item.ExternalItemId, "Renamed RNA service", "", "specimen", 1500, "USD", false, DateTime.UtcNow);
        Assert.Equal(CatalogServiceFamily.PSeqLabService, item.ServiceFamily);
    }

    [Fact]
    public void OnlyConfirmedNeverActiveItemCanBeDeleted()
    {
        var item = Item(false);
        Assert.Null(CatalogItemDeletion.HistoryBlocker(item, [Audit(item, "Created", "{\"IsActive\":{\"old\":null,\"new\":false}}") ]));
        Assert.NotNull(CatalogItemDeletion.HistoryBlocker(item, []));
        Assert.NotNull(CatalogItemDeletion.HistoryBlocker(item, [Audit(item, "Created", "{}") ]));
        Assert.NotNull(CatalogItemDeletion.HistoryBlocker(item, [Audit(item, "Created", "null") ]));
        Assert.NotNull(CatalogItemDeletion.HistoryBlocker(item, [Audit(item, "Created", "{invalid") ]));
        Assert.NotNull(CatalogItemDeletion.HistoryBlocker(item, [Audit(item, "Created", "{\"IsActive\":{\"old\":null,\"new\":true}}") ]));
    }

    [Fact]
    public void ActivationThenDeactivationCannotRestoreDeletion()
    {
        var item = Item(false);
        item.IncrementVersion(); item.IncrementVersion();
        var created = Audit(item, "Created", "{\"IsActive\":{\"old\":null,\"new\":false}}");
        var activated = Audit(item, "Updated", "{\"IsActive\":{\"old\":false,\"new\":true}}");
        var deactivated = Audit(item, "Updated", "{\"IsActive\":{\"old\":true,\"new\":false}}");
        Assert.Contains("has been active", CatalogItemDeletion.HistoryBlocker(item, [created, activated, deactivated]));
        Assert.NotNull(CatalogItemDeletion.HistoryBlocker(item, [created, deactivated]));
        Assert.NotNull(CatalogItemDeletion.HistoryBlocker(Item(true), []));
    }

    private static QboCatalogItem Item(bool active) => new("ITEM-RNA", "RNA Service", "", "specimen", 1250, "USD", active, DateTime.UtcNow);
    private static AuditEvent Audit(QboCatalogItem item, string operation, string changes) =>
        new(nameof(QboCatalogItem), item.Id.ToString(), operation, null, null, null, DateTime.UtcNow, changes);
}
