namespace PSeq.Operations.Laboratory.Domain;

public sealed class LabSupplierShipmentAddress : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid SupplierId { get; private set; }
    public string Label { get; private set; } = null!;
    public string NormalizedLabel { get; private set; } = null!;
    public string? Recipient { get; private set; }
    public string AddressLine1 { get; private set; } = null!;
    public string? AddressLine2 { get; private set; }
    public string City { get; private set; } = null!;
    public string? Region { get; private set; }
    public string? PostalCode { get; private set; }
    public string CountryCode { get; private set; } = null!;
    public string? Phone { get; private set; }
    public string? Instructions { get; private set; }
    public bool IsActive { get; private set; } = true;

    private LabSupplierShipmentAddress() { }
    public LabSupplierShipmentAddress(Guid supplierId, string label, string? recipient,
        string line1, string? line2, string city, string? region, string? postalCode,
        string countryCode, string? phone, string? instructions)
    {
        SupplierId = supplierId != Guid.Empty ? supplierId : throw new ArgumentException("Choose a supplier.");
        Update(label, recipient, line1, line2, city, region, postalCode, countryCode, phone, instructions, true);
    }

    public void Update(string label, string? recipient, string line1, string? line2,
        string city, string? region, string? postalCode, string countryCode,
        string? phone, string? instructions, bool isActive)
    {
        Label = Required(label, nameof(label), 100);
        NormalizedLabel = Label.ToUpperInvariant();
        Recipient = Optional(recipient, 200);
        AddressLine1 = Required(line1, nameof(line1), 200);
        AddressLine2 = Optional(line2, 200);
        City = Required(city, nameof(city), 150);
        Region = Optional(region, 150);
        PostalCode = Optional(postalCode, 40);
        CountryCode = Required(countryCode, nameof(countryCode), 2).ToUpperInvariant();
        if (CountryCode.Length != 2 || CountryCode.Any(c => c is < 'A' or > 'Z'))
            throw new ArgumentException("Choose a two-letter country code.");
        Phone = Optional(phone, 50);
        Instructions = Optional(instructions, 500);
        IsActive = isActive;
    }

    public string DestinationText() => string.Join("\n", new[] {
        Recipient, AddressLine1, AddressLine2,
        string.Join(", ", new[] { City, Region, PostalCode }.Where(v => !string.IsNullOrEmpty(v))),
        CountryCode, Phone is null ? null : $"Phone: {Phone}",
        Instructions is null ? null : $"Instructions: {Instructions}"
    }.Where(v => !string.IsNullOrEmpty(v)));
}
