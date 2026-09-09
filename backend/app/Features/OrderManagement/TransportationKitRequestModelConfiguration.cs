namespace PhaenoPortal.App.Features.OrderManagement;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;

public static class TransportationKitRequestModelConfiguration
{
    public static void Configure(ModelBuilder builder, string schema)
    {
        builder.Entity<TransportationKitRequest>(entity =>
        {
            entity.ToTable("transportation_kit_requests", schema);
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Version).IsConcurrencyToken();
            entity.Property(item => item.Status).HasConversion<string>().HasMaxLength(40);
            entity.Property(item => item.DeliveryAddressSnapshotJson).HasColumnType("jsonb").IsRequired();
            entity.Property(item => item.CancellationReason).HasMaxLength(2000);
            entity.HasIndex(item => item.LabServiceOrderId).IsUnique().HasFilter("closed_at IS NULL").HasDatabaseName("ix_transportation_kit_request_open_job");
            entity.HasIndex(item => new { item.OrganizationId, item.DepartmentId, item.RequestedAt });
            entity.HasOne<LabServiceOrder>().WithMany().HasForeignKey(item => item.LabServiceOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Organization>().WithMany().HasForeignKey(item => item.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<OrganizationDepartment>().WithMany().HasForeignKey(item => item.DepartmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<CustomerDeliveryLocation>().WithMany().HasForeignKey(item => item.DeliveryLocationId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_transportation_kit_request_location");
            entity.HasOne<User>().WithMany().HasForeignKey(item => item.RequestedByUserId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_transportation_kit_request_requester");
            entity.HasOne<User>().WithMany().HasForeignKey(item => item.CreatedByUserId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_transportation_kit_request_created_by");
            entity.HasOne<User>().WithMany().HasForeignKey(item => item.UpdatedByUserId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_transportation_kit_request_updated_by");
        });
        builder.Entity<TransportationKitRequestLine>(entity =>
        {
            entity.ToTable("transportation_kit_request_lines", schema);
            entity.HasKey(item => item.Id);
            entity.Property(item => item.ContainerSnapshotJson).HasColumnType("jsonb").IsRequired();
            entity.HasIndex(item => new { item.TransportationKitRequestId, item.ContainerDefinitionId }).IsUnique().HasDatabaseName("ix_transportation_kit_request_line_size");
            entity.HasOne<TransportationKitRequest>().WithMany(item => item.Lines).HasForeignKey(item => item.TransportationKitRequestId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_transportation_kit_line_request");
            entity.HasOne<SampleShippingContainerDefinition>().WithMany().HasForeignKey(item => item.ContainerDefinitionId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_transportation_kit_line_container");
        });
        builder.Entity<SampleShippingStockKit>(entity =>
        {
            entity.HasOne<TransportationKitRequestLine>().WithMany().HasForeignKey(item => item.TransportationKitRequestLineId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_shipping_stock_kit_transport_request_line");
            entity.HasOne<CustomerDeliveryLocation>().WithMany().HasForeignKey(item => item.CustomerDeliveryLocationId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_shipping_stock_kit_delivery_location");
            entity.HasOne<User>().WithMany().HasForeignKey(item => item.CustomerReceivedByUserId).OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_shipping_stock_kit_received_by");
        });
    }
}
