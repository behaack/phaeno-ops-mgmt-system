using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.DataProvisioning;
using PhaenoPortal.App.Features.DataProvisioning.Domain;
using PhaenoPortal.App.Features.OrderManagement;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.RelationshipManagement;
using PhaenoPortal.App.Features.RelationshipManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using System.Text;

namespace PhaenoPortal.App.Infrastructure.Persistence;

public sealed class PSeqOperationsDbContext(
    DbContextOptions<PSeqOperationsDbContext> options,
    IOptions<PersistenceOptions> persistenceOptions) : DbContext(options)
{
    private readonly PersistenceOptions persistenceOptions = persistenceOptions.Value.Validate();

    /// <summary>
    /// Organizations in the system.
    /// </summary>
    public DbSet<Organization> Organizations { get; set; }

    /// <summary>
    /// Users in the system.
    /// </summary>
    public DbSet<User> Users { get; set; }

    /// <summary>
    /// Organization memberships in the system.
    /// </summary>
    public DbSet<OrganizationMembership> OrganizationMemberships { get; set; }

    /// <summary>
    /// Invitations to create or reactivate organization memberships.
    /// </summary>
    public DbSet<OrganizationInvitation> OrganizationInvitations { get; set; }

    /// <summary>
    /// Append-only audit events for persisted entity changes.
    /// </summary>
    public DbSet<AuditEvent> AuditEvents { get; set; }

    public DbSet<SourceSample> SourceSamples { get; set; }

    public DbSet<ManagedFile> ManagedFiles { get; set; }

    public DbSet<CuratedDataset> CuratedDatasets { get; set; }

    public DbSet<CuratedDatasetVersion> CuratedDatasetVersions { get; set; }

    public DbSet<CuratedDatasetVersionFile> CuratedDatasetVersionFiles { get; set; }

    public DbSet<OrganizationDatasetGrant> OrganizationDatasetGrants { get; set; }

    public DbSet<ProvisioningRun> ProvisioningRuns { get; set; }

    public DbSet<DatasetDownloadAudit> DatasetDownloadAudits { get; set; }

    public DbSet<DataGovernanceIncident> DataGovernanceIncidents { get; set; }

    public DbSet<DataGovernanceAffectedVersion> DataGovernanceAffectedVersions { get; set; }

    public DbSet<DataGovernanceAffectedOrganization> DataGovernanceAffectedOrganizations { get; set; }

    public DbSet<DataGovernanceFollowUp> DataGovernanceFollowUps { get; set; }

    public DbSet<DataProvisioningNotice> DataProvisioningNotices { get; set; }

    public DbSet<QboCatalogItem> QboCatalogItems { get; set; }
    public DbSet<AnalysisDefinition> AnalysisDefinitions { get; set; }
    public DbSet<PartnerReagentOffering> PartnerReagentOfferings { get; set; }
    public DbSet<AssemblyProfile> AssemblyProfiles { get; set; }
    public DbSet<OrganizationCommercialProfile> OrganizationCommercialProfiles { get; set; }
    public DbSet<OrderSystemConfiguration> OrderSystemConfigurations { get; set; }
    public DbSet<CommercialDocumentLink> CommercialDocumentLinks { get; set; }
    public DbSet<OrderOutboxMessage> OrderOutboxMessages { get; set; }
    public DbSet<OrderIdempotencyRecord> OrderIdempotencyRecords { get; set; }
    public DbSet<ManagedOperationalFile> ManagedOperationalFiles { get; set; }
    public DbSet<OperationalFileDownload> OperationalFileDownloads { get; set; }
    public DbSet<OrderNotification> OrderNotifications { get; set; }
    public DbSet<OrderStatusEvent> OrderStatusEvents { get; set; }
    public DbSet<OrderCancellationRequest> OrderCancellationRequests { get; set; }
    public DbSet<LabServiceOrder> LabServiceOrders { get; set; }
    public DbSet<LabServiceRequestRevision> LabServiceRequestRevisions { get; set; }
    public DbSet<LabSample> LabSamples { get; set; }
    public DbSet<LabServiceQuote> LabServiceQuotes { get; set; }
    public DbSet<LabResultRelease> LabResultReleases { get; set; }
    public DbSet<PartnerShippingAddress> PartnerShippingAddresses { get; set; }
    public DbSet<PartnerReagentOrder> PartnerReagentOrders { get; set; }
    public DbSet<PartnerReagentOrderLine> PartnerReagentOrderLines { get; set; }
    public DbSet<ReagentShipment> ReagentShipments { get; set; }
    public DbSet<ReagentShipmentLine> ReagentShipmentLines { get; set; }
    public DbSet<ReagentOrderAdjustment> ReagentOrderAdjustments { get; set; }
    public DbSet<DataAssemblyRequest> DataAssemblyRequests { get; set; }
    public DbSet<AssemblyInputRevision> AssemblyInputRevisions { get; set; }
    public DbSet<DataAssemblyQuote> DataAssemblyQuotes { get; set; }
    public DbSet<AssemblyProcessingRun> AssemblyProcessingRuns { get; set; }
    public DbSet<AssemblyOutputRelease> AssemblyOutputReleases { get; set; }
    public DbSet<OrganizationServiceEntitlement> OrganizationServiceEntitlements { get; set; }
    public DbSet<PortalIntegrationRequest> PortalIntegrationRequests { get; set; }
    public DbSet<PortalIntegrationRequestService> PortalIntegrationRequestServices { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configure Organization entity
        modelBuilder.Entity<Organization>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Kind)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(50);
            entity.Property(e => e.PortalReadiness)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(50);
            entity.Property(e => e.PortalReadinessNote).HasMaxLength(2000);
            entity.Property(e => e.IsActive).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.CreatedByUserId);
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.Property(e => e.UpdatedByUserId);
            entity.Property(e => e.Version)
                .IsRequired()
                .IsConcurrencyToken();

            entity.HasMany(e => e.Memberships)
                .WithOne(m => m.Organization)
                .HasForeignKey(m => m.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // Create unique index on Name
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // Configure User entity
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.NormalizedEmail).IsRequired().HasMaxLength(255);
            entity.Property(e => e.ExternalIdentityProvider).HasMaxLength(100);
            entity.Property(e => e.ExternalSubjectId).HasMaxLength(255);
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.IsActive).IsRequired();
            entity.Property(e => e.Status)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(50);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.CreatedByUserId);
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.Property(e => e.UpdatedByUserId);
            entity.Property(e => e.LastLoginAt);
            entity.Property(e => e.Version)
                .IsRequired()
                .IsConcurrencyToken();

            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.NormalizedEmail).IsUnique();
            entity.HasIndex(e => new { e.ExternalIdentityProvider, e.ExternalSubjectId })
                .IsUnique()
                .HasFilter("\"external_identity_provider\" IS NOT NULL AND \"external_subject_id\" IS NOT NULL");
        });

        modelBuilder.Entity<OrganizationMembership>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.IsOrganizationAdmin).IsRequired();
            entity.Property(e => e.IsActive).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.CreatedByUserId);
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.Property(e => e.UpdatedByUserId);
            entity.Property(e => e.Version)
                .IsRequired()
                .IsConcurrencyToken();

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.OrganizationId);
            entity.HasIndex(e => new { e.UserId, e.OrganizationId }).IsUnique();

            entity.HasOne(e => e.User)
                .WithMany(u => u.Memberships)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Organization)
                .WithMany(o => o.Memberships)
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<OrganizationInvitation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.NormalizedEmail).IsRequired().HasMaxLength(255);
            entity.Property(e => e.IsOrganizationAdmin).IsRequired();
            entity.Property(e => e.TokenHash).IsRequired().HasMaxLength(512);
            entity.Property(e => e.ExpiresAt).IsRequired();
            entity.Property(e => e.Status)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(50);
            entity.Property(e => e.LastEmailProviderMessageId).HasMaxLength(255);
            entity.Property(e => e.LastSendError).HasMaxLength(2000);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.CreatedByUserId);
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.Property(e => e.UpdatedByUserId);
            entity.Property(e => e.Version)
                .IsRequired()
                .IsConcurrencyToken();

            entity.HasIndex(e => e.OrganizationId);
            entity.HasIndex(e => e.NormalizedEmail);
            entity.HasIndex(e => new { e.OrganizationId, e.NormalizedEmail, e.Status })
                .IsUnique()
                .HasFilter("\"status\" = 'Pending'");
            entity.HasIndex(e => e.TokenHash).IsUnique();

            entity.HasOne(e => e.Organization)
                .WithMany()
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AuditEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EntityName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.EntityId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Operation).IsRequired().HasMaxLength(50);
            entity.Property(e => e.RequestId).HasMaxLength(255);
            entity.Property(e => e.OccurredAt).IsRequired();
            entity.Property(e => e.ChangesJson).IsRequired().HasColumnType("jsonb");

            entity.HasIndex(e => new { e.EntityName, e.EntityId });
            entity.HasIndex(e => e.OrganizationId);
            entity.HasIndex(e => e.ActorUserId);
            entity.HasIndex(e => e.OccurredAt);
        });

        DataProvisioningModelConfiguration.Configure(modelBuilder);
        OrderManagementModelConfiguration.Configure(modelBuilder);
        RelationshipManagementModelConfiguration.Configure(modelBuilder);

        ApplySchemaOwnership(modelBuilder);
        ApplySnakeCaseDatabaseNames(modelBuilder);
    }

    private void ApplySchemaOwnership(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!string.IsNullOrWhiteSpace(entityType.GetSchema()))
            {
                continue;
            }

            var entityNamespace = entityType.ClrType.Namespace;
            var belongsToCurrentCommercialModel =
                entityType.ClrType.Assembly == typeof(CommercialAssembly).Assembly
                || entityNamespace?.StartsWith("PhaenoPortal.App.", StringComparison.Ordinal) == true;
            if (!belongsToCurrentCommercialModel)
            {
                throw new InvalidOperationException(
                    $"Entity '{entityType.DisplayName()}' has no explicit schema ownership.");
            }

            entityType.SetSchema(this.persistenceOptions.CommercialSchema);
        }

        var unmappedEntities = modelBuilder.Model.GetEntityTypes()
            .Where(entityType => string.IsNullOrWhiteSpace(entityType.GetSchema()))
            .Select(entityType => entityType.DisplayName())
            .OrderBy(name => name)
            .ToList();
        if (unmappedEntities.Count > 0)
        {
            throw new InvalidOperationException(
                $"Entities without schema ownership: {string.Join(", ", unmappedEntities)}.");
        }
    }

    private static void ApplySnakeCaseDatabaseNames(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var tableName = entityType.GetTableName();
            if (!string.IsNullOrWhiteSpace(tableName))
            {
                entityType.SetTableName(ToSnakeCase(tableName));
            }

            foreach (var property in entityType.GetProperties())
            {
                property.SetColumnName(ToSnakeCase(property.Name));
            }
        }
    }

    private static string ToSnakeCase(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return name;
        }

        var builder = new StringBuilder(name.Length + 8);
        for (var index = 0; index < name.Length; index++)
        {
            var character = name[index];
            if (char.IsUpper(character))
            {
                if (index > 0
                    && (char.IsLower(name[index - 1])
                        || (index + 1 < name.Length && char.IsLower(name[index + 1]))))
                {
                    builder.Append('_');
                }

                builder.Append(char.ToLowerInvariant(character));
            }
            else
            {
                builder.Append(character);
            }
        }

        return builder.ToString();
    }
}
