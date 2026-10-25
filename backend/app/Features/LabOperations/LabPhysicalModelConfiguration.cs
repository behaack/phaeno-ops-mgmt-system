namespace PhaenoPortal.App.Features.LabOperations;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;

public static class LabPhysicalModelConfiguration
{
    public static void Configure(ModelBuilder model, string schema)
    {
        model.Entity<LabStorageBox>(e => {
            e.ToTable("lab_storage_boxes", schema); e.HasKey(x => x.Id);
            e.Property(x => x.Barcode).HasMaxLength(255); e.HasIndex(x => x.Barcode).IsUnique();
            e.Property(x => x.Room).HasMaxLength(100); e.Property(x => x.Freezer).HasMaxLength(100);
            e.Property(x => x.Rack).HasMaxLength(100); e.Property(x => x.Shelf).HasMaxLength(100);
            e.Property(x => x.Version).IsConcurrencyToken();
        });
        model.Entity<LabMasterMixPerformanceDecision>(e => {
            e.ToTable("lab_master_mix_performance_decisions", schema); e.HasKey(x => x.Id);
            e.Property(x => x.Reason).HasMaxLength(2000);
            e.HasOne<LabMasterMixStepRecord>().WithOne().HasForeignKey<LabMasterMixPerformanceDecision>(x => x.Id).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<LabContainer>(e => {
            e.Property(x => x.StoragePosition).HasMaxLength(30); e.Property(x => x.PhysicalHoldReason).HasMaxLength(2000);
            e.HasOne<LabStorageBox>().WithMany().HasForeignKey(x => x.StorageBoxId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.StorageBoxId, x.StoragePosition }).IsUnique().HasFilter("storage_position IS NOT NULL");
        });
        model.Entity<LabPhysicalEvent>(e => {
            e.ToTable("lab_physical_events", schema); e.HasKey(x => x.Id);
            e.Property(x => x.Kind).HasMaxLength(40); e.Property(x => x.Reason).HasMaxLength(2000);
            e.Property(x => x.RequestHash).HasMaxLength(64); e.Property(x => x.DetailsJson).HasColumnType("jsonb");
            e.HasIndex(x => new { x.LabContainerId, x.RecordedAtUtc });
            e.HasOne<LabContainer>().WithMany().HasForeignKey(x => x.LabContainerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabStorageBox>().WithMany().HasForeignKey(x => x.StorageBoxId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<LabStorageBoxMove>(e => {
            e.ToTable("lab_storage_box_moves", schema); e.HasKey(x => x.Id);
            e.Property(x => x.Reason).HasMaxLength(2000); e.Property(x => x.RequestHash).HasMaxLength(64);
            e.Property(x => x.DetailsJson).HasColumnType("jsonb"); e.HasIndex(x => new { x.LabStorageBoxId, x.RecordedAtUtc });
            e.HasOne<LabStorageBox>().WithMany().HasForeignKey(x => x.LabStorageBoxId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
