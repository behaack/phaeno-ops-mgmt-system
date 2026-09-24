namespace PhaenoPortal.App.Features.LabOperations;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public static class LabKitAssemblyModelConfiguration
{
    public static void Configure(ModelBuilder builder, string schema)
    {
        builder.Entity<LabKitAssemblyWorkflow>(e =>
        {
            e.ToTable("lab_kit_assembly_workflows", schema);
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.FinishedKitProductId).IsUnique();
            e.Property(x => x.Version).IsConcurrencyToken();
            e.HasOne<LabSupplierProduct>().WithMany().HasForeignKey(x => x.FinishedKitProductId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UpdatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<LabKitAssemblyWorkflowRevision>(e =>
        {
            e.ToTable("lab_kit_assembly_workflow_revisions", schema);
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.WorkflowId, x.Revision }).IsUnique();
            e.Property(x => x.StepsJson).HasColumnType("jsonb").IsRequired();
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            e.Property(x => x.ApprovalOverrideReason).HasMaxLength(2000);
            e.HasOne<LabKitAssemblyWorkflow>().WithMany().HasForeignKey(x => x.WorkflowId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.AuthoredByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.ApprovedByUserId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<LabKitAssemblyComponent>(e =>
        {
            e.ToTable("lab_kit_assembly_components", schema);
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.WorkflowRevisionId, x.SupplierProductId }).IsUnique();
            e.HasIndex(x => new { x.WorkflowRevisionId, x.Position }).IsUnique();
            e.Property(x => x.Kind).HasMaxLength(30).IsRequired();
            e.HasOne<LabKitAssemblyWorkflowRevision>().WithMany(x => x.Components).HasForeignKey(x => x.WorkflowRevisionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabSupplierProduct>().WithMany().HasForeignKey(x => x.SupplierProductId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<LabKitAssemblyRun>(e =>
        {
            e.ToTable("lab_kit_assembly_runs", schema);
            e.HasKey(x => x.Id);
            e.Property(x => x.Version).IsConcurrencyToken();
            e.Property(x => x.StepsJson).HasColumnType("jsonb").IsRequired();
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            e.Property(x => x.AbandonmentReason).HasMaxLength(2000);
            e.HasIndex(x => x.StockKitId).IsUnique();
            e.HasOne<SampleShippingStockKit>().WithMany().HasForeignKey(x => x.StockKitId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabKitAssemblyWorkflowRevision>().WithMany().HasForeignKey(x => x.WorkflowRevisionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.StartedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.FinishedByUserId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<LabKitAssemblyStepRecord>(e =>
        {
            e.ToTable("lab_kit_assembly_step_records", schema);
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.RunId, x.Sequence }).IsUnique();
            e.Property(x => x.Notes).HasMaxLength(4000).IsRequired();
            e.HasOne<LabKitAssemblyRun>().WithMany().HasForeignKey(x => x.RunId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabStepVersion>().WithMany().HasForeignKey(x => x.LabStepVersionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.PerformedByUserId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<LabKitAssemblyUse>(e =>
        {
            e.ToTable("lab_kit_assembly_uses", schema);
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.RunId, x.SupplierProductId });
            e.Property(x => x.Quantity).HasPrecision(18, 6);
            e.Property(x => x.QuantityUnit).HasMaxLength(50).IsRequired();
            e.HasOne<LabKitAssemblyRun>().WithMany().HasForeignKey(x => x.RunId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabSupplierProduct>().WithMany().HasForeignKey(x => x.SupplierProductId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabMaterialLot>().WithMany().HasForeignKey(x => x.SourceMaterialLotId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.RecordedByUserId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
