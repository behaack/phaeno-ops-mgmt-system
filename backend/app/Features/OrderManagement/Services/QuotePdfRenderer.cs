namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Globalization;
using System.Text;
using UglyToad.PdfPig.Core;
using UglyToad.PdfPig.Fonts.TrueType;
using UglyToad.PdfPig.Fonts.TrueType.Parser;
using UglyToad.PdfPig.Writer;

public sealed record QuotePdfLine(string Description, decimal Quantity, decimal UnitPrice,
    Guid? CatalogItemId = null, Guid? PhaseId = null, string? PricingComponent = null);
public sealed record QuotePdfSource(string BiologicalSource, int SpecimenCount);
public sealed record QuotePdfScope(int RequestedSpecimenCount, IReadOnlyList<QuotePdfSource> SourceGroups, int? RequestedSequencingRunCount = null);
public sealed record QuotePdfPhase(string Name, int SampleCount, int TurnaroundBusinessDays, decimal AcceptedSubtotal,
    PhaenoPortal.App.Features.OrderManagement.Domain.LabPhaseScope? Scope = null, Guid? Id = null, int Position = 0);

public sealed record QuotePdfDocument(
    string OrderNumber, string? JobName, string OrganizationName, string DepartmentName,
    int Revision, string Status, string Purpose, DateTime IssuedAt, DateTime ExpiresAt,
    DateTime? AcceptedAt, IReadOnlyList<QuotePdfLine> Lines, decimal Subtotal, decimal Tax,
    decimal Total, string Currency, bool TaxDetermined, string? BillingContactName,
    string? BillingContactEmail, IReadOnlyList<string> BillingAddress, int? PaymentTermsDays,
    QuotePdfScope? SampleScope = null, int? DeliveryTargetBusinessDays = null, IReadOnlyList<QuotePdfPhase>? Phases = null,
    IReadOnlyDictionary<Guid, string>? CatalogItemNames = null);

/// <summary>A downloadable presentation of the saved quote, with no commercial recalculation.</summary>
public static class QuotePdfRenderer
{
    private static readonly Lazy<byte[]> Logo = new(() => ReadResource("phaeno-logo.png"));
    private static readonly Lazy<byte[]> Regular = new(() => ReadResource("Ubuntu-Regular.ttf"));
    private static readonly Lazy<byte[]> Bold = new(() => ReadResource("Ubuntu-Bold.ttf"));
    private static readonly Lazy<TrueTypeFont> RegularMap = new(() => TrueTypeFontParser.Parse(new TrueTypeDataBytes(Regular.Value)));
    private static readonly Lazy<TrueTypeFont> BoldMap = new(() => TrueTypeFontParser.Parse(new TrueTypeDataBytes(Bold.Value)));

