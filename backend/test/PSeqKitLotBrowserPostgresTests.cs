namespace PhaenoPortal.Test;

using System.Diagnostics;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Middleware;

public sealed partial class KitBundlePostgresTests
{
    // Opt-in connected browser test. Authentication, scanning and byte storage are
    // synthetic and confined to this loopback test host; MVC/domain/EF/PostgreSQL are real.
    [KitLotBrowserFact]
    public async Task BrowserStandaloneLotThenAssemblyUsesRealHttpAndPostgres()
    {
        await using var scope = await Scope.Create();
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Test" });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        builder.Services.AddAuthentication("KitBrowser").AddScheme<AuthenticationSchemeOptions, KitBrowserAuthentication>("KitBrowser", _ => { });
        builder.Services.AddAuthorization();
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddSingleton(scope.Db);
        builder.Services.AddScoped<IExternalIdentityContext>(services => new BrowserIdentity(services.GetRequiredService<IHttpContextAccessor>(), scope));
        builder.Services.AddScoped<OrderRequestContext>();
        builder.Services.AddScoped<OrderIdempotencyService>();
        builder.Services.AddSingleton<IOperationalFileStorage>(new InputBytes());
        builder.Services.AddSingleton<IOperationalFileScanner>(new InputScanner());
        builder.Services.Configure<OrderManagementOptions>(options => options.AllowedFileKinds = new() { [".fasta"] = "text/plain" });
        builder.Services.AddScoped<ReleasedDeliverableDownloadAttemptService>();
        builder.Services.AddScoped<ReleasedDeliverableDownloadProjectionService>();
        builder.Services.AddScoped<ReleasedDeliverableRetentionSnapshotService>();
        builder.Services.AddScoped<ManualCommercialReleaseService>();
        builder.Services.AddControllers(options => options.Filters.Add<ApiResponseEnvelopeFilter>())
            .AddApplicationPart(typeof(PartnerKitLotsController).Assembly);
        await using var app = builder.Build();
        // A single fixture context is intentionally serialized across browser requests.
        using var gate = new SemaphoreSlim(1);
        app.Use(async (context, next) => {
            await gate.WaitAsync();
            try { scope.Db.ChangeTracker.Clear(); await next(context); }
            finally { scope.Db.ChangeTracker.Clear(); gate.Release(); }
        });
        app.UseMiddleware<ApiExceptionMiddleware>();
        app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
        app.MapPost("/verification/scenario", async () => {
            var expiration = DateTime.UtcNow.Date.AddDays(-1);
            var lot = await scope.RegisterLot("SIMULATED-" + Guid.NewGuid().ToString("N")[..8], expiration);
            var order = await scope.PlaceOrder(1);
            order = await scope.Platform().Accept(order.Id, new(order.Version), default);
            order = await scope.Platform().CreateShipment(order.Id, new(order.Version, "SIMULATED", null, "SIMULATED", DateTime.UtcNow.AddDays(-3),
                [new(order.Lines.Single().Id, 1, lot.LotNumber)]), default);
            order = await scope.Platform().Fulfill(order.Id, new(order.Version), default);
            return Results.Json(new { orderId = order.Id, caseId = order.AssemblyCases!.Single().Id,
                organizationId = scope.Partner.Id, departmentId = scope.Department.Id, otherDepartmentId = scope.OtherDepartment.Id,
                lotId = lot.Id, lotNumber = lot.LotNumber, usedOn = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-2)),
                expiredUseDate = DateOnly.FromDateTime(DateTime.UtcNow), expirationDate = lot.ExpirationDate });
        }).RequireAuthorization();
        app.MapGet("/verification/evidence/{orderId:guid}", async (Guid orderId) => {
            var caseIds = await scope.Db.KitAssemblyCases.Where(x => x.PartnerReagentOrderId == orderId).Select(x => x.Id).ToListAsync();
            var submissions = await scope.Db.PartnerKitLotSubmissions.Where(x => caseIds.Contains(x.KitAssemblyCaseId)).ToListAsync();
            var requests = await scope.Db.DataAssemblyRequests.Where(x => x.KitAssemblyCaseId.HasValue && caseIds.Contains(x.KitAssemblyCaseId.Value)).ToListAsync();
            var requestIds = requests.Select(x => x.Id).ToList();
            return Results.Json(new { submissions, requests,
                files = await scope.Db.ManagedOperationalFiles.Where(x => requestIds.Contains(x.WorkflowId)).ToListAsync(),
                revisions = await scope.Db.AssemblyInputRevisions.Where(x => requestIds.Contains(x.DataAssemblyRequestId)).ToListAsync(),
                runs = await scope.Db.AssemblyProcessingRuns.Where(x => requestIds.Contains(x.DataAssemblyRequestId)).ToListAsync() });
        }).RequireAuthorization();
        await app.StartAsync();
        var address = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
        var repo = new DirectoryInfo(AppContext.BaseDirectory);
        while (repo != null && !Directory.Exists(Path.Combine(repo.FullName, "frontend", "e2e"))) repo = repo.Parent;
        Assert.NotNull(repo);
        var start = new ProcessStartInfo("cmd.exe") { WorkingDirectory = Path.Combine(repo.FullName, "frontend"), RedirectStandardOutput = true, RedirectStandardError = true,
            StandardOutputEncoding = Encoding.UTF8, StandardErrorEncoding = Encoding.UTF8 };
        start.ArgumentList.Add("/c"); start.ArgumentList.Add("pnpm exec playwright test e2e/pseq-kit-lots.connected.spec.ts --workers=1");
        start.Environment["PSEQ_KIT_TEST_API"] = address;
        start.Environment["PLAYWRIGHT_PORT"] = "3107";
        start.Environment.Remove("FORCE_COLOR");
        start.Environment["NO_COLOR"] = "1";
        using var process = Process.Start(start)!;
        var logPath = Path.Combine(repo.FullName, ".task-tmp", "pseq-lot-browser.txt");
        Directory.CreateDirectory(Path.GetDirectoryName(logPath)!);
        await using var log = new StreamWriter(logPath, append: false) { AutoFlush = true };
        async Task<string> ReadOutput(StreamReader reader) {
            var lines = new List<string>();
            while (await reader.ReadLineAsync() is { } line) { lines.Add(line); lock (log) { log.WriteLine(line); } }
            return string.Join(Environment.NewLine, lines);
        }
        var stdout = ReadOutput(process.StandardOutput); var stderr = ReadOutput(process.StandardError);
        try { await process.WaitForExitAsync(new CancellationTokenSource(TimeSpan.FromMinutes(15)).Token); }
        catch { process.Kill(entireProcessTree: true); throw; }
        var output = await stdout + await stderr;
        Assert.True(process.ExitCode == 0, output);
        await app.StopAsync();
    }

    private sealed class BrowserIdentity(IHttpContextAccessor accessor, Scope scope) : IExternalIdentityContext
    {
        public ExternalIdentity? Read(HttpContext context) => accessor.HttpContext?.User.FindFirst("kit-test-actor")?.Value switch {
            "partner" => scope.PartnerIdentity, "staff" => scope.StaffIdentity, _ => null };
    }
    private sealed class KitBrowserAuthentication(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var actor = Request.Headers.Authorization.ToString() switch { "Bearer kit-test-partner" => "partner", "Bearer kit-test-staff" => "staff", _ => null };
            return Task.FromResult(actor == null ? AuthenticateResult.NoResult() : AuthenticateResult.Success(new AuthenticationTicket(
                new ClaimsPrincipal(new ClaimsIdentity([new Claim("kit-test-actor", actor)], Scheme.Name)), Scheme.Name)));
        }
    }
}

internal sealed class KitLotBrowserFactAttribute : FactAttribute
{
    public KitLotBrowserFactAttribute()
    {
        if (Environment.GetEnvironmentVariable("PSEQ_KIT_BROWSER_VERIFICATION") != "1"
            || string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")))
            Skip = "Set PSEQ_KIT_BROWSER_VERIFICATION=1 and a loopback reference connection for connected browser acceptance.";
    }
}
