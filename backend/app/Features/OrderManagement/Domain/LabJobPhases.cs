namespace PhaenoPortal.App.Features.OrderManagement.Domain;

using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class LabJobPhase : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabServiceOrderId { get; private set; }
    public int Position { get; private set; }
    public string Name { get; private set; } = null!;
    public int SampleCount { get; private set; }
    public int? TurnaroundBusinessDays { get; private set; }
    public decimal AcceptedSubtotal { get; private set; }
    public decimal CarriedInvoicedSubtotal { get; private set; }
    public string PriceLinesJson { get; private set; } = "[]";
    public string? ScopeJson { get; private set; }
    // Standard sample service includes one library preparation, one run and data assembly.
    public decimal? ProposedUnitPrice { get; private set; }
    public decimal? ProposedAdditionalRunPrice { get; private set; }
    public string? PriceProposalNote { get; private set; }
    public Guid? PriceProposedByUserId { get; private set; }
    public DateTime? PriceProposedAtUtc { get; private set; }
    public DateTime? FirstReceiptAtUtc { get; private set; }
    public DateTime? CompleteReceiptAtUtc { get; private set; }
    public DateTime? OriginalDueAtUtc { get; private set; }
    public DateTime? AdjustedDueAtUtc { get; private set; }
    public Guid? CalendarId { get; private set; }
    public int? CalendarRevision { get; private set; }
    public DateTime? StartedAtUtc { get; private set; }
    public DateTime? FirstDeliveredAtUtc { get; private set; }
    public DateTime? CancelledAtUtc { get; private set; }
    public Guid? CancelledByUserId { get; private set; }
    public string? CancellationReason { get; private set; }
    public DateTime? SupersededAtUtc { get; private set; }

    private LabJobPhase() { }

    public LabJobPhase(Guid orderId, int position, string name, int sampleCount,
        int? turnaroundBusinessDays = null, decimal acceptedSubtotal = 0,
        decimal carriedInvoicedSubtotal = 0, string priceLinesJson = "[]")
    {
        if (orderId == Guid.Empty) throw new ArgumentException("A Job is required.");
        LabServiceOrderId = orderId;
        Configure(position, name, sampleCount, turnaroundBusinessDays, acceptedSubtotal,
            carriedInvoicedSubtotal, priceLinesJson);
    }

    public void Configure(int position, string name, int sampleCount, int? days,
        decimal subtotal, decimal carriedSubtotal, string priceLinesJson)
    {
        if (StartedAtUtc.HasValue || FirstDeliveredAtUtc.HasValue || CancelledAtUtc.HasValue || SupersededAtUtc.HasValue)
            throw new InvalidOperationException("Started, delivered, cancelled and superseded phase scope is fixed.");
        if (position < 1 || sampleCount < 1 || days.HasValue && days is < 1 or > 365)
            throw new ArgumentException("Choose a positive phase position and sample count, and 1 to 365 business days.");
        if (subtotal < 0 || carriedSubtotal < 0 || carriedSubtotal > subtotal)
            throw new ArgumentException("Phase amounts must be nonnegative and cover already invoiced scope.");
        Position = position;
        Name = Required(name, "Phase name", 150);
        SampleCount = sampleCount;
        TurnaroundBusinessDays = days;
        AcceptedSubtotal = Money(subtotal);
        CarriedInvoicedSubtotal = Money(carriedSubtotal);
        PriceLinesJson = OrderText.Json(priceLinesJson);
    }

    public void FreezePricing(int days, decimal subtotal, string linesJson)
    {
        Configure(Position, Name, SampleCount, days, subtotal, CarriedInvoicedSubtotal, linesJson);
    }

    public LabPhaseScope? ReadScope() => ScopeJson is null ? null
        : System.Text.Json.JsonSerializer.Deserialize<LabPhaseScope>(ScopeJson, CommercialDraftRules.Json);

    public void SetScope(LabPhaseScope scope)
    {
        if (scope.Sources.Any(s => string.IsNullOrWhiteSpace(s.BiologicalSource) || s.SpecimenCount < 1)
            || scope.Sources.Sum(s => s.SpecimenCount) != SampleCount || scope.SequencingRunCount < SampleCount
            || scope.RunsPerSample.HasValue && scope.SequencingRunCount != SampleCount * scope.RunsPerSample.Value)
            throw new ArgumentException("Phase source quantities and purchased runs must reconcile to its sample scope.");
        ScopeJson = System.Text.Json.JsonSerializer.Serialize(scope, CommercialDraftRules.Json);
    }

    public void SetPriceProposal(decimal? unitPrice, string? note, Guid actorId, DateTime now, decimal? additionalRunPrice = null)
    {
        if (new[] { unitPrice, additionalRunPrice }.Any(price => price is <= 0 || price.HasValue && decimal.Round(price.Value, 2) != price))
            throw new ArgumentException("Proposed prices must be positive and use up to two decimal places.");
        if (unitPrice.HasValue && ReadScope() is { } scope && scope.SequencingRunCount > SampleCount && !additionalRunPrice.HasValue)
            throw new ArgumentException("Propose a separate price for additional sequencing runs.");
        ProposedAdditionalRunPrice = unitPrice.HasValue && ReadScope()?.SequencingRunCount > SampleCount ? additionalRunPrice : null;
        ProposedUnitPrice = unitPrice; PriceProposalNote = unitPrice.HasValue ? note?.Trim() : null;
        PriceProposedByUserId = unitPrice.HasValue ? actorId : null;
        PriceProposedAtUtc = unitPrice.HasValue ? now : null;
    }

    public void RecordReceipt(DateTime firstAt, DateTime? completeAt, DateTime? dueAt,
        Guid? calendarId, int? calendarRevision)
    {
        FirstReceiptAtUtc ??= firstAt;
        if (!completeAt.HasValue) return;
        CompleteReceiptAtUtc ??= completeAt;
        if (dueAt.HasValue && !OriginalDueAtUtc.HasValue)
        {
            OriginalDueAtUtc = dueAt;
            CalendarId = calendarId;
            CalendarRevision = calendarRevision;
        }
    }

    public void AdjustDeadline(DateTime due)
    {
        if (due.Kind != DateTimeKind.Utc || CancelledAtUtc.HasValue || FirstDeliveredAtUtc.HasValue || SupersededAtUtc.HasValue)
            throw new InvalidOperationException("Use a UTC deadline on a current, undelivered phase.");
        AdjustedDueAtUtc = due;
    }

    public void Start(DateTime at)
    {
        if (CancelledAtUtc.HasValue || SupersededAtUtc.HasValue)
            throw new InvalidOperationException("Cancelled or superseded phase work cannot start.");
        StartedAtUtc ??= at;
    }

    public void RecordDelivery(DateTime at) => FirstDeliveredAtUtc ??= at;

    public void Cancel(Guid actorId, string reason, DateTime now)
    {
        if (FirstReceiptAtUtc.HasValue || StartedAtUtc.HasValue || FirstDeliveredAtUtc.HasValue || SupersededAtUtc.HasValue)
            throw new InvalidOperationException("Only unreceived and unstarted phases may be cancelled.");
        CancelledAtUtc = now;
        CancelledByUserId = actorId;
        CancellationReason = Required(reason, "Cancellation reason", 2000);
    }

    public void Supersede(DateTime now)
    {
        if (FirstReceiptAtUtc.HasValue || StartedAtUtc.HasValue || FirstDeliveredAtUtc.HasValue || CancelledAtUtc.HasValue)
            throw new InvalidOperationException("Protected phase scope cannot be superseded.");
        SupersededAtUtc = now;
    }
}

