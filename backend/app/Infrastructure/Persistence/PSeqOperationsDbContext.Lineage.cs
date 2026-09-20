namespace PhaenoPortal.App.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class PSeqOperationsDbContext
{
    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ProtectLineageHistory();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        ProtectLineageHistory();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void ProtectLineageHistory()
    {
        ChangeTracker.DetectChanges();
        if (ChangeTracker.Entries().Any(e => e.State == EntityState.Deleted && e.Entity is LabWorkOrder or LabSpecimen
            or LabContainer or LabSpecimenAttempt or LabProtocolExecution or LabWorkEvent or LabPreparationBatch or LabPreparationMember
            or LabPreparationRecord or LabLibrary or LabNgsSendout))
            throw new InvalidOperationException("Internal sample history is retained indefinitely. Deactivate or record a linked correction rather than deleting evidence.");
        var newRuns = ChangeTracker.Entries<LabAnalysisRun>().Where(e => e.State == EntityState.Added).Select(e => e.Entity.Id).ToHashSet();
        if (ChangeTracker.Entries<LabAnalysisInput>().Any(e => e.State == EntityState.Added && !newRuns.Contains(e.Entity.LabAnalysisRunId)))
            throw new InvalidOperationException("Analysis inputs must be saved atomically with a new analysis run. Record reanalysis to change the input set.");
        if (ChangeTracker.Entries().Any(e => e.State is EntityState.Modified or EntityState.Deleted
            && e.Entity is LabScientificFile or LabSequencingOutput or LabAnalysisRun or LabAnalysisInput
                or LabMaterialConsumption or LabEquipmentUsage or LabCustodyEvent or LabInvestigationReport
                or LabPerformanceProposal or LabPerformanceDecision or LabPreparationRecord))
            throw new InvalidOperationException("Recorded lineage, resource use and custody evidence cannot be overwritten or deleted. Record a linked correction instead.");
    }
}
