namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed record LabPhasePlanWriteRequest(int Revision, IReadOnlyList<LabPhasePlanItem> Phases, string Reason);
public sealed record LabPhaseDecisionRequest(long Version, bool Accept, string Reason);
public sealed record LabPhaseCancellationWriteRequest(int Revision, string Reason);
public sealed record LabPhaseInvoicePart(Guid PhaseId, decimal Subtotal);
public sealed record LabPhaseInvoiceWriteRequest(int Revision, IReadOnlyList<LabPhaseInvoicePart> Parts);

public sealed class LabPhasePlans(PSeqOperationsDbContext db)
{
    public static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    public Task LockAsync(Guid id, CancellationToken ct) => SampleShippingPackingData.LockAsync(db, "phase-plan:" + id, ct);
    public static LabPhasePlanItem[] Items(LabPhasePlanDto plan) => plan.Phases.Select(p => new LabPhasePlanItem(
        p.Id, p.Name, p.SampleCount, p.TurnaroundBusinessDays ?? 1, p.AcceptedSubtotal,
        p.CarriedInvoicedSubtotal, p.SampleIds)).ToArray();

    public async Task ValidateAsync(LabServiceOrder order, LabPhasePlanWriteRequest request, bool amendment, CancellationToken ct)
    {
        if (order.IsTerminal() || order.IsDiscarded || order.HasPendingChangeRoster)
            throw LabPhaseOperations.Error("phase_plan_closed", "Resolve outstanding scope changes and use an open Job for phase planning.");
        if (order.PhasePlanRevision != request.Revision)
            throw LabPhaseOperations.Error("phase_plan_changed", "The phase plan changed. Refresh and review the current plan.");
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length > 2000)
            throw LabPhaseOperations.Error("phase_reason_required", "Enter a phase-plan reason of up to 2,000 characters.");
        var scoped = order.Phases.Any(p => p.SupersededAtUtc == null && p.ScopeJson != null);
        if (scoped && !amendment) throw LabPhaseOperations.Error("sales_phase_scope_fixed", "Sales configures scope in the Draft. Review prices and turnaround in the quote.");
        if (scoped && !order.SampleRosterFinalizedAt.HasValue) throw LabPhaseOperations.Error("phase_roster_required", "Confirm the complete named sample roster before rephasing a scoped order.");
        var items = request.Phases;
        if (items.Count is < 1 or > 100 || items.Any(x => x.SampleCount < 1 || x.TurnaroundBusinessDays is < 1 or > 365
            || string.IsNullOrWhiteSpace(x.Name) || x.Name.Trim().Length > 150 || x.AcceptedSubtotal < 0
            || decimal.Round(x.AcceptedSubtotal, 2) != x.AcceptedSubtotal || x.CarriedInvoicedSubtotal < 0
            || x.CarriedInvoicedSubtotal > x.AcceptedSubtotal)
            || items.Select(x => x.Name.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() != items.Count
            || items.Where(x => x.Id.HasValue).Select(x => x.Id).Distinct().Count() != items.Count(x => x.Id.HasValue)
            || items.Sum(x => x.SampleCount) != order.RequestedSpecimenCount)
            throw LabPhaseOperations.Error("phase_plan_invalid", "Use distinct phase names, positive counts, valid business-day targets and amounts covering the Job total.");
        var plan = await new LabPhaseFacts(db).ReadAsync(order.Id, ct);
        if (items.Any(x => x.Id.HasValue && !plan.Phases.Any(p => p.Id == x.Id)))
            throw LabPhaseOperations.Error("phase_not_found", "Every existing phase must belong to this Job's current plan.");
        var assignments = items.SelectMany(x => x.SampleIds).ToArray();
        if (assignments.Distinct().Count() != assignments.Length || !assignments.ToHashSet().SetEquals(plan.Samples.Select(s => s.Id))
            || items.Any(x => x.SampleIds.Count > x.SampleCount)
            || plan.Samples.Count == order.RequestedSpecimenCount && items.Any(x => x.SampleIds.Count != x.SampleCount))
            throw LabPhaseOperations.Error("phase_membership_invalid", "Assign each saved sample exactly once and reconcile every finalized cohort to its phase count.");
        if (!amendment) return;
        if (items.Sum(x => x.AcceptedSubtotal) != plan.AcceptedSubtotal)
            throw LabPhaseOperations.Error("phase_price_total", "Rephasing must preserve the accepted Job subtotal.");
        var lastStarted = plan.Phases.Where(p => p.Lifecycle is "InProgress" or "ResultsDelivered").Select(p => p.Position).DefaultIfEmpty(0).Max();
        foreach (var old in plan.Phases)
        {
            var next = items.SingleOrDefault(x => x.Id == old.Id);
            var position = next == null ? 0 : items.ToList().IndexOf(next) + 1;
            var fixedMembers = plan.Samples.Where(s => s.PhaseId == old.Id && !s.CanRephase).Select(s => s.Id).ToArray();
            if (fixedMembers.Length > 0 && (next == null || position != old.Position || fixedMembers.Any(id => !next.SampleIds.Contains(id))))
                throw LabPhaseOperations.Error("phase_sample_sent", "Sent, received, started and delivered samples must retain their phase assignment.");
            var protectedScope = old.Lifecycle is "InProgress" or "ResultsDelivered" or "Cancelled";
            if (protectedScope && (next == null || position != old.Position || next.Name.Trim() != old.Name
                || next.SampleCount != old.SampleCount || next.TurnaroundBusinessDays != old.TurnaroundBusinessDays
                || next.AcceptedSubtotal != old.AcceptedSubtotal || !next.SampleIds.ToHashSet().SetEquals(old.SampleIds)))
                throw LabPhaseOperations.Error("phase_scope_fixed", "Started, delivered and cancelled phases retain their scope, position and accepted terms.");
            if (old.CancellationPending && (next == null || position != old.Position || next.SampleCount != old.SampleCount
                || !next.SampleIds.ToHashSet().SetEquals(old.SampleIds)))
                throw LabPhaseOperations.Error("phase_cancellation_pending", "Resolve the phase cancellation request before rephasing its scope.");
            if (next != null && !protectedScope && position <= lastStarted)
                throw LabPhaseOperations.Error("phase_sequence_fixed", "Future work cannot move ahead of started work.");
            if (next != null && (next.CarriedInvoicedSubtotal != old.CarriedInvoicedSubtotal || next.AcceptedSubtotal < old.InvoicedSubtotal))
                throw LabPhaseOperations.Error("phase_invoice_fixed", "Existing phase amounts must cover their issued invoices and preserve carried billing.");
        }
        if (items.Select((x, i) => (x, i)).Any(v => !v.x.Id.HasValue && v.i + 1 <= lastStarted))
            throw LabPhaseOperations.Error("phase_sequence_fixed", "New phases must follow started work.");
        var retiredBilling = plan.Phases.Where(p => items.All(x => x.Id != p.Id)).Sum(p => p.InvoicedSubtotal);
        if (items.Where(x => !x.Id.HasValue).Sum(x => x.CarriedInvoicedSubtotal) != retiredBilling)
            throw LabPhaseOperations.Error("phase_invoice_attribution", "Attribute all already invoiced amounts from replaced phases to the new phases, without changing issued invoices.");
    }

