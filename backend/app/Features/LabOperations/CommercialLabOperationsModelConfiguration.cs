namespace PhaenoPortal.App.Features.LabOperations;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.LabOperations.Domain;

public static class CommercialLabOperationsModelConfiguration
{
    public static void Configure(ModelBuilder modelBuilder, string commercialSchema)
    {
        modelBuilder.Entity<CommercialLabAuthorization>(entity =>
        {
            entity.ToTable("lab_authorizations", commercialSchema);
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AuthorizationSnapshotJson).HasColumnType("jsonb").IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.ProviderReasonCode).HasMaxLength(100);
            entity.Property(e => e.Version).IsConcurrencyToken().IsRequired();
            entity.HasIndex(e => e.AuthorizationId).IsUnique();
            entity.HasIndex(e => e.CommercialOrderId).IsUnique();
            entity.HasIndex(e => e.CommandId).IsUnique();
            entity.HasIndex(e => new { e.OrganizationId, e.Status });
        });

        modelBuilder.Entity<CommercialLabWorkProjection>(entity =>
        {
            entity.ToTable("lab_work_projections", commercialSchema);
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Milestone).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ScheduleHealth).HasMaxLength(50).IsRequired();
            entity.Property(e => e.CustomerSafeSummary).HasMaxLength(2000);
            entity.Property(e => e.PermittedQcProjectionJson).HasColumnType("jsonb");
            entity.HasIndex(e => e.AuthorizationId).IsUnique();
            entity.HasIndex(e => e.LabWorkOrderId).IsUnique();
        });

        modelBuilder.Entity<LabOperationsEventReceipt>(entity =>
        {
            entity.ToTable("lab_operations_event_receipts", commercialSchema);
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.EventId).IsUnique();
            entity.HasIndex(e => new { e.AuthorizationId, e.ProjectionVersion });
        });
    }
}
