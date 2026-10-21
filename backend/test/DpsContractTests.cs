namespace PhaenoPortal.Test;

using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

// Synthetic contract fixtures only; never submitted to a processing service.
public sealed class DpsContractTests
{
    private static DpsObject Object() => new("example-bucket", "us-east-2", "fixture/input.json", "exact-version", new string('a', 64), 100);
    private static JsonElement Start() => DpsContract.Message("start", "local", 100, new {
        command_id = Guid.NewGuid(), job_id = Guid.NewGuid(), requested_at_utc = new DateTime(2026, 10, 10, 18, 0, 0, DateTimeKind.Utc),
        data_folder = "s3://example-bucket/fixture/attempt/", input_manifest = Object(),
        recipe = new DpsRecipe("example", "1", JsonSerializer.SerializeToElement(new { threads = 2 }), new[] { "assembly_output" }),
    });
    [Fact]
    public void Start_uses_explicit_version_scope_and_complete_object_identity()
    {
        var start = Start();
        Assert.Equal(DpsContract.Version, start.GetProperty("contract_version").GetString());
        Assert.Equal(100, start.GetProperty("dto_id").GetInt32());
        Assert.Equal("exact-version", start.GetProperty("input_manifest").GetProperty("version_id").GetString());
    }
    [Theory]
    [InlineData("unknown_field")]
    [InlineData("broker_password")]
    public void Unknown_message_fields_are_rejected(string field)
    {
        var body = JsonNode.Parse(Start().GetRawText())!.AsObject(); body[field] = "unexpected";
        Assert.Throws<OrderManagementException>(() => DpsContract.Validate("start", JsonSerializer.SerializeToElement(body)));
    }
    [Fact]
    public void Duplicate_json_properties_cannot_change_the_interpretation()
    {
        var source = Start().GetRawText();
        using var repeated = JsonDocument.Parse(source[..^1] + ",\"dto_id\":100}");
        Assert.Throws<OrderManagementException>(() => DpsContract.Validate("start", repeated.RootElement));
    }
    [Theory]
    [InlineData("2026-10-21T21:31:27Z", "2026-10-21T21:31:27.197347Z", false)]
    [InlineData("2026-10-21T21:31:27.0000000Z", "2026-10-21T21:31:27.9999999Z", false)]
    [InlineData("2026-10-21T21:31:26Z", "2026-10-21T21:31:27.0000001Z", true)]
    [InlineData("2026-10-21T21:31:26.9999999Z", "2026-10-21T21:31:27Z", true)]
    [InlineData("2026-10-21T21:31:27.1973469Z", "2026-10-21T21:31:27.197347Z", true)]
    [InlineData("2026-10-21T21:31:27.197347Z", "2026-10-21T21:31:27.197347Z", false)]
    [InlineData("2026-10-21T21:31:27.1973471Z", "2026-10-21T21:31:27.197347Z", false)]
    [InlineData("2026-10-21T21:31:28Z", "2026-10-21T21:31:27.197347Z", false)]
    [InlineData("2026-10-22T00:00:00Z", "2026-10-22T00:00:00.9999999Z", false)]
    [InlineData("2026-10-21T23:59:59Z", "2026-10-22T00:00:00.0000001Z", true)]
    public void Request_ordering_respects_whole_seconds_without_a_general_clock_skew_allowance(
        string occurred, string requested, bool precedes)
    {
        var evidence = DateTime.Parse(occurred, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
        var request = DateTime.Parse(requested, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
        Assert.Equal(precedes, DpsContract.PrecedesRequest(evidence, request));
    }
    [Fact]
    public void Optional_start_stays_absent_and_future_or_non_utc_evidence_stays_invalid()
    {
        var now = new DateTime(2026, 10, 21, 21, 31, 27, DateTimeKind.Utc).AddTicks(1973470);
        Assert.False(DpsContract.PrecedesRequest(null, now));
        Assert.Throws<OrderManagementException>(() => DpsContract.RequireUtc(now.AddSeconds(1), now));
        Assert.Throws<OrderManagementException>(() => DpsContract.RequireUtc(DateTime.SpecifyKind(now, DateTimeKind.Unspecified), now));
    }
    [Fact]
    public void Unsupported_schema_under_negation_does_not_approve_parameters()
    {
        using var schema = JsonDocument.Parse("{\"not\":{\"unsupportedKeyword\":true}}");
        Assert.False(DpsContract.ParametersMatch(schema.RootElement, JsonSerializer.SerializeToElement(new { threads = 2 })));
    }
    [Fact]
    public void Missing_or_external_schema_reference_cannot_approve_parameters()
    {
        foreach (var reference in new[] { "#/missing", "https://example.invalid/schema" }) {
            var schema = JsonSerializer.SerializeToElement(new { not = new Dictionary<string, string> { ["$ref"] = reference } });
            Assert.False(DpsContract.ParametersMatch(schema, JsonSerializer.SerializeToElement(new { threads = 2 })));
        }
    }
    [Fact]
    public void Progress_at_one_hundred_percent_is_not_a_completed_execution()
    {
        var progress = DpsContract.Message("event", "local", 102, new {
            event_id = Guid.NewGuid(), job_id = Guid.NewGuid(), provider_job_id = "execution", sequence = 2,
            event_type = "Progress", occurred_at_utc = "2026-10-10T18:01:00Z", started_at_utc = "2026-10-10T18:00:00Z",
            stopped_at_utc = (string?)null, disposition_at_utc = (string?)null, never_started = false,
            percentage = 100, reason = (string?)null, output_manifest = (DpsObject?)null,
        });
        Assert.Equal("Progress", DpsContract.Read<DpsEvent>(progress).EventType);
        var changed = JsonNode.Parse(progress.GetRawText())!.AsObject(); changed["event_type"] = "Succeeded";
        Assert.Throws<OrderManagementException>(() => DpsContract.Validate("event", JsonSerializer.SerializeToElement(changed)));
    }
    [Theory]
    [InlineData("test.mosquitto.org", "local")]
    [InlineData("localhost", "production")]
    public void Plaintext_remote_or_hosted_broker_configuration_is_unavailable(string host, string environment)
    {
        Assert.False(new DpsOptions { Host = host, Environment = environment, UseTls = false }.IsConfigured());
    }
    [Fact]
    public void Default_configuration_has_no_broker_or_automatic_execution()
    {
        var options = new DpsOptions(); Assert.False(options.Enabled); Assert.False(options.IsConfigured());
        Assert.Empty(options.Recipes); Assert.Empty(options.Host);
        Assert.False(options.AllowHostedTestSimulation);
        Assert.Equal(18883, options.Port);
        Assert.True(options.UseTls);
    }
    [Theory]
    [InlineData("https://localhost")]
    [InlineData("localhost:18883")]
    [InlineData(" localhost")]
    public void Invalid_tls_server_name_is_unavailable(string name)
    {
        Assert.False(new DpsOptions { Host = "127.0.0.1", TlsServerName = name }.IsConfigured());
    }
    [Fact]
    public void Certificate_configuration_cannot_silently_use_plaintext_loopback()
    {
        Assert.False(new DpsOptions { Host = "127.0.0.1", UseTls = false, ClientCertificatePath = "client.pfx" }.IsConfigured());
        Assert.False(new DpsOptions { Host = "127.0.0.1", UseTls = false, CaCertificatePath = "ca.crt" }.IsConfigured());
    }
    [Fact]
    public void Mock_provenance_is_diagnostic_only_and_never_passes_scientific_validation()
    {
        var body = MockOutput();
        DpsContract.ValidateSimulatedOutput(JsonSerializer.SerializeToElement(body));
        Assert.Throws<OrderManagementException>(() => DpsContract.Validate("output_manifest", JsonSerializer.SerializeToElement(body)));
        Assert.False(body["provenance"]!.AsObject().ContainsKey("reference_data"));
    }
    [Fact]
    public void Diagnostic_output_still_requires_immutable_object_versions()
    {
        var body = MockOutput();
        body["outputs"]![0]!["s3"]!["version_id"] = "null";
        Assert.Throws<OrderManagementException>(() => DpsContract.ValidateSimulatedOutput(JsonSerializer.SerializeToElement(body)));
    }
    private static JsonObject MockOutput()
    {
        var scope = new DpsScope(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, Guid.NewGuid(), 1, 1);
        var recipe = new DpsRecipe("pseq_data_assembler", "0.1.0", JsonSerializer.SerializeToElement(new { }), new[] { "assembly_output" });
        var at = new DateTime(2026, 10, 14, 18, 0, 0, DateTimeKind.Utc);
        var output = new DpsOutputManifest(DpsContract.Version, "local", "output_manifest", Guid.NewGuid(), "dps-test", scope,
            recipe, new string('a', 64), at, at.AddMinutes(1), at.AddMinutes(1),
            new("mock", "0.1.0", [new("fixture-tool", "0.1.0")], [], [], null), [new(Guid.NewGuid(), "assembly_output", "FASTA", "placeholder.fasta", Object())]);
        var body = JsonSerializer.SerializeToNode(output, DpsContract.Json)!.AsObject();
        body["provenance"]!.AsObject().Remove("reference_data");
        body["provenance"]!.AsObject().Remove("reference_data_not_applicable");
        return body;
    }
}
