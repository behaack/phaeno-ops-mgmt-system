namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class CustomerDeliveryLocation : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid DepartmentId { get; private set; }
    public string Label { get; private set; } = null!;
    public string Recipient { get; private set; } = null!;
    public string Line1 { get; private set; } = null!;
    public string? Line2 { get; private set; }
    public string City { get; private set; } = null!;
    public string Region { get; private set; } = null!;
    public string PostalCode { get; private set; } = null!;
    public string CountryCode { get; private set; } = null!;
    public string? Phone { get; private set; }
    public string? DeliveryInstructions { get; private set; }
    public bool IsDefault { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CustomerDeliveryLocation() { }

    public CustomerDeliveryLocation(Guid organizationId, Guid departmentId, string label,
        string recipient, string line1, string? line2, string city, string region,
        string postalCode, string countryCode, string? phone, string? deliveryInstructions, bool isDefault)
    {
        if (organizationId == Guid.Empty || departmentId == Guid.Empty)
            throw new ArgumentException("Choose a Customer and Department for this delivery location.");
        OrganizationId = organizationId;
        DepartmentId = departmentId;
        Update(label, recipient, line1, line2, city, region, postalCode, countryCode, phone, deliveryInstructions, isDefault);
    }

    public void Update(string label, string recipient, string line1, string? line2,
        string city, string region, string postalCode, string countryCode,
        string? phone, string? deliveryInstructions, bool isDefault)
    {
        if (!IsActive) throw new InvalidOperationException("This delivery location is inactive.");
        var country = OrderText.Required(countryCode, nameof(countryCode), 2).ToUpperInvariant();
        if (country.Length != 2 || country.Any(character => character is < 'A' or > 'Z'))
            throw new ArgumentException("Country code must contain two letters.", nameof(countryCode));
        Label = OrderText.Required(label, nameof(label), 100);
        Recipient = OrderText.Required(recipient, nameof(recipient), 255);
        Line1 = OrderText.Required(line1, nameof(line1), 255);
        Line2 = OrderText.Optional(line2, 255);
        City = OrderText.Required(city, nameof(city), 255);
        Region = OrderText.Required(region, nameof(region), 255);
        PostalCode = OrderText.Required(postalCode, nameof(postalCode), 50);
        CountryCode = country;
        Phone = OrderText.Optional(phone, 100);
        DeliveryInstructions = OrderText.Optional(deliveryInstructions, 4000);
        IsDefault = isDefault;
    }

    public void ClearDefault() => IsDefault = false;
    public void Deactivate() { IsActive = false; IsDefault = false; }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
