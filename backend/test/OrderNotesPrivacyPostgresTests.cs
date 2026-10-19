namespace PhaenoPortal.Test;

using System.Text.Json;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.LabOperations.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task CustomerOrderResponsesExcludePrivateNotesAndHistoricalSnapshotCopies()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var (_, offering) = await scope.ConfigureStandardAsync();
        var draft = new CommercialLabOrderDraft($"Notes {Guid.NewGuid():N}", scope.ActiveSampleTypeId,
            "Frozen", "No known hazards", "<p>SECRET_STAFF_CONTEXT</p>", false,
            [new("Scope", [new("synthetic_reference", 1)], 1, 14, null, null)], offering.CatalogItemId,
            "<p><strong>Customer instructions</strong></p>");
        var order = LabServiceOrder.CreateCommercialDraft(scope.CustomerOrganization.Id,
            scope.CustomerOrganization.Departments.Single(department => department.IsDefault).Id,
            OrderNumberGenerator.Lab(), draft, null, "Ship frozen");
        order.MaterializeCommercialDraft(scope.PlatformUser.Id, DateTime.UtcNow, "Frozen");
        order.SelectSampleType(scope.ActiveSampleTypeId, "extracted_rna");
        scope.DbContext.LabServiceOrders.Add(order);
        scope.DbContext.LabServiceRequestRevisions.Add(new LabServiceRequestRevision(order.Id, order.RequestRevision,
            null, """{"jobNotes":"SECRET_HISTORICAL_CONTEXT","publicNotes":"Customer instructions"}""", null,
            scope.PlatformUser.Id, DateTime.UtcNow));
        await scope.DbContext.SaveChangesAsync();

        var provider = new InternalLabOperationsProvider(scope.DbContext);
        var customer = await scope.CreateCustomerController(provider, Guid.NewGuid().ToString("N")).Get(order.Id, default);
        Assert.Null(customer.PrivateNotes);
        Assert.Null(customer.Description);
        Assert.Null(customer.CommercialDraft);
        Assert.Equal(order.PublicNotes, customer.PublicNotes);
        Assert.DoesNotContain("SECRET_", JsonSerializer.Serialize(customer));
        var staff = await scope.CreatePlatformController(provider).Get(order.Id, default);
        Assert.Equal(order.PrivateNotes, staff.PrivateNotes);
        Assert.Contains("SECRET_HISTORICAL_CONTEXT", Assert.Single(staff.RequestRevisions!).SnapshotJson);
    }
}
