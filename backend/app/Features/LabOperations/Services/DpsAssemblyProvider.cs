namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Storage;
using PSeq.Operations.Laboratory.Domain;

public interface ILabAssemblySubmissionProvider
{
    Task<DpsSubmission> PrepareAsync(LabAssemblyJob job, AssemblyRecipe recipe, CancellationToken ct);
}
public sealed class DpsAssemblyProvider(DpsMqttClient transport, IServiceScopeFactory scopes, IOptions<DpsOptions> options,
    IOptions<FileStorageOptions> storage, TimeProvider time) : ILabAssemblyProvider, ILabAssemblySubmissionProvider
{
    public string Key => DpsContract.Provider;
    public bool SupportsIdempotentStart => transport.Capabilities is { } data && data.GetProperty("supports_idempotent_start").GetBoolean()
        && data.GetProperty("supports_authoritative_query").GetBoolean();
    public AssemblyProviderAvailability Availability {
        get {
            if (!options.Value.Enabled) return new(false, "DPS integration is disabled. Operations must configure the processing connection.", false, []);
            if (!options.Value.IsConfigured() || !storage.Value.Provider.Equals(FileStorageProviders.S3, StringComparison.OrdinalIgnoreCase))
                return new(false, "Configure the DPS broker, environment, approved recipes and versioned S3 storage before assembly.", false, []);
            if (transport.Capabilities is not { } data || !data.GetProperty("available").GetBoolean()
                || data.GetProperty("service_key").GetString() != "dps" || !SupportsIdempotentStart)
                return new(false, "DPS is unavailable or its compatible capabilities have not been confirmed.", false, []);
            try {
                var recipes = new List<AssemblyRecipe>();
                foreach (var approved in options.Value.Recipes) {
                    if (string.IsNullOrWhiteSpace(approved.Key) || string.IsNullOrWhiteSpace(approved.Version)
                        || approved.RequiredOutputRoles.Length is < 1 or > 63) continue;
                    var matches = data.GetProperty("recipes").EnumerateArray().Where(r => r.GetProperty("key").GetString() == approved.Key
                        && r.GetProperty("version").GetString() == approved.Version).ToArray();
                    if (matches.Length != 1) continue;
                    var declared = matches[0];
                    var roles = declared.GetProperty("required_output_roles").EnumerateArray().Select(r => r.GetString()!).ToArray();
                    using var parameters = JsonDocument.Parse(approved.ParametersJson);
                    if (!roles.Order(StringComparer.Ordinal).SequenceEqual(approved.RequiredOutputRoles.Order(StringComparer.Ordinal))
                        || !DpsContract.ParametersMatch(declared.GetProperty("parameters_schema"), parameters.RootElement)) continue;
                    recipes.Add(new(approved.Key, string.IsNullOrWhiteSpace(approved.Name) ? declared.GetProperty("name").GetString()! : approved.Name,
                        approved.Version, approved.ParametersJson, roles));
                }
                if (recipes.Select(r => r.Key).Distinct().Count() != recipes.Count || recipes.Count == 0)
                    return new(false, "DPS has no compatible approved processing recipe. Review the configured recipe version, parameters and outputs.", false, []);
                return new(true, "DPS connected.", data.GetProperty("supports_cancellation").GetBoolean(), recipes);
            } catch (Exception error) when (error is not OutOfMemoryException) {
                return new(false, "DPS recipe configuration is incompatible with its capability declaration.", false, []);
            }
        }
    }
    public async Task<AssemblyInputVerification> VerifyInputsAsync(IReadOnlyList<AssemblyInput> inputs, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<DpsHandoff>().VerifyInputsAsync(inputs, ct);
    }
    public async Task<DpsSubmission> PrepareAsync(LabAssemblyJob job, AssemblyRecipe recipe, CancellationToken ct)
    {
        using var parameters = JsonDocument.Parse(recipe.ParametersJson);
        var wire = new DpsRecipe(recipe.Key, recipe.Version, parameters.RootElement.Clone(), recipe.RequiredOutputRoles ?? throw DpsContract.Invalid());
        await using var scope = scopes.CreateAsyncScope();
        var submission = await scope.ServiceProvider.GetRequiredService<DpsHandoff>().PrepareAsync(job, wire, ct);
        var capabilities = transport.Capabilities ?? throw DpsMqttClient.Unavailable();
        var declared = capabilities.GetProperty("recipes").EnumerateArray().Single(r => r.GetProperty("key").GetString() == recipe.Key && r.GetProperty("version").GetString() == recipe.Version);
        if (!declared.GetProperty("supported_read_layouts").EnumerateArray().Any(layout => layout.GetString() == submission.Instructions.ReadLayout)) throw DpsContract.Invalid();
        return submission;
    }
    public async Task<AssemblyProviderSnapshot?> FindAsync(Guid clientJobId, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
        var job = await db.Set<LabAssemblyJob>().AsNoTracking().SingleAsync(j => j.Id == clientJobId && j.ProviderKey == Key, ct);
        var requestId = Guid.NewGuid();
        var response = await transport.RequestAsync("query", $"jobs/{clientJobId:D}/commands/query", 103,
            new { request_id = requestId, job_id = clientJobId }, $"{options.Value.TopicRoot}/jobs/{clientJobId:D}/queries/{requestId:D}", requestId, ct);
        if (response.GetProperty("job_id").GetGuid() != clientJobId) throw DpsContract.Invalid();
        switch (response.GetProperty("status").GetString()) {
            case "NotAccepted":
                if (job.ProviderJobId is not null || job.IsTerminal || job.State is "Accepted" or "Running"
                    || await db.Set<LabAssemblyCommand>().AnyAsync(c => c.LabAssemblyJobId == job.Id && c.Kind == "Run" && c.ReceivedAtUtc != null, ct)) throw DpsContract.Invalid();
                return null;
            case "Unavailable": throw DpsMqttClient.Unavailable();
            case "Found":
                var receiver = scope.ServiceProvider.GetRequiredService<DpsEventReceiver>();
                foreach (var receipt in response.GetProperty("command_receipts").EnumerateArray()) {
                    var wire = DpsContract.Read<DpsReceipt>(receipt);
                    if (wire.JobId != clientJobId || wire.Environment != options.Value.Environment) throw DpsContract.Invalid();
                    await receiver.ReceiveCommandAsync(wire, ct);
                }
                var evidence = DpsContract.Read<DpsEvent>(response.GetProperty("event"));
                if (evidence.JobId != clientJobId || evidence.Environment != options.Value.Environment || evidence.EventType == "Progress") throw DpsContract.Invalid();
                await receiver.ReceiveEventAsync(evidence, transport.PublishAckAsync, ct);
                if (response.GetProperty("latest_progress").ValueKind == JsonValueKind.Object) {
                    var progress = response.GetProperty("latest_progress");
                    var occurred = progress.GetProperty("occurred_at_utc").GetDateTime();
                    var now = time.GetUtcNow().UtcDateTime; DpsContract.RequireUtc(occurred, now);
                    if (now - occurred < TimeSpan.FromMinutes(2)) await scope.ServiceProvider.GetRequiredService<LabAssemblyReceiptService>()
                        .ReceiveProgressAsync(clientJobId, Key, evidence.ProviderJobId, progress.GetProperty("percentage").GetDouble(), progress.GetProperty("sequence").GetInt64(), ct);
                }
                // Replays may be older than a locally committed terminal event; return the saved authority.
                var current = await db.Set<LabAssemblyJob>().AsNoTracking().SingleAsync(j => j.Id == clientJobId, ct);
                return Snapshot(current);
            default: throw DpsContract.Invalid();
        }
    }
    public async Task<AssemblyProviderSnapshot> StartAsync(LabAssemblyJob job, CancellationToken ct)
    {
        var frozen = JsonSerializer.Deserialize<AssemblyFrozenInputs>(job.InputsJson, LabAssemblyService.Json) ?? throw DpsContract.Invalid();
        var submission = frozen.Dps ?? throw DpsContract.Invalid();
        if (submission.Instructions.Environment != options.Value.Environment) throw DpsContract.Invalid();
        await using var scope = scopes.CreateAsyncScope(); var db = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
        var command = await db.Set<LabAssemblyCommand>().AsNoTracking().SingleAsync(c => c.LabAssemblyJobId == job.Id && c.Kind == "Run", ct);
        var destination = frozen.OutputStorage ?? throw DpsContract.Invalid();
        var response = await transport.RequestAsync("start", "commands/start", 100,
            new { command_id = command.Id, job_id = job.Id, requested_at_utc = command.RequestedAtUtc,
                data_folder = $"s3://{destination.Bucket}/{destination.Prefix}", input_manifest = submission.InputManifest, recipe = submission.Instructions.Recipe },
            $"{options.Value.TopicRoot}/jobs/{job.Id:D}/receipts", command.Id, ct);
        RequireAccepted(DpsContract.Read<DpsReceipt>(response), job.Id, command.Id, "Start");
        return Snapshot(await db.Set<LabAssemblyJob>().AsNoTracking().SingleAsync(j => j.Id == job.Id, ct));
    }
    public async Task<AssemblyProviderSnapshot?> CancelAsync(Guid clientJobId, string reason, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope(); var db = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
        var command = await db.Set<LabAssemblyCommand>().AsNoTracking().SingleAsync(c => c.LabAssemblyJobId == clientJobId && c.Kind == "Cancel", ct);
        var response = await transport.RequestAsync("cancel", $"jobs/{clientJobId:D}/commands/cancel", 101,
            new { command_id = command.Id, job_id = clientJobId, requested_at_utc = command.RequestedAtUtc, reason },
            $"{options.Value.TopicRoot}/jobs/{clientJobId:D}/receipts", command.Id, ct);
        var receipt = DpsContract.Read<DpsReceipt>(response);
        if (receipt.JobId != clientJobId || receipt.CommandId != command.Id || receipt.CommandKind != "Cancel") throw DpsContract.Invalid();
        if (receipt.Outcome != "Accepted") throw new OrderManagementException("dps_cancel_rejected",
            "DPS did not accept cancellation. The recorded execution outcome remains unchanged; reconcile the saved attempt.", 502);
        return Snapshot(await db.Set<LabAssemblyJob>().AsNoTracking().SingleAsync(j => j.Id == clientJobId, ct));
    }
    private static void RequireAccepted(DpsReceipt receipt, Guid job, Guid command, string kind)
    {
        if (receipt.JobId != job || receipt.CommandId != command || receipt.CommandKind != kind) throw DpsContract.Invalid();
        if (receipt.Outcome != "Accepted") throw Rejected();
    }
    internal static OrderManagementException Rejected() => new("dps_dispatch_rejected",
        "DPS rejected the saved assembly command. Review the attempt and its instructions before requesting another execution.", 502);
    internal static AssemblyProviderSnapshot Snapshot(LabAssemblyJob job) => new(job.ProviderJobId ?? throw DpsContract.Invalid(), job.State,
        job.StartedAtUtc, job.StoppedAtUtc, job.DispositionAtUtc, job.DispositionReason, job.OutputManifestJson, job.State == "CancelledBeforeStart");
}
