namespace PSeq.Operations.Commercial.Accounts.Domain;

/// <summary>Resolved routing instructions; null continues to the existing system/commercial fallback.</summary>
public sealed record DepartmentConfiguration(
    bool? PurchaseOrderRequired,
    string? BillingContactEmail,
    string? NotificationEmail,
    string? ShippingInstructions,
    string? ResultDeliveryInstructions)
{
    public static DepartmentConfiguration Validate(bool? purchaseOrderRequired, string? billingContactEmail,
        string? notificationEmail, string? shippingInstructions, string? resultDeliveryInstructions)
    {
        return new(purchaseOrderRequired, Email(billingContactEmail), Email(notificationEmail),
            Text(shippingInstructions, 2000), Text(resultDeliveryInstructions, 2000));
    }

    private static string? Text(string? value, int limit)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrEmpty(normalized)) return null;
        if (normalized.Length > limit) throw new ArgumentException($"The value cannot exceed {limit} characters.");
        return normalized;
    }

    private static string? Email(string? value)
    {
        var email = Text(value, 255);
        if (email is null) return null;
        if (!System.Net.Mail.MailAddress.TryCreate(email, out var address)
            || !string.Equals(address.Address, email, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Enter a valid email address.");
        return email;
    }
}
