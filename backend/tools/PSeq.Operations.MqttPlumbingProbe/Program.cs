using System.Buffers;
using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using MQTTnet;
using MQTTnet.Formatter;
using MQTTnet.Protocol;

var host = "test.mosquitto.org";
var port = 1883;
var waitSeconds = 45;
var dataFolder = "mqtt-plumbing-test";
for (var i = 0; i < args.Length; i += 2)
{
    if (i + 1 >= args.Length) return Usage();
    switch (args[i])
    {
        case "--host": host = args[i + 1]; break;
        case "--port" when int.TryParse(args[i + 1], out var value) && value is > 0 and <= 65535:
            port = value; break;
        case "--wait-seconds" when int.TryParse(args[i + 1], out var value) && value is > 0 and <= 300:
            waitSeconds = value; break;
        case "--data-folder": dataFolder = args[i + 1]; break;
        default: return Usage();
    }
}

if (string.IsNullOrWhiteSpace(host) || host.Contains('/') || host.Contains(':')
    || string.IsNullOrWhiteSpace(dataFolder)) return Usage();

var jobId = Guid.NewGuid().ToString("D");
var clientId = "poms-probe-" + Guid.NewGuid().ToString("N")[..12];
const string startTopic = "backend/data_process/command/start_job";
var statusTopic = "backend/data_process/job/" + jobId;
var statuses = new ConcurrentQueue<ProbeStatus>();
var outputLock = new object();
using var shutdown = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) => { e.Cancel = true; shutdown.Cancel(); };
var factory = new MqttClientFactory();
using var client = factory.CreateMqttClient();
var publishInvoked = false;

client.ApplicationMessageReceivedAsync += e =>
{
    if (e.ApplicationMessage.Topic != statusTopic || !publishInvoked) return Task.CompletedTask;
    if (e.ApplicationMessage.Payload.Length is 0 or > 65536)
    {
        Log("ignored_status", new { reason = "Empty or oversized payload" });
        return Task.CompletedTask;
    }
    try
    {
        var payload = Encoding.UTF8.GetString(e.ApplicationMessage.Payload.ToArray());
        using var document = JsonDocument.Parse(payload);
        var root = document.RootElement;
        if (root.ValueKind != JsonValueKind.Object
            || !root.TryGetProperty("dto_id", out var dto) || dto.ValueKind != JsonValueKind.Number || !dto.TryGetInt32(out var dtoId) || dtoId != 102
            || !root.TryGetProperty("job_id", out var id) || id.ValueKind != JsonValueKind.String || id.GetString() != jobId
            || !root.TryGetProperty("status", out var status) || status.ValueKind is not (JsonValueKind.Number or JsonValueKind.String)
            || !root.TryGetProperty("progress", out var progress) || progress.ValueKind != JsonValueKind.Number || !progress.TryGetUInt32(out var percentage) || percentage > 100)
        {
            Log("ignored_status", new { reason = "Invalid or uncorrelated status DTO" });
            return Task.CompletedTask;
        }
        var received = new ProbeStatus(DateTimeOffset.UtcNow, status.GetRawText(), percentage, e.ApplicationMessage.Retain);
        statuses.Enqueue(received);
        Log("remote_status", new { job_id = jobId, topic = statusTopic, payload, retained = received.Retained });
    }
    catch (JsonException)
    {
        Log("ignored_status", new { reason = "Malformed JSON" });
    }
    return Task.CompletedTask;
};

try
{
    Log("connecting", new { host, port, client_id = clientId, job_id = jobId, wait_seconds = waitSeconds });
    using var setupTimeout = CancellationTokenSource.CreateLinkedTokenSource(shutdown.Token);
    setupTimeout.CancelAfter(TimeSpan.FromSeconds(15));
    var options = new MqttClientOptionsBuilder()
        .WithClientId(clientId)
        .WithTcpServer(host, port)
        .WithTlsOptions(tls => tls.UseTls(false))
        .WithoutPacketFragmentation()
        .WithProtocolVersion(MqttProtocolVersion.V311)
        .WithCleanSession()
        .WithKeepAlivePeriod(TimeSpan.FromSeconds(20))
        .Build();
    var connected = await client.ConnectAsync(options, setupTimeout.Token);
    Log("connected", new { result = connected.ResultCode.ToString() });

    var subscription = factory.CreateSubscribeOptionsBuilder()
        .WithTopicFilter(t => t.WithTopic(statusTopic).WithAtLeastOnceQoS())
        .Build();
    var subscribed = await client.SubscribeAsync(subscription, setupTimeout.Token);
    if (subscribed.Items.Count != 1)
        throw new InvalidOperationException("Broker did not grant the status subscription.");
    var granted = subscribed.Items.Single();
    if ((int)granted.ResultCode > 2)
        throw new InvalidOperationException("Broker rejected the status subscription.");
    Log("subscribed", new { topic = statusTopic, result = granted.ResultCode.ToString() });

    var payload = JsonSerializer.Serialize(new { dto_id = 100, job_id = jobId, data_folder = dataFolder });
    var command = new MqttApplicationMessageBuilder()
        .WithTopic(startTopic)
        .WithPayload(payload)
        .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
        .WithRetainFlag(false)
        .Build();
    // Exactly one application publication. No reconnect loop or automatic republish.
    publishInvoked = true;
    Log("publishing_start", new { topic = startTopic, payload, retained = false });
    var published = await client.PublishAsync(command, setupTimeout.Token);
    Log("broker_acknowledged", new { result = published.ReasonCode.ToString() });

    await Task.Delay(TimeSpan.FromSeconds(waitSeconds), shutdown.Token);
    Log("observation_finished", new { job_id = jobId, correlated_status_count = statuses.Count, statuses = statuses.ToArray() });
    if (statuses.IsEmpty)
    {
        Log("no_remote_status", new { explanation = "Publication was acknowledged, but no matching DPS status arrived. Do not republish automatically." });
        return 2;
    }
    Log("round_trip_observed", new { explanation = "Matching remote statuses received. Numeric status meanings and fake-job completion require the remote enum or server confirmation." });
    return 0;
}
catch (OperationCanceledException)
{
    Log("cancelled_or_timed_out", new { publish_invoked = publishInvoked, explanation = "No automatic retry was made." });
    return 3;
}
catch (Exception error)
{
    Log("connection_or_publication_failed", new { error = error.Message, cause = error.InnerException?.Message, publish_invoked = publishInvoked });
    return 1;
}
finally
{
    if (client.IsConnected)
    {
        try
        {
            using var disconnectTimeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            await client.DisconnectAsync(factory.CreateClientDisconnectOptionsBuilder().Build(), disconnectTimeout.Token);
            Log("disconnected", new { });
        }
        catch (Exception error) { Log("disconnect_failed", new { error = error.Message }); }
    }
}

void Log(string action, object details)
{
    lock (outputLock)
        Console.WriteLine(JsonSerializer.Serialize(new { at_utc = DateTimeOffset.UtcNow, action, details }));
}

static int Usage()
{
    Console.Error.WriteLine("Usage: --host test.mosquitto.org --port 1883 --wait-seconds 45 --data-folder mqtt-plumbing-test");
    return 64;
}

record ProbeStatus(DateTimeOffset ReceivedAtUtc, string StatusJson, uint Progress, bool Retained);
