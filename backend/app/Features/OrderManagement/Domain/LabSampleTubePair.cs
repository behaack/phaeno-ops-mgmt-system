namespace PhaenoPortal.App.Features.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;

/// <summary>A Customer's draft one-sample/one-physical-tube pairing, before Lab authorization.</summary>
public sealed class LabSampleTubePair : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabServiceOrderId { get; private set; }
    public Guid OrganizationId { get; private set; }
    public Guid DepartmentId { get; private set; }
    public Guid StockKitId { get; private set; }
    public Guid StockTubeId { get; private set; }
    public string CustomerSampleId { get; private set; } = null!;
    public string BiologicalSource { get; private set; } = null!;
    public string SupplierTubeBarcode { get; private set; } = null!;
    public decimal DeclaredQuantity { get; private set; }
    public string DeclaredQuantityUnit { get; private set; } = null!;
    public int SequencingRunCount { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private LabSampleTubePair() { }
    public LabSampleTubePair(Guid orderId, Guid organizationId, Guid departmentId, Guid stockKitId,
        Guid stockTubeId, string customerSampleId, string biologicalSource, string barcode,
        decimal declaredQuantity, string declaredQuantityUnit, int sequencingRunCount)
    {
        if (new[] { orderId, organizationId, departmentId, stockKitId, stockTubeId }.Any(id => id == Guid.Empty))
            throw new ArgumentException("Choose an order and a registered physical tube.");
        if (!PSeq.Operations.Commercial.OrderManagement.Domain.SupplierTubeBarcode.TryNormalize(barcode, out var normalized))
            throw new ArgumentException("Scan the complete barcode printed on the tube.");
        if (declaredQuantity <= 0 || declaredQuantity > 999999999999.999999m
            || decimal.Round(declaredQuantity, 6) != declaredQuantity || sequencingRunCount < 1)
            throw new ArgumentException("Enter a positive biological material amount and sequencing run count.");
        LabServiceOrderId = orderId; OrganizationId = organizationId; DepartmentId = departmentId;
        StockKitId = stockKitId; StockTubeId = stockTubeId;
        CustomerSampleId = OrderText.Required(customerSampleId, nameof(customerSampleId), 255);
        BiologicalSource = OrderText.Required(biologicalSource, nameof(biologicalSource), 500);
        SupplierTubeBarcode = normalized;
        DeclaredQuantity = declaredQuantity;
        DeclaredQuantityUnit = OrderText.Required(declaredQuantityUnit, nameof(declaredQuantityUnit), 50);
        SequencingRunCount = sequencingRunCount;
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
