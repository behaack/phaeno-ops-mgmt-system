namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;

public class LabOperationsDomainTests
{
    [Fact]
    public void WorkOrderAcceptsOnlyNewerAuthorizationVersions()
    {
        var workOrder = WorkOrder(authorizationVersion: 1);

        workOrder.RecordAuthorizationVersion(2, "pseq-lab", 2, "standard", "opaque-ref");

        Assert.Equal(2, workOrder.CurrentAuthorizationVersion);
        Assert.Equal(2, workOrder.ServiceVersion);
        Assert.Throws<InvalidOperationException>(() =>
            workOrder.RecordAuthorizationVersion(2, "pseq-lab", 2, "standard", null));
    }

    [Fact]
    public void SpecimenRequiresReceiptBeforeAccessionAndReasonForHold()
    {
        var specimen = new LabSpecimen(Guid.NewGuid(), Guid.NewGuid());

        Assert.Throws<InvalidOperationException>(() => specimen.AssignAccession("ACC-1"));
        specimen.RecordReceipt(
            new DateTime(2026, 7, 16, 12, 0, 0, DateTimeKind.Utc),
            "Intact",
            "Cold room");
        specimen.AssignAccession("ACC-1");

        Assert.Throws<ArgumentException>(() =>
            specimen.RecordIntakeDisposition(LabSpecimenIntakeDisposition.OnHold, null));
        specimen.RecordIntakeDisposition(LabSpecimenIntakeDisposition.Accepted, null);

        Assert.Equal("ACC-1", specimen.AccessionNumber);
        Assert.Equal(LabSpecimenIntakeDisposition.Accepted, specimen.IntakeDisposition);
    }

    [Fact]
    public void AuthorizationVersionRequiresAnImmutablePayloadHash()
    {
        var version = new LabWorkAuthorizationVersion(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            1,
            1,
            "{\"serviceKey\":\"pseq-lab\"}",
            new string('a', 64),
            new DateTime(2026, 7, 16, 12, 0, 0, DateTimeKind.Utc));

        Assert.Equal(new string('a', 64), version.PayloadSha256);
        Assert.Throws<ArgumentException>(() => new LabWorkAuthorizationVersion(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            1,
            1,
            "{}",
            "not-a-sha256",
            DateTime.UtcNow));
    }

    [Fact]
    public void SpecimenCancellationIsLimitedToUnreceivedMaterial()
    {
        var specimen = new LabSpecimen(Guid.NewGuid(), Guid.NewGuid());

        specimen.CancelBeforeReceipt("commercial_cancellation");

        Assert.Equal(LabSpecimenIntakeDisposition.Cancelled, specimen.IntakeDisposition);
        Assert.Equal("commercial_cancellation", specimen.IntakeReasonCode);
        Assert.Throws<InvalidOperationException>(() =>
            specimen.CancelBeforeReceipt("duplicate_cancellation"));

        var receivedSpecimen = new LabSpecimen(Guid.NewGuid(), Guid.NewGuid());
        receivedSpecimen.RecordReceipt(DateTime.UtcNow, null, null);
        Assert.Throws<InvalidOperationException>(() =>
            receivedSpecimen.CancelBeforeReceipt("commercial_cancellation"));
    }

    [Fact]
    public void WorkOrderCanBeCancelledOnlyBeforeExecutionStarts()
    {
        var workOrder = WorkOrder(authorizationVersion: 1);

        workOrder.CancelBeforeExecution();

        Assert.Equal(LabWorkOrderStatus.Cancelled, workOrder.Status);
        Assert.Throws<InvalidOperationException>(workOrder.CancelBeforeExecution);
    }

    [Fact]
    public void ProviderReceiptMatchesOnlyTheOriginalCommandTypeAndPayload()
    {
        var receipt = new LabProviderCommandReceipt(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            LabProviderCommandType.AuthorizeWork,
            new string('a', 64),
            "Accepted",
            Guid.NewGuid(),
            1,
            null,
            "{}",
            new DateTime(2026, 7, 16, 12, 0, 0, DateTimeKind.Utc));

        Assert.True(receipt.Matches(LabProviderCommandType.AuthorizeWork, new string('A', 64)));
        Assert.False(receipt.Matches(LabProviderCommandType.AmendAuthorization, new string('a', 64)));
        Assert.False(receipt.Matches(LabProviderCommandType.AuthorizeWork, new string('b', 64)));
    }

