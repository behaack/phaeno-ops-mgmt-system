namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Collections.Concurrent;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using System.Threading.Channels;
using Microsoft.Extensions.Options;
using MQTTnet;
using MQTTnet.Formatter;
using MQTTnet.Protocol;
using PhaenoPortal.App.Features.OrderManagement.Services;

/// <summary>One configured server connection. RPC completion is correlated; lifecycle consumption has a separate bounded queue.</summary>
public sealed class DpsMqttClient(IOptions<DpsOptions> options, IOptions<LabAssemblyOptions> assembly,
    IServiceScopeFactory scopes, TimeProvider time, ILogger<DpsMqttClient> logger) : BackgroundService
{
    private readonly MqttClientFactory factory = new();
    private readonly IMqttClient client = new MqttClientFactory().CreateMqttClient();
    private readonly ConcurrentDictionary<(string Topic, Guid Id), TaskCompletionSource<JsonElement>> pending = new();
    private readonly SemaphoreSlim requestSlots = new(32, 32);
    private readonly string instanceClientId = $"poms-dps-{System.Environment.ProcessId}-{Guid.NewGuid():N}";
    private readonly Channel<JsonElement> incoming = Channel.CreateBounded<JsonElement>(new BoundedChannelOptions(256) {
        SingleReader = true, FullMode = BoundedChannelFullMode.Wait,
    });
    private JsonElement capabilities;
    private DateTime capabilitiesAt;
    private readonly object capabilityGate = new();
    private bool subscribed;
    private X509Certificate2? connectionCertificate;
    private CancellationToken shutdown;
    private DpsOptions Settings => options.Value;
    public bool Connected => client.IsConnected && Volatile.Read(ref subscribed);
    public JsonElement? Capabilities {
        get { lock (capabilityGate) return Connected && capabilities.ValueKind == JsonValueKind.Object
            && time.GetUtcNow().UtcDateTime - capabilitiesAt < TimeSpan.FromSeconds(90) ? capabilities.Clone() : null; }
    }
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        shutdown = ct;
        client.DisconnectedAsync += _ => { Volatile.Write(ref subscribed, false); FailPending(); return Task.CompletedTask; };
        client.ApplicationMessageReceivedAsync += async message => {
            if (!Connected || message.ApplicationMessage.Retain || message.ApplicationMessage.Payload.Length is < 1 or > DpsContract.MaximumMessageBytes) return;
            JsonElement candidate = default;
            try {
                using var parsed = JsonDocument.Parse(message.ApplicationMessage.Payload, new JsonDocumentOptions { MaxDepth = 48 });
                var data = parsed.RootElement;
                if (data.ValueKind != JsonValueKind.Object || data.GetProperty("environment").GetString() != Settings.Environment
                    || data.GetProperty("contract_version").GetString() != DpsContract.Version) return;
                candidate = data.Clone();
                var dto = data.GetProperty("dto_id").GetInt32();
                var definition = dto switch { 102 => "event", 104 => "query_response", 107 => "capabilities", 108 => "command_receipt", _ => null };
                if (definition is null) return;
                DpsContract.Validate(definition, data);
                var topic = message.ApplicationMessage.Topic;
                var root = Settings.TopicRoot;
                var job = dto == 107 ? Guid.Empty : data.GetProperty("job_id").GetGuid();
                var id = dto is 104 or 107 ? data.GetProperty("request_id").GetGuid() : dto == 108 ? data.GetProperty("command_id").GetGuid() : Guid.Empty;
                var expected = dto switch {
                    102 => $"{root}/jobs/{job:D}/events", 108 => $"{root}/jobs/{job:D}/receipts",
                    104 => $"{root}/jobs/{job:D}/queries/{id:D}", _ => $"{root}/service/replies/{id:D}",
                };
                if (topic != expected) return;
                if (dto is 104 or 107) {
                    if (pending.TryGetValue((topic, id), out var waiter)) waiter.TrySetResult(data.Clone());
                } else if (dto == 102 && data.GetProperty("event_type").GetString() == "Progress") {
                    // Losing a percentage is intentional; it must not delay lifecycle or command receipts.
                    incoming.Writer.TryWrite(data.Clone());
                } else await incoming.Writer.WriteAsync(data.Clone(), ct);
            } catch (Exception error) when (error is JsonException or KeyNotFoundException or InvalidOperationException or ArgumentException or FormatException or OverflowException or OrderManagementException) {
                logger.LogWarning("DPS rejected an invalid inbound message ({ErrorType}).", error.GetType().Name);
                await RejectKnownEventAsync(candidate, message.ApplicationMessage.Topic, ct);
            }
        };
        var consume = ConsumeAsync(ct);
        var retry = 1;
        try {
            while (!ct.IsCancellationRequested) {
                if (!Settings.Enabled || !assembly.Value.WorkerEnabled || !Settings.IsConfigured()) { await Task.Delay(TimeSpan.FromSeconds(5), ct); continue; }
                X509Certificate2? certificate = null;
                try {
                    if (!client.IsConnected) {
                        var builder = new MqttClientOptionsBuilder().WithClientId(string.IsNullOrWhiteSpace(Settings.ClientId)
                            ? instanceClientId : Settings.ClientId)
                            .WithTcpServer(Settings.Host, Settings.Port).WithProtocolVersion(MqttProtocolVersion.V311)
                            .WithCleanSession().WithoutPacketFragmentation().WithKeepAlivePeriod(TimeSpan.FromSeconds(20));
                        if (!string.IsNullOrEmpty(Settings.Username)) builder.WithCredentials(Settings.Username, Settings.Password);
                        if (!string.IsNullOrEmpty(Settings.ClientCertificatePath)) certificate = X509CertificateLoader.LoadPkcs12FromFile(
                            Settings.ClientCertificatePath, Settings.ClientCertificatePassword, X509KeyStorageFlags.EphemeralKeySet);
                        builder.WithTlsOptions(tls => { tls.UseTls(Settings.UseTls); if (certificate is not null) tls.WithClientCertificates(new[] { certificate }); });
                        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct); timeout.CancelAfter(TimeSpan.FromSeconds(Settings.RequestTimeoutSeconds));
                        await client.ConnectAsync(builder.Build(), timeout.Token);
                        connectionCertificate?.Dispose(); connectionCertificate = certificate; certificate = null;
                        var subscription = factory.CreateSubscribeOptionsBuilder();
                        foreach (var suffix in new[] { "jobs/+/events", "jobs/+/receipts", "jobs/+/queries/+", "service/replies/+" })
                            subscription.WithTopicFilter(filter => filter.WithTopic(Settings.TopicRoot + "/" + suffix).WithAtLeastOnceQoS());
                        var result = await client.SubscribeAsync(subscription.Build(), timeout.Token);
                        if (result.Items.Count != 4 || result.Items.Any(item => (int)item.ResultCode > 2)) throw Unavailable();
                        Volatile.Write(ref subscribed, true); retry = 1;
                    }
                    var id = Guid.NewGuid();
                    var response = await RequestAsync("describe", "service/describe", 106, new { request_id = id },
                        Settings.TopicRoot + $"/service/replies/{id:D}", id, ct);
                    lock (capabilityGate) { capabilities = response.Clone(); capabilitiesAt = time.GetUtcNow().UtcDateTime; }
                    await Task.Delay(TimeSpan.FromSeconds(30), ct);
                } catch (OperationCanceledException) when (ct.IsCancellationRequested) { break; }
                catch (Exception error) when (error is not OutOfMemoryException) {
                    lock (capabilityGate) capabilities = default;
                    logger.LogWarning("DPS connection or discovery is unavailable ({ErrorType}).", error.GetType().Name);
                    Volatile.Write(ref subscribed, false); FailPending();
                    if (client.IsConnected) { using var close = new CancellationTokenSource(TimeSpan.FromSeconds(5)); try { await client.DisconnectAsync(factory.CreateClientDisconnectOptionsBuilder().Build(), close.Token); } catch { } }
                    await Task.Delay(TimeSpan.FromSeconds(Math.Min(retry, 30)), ct); retry = Math.Min(retry * 2, 30);
                } finally { certificate?.Dispose(); }
            }
        } catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        finally {
            incoming.Writer.TryComplete(); FailPending();
            try { await consume; } catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
            if (client.IsConnected) { using var close = new CancellationTokenSource(TimeSpan.FromSeconds(5)); try { await client.DisconnectAsync(factory.CreateClientDisconnectOptionsBuilder().Build(), close.Token); } catch { } }
        }
    }
    private async Task ConsumeAsync(CancellationToken ct)
    {
        await foreach (var data in incoming.Reader.ReadAllAsync(ct)) {
            try {
                await using var scope = scopes.CreateAsyncScope();
                var receiver = scope.ServiceProvider.GetRequiredService<DpsEventReceiver>();
                if (data.GetProperty("dto_id").GetInt32() == 102) await receiver.ReceiveEventAsync(DpsContract.Read<DpsEvent>(data), PublishAckAsync, ct);
                else {
                    await receiver.ReceiveCommandAsync(DpsContract.Read<DpsReceipt>(data), ct);
                    var id = data.GetProperty("command_id").GetGuid(); var job = data.GetProperty("job_id").GetGuid();
                    if (pending.TryGetValue(($"{Settings.TopicRoot}/jobs/{job:D}/receipts", id), out var waiter)) waiter.TrySetResult(data.Clone());
                }
            } catch (OperationCanceledException) when (ct.IsCancellationRequested) { return; }
            catch (Exception error) when (error is not OutOfMemoryException) {
                // Do not acknowledge a failed transaction; DPS must retain/replay its lifecycle event.
                logger.LogWarning("DPS evidence could not be applied ({ErrorType}); replay is required.", error.GetType().Name);
                if (error is OrderManagementException { StatusCode: 400 or 409 } or JsonException or ArgumentException)
                    await RejectKnownEventAsync(data, $"{Settings.TopicRoot}/jobs/{data.GetProperty("job_id").GetGuid():D}/events", ct);
            }
        }
    }
    private async Task RejectKnownEventAsync(JsonElement candidate, string topic, CancellationToken ct)
    {
        try {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct); timeout.CancelAfter(TimeSpan.FromSeconds(5));
            await using var scope = scopes.CreateAsyncScope();
            await scope.ServiceProvider.GetRequiredService<DpsEventReceiver>().RejectEventAsync(candidate, topic, PublishAckAsync, timeout.Token);
        } catch (Exception error) when (error is not OutOfMemoryException) {
            // No acknowledgment for unknown scope or unavailable storage/database; the sender retains its evidence.
            logger.LogWarning("DPS rejection could not be acknowledged ({ErrorType}).", error.GetType().Name);
        }
    }
    public async Task<JsonElement> RequestAsync(string definition, string suffix, int dto, object fields, string replyTopic, Guid id, CancellationToken ct)
    {
        if (!Connected) throw Unavailable();
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct, shutdown);
        timeout.CancelAfter(TimeSpan.FromSeconds(Settings.RequestTimeoutSeconds));
        await requestSlots.WaitAsync(timeout.Token);
        var waiter = new TaskCompletionSource<JsonElement>(TaskCreationOptions.RunContinuationsAsynchronously);
        var registered = false;
        try {
            registered = pending.TryAdd((replyTopic, id), waiter);
            if (!registered) {
                if (pending.TryGetValue((replyTopic, id), out var original)) return await original.Task.WaitAsync(timeout.Token);
                throw Unavailable();
            }
            await PublishAsync(Settings.TopicRoot + "/" + suffix, DpsContract.Message(definition, Settings.Environment, dto, fields), timeout.Token);
            return await waiter.Task.WaitAsync(timeout.Token);
        } catch (OperationCanceledException) when (!ct.IsCancellationRequested) { throw Unavailable(); }
        finally { if (registered) pending.TryRemove((replyTopic, id), out _); requestSlots.Release(); }
    }
    public Task PublishAckAsync(Guid job, Guid @event, string status, Guid? receipt, string? reason, CancellationToken ct) =>
        PublishAsync($"{Settings.TopicRoot}/jobs/{job:D}/acks", DpsContract.Message("event_ack", Settings.Environment, 105,
            new { event_id = @event, job_id = job, status, receipt_id = receipt, reason }), ct);
    private async Task PublishAsync(string topic, JsonElement data, CancellationToken ct)
    {
        if (!Connected) throw Unavailable();
        var bytes = JsonSerializer.SerializeToUtf8Bytes(data, DpsContract.Json);
        if (bytes.Length > DpsContract.MaximumMessageBytes) throw DpsContract.Invalid();
        var response = await client.PublishAsync(new MqttApplicationMessageBuilder().WithTopic(topic).WithPayload(bytes)
            .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce).WithRetainFlag(false).Build(), ct);
        if (!response.IsSuccess) throw Unavailable();
    }
    private void FailPending() { foreach (var item in pending.Values) item.TrySetException(Unavailable()); }
    public static OrderManagementException Unavailable() => new("dps_dispatch_unavailable",
        "DPS dispatch failed or no correlated acceptance arrived. Any saved attempt remains unconfirmed; reconcile its original ID before retrying.", 503);
    public override void Dispose() { client.Dispose(); connectionCertificate?.Dispose(); requestSlots.Dispose(); base.Dispose(); }
}
