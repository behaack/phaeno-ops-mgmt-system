namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using PhaenoPortal.App.Features.Crm.Controllers;

public sealed class ControllerRouteTests
{
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
