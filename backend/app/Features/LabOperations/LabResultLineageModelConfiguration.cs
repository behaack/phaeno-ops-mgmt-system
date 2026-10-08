namespace PhaenoPortal.App.Features.LabOperations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;

internal static class LabResultLineageModelConfiguration
{
    public static void Configure(ModelBuilder modelBuilder, string schema)
    {
        modelBuilder.Entity<LabScientificFile>(e =>
        {
            e.ToTable("lab_scientific_files", schema); e.HasKey(x => x.Id);
            e.Property(x => x.FileName).HasMaxLength(255).IsRequired();
            e.Property(x => x.StorageKey).HasMaxLength(1000).IsRequired();
            e.Property(x => x.Sha256).HasMaxLength(64).IsRequired();
            e.HasIndex(x => x.StorageKey).IsUnique();
            e.HasIndex(x => new { x.LabWorkOrderId, x.LabSpecimenId, x.RecordedAtUtc });
            e.HasOne<LabWorkOrder>().WithMany().HasForeignKey(x => x.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabSpecimen>().WithMany().HasForeignKey(x => x.LabSpecimenId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<LabPerformanceProposal>(e =>
        {
            e.ToTable("lab_performance_proposals", schema); e.HasKey(x => x.Id);
            e.Property(x => x.Kind).HasMaxLength(30).IsRequired();
            e.Property(x => x.Reason).HasMaxLength(4000).IsRequired();
            e.Property(x => x.PerformanceJson).HasColumnType("jsonb").IsRequired();
            e.Property(x => x.OriginalPerformanceJson).HasColumnType("jsonb").IsRequired();
            e.HasIndex(x => new { x.LabProtocolExecutionId, x.StepRecordId, x.RequestedAtUtc });
            e.HasOne<LabWorkOrder>().WithMany().HasForeignKey(x => x.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabSpecimen>().WithMany().HasForeignKey(x => x.LabSpecimenId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabProtocolExecution>().WithMany().HasForeignKey(x => x.LabProtocolExecutionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabPerformanceProposal>().WithMany().HasForeignKey(x => x.BasedOnProposalId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<LabPerformanceDecision>(e =>
        {
            e.ToTable("lab_performance_decisions", schema); e.HasKey(x => x.Id);
            e.Property(x => x.Reason).HasMaxLength(4000).IsRequired();
            e.HasOne<LabPerformanceProposal>().WithOne().HasForeignKey<LabPerformanceDecision>(x => x.Id).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<LabInvestigationReport>(e =>
        {
            e.ToTable("lab_investigation_reports", schema);
            e.HasKey(x => x.Id);
            e.Property(x => x.BodyJson).HasColumnType("text").IsRequired();
            e.Property(x => x.Sha256).HasMaxLength(64).IsRequired();
            e.HasIndex(x => new { x.LabWorkOrderId, x.LabSpecimenId, x.GeneratedAtUtc });
            e.HasOne<LabWorkOrder>().WithMany().HasForeignKey(x => x.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabSpecimen>().WithMany().HasForeignKey(x => x.LabSpecimenId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<LabSequencingOutput>(e =>
        {
            e.ToTable("lab_sequencing_outputs", schema);
            e.Property(x => x.LibraryPreparationChoice).HasMaxLength(32);
            e.HasIndex(x => new { x.LabSpecimenId, x.SequencingRunNumber });
            e.HasKey(x => x.Id);
            e.Property(x => x.ProviderKey).HasMaxLength(100).IsRequired();
            e.Property(x => x.ProviderRunReference).HasMaxLength(255).IsRequired();
            e.Property(x => x.SampleMappingReference).HasMaxLength(1000).IsRequired();
            e.Property(x => x.ExternalFileReference).HasMaxLength(1000).IsRequired();
            e.Property(x => x.Sha256).HasMaxLength(64).IsRequired();
            e.Property(x => x.RequestSha256).HasMaxLength(64).IsRequired();
            e.Property(x => x.ExternalIdentitySha256).HasMaxLength(64).IsRequired();
            e.Property(x => x.CorrectionReason).HasMaxLength(2000);
            e.Property(x => x.RecordedBySource).HasMaxLength(150).IsRequired();
            e.Property(x => x.LineageSnapshotJson).HasColumnType("jsonb").IsRequired();
            e.Property(x => x.ScientificEvidenceJson).HasColumnType("jsonb");
            e.HasIndex(x => new { x.LabWorkOrderId, x.LabSpecimenId, x.RecordedAtUtc });
            e.HasIndex(x => x.ExternalIdentitySha256).IsUnique();
            e.HasOne<LabWorkOrder>().WithMany().HasForeignKey(x => x.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabSpecimen>().WithMany().HasForeignKey(x => x.LabSpecimenId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabSpecimenAttempt>().WithMany().HasForeignKey(x => x.LabSpecimenAttemptId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabContainer>().WithMany().HasForeignKey(x => x.SourceContainerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabLibrary>().WithMany().HasForeignKey(x => x.LabLibraryId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabNgsSendout>().WithMany().HasForeignKey(x => x.LabNgsSendoutId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabSequencingOutput>().WithMany().HasForeignKey(x => x.CorrectsOutputId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<LabAnalysisRun>(e =>
        {
            e.Property(x => x.RequirementsSnapshotJson).HasColumnType("jsonb");
            e.ToTable("lab_analysis_runs", schema);
            e.HasKey(x => x.Id);
            e.Property(x => x.ProviderKey).HasMaxLength(100).IsRequired();
            e.Property(x => x.RunReference).HasMaxLength(255).IsRequired();
            e.Property(x => x.ScientificEvidenceJson).HasColumnType("jsonb");
            e.Property(x => x.ReanalysisReason).HasMaxLength(2000);
            e.Property(x => x.RequestSha256).HasMaxLength(64).IsRequired();
            e.Property(x => x.RecordedBySource).HasMaxLength(150).IsRequired();
            e.HasIndex(x => new { x.ProviderKey, x.RunReference, x.LabSpecimenId }).IsUnique();
            e.HasIndex(x => new { x.LabWorkOrderId, x.LabSpecimenId, x.RecordedAtUtc });
            e.HasOne<LabWorkOrder>().WithMany().HasForeignKey(x => x.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabSpecimen>().WithMany().HasForeignKey(x => x.LabSpecimenId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabSpecimenAttempt>().WithMany().HasForeignKey(x => x.LabSpecimenAttemptId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabAnalysisRun>().WithMany().HasForeignKey(x => x.PreviousAnalysisRunId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<LabAnalysisInput>(e =>
        {
            e.ToTable("lab_analysis_inputs", schema);
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.LabAnalysisRunId, x.LabSequencingOutputId }).IsUnique();
            e.HasOne<LabAnalysisRun>().WithMany().HasForeignKey(x => x.LabAnalysisRunId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabSequencingOutput>().WithMany().HasForeignKey(x => x.LabSequencingOutputId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<ResultOutputPackage>().HasOne<LabAnalysisRun>().WithMany()
            .HasForeignKey(x => x.LabAnalysisRunId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ResultOutputPackage>().ToTable(t => t.HasCheckConstraint("ck_result_package_required_lineage",
            "NOT traceability_required OR lab_analysis_run_id IS NOT NULL"));
        modelBuilder.Entity<LabResultRelease>().HasOne<LabAnalysisRun>().WithMany()
            .HasForeignKey(x => x.LabAnalysisRunId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<LabResultRelease>().ToTable(t => t.HasCheckConstraint("ck_lab_release_required_lineage",
            "NOT traceability_required OR (lab_analysis_run_id IS NOT NULL AND result_locator IS NOT NULL AND length(btrim(result_locator)) > 0)"));
        modelBuilder.Entity<LabResultRelease>().Property(x => x.ResultLocator).HasMaxLength(1000);
        modelBuilder.Entity<ResultArtifact>().Property(x => x.ResultLocator).HasMaxLength(1000);
        modelBuilder.Entity<LabMaterialConsumption>().Property(x => x.ResourceSnapshotJson).HasColumnType("jsonb");
        modelBuilder.Entity<LabEquipmentUsage>().Property(x => x.ResourceSnapshotJson).HasColumnType("jsonb");
        foreach (var type in new[] { typeof(LabScientificFile), typeof(LabSequencingOutput), typeof(LabAnalysisRun), typeof(LabAnalysisInput), typeof(LabInvestigationReport), typeof(LabPerformanceProposal), typeof(LabPerformanceDecision) })
            foreach (var property in modelBuilder.Entity(type).Metadata.GetProperties())
                property.SetAfterSaveBehavior(PropertySaveBehavior.Throw);
        foreach (var type in new[] { typeof(ResultOutputPackage), typeof(LabResultRelease) })
        {
            modelBuilder.Entity(type).Property(nameof(ResultOutputPackage.LabAnalysisRunId)).Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Throw);
            modelBuilder.Entity(type).Property(nameof(ResultOutputPackage.TraceabilityRequired)).Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Throw);
        }
        modelBuilder.Entity<ResultArtifact>().Property(x => x.ResultLocator).Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Throw);
        modelBuilder.Entity<LabResultRelease>().Property(x => x.ResultLocator).Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Throw);
        foreach (var name in new[] { nameof(ResultOutputPackage.ManifestJson), nameof(ResultOutputPackage.ManifestSha256), nameof(ResultOutputPackage.CorrectsPackageId) })
            modelBuilder.Entity<ResultOutputPackage>().Property(name).Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Throw);
    }
}
