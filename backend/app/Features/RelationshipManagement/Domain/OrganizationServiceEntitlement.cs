namespace PhaenoPortal.App.Features.RelationshipManagement.Domain;

using PhaenoPortal.App.Common.Persistence;

public sealed class OrganizationServiceEntitlement : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public PortalService Service { get; private set; }
    public DateTime EffectiveFrom { get; private set; }
    public DateTime? EffectiveTo { get; private set; }
    public EntitlementConfigurationStatus ConfigurationStatus { get; private set; }
    public Guid? SourceRequestId { get; private set; }
    public Guid ApprovedByUserId { get; private set; }
    public string? Notes { get; private set; }
    public string? EndReason { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private OrganizationServiceEntitlement()
    {
    }

    public OrganizationServiceEntitlement(
        Guid organizationId,
        PortalService service,
        DateTime effectiveFrom,
        DateTime? effectiveTo,
        EntitlementConfigurationStatus configurationStatus,
        Guid approvedByUserId,
        Guid? sourceRequestId,
        string? notes)
    {
        OrganizationId = organizationId;
        Service = service;
        ApprovedByUserId = approvedByUserId;
        SourceRequestId = sourceRequestId;
        Update(effectiveFrom, effectiveTo, configurationStatus, notes);
    }

    public void Update(
        DateTime effectiveFrom,
        DateTime? effectiveTo,
        EntitlementConfigurationStatus configurationStatus,
        string? notes)
    {
        if (effectiveTo.HasValue && effectiveTo.Value <= effectiveFrom)
        {
            throw new ArgumentException("The entitlement end must be after its start.", nameof(effectiveTo));
        }

        EffectiveFrom = effectiveFrom;
        EffectiveTo = effectiveTo;
        ConfigurationStatus = configurationStatus;
        Notes = RelationshipText.Optional(notes, 2000);
        if (!effectiveTo.HasValue)
        {
            EndReason = null;
        }
    }

    public void End(DateTime effectiveTo, string reason)
    {
        if (effectiveTo <= EffectiveFrom)
        {
            throw new ArgumentException("The entitlement end must be after its start.", nameof(effectiveTo));
        }

        EffectiveTo = effectiveTo;
        EndReason = RelationshipText.Required(reason, nameof(reason), 1000);
    }

    public bool IsEffectiveAt(DateTime utcNow) =>
        EffectiveFrom <= utcNow && (!EffectiveTo.HasValue || EffectiveTo.Value > utcNow);

    public void MarkCreated(DateTime utcNow, Guid? actorUserId)
    {
        CreatedAt = utcNow;
        CreatedByUserId = actorUserId;
    }

    public void MarkUpdated(DateTime utcNow, Guid? actorUserId)
    {
        UpdatedAt = utcNow;
        UpdatedByUserId = actorUserId;
    }

    public void IncrementVersion() => Version++;
}
