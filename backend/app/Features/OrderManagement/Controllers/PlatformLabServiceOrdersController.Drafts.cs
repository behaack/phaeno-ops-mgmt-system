namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed record CommercialLabDraftWriteRequest(Guid OrganizationId, Guid? DepartmentId,
    CommercialLabOrderDraft Draft, Guid? SourceRequestId = null, long? Version = null);

public sealed partial class PlatformLabServiceOrdersController
{
    [HttpPut("{orderId:guid}/draft")]
    public async Task<LabServiceOrderDto> SaveDraft(Guid orderId, CommercialLabDraftWriteRequest request, CancellationToken ct)
    {
        var actor = await RequireCommercialAsync(false, ct);
        var result = await idempotency.ExecuteAsync(actor.Id, $"platform:lab-order:{orderId}:draft",
            idempotency.RequireKey(HttpContext), request, async token =>
            {
                await new LabPhasePlans(dbContext).LockAsync(orderId, token);
                var order = await ReadAsync(orderId, token);
                EnsureVersion(order.Version, request.Version ?? throw Conflict("draft_version_required", "Refresh the current Draft before saving."));
                if (order.OrganizationId != request.OrganizationId || order.DepartmentId != request.DepartmentId
                    || order.SourceRequestId != request.SourceRequestId)
                    throw Conflict("draft_owner_fixed", "A saved Draft retains its Customer, Department and Sales handoff.");
                Execute(() => CommercialDraftRules.Validate(request.Draft, false));
                await LabQuoteCatalog.RequireDraftSelectionAsync(dbContext, request.Draft.CatalogItemId, false, token);
                await EnsureUniqueJobNameAsync(order.OrganizationId, order.DepartmentId,
                    NormalizeJobName(request.Draft.JobName), token, order.Id);
                Execute(() => order.SaveCommercialDraft(request.Draft));
                Event(order, order.Status.ToString(), order.Status.ToString(), actor.Id);
                await dbContext.SaveChangesAsync(token);
                return await MapAsync(order, token);
            }, cancellationToken: ct, concurrencyScope: $"lab-order:{orderId}");
        return result.Response;
    }

    [HttpPost("{orderId:guid}/submit-for-pricing")]
    public async Task<LabServiceOrderDto> SubmitDraft(Guid orderId, VersionRequest request, CancellationToken ct)
    {
        var actor = await RequireCommercialAsync(false, ct);
        var result = await idempotency.ExecuteAsync(actor.Id, $"platform:lab-order:{orderId}:submit-draft",
            idempotency.RequireKey(HttpContext), request, async token =>
            {
                await new LabPhasePlans(dbContext).LockAsync(orderId, token);
                var order = await ReadAsync(orderId, token);
                EnsureVersion(order.Version, request.Version);
                if (order.Status != LabServiceOrderStatus.DraftRequest || order.CommercialDraftJson is null)
                    throw Conflict("draft_not_editable", "Only a current commercial Draft can be submitted for pricing.");
                var draft = order.ReadCommercialDraft()!;
                Execute(() => CommercialDraftRules.Validate(draft, true));
                await LabQuoteCatalog.RequireDraftSelectionAsync(dbContext, draft.CatalogItemId, true, token);
                var readiness = await CustomerReadiness(order.OrganizationId, order.DepartmentId, token);
                if (!readiness.CanStartPricing)
                    throw Conflict("customer_not_ready_for_pricing", "Resolve the Customer readiness requirements before submitting for pricing.");
                await LabServiceOrderingEligibility.RequireAsync(dbContext, order.OrganizationId, DateTime.UtcNow, token, order.DepartmentId);
                var sampleType = await LabOrderSampleTypeChoices.RequireAsync(dbContext, draft.SampleTypeDefinitionId, token);
                var now = DateTime.UtcNow;
                Execute(() => order.MaterializeCommercialDraft(actor.Id, now, sampleType.TemperatureRequirements));
                dbContext.AddRange(order.SourceGroups);
                dbContext.AddRange(order.Phases);
                order.SelectSampleType(sampleType.Id, sampleType.MaterialClass);
                dbContext.LabServiceRequestRevisions.Add(new LabServiceRequestRevision(order.Id, order.RequestRevision,
                    null, BuildRequestSnapshot(order), null, actor.Id, now));
                Event(order, LabServiceOrderStatus.DraftRequest.ToString(), order.Status.ToString(), actor.Id);
                await dbContext.SaveChangesAsync(token);
                return await MapAsync(order, token);
            }, cancellationToken: ct, concurrencyScope: $"lab-order:{orderId}");
        return result.Response;
    }
}
