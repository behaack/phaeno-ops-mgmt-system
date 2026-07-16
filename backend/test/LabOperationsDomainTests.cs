namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

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
