namespace PhaenoPortal.Test;

using System.Text.Json;
using System.Text.Json.Nodes;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

// Regression sources only: execution is deferred at the Owner's request.
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
    }
}
