namespace PhaenoPortal.App.Features.OrderManagement;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public static class CustomerDeliveryLocationModelConfiguration
{
    public static void Configure(ModelBuilder builder, string commercialSchema)
    {
        builder.Entity<CustomerDeliveryLocation>(entity =>
        {
            entity.ToTable("customer_delivery_locations", commercialSchema);
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Label).HasMaxLength(100).IsRequired();
            entity.Property(item => item.Recipient).HasMaxLength(255).IsRequired();
            entity.Property(item => item.Line1).HasMaxLength(255).IsRequired();
            entity.Property(item => item.Line2).HasMaxLength(255);
            entity.Property(item => item.City).HasMaxLength(255).IsRequired();
            entity.Property(item => item.Region).HasMaxLength(255).IsRequired();
            entity.Property(item => item.PostalCode).HasMaxLength(50).IsRequired();
            entity.Property(item => item.CountryCode).HasMaxLength(2).IsRequired();
            entity.Property(item => item.Phone).HasMaxLength(100);
            entity.Property(item => item.DeliveryInstructions).HasMaxLength(4000);
            entity.Property(item => item.Version).IsConcurrencyToken();
            entity.HasIndex(item => new { item.OrganizationId, item.DepartmentId, item.IsActive });
            entity.HasIndex(item => new { item.OrganizationId, item.DepartmentId })
                .IsUnique().HasFilter("is_active = TRUE AND is_default = TRUE")
                .HasDatabaseName("ux_customer_delivery_location_default");
            entity.HasOne<Organization>().WithMany().HasForeignKey(item => item.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_customer_delivery_location_organization");
            entity.HasOne<OrganizationDepartment>().WithMany().HasForeignKey(item => item.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_customer_delivery_location_department");
            entity.HasOne<User>().WithMany().HasForeignKey(item => item.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_customer_delivery_location_created_by");
            entity.HasOne<User>().WithMany().HasForeignKey(item => item.UpdatedByUserId)
                .OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_customer_delivery_location_updated_by");
        });
    }
}
