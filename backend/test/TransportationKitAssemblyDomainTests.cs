namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public sealed class TransportationKitAssemblyDomainTests
{
    [Fact]
    public void WorkflowApprovalPinsAnIndependentReviewAndOrderedProcedure()
    {
        var author = Guid.NewGuid();
        var step = new LabKitAssemblyStep(Guid.NewGuid(), "Pack tubes", "Place scanned tubes in the shipper.");
        var workflow = new LabKitAssemblyWorkflow(Guid.NewGuid());
        var revision = new LabKitAssemblyWorkflowRevision(workflow.Id, 1, [step], author, DateTime.UtcNow);
        revision.Components.Add(new LabKitAssemblyComponent(revision.Id, Guid.NewGuid(), 2, "Tube", 0));

        Assert.Throws<InvalidOperationException>(() => revision.Approve(author, DateTime.UtcNow, null));
        Assert.Throws<InvalidOperationException>(() => revision.Approve(author, DateTime.UtcNow, "On shift"));
        Assert.Throws<ArgumentException>(() => revision.Approve(author, DateTime.UtcNow, new string('x', 2001), true));
        revision.Approve(Guid.NewGuid(), DateTime.UtcNow, null);
        Assert.Equal(LabKitAssemblyRevisionStatus.Approved, revision.Status);

        var run = new LabKitAssemblyRun(Guid.NewGuid(), revision, Guid.NewGuid(), DateTime.UtcNow);
        var tubeComponent = Assert.Single(revision.Components);
        Assert.Throws<InvalidOperationException>(() => tubeComponent.ValidateActualUse(0.5m, "each"));
        Assert.Throws<InvalidOperationException>(() => tubeComponent.ValidateActualUse(1m, "box"));
        tubeComponent.ValidateActualUse(1m, "each");
        var sourceLotId = Guid.NewGuid();
        run.EnsureSingleTubeSourceLot(sourceLotId, []);
        run.EnsureSingleTubeSourceLot(sourceLotId, [sourceLotId]);
        Assert.Throws<InvalidOperationException>(() => run.EnsureSingleTubeSourceLot(Guid.NewGuid(), [sourceLotId]));
        revision.Retire();
        Assert.Equal(step, Assert.Single(run.Steps()));
        Assert.Throws<InvalidOperationException>(() => run.Complete(Guid.NewGuid(), DateTime.UtcNow));
        run.RecordStep(0);
        run.Complete(Guid.NewGuid(), DateTime.UtcNow);
        Assert.Equal(LabKitAssemblyRunStatus.Completed, run.Status);
    }

    [Fact]
    public void PlatformAdministratorOverrideRequiresAReason()
    {
        var author = Guid.NewGuid();
        var workflow = new LabKitAssemblyWorkflow(Guid.NewGuid());
        var revision = new LabKitAssemblyWorkflowRevision(workflow.Id, 1,
            [new(Guid.NewGuid(), "Pack", "Pack the tubes.")], author, DateTime.UtcNow);
        revision.Components.Add(new LabKitAssemblyComponent(revision.Id, Guid.NewGuid(), 1, "Tube", 0));
        Assert.Throws<InvalidOperationException>(() => revision.Approve(author, DateTime.UtcNow, null, true));
        revision.Approve(author, DateTime.UtcNow, "Only qualified reviewer on shift", true);
        Assert.Equal("Only qualified reviewer on shift", revision.ApprovalOverrideReason);
    }

    [Fact]
    public void PhysicalTubeRosterRequiresExactSecondScanAndCorrectionClearsVerification()
    {
        var productId = Guid.NewGuid();
        var kit = new SampleShippingStockKit("KIT-TEST-ROSTER", Guid.NewGuid(), "{}", 2,
            "Tube maker", "TUBE", null, "Shipper maker", "BOX",
            tubeSupplierProductId: productId, tubeBarcodeNamespace: "maker-a");
        kit.Tubes.Add(new SampleShippingStockTube(kit.Id, "TUBE-ONE", "maker-a", productId));
        kit.Tubes.Add(new SampleShippingStockTube(kit.Id, "TUBE-TWO", "maker-a", productId));

        Assert.Throws<InvalidOperationException>(() => kit.VerifyTubeRoster(Guid.NewGuid(), ["TUBE-ONE", "OTHER"], DateTime.UtcNow));
        kit.VerifyTubeRoster(Guid.NewGuid(), ["TUBE-TWO", "TUBE-ONE"], DateTime.UtcNow);
        Assert.NotNull(kit.TubesVerifiedAt);
        kit.InvalidateTubeVerification();
        Assert.Null(kit.TubesVerifiedAt);
        kit.ConfirmTubeLotNumber("LOT-A");
        kit.ConfirmTubeLotNumber("lot-a");
        Assert.Throws<InvalidOperationException>(() => kit.ConfirmTubeLotNumber("LOT-B"));
    }
}
