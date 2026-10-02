namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class CommercialOrderDraftDomainTests
{
    [Fact]
    public void IncompleteDraftCanBeSavedWithoutSubmittingOrCreatingOperationalPhases()
    {
        var draft = CompleteDraft() with { SampleTypeDefinitionId = null, StorageRequirements = "", SafetyDeclaration = "",
            Phases = [new("Phase 1", [new("", 0)], null, null, null, null)], UsesPhases = false };
        var order = Create(draft);
        Assert.Equal(LabServiceOrderStatus.DraftRequest, order.Status);
        Assert.Null(order.SubmittedAt);
        Assert.Empty(order.Phases);
        Assert.NotNull(order.ReadCommercialDraft());
        Assert.Throws<ArgumentException>(() => order.MaterializeCommercialDraft(Guid.NewGuid(), DateTime.UtcNow, "Frozen"));
        Assert.NotNull(order.ReadCommercialDraft());
    }

    [Fact]
    public void SubmissionRetainsDifferentPhaseRunsPricesAndRepeatedSources()
    {
        var order = Create(CompleteDraft());
        var actor = Guid.NewGuid();
        order.MaterializeCommercialDraft(actor, DateTime.UtcNow, "Sample type storage");
        Assert.Equal(LabServiceOrderStatus.SubmittedForQuote, order.Status);
        Assert.Null(order.ReadCommercialDraft());
        Assert.Equal(CompleteDraft().CatalogItemId, order.RequestedCatalogItemId);
        Assert.Equal(5, order.RequestedSpecimenCount);
        Assert.Equal(11, order.SequencingRunCount);
        Assert.Equal(5, Assert.Single(order.SourceGroups).SpecimenCount);
        Assert.Collection(order.Phases,
            first => { Assert.Equal(2, first.SampleCount); Assert.Equal(1, first.ReadScope()!.RunsPerSample); Assert.Equal(12.50m, first.ProposedUnitPrice); Assert.Equal(actor, first.PriceProposedByUserId); },
            second => { Assert.Equal(3, second.SampleCount); Assert.Equal(3, second.ReadScope()!.RunsPerSample); Assert.Equal(9, second.ReadScope()!.SequencingRunCount); Assert.Equal(20m, second.ProposedUnitPrice); Assert.Equal(5m, second.ProposedAdditionalRunPrice); });
        Assert.Throws<InvalidOperationException>(() => order.SaveCommercialDraft(CompleteDraft()));
    }

    [Fact]
    public void UnselectedServiceCanBeSavedButCannotSubmitOrMaterializeScope()
    {
        var draft = CompleteDraft() with { CatalogItemId = null };
        var order = Create(draft);
        Assert.Null(order.ReadCommercialDraft()!.CatalogItemId);
        Assert.Throws<ArgumentException>(() => order.MaterializeCommercialDraft(Guid.NewGuid(), DateTime.UtcNow, "Frozen"));
        Assert.Empty(order.Phases);
        Assert.Empty(order.SourceGroups);
        Assert.Null(order.RequestedCatalogItemId);
        Assert.Equal(LabServiceOrderStatus.DraftRequest, order.Status);
    }

    [Fact]
    public void SampleScopeRejectsWrongPhaseSourceRunsAndCapacity()
    {
        var order = Create(CompleteDraft());
        order.MaterializeCommercialDraft(Guid.NewGuid(), DateTime.UtcNow, "Sample type storage");
        var phase = order.Phases.Last();
        LabPhaseScopeRules.Validate(phase, "Human PBMC", 3, []);
        Assert.Throws<OrderManagementException>(() => LabPhaseScopeRules.Validate(phase, "Mouse liver", 3, []));
        Assert.Throws<OrderManagementException>(() => LabPhaseScopeRules.Validate(phase, "Human PBMC", 1, []));
        Assert.Throws<OrderManagementException>(() => LabPhaseScopeRules.Validate(phase, "Human PBMC", 3,
            [("Human PBMC", 3), ("Human PBMC", 3), ("Human PBMC", 3)]));
    }

    [Fact]
    public void EnabledPriceProposalMustBeCompletedBeforeSubmission()
    {
        var draft = CompleteDraft();
        draft = draft with { Phases = [draft.Phases[0] with { ProposedUnitPrice = null }, draft.Phases[1]] };
        CommercialDraftRules.Validate(draft, false);
        Assert.Throws<ArgumentException>(() => CommercialDraftRules.Validate(draft, true));
    }

    [Fact]
    public void EarlyCancellationRemovesOnlyItsSourcesAndRunsFromPreparation()
    {
        var order = Create(CompleteDraft());
        order.MaterializeCommercialDraft(Guid.NewGuid(), DateTime.UtcNow, "Frozen");
        var cancelled = order.Phases.Last();
        cancelled.Cancel(Guid.NewGuid(), "Unused validation cohort", DateTime.UtcNow);
        var preparation = order.ReadPreparationScope();
        Assert.Equal(2, Assert.Single(preparation.Sources).SpecimenCount);
        Assert.Equal(2, preparation.SequencingRunCount);
        Assert.Equal(5, order.RequestedSpecimenCount);
        Assert.Equal(11, order.RequestedSequencingRunCount);
        Assert.Equal(5, Assert.Single(order.SourceGroups).SpecimenCount);
        Assert.Equal(order.Phases.First().Id, LabPhaseScopeRules.Resolve(order, null).Id);
        Assert.Throws<OrderManagementException>(() => LabPhaseScopeRules.Validate(cancelled, "Human PBMC", 3, []));
    }

    [Fact]
    public void SampleTypeStorageIsRetainedOnSubmissionAndAnOverrideTakesPrecedence()
    {
        var inherited = Create(CompleteDraft() with { StorageRequirements = null });
        Assert.Null(inherited.ReadCommercialDraft()!.StorageRequirements);
        inherited.MaterializeCommercialDraft(Guid.NewGuid(), DateTime.UtcNow, " Store at -80 °C. ");
        Assert.Equal("Store at -80 °C.", inherited.StorageRequirements);

        var overridden = Create(CompleteDraft() with { StorageRequirements = "Store at 4 °C for this study." });
        overridden.MaterializeCommercialDraft(Guid.NewGuid(), DateTime.UtcNow, "Store at -80 °C.");
        Assert.Equal("Store at 4 °C for this study.", overridden.StorageRequirements);
    }

    [Theory]
    [InlineData(null, "")]
    [InlineData("", "Store at -80 °C.")]
    public void MissingDefaultOrEmptyOverrideCannotCreateOperationalPhases(string? storageOverride, string sampleTypeStorage)
    {
        var order = Create(CompleteDraft() with { StorageRequirements = storageOverride });
        Assert.Throws<ArgumentException>(() => order.MaterializeCommercialDraft(Guid.NewGuid(), DateTime.UtcNow, sampleTypeStorage));
        Assert.Equal(LabServiceOrderStatus.DraftRequest, order.Status);
        Assert.NotNull(order.ReadCommercialDraft());
        Assert.Empty(order.Phases);
        Assert.Empty(order.SourceGroups);
    }

    private static LabServiceOrder Create(CommercialLabOrderDraft draft) => LabServiceOrder.CreateCommercialDraft(
        Guid.NewGuid(), Guid.NewGuid(), "DRAFT-1", draft, null, "Instructions");

    private static CommercialLabOrderDraft CompleteDraft() => new("Study", Guid.NewGuid(), "Frozen", "No known hazards", "", true,
        [new("Discovery", [new("Human PBMC", 2)], 1, 10, 12.50m, "Discussed with Customer", true),
         new("Validation", [new("Human PBMC", 3)], 3, 20, 20m, "", true, 5m)],
        Guid.Parse("00000000-0000-4000-8000-000000000010"));
}
