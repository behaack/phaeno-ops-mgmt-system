namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task SpecificFamilyOfferingsClearAvailabilityAndQuoteIdentityDoesNotUseFirstItem()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var db = scope.DbContext;
        foreach (var existing in await db.QboCatalogItems.Where(item => item.ServiceFamily == CatalogServiceFamily.PSeqLabService).ToListAsync())
            existing.Sync(existing.ExternalItemId, existing.Name, existing.Description, existing.SalesUnit, existing.BasePrice, existing.Currency, false, DateTime.UtcNow);
        var rna = new QboCatalogItem("RNA-" + Guid.NewGuid(), "RNA service", "", "specimen", 1250, "USD", true, DateTime.UtcNow, CatalogServiceFamily.PSeqLabService);
        var other = new QboCatalogItem("OTHER-" + Guid.NewGuid(), "Other service", "", "specimen", 500, "USD", true, DateTime.UtcNow);
        var second = new QboCatalogItem("SECOND-" + Guid.NewGuid(), "Another lab offering", "", "specimen", 2000, "USD", true, DateTime.UtcNow, CatalogServiceFamily.PSeqLabService);
        db.AddRange(rna, other, second); await db.SaveChangesAsync();
        Assert.True((await LabServiceOrderingEligibility.ReadAsync(db, scope.CustomerOrganization.Id, DateTime.UtcNow, default)).OfferingAvailable);
        var lines = JsonSerializer.Serialize(new[] { new { catalogItemId = second.Id }, new { catalogItemId = other.Id } });
        Assert.Equal(second.Id, await LabQuoteCatalog.ReadItemAsync(db, lines, true, default));
        await Assert.ThrowsAsync<OrderManagementException>(() => LabQuoteCatalog.ReadItemAsync(db,
            JsonSerializer.Serialize(new[] { new { catalogItemId = second.Id }, new { catalogItemId = rna.Id } }), true, default));
        rna.Sync(rna.ExternalItemId, rna.Name, "", "specimen", 1250, "USD", false, DateTime.UtcNow);
        second.Sync(second.ExternalItemId, second.Name, "", "specimen", 2000, "USD", false, DateTime.UtcNow);
        await db.SaveChangesAsync();
        Assert.False((await LabServiceOrderingEligibility.ReadAsync(db, scope.CustomerOrganization.Id, DateTime.UtcNow, default)).OfferingAvailable);
        Assert.Equal(second.Id, await LabQuoteCatalog.ReadItemAsync(db, lines, false, default));
        await Assert.ThrowsAsync<OrderManagementException>(() => LabQuoteCatalog.ReadItemAsync(db, lines, true, default));
    }

    [PostgreSqlReferenceFact]
    public async Task DeletionEligibilityRequiresInactiveHistoryAndNoSavedReferences()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var db = scope.DbContext;
        var item = new QboCatalogItem("DRAFT-" + Guid.NewGuid(), "Unused draft", "", "specimen", 100, "USD", false, DateTime.UtcNow, CatalogServiceFamily.PSeqLabService);
        db.Add(item); await db.SaveChangesAsync();
        Assert.Null(await CatalogItemDeletion.BlockerAsync(db, item, default));
        var analysis = new AnalysisDefinition(item.Id, "Draft analysis", "", "", "[]", "[]", false, false);
        db.Add(analysis); await db.SaveChangesAsync();
        Assert.True(await CatalogItemDeletion.HasReferencesAsync(db, item.Id, default));
        Assert.NotNull(await CatalogItemDeletion.BlockerAsync(db, item, default));
    }
}