    public async Task ApplyAsync(LabServiceOrder order, LabPhasePlanWriteRequest request, bool amendment, CancellationToken ct)
    {
        await ValidateAsync(order, request, amendment, ct);
        var old = order.Phases.Where(x => x.SupersededAtUtc == null).ToArray();
        var before = await new LabPhaseFacts(db).ReadAsync(order.Id, ct);
        foreach (var phase in old.Where(p => request.Phases.All(x => x.Id != p.Id))) phase.Supersede(DateTime.UtcNow);
        var retiredIds = old.Where(p => request.Phases.All(x => x.Id != p.Id)).Select(p => p.Id).ToArray();
        var assignments = await (from assignment in db.Set<LabPhaseBillingAssignment>()
            join allocation in db.Set<LabPhaseInvoiceAllocation>() on assignment.LabPhaseInvoiceAllocationId equals allocation.Id
            join invoice in db.Invoices on allocation.InvoiceId equals invoice.Id
            where retiredIds.Contains(assignment.LabJobPhaseId) && assignment.SupersededAtUtc == null && invoice.Status != InvoiceStatus.Voided
            select assignment).ToListAsync(ct);
        var assignmentQueue = new Queue<(Guid Id, decimal Amount)>(assignments.OrderBy(x => x.Id).Select(x => (x.LabPhaseInvoiceAllocationId, x.Subtotal)));
        foreach (var assignment in assignments) assignment.Supersede(DateTime.UtcNow);
        (Guid Id, decimal Amount)? remainder = null;
        for (var i = 0; i < request.Phases.Count; i++)
        {
            var item = request.Phases[i];
            var phase = item.Id.HasValue ? old.Single(x => x.Id == item.Id) : new LabJobPhase(order.Id, i + 1,
                item.Name, item.SampleCount, item.TurnaroundBusinessDays, item.AcceptedSubtotal, item.CarriedInvoicedSubtotal);
            var prior = before.Phases.SingleOrDefault(p => p.Id == phase.Id);
            if (prior?.Lifecycle is not ("InProgress" or "ResultsDelivered" or "Cancelled"))
                phase.Configure(i + 1, item.Name, item.SampleCount, item.TurnaroundBusinessDays,
                    item.AcceptedSubtotal, item.CarriedInvoicedSubtotal, amendment ? JsonSerializer.Serialize(new { sourceQuotes = order.Quotes.Where(q => q.Status == QuoteStatus.Accepted).Select(q => new { q.Id, q.LinesJson }), acceptedPortion = item.AcceptedSubtotal }, JsonOptions) : phase.PriceLinesJson);
            if (!item.Id.HasValue) { order.Phases.Add(phase); db.Set<LabJobPhase>().Add(phase); }
            if (!item.Id.HasValue)
            {
                var remaining = item.CarriedInvoicedSubtotal;
                while (remaining > 0)
                {
                    var source = remainder ?? assignmentQueue.Dequeue();
                    var amount = Math.Min(remaining, source.Amount);
                    db.Set<LabPhaseBillingAssignment>().Add(new(source.Id, phase.Id, amount));
                    remaining -= amount;
                    remainder = source.Amount > amount ? (source.Id, source.Amount - amount) : null;
                }
            }
            if (amendment && old.Any(p => p.ScopeJson != null) && prior?.Lifecycle is not ("InProgress" or "ResultsDelivered" or "Cancelled"))
            {
                var members = order.Samples.Where(s => item.SampleIds.Contains(s.Id)).ToArray();
                var sources = members.GroupBy(s => LabServiceSourceGroup.Normalize(s.BiologicalSource!))
                    .Select(g => new PhaseSourceScope(g.First().BiologicalSource!, g.Count())).ToArray();
                var runs = members.Select(s => s.SequencingRunCount).Distinct().ToArray();
                phase.SetScope(new(sources, runs.Length == 1 ? runs[0] : null, members.Sum(s => s.SequencingRunCount)));
            }
            foreach (var sample in order.Samples.Where(x => item.SampleIds.Contains(x.Id) && x.LabJobPhaseId != phase.Id)) sample.AssignPhase(phase.Id);
        }
        order.AdvancePhasePlan();
    }