    [Fact]
    public void WorkOrderUsesControlledMilestonesAndReadyForReleaseIsTerminal()
    {
        var workOrder = WorkOrder(authorizationVersion: 1);

        workOrder.RecordMilestone(LabWorkOrderStatus.Received);
        workOrder.RecordMilestone(LabWorkOrderStatus.Processing);
        workOrder.RecordMilestone(LabWorkOrderStatus.ScientificReview);
        workOrder.RecordMilestone(LabWorkOrderStatus.ReadyForRelease);

        Assert.Equal(LabWorkOrderStatus.ReadyForRelease, workOrder.Status);
        Assert.Equal(5, workOrder.ProjectionVersion);
        Assert.Throws<InvalidOperationException>(() =>
            workOrder.RecordMilestone(LabWorkOrderStatus.Processing));
    }

    [Fact]
    public void ProtocolVersionMustBeApprovedBeforeActivation()
    {
        var protocol = new LabProtocol("rna-prep", "RNA preparation", null);
        protocol.RecordVersion(1);
        var version = new LabProtocolVersion(protocol.Id, 1, LabProtocolTestData.Definition(),
            Guid.NewGuid(), DateTime.UtcNow);

        Assert.Throws<InvalidOperationException>(() => version.Activate(Guid.NewGuid()));
        version.Approve(Guid.NewGuid(), DateTime.UtcNow);
        version.Activate(Guid.NewGuid());

        Assert.Equal(LabProtocolStatus.Active, version.Status);
    }

    [Fact]
    public void ProtocolApprovalLocksTheVersionAndDraftsMayBeDiscardedWithoutReusingTheirNumber()
    {
        var protocol = new LabProtocol("rna-prep", "RNA preparation", null);
        protocol.RecordVersion(1);
        var approvedVersion = new LabProtocolVersion(protocol.Id, 1, LabProtocolTestData.Definition(),
            Guid.NewGuid(), DateTime.UtcNow);

        approvedVersion.UpdateDraft(LabProtocolTestData.Definition("verify"));
        approvedVersion.Approve(Guid.NewGuid(), DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() =>
            approvedVersion.UpdateDraft("""{"steps":[{"key":"changed-after-approval"}]}"""));
        Assert.Throws<InvalidOperationException>(approvedVersion.Discard);

        protocol.RecordVersion(2);
        var discardedVersion = new LabProtocolVersion(protocol.Id, 2, LabProtocolTestData.Definition(),
            Guid.NewGuid(), DateTime.UtcNow);
        discardedVersion.Discard();
        Assert.Equal(LabProtocolStatus.Discarded, discardedVersion.Status);
        Assert.Equal(2, protocol.LatestVersion);
        Assert.Throws<InvalidOperationException>(() => discardedVersion.Approve(Guid.NewGuid(), DateTime.UtcNow));

        protocol.RecordVersion(3);
        Assert.Equal(3, protocol.LatestVersion);
    }

    [Fact]
    public void ServiceWorkflowMovesFromDraftToProductionAndThenBecomesImmutable()
    {
        var author = Guid.NewGuid();
        var approver = Guid.NewGuid();
        var productionActor = Guid.NewGuid();
        var workflow = new LabServiceWorkflow(
            "PSEQ-LAB-SERVICE", "PSeq laboratory workflow", "Canonical production workflow");
        workflow.RecordVersion(1);
        var version = new LabServiceWorkflowVersion(
            workflow.Id, 1, author, DateTime.UtcNow);

        version.Approve(approver, DateTime.UtcNow);
        version.PromoteToProduction(productionActor, DateTime.UtcNow);

        Assert.Equal("pseq-lab-service", workflow.ServiceKey);
        Assert.Equal(LabServiceWorkflowStatus.Production, version.Status);
        Assert.Equal(productionActor, version.ProductionByUserId);
        Assert.Throws<InvalidOperationException>(version.WithdrawApproval);
        version.Retire();
        Assert.Equal(LabServiceWorkflowStatus.Retired, version.Status);
    }

    [Fact]
    public void ConditionalWorkflowStageRequiresACondition()
    {
        Assert.Throws<ArgumentException>(() => new LabServiceWorkflowStage(
            Guid.NewGuid(), 1, "Concentration recovery", Guid.NewGuid(),
            LabServiceWorkflowStageRequirement.Conditional, null, null));

        var stage = new LabServiceWorkflowStage(
            Guid.NewGuid(), 1, "Concentration recovery", Guid.NewGuid(),
            LabServiceWorkflowStageRequirement.Conditional,
            "Incoming concentration is below the approved threshold",
            "Concentration meets the next protocol's input range");

        Assert.Equal(LabServiceWorkflowStageRequirement.Conditional, stage.Requirement);
        Assert.NotNull(stage.Condition);
    }

