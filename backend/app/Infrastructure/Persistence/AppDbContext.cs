using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

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
    /// Append-only audit events for persisted entity changes.
    /// </summary>
    public DbSet<AuditEvent> AuditEvents { get; set; }

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

            entity.HasMany(e => e.Users)
                .WithOne(u => u.Organization)
                .HasForeignKey(u => u.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // Create unique index on Name
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // Configure User entity
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.PasswordHash);
            entity.Property(e => e.IsActive).IsRequired();
            entity.Property(e => e.IsOrganizationAdmin).IsRequired();
            entity.Property(e => e.Status)
                .IsRequired()
                .HasConversion<string>()
                .HasMaxLength(50);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.CreatedByUserId);
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.Property(e => e.UpdatedByUserId);
            entity.Property(e => e.InvitedAt).IsRequired();
            entity.Property(e => e.InvitedByUserId);
            entity.Property(e => e.InvitationAcceptedAt);
            entity.Property(e => e.Version)
                .IsRequired()
                .IsConcurrencyToken();

            // Create unique index on Email
            entity.HasIndex(e => e.Email).IsUnique();

            // Create index on OrganizationId for efficient filtering
            entity.HasIndex(e => e.OrganizationId);

            entity.HasOne(e => e.Organization)
                .WithMany(o => o.Users)
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
    }
}
