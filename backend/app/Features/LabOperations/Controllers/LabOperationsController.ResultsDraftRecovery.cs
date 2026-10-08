namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using System.Text.Json.Nodes;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    private const string RecoveryIdsProperty = "recoveredSetIds";
    private static Guid[] ResultsDraftRecoveryIds(string payload)
    {
        using var json = JsonDocument.Parse(payload);
        return json.RootElement.TryGetProperty(RecoveryIdsProperty, out var ids) ? ids.Deserialize<Guid[]>() ?? [] : [];
    }
    private static string ResultsDraftPayload(string input, string previous)
    {
        var payload = JsonNode.Parse(input)!.AsObject();
        // Clients cannot manufacture or replace the server-reviewed recovery scope.
        payload.Remove(RecoveryIdsProperty); payload.Remove("recoveredFromDraftId"); payload.Remove("recoveryRequestSha256"); payload.Remove("restartedAsDraftId");
        var prior = JsonNode.Parse(previous)!.AsObject();
        foreach (var key in new[] { RecoveryIdsProperty, "recoveredFromDraftId", "recoveryRequestSha256", "restartedAsDraftId" })
            if (prior.TryGetPropertyValue(key, out var value)) payload[key] = value?.DeepClone();
        return payload.ToJsonString();
    }
    public sealed record RestartResultsDraftRequest(Guid Id, Guid SourceDraftId, int SourceVersion, long SendoutVersion, JsonElement Payload);

    [HttpPost("sendouts/{sendoutId:guid}/results/drafts/restart")]
    public async Task<object> RestartResultsDraft(Guid sendoutId, RestartResultsDraftRequest input,
        [FromServices] IOptions<LabFastqOptions> limits, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        if (input.Id == Guid.Empty || input.Id == input.SourceDraftId || input.Payload.ValueKind != JsonValueKind.Object || input.Payload.GetRawText().Length > 1_048_576)
            throw Invalid("results_draft_invalid", "Review the results draft before restarting.");
        var requestHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(input, JsonOptions))));
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "lab-sendout:" + sendoutId, ct);
        var sendout = await dbContext.LabNgsSendouts.SingleOrDefaultAsync(s => s.Id == sendoutId, ct) ?? throw Missing();
        EnsureVersion(sendout.Version, input.SendoutVersion);
        if (sendout.Status is not (LabNgsSendoutStatus.ReceivedByProvider or LabNgsSendoutStatus.Complete))
            throw Conflict("results_not_ready", "Record results after vendor receipt.");
        var source = await dbContext.Set<LabVendorResultsDraft>().SingleOrDefaultAsync(d => d.Id == input.SourceDraftId
            && d.LabNgsSendoutId == sendoutId && d.UserId == actor.User.Id && d.SavedAtUtc == null, ct) ?? throw Missing();
        var existing = await dbContext.Set<LabVendorResultsDraft>().AsNoTracking().SingleOrDefaultAsync(d => d.Id == input.Id, ct);
        if (existing is not null) {
            using var metadata = JsonDocument.Parse(existing.PayloadJson);
            if (existing.UserId != actor.User.Id || existing.LabNgsSendoutId != sendoutId || existing.SendoutVersion != sendout.Version
                || !metadata.RootElement.TryGetProperty("recoveredFromDraftId", out var prior) || prior.GetGuid() != source.Id
                || !metadata.RootElement.TryGetProperty("recoveryRequestSha256", out var hash) || hash.GetString() != requestHash)
                throw Conflict("results_draft_changed", "This restart identity has different instructions.");
            return new { existing.Id, existing.Version, existing.ExpiresAtUtc };
        }
        if (source.Version != input.SourceVersion) throw Conflict("results_draft_changed", "This draft changed in another window. Reload before restarting.");
        var sourceMetadata = JsonNode.Parse(source.PayloadJson)!.AsObject();
        if (sourceMetadata.ContainsKey("restartedAsDraftId")) throw Conflict("results_draft_restarted", "This draft already has a replacement. Reload and continue that draft.");
        var sourceIds = ResultsDraftRecoveryIds(source.PayloadJson);
        var sets = await dbContext.Set<LabFastqSet>().AsNoTracking().Where(s => s.RecordedByUserId == actor.User.Id
            && !s.LabVendorResultsVersionId.HasValue && (s.LabVendorResultsDraftId == source.Id || sourceIds.Contains(s.Id))).OrderBy(s => s.Id).ToListAsync(ct);
        var retained = new List<Guid>();
        foreach (var set in sets) {
            await SampleShippingPackingData.LockAsync(dbContext, "fastq-set:" + set.Id, ct);
            var files = await dbContext.Set<LabFastqUpload>().AsNoTracking().Where(u => u.LabFastqSetId == set.Id).ToListAsync(ct);
            try { LabFastqValidation.RequireComplete(set, files, JsonSerializer.Deserialize<LabFastqOptions>(set.PolicyJson, JsonOptions)!); retained.Add(set.Id); }
            catch (OrderManagementException) { /* Incomplete sets remain preserved; a new set is required. */ }
        }
        var latest = await dbContext.LabVendorResultsVersions.AsNoTracking().Where(v => v.LabNgsSendoutId == sendoutId).OrderByDescending(v => v.ResultVersion).FirstOrDefaultAsync(ct);
        var currentIds = latest is null ? [] : JsonSerializer.Deserialize<VendorResultsSnapshot>(latest.SnapshotJson, JsonOptions)!.FastqSets?.Select(s => s.SetId).ToArray() ?? [];
        var payload = JsonNode.Parse(ResultsDraftPayload(input.Payload.GetRawText(), "{}"))!.AsObject();
        payload[RecoveryIdsProperty] = JsonSerializer.SerializeToNode(retained);
        payload["recoveredFromDraftId"] = JsonValue.Create(source.Id);
        payload["recoveryRequestSha256"] = requestHash;
        if (payload["files"] is JsonArray mappings) foreach (var row in mappings.OfType<JsonObject>())
            if (!Guid.TryParse(row["setId"]?.GetValue<string>(), out var id) || !retained.Contains(id) && !currentIds.Contains(id)) row["setId"] = "";
        payload["zipArchiveId"] = ""; payload["zipRows"] = new JsonArray(); payload["zipConfirmed"] = false;
        payload["confirmedFiles"] = false; payload["uploadMethod"] = "Files";
        var draft = new LabVendorResultsDraft(input.Id, sendoutId, actor.User.Id, sendout.Version, DateTime.UtcNow, limits.Value.DraftLifetimeHours);
        draft.Update(payload.ToJsonString()); dbContext.Add(draft);
        sourceMetadata["restartedAsDraftId"] = JsonValue.Create(draft.Id); source.Update(sourceMetadata.ToJsonString());
        await dbContext.SaveChangesAsync(ct); if (tx is not null) await tx.CommitAsync(ct);
        return new { draft.Id, draft.Version, draft.ExpiresAtUtc };
    }
}
