namespace PhaenoPortal.App.Features.LabOperations;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Domain;

public static class LabConfigurationAssetModelConfiguration
{
    public static void ConfigureLabConfigurationAssets(this ModelBuilder builder, string schema)
    {
        builder.Entity<LabConfigurationAsset>(e => {
            e.ToTable("lab_configuration_assets", schema); e.HasKey(x => x.Id);
            e.Property(x => x.FileName).HasMaxLength(255); e.Property(x => x.ContentType).HasMaxLength(50);
            e.Property(x => x.StorageKey).HasMaxLength(2048); e.Property(x => x.Sha256).HasMaxLength(64);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.RecordedByUserId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<LabConfigurationDefinitionArchive>(e => {
            e.ToTable("lab_configuration_definition_archives", schema); e.HasKey(x => x.Id);
            e.Property(x => x.SourceTable).HasMaxLength(100); e.Property(x => x.SourceColumn).HasMaxLength(100);
            e.HasIndex(x => new { x.SourceTable, x.SourceId, x.SourceColumn }).IsUnique();
        });
    }
}
