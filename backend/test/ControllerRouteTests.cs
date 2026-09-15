namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using PhaenoPortal.App.Features.Crm.Controllers;

public sealed class ControllerRouteTests
{
    [Fact]
    public async Task TrialLifecycleCommandsReachTheActionEndpoint()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        builder.Services.AddControllers().AddApplicationPart(typeof(CrmAdministrationController).Assembly);
        await using var application = builder.Build();
        application.UseRouting();
        // Stop before controller activation: exercise real endpoint matching without
        // replacing business authorization or requiring a database for a route test.
        application.Use(async (HttpContext context, RequestDelegate next) =>
        {
            var action = context.GetEndpoint()?.Metadata.GetMetadata<ControllerActionDescriptor>();
            if (action?.ControllerName == "TrialProjects" && action.ActionName == "Act")
            {
                await context.Response.WriteAsync(context.Request.RouteValues["operation"]?.ToString() ?? "missing operation");
                return;
            }
            context.Response.StatusCode = 404;
        });
        application.MapControllers();
        await application.StartAsync();
        using var client = new HttpClient { BaseAddress = new Uri(application.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single()) };
        foreach (var operation in new[] { "hold", "close", "replacement", "schedule", "material", "commercial-outcome" })
        {
            var response = await client.PostAsync($"/api/trials/{Guid.NewGuid()}/actions/{operation}", null);
            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(operation, await response.Content.ReadAsStringAsync());
        }
        await application.StopAsync();
    }

    [Fact]
    public async Task AllControllerRoutesCanBeMaterialized()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Services
            .AddControllers()
            .AddApplicationPart(typeof(CrmAdministrationController).Assembly);

        await using var application = builder.Build();
        application.MapControllers();

        var endpoints = ((IEndpointRouteBuilder)application)
            .DataSources
            .SelectMany(dataSource => dataSource.Endpoints)
            .ToList();

        Assert.NotEmpty(endpoints);
    }
}