public sealed record LabPhasePlanItem(Guid? Id, string Name, int SampleCount,
    int TurnaroundBusinessDays, decimal AcceptedSubtotal, decimal CarriedInvoicedSubtotal,
    IReadOnlyList<Guid> SampleIds);

public sealed class LabPhasePlanProposal : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabServiceOrderId { get; private set; }
    public long OrderVersion { get; private set; }
    public string BeforeJson { get; private set; } = null!;
    public string AfterJson { get; private set; } = null!;
    public string Reason { get; private set; } = null!;
    public Guid ProposedByUserId { get; private set; }
    public DateTime ProposedAtUtc { get; private set; }
    public string Status { get; private set; } = "Pending";
    public Guid? DecidedByUserId { get; private set; }
    public DateTime? DecidedAtUtc { get; private set; }
    public string? DecisionReason { get; private set; }

    private LabPhasePlanProposal() { }
    public LabPhasePlanProposal(Guid orderId, long version, string beforeJson,
        string afterJson, string reason, Guid actorId, DateTime now)
    {
        LabServiceOrderId = orderId; OrderVersion = version;
        BeforeJson = OrderText.Json(beforeJson); AfterJson = OrderText.Json(afterJson);
        Reason = Required(reason, "Rephasing reason", 2000);
        ProposedByUserId = actorId; ProposedAtUtc = now;
    }
    public void Decide(bool accept, Guid actorId, string? reason, DateTime now)
    {
        if (Status != "Pending") throw new InvalidOperationException("This proposal has already been decided.");
        Status = accept ? "Accepted" : "Declined";
        DecidedByUserId = actorId; DecidedAtUtc = now;
        DecisionReason = accept ? Optional(reason, 2000) : Required(reason, "Decline reason", 2000);
    }
}

