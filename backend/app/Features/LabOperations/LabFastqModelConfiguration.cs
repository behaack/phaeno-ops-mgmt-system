namespace PhaenoPortal.App.Features.LabOperations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;

internal static class LabFastqModelConfiguration
{
    public static void Configure(ModelBuilder model, string schema)
    {
        model.Entity<LabVendorResultsDraft>(e => {
            e.ToTable("lab_vendor_results_drafts", schema); e.HasKey(x => x.Id); e.Property(x => x.PayloadJson).HasColumnType("jsonb");
            e.Property(x => x.Version).IsConcurrencyToken(); e.HasIndex(x => new { x.LabNgsSendoutId, x.UserId, x.CreatedAtUtc });
            e.HasOne<LabNgsSendout>().WithMany().HasForeignKey(x => x.LabNgsSendoutId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<LabFastqArchive>(e => {
            e.ToTable("lab_fastq_archives", schema); e.HasKey(x => x.Id); e.Property(x => x.Version).IsConcurrencyToken();
            e.Property(x => x.FileName).HasMaxLength(255); e.Property(x => x.StorageKey).HasMaxLength(1000);
            e.Property(x => x.Sha256).HasMaxLength(64); e.Property(x => x.ChunkManifestSha256).HasMaxLength(64);
            e.Property(x => x.ChunksJson).HasColumnType("jsonb"); e.Property(x => x.ManifestJson).HasColumnType("jsonb");
            e.HasIndex(x => new { x.LabVendorResultsDraftId, x.ExpiresAtUtc });
            e.HasOne<LabVendorResultsDraft>().WithMany().HasForeignKey(x => x.LabVendorResultsDraftId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<LabFastqSet>(e => {
            e.ToTable("lab_fastq_sets", schema); e.HasKey(x => x.Id); e.Property(x => x.PolicyJson).HasColumnType("jsonb");
            e.Property(x => x.ReadLayout).HasMaxLength(16); e.Property(x => x.LibraryPreparationChoice).HasMaxLength(32);
            e.HasIndex(x => new { x.LabBatchMemberId, x.SetVersion }).IsUnique();
            e.HasOne<LabVendorResultsDraft>().WithMany().HasForeignKey(x => x.LabVendorResultsDraftId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabBatchMember>().WithMany().HasForeignKey(x => x.LabBatchMemberId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabWorkOrder>().WithMany().HasForeignKey(x => x.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabSpecimen>().WithMany().HasForeignKey(x => x.LabSpecimenId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabLibrary>().WithMany().HasForeignKey(x => x.LabLibraryId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabVendorResultsVersion>().WithMany().HasForeignKey(x => x.LabVendorResultsVersionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.RecordedByUserId).OnDelete(DeleteBehavior.Restrict);
            foreach (var p in e.Metadata.GetProperties().Where(p => p.Name != nameof(LabFastqSet.LabVendorResultsVersionId))) p.SetAfterSaveBehavior(PropertySaveBehavior.Throw);
        });
        model.Entity<LabFastqUpload>(e => {
            e.ToTable("lab_fastq_uploads", schema); e.HasKey(x => x.Id); e.Property(x => x.ChunksJson).HasColumnType("jsonb");
            e.Property(x => x.Version).IsConcurrencyToken(); e.Property(x => x.FileName).HasMaxLength(255);
            e.Property(x => x.OriginalFileName).HasMaxLength(255); e.Property(x => x.GroupDescription).HasMaxLength(255);
            e.Property(x => x.ReadIdentifiersSha256).HasMaxLength(64);
            e.Property(x => x.ChunkManifestSha256).HasMaxLength(64);
            e.HasIndex(x => new { x.LabFastqSetId, x.GroupNumber, x.ReadNumber, x.PartNumber }).IsUnique();
            e.HasOne<LabFastqSet>().WithMany().HasForeignKey(x => x.LabFastqSetId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabFastqArchive>().WithMany().HasForeignKey(x => x.LabFastqArchiveId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabScientificFile>().WithMany().HasForeignKey(x => x.LabScientificFileId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<LabAssemblyQc>(e => {
            e.ToTable("lab_assembly_qc", schema); e.HasKey(x => x.Id); e.Property(x => x.MeasurementsJson).HasColumnType("jsonb");
            e.Property(x => x.InputCoverageJson).HasColumnType("jsonb");
            e.Property(x => x.Decision).HasMaxLength(8); e.Property(x => x.Note).HasMaxLength(4000);
            e.HasIndex(x => new { x.ResultOutputPackageId, x.ReviewVersion }).IsUnique();
            e.HasOne<LabAssemblyJob>().WithMany().HasForeignKey(x => x.LabAssemblyJobId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabAnalysisRun>().WithMany().HasForeignKey(x => x.LabAnalysisRunId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<ResultOutputPackage>().WithMany().HasForeignKey(x => x.ResultOutputPackageId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabScientificFile>().WithMany().HasForeignKey(x => x.LabScientificFileId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.RecordedByUserId).OnDelete(DeleteBehavior.Restrict);
            foreach (var p in e.Metadata.GetProperties()) p.SetAfterSaveBehavior(PropertySaveBehavior.Throw);
        });
    }
}
