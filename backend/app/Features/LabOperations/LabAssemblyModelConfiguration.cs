namespace PhaenoPortal.App.Features.LabOperations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using PSeq.Operations.Laboratory.Domain;

internal static class LabAssemblyModelConfiguration
{
    public static void Configure(ModelBuilder model, string schema)
    {
        model.Entity<LabAssemblyJob>(e =>
        {
            e.ToTable("lab_assembly_jobs", schema); e.HasKey(x => x.Id); e.Ignore(x => x.IsTerminal);
            e.Property(x => x.Version).IsConcurrencyToken();
            e.Property(x => x.State).HasMaxLength(32);
            e.Property(x => x.ProviderKey).HasMaxLength(100);
            e.Property(x => x.ProviderJobId).HasMaxLength(255);
            e.Property(x => x.RequestSha256).HasMaxLength(64);
            foreach (var field in new[] { "RecipeJson", "InputsJson", "OutputManifestJson" }) e.Property<string>(field).HasColumnType("jsonb");
            foreach (var field in new[] { "RetryReason", "CancellationReason", "DispositionReason", "AttentionReason" }) e.Property<string>(field).HasMaxLength(2000);
            e.HasIndex(x => new { x.LabSpecimenId, x.SequencingRunNumber }).IsUnique()
                .HasFilter("state NOT IN ('Succeeded', 'Failed', 'Terminated', 'CancelledBeforeStart')");
            e.HasIndex(x => new { x.State, x.RequestedAtUtc });
            e.HasIndex(x => new { x.ProviderKey, x.ProviderJobId }).IsUnique().HasFilter("provider_job_id IS NOT NULL");
            e.HasIndex(x => x.LabAnalysisRunId).IsUnique().HasFilter("lab_analysis_run_id IS NOT NULL");
            e.HasOne<LabWorkOrder>().WithMany().HasForeignKey(x => x.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabSpecimen>().WithMany().HasForeignKey(x => x.LabSpecimenId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabAssemblyJob>().WithMany().HasForeignKey(x => x.PreviousJobId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabAnalysisRun>().WithMany().HasForeignKey(x => x.LabAnalysisRunId).OnDelete(DeleteBehavior.Restrict);
            foreach (var name in new[] { "LabWorkOrderId", "LabSpecimenId", "OrganizationId", "SequencingRunNumber", "PreviousJobId", "RetryReason",
                "RequestedByUserId", "RequestedAtUtc", "ProviderKey", "RecipeJson", "InputsJson", "RequestSha256" })
                e.Property(name).Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Throw);
        });
        model.Entity<LabAssemblyEvent>(e =>
        {
            e.ToTable("lab_assembly_events", schema); e.HasKey(x => x.Id);
            e.Property(x => x.Kind).HasMaxLength(60); e.Property(x => x.EvidenceJson).HasColumnType("jsonb");
            e.HasIndex(x => new { x.LabAssemblyJobId, x.RecordedAtUtc });
            e.HasOne<LabAssemblyJob>().WithMany().HasForeignKey(x => x.LabAssemblyJobId).OnDelete(DeleteBehavior.Restrict);
            foreach (var property in e.Metadata.GetProperties()) property.SetAfterSaveBehavior(PropertySaveBehavior.Throw);
        });
        model.Entity<LabAssemblyCommand>(e =>
        {
            e.ToTable("lab_assembly_commands", schema); e.HasKey(x => x.Id);
            e.Property(x => x.Kind).HasMaxLength(16);
            e.HasIndex(x => new { x.LabAssemblyJobId, x.Kind }).IsUnique();
            e.HasIndex(x => new { x.ConfirmedAtUtc, x.NextAttemptAtUtc });
            e.HasOne<LabAssemblyJob>().WithMany().HasForeignKey(x => x.LabAssemblyJobId).OnDelete(DeleteBehavior.Restrict);
            foreach (var name in new[] { "LabAssemblyJobId", "Kind", "RequestedAtUtc" })
                e.Property(name).Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Throw);
        });
        model.Entity<LabAssemblyReceipt>(e =>
        {
            e.ToTable("lab_assembly_receipts", schema); e.HasKey(x => x.Id); e.Ignore(x => x.CanAcknowledge);
            e.Property(x => x.ProviderKey).HasMaxLength(100); e.Property(x => x.ProviderEventId).HasMaxLength(128);
            e.Property(x => x.PayloadSha256).HasMaxLength(64); e.Property(x => x.ConflictSha256).HasMaxLength(64);
            e.Property(x => x.PayloadJson).HasColumnType("jsonb"); e.Property(x => x.Outcome).HasMaxLength(16);
            e.HasIndex(x => new { x.ProviderKey, x.ProviderEventId }).IsUnique();
            e.HasIndex(x => new { x.LabAssemblyJobId, x.Sequence });
            e.HasOne<LabAssemblyJob>().WithMany().HasForeignKey(x => x.LabAssemblyJobId).OnDelete(DeleteBehavior.Restrict);
            foreach (var property in e.Metadata.GetProperties().Where(p => p.Name is not ("ConflictSha256" or "ConflictRecordedAtUtc")))
                property.SetAfterSaveBehavior(PropertySaveBehavior.Throw);
        });
    }
}
