using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Website.Entities;

namespace PhaenoPortal.App.Features.Website;

public static class WebsiteModelConfiguration
{
    public static void Configure(ModelBuilder modelBuilder, string schema)
    {
        modelBuilder.Entity<WebContact>(entity =>
        {
            entity.ToTable("web_contacts", schema);
            entity.HasKey(item => item.Id);
            entity.Property(item => item.FirstName).IsRequired().HasMaxLength(60);
            entity.Property(item => item.LastName).IsRequired().HasMaxLength(60);
            entity.Property(item => item.OrganizationName).IsRequired().HasMaxLength(250);
            entity.Property(item => item.Email).IsRequired().HasMaxLength(256);
            entity.Property(item => item.NormalizedEmail).IsRequired().HasMaxLength(256);
            entity.Property(item => item.CreatedAtUtc)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(item => item.NormalizedEmail).IsUnique();
        });

        modelBuilder.Entity<WebOrder>(entity =>
        {
            entity.ToTable("web_orders", schema);
            entity.HasKey(item => item.Id);
            entity.Property(item => item.FirstName).IsRequired().HasMaxLength(60);
            entity.Property(item => item.LastName).IsRequired().HasMaxLength(60);
            entity.Property(item => item.OrganizationName).IsRequired().HasMaxLength(250);
            entity.Property(item => item.Email).IsRequired().HasMaxLength(256);
            entity.Property(item => item.Description).IsRequired();
        });
    }
}