    [Fact]
    public void WorkOrderPinsOneExactServiceWorkflowVersion()
    {
        var workOrder = WorkOrder(authorizationVersion: 1);
        var workflowVersionId = Guid.NewGuid();

        workOrder.PinServiceWorkflow(workflowVersionId);

        Assert.Equal(workflowVersionId, workOrder.LabServiceWorkflowVersionId);
        workOrder.PinServiceWorkflow(workflowVersionId);
        Assert.Throws<InvalidOperationException>(() =>
            workOrder.PinServiceWorkflow(Guid.NewGuid()));
    }

    [Fact]
    public void ProtocolIdentifyingDetailsCanChangeWithoutChangingItsImmutableKey()
    {
        var protocol = new LabProtocol("rna-prep", "RNA preparation", "Original description");

        protocol.UpdateDetails(" Updated RNA preparation ", " Updated description ");

        Assert.Equal("rna-prep", protocol.Key);
        Assert.Equal("Updated RNA preparation", protocol.Name);
        Assert.Equal("Updated description", protocol.Description);
        Assert.Equal(0, protocol.LatestVersion);
    }

    [Fact]
    public void ProtocolKeysAreDerivedFromNamesAndResolveCollisions()
    {
        var key = LabIdentifierService.CreateProtocolKey(
            "  Référence / RNA Library Preparation  ",
            new[] { "reference-rna-library-preparation", "reference-rna-library-preparation-2" });

        Assert.Equal("reference-rna-library-preparation-3", key);
    }

    [Fact]
    public void MaterialKeysAreSystemDerivedAndResolveCollisions()
    {
        var key = LabIdentifierService.CreateMaterialKey(
            "  Référence / RNA Kit  ",
            new[] { "reference-rna-kit" });

        Assert.Equal("reference-rna-kit-2", key);
    }

    [Fact]
    public void BatchNumbersAreDateStampedAndUseScannerSafeCharacters()
    {
        var batchNumber = LabIdentifierService.CreateBatchNumber(
            new DateTime(2026, 7, 18, 12, 0, 0, DateTimeKind.Utc));

        Assert.Matches(
            "^PH-BAT-20260718-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$",
            batchNumber);
    }

    [Fact]
    public void EquipmentAssetCodesAreDateStampedAndUseScannerSafeCharacters()
    {
        var assetCode = LabIdentifierService.CreateEquipmentAssetCode(
            new DateTime(2026, 7, 18, 12, 0, 0, DateTimeKind.Utc));

        Assert.Matches(
            "^PH-EQP-20260718-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$",
            assetCode);
    }

    [Fact]
    public void EquipmentCalibrationUsesDatesAndRejectsAnInvalidSequence()
    {
        var equipment = new LabEquipment(
            "PH-EQP-20260718-23456789",
            "Reference thermal cycler",
            "Thermal cycler",
            "Bench 1",
            new DateOnly(2026, 7, 1),
            new DateOnly(2027, 7, 1));

        Assert.Equal(new DateOnly(2026, 7, 1), equipment.LastCalibrationOn);
        Assert.Equal(new DateOnly(2027, 7, 1), equipment.CalibrationDueOn);
        Assert.Throws<ArgumentException>(() => new LabEquipment(
            "PH-EQP-20260718-ABCDEFGH",
            "Invalid thermal cycler",
            "Thermal cycler",
            "Bench 1",
            new DateOnly(2026, 7, 2),
            new DateOnly(2026, 7, 1)));
    }

    [Fact]
    public void ExecutionCanCompleteWithoutADeviationNote()
    {
        var protocol = LabProtocolTestData.Version();
        var execution = new LabProtocolExecution(Guid.NewGuid(), null, protocol.Id, Guid.NewGuid());
        execution.Start(DateTime.UtcNow);
        execution.RecordStep(protocol, LabProtocolTestData.Input(), Guid.NewGuid(), new HashSet<LabRole> { LabRole.Operator }, DateTime.UtcNow);
        execution.Complete(protocol, null, DateTime.UtcNow);

        Assert.Equal(LabExecutionStatus.Completed, execution.Status);
        Assert.Null(execution.DeviationNote);
    }

    [Theory]
    [InlineData(LabContainerKind.SubmittedSpecimen, "PH-S-")]
    [InlineData(LabContainerKind.Aliquot, "PH-A-")]
    [InlineData(LabContainerKind.PreparedReagent, "PH-R-")]
    [InlineData(LabContainerKind.Library, "PH-L-")]
    [InlineData(LabContainerKind.Other, "PH-O-")]
    public void PhaenoBarcodeIsKindSpecificAndScannerNormalizable(
        LabContainerKind kind,
        string prefix)
    {
        var barcode = LabBarcodeService.Create(kind);

        Assert.StartsWith(prefix, barcode);
        Assert.True(LabBarcodeService.TryNormalize(
            $"  *{barcode.ToLowerInvariant()}*  ",
            out var normalized));
        Assert.Equal(barcode, normalized);
    }

