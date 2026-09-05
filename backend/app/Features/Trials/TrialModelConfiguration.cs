namespace PhaenoPortal.App.Features.Trials;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Common.Persistence;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.Trials.Domain;
using PSeq.Operations.Laboratory.Domain;

public static class TrialModelConfiguration
{
    public static void Configure(ModelBuilder model)
    {
        Type[] types = [typeof(TrialProject), typeof(TrialScope), typeof(TrialDecision), typeof(TrialApprovalAuthority),
            typeof(TrialDeliverableDefinition), typeof(TrialSample), typeof(TrialReplacementAuthorization), typeof(TrialResultRelease), typeof(TrialEvent), typeof(TrialResultFile)];
        foreach (var type in types)
        {
            var entity = model.Entity(type); entity.HasKey("Id");
            foreach (var property in type.GetProperties().Where(value => value.PropertyType == typeof(string)))
            {
                var mapped = entity.Property(property.Name);
                if (property.Name.EndsWith("Json")) mapped.HasColumnType("jsonb"); else mapped.HasMaxLength(4000);
            }
            foreach (var property in type.GetProperties().Where(value => (Nullable.GetUnderlyingType(value.PropertyType) ?? value.PropertyType).IsEnum))
                entity.Property(property.Name).HasConversion<string>().HasMaxLength(50);
            if (typeof(IConcurrency).IsAssignableFrom(type)) entity.Property("Version").IsConcurrencyToken();
            foreach (var property in type.GetProperties().Where(value => value.Name.EndsWith("UserId")))
                entity.HasOne(typeof(User)).WithMany().HasForeignKey(property.Name).OnDelete(DeleteBehavior.Restrict);
        }
        model.Entity<TrialProject>(e =>
        {
            e.Ignore(value => value.IsTerminal);
            e.HasIndex(value => value.Number).IsUnique(); e.HasIndex(value => value.CrmHandoffId).IsUnique();
            e.HasIndex(value => new { value.OrganizationId, value.DepartmentId, value.Status });
            e.HasOne<CrmHandoff>().WithMany().HasForeignKey(value => value.CrmHandoffId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<CrmCompany>().WithMany().HasForeignKey(value => value.CompanyId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<CrmOpportunity>().WithMany().HasForeignKey(value => value.OpportunityId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Organization>().WithMany().HasForeignKey(value => value.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<OrganizationDepartment>().WithMany().HasForeignKey(value => value.DepartmentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<TrialResultRelease>().WithMany().HasForeignKey(value => value.CompleteReleaseId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<TrialScope>(e =>
        {
            e.Ignore(value => value.IsApproved); e.HasIndex(value => new { value.TrialProjectId, value.Revision }).IsUnique();
            e.HasOne<TrialProject>().WithMany(value => value.Scopes).HasForeignKey(value => value.TrialProjectId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<TrialDecision>(e =>
        {
            e.HasIndex(value => new { value.TrialScopeId, value.Domain }).IsUnique();
            e.HasOne<TrialScope>().WithMany(value => value.Decisions).HasForeignKey(value => value.TrialScopeId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<TrialApprovalAuthority>().WithMany().HasForeignKey(value => value.AuthorityId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<TrialApprovalAuthority>(e =>
        {
            e.HasIndex(value => new { value.UserId, value.Domain }).IsUnique().HasFilter("revoked_at_utc IS NULL");
            e.HasIndex(value => value.Domain).IsUnique().HasFilter("is_primary AND revoked_at_utc IS NULL");
            e.HasOne<TrialApprovalAuthority>().WithMany().HasForeignKey(value => value.PrimaryAuthorityId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<TrialDeliverableDefinition>(e =>
        {
            e.HasIndex(value => new { value.Key, value.Revision }).IsUnique();
            e.HasIndex(value => value.Key).IsUnique().HasFilter("is_active");
            var date = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc);
            e.HasData(new { Id = Guid.Parse("87c083a2-8039-4d9a-9b61-4ec577e1a001"), Key = "FASTQ", Name = "FASTQ sequencing reads", Revision = 1, IsActive = true, IsDefault = true, CreatedAt = date, UpdatedAt = date, Version = 1L },
                new { Id = Guid.Parse("87c083a2-8039-4d9a-9b61-4ec577e1a002"), Key = "FASTA", Name = "FASTA sequences", Revision = 1, IsActive = true, IsDefault = true, CreatedAt = date, UpdatedAt = date, Version = 1L },
                new { Id = Guid.Parse("87c083a2-8039-4d9a-9b61-4ec577e1a003"), Key = "BAM", Name = "BAM alignments", Revision = 1, IsActive = true, IsDefault = true, CreatedAt = date, UpdatedAt = date, Version = 1L });
        });
        model.Entity<TrialSample>(e =>
        {
            e.Ignore(value => value.HasSuccessfulResult); e.HasIndex(value => new { value.TrialProjectId, value.Reference }).IsUnique();
            e.HasIndex(value => value.AuthorizationId); e.HasIndex(value => value.LabWorkOrderId);
            e.HasOne<TrialProject>().WithMany(value => value.Samples).HasForeignKey(value => value.TrialProjectId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<TrialSample>().WithMany().HasForeignKey(value => value.ReplacesSampleId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<TrialReplacementAuthorization>().WithMany().HasForeignKey(value => value.ReplacementAuthorizationId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<LabWorkOrder>().WithMany().HasForeignKey(value => value.LabWorkOrderId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<TrialReplacementAuthorization>(e =>
        {
            e.HasIndex(value => value.OriginalSampleId).IsUnique();
            e.HasOne<TrialProject>().WithMany().HasForeignKey(value => value.TrialProjectId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<TrialSample>().WithMany().HasForeignKey(value => value.OriginalSampleId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<TrialSample>().WithMany().HasForeignKey(value => value.UsedBySampleId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<TrialResultRelease>(e =>
        {
            e.HasIndex(value => new { value.TrialProjectId, value.ReleaseVersion }).IsUnique();
            e.HasOne<TrialProject>().WithMany().HasForeignKey(value => value.TrialProjectId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Organization>().WithMany().HasForeignKey(value => value.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<OrganizationDepartment>().WithMany().HasForeignKey(value => value.DepartmentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<TrialResultRelease>().WithMany().HasForeignKey(value => value.SupersedesReleaseId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<TrialEvent>(e =>
        {
            e.HasIndex(value => new { value.TrialProjectId, value.OccurredAtUtc });
            e.HasOne<TrialProject>().WithMany().HasForeignKey(value => value.TrialProjectId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<TrialResultFile>(e =>
        {
            e.HasIndex(value => value.ResultArtifactId).IsUnique(); e.HasIndex(value => value.ManagedOperationalFileId).IsUnique();
            e.HasOne<TrialSample>().WithMany().HasForeignKey(value => value.TrialSampleId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<PSeq.Operations.Commercial.OrderManagement.Domain.ResultOutputPackage>().WithMany().HasForeignKey(value => value.ResultOutputPackageId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<PSeq.Operations.Commercial.OrderManagement.Domain.ResultArtifact>().WithMany().HasForeignKey(value => value.ResultArtifactId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<OrderManagement.Domain.ManagedOperationalFile>().WithMany().HasForeignKey(value => value.ManagedOperationalFileId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
