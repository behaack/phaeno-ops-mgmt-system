namespace PhaenoPortal.Test;

using System.Text.Json;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    private sealed partial class ShippingTestScope
    {
        // Scientific fixtures retain a real commercial cohort instead of orphan GUIDs.
        // Pricing/placement authorization is exercised separately in handoff tests.
        public LabServiceOrder AddCommercialPhaseOrder(string jobName, int sampleCount = 1)
        {
            var now = DateTime.UtcNow;
            var order = new LabServiceOrder(CustomerOrganization.Id,
                CustomerOrganization.Departments.Single(d => d.IsDefault).Id,
                OrderNumberGenerator.Lab(), jobName, null, sampleCount, false,
                "TEST source", "Frozen", "TEST safe", "TEST instructions");
            order.SourceGroups.Add(new LabServiceSourceGroup(order.Id, "TEST source", sampleCount));
            order.Submit(CustomerUser.Id, now);
            order.BeginQuotePreparation();
            var quote = new LabServiceQuote(order.Id, 1, QuotePurpose.Initial,
                JsonSerializer.Serialize(new[] { new { description = "TEST standard sample", quantity = sampleCount,
                    unitPrice = 100m, pricingComponent = LabPhasePricing.StandardSample } }),
                sampleCount * 100m, 0, "USD", now, now.AddDays(30));
            quote.SetDeliveryTarget(14);
            LabPhasePlans.FreezeQuote(order, quote);
            quote.MarkIssued();
            order.Quotes.Add(quote);
            order.MarkQuoteIssued(quote.Id);
            quote.Accept(CustomerUser.Id, now);
            order.AcceptQuote(quote.Id, now);
            DbContext.Add(order);
            return order;
        }

        public LabSample AddCommercialPhaseSample(LabServiceOrder order, string reference, string source = "TEST source")
        {
            var sample = new LabSample(order.Id, reference, "RNA", source, 1, "tube",
                "Frozen", "TEST safe", null, null, null, "[]");
            order.Samples.Add(sample);
            DbContext.Add(sample);
            return sample;
        }
    }
}
