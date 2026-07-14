using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PhaenoPortal.App.Common.Persistence;

namespace PhaenoPortal.App.Infrastructure.Persistence.Auditing;

public sealed class AuditSaveChangesInterceptor(ICurrentUserContext currentUserContext) : SaveChangesInterceptor
{
    private static readonly HashSet<string> AuditMetadataProperties =
    [
        nameof(IAudit.CreatedAt),
        nameof(IAudit.CreatedByUserId),
        nameof(IAudit.UpdatedAt),
        nameof(IAudit.UpdatedByUserId),
        nameof(IConcurrency.Version)
    ];

    private static readonly HashSet<string> SensitiveProperties =
    [
        "PasswordHash",
        "TokenHash",
        "ExternalSubjectId"
    ];

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        AddAuditEvents(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        AddAuditEvents(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void AddAuditEvents(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        context.ChangeTracker.DetectChanges();

        var entries = context.ChangeTracker
            .Entries()
            .Where(entry => entry.Entity is not AuditEvent)
            .Where(entry => entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();

        if (entries.Count == 0)
        {
            return;
        }

        DateTime utcNow = DateTime.UtcNow;
        Guid? actorUserId = currentUserContext.UserId;

        foreach (EntityEntry entry in entries)
        {
            ApplyAuditStamp(entry, utcNow, actorUserId);
            ApplyConcurrencyVersion(entry);
        }

        // Audit stamps and concurrency versions are domain-method mutations made
        // after EF's normal pre-save change-detection pass. Detect them explicitly
        // so their new values are included in the generated INSERT/UPDATE SQL.
        context.ChangeTracker.DetectChanges();

        foreach (EntityEntry entry in entries)
        {
            string changesJson = BuildChangesJson(entry);
            if (changesJson == "{}")
            {
                continue;
            }

            context.Add(new AuditEvent(
                entityName: entry.Metadata.ClrType.Name,
                entityId: ReadEntityId(entry),
                operation: ReadOperation(entry.State),
                organizationId: ReadOrganizationId(entry),
                actorUserId: actorUserId,
                requestId: currentUserContext.RequestId,
                occurredAt: utcNow,
                changesJson: changesJson));
        }
    }

    private static void ApplyAuditStamp(EntityEntry entry, DateTime utcNow, Guid? actorUserId)
    {
        if (entry.Entity is not IAudit auditable)
        {
            return;
        }

        if (entry.State == EntityState.Added)
        {
            auditable.MarkCreated(utcNow, actorUserId);
        }

        if (entry.State is EntityState.Added or EntityState.Modified)
        {
            auditable.MarkUpdated(utcNow, actorUserId);
        }
    }

    private static void ApplyConcurrencyVersion(EntityEntry entry)
    {
        if (entry.State == EntityState.Modified && entry.Entity is IConcurrency concurrency)
        {
            concurrency.IncrementVersion();
        }
    }

    private static string BuildChangesJson(EntityEntry entry)
    {
        var changes = new Dictionary<string, object?>();

        foreach (PropertyEntry property in entry.Properties)
        {
            string propertyName = property.Metadata.Name;
            if (property.Metadata.IsPrimaryKey()
                || property.Metadata.IsShadowProperty()
                || AuditMetadataProperties.Contains(propertyName)
                || SensitiveProperties.Contains(propertyName))
            {
                continue;
            }

            if (entry.State == EntityState.Added)
            {
                changes[propertyName] = new
                {
                    old = (object?)null,
                    @new = property.CurrentValue
                };
                continue;
            }

            if (entry.State == EntityState.Deleted)
            {
                changes[propertyName] = new
                {
                    old = property.OriginalValue,
                    @new = (object?)null
                };
                continue;
            }

            if (property.IsModified && !Equals(property.OriginalValue, property.CurrentValue))
            {
                changes[propertyName] = new
                {
                    old = property.OriginalValue,
                    @new = property.CurrentValue
                };
            }
        }

        return changes.Count == 0
            ? "{}"
            : JsonSerializer.Serialize(changes, new JsonSerializerOptions(JsonSerializerDefaults.Web));
    }

    private static string ReadEntityId(EntityEntry entry)
    {
        var key = entry.Metadata.FindPrimaryKey();
        if (key is null)
        {
            return string.Empty;
        }

        var values = key.Properties.Select(property =>
        {
            var value = entry.State == EntityState.Deleted
                ? entry.Property(property.Name).OriginalValue
                : entry.Property(property.Name).CurrentValue;

            return value?.ToString() ?? string.Empty;
        });

        return string.Join("|", values);
    }

    private static Guid? ReadOrganizationId(EntityEntry entry)
    {
        var organizationIdProperty = entry.Properties
            .FirstOrDefault(property => property.Metadata.Name == "OrganizationId");

        if (organizationIdProperty?.CurrentValue is Guid organizationId)
        {
            return organizationId;
        }

        return null;
    }

    private static string ReadOperation(EntityState state) =>
        state switch
        {
            EntityState.Added => "Created",
            EntityState.Modified => "Updated",
            EntityState.Deleted => "Deleted",
            _ => state.ToString()
        };
}
