namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Trials.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Trials.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;

public sealed partial class TrialProjectPostgresTests
{
    [PostgreSqlReferenceFact]
    public Task PhysicalTrialDestructionPreservesFrozenDatesAndHolds() => VerifyPhysicalTrialAsync(false);
    [PostgreSqlReferenceFact]
    public Task PhysicalTrialReturnRequiresFrozenDestinationAndTracking() => VerifyPhysicalTrialAsync(true);

    private async Task VerifyPhysicalTrialAsync(bool returnApproved)
    {
        await using var scope = await Fixture.Create(); var db = scope.Db;
        db.Add(new LabRoleAssignment(scope.Scientific.User.Id, LabRole.Supervisor)); await db.SaveChangesAsync();
        var trial = await scope.CreateApprovedTrial();
        if (returnApproved)
        {
            var terms = await scope.ScopeRequest(trial);
            await scope.Workflow.ProposeAsync(trial, scope.Commercial, terms with { MaterialDisposition = TrialMaterialDisposition.Return,
                ReturnDestination = "TEST approved return destination", ReturnHandling = "TEST frozen handling", ReturnShippingPayer = "TEST payer", Reason = "TEST pre-shipment return approval" }, default);
            await db.SaveChangesAsync();
        }
        await scope.Submit(trial, "RNA-PHYSICAL");
        var sample = Assert.Single(trial.Samples); var workId = sample.LabWorkOrderId!.Value;
        var specimen = await db.LabSpecimens.SingleAsync(s => s.LabWorkOrderId == workId);
        var tube = new LabContainer(workId, specimen.Id, null, LabContainerKind.Other, "TRIAL-PHYSICAL-" + Guid.NewGuid().ToString("N"), "TEST ONLY", "TEST storage", 5, "uL", null);
        db.Add(tube); await db.SaveChangesAsync();
        var identity = new PhysicalTrialIdentity(new("clerk", scope.Scientific.User.ExternalSubjectId!, scope.Scientific.User.Email, true));
        var lab = new LabOperationsController(db, new LabOperationsRequestContext(db, identity)) { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
        Task<PhaenoPortal.App.Features.LabOperations.DTOs.LabContainerDto> Record(string kind, string? destination = null, string? tracking = null) =>
            lab.RecordPhysicalContainer(tube.Id, new(Guid.NewGuid(), tube.Version, kind, tube.Barcode, "TEST actual handling", Method: "TEST method", Destination: destination, TrackingReference: tracking), default);
        Assert.Equal("trial_retention_frozen", (await Assert.ThrowsAsync<OrderManagementException>(() => Record("RetentionSet"))).ErrorCode);
        Assert.Equal("trial_material_terms", (await Assert.ThrowsAsync<OrderManagementException>(() => Record("Destroyed"))).ErrorCode);
        trial.Close(TrialStatus.ClosedIncomplete, "TEST close for retention boundary", DateTime.UtcNow); await db.SaveChangesAsync();
        Assert.Equal("trial_material_terms", (await Assert.ThrowsAsync<OrderManagementException>(() => Record("Destroyed"))).ErrorCode);
        // Simulate an elapsed retention clock; no existing or scientific records are backfilled.
        db.Entry(trial).Property(t => t.ResidualRetainUntilUtc).CurrentValue = DateTime.UtcNow.AddMinutes(-1); await db.SaveChangesAsync();
        trial.SetHold(true, "TEST incident preservation"); await db.SaveChangesAsync();
        Assert.Equal("trial_material_terms", (await Assert.ThrowsAsync<OrderManagementException>(() => Record(returnApproved ? "Returned" : "Destroyed", "TEST approved return destination", "TEST tracking"))).ErrorCode);
        trial.SetHold(false, "TEST hold released"); await db.SaveChangesAsync();
        Assert.Equal("trial_material_terms", (await Assert.ThrowsAsync<OrderManagementException>(() => Record("Transferred", "TEST other project", "TEST tracking"))).ErrorCode);
        if (returnApproved)
        {
            Assert.Equal("trial_material_terms", (await Assert.ThrowsAsync<OrderManagementException>(() => Record("Returned", "Wrong destination", "TEST tracking"))).ErrorCode);
            Assert.Equal("physical_return_tracking_required", (await Assert.ThrowsAsync<OrderManagementException>(() => Record("Returned", "TEST approved return destination"))).ErrorCode);
        }
        var result = await Record(returnApproved ? "Returned" : "Destroyed", returnApproved ? "TEST approved return destination" : null, returnApproved ? "TEST tracking" : null);
        Assert.Equal(returnApproved ? "Returned" : "Disposed", result.Status);
        Assert.Equal(returnApproved ? 5m : 0m, result.Quantity);
        var wrongSummary = new TrialActionRequest(trial.Version, "TEST wrong summary", MaterialDisposition: "Exhausted");
        Assert.Equal("trial_tube_disposition_mismatch", (await Assert.ThrowsAsync<OrderManagementException>(() => scope.Workflow.ActAsync(trial, scope.Scientific, "material", wrongSummary, default))).ErrorCode);
        await scope.Workflow.ActAsync(trial, scope.Scientific, "material", wrongSummary with { MaterialDisposition = returnApproved ? "Returned" : "Destroyed" }, default);
        Assert.Equal(returnApproved ? "Returned" : "Destroyed", trial.ActualMaterialDisposition);
    }
    private sealed class PhysicalTrialIdentity(ExternalIdentity identity) : IExternalIdentityContext { public ExternalIdentity? Read(HttpContext context) => identity; }
}
