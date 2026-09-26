namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public Task CustomerRequestSubmitsAtomicallyAndRevisesPendingScope() => WithChangeDatabase(scope => scope.VerifyRequestSubmissionAsync());

    private sealed partial class HandoffTestScope
    {
        public async Task VerifyRequestSubmissionAsync()
        {
            var input = new LabOrderWriteRequest("Direct submitted request", "Original scope", false,
                "synthetic_reference", "Frozen", "No known hazards", [], RequestedSpecimenCount: 2,
                SourceGroups: [new("synthetic_reference", 2)], SubmitForPricing: true,
                SampleTypeDefinitionId: shippingConfiguration.ActiveSampleTypeId);
            var controller = CreateChangeCustomerController();
            var submitted = await controller.Create(input, default);
            var replay = await controller.Create(input, default);
            Assert.Equal(submitted.Id, replay.Id);
            Assert.Equal("SubmittedForQuote", submitted.Status);
            Assert.True(submitted.CanEdit);
            Assert.True(submitted.CanWithdraw);
            Assert.False(submitted.CanSubmit);
            Assert.False(submitted.CanPlaceStandardOrder);
            var original = await DbContext.LabServiceRequestRevisions.AsNoTracking().SingleAsync(r => r.LabServiceOrderId == submitted.Id);
            Assert.Equal(1, original.Revision);
            var pending = await DbContext.LabServiceOrders.SingleAsync(o => o.Id == submitted.Id);
            pending.BeginQuotePreparation();
            await DbContext.SaveChangesAsync();
            var editingVersion = pending.Version;
            var revisedInput = input with { Description = "Updated scope", Version = editingVersion,
                RequestedSpecimenCount = 3, SourceGroups = [new("synthetic_reference", 3)] };
            var revised = await CreateChangeCustomerController().Update(submitted.Id, revisedInput, default);
            Assert.Equal("SubmittedForQuote", revised.Status);
            Assert.Equal(2, revised.RequestRevision);
            Assert.Equal(3, revised.RequestedSpecimenCount);
            var revisions = await DbContext.LabServiceRequestRevisions.AsNoTracking()
                .Where(r => r.LabServiceOrderId == submitted.Id).OrderBy(r => r.Revision).ToListAsync();
            Assert.Equal(2, revisions.Count);
            Assert.Equal(original.SnapshotJson, revisions[0].SnapshotJson);
            Assert.Equal(original.Id, revisions[1].PreviousRevisionId);
            Assert.Contains("Updated scope", revisions[1].SnapshotJson);
            Assert.Empty(await DbContext.CommercialLabAuthorizations.ToListAsync());
            await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => CreateChangeCustomerController().Update(submitted.Id, revisedInput, default));
            DbContext.ChangeTracker.Clear();
            var withdrawn = await CreateChangeCustomerController().Withdraw(submitted.Id, new(revised.Version, "Request no longer needed"), default);
            Assert.False(withdrawn.CanEdit);
            Assert.False(withdrawn.CanSubmit);
            Assert.Equal(2, await DbContext.LabServiceRequestRevisions.CountAsync(r => r.LabServiceOrderId == submitted.Id));
        }
    }
}
