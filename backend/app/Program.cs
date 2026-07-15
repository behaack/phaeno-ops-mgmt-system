using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Threading.RateLimiting;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Health.Endpoints;
using PhaenoPortal.App.Features.DataProvisioning.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddPersistence(builder.Configuration);
builder.Services.Configure<ClerkOptions>(
    builder.Configuration.GetSection(ClerkOptions.SectionName));
builder.Services.Configure<BootstrapOptions>(
    builder.Configuration.GetSection(BootstrapOptions.SectionName));
builder.Services.Configure<InvitationOptions>(
    builder.Configuration.GetSection(InvitationOptions.SectionName));
builder.Services.Configure<PostmarkOptions>(
    builder.Configuration.GetSection(PostmarkOptions.SectionName));
builder.Services.Configure<DataProvisioningOptions>(
    builder.Configuration.GetSection(DataProvisioningOptions.SectionName));
builder.Services.Configure<OrderManagementOptions>(
    builder.Configuration.GetSection(OrderManagementOptions.SectionName));
builder.Services.Configure<QuickBooksOptions>(
    builder.Configuration.GetSection(QuickBooksOptions.SectionName));
if (builder.Environment.IsDevelopment())
{
    var dataProvisioningSection = builder.Configuration.GetSection(
        DataProvisioningOptions.SectionName);
    builder.Services.PostConfigure<DataProvisioningOptions>(options =>
    {
        if (dataProvisioningSection[nameof(DataProvisioningOptions.EnableSyntheticFixtures)] == null)
        {
            options.EnableSyntheticFixtures = true;
        }
        if (dataProvisioningSection[nameof(DataProvisioningOptions.UseTrustedDevelopmentScanner)] == null)
        {
            options.UseTrustedDevelopmentScanner = true;
        }
        if (options.AllowedFileKinds.Count == 0)
        {
            options.AllowedFileKinds[".txt"] = "plain_text_fixture";
            options.AllowedFileKinds[".csv"] = "tabular_fixture";
            options.AllowedFileKinds[".json"] = "structured_fixture";
        }
    });
    var orderManagementSection = builder.Configuration.GetSection(
        OrderManagementOptions.SectionName);
    builder.Services.PostConfigure<OrderManagementOptions>(options =>
    {
        if (orderManagementSection[nameof(OrderManagementOptions.UseTrustedDevelopmentScanner)] == null)
        {
            options.UseTrustedDevelopmentScanner = true;
        }
        if (options.AllowedFileKinds.Count == 0)
        {
            options.AllowedFileKinds[".txt"] = "plain_text_fixture";
            options.AllowedFileKinds[".csv"] = "tabular_fixture";
            options.AllowedFileKinds[".json"] = "structured_fixture";
            options.AllowedFileKinds[".pdf"] = "report";
            options.AllowedFileKinds[".zip"] = "data_archive";
        }
    });
}
builder.Services.AddSingleton<DataProvisioningProfile>();
builder.Services.AddSingleton<IManagedFileStorage, LocalManagedFileStorage>();
builder.Services.AddSingleton<IManagedFileScanner, EnvironmentManagedFileScanner>();
builder.Services.AddSingleton<IOperationalFileStorage, LocalOperationalFileStorage>();
builder.Services.AddSingleton<IOperationalFileScanner, EnvironmentOperationalFileScanner>();
builder.Services.AddScoped<OrderRequestContext>();
builder.Services.AddScoped<OrderIdempotencyService>();
builder.Services.AddHttpClient("QuickBooksOAuth");
builder.Services.AddSingleton(services => new QuickBooksAccessTokenProvider(
    services.GetRequiredService<IHttpClientFactory>().CreateClient("QuickBooksOAuth"),
    services.GetRequiredService<IOptions<QuickBooksOptions>>()));
builder.Services.AddHttpClient<HttpQuickBooksGateway>();
builder.Services.AddScoped<LoggingQuickBooksGateway>();
builder.Services.AddScoped<IQuickBooksGateway>(services =>
    services.GetRequiredService<IOptions<QuickBooksOptions>>().Value.IsConfigured
        ? services.GetRequiredService<HttpQuickBooksGateway>()
        : services.GetRequiredService<LoggingQuickBooksGateway>());
builder.Services.AddHostedService<OrderIntegrationDispatcher>();
builder.Services.AddHttpClient<PostmarkOrderNotificationSender>((services, httpClient) =>
{
    var postmarkOptions = services.GetRequiredService<IOptions<PostmarkOptions>>().Value;
    httpClient.BaseAddress = new Uri(postmarkOptions.ApiBaseUrl.TrimEnd('/') + "/");
});
builder.Services.AddScoped<LoggingOrderNotificationSender>();
builder.Services.AddScoped<IOrderNotificationSender>(services =>
    services.GetRequiredService<IOptions<PostmarkOptions>>().Value.IsConfigured
        ? services.GetRequiredService<PostmarkOrderNotificationSender>()
        : services.GetRequiredService<LoggingOrderNotificationSender>());
