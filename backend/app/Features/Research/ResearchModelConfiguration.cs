namespace PhaenoPortal.App.Features.Research;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Laboratory.Research;

public static class ResearchModelConfiguration
{
    public const string Schema = "research";
    public static void ConfigureResearch(this ModelBuilder builder)
    {
        builder.Entity<ResearchProject>(e => {
            e.ToTable("projects", Schema); ConfigureAudit(e); e.Property(x => x.Name).HasMaxLength(255);
            e.Property(x => x.Description).HasMaxLength(10000); e.HasIndex(x => new { x.OrganizationId, x.UpdatedAt });
            e.HasAlternateKey(x => new { x.OrganizationId, x.Id });
        });
        builder.Entity<ResearchExperiment>(e => {
            e.ToTable("experiments", Schema); ConfigureAudit(e); e.Property(x => x.Title).HasMaxLength(255);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
            e.HasIndex(x => new { x.OrganizationId, x.ResearchProjectId, x.Status, x.LastActivityAtUtc });
            e.HasAlternateKey(x => new { x.OrganizationId, x.Id });
            e.HasOne<ResearchProject>().WithMany().HasForeignKey(x => new { x.OrganizationId, x.ResearchProjectId })
                .HasPrincipalKey(x => new { x.OrganizationId, x.Id }).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<ResearchEntry>(e => {
            e.ToTable("entries", Schema); ConfigureAudit(e); e.Property(x => x.Title).HasMaxLength(255);
            e.Property(x => x.ContentJson).HasColumnType("jsonb");
            e.HasAlternateKey(x => new { x.OrganizationId, x.ResearchExperimentId, x.Id });
            e.HasOne<ResearchExperiment>().WithMany().HasForeignKey(x => new { x.OrganizationId, x.ResearchExperimentId })
                .HasPrincipalKey(x => new { x.OrganizationId, x.Id }).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<ResearchRevision>(e => {
            e.ToTable("revisions", Schema); e.HasKey(x => x.Id); e.Property(x => x.RecordKind).HasMaxLength(30);
            e.Property(x => x.Action).HasMaxLength(50); e.Property(x => x.SnapshotJson).HasColumnType("jsonb");
            e.HasIndex(x => new { x.OrganizationId, x.RecordKind, x.RecordId, x.Revision }).IsUnique();
        });
        builder.Entity<ResearchAttachment>(e => {
            e.ToTable("attachments", Schema); e.HasKey(x => x.Id); e.Property(x => x.FileName).HasMaxLength(255);
            e.Property(x => x.ContentType).HasMaxLength(100); e.Property(x => x.StorageKey).HasMaxLength(2048);
            e.Property(x => x.Sha256).HasMaxLength(64);
            e.HasOne<ResearchEntry>().WithMany().HasForeignKey(x => new { x.OrganizationId, x.ResearchExperimentId, x.ResearchEntryId })
                .HasPrincipalKey(x => new { x.OrganizationId, x.ResearchExperimentId, x.Id }).OnDelete(DeleteBehavior.Restrict);
        });
    }
    private static void ConfigureAudit<T>(EntityTypeBuilder<T> e) where T : LabAuditedEntity
    { e.HasKey("Id"); e.Property(x => x.Version).IsConcurrencyToken(); }
}
