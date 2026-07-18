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

        modelBuilder.Entity<LabRoleAssignment>(entity =>
        {
            entity.ToTable("lab_role_assignments", laboratorySchema);
            entity.HasKey(e => e.Id);
            ConfigureAudited(entity);
            entity.Property(e => e.Role).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasIndex(e => new { e.UserId, e.Role }).IsUnique();
        });

        modelBuilder.Entity<LabContainer>(entity =>
        {
            entity.ToTable("lab_containers", laboratorySchema);
            entity.HasKey(e => e.Id);
            ConfigureAudited(entity);
            entity.Property(e => e.Kind).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.Barcode).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Label).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Location).HasMaxLength(255).IsRequired();
            entity.Property(e => e.QuantityUnit).HasMaxLength(50);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.DispositionReason).HasMaxLength(1000);
            entity.HasIndex(e => e.Barcode).IsUnique();
            entity.HasIndex(e => new { e.LabWorkOrderId, e.LabSpecimenId });
            entity.HasOne<LabWorkOrder>().WithMany().HasForeignKey(e => e.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabSpecimen>().WithMany().HasForeignKey(e => e.LabSpecimenId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabContainer>().WithMany().HasForeignKey(e => e.ParentContainerId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabProtocol>(entity =>
        {
            entity.ToTable("lab_protocols", laboratorySchema);
            entity.HasKey(e => e.Id);
            ConfigureAudited(entity);
            entity.Property(e => e.Key).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.HasIndex(e => e.Key).IsUnique();
        });

        modelBuilder.Entity<LabProtocolVersion>(entity =>
        {
            entity.ToTable("lab_protocol_versions", laboratorySchema);
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.DefinitionJson).HasColumnType("jsonb").IsRequired();
            entity.HasIndex(e => new { e.LabProtocolId, e.ProtocolVersion }).IsUnique();
            entity.HasOne<LabProtocol>().WithMany().HasForeignKey(e => e.LabProtocolId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabProtocolExecution>(entity =>
        {
            entity.ToTable("lab_protocol_executions", laboratorySchema);
            entity.HasKey(e => e.Id);
            ConfigureAudited(entity);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.CapturedResultsJson).HasColumnType("jsonb").IsRequired();
            entity.Property(e => e.DeviationNote).HasMaxLength(4000);
            entity.HasIndex(e => new { e.LabWorkOrderId, e.Status });
            entity.HasOne<LabWorkOrder>().WithMany().HasForeignKey(e => e.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabSpecimen>().WithMany().HasForeignKey(e => e.LabSpecimenId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabProtocolVersion>().WithMany().HasForeignKey(e => e.LabProtocolVersionId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabMaterialDefinition>(entity =>
        {
            entity.ToTable("lab_material_definitions", laboratorySchema);
            entity.HasKey(e => e.Id);
            ConfigureAudited(entity);
            entity.Property(e => e.Key).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Kind).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasIndex(e => e.Key).IsUnique();
            entity.HasIndex(e => new { e.Kind, e.IsActive, e.Name });
        });

        modelBuilder.Entity<LabSupplier>(entity =>
        {
            entity.ToTable("lab_suppliers", laboratorySchema);
            entity.HasKey(e => e.Id);
            ConfigureAudited(entity);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.NormalizedName).HasMaxLength(255).IsRequired();
            entity.HasIndex(e => e.NormalizedName).IsUnique();
            entity.HasIndex(e => new { e.IsActive, e.Name });
        });

        modelBuilder.Entity<LabStorageLocation>(entity =>
        {
            entity.ToTable("lab_storage_locations", laboratorySchema);
            entity.HasKey(e => e.Id);
            ConfigureAudited(entity);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.NormalizedName).HasMaxLength(255).IsRequired();
            entity.HasIndex(e => e.NormalizedName).IsUnique();
            entity.HasIndex(e => new { e.IsActive, e.Name });
        });

        modelBuilder.Entity<LabMaterialLot>(entity =>
        {
            entity.ToTable("lab_material_lots", laboratorySchema);
            entity.HasKey(e => e.Id);
            ConfigureAudited(entity);
            entity.Property(e => e.Kind).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.LotNumber).HasMaxLength(100).IsRequired();
            entity.Property(e => e.LegacyComponentsJson).HasColumnName("components_json").HasColumnType("jsonb");
            entity.Property(e => e.ExpirationOrRetestDate).HasColumnType("date");
            entity.Property(e => e.QuantityUnit).HasMaxLength(50).IsRequired();
            entity.Property(e => e.QcDisposition).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.QcResultsJson).HasColumnType("jsonb");
            entity.Property(e => e.QcPerformedOn).HasColumnType("date");
            entity.Property(e => e.QcFailureReason).HasMaxLength(1000);
            entity.HasIndex(e => new { e.MaterialDefinitionId, e.LotNumber }).IsUnique();
            entity.HasIndex(e => new { e.QcDisposition, e.ExpirationOrRetestDate });
            entity.HasOne<LabMaterialDefinition>().WithMany().HasForeignKey(e => e.MaterialDefinitionId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabSupplier>().WithMany().HasForeignKey(e => e.SupplierId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabStorageLocation>().WithMany().HasForeignKey(e => e.StorageLocationId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabPreparedReagentComponent>(entity =>
        {
            entity.ToTable("lab_prepared_reagent_components", laboratorySchema);
            entity.HasKey(e => e.Id);
            entity.Property(e => e.QuantityUnit).HasMaxLength(50).IsRequired();
            entity.HasIndex(e => new { e.PreparedMaterialLotId, e.ComponentMaterialLotId }).IsUnique();
            entity.HasIndex(e => e.ComponentMaterialLotId);
            entity.HasOne<LabMaterialLot>().WithMany().HasForeignKey(e => e.PreparedMaterialLotId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabMaterialLot>().WithMany().HasForeignKey(e => e.ComponentMaterialLotId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabMaterialConsumption>(entity =>
        {
            entity.ToTable("lab_material_consumptions", laboratorySchema);
            entity.HasKey(e => e.Id);
            entity.Property(e => e.QuantityUnit).HasMaxLength(50).IsRequired();
            entity.HasIndex(e => e.LabProtocolExecutionId);
            entity.HasIndex(e => e.LabMaterialLotId);
            entity.HasOne<LabProtocolExecution>().WithMany().HasForeignKey(e => e.LabProtocolExecutionId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabMaterialLot>().WithMany().HasForeignKey(e => e.LabMaterialLotId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabContainer>().WithMany().HasForeignKey(e => e.OutputContainerId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabEquipment>(entity =>
        {
            entity.ToTable("lab_equipment", laboratorySchema);
            entity.HasKey(e => e.Id);
            ConfigureAudited(entity);
            entity.Property(e => e.AssetCode).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.EquipmentType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Location).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasIndex(e => e.AssetCode).IsUnique();
            entity.HasIndex(e => new { e.Status, e.CalibrationDueAtUtc });
        });

        modelBuilder.Entity<LabEquipmentUsage>(entity =>
        {
            entity.ToTable("lab_equipment_usages", laboratorySchema);
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RunReference).HasMaxLength(255);
            entity.HasIndex(e => e.LabProtocolExecutionId);
            entity.HasOne<LabProtocolExecution>().WithMany().HasForeignKey(e => e.LabProtocolExecutionId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabEquipment>().WithMany().HasForeignKey(e => e.LabEquipmentId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabLibrary>(entity =>
        {
            entity.ToTable("lab_libraries", laboratorySchema);
            entity.HasKey(e => e.Id);
            ConfigureAudited(entity);
            entity.Property(e => e.LibraryKey).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.QcResultsJson).HasColumnType("jsonb");
            entity.HasIndex(e => e.LibraryKey).IsUnique();
            entity.HasIndex(e => new { e.LabWorkOrderId, e.LabSpecimenId });
            entity.HasOne<LabWorkOrder>().WithMany().HasForeignKey(e => e.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabSpecimen>().WithMany().HasForeignKey(e => e.LabSpecimenId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabProtocolExecution>().WithMany().HasForeignKey(e => e.PreparationExecutionId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabContainer>().WithMany().HasForeignKey(e => e.SourceContainerId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabContainer>().WithMany().HasForeignKey(e => e.LibraryContainerId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabOperationalBatch>(entity =>
        {
            entity.ToTable("lab_operational_batches", laboratorySchema);
            entity.HasKey(e => e.Id);
            ConfigureAudited(entity);
            entity.Property(e => e.BatchNumber).HasMaxLength(100).IsRequired();
            entity.Property(e => e.BatchType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(4000);
            entity.HasIndex(e => e.BatchNumber).IsUnique();
        });

        modelBuilder.Entity<LabBatchMember>(entity =>
        {
            entity.ToTable("lab_batch_members", laboratorySchema);
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.LabOperationalBatchId, e.LabLibraryId }).IsUnique();
            entity.HasOne<LabOperationalBatch>().WithMany().HasForeignKey(e => e.LabOperationalBatchId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabWorkOrder>().WithMany().HasForeignKey(e => e.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabLibrary>().WithMany().HasForeignKey(e => e.LabLibraryId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabNgsSendout>(entity =>
        {
            entity.ToTable("lab_ngs_sendouts", laboratorySchema);
            entity.HasKey(e => e.Id);
            ConfigureAudited(entity);
            entity.Property(e => e.ProviderName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.ProviderReference).HasMaxLength(255);
            entity.Property(e => e.ManifestJson).HasColumnType("jsonb").IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasIndex(e => e.LabOperationalBatchId).IsUnique();
            entity.HasIndex(e => e.ProviderReference);
            entity.HasOne<LabOperationalBatch>().WithMany().HasForeignKey(e => e.LabOperationalBatchId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabCustodyEvent>(entity =>
        {
            entity.ToTable("lab_custody_events", laboratorySchema);
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EventCode).HasMaxLength(100).IsRequired();
            entity.Property(e => e.LocationOrParty).HasMaxLength(255).IsRequired();
            entity.Property(e => e.DetailsJson).HasColumnType("jsonb").IsRequired();
            entity.HasIndex(e => new { e.LabNgsSendoutId, e.OccurredAtUtc });
            entity.HasOne<LabNgsSendout>().WithMany().HasForeignKey(e => e.LabNgsSendoutId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabContainer>().WithMany().HasForeignKey(e => e.LabContainerId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabException>(entity =>
        {
            entity.ToTable("lab_exceptions", laboratorySchema);
            entity.HasKey(e => e.Id);
            ConfigureAudited(entity);
            entity.Property(e => e.Audience).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.CategoryCode).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.InternalDescription).HasMaxLength(4000).IsRequired();
            entity.Property(e => e.CustomerSafeSummary).HasMaxLength(2000);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.ResolutionNote).HasMaxLength(4000);
            entity.HasIndex(e => new { e.LabWorkOrderId, e.Status });
            entity.HasIndex(e => new { e.Audience, e.Status, e.ResponseDueAtUtc });
            entity.HasOne<LabWorkOrder>().WithMany().HasForeignKey(e => e.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabSpecimen>().WithMany().HasForeignKey(e => e.LabSpecimenId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabProtocolExecution>().WithMany().HasForeignKey(e => e.LabProtocolExecutionId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabOperationsOutboxEvent>(entity =>
        {
            entity.ToTable("lab_operations_outbox_events", laboratorySchema);
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EventType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.PayloadJson).HasColumnType("jsonb").IsRequired();
            entity.Property(e => e.LastError).HasMaxLength(4000);
            entity.HasIndex(e => new { e.PublishedAtUtc, e.OccurredAtUtc });
            entity.HasIndex(e => new { e.AuthorizationId, e.ProjectionVersion }).IsUnique();
            entity.HasOne<LabWorkOrder>().WithMany().HasForeignKey(e => e.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureAudited<TEntity>(EntityTypeBuilder<TEntity> entity)
        where TEntity : LabAuditedEntity
    {
        entity.Property(e => e.Version).IsConcurrencyToken().IsRequired();
    }
}
