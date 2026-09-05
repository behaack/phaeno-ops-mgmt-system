using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Website.Entities;

namespace PhaenoPortal.App.Features.Website;

public static class WebsiteModelConfiguration
{
    public static void Configure(ModelBuilder modelBuilder, string schema)
    {
        modelBuilder.Entity<WebNotificationProcessingControl>(entity =>
        {
            entity.ToTable("web_notification_processing_controls", schema, table =>
                table.HasCheckConstraint("ck_web_notification_processing_singleton", "id = '526a3498-feb3-4a94-a5f2-9277c2bc9c97'::uuid"));
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Version).IsConcurrencyToken();
            entity.Property(item => item.Reason).HasMaxLength(500);
            entity.HasOne<PSeq.Operations.Commercial.Accounts.Domain.User>().WithMany()
                .HasForeignKey(item => item.UpdatedByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasData(new WebNotificationProcessingControl());
        });

        modelBuilder.Entity<WebNotificationDelivery>(entity =>
        {
            entity.ToTable("web_notification_deliveries", schema, table =>
                table.HasCheckConstraint("ck_web_notification_target", "(web_contact_id IS NOT NULL AND web_order_id IS NULL AND kind IN ('MailingListAlert', 'TechnicalBrief')) OR (web_order_id IS NOT NULL AND web_contact_id IS NULL AND kind = 'DemoRequestAlert')"));
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Kind).HasConversion<string>().HasMaxLength(40);
            entity.Property(item => item.State).HasConversion<string>().HasMaxLength(30);
            entity.Property(item => item.LastError).HasMaxLength(500);
            entity.Property(item => item.Version).IsConcurrencyToken();
            entity.HasIndex(item => new { item.WebContactId, item.Kind }).IsUnique();
            entity.HasIndex(item => new { item.WebOrderId, item.Kind }).IsUnique();
            entity.HasIndex(item => new { item.State, item.NextAttemptAtUtc });
            entity.HasOne<WebContact>().WithMany().HasForeignKey(item => item.WebContactId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<WebOrder>().WithMany().HasForeignKey(item => item.WebOrderId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<WebNotificationAttempt>(entity =>
        {
            entity.ToTable("web_notification_attempts", schema);
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Outcome).HasMaxLength(30);
            entity.Property(item => item.Error).HasMaxLength(500);
            entity.HasIndex(item => new { item.WebNotificationDeliveryId, item.AttemptNumber }).IsUnique();
            entity.HasOne<WebNotificationDelivery>().WithMany().HasForeignKey(item => item.WebNotificationDeliveryId).OnDelete(DeleteBehavior.Restrict);
        });

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
            entity.Property(item => item.UnsubscribedAtUtc);
            entity.Property(item => item.UnsubscribedByUserId);
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
            entity.Property(item => item.CompletedAtUtc);
            entity.Property(item => item.CompletedByUserId);
        });
    }
}
