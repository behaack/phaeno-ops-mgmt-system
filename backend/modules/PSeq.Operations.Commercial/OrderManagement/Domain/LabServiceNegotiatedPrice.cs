namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class LabServiceNegotiatedPrice : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid? DepartmentId { get; private set; }
    public Guid CatalogItemId { get; private set; }
    public decimal UnitPrice { get; private set; }
    public DateTime EffectiveFrom { get; private set; }
    public DateTime? EffectiveTo { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    private LabServiceNegotiatedPrice() { }

    public LabServiceNegotiatedPrice(Guid organizationId, Guid? departmentId, Guid catalogItemId,
        decimal unitPrice, DateTime effectiveFrom, DateTime? effectiveTo, bool isActive)
    {
        if (organizationId == Guid.Empty || catalogItemId == Guid.Empty || departmentId == Guid.Empty)
            throw new ArgumentException("Select a Company, service and valid Department scope.");
        OrganizationId = organizationId; DepartmentId = departmentId; CatalogItemId = catalogItemId;
        Update(unitPrice, effectiveFrom, effectiveTo, isActive);
    }

    public void Update(decimal unitPrice, DateTime effectiveFrom, DateTime? effectiveTo, bool isActive)
    {
        if (unitPrice <= 0 || decimal.Round(unitPrice, 2) != unitPrice)
            throw new ArgumentException("Enter a positive USD price with at most two decimal places.");
        if (effectiveFrom.Kind != DateTimeKind.Utc || effectiveTo.HasValue &&
            (effectiveTo.Value.Kind != DateTimeKind.Utc || effectiveTo <= effectiveFrom))
            throw new ArgumentException("Use a UTC effective window ending after its start.");
        UnitPrice = unitPrice; EffectiveFrom = effectiveFrom; EffectiveTo = effectiveTo; IsActive = isActive;
    }
    public bool IsEffectiveAt(DateTime now) => IsActive && EffectiveFrom <= now && (!EffectiveTo.HasValue || now < EffectiveTo);
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed record LabServicePriceProvenance(string Source, Guid? NegotiatedPriceId, long? NegotiatedPriceVersion,
    Guid OrganizationId, Guid? DepartmentId, Guid CatalogItemId, long CatalogItemVersion,
    decimal StandardUnitPrice, decimal UnitPrice);

public static class LabServicePriceRules
{
    public static LabServicePriceProvenance Resolve(Guid organizationId, Guid departmentId, Guid catalogItemId,
        long catalogVersion, decimal standardPrice, IEnumerable<LabServiceNegotiatedPrice> prices, DateTime now)
    {
        var applicable = prices.Where(p => p.OrganizationId == organizationId && p.CatalogItemId == catalogItemId
            && (!p.DepartmentId.HasValue || p.DepartmentId == departmentId) && p.IsEffectiveAt(now)).ToArray();
        if (applicable.GroupBy(p => p.DepartmentId).Any(group => group.Count() > 1))
            throw new InvalidOperationException("Overlapping negotiated service prices must be resolved before ordering.");
        var selected = applicable.OrderBy(p => p.UnitPrice).ThenBy(p => p.DepartmentId.HasValue).FirstOrDefault();
        return new(selected is null ? "Standard" : selected.DepartmentId.HasValue ? "Department" : "Organization",
            selected?.Id, selected?.Version, organizationId, selected?.DepartmentId, catalogItemId,
            catalogVersion, standardPrice, selected?.UnitPrice ?? standardPrice);
    }
}
