namespace PSeq.Operations.Commercial.Accounts.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

/// <summary>
/// An operational, authorization, and configuration scope inside one Organization.
/// </summary>
public sealed class OrganizationDepartment : IAudit, IConcurrency
{
    public const string DefaultCode = "GENERAL";
    public const string DefaultName = "General";

    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Organization Organization { get; private set; } = null!;
    public string Code { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public string? Description { get; private set; }
    public bool IsDefault { get; private set; }
    public bool IsActive { get; private set; } = true;

    // Typed department overrides. Null means inherit the Organization/system value.
    public bool? PurchaseOrderRequired { get; private set; }
    public string? BillingContactEmail { get; private set; }
    public string? NotificationEmail { get; private set; }
    public string? ShippingInstructions { get; private set; }
    public string? ResultDeliveryInstructions { get; private set; }

    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    public ICollection<OrganizationDepartmentMembership> Memberships { get; } = [];

    private OrganizationDepartment()
    {
    }

    public OrganizationDepartment(
        Guid organizationId,
        string code,
        string name,
        string? description = null,
        bool isDefault = false)
    {
        if (organizationId == Guid.Empty)
        {
            throw new ArgumentException("An organization is required.", nameof(organizationId));
        }

        OrganizationId = organizationId;
        IsDefault = isDefault;
        Update(code, name, description);
    }

    public void Update(string code, string name, string? description)
    {
        Code = Required(code, nameof(code), 50).ToUpperInvariant();
        Name = Required(name, nameof(name), 150);
        Description = Optional(description, 1000);
    }

    public void UpdateConfiguration(
        bool? purchaseOrderRequired,
        string? billingContactEmail,
        string? notificationEmail,
        string? shippingInstructions,
        string? resultDeliveryInstructions)
    {
        PurchaseOrderRequired = purchaseOrderRequired;
        BillingContactEmail = Email(billingContactEmail, nameof(billingContactEmail));
        NotificationEmail = Email(notificationEmail, nameof(notificationEmail));
        ShippingInstructions = Optional(shippingInstructions, 2000);
        ResultDeliveryInstructions = Optional(resultDeliveryInstructions, 2000);
    }

    public void MakeDefault() => IsDefault = true;

    public DepartmentConfiguration ResolveConfiguration(Organization organization)
    {
        if (organization.Id != OrganizationId) throw new ArgumentException("The department must belong to this organization.");
        return new(PurchaseOrderRequired ?? organization.DefaultPurchaseOrderRequired,
            BillingContactEmail ?? organization.DefaultBillingContactEmail,
            NotificationEmail ?? organization.DefaultNotificationEmail,
            ShippingInstructions ?? organization.DefaultShippingInstructions,
            ResultDeliveryInstructions ?? organization.DefaultResultDeliveryInstructions);
    }
    public void ClearDefault() => IsDefault = false;

    public void Deactivate()
    {
        if (IsDefault)
        {
            throw new InvalidOperationException("The default department cannot be deactivated.");
        }

        IsActive = false;
    }

    public void Reactivate() => IsActive = true;

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

    private static string Required(string? value, string parameterName, int maximumLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("A value is required.", parameterName);
        }

        return normalized.Length <= maximumLength
            ? normalized
            : throw new ArgumentException($"The value cannot exceed {maximumLength} characters.", parameterName);
    }

    private static string? Optional(string? value, int maximumLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        return normalized.Length <= maximumLength
            ? normalized
            : throw new ArgumentException($"The value cannot exceed {maximumLength} characters.", nameof(value));
    }

    private static string? Email(string? value, string parameterName)
    {
        var normalized = Optional(value, 255);
        if (normalized is null)
        {
            return null;
        }

        try
        {
            var address = new System.Net.Mail.MailAddress(normalized);
            if (!string.Equals(address.Address, normalized, StringComparison.OrdinalIgnoreCase))
            {
                throw new FormatException();
            }
        }
        catch (FormatException)
        {
            throw new ArgumentException("Enter a valid email address.", parameterName);
        }

        return normalized;
    }
}
