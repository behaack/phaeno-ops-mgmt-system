using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Threading.RateLimiting;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.DataProvisioning.Application;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Commercial.OrderManagement.Application;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Health.Endpoints;
using PhaenoPortal.App.Features.DataProvisioning.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.OrderToCash;
using PhaenoPortal.App.Features.Website;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Storage;
using PhaenoPortal.App.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddPersistence(builder.Configuration);
builder.Services.AddFileStorage(builder.Configuration, builder.Environment);
builder.Services.AddWebsiteApi(builder.Configuration, builder.Environment);
builder.Services.Configure<ClerkOptions>(
    builder.Configuration.GetSection(ClerkOptions.SectionName));
builder.Services.Configure<BootstrapOptions>(
    builder.Configuration.GetSection(BootstrapOptions.SectionName));
var orderToCashConfiguration = builder.Configuration
    .GetSection(OrderToCashOptions.SectionName)
    .Get<OrderToCashOptions>() ?? new OrderToCashOptions();
builder.Services.AddOptions<OrderToCashOptions>()
    .Bind(builder.Configuration.GetSection(OrderToCashOptions.SectionName))
    .Validate(options => options.IsValid(),
        "OrderToCash settings are invalid. Enabled durable delivery requires webhook credentials; governed results require a pipeline key; enforced dual control requires staffing validation.")
    .ValidateOnStart();
builder.Services.AddOptions<PostmarkOptions>()
    .Bind(builder.Configuration.GetSection(PostmarkOptions.SectionName))
    .Validate(options => !builder.Environment.IsProduction()
        || !(orderToCashConfiguration.Features.InvitationDelivery
            || orderToCashConfiguration.Features.GovernedPSeqResults)
        || options.IsConfigured,
        "Production invitation and governed-result notification delivery require a valid Postmark server token and sender.")
    .ValidateOnStart();
builder.Services.AddOptions<InvitationOptions>()
    .Bind(builder.Configuration.GetSection(InvitationOptions.SectionName))
    .Validate(options => !builder.Environment.IsProduction()
        || !(orderToCashConfiguration.Features.InvitationDelivery
            || orderToCashConfiguration.Features.GovernedPSeqResults)
        || (Uri.TryCreate(options.PublicBaseUrl, UriKind.Absolute, out var uri)
            && uri.Scheme == Uri.UriSchemeHttps),
        "Production invitation and governed-result delivery require an HTTPS Portal public base URL.")
    .ValidateOnStart();
builder.Services.Configure<DataProvisioningOptions>(
    builder.Configuration.GetSection(DataProvisioningOptions.SectionName));
builder.Services.AddOptions<OrderManagementOptions>()
    .Bind(builder.Configuration.GetSection(OrderManagementOptions.SectionName))
    .Validate(
        options => options.HasValidDownloadSettings,
        "OrderManagement download leases must be 1-1440 minutes and reconciliation must run every 5-300 seconds.")
    .ValidateOnStart();
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
builder.Services.AddSingleton<IManagedFileScanner, EnvironmentManagedFileScanner>();
builder.Services.AddSingleton<IOperationalFileScanner, EnvironmentOperationalFileScanner>();
builder.Services.AddScoped<ReleasedDeliverableRetentionSnapshotService>();
builder.Services.AddScoped<ReleasedDeliverableDownloadAttemptService>();
builder.Services.AddScoped<ReleasedDeliverableDownloadProjectionService>();
builder.Services.AddHostedService<ReleasedDeliverableDownloadAttemptReconciler>();
builder.Services.AddScoped<OrderRequestContext>();
builder.Services.AddScoped<OrderIdempotencyService>();
builder.Services.AddScoped<ManualCommercialReleaseService>();
builder.Services.AddScoped<OperationalReadinessService>();
builder.Services.AddScoped<OrderToCashAuthorization>();
builder.Services.AddScoped<DualControlService>();
builder.Services.AddScoped<AttentionOperationsService>();
builder.Services.AddScoped<NativeInvoiceService>();
builder.Services.AddHostedService<ResultPackageLifecycleDispatcher>();
builder.Services.AddScoped<InvitationDeliveryEnqueuer>();
builder.Services.AddHostedService<InvitationDeliveryDispatcher>();
builder.Services.AddScoped<SampleShippingPacketService>();
builder.Services.AddScoped<SampleShippingWorkflowReader>();
builder.Services.AddScoped<ILabOperationsProvider, InternalLabOperationsProvider>();
builder.Services.AddScoped<LabOperationsRequestContext>();
builder.Services.AddHostedService<LabOperationsProjectionDispatcher>();
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
builder.Services.AddHttpClient<ClerkVerifiedEmailResolver>((services, httpClient) =>
{
    var clerkOptions = services.GetRequiredService<IOptions<ClerkOptions>>().Value;
    httpClient.BaseAddress = new Uri(clerkOptions.ApiBaseUrl.TrimEnd('/') + "/");
});
builder.Services.AddScoped<IVerifiedExternalEmailResolver>(
    services => services.GetRequiredService<ClerkVerifiedEmailResolver>());
builder.Services.AddScoped<LoggingInvitationEmailSender>();
builder.Services.AddHttpClient<PostmarkInvitationEmailSender>((services, httpClient) =>
{
    var postmarkOptions = services.GetRequiredService<IOptions<PostmarkOptions>>().Value;
    httpClient.BaseAddress = new Uri(postmarkOptions.ApiBaseUrl.TrimEnd('/') + "/");
});
builder.Services.AddScoped<IInvitationEmailSender>(services =>
{
    var postmarkOptions = services.GetRequiredService<IOptions<PostmarkOptions>>().Value;
    if (postmarkOptions.IsConfigured)
        return services.GetRequiredService<PostmarkInvitationEmailSender>();
    var hostEnvironment = services.GetRequiredService<IHostEnvironment>();
    if (hostEnvironment.IsDevelopment() || hostEnvironment.IsEnvironment("Test"))
        return services.GetRequiredService<LoggingInvitationEmailSender>();
    throw new InvalidOperationException("Logging invitation delivery is limited to Development and Test.");
});
builder.Services.AddDataProtection();
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
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor
        | ForwardedHeaders.XForwardedHost
        | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

if (args.Contains("--migrate", StringComparer.Ordinal))
{
    await using var scope = app.Services.CreateAsyncScope();
    var dbContext = scope.ServiceProvider
        .GetRequiredService<PSeqOperationsDbContext>();
    await dbContext.Database.MigrateAsync();
    return;
}

if (args.Contains("--cutover-clerk-bootstrap-identity", StringComparer.Ordinal))
{
    await ClerkBootstrapIdentityCutover.RunAsync(app.Services);
    return;
}

await AccountsBootstrapSeeder.SeedAsync(app.Services);

app.UseForwardedHeaders();
app.UseHttpsRedirection();
app.UseWebsitePublicDocuments();
app.UseCors();
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
