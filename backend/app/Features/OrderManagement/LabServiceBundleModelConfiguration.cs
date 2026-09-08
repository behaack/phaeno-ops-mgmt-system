namespace PhaenoPortal.App.Features.OrderManagement;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;

public static class LabServiceBundleModelConfiguration
{
    public static void Configure(ModelBuilder builder, string commercialSchema, string laboratorySchema)
    {
        builder.Entity<LabServiceOffering>(entity => {
            entity.ToTable("lab_service_offerings", commercialSchema); entity.HasKey(value => value.Id);
            entity.HasIndex(value => new { value.FamilyId, value.OfferingVersion }).IsUnique();
            entity.Property(value => value.Name).HasMaxLength(255).IsRequired();
            entity.Property(value => value.Description).HasMaxLength(4000).IsRequired();
            entity.Property(value => value.IncludedOutputContract).HasMaxLength(8000).IsRequired();
            entity.Property(value => value.AnalysisIdsJson).HasColumnType("jsonb").IsRequired();
            entity.Property(value => value.AllowedMaterialTypesJson).HasColumnType("jsonb").IsRequired();
            entity.Property(value => value.AllowedBiologicalSourcesJson).HasColumnType("jsonb").IsRequired();
            entity.Property(value => value.Version).IsConcurrencyToken();
            entity.HasOne<QboCatalogItem>().WithMany().HasForeignKey(value => value.CatalogItemId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<LabServiceOrder>(entity => {
            entity.Property(value => value.EntryMode).HasConversion<string>().HasMaxLength(40).HasDefaultValue(LabServiceEntryMode.ManualQuote);
            entity.Property(value => value.ConfiguredCommercialSnapshotJson).HasColumnType("jsonb");
            entity.HasOne<LabServiceOffering>().WithMany().HasForeignKey(value => value.LabServiceOfferingId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<CommercialSaleSummary>(entity => {
            entity.ToTable("commercial_sale_summaries", commercialSchema); entity.HasKey(value => value.Id);
            entity.HasIndex(value => new { value.WorkflowType, value.OrderId }).IsUnique();
            entity.HasIndex(value => new { value.ProjectedRevision, value.NextAttemptAtUtc });
            entity.Property(value => value.WorkflowType).HasMaxLength(50).IsRequired();
            entity.Property(value => value.ProductSummary).HasMaxLength(500).IsRequired();
            entity.Property(value => value.Currency).HasMaxLength(3).IsRequired();
            entity.Property(value => value.ScheduleHealth).HasMaxLength(20).IsRequired();
            entity.Property(value => value.FailureCode).HasMaxLength(100);
            entity.Property(value => value.Quantity).HasPrecision(18, 2); entity.Property(value => value.Total).HasPrecision(18, 2);
            entity.Property(value => value.Version).IsConcurrencyToken();
            entity.HasOne<Organization>().WithMany().HasForeignKey(value => value.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<CrmOpportunity>().WithMany().HasForeignKey(value => value.OpportunityId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<CrmActivity>().WithMany().HasForeignKey(value => value.ProjectedActivityId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(value => value.CommitmentActorUserId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<LabWorkOrder>().Property(value => value.HasTimingOverride).HasDefaultValue(false);
        builder.Entity<LabWorkTimingChange>(entity => {
            entity.ToTable("lab_work_timing_changes", laboratorySchema); entity.HasKey(value => value.Id);
            entity.HasIndex(value => new { value.LabWorkOrderId, value.OccurredAtUtc });
            entity.Property(value => value.Reason).HasMaxLength(100).IsRequired();
            entity.Property(value => value.CustomerSafeNote).HasMaxLength(2000);
            entity.Property(value => value.InternalNote).HasMaxLength(4000);
            entity.HasOne<LabWorkOrder>().WithMany().HasForeignKey(value => value.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(value => value.TimingChangedByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<OrderNotification>().WithMany().HasForeignKey(value => value.NotificationId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
