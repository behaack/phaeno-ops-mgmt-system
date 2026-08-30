namespace PhaenoPortal.App.Features.OrderToCash;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderToCash.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;

public static class OrderToCashModelConfiguration
{
    public static void Configure(ModelBuilder modelBuilder, string schema)
    {
        modelBuilder.Entity<BusinessRoleAssignment>(entity =>
        {
            entity.ToTable("business_role_assignments", schema);
            Audit(entity);
            entity.Property(value => value.Role).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(value => value.IsActive).IsRequired();
            entity.HasIndex(value => new { value.UserId, value.Role }).IsUnique();
            entity.HasOne<User>().WithMany().HasForeignKey(value => value.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BusinessRoleInvitationIntent>(entity =>
        {
            entity.ToTable("business_role_invitation_intents", schema);
            Audit(entity);
            entity.Property(value => value.Role).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasIndex(value => new { value.OrganizationInvitationId, value.Role }).IsUnique();
            entity.HasOne<OrganizationInvitation>().WithMany()
                .HasForeignKey(value => value.OrganizationInvitationId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InvitationDeliveryAttempt>(entity =>
        {
            entity.ToTable("invitation_delivery_attempts", schema);
            Audit(entity);
            entity.Property(value => value.RecipientEmail).HasMaxLength(255).IsRequired();
            entity.Property(value => value.ProtectedPayload).HasMaxLength(8000).IsRequired();
            entity.Property(value => value.State).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(value => value.ProviderMessageId).HasMaxLength(255);
            entity.Property(value => value.LastError).HasMaxLength(2000);
            entity.Property(value => value.BounceType).HasMaxLength(100);
            entity.HasIndex(value => value.OrganizationInvitationId);
            entity.HasIndex(value => new { value.State, value.NextAttemptAtUtc });
            entity.HasIndex(value => value.ProviderMessageId);
            entity.HasOne<OrganizationInvitation>().WithMany()
                .HasForeignKey(value => value.OrganizationInvitationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Organization>().WithMany()
                .HasForeignKey(value => value.OrganizationId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<InvitationProviderEvent>(entity =>
        {
            entity.ToTable("invitation_provider_events", schema);
            entity.HasKey(value => value.Id);
            entity.Property(value => value.ProviderEventIdentity).HasMaxLength(500).IsRequired();
            entity.Property(value => value.EventType).HasMaxLength(100).IsRequired();
            entity.Property(value => value.ProviderMessageId).HasMaxLength(255);
            entity.Property(value => value.PayloadSha256).HasMaxLength(64).IsRequired();
            entity.HasIndex(value => value.ProviderEventIdentity).IsUnique();
            entity.HasIndex(value => value.ProviderMessageId);
        });

        modelBuilder.Entity<ResultOutputPackage>(entity =>
        {
            entity.ToTable("result_output_packages", schema);
            Audit(entity);
            entity.Property(value => value.PipelineName).HasMaxLength(255).IsRequired();
            entity.Property(value => value.PipelineVersion).HasMaxLength(255).IsRequired();
            entity.Property(value => value.ManifestIdentity).HasMaxLength(255).IsRequired();
            entity.Property(value => value.ManifestSha256).HasMaxLength(64).IsRequired();
            entity.Property(value => value.ManifestJson).HasColumnType("jsonb").IsRequired();
            entity.Property(value => value.StorageProvider).HasMaxLength(100).IsRequired();
            entity.Property(value => value.StorageObjectPrefix).HasMaxLength(2000).IsRequired();
            entity.Property(value => value.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(value => value.FailureReason).HasMaxLength(2000);
            entity.Property(value => value.WithdrawalReason).HasMaxLength(2000);
            entity.HasIndex(value => new { value.LabWorkOrderId, value.LabSampleId, value.PackageVersion }).IsUnique();
            entity.HasIndex(value => new { value.PipelineName, value.ManifestIdentity }).IsUnique();
            entity.HasIndex(value => new { value.OrganizationId, value.Status });
            entity.HasOne<Organization>().WithMany().HasForeignKey(value => value.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabServiceOrder>().WithMany().HasForeignKey(value => value.LabServiceOrderId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabWorkOrder>().WithMany().HasForeignKey(value => value.LabWorkOrderId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabSample>().WithMany().HasForeignKey(value => value.LabSampleId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ResultOutputPackage>().WithMany().HasForeignKey(value => value.CorrectsPackageId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(value => value.Artifacts).WithOne()
                .HasForeignKey(value => value.ResultOutputPackageId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ResultArtifact>(entity =>
        {
            entity.ToTable("result_artifacts", schema);
            entity.HasKey(value => value.Id);
            entity.Property(value => value.ArtifactIdentity).HasMaxLength(255).IsRequired();
            entity.Property(value => value.FileName).HasMaxLength(500).IsRequired();
            entity.Property(value => value.MediaType).HasMaxLength(255).IsRequired();
            entity.Property(value => value.Sha256).HasMaxLength(64).IsRequired();
            entity.Property(value => value.StorageObjectKey).HasMaxLength(2000).IsRequired();
            entity.Property(value => value.ScanStatus).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(value => value.ScanDetails).HasMaxLength(2000);
            entity.HasIndex(value => new { value.ResultOutputPackageId, value.ArtifactIdentity }).IsUnique();
            entity.HasIndex(value => value.StorageObjectKey).IsUnique();
        });

        modelBuilder.Entity<ResultDeliveryEvidence>(entity =>
        {
            entity.ToTable("result_delivery_evidence", schema);
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Kind).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(value => value.EvidenceJson).HasColumnType("jsonb").IsRequired();
            entity.HasIndex(value => new { value.ResultOutputPackageId, value.OccurredAtUtc });
            entity.HasOne<ResultOutputPackage>().WithMany()
                .HasForeignKey(value => value.ResultOutputPackageId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable("invoices", schema);
            Audit(entity);
            entity.Property(value => value.InvoiceNumber).HasMaxLength(100).IsRequired();
            entity.Property(value => value.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(value => value.Currency).HasMaxLength(3).IsRequired();
            Money(entity.Property(value => value.Subtotal)); Money(entity.Property(value => value.Tax));
            Money(entity.Property(value => value.AdjustmentTotal)); Money(entity.Property(value => value.Total));
            Money(entity.Property(value => value.Balance));
            entity.Property(value => value.BillingSnapshotJson).HasColumnType("jsonb").IsRequired();
            entity.HasIndex(value => value.InvoiceNumber).IsUnique();
            entity.HasIndex(value => value.LabServiceOrderId).IsUnique();
            entity.HasIndex(value => value.AcceptedQuoteId).IsUnique();
            entity.HasIndex(value => new { value.OrganizationId, value.Status, value.DueAtUtc });
            entity.HasOne<Organization>().WithMany().HasForeignKey(value => value.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabServiceOrder>().WithMany().HasForeignKey(value => value.LabServiceOrderId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<LabServiceQuote>().WithMany().HasForeignKey(value => value.AcceptedQuoteId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(value => value.Lines).WithOne().HasForeignKey(value => value.InvoiceId).OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(value => value.Adjustments).WithOne().HasForeignKey(value => value.InvoiceId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<InvoiceLine>(entity =>
        {
            entity.ToTable("invoice_lines", schema); entity.HasKey(value => value.Id);
            entity.Property(value => value.Description).HasMaxLength(1000).IsRequired();
            entity.Property(value => value.Quantity).HasPrecision(18, 6);
            Money(entity.Property(value => value.UnitPrice)); Money(entity.Property(value => value.LineTotal));
            entity.Property(value => value.SourceSnapshotJson).HasColumnType("jsonb").IsRequired();
            entity.HasIndex(value => new { value.InvoiceId, value.LineNumber }).IsUnique();
        });

        modelBuilder.Entity<InvoiceAdjustment>(entity =>
        {
            entity.ToTable("invoice_adjustments", schema); entity.HasKey(value => value.Id);
            entity.Property(value => value.Kind).HasConversion<string>().HasMaxLength(50).IsRequired();
            Money(entity.Property(value => value.Amount)); entity.Property(value => value.Reason).HasMaxLength(2000).IsRequired();
            entity.HasIndex(value => new { value.InvoiceId, value.RecordedAtUtc });
        });

        modelBuilder.Entity<InvoiceDocument>(entity =>
        {
            entity.ToTable("invoice_documents", schema); entity.HasKey(value => value.Id);
            entity.Property(value => value.StorageObjectKey).HasMaxLength(2000).IsRequired();
            entity.Property(value => value.Sha256).HasMaxLength(64).IsRequired();
            entity.HasIndex(value => value.InvoiceId).IsUnique();
            entity.HasIndex(value => value.StorageObjectKey).IsUnique();
            entity.HasOne<Invoice>().WithOne().HasForeignKey<InvoiceDocument>(value => value.InvoiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PaymentReceipt>(entity =>
        {
            entity.ToTable("payment_receipts", schema); Audit(entity);
            entity.Property(value => value.ReceiptNumber).HasMaxLength(100).IsRequired();
            entity.Property(value => value.Payer).HasMaxLength(500).IsRequired();
            Money(entity.Property(value => value.Amount)); Money(entity.Property(value => value.UnappliedAmount));
            entity.Property(value => value.Currency).HasMaxLength(3).IsRequired();
            entity.Property(value => value.Method).HasMaxLength(100).IsRequired();
            entity.Property(value => value.BankReference).HasMaxLength(255).IsRequired();
            entity.Property(value => value.EvidenceReference).HasMaxLength(2000);
            entity.Property(value => value.ExternalId).HasMaxLength(255).IsRequired();
            entity.Property(value => value.Memo).HasMaxLength(2000);
            entity.Property(value => value.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(value => value.ReversalReason).HasMaxLength(2000);
            entity.HasIndex(value => value.ReceiptNumber).IsUnique();
            entity.HasIndex(value => value.ExternalId).IsUnique();
            entity.HasIndex(value => new { value.OrganizationId, value.Status, value.ReceivedAtUtc });
            entity.HasOne<Organization>().WithMany().HasForeignKey(value => value.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PaymentAllocation>(entity =>
        {
            entity.ToTable("payment_allocations", schema); entity.HasKey(value => value.Id);
            Money(entity.Property(value => value.Amount)); entity.Property(value => value.ReversalReason).HasMaxLength(2000);
            entity.HasIndex(value => value.PaymentReceiptId); entity.HasIndex(value => value.InvoiceId);
            entity.HasOne<PaymentReceipt>().WithMany().HasForeignKey(value => value.PaymentReceiptId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Invoice>().WithMany().HasForeignKey(value => value.InvoiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PaymentImportBatch>(entity =>
        {
            entity.ToTable("payment_import_batches", schema); Audit(entity);
            entity.Property(value => value.Source).HasMaxLength(255).IsRequired();
            entity.Property(value => value.FileSha256).HasMaxLength(64).IsRequired();
            entity.Property(value => value.PreviewRowsJson).HasColumnType("jsonb").IsRequired();
            entity.Property(value => value.ValidationErrorsJson).HasColumnType("jsonb").IsRequired();
            entity.HasIndex(value => new { value.Source, value.FileSha256 }).IsUnique();
        });

        modelBuilder.Entity<ReconciliationBatch>(entity =>
        {
            entity.ToTable("reconciliation_batches", schema); Audit(entity);
            entity.Property(value => value.BatchNumber).HasMaxLength(100).IsRequired();
            Money(entity.Property(value => value.ExpectedAmount)); Money(entity.Property(value => value.ReconciledAmount)); Money(entity.Property(value => value.Difference));
            entity.Property(value => value.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(value => value.IncludedActivityActorIdsJson).HasColumnType("jsonb").IsRequired();
            entity.Property(value => value.ApprovalNotes).HasMaxLength(4000);
            entity.Property(value => value.CloseoutReportSha256).HasMaxLength(64);
            entity.Property(value => value.CloseoutReportJson).HasColumnType("jsonb");
            entity.HasIndex(value => value.BatchNumber).IsUnique();
            entity.HasIndex(value => new { value.Status, value.PeriodEndUtc });
        });

        modelBuilder.Entity<ExternalPaymentLink>(entity =>
        {
            entity.ToTable("external_payment_links", schema); entity.HasKey(value => value.Id);
            entity.Property(value => value.ProviderKey).HasMaxLength(100).IsRequired();
            entity.Property(value => value.ExternalObjectType).HasMaxLength(100).IsRequired();
            entity.Property(value => value.ExternalObjectId).HasMaxLength(255).IsRequired();
            entity.HasIndex(value => new { value.ProviderKey, value.ExternalObjectType, value.ExternalObjectId }).IsUnique();
        });

        modelBuilder.Entity<AttentionItem>(entity =>
        {
            entity.ToTable("attention_items", schema); Audit(entity);
            entity.Property(value => value.Category).HasMaxLength(100).IsRequired();
            entity.Property(value => value.SourceType).HasMaxLength(100).IsRequired();
            entity.Property(value => value.OwnerRole).HasMaxLength(100).IsRequired();
            entity.Property(value => value.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(value => value.NextAction).HasMaxLength(1000).IsRequired();
            entity.Property(value => value.LastError).HasMaxLength(2000);
            entity.Property(value => value.Resolution).HasMaxLength(2000);
            entity.HasIndex(value => new { value.Category, value.SourceType, value.SourceId }).IsUnique();
            entity.HasIndex(value => new { value.OwnerRole, value.Status, value.FirstObservedAtUtc });
        });

        modelBuilder.Entity<DualControlObservation>(entity =>
        {
            entity.ToTable("dual_control_observations", schema); entity.HasKey(value => value.Id);
            entity.Property(value => value.ControlCode).HasMaxLength(100).IsRequired();
            entity.Property(value => value.WorkflowType).HasMaxLength(100).IsRequired();
            entity.Property(value => value.ConflictingActorIdsJson).HasColumnType("jsonb").IsRequired();
            entity.Property(value => value.Mode).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasIndex(value => new { value.ControlCode, value.WorkflowType, value.WorkflowId });
        });
    }

    private static void Audit<TEntity>(Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntity> entity)
        where TEntity : class
    {
        entity.HasKey("Id");
        entity.Property<DateTime>("CreatedAt").IsRequired();
        entity.Property<Guid?>("CreatedByUserId");
        entity.Property<DateTime>("UpdatedAt").IsRequired();
        entity.Property<Guid?>("UpdatedByUserId");
        entity.Property<long>("Version").IsRequired().IsConcurrencyToken();
    }

    private static void Money(Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<decimal> property) =>
        property.HasPrecision(18, 2);
}