    // Explicit phase monetary portions apportion the accepted priced lines by money,
    // never by sample count. The quote and original unit prices remain immutable.
    public static void FreezeQuote(LabServiceOrder order, LabServiceQuote quote)
    {
        var phases = order.Phases.Where(x => x.SupersededAtUtc == null).OrderBy(x => x.Position).ToArray();
        var scopedLines = JsonSerializer.Deserialize<List<PhaseSourcePriceLine>>(quote.LinesJson, JsonOptions)!;
        if (phases.Any(p => p.ScopeJson != null))
        {
            foreach (var phase in phases)
            {
                var ownLines = scopedLines.Where(l => l.PhaseId == phase.Id).ToArray();
                var target = ownLines.Single(l => l.TurnaroundBusinessDays.HasValue).TurnaroundBusinessDays!.Value;
                phase.FreezePricing(target, ownLines.Sum(l => decimal.Round(l.Quantity * l.UnitPrice, 2, MidpointRounding.AwayFromZero)),
                    JsonSerializer.Serialize(new { sourceLines = ownLines, currency = quote.Currency, sourceQuoteId = quote.Id }, JsonOptions));
            }
            if (phases.Sum(p => p.AcceptedSubtotal) != quote.Subtotal) throw LabPhaseOperations.Error("phase_quote_scope", "Phase prices must reconcile to the quote subtotal.");
            quote.FreezePhasePlan(JsonSerializer.Serialize(phases.Select(p => new { p.Id, p.Position, p.Name,
                p.SampleCount, scope = p.ReadScope(), p.TurnaroundBusinessDays, p.AcceptedSubtotal, p.PriceLinesJson }), JsonOptions));
            return;
        }
        if (phases.Length == 1)
            phases[0].FreezePricing(quote.DeliveryTargetBusinessDays!.Value, quote.Subtotal, quote.LinesJson);
        if (phases.Sum(p => p.SampleCount) != order.RequestedSpecimenCount || phases.Any(p => !p.TurnaroundBusinessDays.HasValue)
            || phases.Sum(p => p.AcceptedSubtotal) != quote.Subtotal)
            throw LabPhaseOperations.Error("phase_quote_scope", "Configure phase counts, delivery targets and priced portions to reconcile to this quote before issuing it.");
        var lines = JsonSerializer.Deserialize<List<PhaseSourcePriceLine>>(quote.LinesJson, JsonOptions)!;
        foreach (var phase in phases)
            phase.FreezePricing(phase.TurnaroundBusinessDays!.Value, phase.AcceptedSubtotal,
                JsonSerializer.Serialize(new { sourceLines = lines, acceptedPortion = phase.AcceptedSubtotal,
                    currency = quote.Currency, sourceQuoteId = quote.Id }, JsonOptions));
        quote.FreezePhasePlan(JsonSerializer.Serialize(phases.Select(p => new { p.Id, p.Position, p.Name,
            p.SampleCount, p.TurnaroundBusinessDays, p.AcceptedSubtotal, p.PriceLinesJson }), JsonOptions));
    }
}

public sealed record PhaseSourcePriceLine(Guid CatalogItemId, string ExternalItemId, string Description, decimal Quantity, decimal UnitPrice,
    Guid? PhaseId = null, int? TurnaroundBusinessDays = null, decimal? ProposedUnitPrice = null, string? PricingDecisionReason = null, string? PricingComponent = null);
