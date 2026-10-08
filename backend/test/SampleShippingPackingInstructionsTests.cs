namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.OrderManagement.Domain;

public class SampleShippingPackingInstructionsTests
{
    [Fact]
    public void SampleTypeLinkBelongsToEachSpecificationRevision()
    {
        var kit = new SampleShippingContainerType("TRANS-20");
        var sampleTypeAnchor = Guid.NewGuid();
        var now = new DateTime(2026, 9, 25, 12, 0, 0, DateTimeKind.Utc);

        var draft = new SampleShippingContainerDefinition(kit.Id, 1, null, "RNA kit", 20, now, null, false, 0);
        draft.SetDraftSampleType(sampleTypeAnchor);
        Assert.Equal(sampleTypeAnchor, draft.SampleTypeAnchorId);
        var nextType = Guid.NewGuid();
        draft.SetDraftSampleType(nextType);
        Assert.Equal(nextType, draft.SampleTypeAnchorId);
        draft.Activate(now);
        Assert.Throws<InvalidOperationException>(() => draft.SetDraftSampleType(Guid.NewGuid()));
    }

    [Theory]
    [InlineData(0, "kg")]
    [InlineData(-1, "kg")]
    [InlineData(1, null)]
    public void KitDryIceRequiresAPositiveAmountAndUnit(decimal amount, string? unit)
    {
        Assert.Throws<ArgumentException>(() => new SampleShippingContainerDefinition(
            Guid.NewGuid(), 1, null, "Synthetic kit", 20,
            new DateTime(2026, 9, 25, 12, 0, 0, DateTimeKind.Utc), null, false, 0,
            dryIceQuantity: amount, dryIceUnit: unit));
    }

    [Fact]
    public void ProcedureRelationshipChangesWithoutChangingSampleTypeIdentity()
    {
        var sampleTypeAnchor = Guid.NewGuid();
        var actor = Guid.NewGuid();
        var firstProcedure = Guid.NewGuid();
        var secondProcedure = Guid.NewGuid();
        var now = new DateTime(2026, 9, 25, 12, 0, 0, DateTimeKind.Utc);
        var link = new SampleTypeProcedureLink(sampleTypeAnchor, firstProcedure, actor, now);

        link.ChangeProcedure(secondProcedure, actor, now.AddMinutes(1));

        Assert.Equal(sampleTypeAnchor, link.SampleTypeAnchorId);
        Assert.Equal(secondProcedure, link.ProcedureAnchorId);
        Assert.Equal(1, link.Version);
        Assert.Equal(now.AddMinutes(1), link.ChangedAt);
    }
}
