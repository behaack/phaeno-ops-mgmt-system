namespace PhaenoPortal.App.Features.FileManagement;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Common.Persistence;
using PSeq.Operations.Commercial.FileManagement.Domain;

public static class FileManagementModelConfiguration
{
    public static void Configure(ModelBuilder modelBuilder)
    {
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
