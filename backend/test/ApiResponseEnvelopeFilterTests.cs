namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using PhaenoPortal.App.Infrastructure.Api;

public sealed class ApiResponseEnvelopeFilterTests
{
    private static async Task<ObjectResult> Apply(ObjectResult result)
    {
        var http = new DefaultHttpContext { TraceIdentifier = "validation-test" };
        var action = new ActionContext(http, new RouteData(), new ActionDescriptor());
        var context = new ResultExecutingContext(action, [], result, new object());
        await new ApiResponseEnvelopeFilter().OnResultExecutionAsync(context,
            () => Task.FromResult(new ResultExecutedContext(action, [], context.Result, context.Controller)));
        return Assert.IsType<ObjectResult>(context.Result);
    }

    [Fact]
    public async Task MultipartBindingFailureUsesFailureEnvelopeWithFieldDetails()
    {
        var validation = new ValidationProblemDetails(new Dictionary<string, string[]>
        { ["file"] = ["The file field is required."], ["payload"] = ["The payload field is required."] });
        var result = await Apply(new BadRequestObjectResult(validation));
        var body = Assert.IsType<ApiResponse<object?>>(result.Value);
        Assert.Equal(400, result.StatusCode);
        Assert.False(body.Success);
        Assert.Null(body.Data);
        Assert.Equal("validation_error", body.Error!.code);
        Assert.Contains("file field is required", body.Error.message);
        Assert.Contains("payload field is required", body.Error.message);
        Assert.NotNull(body.Error.details);
        Assert.Equal("validation-test", body.Meta.requestId);
    }

    [Fact]
    public async Task ValidationStatusAndEmptyMessageFallbackArePreserved()
    {
        var result = await Apply(new ObjectResult(new ValidationProblemDetails { Status = 422, Title = "Review the supplied fields." }));
        var body = Assert.IsType<ApiResponse<object?>>(result.Value);
        Assert.Equal(422, result.StatusCode);
        Assert.False(body.Success);
        Assert.Equal("Review the supplied fields.", body.Error!.message);
    }

    [Fact]
    public async Task SuccessfulValuesStillUseTheSuccessEnvelope()
    {
        var value = new { receipt = "receipt-1" };
        var result = await Apply(new OkObjectResult(value));
        var body = Assert.IsType<ApiResponse<object?>>(result.Value);
        Assert.True(body.Success);
        Assert.Same(value, body.Data);
        Assert.Null(body.Error);
    }
}
