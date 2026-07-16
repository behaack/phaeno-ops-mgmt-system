namespace PhaenoPortal.App.Features.OrderManagement;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PSeq.Operations.Commercial.Common.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;

public static class OrderManagementModelConfiguration
{
    public static void Configure(ModelBuilder modelBuilder)
    {
        ConfigureCatalog(modelBuilder);
        ConfigureCommercial(modelBuilder);
        ConfigureLab(modelBuilder);
        ConfigureReagents(modelBuilder);
        ConfigureAssembly(modelBuilder);
        ConfigureWorkflowSupport(modelBuilder);
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
            Text(entity.Property(e => e.RemoteAddress), 100, false);
            Text(entity.Property(e => e.UserAgent), 1000, false);
            entity.HasIndex(e => new { e.OrganizationId, e.DownloadedAt });
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
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.RecipientUserId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });
    }

    private static void ConfigureLab(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<LabServiceOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            Text(entity.Property(e => e.OrderNumber), 50);
            Text(entity.Property(e => e.CustomerReference), 255, false);
            Text(entity.Property(e => e.SubmissionInstructionsSnapshot), 8000);
            EnumText(entity.Property(e => e.Status));
            EnumText(entity.Property(e => e.ResumeStatus), false);
            Text(entity.Property(e => e.TenantSafeReason), 2000, false);
            Text(entity.Property(e => e.InternalNote), 4000, false);
            entity.HasIndex(e => e.OrderNumber).IsUnique();
            entity.HasIndex(e => new { e.OrganizationId, e.Status, e.CreatedAt });
            entity.HasIndex(e => new { e.AssignedToUserId, e.DueAt });
            entity.HasIndex(e => e.CurrentQuoteId);
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.AssignedToUserId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<LabSample>(entity =>
        {
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
            entity.HasKey(e => e.Id);
            EnumText(entity.Property(e => e.Purpose));
            EnumText(entity.Property(e => e.Status));
            Json(entity.Property(e => e.LinesJson));
            Money(entity.Property(e => e.Subtotal)); Money(entity.Property(e => e.Tax)); Money(entity.Property(e => e.Total));
            Text(entity.Property(e => e.Currency), 3);
            entity.HasIndex(e => new { e.LabServiceOrderId, e.Revision }).IsUnique();
            entity.HasOne<LabServiceOrder>().WithMany(e => e.Quotes).HasForeignKey(e => e.LabServiceOrderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabServiceQuote>().WithMany().HasForeignKey(e => e.SupersededByQuoteId).OnDelete(DeleteBehavior.Restrict);
            Audit(entity);
        });

        modelBuilder.Entity<LabResultRelease>(entity =>
        {
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
            entity.HasIndex(e => new { e.OrganizationId, e.IsActive, e.Label });
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
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
            entity.HasIndex(e => new { e.OrganizationId, e.Status, e.CreatedAt });
            entity.HasIndex(e => new { e.AssignedToUserId, e.DueAt });
            entity.HasIndex(e => new { e.OrganizationId, e.PurchaseOrderNumber });
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
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
            entity.HasIndex(e => e.RequestNumber).IsUnique(); entity.HasIndex(e => new { e.OrganizationId, e.Status, e.CreatedAt });
            entity.HasIndex(e => new { e.AssignedToUserId, e.DueAt });
            entity.HasIndex(e => new { e.OrganizationId, e.ProjectReference });
            entity.HasOne<Organization>().WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.Restrict);
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
