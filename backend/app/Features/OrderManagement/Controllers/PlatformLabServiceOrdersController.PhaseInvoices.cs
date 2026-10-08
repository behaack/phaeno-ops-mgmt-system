using System.Text.Json;
namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class PlatformLabServiceOrdersController
{
    [HttpPost("{orderId:guid}/phases/invoices")]
    public async Task<PhaseBillingPlanDto> IssuePhaseInvoice(Guid orderId, LabPhaseInvoiceWriteRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireBusinessRoleAsync(HttpContext, BusinessRole.BillingOperator,
            orderToCashOptions.Value.BusinessRoles || orderToCashOptions.Value.DualControlEnforced, ct);
        if (!orderToCashOptions.Value.NativePSeqAccountsReceivable)
            throw Conflict("native_receivables_required", "Phase billing requires PSeq accounts receivable.");
        string? pdfKey = null;
        try
        {
            var execution = await idempotency.ExecuteAsync(actor.Id, $"platform:lab-order:{orderId}:phase-invoice",
                idempotency.RequireKey(HttpContext), request, async token =>
                {
                    await new LabPhasePlans(dbContext).LockAsync(orderId, token);
                    var order = await ReadAsync(orderId, token);
                    if (!order.AcceptedQuoteId.HasValue) throw Conflict("accepted_quote_required", "Accept the Job quote before invoicing a phase.");
                    var facts = await new LabPhaseFacts(dbContext).ReadAsync(orderId, token);
                    if (facts.Revision != request.Revision) throw Conflict("phase_plan_changed", "Refresh and review the current phase plan before invoicing.");
                    if (request.Parts.Count == 0 || request.Parts.Select(x => x.PhaseId).Distinct().Count() != request.Parts.Count)
                        throw Conflict("phase_invoice_invalid", "Choose distinct phase portions for this invoice.");
                    foreach (var part in request.Parts)
                    {
                        var phase = facts.Phases.SingleOrDefault(p => p.Id == part.PhaseId) ?? throw Missing();
                        if (phase.Lifecycle == "Cancelled" || part.Subtotal <= 0 || part.Subtotal != decimal.Round(part.Subtotal, 2)
                            || part.Subtotal > phase.AcceptedSubtotal - phase.InvoicedSubtotal)
                            throw Conflict("phase_invoice_balance", "Choose positive amounts within each phase's remaining accepted subtotal. Review cancelled scope with Finance separately.");
                    }
                    var quote = order.Quotes.Single(q => q.Id == order.AcceptedQuoteId);
                    if (quote.Currency != "USD") throw Conflict("currency_not_supported", "Phase invoices support USD.");
                    var components = order.Quotes.Where(q => q.Id == order.AcceptedQuoteId || q.Purpose == QuotePurpose.Change && q.Status == QuoteStatus.Accepted).ToArray();
                    var quotedTerms = quote.BillingContactSnapshotJson != null && quote.BillingAddressSnapshotJson != null
                        && quote.TaxDecisionSnapshotJson != null && quote.PaymentTermsDaysSnapshot.HasValue;
                    var profile = await dbContext.OrganizationCommercialProfiles.SingleOrDefaultAsync(p => p.OrganizationId == order.OrganizationId, token);
                    if ((!quotedTerms || components.Any(q => q.TaxDecisionSnapshotJson == null)) &&
                        (profile == null || !profile.HasCompleteBillingContact || !profile.HasCompleteBillingAddress
                        || !profile.HasFinanceApprovedTaxDecision || !profile.HasEffectiveTaxDecision))
                        throw Conflict("billing_profile_required", "Finance must approve complete billing and tax details before invoicing an accepted pre-tax quote.");
                    var contact = quotedTerms ? quote.BillingContactSnapshotJson! : SerializeBillingContact(profile!, profile!.BillingContactEmail!);
                    var address = quotedTerms ? quote.BillingAddressSnapshotJson! : profile!.BillingAddressJson!;
                    var terms = quotedTerms ? quote.PaymentTermsDaysSnapshot!.Value : profile!.PaymentTermsDays;
                    var acceptedTax = components.Sum(q => q.TaxDecisionSnapshotJson != null ? q.Tax : CalculateTax(q.Subtotal, profile!));
                    var exactRate = facts.AcceptedSubtotal == 0 ? 0 : acceptedTax / facts.AcceptedSubtotal;
                    var rate = decimal.Round(exactRate, 6, MidpointRounding.AwayFromZero);
                    var priorInvoices = await dbContext.Invoices.AsNoTracking().Where(i => i.LabServiceOrderId == orderId && i.Status != InvoiceStatus.Voided).ToListAsync(token);
                    var priorIds = priorInvoices.Select(i => i.Id).ToArray();
                    var priorRates = await dbContext.InvoiceLines.AsNoTracking().Where(l => priorIds.Contains(l.InvoiceId))
                        .Select(l => new { l.InvoiceId, l.TaxRate }).ToListAsync(token);
                    var sameRateIds = priorRates.GroupBy(l => l.InvoiceId).Where(g => g.All(l => l.TaxRate == rate)).Select(g => g.Key).ToHashSet();
                    var comparableInvoices = priorInvoices.Where(i => sameRateIds.Contains(i.Id)).ToArray();
                    var subtotal = request.Parts.Sum(p => p.Subtotal);
                    // Rounding is cumulative within the same issued rate. Later tax
                    // approvals must not recalculate tax on already-issued invoices.
                    var cumulativeTax = decimal.Round((comparableInvoices.Sum(i => i.Subtotal) + subtotal) * exactRate, 2, MidpointRounding.AwayFromZero);
                    var tax = Math.Max(0, cumulativeTax - comparableInvoices.Sum(i => i.TaxTotal));
                    var remainingTax = tax;
                    var remainingSubtotal = subtotal;
                    var lines = request.Parts.Select((part, i) => {
                        var lineTax = i == request.Parts.Count - 1 ? remainingTax : Math.Min(remainingTax,
                            decimal.Round(part.Subtotal * tax / subtotal, 2, MidpointRounding.AwayFromZero));
                        // Leave enough capacity for the remaining lines when the rate is 100%.
                        lineTax = Math.Max(lineTax, remainingTax - (remainingSubtotal - part.Subtotal));
                        remainingTax -= lineTax; remainingSubtotal -= part.Subtotal;
                        return new InvoiceLine(Guid.NewGuid(), i + 1, null,
                            $"{order.OrderNumber} · {facts.Phases.Single(p => p.Id == part.PhaseId).Name} · agreed billing portion", 1, part.Subtotal, rate, lineTax);
                    }).ToArray();
                    var taxDecision = JsonSerializer.Serialize(new { agreedBilling = quotedTerms ? quote.TaxDecisionSnapshotJson : SerializeTaxDecision(profile!),
                        components = components.Select(q => new { quoteId = q.Id, q.Subtotal, tax = q.TaxDecisionSnapshotJson != null ? q.Tax : CalculateTax(q.Subtotal, profile!), q.TaxDecisionSnapshotJson }),
                        apportionedSubtotal = subtotal, apportionedTax = tax }, JsonOptions);
                    var issued = DateOnly.FromDateTime(DateTime.UtcNow);
                    var number = $"INV-{issued:yyyyMMdd}-{Guid.NewGuid():N}"[..21].ToUpperInvariant();
                    var customer = await dbContext.Organizations.Where(x => x.Id == order.OrganizationId).Select(x => x.Name).SingleAsync(token);
                    var pdf = InvoicePdfRenderer.Render(number, customer, issued, issued.AddDays(terms),
                        lines.Select(x => new InvoicePdfLine(x.Description, x.Quantity, x.UnitPrice, x.Subtotal)).ToList(), subtotal, tax, subtotal + tax, "USD");
                    await using var stream = new MemoryStream(pdf, false);
                    var stored = await fileStorage.SaveAsync(stream, ".pdf", 5_000_000, token);
                    pdfKey = stored.StorageKey;
                    var invoice = new Invoice(order.OrganizationId, orderId, quote.Id, number, issued, terms,
                        contact, address, taxDecision,
                        subtotal, tax, stored.StorageKey, stored.Sha256, actor.Id, DateTime.UtcNow);
                    dbContext.Invoices.Add(invoice);
                    for (var i = 0; i < request.Parts.Count; i++)
                    {
                        var part = request.Parts[i];
                        var phase = order.Phases.Single(p => p.Id == part.PhaseId);
                        dbContext.InvoiceLines.Add(new InvoiceLine(invoice.Id, i + 1, null, lines[i].Description, 1, part.Subtotal, rate, lines[i].TaxAmount));
                        var allocation = new LabPhaseInvoiceAllocation(invoice.Id, phase, part.Subtotal);
                        dbContext.Set<LabPhaseInvoiceAllocation>().Add(allocation);
                        dbContext.Set<LabPhaseBillingAssignment>().Add(new(allocation.Id, phase.Id, part.Subtotal));
                    }
                    Notice(order, "lab-invoice-issued", "Invoice available", $"Invoice {number} is available for {order.OrderNumber}.");
                    await dbContext.SaveChangesAsync(token);
                    var saved = await new LabPhaseFacts(dbContext).ReadAsync(orderId, token);
                    return new PhaseBillingPlanDto(orderId, saved.Revision, saved.Currency, saved.Phases
                        .Select(p => new PhaseBillingItemDto(p.Id, p.Name, p.Lifecycle, p.AcceptedSubtotal, p.InvoicedSubtotal)).ToArray());
                }, statusCode: StatusCodes.Status201Created, cancellationToken: ct, concurrencyScope: $"lab-order:{orderId}");
            Response.StatusCode = execution.StatusCode;
            return execution.Response;
        }
        catch
        {
            if (pdfKey != null)
            {
                try
                {
                    if (!await dbContext.Invoices.AsNoTracking().AnyAsync(x => x.PdfStorageKey == pdfKey, CancellationToken.None))
                        await fileStorage.DeleteIfExistsAsync(pdfKey, CancellationToken.None);
                }
                catch (Exception e) { logger.LogWarning(e, "Retain unverified phase invoice PDF for Job {OrderId} recovery.", orderId); }
            }
            throw;
        }
    }
}
