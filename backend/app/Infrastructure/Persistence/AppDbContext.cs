using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.DataProvisioning;
using PhaenoPortal.App.Features.DataProvisioning.Domain;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using System.Text;

namespace PhaenoPortal.App.Infrastructure.Persistence;

public sealed class AppDbContext(
    DbContextOptions<AppDbContext> options,
    IOptions<PersistenceOptions> persistenceOptions) : DbContext(options)
{
    private readonly PersistenceOptions persistenceOptions = persistenceOptions.Value;

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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(this.persistenceOptions.Schema);

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

        ApplySnakeCaseDatabaseNames(modelBuilder);
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
