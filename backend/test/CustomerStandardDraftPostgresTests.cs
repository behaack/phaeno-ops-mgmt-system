namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task CustomerDraftSavesIncompleteScopeAndReplaysBeforeReviewingOneRunPerSample()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var (_, offering) = await scope.ConfigureStandardAsync();
        var controller = scope.StandardController();
        var incomplete = new CustomerStandardOrderDraft($"Customer Study {Guid.NewGuid():N}", null, null, [new("", 0)], null, "", "Study notes");
        var body = new CustomerStandardDraftWrite(incomplete);
        var saved = await controller.CreateCustomerDraft(body, default);
        var replay = await controller.CreateCustomerDraft(body, default);
        Assert.Equal(saved.Id, replay.Id); Assert.Equal("DraftRequest", saved.Status);
        Assert.Equal(incomplete.JobName, saved.CustomerDraft!.JobName);
        Assert.Null(saved.PlacedAt); Assert.Empty(saved.Quotes); Assert.False(saved.CanSubmit);
        var complete = incomplete with { OfferingId = offering.Id, SampleTypeDefinitionId = scope.ActiveSampleTypeId,
            Sources = [new("Human PBMC", 1)], SafetyDeclaration = "No known hazards" };
        var updated = await controller.SaveCustomerDraft(saved.Id, new(complete, saved.Version), default);
        var review = await controller.ReviewCustomerDraft(saved.Id, new VersionRequest(updated.Version), default);
        Assert.True(review.Preview.CanPlaceStandardOrder, string.Join("; ", review.Preview.Blockers));
        Assert.Equal(1, review.Order.RequestedSequencingRunCount);
        Assert.NotEmpty(review.Order.StorageRequirements);
        Assert.Empty(review.Order.Quotes); Assert.Null(review.Order.PlacedAt);
        Assert.Single((await scope.DbContext.LabServiceOrders.Include(o => o.Phases).SingleAsync(o => o.Id == saved.Id)).Phases);
        var firstPhaseId = (await scope.DbContext.Set<LabJobPhase>().SingleAsync(p => p.LabServiceOrderId == saved.Id)).Id;
        updated = await controller.SaveCustomerDraft(saved.Id, new(complete with { Notes = "Revised scope notes" }, review.Order.Version), default);
        review = await controller.ReviewCustomerDraft(saved.Id, new VersionRequest(updated.Version), default);
        Assert.True(review.Preview.CanPlaceStandardOrder, string.Join("; ", review.Preview.Blockers));
        Assert.False(await scope.DbContext.Set<LabJobPhase>().AnyAsync(p => p.Id == firstPhaseId));
        Assert.Equal(1, await scope.DbContext.Set<LabJobPhase>().CountAsync(p => p.LabServiceOrderId == saved.Id));
        Assert.Equal(1, await scope.DbContext.LabServiceSourceGroups.CountAsync(s => s.LabServiceOrderId == saved.Id));
    }
}
