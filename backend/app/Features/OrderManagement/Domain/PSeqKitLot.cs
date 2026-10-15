namespace PhaenoPortal.App.Features.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class PSeqKitLot : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid CatalogItemId { get; private set; }
    public string LotNumber { get; private set; } = null!;
    public string NormalizedLotNumber { get; private set; } = null!;
    public DateOnly? ExpirationDate { get; private set; }
    public bool IsRecalled { get; private set; }
    public string? RecallReason { get; private set; }
    public DateTime? RecallChangedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private PSeqKitLot() { }
    public PSeqKitLot(Guid catalogItemId, string lotNumber, DateOnly? expirationDate)
    {
        if (catalogItemId == Guid.Empty) throw new ArgumentException("Choose a PSeq kit product.");
        CatalogItemId = catalogItemId;
        LotNumber = OrderText.Required(lotNumber, nameof(lotNumber), 255);
        NormalizedLotNumber = Normalize(LotNumber);
        ExpirationDate = expirationDate;
    }
    public static string Normalize(string number) => number.Trim().ToUpperInvariant();
    public bool IsExpiredOn(DateOnly date) => ExpirationDate.HasValue && date > ExpirationDate.Value;
    public void SetRecall(bool recalled, string reason, DateTime now)
    {
        if (IsRecalled == recalled) throw new InvalidOperationException("The lot already has this recall status. Refresh its record.");
        RecallReason = OrderText.Required(reason, nameof(reason), 2000);
        IsRecalled = recalled;
        RecallChangedAt = now;
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

/// <summary>Partner evidence saved independently of creating or submitting assembly work.</summary>
public sealed class PartnerKitLotSubmission : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid DepartmentId { get; private set; }
    public Guid KitAssemblyCaseId { get; private set; }
    public Guid KitUnitId { get; private set; }
    public Guid KitLotId { get; private set; }
    public string EnteredLotNumber { get; private set; } = null!;
    public DateOnly? UsedOn { get; private set; }
    public DateTime CheckedAt { get; private set; }
    public string AssessmentJson { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private PartnerKitLotSubmission() { }
    public PartnerKitLotSubmission(KitAssemblyCase included, PartnerKitUnit kit, string enteredNumber,
        DateOnly? usedOn, string assessmentJson, DateTime now)
    {
        if (kit.Id != included.CurrentKitUnitId || kit.OrganizationId != included.OrganizationId
            || kit.DepartmentId != included.DepartmentId || kit.Status != KitUnitStatus.Shipped || !kit.KitLotId.HasValue)
            throw new InvalidOperationException("Submit the lot for the case's current shipped kit.");
        OrganizationId = included.OrganizationId; DepartmentId = included.DepartmentId;
        KitAssemblyCaseId = included.Id; KitUnitId = kit.Id; KitLotId = kit.KitLotId.Value;
        Update(enteredNumber, usedOn, assessmentJson, now);
    }
    public void Update(string enteredNumber, DateOnly? usedOn, string assessmentJson, DateTime now)
    {
        if (usedOn > DateOnly.FromDateTime(now)) throw new ArgumentException("The actual kit-use date cannot be in the future.");
        EnteredLotNumber = OrderText.Required(enteredNumber, nameof(enteredNumber), 255);
        UsedOn = usedOn; CheckedAt = now; AssessmentJson = OrderText.Json(assessmentJson);
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
