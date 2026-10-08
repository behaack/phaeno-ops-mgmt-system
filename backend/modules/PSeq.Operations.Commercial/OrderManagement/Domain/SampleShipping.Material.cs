namespace PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class RegisteredSampleTube
{
    public decimal? CustomerDeclaredQuantity { get; private set; }
    public string? CustomerDeclaredQuantityUnit { get; private set; }
    public DateTime? CustomerDeclaredAt { get; private set; }
    public Guid? CustomerDeclaredByUserId { get; private set; }

    public void DeclareMaterial(decimal quantity, string unit, Guid actorUserId, DateTime declaredAt)
    {
        if (ReceivedAt.HasValue || Status is RegisteredSampleTubeStatus.Accessioned or RegisteredSampleTubeStatus.Retired)
            throw new InvalidOperationException("Material declarations cannot change after a tube has been received or retired.");
        if (quantity <= 0 || quantity > 999999999999.999999m || decimal.Round(quantity, 6) != quantity)
            throw new ArgumentOutOfRangeException(nameof(quantity), "Enter a positive amount with no more than six decimal places.");
        if (string.IsNullOrWhiteSpace(unit) || unit.Trim().Length > 50)
            throw new ArgumentException("Enter the material amount unit (up to 50 characters).", nameof(unit));
        if (actorUserId == Guid.Empty || declaredAt.Kind != DateTimeKind.Utc)
            throw new ArgumentException("The declaring user and UTC declaration time are required.");
        CustomerDeclaredQuantity = quantity;
        CustomerDeclaredQuantityUnit = unit.Trim();
        CustomerDeclaredAt = declaredAt;
        CustomerDeclaredByUserId = actorUserId;
    }
}
