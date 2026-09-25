namespace PhaenoPortal.App.Features.LabOperations;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;

public static class LabMasterMixModelConfiguration
{
    public static void Configure(ModelBuilder modelBuilder, string schema)
    {
        modelBuilder.Entity<LabMasterMixWorkflow>(e =>
        {
            e.ToTable("lab_master_mix_workflows", schema); e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(160);
            e.Property(x => x.QuantityUnit).HasMaxLength(50);
            e.Property(x => x.StepsJson).HasColumnType("jsonb");
            e.Property(x => x.IngredientsJson).HasColumnType("jsonb");
            e.Property(x => x.RevisionHistoryJson).HasColumnType("jsonb");
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(50);
            e.Property(x => x.ApprovalOverrideReason).HasMaxLength(2000);
            e.Property(x => x.Version).IsConcurrencyToken();
            e.HasIndex(x => x.Name).IsUnique().HasFilter("status <> 'Retired'");
        });
        modelBuilder.Entity<LabMasterMixPreparation>(e =>
        {
            e.ToTable("lab_master_mix_preparations", schema); e.HasKey(x => x.Id);
            e.Property(x => x.WorkflowName).HasMaxLength(160);
            e.Property(x => x.QuantityUnit).HasMaxLength(50);
            e.Property(x => x.StepsJson).HasColumnType("jsonb");
            e.Property(x => x.IngredientsJson).HasColumnType("jsonb");
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(50);
            e.Property(x => x.PreparedQuantity).HasPrecision(28, 12);
            e.Property(x => x.UsedQuantity).HasPrecision(28, 12);
            e.Property(x => x.MeasuredDiscardQuantity).HasPrecision(28, 12);
            e.Property(x => x.DiscardReason).HasMaxLength(2000);
            e.Property(x => x.RecipeDeviationReason).HasMaxLength(2000);
            e.Property(x => x.Version).IsConcurrencyToken();
            e.HasOne<LabMasterMixWorkflow>().WithMany().HasForeignKey(x => x.WorkflowId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.Status, x.StartedAtUtc });
        });
        modelBuilder.Entity<LabMasterMixStepRecord>(e =>
        {
            e.ToTable("lab_master_mix_steps", schema); e.HasKey(x => x.Id);
            e.Property(x => x.Notes).HasMaxLength(4000);
            e.HasIndex(x => new { x.PreparationId, x.Sequence }).IsUnique();
            e.HasOne<LabMasterMixPreparation>().WithMany().HasForeignKey(x => x.PreparationId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<LabMasterMixIngredientUse>(e =>
        {
            e.ToTable("lab_master_mix_ingredients", schema); e.HasKey(x => x.Id);
            e.Property(x => x.Quantity).HasPrecision(28, 12);
            e.Property(x => x.QuantityUnit).HasMaxLength(50);
            e.HasIndex(x => x.PreparationId);
            e.HasOne<LabMasterMixPreparation>().WithMany().HasForeignKey(x => x.PreparationId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabMaterialLot>().WithMany().HasForeignKey(x => x.SourceMaterialLotId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<LabMasterMixTrayUse>(e =>
        {
            e.ToTable("lab_master_mix_tray_uses", schema); e.HasKey(x => x.Id);
            e.Property(x => x.FieldKey).HasMaxLength(100);
            e.Property(x => x.Quantity).HasPrecision(28, 12);
            e.Property(x => x.QuantityUnit).HasMaxLength(50);
            e.HasIndex(x => new { x.LabPreparationRecordId, x.FieldKey }).IsUnique();
            e.HasIndex(x => new { x.PreparationId, x.LabPreparationBatchId });
            e.HasOne<LabMasterMixPreparation>().WithMany().HasForeignKey(x => x.PreparationId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabPreparationBatch>().WithMany().HasForeignKey(x => x.LabPreparationBatchId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabPreparationRecord>().WithMany().HasForeignKey(x => x.LabPreparationRecordId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<LabMasterMixCorrection>(e =>
        {
            e.ToTable("lab_master_mix_corrections", schema); e.HasKey(x => x.Id);
            e.Property(x => x.TargetKind).HasMaxLength(30);
            e.Property(x => x.Action).HasMaxLength(30);
            e.Property(x => x.Reason).HasMaxLength(2000);
            e.HasIndex(x => new { x.PreparationId, x.RecordedAtUtc });
            e.HasIndex(x => new { x.PreparationId, x.TargetEntryId }).IsUnique();
            e.HasOne<LabMasterMixPreparation>().WithMany().HasForeignKey(x => x.PreparationId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