    [Fact]
    public void PhaenoBarcodeRejectsIncompleteOrAlteredScans()
    {
        var barcode = LabBarcodeService.Create(LabContainerKind.Library);
        var replacement = barcode[^1] == '2' ? '3' : '2';

        Assert.False(LabBarcodeService.TryNormalize("customer-label", out _));
        Assert.False(LabBarcodeService.TryNormalize(
            $"{barcode[..^1]}{replacement}",
            out _));
    }

    [Fact]
    public void MaterialConsumptionCannotExceedQcApprovedAvailability()
    {
        var lot = new LabMaterialLot(LabMaterialLotKind.SupplierLot, Guid.NewGuid(),
            "LOT-1", Guid.NewGuid(), DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            Guid.NewGuid(), 10, "uL");

        lot.RecordQc(LabQcDisposition.Passed, DateOnly.FromDateTime(DateTime.UtcNow),
            null, "{}", Guid.NewGuid(), DateTime.UtcNow);
        lot.Consume(4);

        Assert.Equal(6, lot.AvailableQuantity);
        Assert.Throws<InvalidOperationException>(() => lot.Consume(7));
    }

    [Fact]
    public void FailedMaterialQcRequiresAndRecordsReasonAndPerformedDate()
    {
        var lot = new LabMaterialLot(LabMaterialLotKind.SupplierLot, Guid.NewGuid(),
            "LOT-FAIL", Guid.NewGuid(), DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            Guid.NewGuid(), 10, "uL");
        var performedOn = new DateOnly(2026, 7, 18);

        Assert.Throws<ArgumentException>(() => lot.RecordQc(
            LabQcDisposition.Failed, performedOn, null, "{}", Guid.NewGuid(), DateTime.UtcNow));
        Assert.Throws<ArgumentOutOfRangeException>(() => lot.RecordQc(
            LabQcDisposition.Failed, performedOn.AddDays(1), "Visible particulate",
            "{}", Guid.NewGuid(), performedOn.ToDateTime(TimeOnly.MinValue)));

        lot.RecordQc(LabQcDisposition.Failed, performedOn, "Visible particulate",
            "{}", Guid.NewGuid(), DateTime.UtcNow);

        Assert.Equal(performedOn, lot.QcPerformedOn);
        Assert.Equal("Visible particulate", lot.QcFailureReason);
    }

    [Fact]
    public void PreparedReagentRejectsSupplierAndRequiresStructuredComponentQuantity()
    {
        Assert.Throws<ArgumentException>(() => new LabMaterialLot(
            LabMaterialLotKind.PreparedReagent, Guid.NewGuid(), "PREP-1",
            Guid.NewGuid(), null, Guid.NewGuid(), 10, "uL"));
        Assert.Throws<ArgumentOutOfRangeException>(() => new LabPreparedReagentComponent(
            Guid.NewGuid(), Guid.NewGuid(), 0, "uL"));
    }

    [Fact]
    public void CustomerActionExceptionRequiresASeparateSafeSummary()
    {
        Assert.Throws<ArgumentException>(() => new LabException(
            Guid.NewGuid(), null, null, LabExceptionAudience.CustomerActionRequired,
            "replacement_needed", "Replacement needed", "Internal evidence",
            null, true, DateTime.UtcNow.AddDays(2)));

        var exception = new LabException(Guid.NewGuid(), null, null,
            LabExceptionAudience.Internal, "internal_review", "Review",
            "Internal evidence", null, false, null);

        Assert.Null(exception.CustomerSafeSummary);
    }

    [Fact]
    public void BatchCapturesServerLifecycleTimestamps()
    {
        var batch = new LabOperationalBatch("PH-BAT-1", "Reference sequencing run", null);
        var startedAt = new DateTime(2026, 7, 18, 12, 0, 0, DateTimeKind.Utc);
        var completedAt = startedAt.AddHours(4);

        batch.Start(startedAt);
        Assert.Equal(LabBatchStatus.InProgress, batch.Status);
        Assert.Equal(startedAt, batch.StartedAtUtc);
        Assert.Null(batch.CompletedAtUtc);

        batch.Complete(completedAt);
        Assert.Equal(LabBatchStatus.Complete, batch.Status);
        Assert.Equal(completedAt, batch.CompletedAtUtc);
    }

    private static LabWorkOrder WorkOrder(int authorizationVersion) => new(
        Guid.NewGuid(),
        authorizationVersion,
        LabAuthorizationSource.CommercialOrder,
        Guid.NewGuid(),
        Guid.NewGuid(),
        "pseq-lab",
        1,
        "standard",
        null);
}
