namespace PhaenoPortal.App.Features.Crm;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Crm.Domain;

public static class CrmModelConfiguration
{
    private static readonly Guid GeneralPipelineId = Guid.Parse("20000000-0000-0000-0000-000000000001");
    private static readonly DateTime SeededAt = new(2026, 8, 26, 0, 0, 0, DateTimeKind.Utc);

    public static void Configure(ModelBuilder modelBuilder)
    {
        ConfigureCompany(modelBuilder);
        ConfigureContact(modelBuilder);
        ConfigureLead(modelBuilder);
        ConfigurePipeline(modelBuilder);
        ConfigureOpportunity(modelBuilder);
        ConfigureActivityAndTask(modelBuilder);
        ConfigureAdministration(modelBuilder);
        ConfigureHandoff(modelBuilder);
    }

    private static void ConfigureCompany(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CrmCompany>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Name).HasMaxLength(255).IsRequired();
            entity.Property(value => value.WebsiteUrl).HasMaxLength(2048);
            entity.Property(value => value.DomainName).HasMaxLength(253);
            entity.Property(value => value.Phone).HasMaxLength(50);
            entity.Property(value => value.Industry).HasMaxLength(150);
            entity.Property(value => value.Description).HasMaxLength(2000);
            entity.Property(value => value.AddressLine1).HasMaxLength(255);
            entity.Property(value => value.AddressLine2).HasMaxLength(255);
            entity.Property(value => value.City).HasMaxLength(150);
            entity.Property(value => value.Region).HasMaxLength(150);
            entity.Property(value => value.PostalCode).HasMaxLength(30);
            entity.Property(value => value.CountryCode).HasMaxLength(2);
            ConfigureEnum(entity.Property(value => value.LifecycleState), 50);
            entity.Property(value => value.Source).HasMaxLength(150);
            ConfigureTags(entity.Property(value => value.Tags));
            ConfigureTags(entity.Property(value => value.Aliases));
            ConfigureAudit(entity);
            entity.HasIndex(value => value.Name);
            entity.HasIndex(value => value.DomainName);
            entity.HasIndex(value => new { value.IsActive, value.Name });
            entity.HasIndex(value => value.LifecycleState);
            entity.HasOne(value => value.Owner).WithMany().HasForeignKey(value => value.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.MergedIntoCompany).WithMany().HasForeignKey(value => value.MergedIntoCompanyId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureContact(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CrmContact>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.FirstName).HasMaxLength(100).IsRequired();
            entity.Property(value => value.LastName).HasMaxLength(100).IsRequired();
            entity.Property(value => value.Email).HasMaxLength(255);
            entity.Property(value => value.NormalizedEmail).HasMaxLength(255);
            entity.Property(value => value.Phone).HasMaxLength(50);
            entity.Property(value => value.JobTitle).HasMaxLength(150);
            ConfigureEnum(entity.Property(value => value.CommunicationPreference), 50);
            entity.Property(value => value.LawfulContactBasis).HasMaxLength(255);
            entity.Property(value => value.CommunicationNotes).HasMaxLength(1000);
            ConfigureTags(entity.Property(value => value.Tags));
            ConfigureTags(entity.Property(value => value.Aliases));
            ConfigureAudit(entity);
            entity.Ignore(value => value.DisplayName);
            entity.HasIndex(value => new { value.LastName, value.FirstName });
            entity.HasIndex(value => value.NormalizedEmail);
            entity.HasIndex(value => new { value.IsActive, value.LastName });
            entity.HasOne(value => value.Owner).WithMany().HasForeignKey(value => value.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.MergedIntoContact).WithMany().HasForeignKey(value => value.MergedIntoContactId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CrmCompanyContact>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.RelationshipRole).HasMaxLength(150);
            ConfigureAudit(entity);
            entity.HasIndex(value => new { value.CompanyId, value.ContactId })
                .IsUnique()
                .HasFilter("is_active = TRUE");
            entity.HasIndex(value => new { value.ContactId, value.IsPrimaryCompany })
                .IsUnique()
                .HasFilter("is_active = TRUE AND is_primary_company = TRUE");
            entity.HasOne(value => value.Company).WithMany().HasForeignKey(value => value.CompanyId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.Contact).WithMany().HasForeignKey(value => value.ContactId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureLead(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CrmLead>(entity =>
        {
            entity.HasKey(value => value.Id);
            ConfigureEnum(entity.Property(value => value.Kind), 50);
            ConfigureEnum(entity.Property(value => value.Status), 50);
            entity.Property(value => value.DisplayName).HasMaxLength(255).IsRequired();
            entity.Property(value => value.CompanyName).HasMaxLength(255);
            entity.Property(value => value.FirstName).HasMaxLength(100);
            entity.Property(value => value.LastName).HasMaxLength(100);
            entity.Property(value => value.Email).HasMaxLength(255);
            entity.Property(value => value.NormalizedEmail).HasMaxLength(255);
            entity.Property(value => value.Phone).HasMaxLength(50);
            entity.Property(value => value.Source).HasMaxLength(150);
            entity.Property(value => value.QualificationNotes).HasMaxLength(2000);
            entity.Property(value => value.DisqualificationReason).HasMaxLength(1000);
            entity.Property(value => value.NextAction).HasMaxLength(1000);
            ConfigureTags(entity.Property(value => value.Tags));
            ConfigureAudit(entity);
            entity.HasIndex(value => new { value.IsActive, value.Status });
            entity.HasIndex(value => value.NormalizedEmail);
            entity.HasIndex(value => value.CompanyName);
            entity.HasOne(value => value.Owner).WithMany().HasForeignKey(value => value.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigurePipeline(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CrmPipeline>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Name).HasMaxLength(150).IsRequired();
            entity.Property(value => value.Description).HasMaxLength(1000);
            ConfigureAudit(entity);
            entity.HasIndex(value => value.Name).IsUnique();
            entity.HasIndex(value => value.IsDefault).IsUnique().HasFilter("is_default = TRUE");
            entity.HasData(new
            {
                Id = GeneralPipelineId,
                Name = "General Sales",
                Description = "Default standalone commercial opportunity pipeline.",
                IsDefault = true,
                IsActive = true,
                CreatedAt = SeededAt,
                CreatedByUserId = (Guid?)null,
                UpdatedAt = SeededAt,
                UpdatedByUserId = (Guid?)null,
                Version = 1L
            });
        });

        modelBuilder.Entity<CrmPipelineStage>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Name).HasMaxLength(150).IsRequired();
            ConfigureEnum(entity.Property(value => value.Category), 50);
            ConfigureAudit(entity);
            entity.HasIndex(value => new { value.PipelineId, value.Position }).IsUnique();
            entity.HasIndex(value => new { value.PipelineId, value.Name }).IsUnique();
            entity.HasOne(value => value.Pipeline).WithMany(value => value.Stages).HasForeignKey(value => value.PipelineId).OnDelete(DeleteBehavior.Restrict);
            entity.HasData(DefaultStage("20000000-0000-0000-0000-000000000011", "Discovery", 10, CrmPipelineStageCategory.Open, 10, false));
            entity.HasData(DefaultStage("20000000-0000-0000-0000-000000000012", "Qualified", 20, CrmPipelineStageCategory.Open, 25, false));
            entity.HasData(DefaultStage("20000000-0000-0000-0000-000000000013", "Proposal", 30, CrmPipelineStageCategory.Open, 50, false));
            entity.HasData(DefaultStage("20000000-0000-0000-0000-000000000014", "Negotiation", 40, CrmPipelineStageCategory.Open, 75, false));
            entity.HasData(DefaultStage("20000000-0000-0000-0000-000000000015", "Won", 50, CrmPipelineStageCategory.Won, 100, false));
            entity.HasData(DefaultStage("20000000-0000-0000-0000-000000000016", "Lost", 60, CrmPipelineStageCategory.Lost, 0, true));
            entity.HasData(DefaultStage("20000000-0000-0000-0000-000000000017", "Abandoned", 70, CrmPipelineStageCategory.Abandoned, 0, true));
        });
    }