builder.Services.AddHostedService<OrderNotificationDispatcher>();
builder.Services.AddHttpClient<PostmarkDataProvisioningNoticeSender>((services, httpClient) =>
{
    var postmarkOptions = services.GetRequiredService<IOptions<PostmarkOptions>>().Value;
    httpClient.BaseAddress = new Uri(postmarkOptions.ApiBaseUrl.TrimEnd('/') + "/");
});
builder.Services.AddScoped<LoggingDataProvisioningNoticeSender>();
builder.Services.AddScoped<IDataProvisioningNoticeSender>(services =>
{
    var postmarkOptions = services.GetRequiredService<IOptions<PostmarkOptions>>().Value;
    return postmarkOptions.IsConfigured
        ? services.GetRequiredService<PostmarkDataProvisioningNoticeSender>()
        : services.GetRequiredService<LoggingDataProvisioningNoticeSender>();
});
builder.Services.AddHostedService<DataProvisioningNoticeDispatcher>();
builder.Services.AddSingleton<InvitationTokenService>();
builder.Services.AddHttpClient<ClerkBootstrapUserProvisioner>((services, httpClient) =>
{
    var clerkOptions = services.GetRequiredService<IOptions<ClerkOptions>>().Value;
    httpClient.BaseAddress = new Uri(clerkOptions.ApiBaseUrl.TrimEnd('/') + "/");
});
builder.Services.AddScoped<IClerkBootstrapUserProvisioner>(
    services => services.GetRequiredService<ClerkBootstrapUserProvisioner>());
builder.Services.AddScoped<LoggingInvitationEmailSender>();
builder.Services.AddHttpClient<PostmarkInvitationEmailSender>((services, httpClient) =>
{
    var postmarkOptions = services.GetRequiredService<IOptions<PostmarkOptions>>().Value;
    httpClient.BaseAddress = new Uri(postmarkOptions.ApiBaseUrl.TrimEnd('/') + "/");
});
builder.Services.AddScoped<IInvitationEmailSender>(services =>
{
    var postmarkOptions = services.GetRequiredService<IOptions<PostmarkOptions>>().Value;
    return postmarkOptions.IsConfigured
        ? services.GetRequiredService<PostmarkInvitationEmailSender>()
        : services.GetRequiredService<LoggingInvitationEmailSender>();
});
builder.Services.AddScoped<IExternalIdentityContext, ClaimsExternalIdentityContext>();

var clerkOptions = builder.Configuration
    .GetSection(ClerkOptions.SectionName)
    .Get<ClerkOptions>() ?? new ClerkOptions();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = clerkOptions.Authority;
        options.Audience = string.IsNullOrWhiteSpace(clerkOptions.Audience)
            ? null
            : clerkOptions.Audience;
        options.RequireHttpsMetadata = clerkOptions.RequireHttpsMetadata;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = clerkOptions.Authority,
            ValidateAudience = !string.IsNullOrWhiteSpace(clerkOptions.Audience),
            ValidAudience = clerkOptions.Audience,
            ValidateLifetime = true,
            NameClaimType = "sub"
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("api", httpContext => RateLimitPartition.GetFixedWindowLimiter(
        httpContext.User.FindFirst("sub")?.Value
            ?? httpContext.Connection.RemoteIpAddress?.ToString()
            ?? "anonymous",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 180,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(
            new ApiError("rate_limit", "too_many_requests", "Too many requests. Wait briefly and try again."),
            ApiMetaFactory.Create(context.HttpContext)), cancellationToken);
    };
});

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(kvp => kvp.Value?.Errors.Count > 0)
            .Select(kvp => new
            {
                field = kvp.Key,
                messages = kvp.Value!.Errors.Select(e =>
                    string.IsNullOrWhiteSpace(e.ErrorMessage)
                        ? "Invalid value."
                        : e.ErrorMessage)
            })
            .ToList();

        var response = ApiResponse<object>.Fail(
            new ApiError(
                type: "invalid_request",
                code: "validation_error",
                message: "One or more validation errors occurred.",
                details: errors),
            ApiMetaFactory.Create(context.HttpContext));

        return new BadRequestObjectResult(response);
    };
});

builder.Services
    .AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter(allowIntegerValues: false));
    });

builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.Converters.Add(
        new JsonStringEnumConverter(allowIntegerValues: false));
});

builder.Services.Configure<MvcOptions>(options =>
{
    options.Filters.Add<ApiResponseEnvelopeFilter>();
});

var app = builder.Build();

await AccountsBootstrapSeeder.SeedAsync(app.Services);

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.UseWhen(
    ctx => ctx.Request.Path.StartsWithSegments("/api"),
    apiApp =>
    {
        apiApp.UseMiddleware<ApiExceptionMiddleware>();
    });

var api = app.MapGroup("/api");

api.MapHealthEndpoints();
app.MapOrganizationEndpoints();
app.MapUserEndpoints();
app.MapInvitationEndpoints();
app.MapMembershipEndpoints();
app.MapSessionEndpoints();
app.MapControllers().RequireRateLimiting("api");

app.Run();
