using System.Text.Json;
using PhaenoPortal.App.Infrastructure.Api;

namespace PhaenoPortal.App.Middleware;

public sealed class ApiExceptionMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly RequestDelegate next;
    private readonly ILogger<ApiExceptionMiddleware> logger;

    public ApiExceptionMiddleware(
        RequestDelegate next,
        ILogger<ApiExceptionMiddleware> logger)
    {
        this.next = next;
        this.logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex) when (ex is JsonException || ex is BadHttpRequestException)
        {
            throw;
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            logger.LogDebug("Request aborted by client.");
        }
        catch (Exception ex)
        {
            await WriteApiErrorAsync(context, ex);
        }
    }

    private async Task WriteApiErrorAsync(HttpContext context, Exception exception)
    {
        if (context.Response.HasStarted)
        {
            logger.LogWarning(exception, "Response already started; cannot write API error envelope.");
            return;
        }

        var (statusCode, apiError) = ApiErrorMapper.Map(exception);

        if (statusCode >= StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Unhandled exception.");
        else
            logger.LogInformation("Handled exception mapped to {StatusCode}: {Code}", statusCode, apiError.code);

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        context.Response.Headers.CacheControl = "no-store";

        var meta = ApiMetaFactory.Create(context);
        var envelope = ApiResponse<object>.Fail(apiError, meta);

        await context.Response.WriteAsync(JsonSerializer.Serialize(envelope, JsonOptions));
    }
}
