namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Commercial.LabOperations.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record LabPurchasedServiceDto(string CurrentServiceKey, string PurchasedServiceKey,
    string PurchasedServiceName, long WorkVersion, bool CanCorrect);
public sealed record CorrectLabPurchasedServiceRequest(Guid RequestId, long Version, string Reason);

[ApiController, Authorize]
[ServiceFilter(typeof(PhaenoPortal.App.Features.Trials.Services.TrialWorkGuard))]
[Route("api/platform/lab-operations/work-orders/{workOrderId:guid}/purchased-service")]
public sealed class LabPurchasedServiceController(PSeqOperationsDbContext db,
    LabOperationsRequestContext roles, ILabOperationsProvider provider) : ControllerBase
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    { Converters = { new JsonStringEnumConverter() } };

    [HttpGet]
    public async Task<LabPurchasedServiceDto> Read(Guid workOrderId, CancellationToken ct)
    {
        await roles.RequireAsync(HttpContext, ct, LabRole.Supervisor, LabRole.OperationsAdministrator);
        var work = await db.LabWorkOrders.SingleOrDefaultAsync(w => w.Id == workOrderId, ct) ?? throw Missing();
        var purchase = await ReadPurchaseAsync(work, ct);
        return await DescribeAsync(work, purchase.Key, purchase.Name, ct);
    }

    [HttpPost]
    public async Task<LabPurchasedServiceDto> Correct(Guid workOrderId,
        [FromBody] CorrectLabPurchasedServiceRequest request, CancellationToken ct)
    {
        var actor = await roles.RequireAsync(HttpContext, ct, LabRole.Supervisor, LabRole.OperationsAdministrator);
        var reason = request.Reason?.Trim();
        if (request.RequestId == Guid.Empty || string.IsNullOrWhiteSpace(reason) || reason.Length > 2000)
            throw new OrderManagementException("purchased_service_reason_required", "Record a correction reason (up to 2000 characters) and request identity.");
        var sourceId = await db.LabWorkOrders.AsNoTracking().Where(w => w.Id == workOrderId)
            .Select(w => (Guid?)w.AuthorizationSourceId).SingleOrDefaultAsync(ct) ?? throw Missing();
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"sample-shipping:{sourceId}", ct);
        await SampleShippingPackingData.LockAsync(db, $"lab-tube-receipt:{workOrderId}", ct);
        var work = await db.LabWorkOrders.SingleOrDefaultAsync(w => w.Id == workOrderId, ct) ?? throw Missing();
        var purchase = await ReadPurchaseAsync(work, ct);
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new { workOrderId, request }, Options))));
        var prior = await db.LabWorkEvents.AsNoTracking().Where(e => e.LabWorkOrderId == workOrderId
            && e.EventCode == "PurchasedServiceCorrected").ToListAsync(ct);
        foreach (var entry in prior)
        {
            using var details = JsonDocument.Parse(entry.DetailsJson);
            if (details.RootElement.GetProperty("requestId").GetGuid() != request.RequestId) continue;
            if (entry.ActorUserId != actor.User.Id || details.RootElement.GetProperty("requestHash").GetString() != hash)
                throw Conflict("purchased_service_request_reused", "This correction request was used for different evidence.");
            return await DescribeAsync(work, purchase.Key, purchase.Name, ct);
        }
        if (work.Version != request.Version)
            throw Conflict("stale_write", "The job changed. Reload and review its purchased service before correcting it.");
        var preview = await DescribeAsync(work, purchase.Key, purchase.Name, ct);
        if (!preview.CanCorrect)
            throw Conflict("purchased_service_correction_unavailable", "Only an unstarted Commercial job with an unmatched purchased service can be corrected.");
        var original = LabServiceIdentityCorrectionPolicy.ReadCommercialSnapshot(purchase.Authorization.AuthorizationSnapshotJson)
            ?? throw Conflict("purchased_service_authorization_missing", "Review the original laboratory authorization before correcting its service.");
        var now = DateTime.UtcNow;
        var metadata = new LabOperationsCommandMetadata(request.RequestId, work.AuthorizationId, now, original.Metadata.ContractVersion);
        var replacement = original with { Metadata = metadata,
            AuthorizationVersion = purchase.Authorization.AuthorizationVersion + 1, ServiceKey = purchase.Key };
        var oldKey = work.ServiceKey;
        var outcome = await provider.AmendAuthorizationAsync(new(metadata, work.AuthorizationId,
            purchase.Authorization.AuthorizationVersion, replacement.AuthorizationVersion,
            LabServiceIdentityCorrectionPolicy.ReasonCode, replacement), ct);
        if (outcome.Disposition is not (LabCommandDisposition.Accepted or LabCommandDisposition.AlreadyApplied))
            throw Conflict("purchased_service_correction_rejected", "The laboratory authorization requires review. Its service was not corrected.");
        purchase.Authorization.RecordAmendment(replacement.AuthorizationVersion, request.RequestId,
            JsonSerializer.Serialize(replacement, Options));
        purchase.Authorization.RecordOutcome(work.Id, outcome.Disposition.ToString(), outcome.ReasonCode);
        db.LabWorkEvents.Add(new(work.Id, null, "PurchasedServiceCorrected", now, actor.User.Id,
            JsonSerializer.Serialize(new { requestId = request.RequestId, requestHash = hash,
                previousServiceKey = oldKey, purchasedServiceKey = purchase.Key, reason,
                authorizationVersion = replacement.AuthorizationVersion }, Options)));
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await DescribeAsync(work, purchase.Key, purchase.Name, ct);
    }

    private async Task<(CommercialLabAuthorization Authorization, string Key, string Name)> ReadPurchaseAsync(LabWorkOrder work, CancellationToken ct)
    {
        if (work.AuthorizationSource != LabAuthorizationSource.CommercialOrder) throw Missing();
        var authorization = await db.CommercialLabAuthorizations.SingleOrDefaultAsync(a => a.AuthorizationId == work.AuthorizationId
            && a.CommercialOrderId == work.AuthorizationSourceId && a.OrganizationId == work.SubmittingOrganizationId, ct) ?? throw Missing();
        var order = await db.LabServiceOrders.AsNoTracking().Include(o => o.Quotes)
            .SingleAsync(o => o.Id == authorization.CommercialOrderId && o.OrganizationId == work.SubmittingOrganizationId, ct);
        var quote = order.Quotes.SingleOrDefault(q => q.Id == order.AcceptedQuoteId)
            ?? throw Conflict("accepted_quote_required", "This job has no accepted purchase to establish its service.");
        var service = await LabQuoteCatalog.ReadServiceIdentityAsync(db, quote.LinesJson, ct);
        return (authorization, service.ServiceKey, service.Name);
    }

    private async Task<LabPurchasedServiceDto> DescribeAsync(LabWorkOrder work, string key, string name, CancellationToken ct)
        => new(work.ServiceKey, key, name, work.Version,
            work.ServiceKey != key && LabServiceIdentityCorrectionPolicy.HasUnstartedStatus(work)
            && !await db.LabSpecimenAttempts.AnyAsync(a => a.LabWorkOrderId == work.Id, ct)
            && !await db.LabProtocolExecutions.AnyAsync(e => e.LabWorkOrderId == work.Id, ct)
            && !await db.LabLibraries.AnyAsync(l => l.LabWorkOrderId == work.Id, ct));

    private static OrderManagementException Missing() => new("not_found", "The Commercial laboratory job was not found.", 404);
    private static OrderManagementException Conflict(string code, string message) => new(code, message, 409);
}
