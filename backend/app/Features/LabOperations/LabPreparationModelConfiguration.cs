namespace PhaenoPortal.App.Features.LabOperations;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;

public static class LabPreparationModelConfiguration
{
    public static void Configure(ModelBuilder modelBuilder, string schema)
    {
        modelBuilder.Entity<LabMaterialConsumption>().HasOne<LabPreparationRecord>().WithMany().HasForeignKey(e => e.LabPreparationRecordId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<LabEquipmentUsage>().HasOne<LabPreparationRecord>().WithMany().HasForeignKey(e => e.LabPreparationRecordId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<LabTrayFormat>(e =>
        {
            e.ToTable("lab_tray_formats", schema); e.HasKey(x => x.Id);
            e.Property(x => x.LayoutJson).HasColumnType("jsonb"); e.Property(x => x.Version).IsConcurrencyToken();
        });
        modelBuilder.Entity<LabPreparationBatch>(e =>
        {
            e.ToTable("lab_preparation_batches", schema); e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(160); e.Property(x => x.LayoutJson).HasColumnType("jsonb");
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(50); e.Property(x => x.Version).IsConcurrencyToken();
            e.HasOne<LabTrayFormat>().WithMany().HasForeignKey(x => x.LabTrayFormatId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabServiceWorkflowVersion>().WithMany().HasForeignKey(x => x.LabServiceWorkflowVersionId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<LabPreparationMember>(e =>
        {
            e.ToTable("lab_preparation_members", schema); e.HasKey(x => x.Id);
            e.Property(x => x.Position).HasMaxLength(10); e.Property(x => x.ConfirmedBarcode).HasMaxLength(100);
            e.HasIndex(x => new { x.LabPreparationBatchId, x.Position }).IsUnique().HasFilter("NOT removed");
            e.HasIndex(x => x.LabSpecimenAttemptId).IsUnique().HasFilter("NOT removed");
            e.HasOne<LabPreparationBatch>().WithMany().HasForeignKey(x => x.LabPreparationBatchId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabSpecimenAttempt>().WithMany().HasForeignKey(x => x.LabSpecimenAttemptId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabContainer>().WithMany().HasForeignKey(x => x.OutputContainerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabLibrary>().WithMany().HasForeignKey(x => x.LabLibraryId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<LabPreparationRecord>(e =>
        {
            e.ToTable("lab_preparation_records", schema); e.HasKey(x => x.Id);
            e.Property(x => x.Action).HasMaxLength(50); e.Property(x => x.RequestHash).HasMaxLength(64);
            e.Property(x => x.DetailsJson).HasColumnType("jsonb"); e.HasIndex(x => new { x.LabPreparationBatchId, x.RecordedAtUtc });
            e.HasOne<LabPreparationBatch>().WithMany().HasForeignKey(x => x.LabPreparationBatchId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
