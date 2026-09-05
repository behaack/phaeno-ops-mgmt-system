namespace PhaenoPortal.App.Features.FileManagement;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Common.Persistence;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;

public static class FileManagementModelConfiguration
{
    public static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ReleasedDeliverablePreservationHold>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Kind).HasConversion<string>().HasMaxLength(30);
            entity.Property(value => value.Reason).IsRequired().HasMaxLength(2000);
            entity.Property(value => value.ReleaseReason).HasMaxLength(2000);
            entity.Property(value => value.Version).IsConcurrencyToken();
            entity.HasIndex(value => new { value.RetentionSnapshotId, value.ReleasedAtUtc });
            entity.HasOne<ReleasedDeliverableRetentionSnapshot>().WithMany().HasForeignKey(value => value.RetentionSnapshotId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(value => value.PlacedByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(value => value.ReleasedByUserId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<ReleasedDeliverableReissue>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Reason).IsRequired().HasMaxLength(2000);
            entity.HasIndex(value => value.ReplacementSnapshotId).IsUnique();
            entity.HasOne<ReleasedDeliverableRetentionSnapshot>().WithMany().HasForeignKey(value => value.OriginalSnapshotId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ReleasedDeliverableRetentionSnapshot>().WithMany().HasForeignKey(value => value.ReplacementSnapshotId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(value => value.AuthorizedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ReleasedDeliverablePolicyDefault>(entity =>
        {
            entity.HasKey(item => item.Id);
            Text(entity.Property(item => item.ChangeReason), 2000);
            entity.Property(item => item.DeactivationReason).HasMaxLength(2000);
            entity.Property(item => item.Version).IsRequired().IsConcurrencyToken();
            entity.HasIndex(item => item.Revision).IsUnique();
            entity.HasIndex(item => item.IsActive)
                .IsUnique()
                .HasFilter("\"is_active\"");
            entity.HasOne<ReleasedDeliverablePolicyDefault>()
                .WithMany()
                .HasForeignKey(item => item.SupersedesPolicyId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_released_policy_default_supersedes");
            Audit(entity);
        });

        modelBuilder.Entity<OrganizationReleasedDeliverablePolicyOverride>(entity =>
        {
            entity.HasKey(item => item.Id);
            Text(entity.Property(item => item.ChangeReason), 2000);
            entity.Property(item => item.DeactivationReason).HasMaxLength(2000);
            entity.Property(item => item.Version).IsRequired().IsConcurrencyToken();
            entity.HasIndex(item => new { item.OrganizationId, item.Revision }).IsUnique();
            entity.HasIndex(item => new { item.OrganizationId, item.IsActive })
                .IsUnique()
                .HasFilter("\"is_active\"");
            entity.HasOne<Organization>()
                .WithMany()
                .HasForeignKey(item => item.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_org_released_policy_override_organization");
            entity.HasOne<OrganizationReleasedDeliverablePolicyOverride>()
                .WithMany()
                .HasForeignKey(item => item.SupersedesOverrideId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_org_released_policy_override_supersedes");
            Audit(entity);
        });

        modelBuilder.Entity<ReleasedDeliverableRetentionSnapshot>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.Property(item => item.StandardRetentionSource)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(50);
            entity.Property(item => item.UndownloadedWarningLeadSource)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(50);
            entity.Property(item => item.UndownloadedGraceSource)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(50);
            entity.Property(item => item.DeletionOutcome).HasMaxLength(100);
            entity.Property(item => item.WarningCheckpointOutcome).HasMaxLength(50);
            entity.HasOne<OrderNotification>().WithMany().HasForeignKey(item => item.WarningNotificationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<OrderNotification>().WithMany().HasForeignKey(item => item.GraceNotificationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(item => item.WarningAtUtc);

            entity.Property(item => item.Version).IsRequired().IsConcurrencyToken();
            entity.HasIndex(item => item.LabResultReleaseId)
                .IsUnique()
                .HasFilter("\"lab_result_release_id\" IS NOT NULL");
            entity.HasIndex(item => item.AssemblyOutputReleaseId)
                .IsUnique()
                .HasFilter("\"assembly_output_release_id\" IS NOT NULL");
            entity.HasIndex(item => new { item.OrganizationId, item.StandardDeletionAtUtc });
            entity.HasIndex(item => item.PotentialFinalDeletionAtUtc);
            entity.HasOne<Organization>()
                .WithMany()
                .HasForeignKey(item => item.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_released_retention_snapshot_organization");
            entity.HasOne<ReleasedDeliverablePolicyDefault>()
                .WithMany()
                .HasForeignKey(item => item.GlobalPolicyId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_released_retention_snapshot_global_policy");
            entity.HasOne<OrganizationReleasedDeliverablePolicyOverride>()
                .WithMany()
                .HasForeignKey(item => item.OrganizationPolicyOverrideId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_released_retention_snapshot_org_override");
            entity.HasOne<LabResultRelease>()
                .WithMany()
                .HasForeignKey(item => item.LabResultReleaseId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_released_retention_snapshot_lab_result");
            entity.HasOne<AssemblyOutputRelease>()
                .WithMany()
                .HasForeignKey(item => item.AssemblyOutputReleaseId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_released_retention_snapshot_assembly_output");
            entity.ToTable(table => table.HasCheckConstraint(
                "ck_released_retention_snapshot_one_package",
                "(lab_result_release_id IS NOT NULL AND assembly_output_release_id IS NULL) OR (lab_result_release_id IS NULL AND assembly_output_release_id IS NOT NULL)"));
            Audit(entity);
        });
    }

    private static void Text(
        PropertyBuilder<string> property,
        int maximumLength,
        bool required = true)
    {
        if (required)
        {
            property.IsRequired();
        }

        property.HasMaxLength(maximumLength);
    }

    private static void Audit<TEntity>(EntityTypeBuilder<TEntity> entity)
        where TEntity : class, IAudit
    {
        entity.Property(item => item.CreatedAt).IsRequired();
        entity.Property(item => item.CreatedByUserId);
        entity.Property(item => item.UpdatedAt).IsRequired();
        entity.Property(item => item.UpdatedByUserId);
    }
}
