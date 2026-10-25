namespace PhaenoPortal.App.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class PSeqOperationsDbContext
{
    public override int SaveChanges(bool acceptAllChangesOnSuccess)
        => SaveWithCustomerHoldsAsync(acceptAllChangesOnSuccess, CancellationToken.None).GetAwaiter().GetResult();

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
        => SaveWithCustomerHoldsAsync(acceptAllChangesOnSuccess, cancellationToken);

    private void ProtectLineageHistory()
    {
        ChangeTracker.DetectChanges();
        foreach (var entry in ChangeTracker.Entries<LabContainer>().Where(e => e.State == EntityState.Modified
            && (e.Property(c => c.StorageBoxId).IsModified || e.Property(c => c.StoragePosition).IsModified)))
            if (!ChangeTracker.Entries<LabPhysicalEvent>().Any(e => e.State == EntityState.Added && e.Entity.LabContainerId == entry.Entity.Id))
                throw new InvalidOperationException("A change to physical box occupancy requires an immutable physical event in the same save.");
        if (ChangeTracker.Entries<LabMasterMixIngredientUse>().Any(e => e.State == EntityState.Deleted
            || e.State == EntityState.Modified && e.Properties.Any(p => p.IsModified
                && p.Metadata.Name != nameof(LabMasterMixIngredientUse.VoidedAtUtc)
                && p.Metadata.Name != nameof(LabMasterMixIngredientUse.VoidedByUserId))))
            throw new InvalidOperationException("Ingredient withdrawal evidence is immutable; retain a linked void or discrepancy correction.");
        if (ChangeTracker.Entries().Any(e => e.State is EntityState.Modified or EntityState.Deleted
            && e.Entity is PSeq.Operations.Laboratory.Research.ResearchRevision or PSeq.Operations.Laboratory.Research.ResearchAttachment))
            throw new InvalidOperationException("Research revisions and attachment receipts are immutable.");
        if (ChangeTracker.Entries().Any(e => e.State == EntityState.Deleted
            && e.Entity is PSeq.Operations.Laboratory.Research.ResearchProject or PSeq.Operations.Laboratory.Research.ResearchExperiment or PSeq.Operations.Laboratory.Research.ResearchEntry))
            throw new InvalidOperationException("Research notebook records are retained and cannot be deleted.");
        if (ChangeTracker.Entries().Any(e => e.State == EntityState.Deleted && e.Entity is LabCustomerHold or LabWorkOrder or LabSpecimen
            or LabContainer or LabStorageBox or LabSpecimenAttempt or LabProtocolExecution or LabWorkEvent or LabPreparationBatch or LabPreparationMember
            or LabPreparationRecord or LabLibrary or LabNgsSendout or LabAssemblyJob))
            throw new InvalidOperationException("Internal sample history is retained indefinitely. Deactivate or record a linked correction rather than deleting evidence.");
        var newRuns = ChangeTracker.Entries<LabAnalysisRun>().Where(e => e.State == EntityState.Added).Select(e => e.Entity.Id).ToHashSet();
        if (ChangeTracker.Entries<LabAnalysisInput>().Any(e => e.State == EntityState.Added && !newRuns.Contains(e.Entity.LabAnalysisRunId)))
            throw new InvalidOperationException("Analysis inputs must be saved atomically with a new analysis run. Record reanalysis to change the input set.");
        if (ChangeTracker.Entries().Any(e => e.State is EntityState.Modified or EntityState.Deleted
            && e.Entity is LabScientificFile or LabSequencingOutput or LabAnalysisRun or LabAnalysisInput
                or LabMaterialConsumption or LabEquipmentUsage or LabCustodyEvent or LabInvestigationReport
                or LabPerformanceProposal or LabPerformanceDecision or LabPreparationRecord or LabAssemblyEvent or LabBiologicalMaterialTransfer
                or LabVendorLibraryException or LabVendorResultReference or LabReagentMaterialUse or LabPreparedReagentComponent
                or LabPhysicalEvent or LabStorageBoxMove or LabMasterMixPerformanceDecision))
            throw new InvalidOperationException("Recorded lineage, resource use and custody evidence cannot be overwritten or deleted. Record a linked correction instead.");
    }
}