public sealed class LabPhaseCancellationRequest : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabJobPhaseId { get; private set; }
    public Guid RequestedByUserId { get; private set; }
    public DateTime RequestedAtUtc { get; private set; }
    public string Reason { get; private set; } = null!;
    public string Status { get; private set; } = "Pending";
    public Guid? DecidedByUserId { get; private set; }
    public DateTime? DecidedAtUtc { get; private set; }
    public string? DecisionReason { get; private set; }
    private LabPhaseCancellationRequest() { }
    public LabPhaseCancellationRequest(Guid phaseId, Guid actorId, string reason, DateTime now)
    {
        LabJobPhaseId = phaseId; RequestedByUserId = actorId; RequestedAtUtc = now;
        Reason = Required(reason, "Cancellation reason", 2000);
    }
    public void Decide(bool approve, Guid actorId, string reason, DateTime now)
    {
        if (Status != "Pending") throw new InvalidOperationException("This cancellation request has already been decided.");
        Status = approve ? "Approved" : "Declined";
        DecidedByUserId = actorId; DecidedAtUtc = now;
        DecisionReason = Required(reason, "Decision reason", 2000);
    }
}

public sealed class LabPhaseInvoiceAllocation : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid InvoiceId { get; private set; }
    public Guid LabJobPhaseId { get; private set; }
    public decimal Subtotal { get; private set; }
    public string PhaseNameSnapshot { get; private set; } = null!;
    public string PriceLinesSnapshotJson { get; private set; } = "[]";
    private LabPhaseInvoiceAllocation() { }
    public LabPhaseInvoiceAllocation(Guid invoiceId, LabJobPhase phase, decimal subtotal)
    {
        if (subtotal <= 0) throw new ArgumentException("Choose a positive accepted-scope amount.");
        InvoiceId = invoiceId; LabJobPhaseId = phase.Id; Subtotal = Money(subtotal);
        PhaseNameSnapshot = phase.Name; PriceLinesSnapshotJson = phase.PriceLinesJson;
    }
}

// The invoice's original phase allocation never changes. These audited links
// attribute that purchased scope to the current plan after an approved split/merge.
public sealed class LabPhaseBillingAssignment : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabPhaseInvoiceAllocationId { get; private set; }
    public Guid LabJobPhaseId { get; private set; }
    public decimal Subtotal { get; private set; }
    public DateTime? SupersededAtUtc { get; private set; }
    private LabPhaseBillingAssignment() { }
    public LabPhaseBillingAssignment(Guid allocationId, Guid phaseId, decimal subtotal)
    {
        if (allocationId == Guid.Empty || phaseId == Guid.Empty || subtotal <= 0)
            throw new ArgumentException("An invoice allocation, phase and positive amount are required.");
        LabPhaseInvoiceAllocationId = allocationId; LabJobPhaseId = phaseId; Subtotal = Money(subtotal);
    }
    public void Supersede(DateTime now) => SupersededAtUtc ??= now;
}
