namespace PhaenoPortal.App.Features.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public enum KitUnitStatus { AwaitingShipment, Shipped, Replaced, Cancelled }
public enum KitAssemblyCaseStatus { AwaitingShipment, AwaitingSubmission, PreparingInputs, InProgress, ResultsReleased, Expired, Cancelled }

/// <summary>A purchased physical unit, or an audited replacement of that unit.</summary>
public sealed class PartnerKitUnit : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PartnerReagentOrderId { get; private set; }
    public Guid PartnerReagentOrderLineId { get; private set; }
    public Guid OrganizationId { get; private set; }
    public Guid DepartmentId { get; private set; }
    public string Label { get; private set; } = null!;
    public KitUnitStatus Status { get; private set; } = KitUnitStatus.AwaitingShipment;
    public Guid? ReagentShipmentId { get; private set; }
    public Guid? ReplacesKitUnitId { get; private set; }
    public Guid? ReplacedByKitUnitId { get; private set; }
    public DateTime? ShippedAt { get; private set; }
    public DateTime? ExpiresAt { get; private set; }
    public string? LotBatchNumber { get; private set; }
    public string? Carrier { get; private set; }
    public string? TrackingNumber { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    private PartnerKitUnit() { }
    public PartnerKitUnit(Guid orderId, Guid lineId, Guid organizationId, Guid departmentId, string label, Guid? replacesKitUnitId = null)
    {
        if (new[] { orderId, lineId, organizationId, departmentId }.Any(id => id == Guid.Empty)) throw new ArgumentException("Kit ownership is required.");
        PartnerReagentOrderId = orderId; PartnerReagentOrderLineId = lineId; OrganizationId = organizationId; DepartmentId = departmentId;
        Label = OrderText.Required(label, nameof(label), 100); ReplacesKitUnitId = replacesKitUnitId;
    }
    public void Ship(Guid? shipmentId, DateTime shippedAt, DateTime? expiresAt, string lotBatchNumber, string carrier, string trackingNumber)
    {
        if (Status != KitUnitStatus.AwaitingShipment) throw new InvalidOperationException("Only an unshipped Kit unit may be shipped.");
        if (shippedAt.Kind != DateTimeKind.Utc || shippedAt > DateTime.UtcNow.AddMinutes(5)) throw new ArgumentException("Use a valid UTC shipment date.");
        if (expiresAt.HasValue && expiresAt.Value.Date < shippedAt.Date) throw new ArgumentException("A Kit cannot ship after its labeled expiration.");
        ReagentShipmentId = shipmentId; ShippedAt = shippedAt; ExpiresAt = expiresAt;
        LotBatchNumber = OrderText.Required(lotBatchNumber, nameof(lotBatchNumber), 255);
        Carrier = OrderText.Required(carrier, nameof(carrier), 255); TrackingNumber = OrderText.Required(trackingNumber, nameof(trackingNumber), 255);
        Status = KitUnitStatus.Shipped;
    }
    public void Replace(Guid replacementId)
    {
        if (Status != KitUnitStatus.Shipped || replacementId == Guid.Empty) throw new InvalidOperationException("Only a shipped, unreplaced Kit may be replaced.");
        ReplacedByKitUnitId = replacementId; Status = KitUnitStatus.Replaced;
    }
    public void CancelUnshipped()
    {
        if (Status != KitUnitStatus.AwaitingShipment) throw new InvalidOperationException("Only an unshipped Kit unit may be cancelled.");
        Status = KitUnitStatus.Cancelled;
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

/// <summary>One included entitlement, permanently owned by the purchasing tenant.</summary>
public sealed class KitAssemblyCase : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PartnerReagentOrderId { get; private set; }
    public Guid OrganizationId { get; private set; }
    public Guid DepartmentId { get; private set; }
    public Guid OriginalKitUnitId { get; private set; }
    public Guid CurrentKitUnitId { get; private set; }
    public Guid AssemblyProfileId { get; private set; }
    public string ProfileSnapshotJson { get; private set; } = null!;
    public string CaseNumber { get; private set; } = null!;
    public KitAssemblyCaseStatus Status { get; private set; } = KitAssemblyCaseStatus.AwaitingShipment;
    public DateTime? SubmissionDeadlineAt { get; private set; }
    public string DeadlineBasis { get; private set; } = "Labeled Kit expiration plus 90 days; otherwise 12 months after shipment";
    public Guid? BillingShipmentId { get; private set; }
    public Guid? BillingDocumentId { get; private set; }
    public Guid? AssemblyRequestId { get; private set; }
    public DateTime? FirstSubmittedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<KitCaseEvent> History { get; } = [];
    private KitAssemblyCase() { }
    public KitAssemblyCase(PartnerKitUnit kit, Guid profileId, string profileSnapshotJson)
    {
        PartnerReagentOrderId = kit.PartnerReagentOrderId; OrganizationId = kit.OrganizationId; DepartmentId = kit.DepartmentId;
        OriginalKitUnitId = CurrentKitUnitId = kit.Id; AssemblyProfileId = profileId;
        ProfileSnapshotJson = OrderText.Json(profileSnapshotJson); CaseNumber = kit.Label + "-A";
    }
    public bool IsTerminal => Status is KitAssemblyCaseStatus.ResultsReleased or KitAssemblyCaseStatus.Expired or KitAssemblyCaseStatus.Cancelled;
    public bool CanPrepareAt(DateTime now) => FirstSubmittedAt is null && Status is (KitAssemblyCaseStatus.AwaitingSubmission or KitAssemblyCaseStatus.PreparingInputs)
        && SubmissionDeadlineAt.HasValue && now <= SubmissionDeadlineAt;
    public void RecordShipment(PartnerKitUnit kit, Guid? actorId, DateTime now)
    {
        if (kit.Id != CurrentKitUnitId || kit.Status != KitUnitStatus.Shipped || !kit.ShippedAt.HasValue) throw new InvalidOperationException("Ship the case's current Kit first.");
        BillingShipmentId ??= kit.ReagentShipmentId;
        SetKitDeadline(kit);
        if (Status == KitAssemblyCaseStatus.AwaitingShipment) Status = KitAssemblyCaseStatus.AwaitingSubmission;
        AddEvent("KitShipped", "Kit shipped; included Assembly submission deadline established.", actorId, now);
    }
    public void AttachRequest(Guid requestId, Guid actorId, DateTime now)
    {
        if (!CanPrepareAt(now) || AssemblyRequestId.HasValue || requestId == Guid.Empty) throw new InvalidOperationException("This included Assembly case is not available for a new submission.");
        AssemblyRequestId = requestId; Status = KitAssemblyCaseStatus.PreparingInputs; AddEvent("PreparationStarted", "Included Assembly input preparation started.", actorId, now);
    }
    public void RecordBillingSource(Guid documentId)
    {
        if (documentId == Guid.Empty || (BillingDocumentId.HasValue && BillingDocumentId != documentId)) throw new InvalidOperationException("The purchased Kit billing source is immutable.");
        BillingDocumentId = documentId;
    }
    public void Submit(Guid requestId, Guid actorId, DateTime now)
    {
        if (AssemblyRequestId != requestId || Status is KitAssemblyCaseStatus.ResultsReleased or KitAssemblyCaseStatus.Cancelled or KitAssemblyCaseStatus.Expired
            || (!FirstSubmittedAt.HasValue && !CanPrepareAt(now))) throw new InvalidOperationException("This included Assembly case cannot accept inputs.");
        FirstSubmittedAt ??= now; Status = KitAssemblyCaseStatus.InProgress;
        AddEvent("InputsSubmitted", "An immutable input revision was submitted for the included Assembly case.", actorId, now);
    }
    public void Extend(DateTime deadline, string reason, Guid actorId, DateTime now)
    {
        if (FirstSubmittedAt.HasValue || Status is KitAssemblyCaseStatus.ResultsReleased or KitAssemblyCaseStatus.Cancelled or KitAssemblyCaseStatus.AwaitingShipment
            || deadline.Kind != DateTimeKind.Utc || deadline <= now || (SubmissionDeadlineAt.HasValue && deadline <= SubmissionDeadlineAt))
            throw new InvalidOperationException("An unused, shipped case may be extended to a later future deadline.");
        var previous = SubmissionDeadlineAt;
        SubmissionDeadlineAt = deadline; DeadlineBasis = "Audited extension";
        if (Status == KitAssemblyCaseStatus.Expired) Status = AssemblyRequestId.HasValue ? KitAssemblyCaseStatus.PreparingInputs : KitAssemblyCaseStatus.AwaitingSubmission;
        AddEvent("DeadlineExtended", reason, actorId, now, previousDeadlineAt: previous, currentDeadlineAt: deadline);
    }
    public void Transfer(PartnerKitUnit replacement, string reason, Guid actorId, DateTime now)
    {
        if (Status is KitAssemblyCaseStatus.ResultsReleased or KitAssemblyCaseStatus.Cancelled || replacement.ReplacesKitUnitId != CurrentKitUnitId
            || replacement.OrganizationId != OrganizationId || replacement.DepartmentId != DepartmentId || replacement.PartnerReagentOrderId != PartnerReagentOrderId)
            throw new InvalidOperationException("The replacement must preserve the original purchase, tenant and Assembly case.");
        var oldUnit = CurrentKitUnitId; CurrentKitUnitId = replacement.Id;
        // A replacement never shortens an already granted submission window.
        var previous = SubmissionDeadlineAt; SetKitDeadline(replacement);
        if (previous.HasValue && previous > SubmissionDeadlineAt) { SubmissionDeadlineAt = previous; DeadlineBasis = "Preserved prior deadline after Kit replacement"; }
        if (Status == KitAssemblyCaseStatus.Expired && SubmissionDeadlineAt > now) Status = AssemblyRequestId.HasValue ? KitAssemblyCaseStatus.PreparingInputs : KitAssemblyCaseStatus.AwaitingSubmission;
        AddEvent("KitReplaced", reason, actorId, now, oldUnit, replacement.Id, previous, SubmissionDeadlineAt);
    }
    public bool Expire(DateTime now)
    {
        if (FirstSubmittedAt.HasValue || !SubmissionDeadlineAt.HasValue || now <= SubmissionDeadlineAt || IsTerminal) return false;
        Status = KitAssemblyCaseStatus.Expired; AddEvent("ExpiredUnused", "The unused included Assembly case reached its submission deadline. No automatic refund or credit is created.", null, now); return true;
    }
    public void MarkResultsReleased(DateTime now)
    {
        if (!FirstSubmittedAt.HasValue || Status != KitAssemblyCaseStatus.InProgress) throw new InvalidOperationException("Only a submitted case can release results.");
        Status = KitAssemblyCaseStatus.ResultsReleased; AddEvent("ResultsReleased", "The included Assembly results are released.", null, now);
    }
    public void Cancel(string reason, Guid actorId, DateTime now)
    {
        if (Status is KitAssemblyCaseStatus.ResultsReleased or KitAssemblyCaseStatus.Cancelled) throw new InvalidOperationException("This case cannot be cancelled.");
        Status = KitAssemblyCaseStatus.Cancelled; AddEvent("Cancelled", reason, actorId, now);
    }
    private void SetKitDeadline(PartnerKitUnit kit)
    {
        if (!kit.ShippedAt.HasValue) throw new InvalidOperationException("The replacement must have shipment evidence.");
        SubmissionDeadlineAt = kit.ExpiresAt.HasValue ? kit.ExpiresAt.Value.AddDays(90) : kit.ShippedAt.Value.AddMonths(12);
        DeadlineBasis = kit.ExpiresAt.HasValue ? "Labeled Kit expiration plus 90 days" : "12 months after shipment";
    }
    private void AddEvent(string type, string reason, Guid? actorId, DateTime now, Guid? previousKitUnitId = null, Guid? currentKitUnitId = null, DateTime? previousDeadlineAt = null, DateTime? currentDeadlineAt = null)
        => History.Add(new(Id, type, OrderText.Required(reason, nameof(reason), 2000), actorId, now, previousKitUnitId, currentKitUnitId, previousDeadlineAt, currentDeadlineAt));
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class KitCaseEvent
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid KitAssemblyCaseId { get; private set; }
    public string EventType { get; private set; } = null!;
    public string Reason { get; private set; } = null!;
    public Guid? ActorUserId { get; private set; }
    public DateTime At { get; private set; }
    public Guid? PreviousKitUnitId { get; private set; }
    public Guid? CurrentKitUnitId { get; private set; }
    public DateTime? PreviousDeadlineAt { get; private set; }
    public DateTime? CurrentDeadlineAt { get; private set; }
    private KitCaseEvent() { }
    public KitCaseEvent(Guid caseId, string eventType, string reason, Guid? actorId, DateTime at, Guid? previousKitUnitId = null, Guid? currentKitUnitId = null, DateTime? previousDeadlineAt = null, DateTime? currentDeadlineAt = null)
    { KitAssemblyCaseId = caseId; EventType = eventType; Reason = reason; ActorUserId = actorId; At = at; PreviousKitUnitId = previousKitUnitId; CurrentKitUnitId = currentKitUnitId; PreviousDeadlineAt = previousDeadlineAt; CurrentDeadlineAt = currentDeadlineAt; }
}
