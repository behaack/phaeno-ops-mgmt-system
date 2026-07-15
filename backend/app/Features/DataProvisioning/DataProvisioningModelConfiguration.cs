namespace PhaenoPortal.App.Features.DataProvisioning;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PhaenoPortal.App.Common.Persistence;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.DataProvisioning.Domain;

public static class DataProvisioningModelConfiguration
{
    public static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SourceSample>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Label).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.BiologicalContext).HasMaxLength(2000);
            entity.Property(e => e.AssayContext).HasMaxLength(2000);
            entity.Property(e => e.AnalysisSummary).HasMaxLength(4000);
            entity.Property(e => e.QcStatus).HasMaxLength(500);
            entity.Property(e => e.Provenance).HasMaxLength(2000);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.OwnershipBasis).HasMaxLength(2000);
            entity.Property(e => e.OwnershipEvidenceReference).HasMaxLength(1000);
            entity.Property(e => e.DeidentificationMethod).HasMaxLength(1000);
            entity.Property(e => e.DeidentificationNotes).HasMaxLength(2000);
            entity.HasIndex(e => e.Label).IsUnique();
            entity.HasIndex(e => e.Status);
            ConfigureAudit(entity);
        });

        modelBuilder.Entity<ManagedFile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(512);
            entity.Property(e => e.FileKind).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ContentType).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Sha256).IsRequired().HasMaxLength(64);
            entity.Property(e => e.StorageKey).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.ScanStatus).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.ScanMessage).HasMaxLength(2000);
            entity.HasIndex(e => e.SourceSampleId);
            entity.HasIndex(e => e.StorageKey).IsUnique();
            entity.HasOne(e => e.SourceSample)
                .WithMany(e => e.Files)
                .HasForeignKey(e => e.SourceSampleId)
                .OnDelete(DeleteBehavior.Restrict);
            ConfigureAudit(entity);
        });

        modelBuilder.Entity<CuratedDataset>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(2000);
            entity.HasIndex(e => e.Name).IsUnique();
            entity.HasIndex(e => e.EligibleVersionId);
            ConfigureAudit(entity);
        });

        modelBuilder.Entity<CuratedDatasetVersion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.SampleLabel).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.BiologicalContext).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.AssayContext).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.AnalysisSummary).IsRequired().HasMaxLength(4000);
            entity.Property(e => e.QcStatus).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Provenance).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.OwnershipBasis).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.OwnershipEvidenceReference).HasMaxLength(1000);
            entity.Property(e => e.DeidentificationMethod).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.DeidentificationNotes).HasMaxLength(2000);
            entity.Property(e => e.ReleaseNotes).IsRequired().HasMaxLength(4000);
            entity.Property(e => e.ManifestJson).IsRequired().HasColumnType("jsonb");
            entity.Property(e => e.ContentChecksum).IsRequired().HasMaxLength(64);
            entity.HasIndex(e => new { e.CuratedDatasetId, e.VersionNumber }).IsUnique();
            entity.HasIndex(e => new { e.SourceSampleId, e.SourceRevision });
            entity.HasOne(e => e.CuratedDataset)
                .WithMany(e => e.Versions)
                .HasForeignKey(e => e.CuratedDatasetId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<SourceSample>()
                .WithMany()
                .HasForeignKey(e => e.SourceSampleId)
                .OnDelete(DeleteBehavior.Restrict);
            ConfigureAudit(entity);
        });

        modelBuilder.Entity<CuratedDatasetVersionFile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(512);
            entity.Property(e => e.FileKind).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ContentType).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Sha256).IsRequired().HasMaxLength(64);
            entity.HasIndex(e => new { e.CuratedDatasetVersionId, e.ManagedFileId }).IsUnique();
            entity.HasOne(e => e.CuratedDatasetVersion)
                .WithMany(e => e.Files)
                .HasForeignKey(e => e.CuratedDatasetVersionId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ManagedFile)
                .WithMany()
                .HasForeignKey(e => e.ManagedFileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<OrganizationDatasetGrant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.RevocationReason).HasMaxLength(2000);
            entity.HasIndex(e => e.OrganizationId);
            entity.HasIndex(e => e.CuratedDatasetVersionId);
            entity.HasIndex(e => new { e.OrganizationId, e.CuratedDatasetId })
                .IsUnique()
                .HasFilter("\"status\" = 'Active'");
            entity.HasOne(e => e.Organization)
                .WithMany()
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.CuratedDataset)
                .WithMany()
                .HasForeignKey(e => e.CuratedDatasetId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.CuratedDatasetVersion)
                .WithMany()
                .HasForeignKey(e => e.CuratedDatasetVersionId)
                .OnDelete(DeleteBehavior.Restrict);
            ConfigureAudit(entity);
        });

        modelBuilder.Entity<ProvisioningRun>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.IdempotencyKey).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Kind).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.FailureCode).HasMaxLength(100);
            entity.Property(e => e.FailureMessage).HasMaxLength(2000);
            entity.HasIndex(e => new { e.OrganizationId, e.IdempotencyKey }).IsUnique();
            entity.HasOne(e => e.Organization)
                .WithMany()
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.CuratedDatasetVersion)
                .WithMany()
                .HasForeignKey(e => e.CuratedDatasetVersionId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.OrganizationDatasetGrant)
                .WithMany()
                .HasForeignKey(e => e.OrganizationDatasetGrantId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<OrganizationDatasetGrant>()
                .WithMany()
                .HasForeignKey(e => e.PreviousOrganizationDatasetGrantId)
                .OnDelete(DeleteBehavior.Restrict);
            ConfigureAudit(entity);
        });

        modelBuilder.Entity<DatasetDownloadAudit>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Kind).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.RequestId).HasMaxLength(255);
            entity.Property(e => e.RemoteAddress).HasMaxLength(100);
            entity.HasIndex(e => e.OrganizationId);
            entity.HasIndex(e => e.OrganizationDatasetGrantId);
            entity.HasIndex(e => e.DownloadedAt);
            entity.HasOne<Organization>()
                .WithMany()
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<OrganizationDatasetGrant>()
                .WithMany()
                .HasForeignKey(e => e.OrganizationDatasetGrantId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<CuratedDatasetVersion>()
                .WithMany()
                .HasForeignKey(e => e.CuratedDatasetVersionId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ManagedFile>()
                .WithMany()
                .HasForeignKey(e => e.ManagedFileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DataGovernanceIncident>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Category).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Reason).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.ExternalGuidance).IsRequired().HasMaxLength(4000);
            entity.Property(e => e.InternalNotes).IsRequired().HasMaxLength(4000);
            entity.Property(e => e.Resolution).HasMaxLength(4000);
            entity.HasIndex(e => e.SourceSampleId);
            entity.HasIndex(e => e.Status);
            entity.HasOne(e => e.SourceSample)
                .WithMany()
                .HasForeignKey(e => e.SourceSampleId)
                .OnDelete(DeleteBehavior.Restrict);
            ConfigureAudit(entity);
        });

        modelBuilder.Entity<DataGovernanceAffectedVersion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PriorStatus).HasConversion<string>().HasMaxLength(50);
            entity.HasIndex(e => new { e.IncidentId, e.CuratedDatasetVersionId }).IsUnique();
            entity.HasOne(e => e.Incident)
                .WithMany(e => e.AffectedVersions)
                .HasForeignKey(e => e.IncidentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.CuratedDatasetVersion)
                .WithMany()
                .HasForeignKey(e => e.CuratedDatasetVersionId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DataGovernanceAffectedOrganization>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.AttestationSource).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.OrganizationContact).HasMaxLength(500);
            entity.Property(e => e.EvidenceSource).HasMaxLength(1000);
            entity.Property(e => e.AttestationNotes).HasMaxLength(4000);
            entity.HasIndex(e => new { e.IncidentId, e.OrganizationId }).IsUnique();
            entity.HasIndex(e => e.Status);
            entity.HasOne(e => e.Incident)
                .WithMany(e => e.AffectedOrganizations)
                .HasForeignKey(e => e.IncidentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Organization)
                .WithMany()
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
            ConfigureAudit(entity);
        });

        modelBuilder.Entity<DataGovernanceFollowUp>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Kind).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Notes).IsRequired().HasMaxLength(4000);
            entity.HasIndex(e => new { e.IncidentId, e.OccurredAt });
            entity.HasIndex(e => e.OrganizationId);
            entity.HasOne(e => e.Incident)
                .WithMany(e => e.FollowUps)
                .HasForeignKey(e => e.IncidentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Organization>()
                .WithMany()
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.ActorUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DataProvisioningNotice>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Kind).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Subject).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Body).IsRequired().HasMaxLength(4000);
            entity.Property(e => e.LastError).HasMaxLength(2000);
            entity.HasIndex(e => new { e.Status, e.NextAttemptAt });
            entity.HasIndex(e => new { e.OrganizationId, e.CreatedAt });
            entity.HasOne(e => e.Organization)
                .WithMany()
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Incident)
                .WithMany()
                .HasForeignKey(e => e.IncidentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<OrganizationDatasetGrant>()
                .WithMany()
                .HasForeignKey(e => e.OrganizationDatasetGrantId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureAudit<TEntity>(EntityTypeBuilder<TEntity> entity)
        where TEntity : class, IAudit, IConcurrency
    {
        entity.Property(e => e.CreatedAt).IsRequired();
        entity.Property(e => e.CreatedByUserId);
        entity.Property(e => e.UpdatedAt).IsRequired();
        entity.Property(e => e.UpdatedByUserId);
        entity.Property(e => e.Version).IsRequired().IsConcurrencyToken();
    }
}
