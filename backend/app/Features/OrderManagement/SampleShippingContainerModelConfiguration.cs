namespace PhaenoPortal.App.Features.OrderManagement;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Common.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public static class SampleShippingContainerModelConfiguration
{
    public static void Configure(ModelBuilder builder, string commercialSchema)
    {
        builder.Entity<SampleShippingContainerType>(entity =>
        {
            entity.ToTable("sample_shipping_container_types", commercialSchema);
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Sku).HasMaxLength(100).IsRequired();
            entity.Property(item => item.NormalizedSku).HasMaxLength(100).IsRequired();
            entity.HasIndex(item => item.NormalizedSku).IsUnique();
            Audit(entity);
        });
        builder.Entity<SampleShippingContainerDefinition>(entity =>
        {
            entity.ToTable("sample_shipping_container_definitions", commercialSchema);
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.ContainerTypeId, item.Revision }).IsUnique();
            entity.HasIndex(item => item.SupersedesDefinitionId).IsUnique();
            entity.HasIndex(item => new { item.IsActive, item.EffectiveFrom, item.EffectiveTo });
            entity.Property(item => item.CommonName).HasMaxLength(255).IsRequired();
            entity.Property(item => item.SupplierName).HasMaxLength(255);
            entity.Property(item => item.SupplierProductNumber).HasMaxLength(100);
            entity.Property(item => item.PackingInstructions).HasMaxLength(8000);
            Audit(entity);
            entity.HasOne(item => item.ContainerType).WithMany(item => item.Definitions)
                .HasForeignKey(item => item.ContainerTypeId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_shipping_container_revision_type");
            entity.HasOne<SampleShippingContainerDefinition>().WithMany()
                .HasForeignKey(item => item.SupersedesDefinitionId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_shipping_container_revision_predecessor");
        });
        builder.Entity<SampleShippingContainerCompatibility>(entity =>
        {
            entity.ToTable("sample_shipping_container_compatibilities", commercialSchema);
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.ContainerDefinitionId, item.SampleTypeDefinitionId, item.InstructionRuleId }).IsUnique();
            entity.HasOne<SampleShippingContainerDefinition>().WithMany(item => item.Compatibilities)
                .HasForeignKey(item => item.ContainerDefinitionId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_shipping_container_compat_revision");
            entity.HasOne<SampleTypeDefinition>().WithMany().HasForeignKey(item => item.SampleTypeDefinitionId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_shipping_container_compat_sample_type");
            entity.HasOne<SampleShippingInstructionRule>().WithMany().HasForeignKey(item => item.InstructionRuleId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_shipping_container_compat_rule");
        });
        builder.Entity<SampleShipment>(entity =>
        {
            entity.Property(item => item.ContainerSnapshotJson).HasColumnType("jsonb");
            entity.Property(item => item.IsPackingPool).HasDefaultValue(false);
            entity.HasOne<SampleShippingContainerDefinition>().WithMany().HasForeignKey(item => item.ContainerDefinitionId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_sample_shipment_container_revision");
            entity.HasOne<CustomerDeliveryLocation>().WithMany().HasForeignKey(item => item.DepartureDeliveryLocationId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_sample_shipment_departure_location");
        });
        builder.Entity<SampleShippingStockKit>(entity =>
        {
            entity.ToTable("sample_shipping_stock_kits", commercialSchema);
            entity.HasKey(item => item.Id);
            entity.Property(item => item.KitNumber).HasMaxLength(100).IsRequired();
            entity.Property(item => item.ContainerSnapshotJson).HasColumnType("jsonb").IsRequired();
            entity.Property(item => item.TubeSupplierName).HasMaxLength(255).IsRequired();
            entity.Property(item => item.TubeProductNumber).HasMaxLength(100).IsRequired();
            entity.Property(item => item.TubeLotNumber).HasMaxLength(100);
            entity.Property(item => item.ShipperSupplierName).HasMaxLength(255).IsRequired();
            entity.Property(item => item.ShipperProductNumber).HasMaxLength(100).IsRequired();
            entity.Property(item => item.OutboundCarrier).HasMaxLength(255);
            entity.Property(item => item.OutboundTrackingNumber).HasMaxLength(255);
            entity.Property(item => item.AuthorizationSource).HasConversion<string>().HasMaxLength(50);
            entity.HasIndex(item => item.KitNumber).IsUnique();
            entity.HasIndex(item => item.BoundSampleShipmentId).IsUnique();
            entity.HasIndex(item => item.ReservedSampleShipmentId).IsUnique();
            entity.HasIndex(item => new { item.OrganizationId, item.DepartmentId, item.CustomerDeliveryLocationId });
            entity.HasOne<SampleShipment>().WithMany().HasForeignKey(item => item.ReservedSampleShipmentId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_shipping_stock_reserved_shipment");
            entity.HasOne<User>().WithMany().HasForeignKey(item => item.ReservedByUserId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_shipping_stock_reserved_by");
            entity.HasIndex(item => new { item.OrganizationId, item.DepartmentId, item.AuthorizationSource, item.AuthorizationSourceId });
            entity.HasOne<SampleShippingContainerDefinition>().WithMany().HasForeignKey(item => item.ContainerDefinitionId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_shipping_stock_kit_container_revision");
            entity.HasOne<SampleShipment>().WithMany().HasForeignKey(item => item.BoundSampleShipmentId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_shipping_stock_kit_bound_shipment");
            entity.HasOne<Organization>().WithMany().HasForeignKey(item => item.OrganizationId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_shipping_stock_kit_organization");
            entity.HasOne<OrganizationDepartment>().WithMany().HasForeignKey(item => item.DepartmentId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_shipping_stock_kit_department");
            Audit(entity);
        });
        builder.Entity<SampleShippingStockTube>(entity =>
        {
            entity.ToTable("sample_shipping_stock_tubes", commercialSchema);
            entity.HasKey(item => item.Id);
            entity.Property(item => item.SupplierBarcode).HasMaxLength(100).IsRequired();
            entity.HasIndex(item => item.SupplierBarcode).IsUnique();
            entity.HasOne<SampleShippingStockKit>().WithMany(item => item.Tubes).HasForeignKey(item => item.SampleShippingStockKitId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_shipping_stock_tube_kit");
        });
    }

    private static void Audit<T>(EntityTypeBuilder<T> entity) where T : class, IAudit, IConcurrency
    {
        entity.Property(item => item.Version).IsConcurrencyToken();
        var name = typeof(T) == typeof(SampleShippingContainerType) ? "container_type"
            : typeof(T) == typeof(SampleShippingContainerDefinition) ? "container_revision" : "stock_kit";
        entity.HasOne<User>().WithMany().HasForeignKey(item => item.CreatedByUserId).OnDelete(DeleteBehavior.Restrict).HasConstraintName($"fk_shipping_{name}_created_by");
        entity.HasOne<User>().WithMany().HasForeignKey(item => item.UpdatedByUserId).OnDelete(DeleteBehavior.Restrict).HasConstraintName($"fk_shipping_{name}_updated_by");
    }
}
