namespace PhaenoPortal.App.Features.Accounts.Domain;

using PhaenoPortal.App.Common.Persistence;

/// <summary>
/// Represents an organization in the system.
/// </summary>
public sealed class Organization : IAudit, IConcurrency
{
    /// <summary>
    /// Unique identifier for the organization.
    /// </summary>
    public Guid Id { get; private set; } = Guid.NewGuid();

    /// <summary>
    /// Name of the organization.
    /// </summary>
    public string Name { get; private set; } = null!;

    /// <summary>
    /// Optional description of the organization.
    /// </summary>
    public string? Description { get; private set; }

    /// <summary>
    /// Authentication and authorization category for the organization.
    /// </summary>
    public OrganizationKind Kind { get; private set; } = OrganizationKind.Prospect;

    /// <summary>
    /// Date and time when the organization was created.
    /// </summary>
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    /// <summary>
    /// Indicates whether the organization is active.
    /// </summary>
    public bool IsActive { get; private set; } = true;

    /// <summary>
    /// User that created the organization, when known.
    /// </summary>
    public Guid? CreatedByUserId { get; private set; }

    /// <summary>
    /// Date and time when the organization was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    /// <summary>
    /// User that last updated the organization, when known.
    /// </summary>
    public Guid? UpdatedByUserId { get; private set; }

    /// <summary>
    /// Optimistic concurrency version.
    /// </summary>
    public long Version { get; private set; } = 1;

    /// <summary>
    /// User memberships in this organization.
    /// </summary>
    public ICollection<OrganizationMembership> Memberships { get; } = [];

    /// <summary>
    /// Creates a new organization instance.
    /// </summary>
    private Organization()
    {
    }

    /// <summary>
    /// Creates a new organization instance.
    /// </summary>
    public Organization(
        string name,
        OrganizationKind kind = OrganizationKind.Prospect,
        string? description = null)
    {
        Name = name;
        Kind = kind;
        Description = description;
    }

    /// <summary>
    /// Updates the organization's metadata.
    /// </summary>
    public void Update(string name, OrganizationKind kind, string? description = null)
    {
        Name = name;
        Kind = kind;
        Description = description;
    }

    public bool IsPhaeno()
    {
        return Kind == OrganizationKind.Phaeno;
    }

    public bool IsCustomer()
    {
        return Kind == OrganizationKind.Customer;
    }

    public bool IsProspect()
    {
        return Kind == OrganizationKind.Prospect;
    }

    public bool IsPartner()
    {
        return Kind == OrganizationKind.Partner;
    }

    public bool IsExternalOrganization()
    {
        return Kind is OrganizationKind.Prospect
            or OrganizationKind.Customer
            or OrganizationKind.Partner;
    }

    public void ConvertProspectTo(OrganizationKind targetKind)
    {
        if (!IsProspect())
        {
            throw new InvalidOperationException("Only a Prospect organization can be converted.");
        }

        if (targetKind is not (OrganizationKind.Customer or OrganizationKind.Partner))
        {
            throw new InvalidOperationException("A Prospect can be converted only to a Customer or Partner.");
        }

        Kind = targetKind;
    }

    public void Deactivate()
    {
        IsActive = false;
    }

    public void Activate()
    {
        IsActive = true;
    }

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

    public void IncrementVersion()
    {
        Version++;
    }
}
