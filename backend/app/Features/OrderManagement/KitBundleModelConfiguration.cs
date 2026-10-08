namespace PhaenoPortal.App.Features.OrderManagement;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Common.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public static class KitBundleModelConfiguration
{
    public static void Configure(ModelBuilder modelBuilder, string schema)
    {
        modelBuilder.Entity<AssemblyInputRevision>().HasOne<PartnerKitUnit>().WithMany().HasForeignKey(x => x.KitUnitId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PartnerKitUnit>(entity =>
        {
            entity.ToTable("partner_kit_units", schema); entity.HasKey(x => x.Id);
            entity.Property(x => x.Label).HasMaxLength(100).IsRequired(); entity.HasIndex(x => x.Label).IsUnique();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.LotBatchNumber).HasMaxLength(255); entity.Property(x => x.Carrier).HasMaxLength(255); entity.Property(x => x.TrackingNumber).HasMaxLength(255);
            entity.HasIndex(x => new { x.PartnerReagentOrderId, x.PartnerReagentOrderLineId, x.Status });
            entity.HasOne<PartnerReagentOrder>().WithMany().HasForeignKey(x => x.PartnerReagentOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PartnerReagentOrderLine>().WithMany().HasForeignKey(x => x.PartnerReagentOrderLineId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Organization>().WithMany().HasForeignKey(x => x.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<OrganizationDepartment>().WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ReagentShipment>().WithMany().HasForeignKey(x => x.ReagentShipmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PartnerKitUnit>().WithMany().HasForeignKey(x => x.ReplacesKitUnitId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PartnerKitUnit>().WithMany().HasForeignKey(x => x.ReplacedByKitUnitId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.ReplacesKitUnitId).IsUnique(); Audit(entity);
        });
        modelBuilder.Entity<KitAssemblyCase>(entity =>
        {
            entity.ToTable("kit_assembly_cases", schema); entity.HasKey(x => x.Id); entity.Ignore(x => x.IsTerminal);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.CaseNumber).HasMaxLength(105).IsRequired(); entity.HasIndex(x => x.CaseNumber).IsUnique();
            entity.Property(x => x.ProfileSnapshotJson).HasColumnType("jsonb").IsRequired(); entity.Property(x => x.DeadlineBasis).HasMaxLength(200);
            entity.HasIndex(x => x.OriginalKitUnitId).IsUnique(); entity.HasIndex(x => x.CurrentKitUnitId).IsUnique(); entity.HasIndex(x => x.AssemblyRequestId).IsUnique();
            entity.HasIndex(x => new { x.Status, x.SubmissionDeadlineAt }); entity.HasIndex(x => new { x.OrganizationId, x.DepartmentId, x.PartnerReagentOrderId });
            entity.HasOne<PartnerReagentOrder>().WithMany().HasForeignKey(x => x.PartnerReagentOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Organization>().WithMany().HasForeignKey(x => x.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<OrganizationDepartment>().WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PartnerKitUnit>().WithMany().HasForeignKey(x => x.OriginalKitUnitId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PartnerKitUnit>().WithMany().HasForeignKey(x => x.CurrentKitUnitId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<AssemblyProfile>().WithMany().HasForeignKey(x => x.AssemblyProfileId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<DataAssemblyRequest>().WithMany().HasForeignKey(x => x.AssemblyRequestId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ReagentShipment>().WithMany().HasForeignKey(x => x.BillingShipmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<CommercialDocumentLink>().WithMany().HasForeignKey(x => x.BillingDocumentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(x => x.History).WithOne().HasForeignKey(x => x.KitAssemblyCaseId).OnDelete(DeleteBehavior.Restrict); Audit(entity);
        });
        modelBuilder.Entity<KitCaseEvent>(entity =>
        {
            entity.ToTable("kit_case_events", schema); entity.HasKey(x => x.Id);
            entity.Property(x => x.EventType).HasMaxLength(60).IsRequired(); entity.Property(x => x.Reason).HasMaxLength(2000).IsRequired();
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.ActorUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PartnerKitUnit>().WithMany().HasForeignKey(x => x.PreviousKitUnitId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PartnerKitUnit>().WithMany().HasForeignKey(x => x.CurrentKitUnitId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => new { x.KitAssemblyCaseId, x.At });
        });
        modelBuilder.Entity<PartnerReagentOffering>().HasOne<AssemblyProfile>().WithMany().HasForeignKey(x => x.IncludedAssemblyProfileId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PartnerReagentOrderLine>(entity =>
        {
            entity.Property(x => x.IncludedAssemblyProfileSnapshotJson).HasColumnType("jsonb");
            entity.HasOne<AssemblyProfile>().WithMany().HasForeignKey(x => x.IncludedAssemblyProfileId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<DataAssemblyRequest>(entity =>
        {
            entity.Property(x => x.KitProfileSnapshotJson).HasColumnType("jsonb");
            entity.HasOne<KitAssemblyCase>().WithMany().HasForeignKey(x => x.KitAssemblyCaseId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.KitAssemblyCaseId).IsUnique();
        });
    }
    private static void Audit<T>(EntityTypeBuilder<T> entity) where T : class, IAudit, IConcurrency
    {
        entity.Property(x => x.Version).IsConcurrencyToken();
        entity.HasOne<User>().WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne<User>().WithMany().HasForeignKey(x => x.UpdatedByUserId).OnDelete(DeleteBehavior.Restrict);
    }
}
