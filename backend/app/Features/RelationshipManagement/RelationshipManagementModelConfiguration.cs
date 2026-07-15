namespace PhaenoPortal.App.Features.RelationshipManagement;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.RelationshipManagement.Domain;

public static class RelationshipManagementModelConfiguration
{
    public static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OrganizationServiceEntitlement>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Service).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(value => value.ConfigurationStatus).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(value => value.EffectiveFrom).IsRequired();
            entity.Property(value => value.Notes).HasMaxLength(2000);
            entity.Property(value => value.EndReason).HasMaxLength(1000);
            entity.Property(value => value.CreatedAt).IsRequired();
            entity.Property(value => value.UpdatedAt).IsRequired();
            entity.Property(value => value.Version).IsRequired().IsConcurrencyToken();
            entity.HasIndex(value => new { value.OrganizationId, value.Service, value.EffectiveFrom });
            entity.HasOne<Organization>()
                .WithMany()
                .HasForeignKey(value => value.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PortalIntegrationRequest>()
                .WithMany()
                .HasForeignKey(value => value.SourceRequestId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PortalIntegrationRequest>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.RequestNumber).HasMaxLength(50).IsRequired();
            entity.Property(value => value.CandidateOrganizationName).HasMaxLength(255).IsRequired();
            entity.Property(value => value.RequestType).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(value => value.Source).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(value => value.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(value => value.RequestedOrganizationKind).HasConversion<string>().HasMaxLength(50);
            entity.Property(value => value.SourceReference).HasMaxLength(255);
            entity.Property(value => value.Summary).HasMaxLength(2000).IsRequired();
            entity.Property(value => value.InternalNotes).HasMaxLength(4000);
            entity.Property(value => value.DecisionReason).HasMaxLength(2000);
            entity.Property(value => value.ApplicationNotes).HasMaxLength(2000);
            entity.Property(value => value.CreatedAt).IsRequired();
            entity.Property(value => value.UpdatedAt).IsRequired();
            entity.Property(value => value.Version).IsRequired().IsConcurrencyToken();
            entity.HasIndex(value => value.RequestNumber).IsUnique();
            entity.HasIndex(value => new { value.Status, value.CreatedAt });
            entity.HasIndex(value => value.OrganizationId);
            entity.HasOne<Organization>()
                .WithMany()
                .HasForeignKey(value => value.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(value => value.RequestedServices)
                .WithOne()
                .HasForeignKey(value => value.PortalIntegrationRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PortalIntegrationRequestService>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Service).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasIndex(value => new { value.PortalIntegrationRequestId, value.Service }).IsUnique();
        });
    }
}
