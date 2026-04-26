namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Common.Exceptions.Conflict;
using PhaenoPortal.App.Features.Health.DTOs;
using PhaenoPortal.App.Infrastructure.Api;

public class ApiResponseTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public void SuccessEnvelopeSerializesWithReferenceShape()
    {
        var meta = new ApiMeta(
            requestId: "request-1",
            timestampUtc: DateTimeOffset.Parse("2026-04-25T00:00:00Z"));

        var envelope = ApiResponse<HealthStatusDto>.Ok(
            new HealthStatusDto("Phaeno Portal API", "healthy"),
            meta);

        string json = JsonSerializer.Serialize(envelope, JsonOptions);

        using JsonDocument document = JsonDocument.Parse(json);
        JsonElement root = document.RootElement;

        Assert.True(root.GetProperty("success").GetBoolean());
        Assert.Equal("Phaeno Portal API", root.GetProperty("data").GetProperty("service").GetString());
        Assert.Equal("healthy", root.GetProperty("data").GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, root.GetProperty("error").ValueKind);
        Assert.Equal("request-1", root.GetProperty("meta").GetProperty("requestId").GetString());
        Assert.True(root.GetProperty("meta").TryGetProperty("timestampUtc", out _));
    }

    [Fact]
    public void FailureEnvelopeSerializesWithReferenceShape()
    {
        var meta = new ApiMeta(
            requestId: "request-2",
            timestampUtc: DateTimeOffset.Parse("2026-04-25T00:00:00Z"));

        var envelope = ApiResponse<object>.Fail(
            new ApiError(
                type: "invalid_request",
                code: "validation_error",
                message: "One or more validation errors occurred.",
                details: new[] { new { field = "email", messages = new[] { "Invalid value." } } }),
            meta);

        string json = JsonSerializer.Serialize(envelope, JsonOptions);

        using JsonDocument document = JsonDocument.Parse(json);
        JsonElement root = document.RootElement;

        Assert.False(root.GetProperty("success").GetBoolean());
        Assert.Equal(JsonValueKind.Null, root.GetProperty("data").ValueKind);
        Assert.Equal("invalid_request", root.GetProperty("error").GetProperty("type").GetString());
        Assert.Equal("validation_error", root.GetProperty("error").GetProperty("code").GetString());
        Assert.Equal("One or more validation errors occurred.", root.GetProperty("error").GetProperty("message").GetString());
        Assert.Equal("email", root.GetProperty("error").GetProperty("details")[0].GetProperty("field").GetString());
        Assert.Equal("request-2", root.GetProperty("meta").GetProperty("requestId").GetString());
    }

    [Fact]
    public void DomainExceptionMapsLikeReferenceApi()
    {
        var exception = new BadRequestException("Bad invite token.");

        var (statusCode, error) = ApiErrorMapper.Map(exception);

        Assert.Equal(400, statusCode);
        Assert.Equal("invalid_request", error.type);
        Assert.Equal("bad-request", error.code);
        Assert.Equal("Bad invite token.", error.message);
        Assert.Null(error.details);
        Assert.Null(error.param);
    }

    [Fact]
    public void ConcurrencyExceptionMapsToConflict()
    {
        var exception = new DbUpdateConcurrencyException();

        var (statusCode, error) = ApiErrorMapper.Map(exception);

        Assert.Equal(409, statusCode);
        Assert.Equal("conflict", error.type);
        Assert.Equal("concurrency_conflict", error.code);
    }
}
