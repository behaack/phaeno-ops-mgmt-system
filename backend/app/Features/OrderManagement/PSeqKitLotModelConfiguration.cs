namespace PhaenoPortal.App.Features.OrderManagement;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public static class PSeqKitLotModelConfiguration
{
    public static void Configure(ModelBuilder builder, string schema)
    {
        builder.Entity<PSeqKitLot>(entity =>
        {
            entity.ToTable("pseq_kit_lots", schema); entity.HasKey(x => x.Id);
            entity.Property(x => x.LotNumber).HasMaxLength(255).IsRequired();
            entity.Property(x => x.NormalizedLotNumber).HasMaxLength(255).IsRequired();
            entity.Property(x => x.RecallReason).HasMaxLength(2000);
            entity.HasIndex(x => new { x.CatalogItemId, x.NormalizedLotNumber }).IsUnique();
            entity.HasOne<QboCatalogItem>().WithMany().HasForeignKey(x => x.CatalogItemId).OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UpdatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<PartnerKitLotSubmission>(entity =>
        {
            entity.ToTable("partner_kit_lot_submissions", schema); entity.HasKey(x => x.Id);
            entity.Property(x => x.EnteredLotNumber).HasMaxLength(255).IsRequired();
            entity.Property(x => x.AssessmentJson).HasColumnType("jsonb").IsRequired();
            entity.HasIndex(x => new { x.KitAssemblyCaseId, x.KitUnitId }).IsUnique();
            entity.HasIndex(x => new { x.OrganizationId, x.DepartmentId });
            entity.HasOne<Organization>().WithMany().HasForeignKey(x => x.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<OrganizationDepartment>().WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<KitAssemblyCase>().WithMany().HasForeignKey(x => x.KitAssemblyCaseId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PartnerKitUnit>().WithMany().HasForeignKey(x => x.KitUnitId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PSeqKitLot>().WithMany().HasForeignKey(x => x.KitLotId).OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UpdatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<PartnerKitUnit>(entity =>
        {
            entity.HasOne<PSeqKitLot>().WithMany().HasForeignKey(x => x.KitLotId).OnDelete(DeleteBehavior.Restrict);
            entity.ToTable("partner_kit_units", schema, table => table.HasCheckConstraint("ck_partner_kit_units_shipped_lot",
                "status NOT IN ('Shipped', 'Replaced') OR kit_lot_id IS NOT NULL"));
        });
        builder.Entity<ReagentShipmentLine>().HasOne<PSeqKitLot>().WithMany().HasForeignKey(x => x.KitLotId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<AssemblyInputRevision>(entity =>
        {
            entity.Property(x => x.KitLotAssessmentJson).HasColumnType("jsonb");
            entity.HasOne<PSeqKitLot>().WithMany().HasForeignKey(x => x.KitLotId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PartnerKitLotSubmission>().WithMany().HasForeignKey(x => x.KitLotSubmissionId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<AssemblyProcessingRun>().Property(x => x.KitLotAssessmentJson).HasColumnType("jsonb");
    }
}
