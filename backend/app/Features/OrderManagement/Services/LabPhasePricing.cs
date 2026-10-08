namespace PhaenoPortal.App.Features.OrderManagement.Services;

using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public static class LabPhasePricing
{
    public const string StandardSample = "StandardSample";
    public const string AdditionalRun = "AdditionalRun";

    public static decimal? ProposedPrice(LabJobPhase phase, string? component) => component == StandardSample
        ? phase.ProposedUnitPrice : component == AdditionalRun ? phase.ProposedAdditionalRunPrice : null;

    public static void ValidateSingle(IReadOnlyList<QuoteLineRequest> lines, int samples, int totalRuns)
    {
        var standard = lines.Where(l => l.PricingComponent == StandardSample).ToArray();
        var additional = lines.Where(l => l.PricingComponent == AdditionalRun).ToArray();
        var extra = totalRuns - samples;
        if (lines.Select(l => l.CatalogItemId).Distinct().Count() != 1 || lines.Any(l => l.PhaseId.HasValue || l.TurnaroundBusinessDays.HasValue)
            || standard.Length != 1 || standard[0].Quantity != samples || lines.Count != (extra > 0 ? 2 : 1)
            || extra == 0 && additional.Length != 0 || extra > 0 && (additional.Length != 1 || additional[0].Quantity != extra))
            throw Error("quote_lab_service_quantity_mismatch", "Price one standard service per sample and only the additional sequencing runs separately.");
    }
    public static void Validate(LabServiceOrder order, IssueQuoteRequest request, IReadOnlyList<QuoteLineRequest> serviceLines)
    {
        var phases = order.Phases.Where(p => p.SupersededAtUtc == null).ToArray();
        if (phases.Any(p => p.ReadScope() is null) || serviceLines.Select(l => l.CatalogItemId).Distinct().Count() != 1
            || request.Lines.Any(l => !l.PhaseId.HasValue || phases.All(p => p.Id != l.PhaseId))
            || request.Lines.Any(l => !serviceLines.Contains(l) && (l.TurnaroundBusinessDays.HasValue || l.PricingComponent != null)))
            throw Error("phase_quote_scope", "Assign every quote line to a current phase and use the same laboratory service throughout the order.");
        foreach (var phase in phases)
        {
            var lines = serviceLines.Where(l => l.PhaseId == phase.Id).ToArray();
            var standard = lines.Where(l => l.PricingComponent == StandardSample).ToArray();
            var additional = lines.Where(l => l.PricingComponent == AdditionalRun).ToArray();
            var additionalRuns = phase.ReadScope()!.SequencingRunCount - phase.SampleCount;
            if (standard.Length != 1 || standard[0].Quantity != phase.SampleCount
                || standard[0].TurnaroundBusinessDays is not (>= 1 and <= 365)
                || lines.Length != (additionalRuns > 0 ? 2 : 1)
                || additionalRuns == 0 && additional.Length != 0
                || additionalRuns > 0 && (additional.Length != 1 || additional[0].Quantity != additionalRuns || additional[0].TurnaroundBusinessDays.HasValue))
                throw Error("phase_quote_scope", "Price each sample once for library preparation, one run and data assembly; price only the remaining runs separately. Set a turnaround of 1 to 365 business days on the sample service.");
            if (lines.Any(line => ProposedPrice(phase, line.PricingComponent) is { } proposed && proposed != line.UnitPrice)
                && string.IsNullOrWhiteSpace(request.PricingDecisionReason))
                throw Error("phase_price_reason_required", "Explain the changes to proposed sample or additional-run prices before issuing the quote.");
        }
    }

    private static OrderManagementException Error(string code, string message) => new(code, message, 409);
}