    private static void ConfigureOpportunity(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CrmOpportunity>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Name).HasMaxLength(255).IsRequired();
            entity.Property(value => value.ProductInterest).HasMaxLength(255);
            entity.Property(value => value.Amount).HasPrecision(18, 2);
            entity.Property(value => value.Currency).HasMaxLength(3).IsRequired();
            entity.Property(value => value.NextStep).HasMaxLength(1000);
            entity.Property(value => value.Competitors).HasMaxLength(1000);
            entity.Property(value => value.Description).HasMaxLength(2000);
            entity.Property(value => value.OutcomeReason).HasMaxLength(1000);
            ConfigureTags(entity.Property(value => value.Tags));
            ConfigureAudit(entity);
            entity.HasIndex(value => new { value.PipelineId, value.StageId });
            entity.HasIndex(value => new { value.CompanyId, value.IsActive });
            entity.HasIndex(value => value.ExpectedCloseDate);
            entity.HasOne(value => value.Company).WithMany().HasForeignKey(value => value.CompanyId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.Pipeline).WithMany().HasForeignKey(value => value.PipelineId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.Stage).WithMany().HasForeignKey(value => value.StageId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.Owner).WithMany().HasForeignKey(value => value.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CrmOpportunityContact>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Role).HasMaxLength(150);
            ConfigureAudit(entity);
            entity.HasIndex(value => new { value.OpportunityId, value.ContactId }).IsUnique();
            entity.HasIndex(value => new { value.OpportunityId, value.IsPrimary }).IsUnique().HasFilter("is_primary = TRUE AND is_active = TRUE");
            entity.HasOne(value => value.Opportunity).WithMany().HasForeignKey(value => value.OpportunityId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.Contact).WithMany().HasForeignKey(value => value.ContactId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CrmOpportunityStageHistory>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Reason).HasMaxLength(1000);
            entity.HasIndex(value => new { value.OpportunityId, value.ChangedAt });
            entity.HasOne(value => value.Opportunity).WithMany().HasForeignKey(value => value.OpportunityId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.FromStage).WithMany().HasForeignKey(value => value.FromStageId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.ToStage).WithMany().HasForeignKey(value => value.ToStageId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.ChangedByUser).WithMany().HasForeignKey(value => value.ChangedByUserId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureActivityAndTask(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CrmActivity>(entity =>
        {
            entity.HasKey(value => value.Id);
            ConfigureEnum(entity.Property(value => value.Type), 50);
            ConfigureEnum(entity.Property(value => value.Visibility), 50);
            entity.Property(value => value.Subject).HasMaxLength(255).IsRequired();
            entity.Property(value => value.Body).HasMaxLength(4000);
            ConfigureAudit(entity);
            entity.HasIndex(value => value.OccurredAt);
            entity.HasIndex(value => new { value.CompanyId, value.OccurredAt });
            entity.HasIndex(value => new { value.ContactId, value.OccurredAt });
            entity.HasIndex(value => new { value.LeadId, value.OccurredAt });
            entity.HasIndex(value => new { value.OpportunityId, value.OccurredAt });
            entity.HasOne(value => value.ActorUser).WithMany().HasForeignKey(value => value.ActorUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.Company).WithMany().HasForeignKey(value => value.CompanyId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.Contact).WithMany().HasForeignKey(value => value.ContactId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.Lead).WithMany().HasForeignKey(value => value.LeadId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.Opportunity).WithMany().HasForeignKey(value => value.OpportunityId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CrmTask>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Title).HasMaxLength(255).IsRequired();
            entity.Property(value => value.Description).HasMaxLength(2000);
            ConfigureEnum(entity.Property(value => value.Priority), 50);
            ConfigureEnum(entity.Property(value => value.Status), 50);
            entity.Property(value => value.RecurrenceRule).HasMaxLength(255);
            entity.Property(value => value.BlockedReason).HasMaxLength(1000);
            ConfigureAudit(entity);
            entity.HasIndex(value => new { value.OwnerUserId, value.Status, value.DueAt });
            entity.HasIndex(value => value.ReminderAt);
            entity.HasIndex(value => value.CompanyId);
            entity.HasIndex(value => value.ContactId);
            entity.HasIndex(value => value.LeadId);
            entity.HasIndex(value => value.OpportunityId);
            entity.HasOne(value => value.Owner).WithMany().HasForeignKey(value => value.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.Company).WithMany().HasForeignKey(value => value.CompanyId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.Contact).WithMany().HasForeignKey(value => value.ContactId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.Lead).WithMany().HasForeignKey(value => value.LeadId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.Opportunity).WithMany().HasForeignKey(value => value.OpportunityId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureAdministration(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CrmSavedView>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Name).HasMaxLength(150).IsRequired();
            ConfigureEnum(entity.Property(value => value.RecordType), 50);
            entity.Property(value => value.FilterJson).HasColumnType("jsonb").IsRequired();
            ConfigureAudit(entity);
            entity.HasIndex(value => new { value.OwnerUserId, value.RecordType, value.Name }).IsUnique();
            entity.HasOne(value => value.Owner).WithMany().HasForeignKey(value => value.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CrmCustomFieldDefinition>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Name).HasMaxLength(150).IsRequired();
            ConfigureEnum(entity.Property(value => value.RecordType), 50);
            ConfigureEnum(entity.Property(value => value.DataType), 50);
            ConfigureEnum(entity.Property(value => value.Sensitivity), 50);
            entity.Property(value => value.OptionsJson).HasColumnType("jsonb");
            ConfigureAudit(entity);
            entity.HasIndex(value => new { value.RecordType, value.Name }).IsUnique();
        });

        modelBuilder.Entity<CrmCustomFieldValue>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.ValueJson).HasColumnType("jsonb").IsRequired();
            ConfigureAudit(entity);
            entity.HasIndex(value => new { value.DefinitionId, value.RecordId }).IsUnique();
            entity.HasOne(value => value.Definition).WithMany().HasForeignKey(value => value.DefinitionId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CrmMergeRecord>(entity =>
        {
            entity.HasKey(value => value.Id);
            ConfigureEnum(entity.Property(value => value.RecordType), 50);
            entity.Property(value => value.Reason).HasMaxLength(1000).IsRequired();
            entity.HasIndex(value => new { value.RecordType, value.SourceRecordId }).IsUnique();
            entity.HasOne(value => value.MergedByUser).WithMany().HasForeignKey(value => value.MergedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CrmImportBatch>(entity =>
        {
            entity.HasKey(value => value.Id);
            ConfigureEnum(entity.Property(value => value.RecordType), 50);
            ConfigureEnum(entity.Property(value => value.Status), 50);
            entity.Property(value => value.IdempotencyKey).HasMaxLength(255).IsRequired();
            entity.Property(value => value.FileName).HasMaxLength(255).IsRequired();
            entity.Property(value => value.RowsJson).HasColumnType("jsonb").IsRequired();
            entity.Property(value => value.ErrorReportJson).HasColumnType("jsonb");
            ConfigureAudit(entity);
            entity.HasIndex(value => value.IdempotencyKey).IsUnique();
        });

        modelBuilder.Entity<CrmExportRecord>(entity =>
        {
            entity.HasKey(value => value.Id);
            ConfigureEnum(entity.Property(value => value.RecordType), 50);
            entity.Property(value => value.FilterJson).HasColumnType("jsonb").IsRequired();
            entity.HasIndex(value => value.RequestedAt);
            entity.HasOne(value => value.RequestedByUser).WithMany().HasForeignKey(value => value.RequestedByUserId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureHandoff(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CrmHandoff>(entity =>
        {
            entity.HasKey(value => value.Id);
            ConfigureEnum(entity.Property(value => value.Type), 50);
            entity.Property(value => value.IdempotencyKey).HasMaxLength(255).IsRequired();
            ConfigureAudit(entity);
            entity.HasIndex(value => value.IdempotencyKey).IsUnique();
            entity.HasIndex(value => value.RelationshipRequestId).IsUnique();
            entity.HasOne(value => value.Company).WithMany().HasForeignKey(value => value.CompanyId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.Opportunity).WithMany().HasForeignKey(value => value.OpportunityId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.RelationshipRequest).WithMany().HasForeignKey(value => value.RelationshipRequestId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CrmPortalAccountLink>(entity =>
        {
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Reason).HasMaxLength(1000).IsRequired();
            ConfigureAudit(entity);
            entity.HasIndex(value => new { value.CompanyId, value.OrganizationId }).IsUnique();
            entity.HasIndex(value => value.OrganizationId);
            entity.HasOne(value => value.Company).WithMany().HasForeignKey(value => value.CompanyId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.Organization).WithMany().HasForeignKey(value => value.OrganizationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(value => value.LinkedByUser).WithMany().HasForeignKey(value => value.LinkedByUserId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static object DefaultStage(string id, string name, int position, CrmPipelineStageCategory category, int probability, bool requiresReason) => new
    {
        Id = Guid.Parse(id),
        PipelineId = GeneralPipelineId,
        Name = name,
        Position = position,
        Category = category,
        Probability = probability,
        RequiresReason = requiresReason,
        IsActive = true,
        CreatedAt = SeededAt,
        CreatedByUserId = (Guid?)null,
        UpdatedAt = SeededAt,
        UpdatedByUserId = (Guid?)null,
        Version = 1L
    };

    private static void ConfigureAudit<TEntity>(Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntity> entity)
        where TEntity : class
    {
        entity.Property("CreatedAt").IsRequired();
        entity.Property<Guid?>("CreatedByUserId");
        entity.Property("UpdatedAt").IsRequired();
        entity.Property<Guid?>("UpdatedByUserId");
        entity.Property("Version").IsRequired().IsConcurrencyToken();
    }

    private static void ConfigureEnum<TEnum>(Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<TEnum> property, int maximumLength)
        where TEnum : struct, Enum => property.IsRequired().HasConversion<string>().HasMaxLength(maximumLength);

    private static void ConfigureTags(Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<string[]> property) =>
        property.HasColumnType("text[]").HasDefaultValueSql("ARRAY[]::text[]").IsRequired();
}
