namespace PhaenoPortal.App.Features.OrderManagement;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PSeq.Operations.Commercial.Common.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;

public static class OrderManagementModelConfiguration
{
    public static void Configure(ModelBuilder modelBuilder, string commercialSchema)
    {
        ConfigureCatalog(modelBuilder);
        ConfigureCommercial(modelBuilder);
        ConfigureAccountsReceivable(modelBuilder, commercialSchema);
        ConfigureCommercialLabServiceRecords(modelBuilder, commercialSchema);
        ConfigurePSeqResultDelivery(modelBuilder, commercialSchema);
        ConfigureSampleShipping(modelBuilder);
        ConfigureReagents(modelBuilder);
        ConfigureAssembly(modelBuilder);
        ConfigureWorkflowSupport(modelBuilder);
    }

    private static void ConfigureSampleShipping(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SampleShippingDestination>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.Code), 50);
            Text(entity.Property(e => e.Name), 255);
            Text(entity.Property(e => e.RecipientName), 255);
            Text(entity.Property(e => e.OrganizationName), 255);
            Text(entity.Property(e => e.AddressLine1), 255);
            Text(entity.Property(e => e.AddressLine2), 255, false);
            Text(entity.Property(e => e.City), 150);
            Text(entity.Property(e => e.StateOrProvince), 150);
            Text(entity.Property(e => e.PostalCode), 50);
            Text(entity.Property(e => e.CountryCode), 2);
            Text(entity.Property(e => e.ReceivingPhone), 50, false);
            Text(entity.Property(e => e.ReceivingEmail), 255, false);
            Text(entity.Property(e => e.ReceivingHours), 1000);
            Text(entity.Property(e => e.TimeZoneId), 100);
            Text(entity.Property(e => e.ClosureInstructions), 2000, false);
            Text(entity.Property(e => e.DeliveryInstructions), 4000);
            Text(entity.Property(e => e.CarrierRestrictions), 2000, false);
            entity.HasIndex(e => new { e.DefinitionKey, e.Revision }).IsUnique();
            entity.HasIndex(e => new { e.Code, e.Revision }).IsUnique();
            entity.HasIndex(e => new { e.IsActive, e.EffectiveFrom, e.EffectiveTo });
            entity.HasOne<SampleShippingDestination>()
                .WithMany()
                .HasForeignKey(e => e.SupersedesDestinationId)
                .OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<SampleTypeDefinition>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.Code), 50);
            Text(entity.Property(e => e.Name), 255);
            Text(entity.Property(e => e.Description), 2000);
            Text(entity.Property(e => e.MaterialClass), 255);
            Quantity(entity.Property(e => e.MinimumQuantity));
            Quantity(entity.Property(e => e.MaximumQuantity));
            Text(entity.Property(e => e.QuantityUnit), 100);
            Text(entity.Property(e => e.PrimaryContainerRequirements), 2000);
            Text(entity.Property(e => e.TemperatureRequirements), 2000);
            Text(entity.Property(e => e.StabilizerRequirements), 2000, false);
            Text(entity.Property(e => e.PackagingInstructions), 4000);
            Text(entity.Property(e => e.LabelingInstructions), 4000);
            Text(entity.Property(e => e.ProhibitedIdentifiers), 2000);
            Text(entity.Property(e => e.SafetyRequirements), 2000);
            Text(entity.Property(e => e.CarrierRestrictions), 2000, false);
            entity.HasIndex(e => new { e.DefinitionKey, e.Revision }).IsUnique();
            entity.HasIndex(e => new { e.Code, e.Revision }).IsUnique();
            entity.HasIndex(e => new { e.IsActive, e.EffectiveFrom, e.EffectiveTo });
            entity.HasOne<SampleTypeDefinition>()
                .WithMany()
                .HasForeignKey(e => e.SupersedesSampleTypeId)
                .OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<SampleShippingInstructionRule>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.CompatibilityGroup), 50);
            Text(entity.Property(e => e.PackingInstructions), 4000);
            Text(entity.Property(e => e.TemperatureInstructions), 4000);
            Text(entity.Property(e => e.CarrierInstructions), 4000);
            Text(entity.Property(e => e.DispatchInstructions), 4000);
            Text(entity.Property(e => e.DeliveryInstructions), 4000);
            Text(entity.Property(e => e.RequiredDocuments), 4000);
            Text(entity.Property(e => e.ExceptionInstructions), 4000);
            Text(entity.Property(e => e.InternationalCustomsInstructions), 4000, false);
            entity.HasIndex(e => new { e.DefinitionKey, e.Revision }).IsUnique();
            entity.HasIndex(e => new { e.DestinationId, e.SampleTypeDefinitionId, e.EffectiveFrom });
            entity.HasIndex(e => new { e.IsActive, e.EffectiveFrom, e.EffectiveTo });
            entity.HasOne<SampleShippingDestination>()
                .WithMany()
                .HasForeignKey(e => e.DestinationId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<SampleTypeDefinition>()
                .WithMany()
                .HasForeignKey(e => e.SampleTypeDefinitionId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<SampleShippingInstructionRule>()
                .WithMany()
                .HasForeignKey(e => e.SupersedesInstructionRuleId)
                .OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<SampleShipment>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.ShipmentNumber), 100);
            EnumText(entity.Property(e => e.AuthorizationSource));
            Text(entity.Property(e => e.AuthorizationReference), 100);
            Text(entity.Property(e => e.AuthorizationName), 255);
            EnumText(entity.Property(e => e.Status));
            Text(entity.Property(e => e.Carrier), 255, false);
            Text(entity.Property(e => e.TrackingNumber), 255, false);
            entity.HasIndex(e => e.ShipmentNumber).IsUnique();
            entity.HasIndex(e => new { e.AuthorizationSource, e.AuthorizationSourceId });
            entity.HasIndex(e => e.LabWorkOrderId);
            entity.HasIndex(e => new { e.OrganizationId, e.DepartmentId, e.Status });
            entity.HasOne<Organization>()
                .WithMany()
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<OrganizationDepartment>()
                .WithMany()
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<SampleShippingDestination>()
                .WithMany()
                .HasForeignKey(e => e.DestinationId)
                .OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<SampleReturnKit>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.KitNumber), 100);
            EnumText(entity.Property(e => e.AuthorizationSource));
            Text(entity.Property(e => e.TubeSupplierName), 255);
            Text(entity.Property(e => e.TubeProductNumber), 100);
            Text(entity.Property(e => e.TubeLotNumber), 100, false);
            Text(entity.Property(e => e.ShipperSupplierName), 255);
            Text(entity.Property(e => e.ShipperProductNumber), 100);
            EnumText(entity.Property(e => e.Status));
            Text(entity.Property(e => e.OutboundCarrier), 255, false);
            Text(entity.Property(e => e.OutboundTrackingNumber), 255, false);
            entity.HasIndex(e => e.KitNumber).IsUnique();
            entity.HasIndex(e => e.SampleShipmentId).IsUnique();
            entity.HasIndex(e => new { e.OrganizationId, e.Status });
            entity.HasIndex(e => new { e.AuthorizationSource, e.AuthorizationSourceId });
            entity.HasOne<SampleShipment>()
                .WithOne(e => e.ReturnKit)
                .HasForeignKey<SampleReturnKit>(e => e.SampleShipmentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Organization>()
                .WithMany()
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<RegisteredSampleTube>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.SupplierBarcode), 100);
            EnumText(entity.Property(e => e.Status));
            entity.HasIndex(e => e.SupplierBarcode).IsUnique();
            entity.HasIndex(e => new { e.SampleReturnKitId, e.Status });
            entity.HasOne<SampleReturnKit>()
                .WithMany(e => e.Tubes)
                .HasForeignKey(e => e.SampleReturnKitId)
                .OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<SampleShipmentItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.CustomerSampleId), 100);
            Text(entity.Property(e => e.SampleName), 255);
            Quantity(entity.Property(e => e.Quantity));
            Text(entity.Property(e => e.QuantityUnit), 100);
            entity.HasIndex(e => new { e.SampleShipmentId, e.SubmittedSpecimenId }).IsUnique();
            entity.HasIndex(e => new { e.SampleShipmentId, e.CustomerSampleId }).IsUnique();
            entity.HasIndex(e => e.SampleTypeDefinitionId);
            entity.HasIndex(e => e.RegisteredSampleTubeId).IsUnique();
            entity.HasOne<SampleShipment>()
                .WithMany(e => e.Items)
                .HasForeignKey(e => e.SampleShipmentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<SampleTypeDefinition>()
                .WithMany()
                .HasForeignKey(e => e.SampleTypeDefinitionId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<RegisteredSampleTube>()
                .WithMany()
                .HasForeignKey(e => e.RegisteredSampleTubeId)
                .OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<SampleShipmentTubeSlot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.SampleShipmentItemId, e.Ordinal }).IsUnique();
            entity.HasIndex(e => e.RegisteredSampleTubeId).IsUnique();
            entity.HasOne<SampleShipmentItem>()
                .WithMany(e => e.TubeSlots)
                .HasForeignKey(e => e.SampleShipmentItemId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<RegisteredSampleTube>()
                .WithMany()
                .HasForeignKey(e => e.RegisteredSampleTubeId)
                .OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<SampleTubeAssignmentEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.CustomerSampleId), 100);
            Text(entity.Property(e => e.SupplierBarcode), 100);
            EnumText(entity.Property(e => e.Action));
            Text(entity.Property(e => e.Reason), 1000, false);
            entity.HasIndex(e => new { e.SampleShipmentId, e.OccurredAt });
            entity.HasIndex(e => new { e.RegisteredSampleTubeId, e.OccurredAt });
            entity.HasOne<SampleShipment>()
                .WithMany()
                .HasForeignKey(e => e.SampleShipmentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<SampleShipmentItem>()
                .WithMany()
                .HasForeignKey(e => e.SampleShipmentItemId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<SampleShipmentTubeSlot>()
                .WithMany()
                .HasForeignKey(e => e.SampleShipmentTubeSlotId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<RegisteredSampleTube>()
                .WithMany()
                .HasForeignKey(e => e.RegisteredSampleTubeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SampleShippingPacketRevision>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.PacketNumber), 100);
            Text(entity.Property(e => e.Barcode), 20);
            Json(entity.Property(e => e.DestinationSnapshotJson));
            Json(entity.Property(e => e.InstructionSnapshotJson));
            Json(entity.Property(e => e.ManifestSnapshotJson));
            Text(entity.Property(e => e.VoidReason), 2000, false);
            entity.Ignore(e => e.IsVoided);
            entity.HasIndex(e => e.PacketNumber).IsUnique();
            entity.HasIndex(e => e.Barcode).IsUnique();
            entity.HasIndex(e => new { e.SampleShipmentId, e.Revision }).IsUnique();
            entity.HasOne<SampleShipment>()
                .WithMany(e => e.PacketRevisions)
                .HasForeignKey(e => e.SampleShipmentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<SampleShippingPacketRevision>()
                .WithMany()
                .HasForeignKey(e => e.ReplacedByPacketRevisionId)
                .OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });
    }

    private static void ConfigureCatalog(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<QboCatalogItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.ExternalItemId), 255);
            Text(entity.Property(e => e.Name), 255);
            Text(entity.Property(e => e.Description), 2000);
            Text(entity.Property(e => e.SalesUnit), 100);
            Money(entity.Property(e => e.BasePrice));
            Text(entity.Property(e => e.Currency), 3);
            entity.HasIndex(e => e.ExternalItemId).IsUnique();
            entity.HasIndex(e => new { e.IsActive, e.Name });
            Audit(entity);
        });

        modelBuilder.Entity<AnalysisDefinition>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.Name), 255);
            Text(entity.Property(e => e.Description), 2000);
            Text(entity.Property(e => e.SubmissionInstructions), 4000);
            Json(entity.Property(e => e.RequiredIntakeFieldsJson));
            Json(entity.Property(e => e.ResultContractJson));
            entity.HasIndex(e => e.QboCatalogItemId);
            entity.HasIndex(e => new { e.IsActive, e.Name });
            entity.HasOne<QboCatalogItem>().WithMany().HasForeignKey(e => e.QboCatalogItemId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<PartnerReagentOffering>(entity =>
        {
            entity.HasKey(e => e.Id);
            Money(entity.Property(e => e.NegotiatedUnitPrice));
            Text(entity.Property(e => e.Currency), 3);
            Text(entity.Property(e => e.SellingUnit), 100);
            Quantity(entity.Property(e => e.OrderIncrement));
            Quantity(entity.Property(e => e.MinimumQuantity));
            Quantity(entity.Property(e => e.MaximumQuantity));
            Json(entity.Property(e => e.ShippingRestrictionsJson));
            entity.HasIndex(e => new { e.PartnerOrganizationId, e.QboCatalogItemId, e.EffectiveFrom });
            entity.HasIndex(e => new { e.PartnerOrganizationId, e.IsActive });
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.PartnerOrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<QboCatalogItem>().WithMany().HasForeignKey(e => e.QboCatalogItemId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<AssemblyProfile>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.Name), 255);
            Text(entity.Property(e => e.Description), 2000);
            Text(entity.Property(e => e.Instructions), 4000);
            Json(entity.Property(e => e.MetadataSchemaJson));
            Json(entity.Property(e => e.AllowedFileKindsJson));
            Json(entity.Property(e => e.OutputContractJson));
            entity.HasIndex(e => new { e.Name, e.ProfileVersion }).IsUnique();
            entity.HasIndex(e => new { e.IsActive, e.Name });
            entity.HasOne<QboCatalogItem>().WithMany().HasForeignKey(e => e.QboCatalogItemId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<OrganizationCommercialProfile>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.QboCustomerId), 255, required: false);
            Text(entity.Property(e => e.BillingContactName), 255, required: false);
            Text(entity.Property(e => e.BillingContactEmail), 255, required: false);
            Json(entity.Property(e => e.BillingAddressJson), required: false);
            EnumText(entity.Property(e => e.TaxDecision), required: false);
            entity.Property(e => e.ApprovedTaxRate).HasPrecision(12, 6);
            Text(entity.Property(e => e.TaxExemptionEvidence), 4000, required: false);
            Text(entity.Property(e => e.FinanceApprovalNotes), 4000, required: false);
            entity.HasIndex(e => e.OrganizationId).IsUnique();
            entity.HasIndex(e => e.QboCustomerId).IsUnique().HasFilter("\"qbo_customer_id\" IS NOT NULL");
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<OrderSystemConfiguration>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.SampleSubmissionInstructions), 8000);
            Json(entity.Property(e => e.ShippingConfigurationJson));
            Json(entity.Property(e => e.SampleConfigurationJson));
            Json(entity.Property(e => e.ResultDestinationConfigurationJson));
            Audit(entity);
        });
    }

    private static void ConfigureCommercial(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CommercialDocumentLink>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.WorkflowType), 100);
            EnumText(entity.Property(e => e.Kind));
            Text(entity.Property(e => e.ExternalDocumentId), 255, false);
            Text(entity.Property(e => e.DocumentNumber), 255, false);
            Text(entity.Property(e => e.DocumentUrl), 2000, false);
            EnumText(entity.Property(e => e.SyncStatus));
            Money(entity.Property(e => e.Total));
            Money(entity.Property(e => e.Balance));
            Text(entity.Property(e => e.Currency), 3);
            Text(entity.Property(e => e.LastError), 2000, false);
            entity.HasIndex(e => new { e.WorkflowType, e.WorkflowId, e.Kind });
            entity.HasIndex(e => e.ExternalDocumentId);
            entity.HasIndex(e => e.SyncStatus);
            Audit(entity);
        });

        modelBuilder.Entity<OrderOutboxMessage>(entity =>
        {
            entity.HasKey(e => e.Id);
            EnumText(entity.Property(e => e.Operation));
            Text(entity.Property(e => e.WorkflowType), 100);
            Text(entity.Property(e => e.IdempotencyKey), 255);
            Json(entity.Property(e => e.PayloadJson));
            EnumText(entity.Property(e => e.Status));
            Text(entity.Property(e => e.LastError), 2000, false);
            entity.HasIndex(e => new { e.WorkflowType, e.WorkflowId, e.Operation, e.IdempotencyKey }).IsUnique();
            entity.HasIndex(e => new { e.Status, e.NextAttemptAt });
            Audit(entity);
        });

        modelBuilder.Entity<OrderIdempotencyRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.Scope), 200);
            Text(entity.Property(e => e.IdempotencyKey), 255);
            Text(entity.Property(e => e.RequestHash), 64);
            Json(entity.Property(e => e.ResponseJson));
            entity.HasIndex(e => new { e.ActorUserId, e.Scope, e.IdempotencyKey }).IsUnique();
            entity.HasIndex(e => e.CreatedAt);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.ActorUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ManagedOperationalFile>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.WorkflowType), 100);
            EnumText(entity.Property(e => e.Purpose));
            Text(entity.Property(e => e.FileName), 512);
            Text(entity.Property(e => e.FileKind), 100);
            Text(entity.Property(e => e.ContentType), 255);
            Text(entity.Property(e => e.Sha256), 64);
            Text(entity.Property(e => e.StorageKey), 1000);
            EnumText(entity.Property(e => e.ScanStatus));
            Text(entity.Property(e => e.ScanMessage), 2000, false);
            EnumText(entity.Property(e => e.ReleaseStatus));
            entity.HasIndex(e => e.StorageKey).IsUnique();
            entity.HasIndex(e => new { e.OrganizationId, e.WorkflowType, e.WorkflowId });
            entity.HasIndex(e => e.ParentRecordId);
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<OperationalFileDownload>(entity =>
        {
            entity.HasKey(e => e.Id);
            EnumText(entity.Property(e => e.ReleasedPackageType));
            EnumText(entity.Property(e => e.Scope));
            EnumText(entity.Property(e => e.Outcome));
            Text(entity.Property(e => e.TerminalReasonCode), 100, false);
            Text(entity.Property(e => e.RemoteAddress), 100, false);
            Text(entity.Property(e => e.UserAgent), 1000, false);
            entity.Property(e => e.Version).IsRequired().IsConcurrencyToken();
            entity.HasIndex(e => new { e.OrganizationId, e.StartedAtUtc });
            entity.HasIndex(e => new { e.OrganizationId, e.ReleasedPackageType, e.ReleasedPackageId });
            entity.HasIndex(e => new { e.Outcome, e.LeaseExpiresAtUtc });
            entity.HasIndex(e => e.TransferId);
            entity.HasIndex(e => e.ManagedOperationalFileId);
            entity.HasOne<ManagedOperationalFile>().WithMany().HasForeignKey(e => e.ManagedOperationalFileId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<OrderNotification>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.WorkflowType), 100);
            Text(entity.Property(e => e.EventType), 100);
            Text(entity.Property(e => e.Subject), 500);
            Text(entity.Property(e => e.Body), 4000);
            EnumText(entity.Property(e => e.Status));
            Text(entity.Property(e => e.LastError), 2000, false);
            entity.HasIndex(e => new { e.Status, e.NextAttemptAt });
            entity.HasIndex(e => new { e.OrganizationId, e.CreatedAt });
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<OrganizationDepartment>().WithMany().HasForeignKey(e => e.DepartmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.RecipientUserId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });
    }

    private static void ConfigureAccountsReceivable(ModelBuilder modelBuilder, string commercialSchema)
    {
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable("invoices", commercialSchema);
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.InvoiceNumber), 100);
            EnumText(entity.Property(e => e.Status));
            Text(entity.Property(e => e.Currency), 3);
            Json(entity.Property(e => e.BillingContactSnapshotJson));
            Json(entity.Property(e => e.BillingAddressSnapshotJson));
            Json(entity.Property(e => e.TaxDecisionSnapshotJson));
            Money(entity.Property(e => e.Subtotal));
            Money(entity.Property(e => e.TaxTotal));
            Money(entity.Property(e => e.AdjustmentTotal));
            Money(entity.Property(e => e.Total));
            Money(entity.Property(e => e.AppliedTotal));
            Money(entity.Property(e => e.Balance));
            Text(entity.Property(e => e.PdfStorageKey), 1000);
            Text(entity.Property(e => e.PdfSha256), 64);
            Text(entity.Property(e => e.VoidReason), 2000, false);
            entity.HasIndex(e => e.InvoiceNumber).IsUnique();
            entity.HasIndex(e => e.LabServiceOrderId).IsUnique();
            entity.HasIndex(e => e.AcceptedQuoteId).IsUnique();
            entity.HasIndex(e => new { e.OrganizationId, e.Status, e.DueOn });
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabServiceOrder>().WithMany().HasForeignKey(e => e.LabServiceOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabServiceQuote>().WithMany().HasForeignKey(e => e.AcceptedQuoteId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<InvoiceLine>(entity =>
        {
            entity.ToTable("invoice_lines", commercialSchema);
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.Description), 1000);
            Quantity(entity.Property(e => e.Quantity));
            Money(entity.Property(e => e.UnitPrice));
            entity.Property(e => e.TaxRate).HasPrecision(12, 6);
            Money(entity.Property(e => e.Subtotal));
            Money(entity.Property(e => e.TaxAmount));
            Money(entity.Property(e => e.Total));
            entity.HasIndex(e => new { e.InvoiceId, e.LineNumber }).IsUnique();
            entity.HasOne<Invoice>().WithMany().HasForeignKey(e => e.InvoiceId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<InvoiceAdjustment>(entity =>
        {
            entity.ToTable("invoice_adjustments", commercialSchema);
            entity.HasKey(e => e.Id);
            EnumText(entity.Property(e => e.Kind));
            Money(entity.Property(e => e.Amount));
            Text(entity.Property(e => e.Reason), 2000);
            entity.HasIndex(e => new { e.InvoiceId, e.RecordedAtUtc });
            entity.HasOne<Invoice>().WithMany().HasForeignKey(e => e.InvoiceId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<PaymentReceipt>(entity =>
        {
            entity.ToTable("payment_receipts", commercialSchema);
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.ReceiptNumber), 100);
            Text(entity.Property(e => e.Source), 100);
            Text(entity.Property(e => e.ExternalId), 255);
            Text(entity.Property(e => e.Payer), 500);
            Money(entity.Property(e => e.Amount));
            Text(entity.Property(e => e.Currency), 3);
            Text(entity.Property(e => e.Method), 100);
            Text(entity.Property(e => e.BankReference), 255);
            Text(entity.Property(e => e.EvidenceStorageKey), 1000, false);
            Text(entity.Property(e => e.Memo), 2000, false);
            Money(entity.Property(e => e.AppliedAmount));
            Money(entity.Property(e => e.UnappliedAmount));
            EnumText(entity.Property(e => e.Status));
            Text(entity.Property(e => e.ReversalReason), 2000, false);
            entity.HasIndex(e => e.ReceiptNumber).IsUnique();
            entity.HasIndex(e => new { e.Source, e.ExternalId }).IsUnique();
            entity.HasIndex(e => new { e.OrganizationId, e.Status, e.ReceivedOn });
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<PaymentAllocation>(entity =>
        {
            entity.ToTable("payment_allocations", commercialSchema);
            entity.HasKey(e => e.Id);
            Money(entity.Property(e => e.Amount));
            Text(entity.Property(e => e.ReversalReason), 2000, false);
            entity.HasIndex(e => new { e.PaymentReceiptId, e.InvoiceId, e.AllocatedAtUtc });
            entity.HasOne<PaymentReceipt>().WithMany().HasForeignKey(e => e.PaymentReceiptId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Invoice>().WithMany().HasForeignKey(e => e.InvoiceId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<PaymentImportBatch>(entity =>
        {
            entity.ToTable("payment_import_batches", commercialSchema);
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.Source), 100);
            Text(entity.Property(e => e.PayloadSha256), 64);
            Json(entity.Property(e => e.PreviewJson));
            Money(entity.Property(e => e.TotalAmount));
            EnumText(entity.Property(e => e.Status));
            entity.HasIndex(e => new { e.Source, e.PayloadSha256 }).IsUnique();
            entity.HasIndex(e => new { e.Status, e.PreviewedAtUtc });
            Audit(entity);
        });

        modelBuilder.Entity<ReconciliationBatch>(entity =>
        {
            entity.ToTable("reconciliation_batches", commercialSchema);
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.BatchNumber), 100);
            Money(entity.Property(e => e.LedgerReceiptTotal));
            Money(entity.Property(e => e.BankTotal));
            Money(entity.Property(e => e.Difference));
            EnumText(entity.Property(e => e.Status));
            Json(entity.Property(e => e.CloseoutReportJson), false);
            entity.HasIndex(e => e.BatchNumber).IsUnique();
            entity.HasIndex(e => new { e.Status, e.PeriodEnd });
            Audit(entity);
        });

        modelBuilder.Entity<ReconciliationBatchItem>(entity =>
        {
            entity.ToTable("reconciliation_batch_items", commercialSchema);
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.SourceType), 100);
            Money(entity.Property(e => e.Amount));
            entity.HasIndex(e => new { e.ReconciliationBatchId, e.SourceType, e.SourceId }).IsUnique();
            entity.HasOne<ReconciliationBatch>().WithMany().HasForeignKey(e => e.ReconciliationBatchId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PaymentProcessorExternalLink>(entity =>
        {
            entity.ToTable("payment_processor_external_links", commercialSchema);
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.ProviderKey), 100);
            Text(entity.Property(e => e.LocalEntityType), 100);
            Text(entity.Property(e => e.ExternalId), 255);
            Json(entity.Property(e => e.MetadataJson));
            entity.HasIndex(e => new { e.ProviderKey, e.LocalEntityType, e.LocalEntityId }).IsUnique();
            entity.HasIndex(e => new { e.ProviderKey, e.ExternalId }).IsUnique();
            Audit(entity);
        });

        modelBuilder.Entity<OperationalAttentionItem>(entity =>
        {
            entity.ToTable("operational_attention_items", commercialSchema);
            entity.HasKey(e => e.Id);
            EnumText(entity.Property(e => e.Category));
            Text(entity.Property(e => e.SourceType), 100);
            EnumText(entity.Property(e => e.Status));
            Text(entity.Property(e => e.Summary), 1000);
            Text(entity.Property(e => e.NextAction), 2000);
            Text(entity.Property(e => e.Resolution), 2000, false);
            entity.HasIndex(e => new { e.Category, e.SourceType, e.SourceId }).IsUnique();
            entity.HasIndex(e => new { e.Status, e.OwnerUserId, e.CreatedAt });
            entity.HasIndex(e => e.OrganizationId);
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });
    }

    private static void ConfigurePSeqResultDelivery(ModelBuilder modelBuilder, string commercialSchema)
    {
        modelBuilder.Entity<ResultOutputPackage>(entity =>
        {
            entity.ToTable("result_output_packages", commercialSchema);
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.PipelineProviderKey), 100);
            Text(entity.Property(e => e.PipelineSubmissionId), 255);
            Text(entity.Property(e => e.IdempotencyKey), 255);
            Json(entity.Property(e => e.ManifestJson));
            Text(entity.Property(e => e.ManifestSha256), 64);
            EnumText(entity.Property(e => e.State));
            Text(entity.Property(e => e.FailureCode), 100, false);
            Text(entity.Property(e => e.FailureDetail), 2000, false);
            Text(entity.Property(e => e.WithdrawalReason), 2000, false);
            entity.HasIndex(e => e.IdempotencyKey).IsUnique();
            entity.HasIndex(e => new { e.PipelineProviderKey, e.PipelineSubmissionId }).IsUnique();
            entity.HasIndex(e => new { e.LabSampleId, e.PackageVersion }).IsUnique();
            entity.HasIndex(e => new { e.OrganizationId, e.State, e.CreatedAt });
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabServiceOrder>().WithMany().HasForeignKey(e => e.LabServiceOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabSample>().WithMany().HasForeignKey(e => e.LabSampleId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ResultOutputPackage>().WithMany().HasForeignKey(e => e.CorrectsPackageId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<ResultArtifact>(entity =>
        {
            entity.ToTable("result_artifacts", commercialSchema);
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.LogicalRole), 100);
            Text(entity.Property(e => e.FileName), 255);
            Text(entity.Property(e => e.ContentType), 255);
            Text(entity.Property(e => e.Sha256), 64);
            Text(entity.Property(e => e.ObjectStorageKey), 1000);
            EnumText(entity.Property(e => e.ScanState));
            Text(entity.Property(e => e.ScanDetail), 2000, false);
            entity.HasIndex(e => e.ObjectStorageKey).IsUnique();
            entity.HasIndex(e => new { e.ResultOutputPackageId, e.LogicalRole, e.FileName }).IsUnique();
            entity.HasOne<ResultOutputPackage>().WithMany().HasForeignKey(e => e.ResultOutputPackageId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<ResultDeliveryEvidence>(entity =>
        {
            entity.ToTable("result_delivery_evidence", commercialSchema);
            entity.HasKey(e => e.Id);
            EnumText(entity.Property(e => e.Kind));
            Json(entity.Property(e => e.DetailsJson));
            entity.HasIndex(e => new { e.ResultOutputPackageId, e.OccurredAtUtc });
            entity.HasOne<ResultOutputPackage>().WithMany().HasForeignKey(e => e.ResultOutputPackageId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ResultArtifact>().WithMany().HasForeignKey(e => e.ResultArtifactId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ResultRetentionSchedule>(entity =>
        {
            entity.ToTable("result_retention_schedules", commercialSchema);
            entity.HasKey(e => e.Id);
            EnumText(entity.Property(e => e.State));
            entity.HasIndex(e => e.ResultOutputPackageId).IsUnique();
            entity.HasIndex(e => new { e.State, e.WarningAtUtc, e.DeleteAtUtc });
            entity.HasOne<ResultOutputPackage>().WithMany().HasForeignKey(e => e.ResultOutputPackageId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });
    }

    private static void ConfigureCommercialLabServiceRecords(
        ModelBuilder modelBuilder,
        string commercialSchema)
    {
        modelBuilder.Entity<LabServiceOrder>(entity =>
        {
            entity.ToTable("lab_service_orders", commercialSchema);
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.OrderNumber), 50);
            Text(entity.Property(e => e.CustomerReference), 255);
            Text(entity.Property(e => e.NormalizedJobName), 255);
            Text(entity.Property(e => e.Description), 2000, false);
            Text(entity.Property(e => e.SharedBiologicalSource), 500, false);
            Text(entity.Property(e => e.StorageRequirements), 2000);
            Text(entity.Property(e => e.SafetyDeclaration), 2000);
            Text(entity.Property(e => e.SubmissionInstructionsSnapshot), 8000);
            Json(entity.Property(e => e.PlacementSnapshotJson), false);
            entity.Property(e => e.ProposedUnitPrice).HasPrecision(18, 2);
            Text(entity.Property(e => e.PriceProposalNote), 1000, false);
            EnumText(entity.Property(e => e.Status));
            EnumText(entity.Property(e => e.ResumeStatus), false);
            Text(entity.Property(e => e.TenantSafeReason), 2000, false);
            Text(entity.Property(e => e.InternalNote), 4000, false);
            entity.HasIndex(e => e.OrderNumber).IsUnique();
            entity.HasIndex(e => e.SourceRequestId).IsUnique();
            entity.HasIndex(e => new { e.OrganizationId, e.DepartmentId, e.NormalizedJobName }).IsUnique();
            entity.HasIndex(e => new { e.OrganizationId, e.DepartmentId, e.Status, e.CreatedAt });
            entity.HasIndex(e => new { e.AssignedToUserId, e.DueAt });
            entity.HasIndex(e => e.CurrentQuoteId);
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<OrganizationDepartment>().WithMany().HasForeignKey(e => e.DepartmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.SourceRequest).WithMany().HasForeignKey(e => e.SourceRequestId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.AssignedToUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.SampleRosterFinalizedByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.PriceProposedByUserId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<LabServiceSourceGroup>(entity =>
        {
            entity.ToTable("lab_service_source_groups", commercialSchema);
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.BiologicalSource), 500);
            Text(entity.Property(e => e.NormalizedBiologicalSource), 500);
            entity.HasIndex(e => new { e.LabServiceOrderId, e.NormalizedBiologicalSource }).IsUnique();
            entity.HasOne<LabServiceOrder>().WithMany(e => e.SourceGroups)
                .HasForeignKey(e => e.LabServiceOrderId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<LabSampleImportPreview>(entity =>
        {
            entity.ToTable("lab_sample_import_previews", commercialSchema);
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.FileSha256), 64);
            Json(entity.Property(e => e.RowsJson));
            Json(entity.Property(e => e.ErrorsJson));
            entity.HasIndex(e => new { e.LabServiceOrderId, e.CreatedAt });
            entity.HasIndex(e => e.ExpiresAt);
            entity.HasOne<LabServiceOrder>().WithMany().HasForeignKey(e => e.LabServiceOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.ActorUserId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<LabSample>(entity =>
        {
            entity.ToTable("lab_samples", commercialSchema);
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.CustomerSampleId), 255);
            Text(entity.Property(e => e.MaterialType), 255);
            Text(entity.Property(e => e.BiologicalSource), 500);
            Quantity(entity.Property(e => e.Quantity));
            Text(entity.Property(e => e.QuantityUnit), 100);
            Text(entity.Property(e => e.StorageRequirements), 2000);
            Text(entity.Property(e => e.SafetyDeclaration), 2000);
            Quantity(entity.Property(e => e.Concentration));
            Text(entity.Property(e => e.Notes), 4000, false);
            Json(entity.Property(e => e.AnalysisDefinitionIdsJson));
            Text(entity.Property(e => e.AccessionId), 100, false);
            EnumText(entity.Property(e => e.Status));
            EnumText(entity.Property(e => e.ResumeStatus), false);
            Text(entity.Property(e => e.ReceiptCondition), 1000, false);
            Text(entity.Property(e => e.Carrier), 255, false);
            Text(entity.Property(e => e.TrackingNumber), 255, false);
            Text(entity.Property(e => e.TenantSafeReason), 2000, false);
            Text(entity.Property(e => e.InternalNote), 4000, false);
            entity.HasIndex(e => new { e.LabServiceOrderId, e.CustomerSampleId }).IsUnique();
            entity.HasIndex(e => e.AccessionId).IsUnique().HasFilter("\"accession_id\" IS NOT NULL");
            entity.HasIndex(e => new { e.LabServiceOrderId, e.Status });
            entity.HasOne<LabServiceOrder>().WithMany(e => e.Samples).HasForeignKey(e => e.LabServiceOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabSample>().WithMany().HasForeignKey(e => e.ReplacementForSampleId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<LabServiceRequestRevision>(entity =>
        {
            entity.ToTable("lab_service_request_revisions", commercialSchema);
            entity.HasKey(e => e.Id);
            Json(entity.Property(e => e.SnapshotJson));
            Text(entity.Property(e => e.CorrectionReason), 2000, false);
            entity.HasIndex(e => new { e.LabServiceOrderId, e.Revision }).IsUnique();
            entity.HasOne<LabServiceOrder>().WithMany(e => e.Revisions).HasForeignKey(e => e.LabServiceOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabServiceRequestRevision>().WithMany().HasForeignKey(e => e.PreviousRevisionId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.SubmittedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LabServiceQuote>(entity =>
        {
            entity.ToTable("lab_service_quotes", commercialSchema);
            entity.HasKey(e => e.Id);
            EnumText(entity.Property(e => e.Purpose));
            EnumText(entity.Property(e => e.Status));
            Json(entity.Property(e => e.LinesJson));
            Money(entity.Property(e => e.Subtotal)); Money(entity.Property(e => e.Tax)); Money(entity.Property(e => e.Total));
            Text(entity.Property(e => e.Currency), 3);
            Json(entity.Property(e => e.BillingContactSnapshotJson), false);
            Json(entity.Property(e => e.BillingAddressSnapshotJson), false);
            Json(entity.Property(e => e.TaxDecisionSnapshotJson), false);
            entity.Property(e => e.ProposedUnitPriceSnapshot).HasPrecision(18, 2);
            EnumText(entity.Property(e => e.PricingDecision), false);
            Text(entity.Property(e => e.PricingDecisionReason), 2000, false);
            entity.HasIndex(e => new { e.LabServiceOrderId, e.Revision }).IsUnique();
            entity.HasOne<LabServiceOrder>().WithMany(e => e.Quotes).HasForeignKey(e => e.LabServiceOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabServiceQuote>().WithMany().HasForeignKey(e => e.SupersededByQuoteId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.PricingDecidedByUserId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<LabResultRelease>(entity =>
        {
            entity.ToTable("lab_result_releases", commercialSchema);
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.AnalysisProfile), 255);
            Text(entity.Property(e => e.PipelineVersion), 255);
            Text(entity.Property(e => e.Provenance), 4000);
            Text(entity.Property(e => e.QcStatus), 500);
            Json(entity.Property(e => e.ManifestJson));
            EnumText(entity.Property(e => e.ReleaseStatus));
            entity.HasIndex(e => new { e.LabSampleId, e.ReleaseVersion }).IsUnique();
            entity.HasIndex(e => new { e.OrganizationId, e.ReleaseStatus });
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabServiceOrder>().WithMany().HasForeignKey(e => e.LabServiceOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabSample>().WithMany().HasForeignKey(e => e.LabSampleId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });
    }

    private static void ConfigureReagents(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PartnerShippingAddress>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.Label), 100); Text(entity.Property(e => e.Recipient), 255);
            Text(entity.Property(e => e.Line1), 255); Text(entity.Property(e => e.Line2), 255, false);
            Text(entity.Property(e => e.City), 255); Text(entity.Property(e => e.Region), 255);
            Text(entity.Property(e => e.PostalCode), 50); Text(entity.Property(e => e.CountryCode), 2);
            Text(entity.Property(e => e.Phone), 100, false);
            entity.HasIndex(e => new { e.OrganizationId, e.DepartmentId, e.IsActive, e.Label });
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<OrganizationDepartment>().WithMany().HasForeignKey(e => e.DepartmentId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<PartnerReagentOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.OrderNumber), 50); EnumText(entity.Property(e => e.Status)); EnumText(entity.Property(e => e.ResumeStatus), false);
            Text(entity.Property(e => e.PurchaseOrderNumber), 255, false); Json(entity.Property(e => e.ShippingAddressSnapshotJson), false);
            Json(entity.Property(e => e.PlacementSnapshotJson), false);
            Text(entity.Property(e => e.ShippingInstructions), 2000, false); Text(entity.Property(e => e.TenantSafeReason), 2000, false); Text(entity.Property(e => e.InternalNote), 4000, false);
            entity.HasIndex(e => e.OrderNumber).IsUnique();
            entity.HasIndex(e => new { e.OrganizationId, e.DepartmentId, e.Status, e.CreatedAt });
            entity.HasIndex(e => new { e.AssignedToUserId, e.DueAt });
            entity.HasIndex(e => new { e.OrganizationId, e.PurchaseOrderNumber });
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<OrganizationDepartment>().WithMany().HasForeignKey(e => e.DepartmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.AssignedToUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PartnerShippingAddress>().WithMany().HasForeignKey(e => e.ShippingAddressId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<PartnerReagentOrderLine>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.ExternalItemId), 255); Text(entity.Property(e => e.Description), 1000);
            Quantity(entity.Property(e => e.Quantity)); Text(entity.Property(e => e.Unit), 100); Money(entity.Property(e => e.UnitPrice));
            Text(entity.Property(e => e.Currency), 3); Money(entity.Property(e => e.LineTotal)); Text(entity.Property(e => e.Note), 2000, false);
            Quantity(entity.Property(e => e.ShippedQuantity)); Quantity(entity.Property(e => e.CancelledQuantity));
            entity.Ignore(e => e.RemainingQuantity);
            entity.HasIndex(e => e.PartnerReagentOrderId);
            entity.HasOne<PartnerReagentOrder>().WithMany(e => e.Lines).HasForeignKey(e => e.PartnerReagentOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PartnerReagentOffering>().WithMany().HasForeignKey(e => e.OfferingId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<QboCatalogItem>().WithMany().HasForeignKey(e => e.QboCatalogItemId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<ReagentShipment>(entity =>
        {
            entity.HasKey(e => e.Id); Text(entity.Property(e => e.ShipmentNumber), 100); Text(entity.Property(e => e.PackingSlipNumber), 100);
            Text(entity.Property(e => e.Carrier), 255); Text(entity.Property(e => e.Service), 255, false); Text(entity.Property(e => e.TrackingNumber), 255);
            entity.HasIndex(e => e.ShipmentNumber).IsUnique(); entity.HasIndex(e => e.TrackingNumber);
            entity.HasOne<PartnerReagentOrder>().WithMany(e => e.Shipments).HasForeignKey(e => e.PartnerReagentOrderId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<ReagentShipmentLine>(entity =>
        {
            entity.HasKey(e => e.Id); Quantity(entity.Property(e => e.Quantity)); Text(entity.Property(e => e.LotBatchNumber), 255);
            entity.HasIndex(e => new { e.ReagentShipmentId, e.PartnerReagentOrderLineId });
            entity.HasOne<ReagentShipment>().WithMany(e => e.Lines).HasForeignKey(e => e.ReagentShipmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PartnerReagentOrderLine>().WithMany().HasForeignKey(e => e.PartnerReagentOrderLineId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ReagentOrderAdjustment>(entity =>
        {
            entity.HasKey(e => e.Id); Json(entity.Property(e => e.BeforeJson)); Json(entity.Property(e => e.AfterJson)); Text(entity.Property(e => e.Reason), 2000);
            Money(entity.Property(e => e.TotalDifference)); EnumText(entity.Property(e => e.Status)); entity.HasIndex(e => new { e.PartnerReagentOrderId, e.Status });
            entity.HasOne<PartnerReagentOrder>().WithMany().HasForeignKey(e => e.PartnerReagentOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PartnerReagentOrderLine>().WithMany().HasForeignKey(e => e.OriginalLineId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PartnerReagentOffering>().WithMany().HasForeignKey(e => e.ProposedOfferingId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });
    }

    private static void ConfigureAssembly(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DataAssemblyRequest>(entity =>
        {
            entity.HasKey(e => e.Id); Text(entity.Property(e => e.RequestNumber), 50); Text(entity.Property(e => e.ProjectReference), 255);
            Text(entity.Property(e => e.ProfileNameSnapshot), 255); Text(entity.Property(e => e.ProfileInstructionsSnapshot), 4000);
            Json(entity.Property(e => e.MetadataJson)); Text(entity.Property(e => e.RequestedOutput), 2000); Text(entity.Property(e => e.ProcessingNotes), 4000, false);
            EnumText(entity.Property(e => e.Status)); EnumText(entity.Property(e => e.ResumeStatus), false); Text(entity.Property(e => e.PurchaseOrderNumber), 255, false);
            Text(entity.Property(e => e.TenantSafeReason), 2000, false); Text(entity.Property(e => e.InternalNote), 4000, false);
            entity.HasIndex(e => e.RequestNumber).IsUnique(); entity.HasIndex(e => new { e.OrganizationId, e.DepartmentId, e.Status, e.CreatedAt });
            entity.HasIndex(e => new { e.AssignedToUserId, e.DueAt });
            entity.HasIndex(e => new { e.OrganizationId, e.ProjectReference });
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<OrganizationDepartment>().WithMany().HasForeignKey(e => e.DepartmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.AssignedToUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<AssemblyProfile>().WithMany().HasForeignKey(e => e.AssemblyProfileId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<AssemblyInputRevision>(entity =>
        {
            entity.HasKey(e => e.Id); Json(entity.Property(e => e.ManifestJson)); Text(entity.Property(e => e.CorrectionReason), 2000, false); Json(entity.Property(e => e.ValidationSummaryJson));
            entity.HasIndex(e => new { e.DataAssemblyRequestId, e.Revision }).IsUnique();
            entity.HasOne<DataAssemblyRequest>().WithMany(e => e.InputRevisions).HasForeignKey(e => e.DataAssemblyRequestId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<AssemblyInputRevision>().WithMany().HasForeignKey(e => e.PreviousRevisionId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.SubmittedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DataAssemblyQuote>(entity =>
        {
            entity.HasKey(e => e.Id); EnumText(entity.Property(e => e.Purpose)); EnumText(entity.Property(e => e.Status)); Json(entity.Property(e => e.LinesJson));
            Money(entity.Property(e => e.Subtotal)); Money(entity.Property(e => e.Tax)); Money(entity.Property(e => e.Total)); Text(entity.Property(e => e.Currency), 3);
            entity.HasIndex(e => new { e.DataAssemblyRequestId, e.Revision }).IsUnique();
            entity.HasOne<DataAssemblyRequest>().WithMany(e => e.Quotes).HasForeignKey(e => e.DataAssemblyRequestId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<DataAssemblyQuote>().WithMany().HasForeignKey(e => e.SupersededByQuoteId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<AssemblyProcessingRun>(entity =>
        {
            entity.HasKey(e => e.Id); Text(entity.Property(e => e.ProfileVersion), 255); Text(entity.Property(e => e.PipelineVersion), 255);
            Text(entity.Property(e => e.Provenance), 4000); Text(entity.Property(e => e.QcStatus), 500, false); Text(entity.Property(e => e.FailureReason), 2000, false);
            entity.HasIndex(e => new { e.DataAssemblyRequestId, e.RunNumber }).IsUnique();
            entity.HasOne<DataAssemblyRequest>().WithMany(e => e.ProcessingRuns).HasForeignKey(e => e.DataAssemblyRequestId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<AssemblyInputRevision>().WithMany().HasForeignKey(e => e.InputRevisionId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<AssemblyOutputRelease>(entity =>
        {
            entity.HasKey(e => e.Id); Json(entity.Property(e => e.ManifestJson)); Text(entity.Property(e => e.PipelineVersion), 255);
            Text(entity.Property(e => e.Provenance), 4000); Text(entity.Property(e => e.QcStatus), 500); EnumText(entity.Property(e => e.ReleaseStatus));
            entity.HasIndex(e => new { e.DataAssemblyRequestId, e.ReleaseVersion }).IsUnique(); entity.HasIndex(e => new { e.OrganizationId, e.ReleaseStatus });
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<DataAssemblyRequest>().WithMany(e => e.OutputReleases).HasForeignKey(e => e.DataAssemblyRequestId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<AssemblyInputRevision>().WithMany().HasForeignKey(e => e.InputRevisionId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<AssemblyProcessingRun>().WithMany().HasForeignKey(e => e.ProcessingRunId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });
    }

    private static void ConfigureWorkflowSupport(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OrderStatusEvent>(entity =>
        {
            entity.HasKey(e => e.Id); Text(entity.Property(e => e.WorkflowType), 100); Text(entity.Property(e => e.FromStatus), 100); Text(entity.Property(e => e.ToStatus), 100);
            Text(entity.Property(e => e.TenantSafeReason), 2000, false); Text(entity.Property(e => e.InternalNote), 4000, false);
            entity.HasIndex(e => new { e.WorkflowType, e.WorkflowId, e.OccurredAt }); entity.HasIndex(e => new { e.OrganizationId, e.OccurredAt });
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.ActorUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<OrderCancellationRequest>(entity =>
        {
            entity.HasKey(e => e.Id); Text(entity.Property(e => e.WorkflowType), 100); Text(entity.Property(e => e.Reason), 2000); Json(entity.Property(e => e.ScopeJson));
            EnumText(entity.Property(e => e.Status)); Text(entity.Property(e => e.DecisionReason), 2000, false);
            entity.HasIndex(e => new { e.WorkflowType, e.WorkflowId, e.Status });
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.RequestedByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.DecidedByUserId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });
    }

    private static void Audit<TEntity>(EntityTypeBuilder<TEntity> entity) where TEntity : class, IAudit, IConcurrency
    {
        entity.Property(e => e.CreatedAt).IsRequired(); entity.Property(e => e.CreatedByUserId);
        entity.Property(e => e.UpdatedAt).IsRequired(); entity.Property(e => e.UpdatedByUserId);
        entity.Property(e => e.Version).IsRequired().IsConcurrencyToken();
    }

    private static void Text<T>(PropertyBuilder<T> property, int maxLength, bool required = true)
    {
        property.IsRequired(required);
        property.HasMaxLength(maxLength);
    }

    private static void Json<T>(PropertyBuilder<T> property, bool required = true)
    {
        property.IsRequired(required);
        property.HasColumnType("jsonb");
    }

    private static void Money(PropertyBuilder<decimal> property) => property.HasPrecision(18, 2);
    private static void Quantity(PropertyBuilder<decimal> property) => property.HasPrecision(18, 6);
    private static void Quantity(PropertyBuilder<decimal?> property) => property.HasPrecision(18, 6);
    private static void EnumText<TEnum>(PropertyBuilder<TEnum> property, bool required = true) where TEnum : struct, Enum
    {
        if (required) property.IsRequired();
        property.HasConversion<string>().HasMaxLength(100);
    }
    private static void EnumText<TEnum>(PropertyBuilder<TEnum?> property, bool required = true) where TEnum : struct, Enum
    {
        if (required) property.IsRequired();
        property.HasConversion<string>().HasMaxLength(100);
    }
}
