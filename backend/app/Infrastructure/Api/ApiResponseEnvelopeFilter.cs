using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace PhaenoPortal.App.Infrastructure.Api;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class SkipApiEnvelopeAttribute : Attribute { }

public sealed class ApiResponseEnvelopeFilter : IAsyncResultFilter
{
    public async Task OnResultExecutionAsync(ResultExecutingContext context, ResultExecutionDelegate next)
    {
        if (context.ActionDescriptor.EndpointMetadata.OfType<SkipApiEnvelopeAttribute>().Any())
        {
            await next();
            return;
        }

        if (context.Result is FileResult
            or ChallengeResult
            or ForbidResult
            or SignInResult
            or SignOutResult
            or RedirectResult
            or RedirectToActionResult
            or RedirectToRouteResult)
        {
            await next();
            return;
        }

        if (context.Result is StatusCodeResult)
        {
            await next();
            return;
        }

        if (context.Result is ObjectResult { Value: { } v } &&
            v.GetType().IsGenericType &&
            v.GetType().GetGenericTypeDefinition() == typeof(ApiResponse<>))
        {
            await next();
            return;
        }

        if (context.Result is ObjectResult obj)
        {
            var meta = ApiMetaFactory.Create(context.HttpContext);
            var wrapped = ApiResponse<object?>.Ok(obj.Value, meta);

            context.Result = new ObjectResult(wrapped)
            {
                StatusCode = obj.StatusCode ?? StatusCodes.Status200OK
            };

            await next();
            return;
        }

        if (context.Result is OkResult)
        {
            var meta = ApiMetaFactory.Create(context.HttpContext);
            context.Result = new ObjectResult(ApiResponse<object?>.Ok(null, meta))
            {
                StatusCode = StatusCodes.Status200OK
            };

            await next();
            return;
        }

        await next();
    }
}