    public static byte[] Render(QuotePdfDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);
        using var layout = new Layout(document);
        return layout.Render();
    }

    private static byte[] ReadResource(string name)
    {
        using var stream = typeof(QuotePdfRenderer).Assembly.GetManifestResourceStream($"QuoteDocuments/{name}")
            ?? throw new InvalidOperationException("The quote document branding is unavailable.");
        using var output = new MemoryStream();
        stream.CopyTo(output);
        return output.ToArray();
    }

    private sealed class Layout : IDisposable
    {
        private const double Left = 48;
        private const double Right = 564;
        private const double Bottom = 76;
        private const double Leading = 14;
        private const double PricingLeft = 300;
        private const double DetailsWidth = 232;
        private const string PhaseTiming = "Each phase's TAT starts when Phaeno physically receives every required sample for that phase. Business days exclude Phaeno holidays.";
        private readonly QuotePdfDocument document;
        private readonly PdfDocumentBuilder builder = new();
        private readonly PdfDocumentBuilder.AddedFont regular;
        private readonly PdfDocumentBuilder.AddedFont bold;
        private readonly List<PdfPageBuilder> pages = [];
        private PdfPageBuilder page = null!;
        private double y;

        public Layout(QuotePdfDocument document)
        {
            this.document = document;
            regular = builder.AddTrueTypeFont(Regular.Value);
            bold = builder.AddTrueTypeFont(Bold.Value);
            builder.DocumentInformation.Title = $"Quote {document.OrderNumber} - revision {document.Revision}";
            builder.DocumentInformation.Author = "Phaeno Inc.";
            builder.DocumentInformation.Subject = "Laboratory services quote";
            builder.DocumentInformation.Creator = "Phaeno Portal";
        }

        public byte[] Render()
        {
            NewPage();
            Context();
            if (document.Phases is { Count: > 1 } phases) PhaseReview(phases);
            else
            {
                SampleScope();
                if (document.Lines.Count > 0)
                    Ensure(43 + Math.Min(Wrap(ServiceName(document.Lines[0]), 268, 10).Count, 3) * Leading + 14);
                TableHeader();
                for (var index = 0; index < document.Lines.Count; index++)
                    TableRow(document.Lines[index], index == document.Lines.Count - 1);
                if (document.DeliveryTargetBusinessDays is { } days)
                {
                    y -= 4;
                    var timing = $"TAT: {days} business days after Phaeno physically receives every required sample. Business days exclude Phaeno holidays.";
                    Ensure(Wrap(timing, Right - Left, 10).Count * Leading + FooterHeight + 18);
                    Paragraph(timing, 10);
                    y -= 12;
                }
            }
            TotalsAndTerms();
            for (var index = 0; index < pages.Count; index++)
            {
                page = pages[index];
                Rule(Left, Right, 53);
                Text("Phaeno Inc. | phaenobiotech.com", Left, 36, 8, muted: true);
                RightText($"Page {index + 1} of {pages.Count}", Right, 36, 8, muted: true);
            }
            return builder.Build();
        }

        private void NewPage()
        {
            page = builder.AddPage(612, 792);
            pages.Add(page);
            page.AddPng(Logo.Value, new PdfRectangle(Left, 706, Left + 124, 746));
            RightText(document.Purpose == "Change" ? "CHANGE QUOTE" : "QUOTE", Right, 726, 24, strong: true);
            RightText($"Revision {document.Revision} | {document.Status}", Right, 706, 10);
            page.SetStrokeColor(162, 185, 59);
            page.DrawLine(new PdfPoint(Left, 689), new PdfPoint(Right, 689), 2);
            y = 668;
            if (pages.Count > 1)
            {
                foreach (var line in Wrap($"Job {document.OrderNumber} | Quote continued", Right - Left, 9))
                {
                    Text(line, Left, y, 9, muted: true);
                    y -= Leading;
                }
                y -= 8;
            }
        }

        private void Context()
        {
            var prepared = new List<(string Text, double Size, bool Strong, bool Muted)>
            {
                ("PREPARED FOR", 9, true, true),
                (document.OrganizationName, 14, true, false),
                ($"Department: {document.DepartmentName}", 10.5, false, false),
                ($"Job: {document.OrderNumber}", 11, true, false)
            };
            if (!string.IsNullOrWhiteSpace(document.JobName)) prepared.Add((document.JobName, 11, false, false));
            var billing = new List<(string Text, double Size, bool Strong, bool Muted)>();
            if (!string.IsNullOrWhiteSpace(document.BillingContactName)) billing.Add((document.BillingContactName, 10.5, false, false));
            if (!string.IsNullOrWhiteSpace(document.BillingContactEmail)) billing.Add((document.BillingContactEmail, 10.5, false, false));
            billing.AddRange(document.BillingAddress.Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => (value, 10.5, false, false)));
            var top = y;
            var preparedEnd = Block(prepared, Left, top, 266);
            var billingEnd = top;
            if (billing.Count > 0)
            {
                billing.Insert(0, ("BILLING DETAILS", 9, true, true));
                billingEnd = Block(billing, 334, top, Right - 334);
            }
            y = Math.Min(preparedEnd, billingEnd) - 12;
            Ensure(50);
            InlineField("Issued:", Date(document.IssuedAt), Left, y, 172);
            InlineField("Expires:", Date(document.ExpiresAt), Left + 172, y, 172);
            InlineField("Purpose:", document.Purpose, Left + 344, y, 172);
            y -= Leading;
            if (document.AcceptedAt is { } accepted)
            {
                InlineField("Accepted:", Date(accepted), Left, y, 240);
                y -= Leading;
            }
            y -= 12;
        }

        private double Block(IEnumerable<(string Text, double Size, bool Strong, bool Muted)> values, double x, double top, double width)
        {
            foreach (var value in values)
            {
                foreach (var line in Wrap(value.Text, width, value.Size, value.Strong))
                {
                    // Reject pathological context length instead of silently clipping customer details.
                    if (top < Bottom + 24)
                        throw new InvalidOperationException("The quote's customer or job details are too long for this document. Contact Phaeno for a copy.");
                    Text(line, x, top, value.Size, value.Strong, value.Muted);
                    top -= Math.Max(Leading, value.Size + 4);
                }
            }
            return top;
        }

        private sealed record ContentRow(string Text = "", string? RightValue = null, bool Strong = false,
            bool Muted = false, bool RuleBefore = false, double Size = 10.5,
            string? Label = null, string? SecondLabel = null, string? SecondValue = null);

        private void PhaseReview(IReadOnlyList<QuotePdfPhase> phases)
        {
            var ids = phases.Select(phase => phase.Id).ToHashSet();
            if (ids.Count != phases.Count || ids.Contains(null) || ids.Contains(Guid.Empty)
                || phases.Any(phase => phase.Position <= 0 || phase.SampleCount <= 0 || phase.TurnaroundBusinessDays <= 0)
                || document.Lines.Any(line => !line.PhaseId.HasValue || !ids.Contains(line.PhaseId)))
                throw new InvalidOperationException("The quote's phase identities and prices are incomplete.");

            var ordered = phases.OrderBy(phase => phase.Position).ToArray();
            ServiceSummary(ordered);
            for (var index = 0; index < ordered.Length; index++)
            {
                var phase = ordered[index];
                var details = PhaseDetails(phase);
                var prices = PhasePrices(phase);
                var rows = Math.Max(details.Count, prices.Count);
                var headingHeight = PhaseHeadingHeight(phase, false);
                var finalReserve = index == ordered.Length - 1
                    ? Wrap(PhaseTiming, Right - Left, 10).Count * Leading + FooterHeight + 30 : 0;
                var height = headingHeight + rows * Leading + 16;
                // Ordinary phases stay intact; the final phase keeps its totals/terms nearby.
                if (height + finalReserve <= 640 - Bottom) Ensure(height + finalReserve);
                else Ensure(headingHeight + 3 * Leading);

                var offset = 0;
                var firstPage = 0;
                while (offset < rows)
                {
                    if (offset > 0) NewPage();
                    var sourceHeading = details.FindIndex(row => row.Text == "Biological source" && row.RightValue == "Samples");
                    var repeatedDetails = offset > 0 && sourceHeading >= 0 ? sourceHeading + 1 : 0;
                    var remainingHeight = PhaseHeadingHeight(phase, offset > 0) + (rows - offset + repeatedDetails) * Leading + 16 + finalReserve;
                    if (remainingHeight <= 640 - Bottom) Ensure(remainingHeight);
                    if (offset == 0) firstPage = pages.Count;
                    var blockTop = y + 2;
                    DrawPhaseHeading(phase, offset > 0);
                    for (var detail = 0; detail < repeatedDetails; detail++)
                    {
                        DrawContentRow(details[detail], Left + 8, DetailsWidth - 16);
                        if (detail == 0 && offset >= prices.Count)
                            DrawContentRow(new($"Pricing shown on page {firstPage}.", Muted: true), PricingLeft + 8, Right - PricingLeft - 16);
                        y -= Leading;
                    }
                    var available = Math.Max(1, (int)Math.Floor((y - Bottom - 16) / Leading));
                    var count = Math.Min(rows - offset, available);
                    for (var row = offset; row < offset + count; row++)
                    {
                        if (row < details.Count) DrawContentRow(details[row], Left + 8, DetailsWidth - 16);
                        if (row < prices.Count) DrawContentRow(prices[row], PricingLeft + 8, Right - PricingLeft - 16);
                        y -= Leading;
                    }
                    offset += count;
                    page.SetStrokeColor(200, 213, 223);
                    page.DrawRectangle(new PdfPoint(Left, y + 3), Right - Left, blockTop - y - 3, 0.7, false);
                    y -= 16;
                }
            }
            Ensure(Wrap(PhaseTiming, Right - Left, 10).Count * Leading + FooterHeight + 14);
            Paragraph(PhaseTiming, 10, muted: true);
            y -= 14;
        }

        private void ServiceSummary(IReadOnlyList<QuotePdfPhase> phases)
        {
            var services = document.Lines.Where(line => line.PricingComponent != "AdditionalRun")
                .GroupBy(line => line.CatalogItemId?.ToString() ?? ServiceName(line)).ToArray();
            if (services.Length == 1)
            {
                var lines = Wrap($"Service: {ServiceName(services[0].First())}", Right - Left, 11, true);
                Ensure(lines.Count * Leading + 26);
                foreach (var line in lines) { Text(line, Left, y, 11, strong: true); y -= Leading; }
            }
            Ensure(26);
            Text($"Order scope · {Number(phases.Sum(phase => phase.SampleCount))} samples · {phases.Count} phases", Left, y, 10.5);
            y -= 24;
        }

        private List<ContentRow> PhaseDetails(QuotePdfPhase phase)
        {
            var result = new List<ContentRow>();
            if (phase.Scope is { } scope)
            {
                if (scope.Sources.Any(source => string.IsNullOrWhiteSpace(source.BiologicalSource) || source.SpecimenCount <= 0)
                    || scope.Sources.Sum(source => (long)source.SpecimenCount) != phase.SampleCount
                    || scope.SequencingRunCount < phase.SampleCount)
                    throw new InvalidOperationException("The quote's phase sample allocation is incomplete.");
                result.Add(new(Number(phase.SampleCount), Label: "Samples:", SecondLabel: "Sequencing runs:", SecondValue: Number(scope.SequencingRunCount)));
                result.Add(scope.RunsPerSample is { } runs
                    ? new(Number(runs), Label: "Runs per sample:", SecondLabel: "TAT:", SecondValue: $"{phase.TurnaroundBusinessDays} business days")
                    : new($"{phase.TurnaroundBusinessDays} business days", Label: "TAT:"));
                if (RunBreakdown(phase) is { AdditionalRuns: > 0, AdditionalRunsPerSample: { } additional })
                    result.Add(new($"1 included + {additional} additional per sample", Muted: true, Size: 10));
                result.Add(new("Biological source", "Samples", Strong: true, Size: 9.5));
                foreach (var source in scope.Sources)
                {
                    var wrapped = Wrap(source.BiologicalSource, DetailsWidth - 54, 10.5);
                    for (var index = 0; index < wrapped.Count; index++)
                        result.Add(new(wrapped[index], index == 0 ? Number(source.SpecimenCount) : null));
                }
            }
            else
            {
                result.Add(new(Number(phase.SampleCount), Label: "Samples:", SecondLabel: "TAT:", SecondValue: $"{phase.TurnaroundBusinessDays} business days"));
            }
            return result;
        }

        private List<ContentRow> PhasePrices(QuotePdfPhase phase)
        {
            var result = new List<ContentRow>();
            if (RunBreakdown(phase) is { AdditionalRuns: > 0 } breakdown)
            {
                var basis = breakdown.AdditionalRunsPerSample is { } additional
                    ? $"{Number(phase.SampleCount)} samples × {additional} additional {(additional == 1 ? "run" : "runs")}/sample = {Number(breakdown.AdditionalRuns)} additional runs."
                    : $"{Number(phase.Scope!.SequencingRunCount)} total runs - {Number(phase.SampleCount)} included runs = {Number(breakdown.AdditionalRuns)} additional runs.";
                result.AddRange(Wrap(basis, Right - PricingLeft - 16, 10).Select(text => new ContentRow(text, Muted: true, Size: 10)));
            }
            foreach (var line in document.Lines.Where(line => line.PhaseId == phase.Id)
                .OrderBy(line => line.PricingComponent == "AdditionalRun"))
            {
                var amount = Money(LineAmount(line));
                var amountWidth = Math.Max(68, Width(amount, 10.5));
                var name = ServiceName(line);
                var quantityPrice = $"{Number(line.Quantity)} × {Money(line.UnitPrice, preservePrecision: true)}";
                var width = Right - PricingLeft - amountWidth - 28;
                var text = $"{name} {quantityPrice}";
                var wrapped = Width(text, 10.5) <= width ? new List<string> { text }
                    : Wrap(name, width, 10.5).Concat(Wrap(quantityPrice, width, 10.5)).ToList();
                for (var index = 0; index < wrapped.Count; index++)
                    result.Add(new(wrapped[index], index == 0 ? amount : null));
            }
            result.Add(new("Phase price:", Money(phase.AcceptedSubtotal), Strong: true, RuleBefore: true));
            return result;
        }

        private sealed record PhaseRunBreakdown(decimal AdditionalRuns, int? AdditionalRunsPerSample);

        private PhaseRunBreakdown? RunBreakdown(QuotePdfPhase phase)
        {
            if (phase.Scope is not { } scope) return null;
            var lines = document.Lines.Where(line => line.PhaseId == phase.Id).ToArray();
            var included = lines.Where(line => line.PricingComponent == "StandardSample").Sum(line => line.Quantity);
            var additional = lines.Where(line => line.PricingComponent == "AdditionalRun").Sum(line => line.Quantity);
            if (included != phase.SampleCount || included + additional != scope.SequencingRunCount
                || (scope.RunsPerSample is { } runs && (long)phase.SampleCount * runs != scope.SequencingRunCount)) return null;
            return new(additional, scope.RunsPerSample is { } count ? count - 1 : null);
        }

        private double PhaseHeadingHeight(QuotePdfPhase phase, bool continued) =>
            Wrap($"{phase.Position}. {phase.Name}" + (continued ? " (continued)" : ""), DetailsWidth - 16, 11, true).Count * Leading + 17;

        private void DrawPhaseHeading(QuotePdfPhase phase, bool continued)
        {
            var height = PhaseHeadingHeight(phase, continued);
            page.SetTextAndFillColor(242, 247, 249);
            page.SetStrokeColor(242, 247, 249);
            page.DrawRectangle(new PdfPoint(Left, y - height + 15), Right - Left, height - 13, 0, true);
            var top = y - 12;
            foreach (var line in Wrap($"{phase.Position}. {phase.Name}" + (continued ? " (continued)" : ""), DetailsWidth - 16, 11, true))
            {
                Text(line, Left + 8, top, 11, strong: true); top -= Leading;
            }
            Text("Pricing", PricingLeft + 8, y - 12, 11, strong: true);
            y -= height;
        }

        private void DrawContentRow(ContentRow row, double x, double width)
        {
            if (row.RuleBefore) Rule(x, x + width, y + 10);
            if (row.Label is { } label)
            {
                InlineField(label, row.Text, x, y, row.SecondLabel is null ? width : width / 2);
                if (row.SecondLabel is { } second) InlineField(second, row.SecondValue!, x + width / 2, y, width / 2);
            }
            else Text(row.Text, x, y, row.Size, row.Strong, row.Muted);
            if (row.RightValue is { } value) RightText(value, x + width, y, row.Size, row.Strong);
        }

        private void InlineField(string label, string value, double x, double baseline, double width)
        {
            var size = 10d;
            while (size > 8 && Width(label + " ", size, true) + Width(value, size) > width - 4) size -= 0.5;
            if (Width(label + " ", size, true) + Width(value, size) > width - 4)
                throw new InvalidOperationException("The quote's detail value is too long to display.");
            Text(label + " ", x, baseline, size, strong: true);
            Text(value, x + Width(label + " ", size, true), baseline, size);
        }

        private string ServiceName(QuotePdfLine line) => line.PricingComponent == "AdditionalRun" ? "Additional sequencing runs"
            : line.CatalogItemId is { } id && document.CatalogItemNames?.TryGetValue(id, out var name) == true ? name : line.Description;

        private static decimal LineAmount(QuotePdfLine line) => Math.Round(line.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero);

        private void SampleScope()
        {
            if (document.SampleScope is not { } scope) return;
            SampleHeader(scope.RequestedSpecimenCount);
            foreach (var source in scope.SourceGroups)
            {
                var lines = Wrap(source.BiologicalSource, 420, 10);
                var offset = 0;
                while (offset < lines.Count)
                {
                    var available = (int)Math.Floor((y - Bottom - 14) / Leading);
                    if (available < Math.Min(lines.Count - offset, 34))
                    {
                        NewPage();
                        SampleHeader(scope.RequestedSpecimenCount);
                        available = (int)Math.Floor((y - Bottom - 14) / Leading);
                    }
                    var length = Math.Min(lines.Count - offset, available);
                    var rowTop = y;
                    for (var index = offset; index < offset + length; index++)
                    {
                        Text(lines[index], Left + 10, y, 10);
                        y -= Leading;
                    }
                    if (offset == 0) RightText(Number(source.SpecimenCount), Right - 10, rowTop, 10);
                    offset += length;
                    y -= 4;
                    Rule(Left, Right, y);
                    y -= 17;
                }
            }
            y -= 8;
        }

        private void SampleHeader(int total)
        {
            Ensure(100);
            y -= 9;
            page.SetTextAndFillColor(242, 247, 249);
            page.SetStrokeColor(242, 247, 249);
            page.DrawRectangle(new PdfPoint(Left, y - 18), Right - Left, 29, 0, true);
            Text($"Sample scope · {Number(total)} samples · {Number(document.SampleScope?.RequestedSequencingRunCount ?? total)} sample-sequencing runs", Left + 10, y - 6, 11, strong: true);
            y -= 37;
            Text("Biological source", Left + 10, y, 9, strong: true);
            RightText("Samples", Right - 10, y, 9, strong: true);
            Rule(Left, Right, y - 10);
            y -= 28;
        }

        private void TableHeader()
        {
            Ensure(85);
            page.SetTextAndFillColor(0, 48, 87);
            page.SetStrokeColor(0, 48, 87);
            page.DrawRectangle(new PdfPoint(Left, y - 24), Right - Left, 27, 0, true);
            Text("Description", Left + 10, y - 14, 9, strong: true, white: true);
            RightText("Quantity", 369, y - 14, 9, strong: true, white: true);
            RightText("Unit price", 453, y - 14, 9, strong: true, white: true);
            RightText("Amount", Right - 10, y - 14, 9, strong: true, white: true);
            y -= 43;
        }

        private void TableRow(QuotePdfLine line, bool last)
        {
            var description = Wrap(ServiceName(line), 268, 10);
            var quantities = Wrap(Number(line.Quantity), 47, 10);
            var prices = Wrap(Money(line.UnitPrice, preservePrecision: true), 72, 10);
            var amounts = Wrap(Money(LineAmount(line)), 89, 10);
            var count = new[] { description.Count, quantities.Count, prices.Count, amounts.Count }.Max();
            var timingHeight = document.DeliveryTargetBusinessDays is { } days
                ? Wrap($"TAT: {days} business days after Phaeno physically receives every required sample. Business days exclude Phaeno holidays.", Right - Left, 10).Count * Leading + 16 : 0;
            var finalReserve = last ? FooterHeight + timingHeight + 14 : 0;
            var finalCapacity = Math.Max(1, (int)Math.Floor((603 - Bottom - 25 - finalReserve) / Leading));
            var offset = 0;
            while (offset < count)
            {
                var available = (int)Math.Floor((y - Bottom - 14) / Leading);
                // Keep ordinary items together; only an item taller than a fresh page may split.
                var remaining = count - offset;
                var required = remaining <= 36 ? remaining : 3;
                if (last && remaining <= finalCapacity)
                    required = (int)Math.Ceiling((remaining * Leading + 25 + finalReserve) / Leading);
                if (available < required)
                {
                    NewPage();
                    TableHeader();
                    available = (int)Math.Floor((y - Bottom - 14) / Leading);
                }
                var length = Math.Min(remaining, available);
                // Leave a final chunk with enough room for TAT, terms, and totals.
                if (last && remaining <= available && remaining > finalCapacity)
                    length = remaining - finalCapacity;
                for (var index = offset; index < offset + length; index++)
                {
                    if (index < description.Count) Text(description[index], Left + 10, y, 10);
                    if (index < quantities.Count) RightText(quantities[index], 369, y, 10);
                    if (index < prices.Count) RightText(prices[index], 453, y, 10);
                    if (index < amounts.Count) RightText(amounts[index], Right - 10, y, 10);
                    y -= Leading;
                }
                offset += length;
                y -= 4;
                Rule(Left, Right, y);
                y -= 21;
            }
        }

        private double FooterHeight => document.TaxDetermined ? 94 : 74;

        private void TotalsAndTerms()
        {
            Ensure(FooterHeight + 14);
            var top = y + 5;
            var notes = new List<(string Text, double Size, bool Strong, bool Muted)>();
            if (document.PaymentTermsDays is { } days)
                notes.Add(($"Payment terms: Net {days.ToString(CultureInfo.InvariantCulture)} days.", 10, true, false));
            if (!document.TaxDetermined)
                notes.Add(("Applicable tax will be calculated at invoicing.", 10, false, false));
            notes.Add(("Review this quote and its current status in Phaeno Portal.", 10, false, true));
            Block(notes, Left, top - 15, DetailsWidth);

            page.SetTextAndFillColor(242, 247, 249);
            page.SetStrokeColor(242, 247, 249);
            page.DrawRectangle(new PdfPoint(PricingLeft, top - FooterHeight), Right - PricingLeft, FooterHeight, 0, true);
            y = top - 17;
            RightText($"Currency: {document.Currency}", Right - 12, y, 9, muted: true);
            y -= 22;
            TotalRow("Subtotal", document.Subtotal);
            if (document.TaxDetermined) TotalRow("Tax", document.Tax);
            Rule(PricingLeft + 12, Right - 12, y + 9);
            y -= 8;
            TotalRow(document.TaxDetermined ? "Total" : "Pre-tax total", document.Total, true);
            y = top - FooterHeight - 14;
        }

        private void TotalRow(string label, decimal amount, bool strong = false)
        {
            Text(label, PricingLeft + 12, y, strong ? 12 : 10.5, strong);
            var value = Money(amount);
            var size = strong ? 14d : 10.5d;
            var available = Right - PricingLeft - 24 - Width(label, strong ? 12 : 10.5, strong) - 12;
            while (size > 8 && Width(value, size, strong) > available) size -= 0.5;
            if (Width(value, size, strong) > available)
                throw new InvalidOperationException("The quote total is too long to display.");
            RightText(value, Right - 12, y, size, strong);
            y -= strong ? 24 : 20;
        }

        private void Paragraph(string value, double size, bool strong = false, bool muted = false)
        {
            foreach (var line in Wrap(value, Right - Left, size, strong))
            {
                Ensure(Leading);
                Text(line, Left, y, size, strong, muted);
                y -= Leading;
            }
        }

        private void Ensure(double height)
        {
            if (y - height < Bottom) NewPage();
        }

        private void Rule(double start, double end, double position)
        {
            page.SetStrokeColor(200, 213, 223);
            page.DrawLine(new PdfPoint(start, position), new PdfPoint(end, position), 0.7);
        }

        private void Text(string value, double x, double baseline, double size, bool strong = false, bool muted = false, bool white = false)
        {
            value = Clean(value, strong);
            if (white) page.SetTextAndFillColor(255, 255, 255);
            else if (muted) page.SetTextAndFillColor(77, 99, 116);
            else page.SetTextAndFillColor(0, 48, 87);
            page.AddText(value, size, new PdfPoint(x, baseline), strong ? bold : regular);
        }

        private void RightText(string value, double right, double baseline, double size, bool strong = false, bool muted = false, bool white = false) =>
            Text(value, right - Width(value, size, strong), baseline, size, strong, muted, white);

        private double Width(string value, double size, bool strong = false)
        {
            var letters = page.MeasureText(Clean(value, strong), size, new PdfPoint(0, 0), strong ? bold : regular);
            return letters.Count == 0 ? 0 : letters[^1].EndBaseLine.X;
        }

        private List<string> Wrap(string value, double width, double size, bool strong = false)
        {
            value = Clean(value, strong);
            var result = new List<string>();
            foreach (var paragraph in value.Split('\n'))
            {
                var current = "";
                foreach (var word in paragraph.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                {
                    var candidate = current.Length == 0 ? word : $"{current} {word}";
                    if (Width(candidate, size, strong) <= width) { current = candidate; continue; }
                    if (current.Length > 0) { result.Add(current); current = ""; }
                    foreach (var character in word)
                    {
                        candidate = current + character;
                        if (Width(candidate, size, strong) > width && current.Length > 0)
                        {
                            result.Add(current);
                            current = character.ToString();
                        }
                        else current = candidate;
                    }
                }
                if (current.Length > 0 || paragraph.Length == 0) result.Add(current);
            }
            return result.Count == 0 ? [""] : result;
        }

        private static string Clean(string value, bool strong)
        {
            var normalized = value.Normalize(NormalizationForm.FormC).Replace("\r\n", "\n", StringComparison.Ordinal).Replace('\r', '\n').Replace('\t', ' ');
            var map = (strong ? BoldMap.Value : RegularMap.Value).TableRegister.CMapTable;
            foreach (var character in normalized)
            {
                if (character == '\n') continue;
                if (char.IsControl(character) || map is null || !map.TryGetGlyphIndex(character, out var glyph) || glyph == 0)
                    throw new InvalidOperationException("This quote contains characters that the document font cannot display. Contact Phaeno for a copy.");
            }
            return normalized;
        }

        private static string Date(DateTime value) => value.ToString("MMM d, yyyy", CultureInfo.InvariantCulture);
        private static string Number(decimal value) => value.ToString("0.############################", CultureInfo.InvariantCulture);
        private string Money(decimal value, bool preservePrecision = false) => (document.Currency.Equals("USD", StringComparison.OrdinalIgnoreCase) ? "$" : "")
            + value.ToString(preservePrecision ? "#,0.00##########################" : "#,0.00", CultureInfo.InvariantCulture);
        public void Dispose() => builder.Dispose();
    }
}
