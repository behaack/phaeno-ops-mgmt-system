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
        var version = new LabProtocolVersion(protocol.Id, 1, "{\"steps\":[]}",
            Guid.NewGuid(), DateTime.UtcNow);

        Assert.Throws<InvalidOperationException>(version.Activate);
        version.Approve(Guid.NewGuid(), DateTime.UtcNow);
        version.Activate();

        Assert.Equal(LabProtocolStatus.Active, version.Status);
    }

    [Fact]
    public void ProtocolDraftCanBeEditedWithdrawnAndDiscardedWithoutReusingItsVersion()
    {
        var protocol = new LabProtocol("rna-prep", "RNA preparation", null);
        protocol.RecordVersion(1);
        var version = new LabProtocolVersion(protocol.Id, 1, "{\"steps\":[]}",
            Guid.NewGuid(), DateTime.UtcNow);

        version.UpdateDraft("""{"steps":[{"key":"verify"}]}""");
        version.Approve(Guid.NewGuid(), DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() =>
            version.UpdateDraft("""{"steps":[{"key":"changed-after-approval"}]}"""));

        version.WithdrawApproval();
        Assert.Equal(LabProtocolStatus.Draft, version.Status);
        Assert.Null(version.ApprovedByUserId);
        Assert.Null(version.ApprovedAtUtc);

        version.Discard();
        Assert.Equal(LabProtocolStatus.Discarded, version.Status);
        Assert.Equal(1, protocol.LatestVersion);
        Assert.Throws<InvalidOperationException>(() => version.Approve(Guid.NewGuid(), DateTime.UtcNow));

        protocol.RecordVersion(2);
        Assert.Equal(2, protocol.LatestVersion);
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
    public void BatchNumbersAreDateStampedAndUseScannerSafeCharacters()
    {
        var batchNumber = LabIdentifierService.CreateBatchNumber(
            new DateTime(2026, 7, 18, 12, 0, 0, DateTimeKind.Utc));

        Assert.Matches(
            "^PH-BAT-20260718-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$",
            batchNumber);
    }

    [Fact]
    public void ExecutionCanCompleteWithoutADeviationNote()
    {
        var execution = new LabProtocolExecution(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid());

        execution.Start(DateTime.UtcNow);
        execution.Complete("""{"status":"passed"}""", null, DateTime.UtcNow);

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
        var lot = new LabMaterialLot(LabMaterialLotKind.SupplierLot, "polymerase",
            "Polymerase", "LOT-1", "Supplier", null, DateTime.UtcNow.AddDays(30),
            "Freezer A", 10, "uL");

        lot.RecordQc(LabQcDisposition.Passed, "{}", Guid.NewGuid(), DateTime.UtcNow);
        lot.Consume(4);

        Assert.Equal(6, lot.AvailableQuantity);
        Assert.Throws<InvalidOperationException>(() => lot.Consume(7));
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
