namespace PhaenoPortal.App.Features.LabOperations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PSeq.Operations.Laboratory.Domain;

public static class LabOperationsModelConfiguration
{
    public static void Configure(ModelBuilder modelBuilder, string laboratorySchema)
    {
        modelBuilder.Entity<LabWorkOrder>(entity =>
        {
            entity.ToTable("lab_work_orders", laboratorySchema);
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AuthorizationSource).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.ServiceKey).HasMaxLength(255).IsRequired();
            entity.Property(e => e.TurnaroundPolicyKey).HasMaxLength(255).IsRequired();
            entity.Property(e => e.OpaqueSubmitterReference).HasMaxLength(500);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.Version).IsConcurrencyToken().IsRequired();
            entity.HasIndex(e => e.AuthorizationId).IsUnique();
            entity.HasIndex(e => new { e.SubmittingOrganizationId, e.Status, e.CreatedAt });
        });

        modelBuilder.Entity<LabWorkAuthorizationVersion>(entity =>
        {
            entity.ToTable("lab_work_authorization_versions", laboratorySchema);
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SnapshotJson).HasColumnType("jsonb").IsRequired();
            entity.Property(e => e.PayloadSha256).HasMaxLength(64).IsRequired();
            entity.HasIndex(e => e.CommandId).IsUnique();
            entity.HasIndex(e => new { e.LabWorkOrderId, e.AuthorizationVersion }).IsUnique();
            entity.HasOne<LabWorkOrder>()
                .WithMany(e => e.AuthorizationVersions)
                .HasForeignKey(e => e.LabWorkOrderId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabSpecimen>(entity =>
        {
            entity.ToTable("lab_specimens", laboratorySchema);
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AccessionNumber).HasMaxLength(100);
            entity.Property(e => e.IntakeDisposition).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.ReceiptCondition).HasMaxLength(1000);
            entity.Property(e => e.IntakeReasonCode).HasMaxLength(100);
            entity.Property(e => e.CurrentLocation).HasMaxLength(255);
            entity.Property(e => e.Version).IsConcurrencyToken().IsRequired();
            entity.HasIndex(e => e.AccessionNumber)
                .IsUnique()
                .HasFilter("\"accession_number\" IS NOT NULL");
            entity.HasIndex(e => new { e.LabWorkOrderId, e.SubmittedSpecimenId }).IsUnique();
            entity.HasIndex(e => new { e.IntakeDisposition, e.ReceivedAtUtc });
            entity.HasOne<LabWorkOrder>()
                .WithMany(e => e.Specimens)
                .HasForeignKey(e => e.LabWorkOrderId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabWorkEvent>(entity =>
        {
            entity.ToTable("lab_work_events", laboratorySchema);
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EventCode).HasMaxLength(100).IsRequired();
            entity.Property(e => e.DetailsJson).HasColumnType("jsonb").IsRequired();
            entity.HasIndex(e => new { e.LabWorkOrderId, e.OccurredAtUtc });
            entity.HasIndex(e => e.LabSpecimenId);
            entity.HasOne<LabWorkOrder>()
                .WithMany(e => e.Events)
                .HasForeignKey(e => e.LabWorkOrderId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabSpecimen>()
                .WithMany()
                .HasForeignKey(e => e.LabSpecimenId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabScientificApproval>(entity =>
        {
            entity.ToTable("lab_scientific_approvals", laboratorySchema);
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ReleaseDefinitionKey).HasMaxLength(255).IsRequired();
            entity.Property(e => e.PermittedQcProjectionJson).HasColumnType("jsonb");
            entity.HasIndex(e => new { e.LabWorkOrderId, e.ApprovalVersion }).IsUnique();
            entity.HasIndex(e => new { e.LabWorkOrderId, e.ProjectionVersion }).IsUnique();
            entity.HasOne<LabWorkOrder>()
                .WithMany(e => e.ScientificApprovals)
                .HasForeignKey(e => e.LabWorkOrderId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabProviderCommandReceipt>(entity =>
        {
            entity.ToTable("lab_provider_command_receipts", laboratorySchema);
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CommandType).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.PayloadSha256).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Disposition).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ReasonCode).HasMaxLength(100);
            entity.Property(e => e.OutcomeJson).HasColumnType("jsonb").IsRequired();
            entity.HasIndex(e => e.CommandId).IsUnique();
            entity.HasIndex(e => new { e.AuthorizationId, e.AcknowledgedAtUtc });
            entity.HasIndex(e => e.LabWorkOrderId);
            entity.HasOne<LabWorkOrder>()
                .WithMany()
                .HasForeignKey(e => e.LabWorkOrderId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
