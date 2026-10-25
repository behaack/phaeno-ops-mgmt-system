namespace PhaenoPortal.Test;

using System.Diagnostics;
using System.Security.Claims;
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
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Trials.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Middleware;
using PSeq.Operations.Laboratory.Domain;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    private static async Task VerifyPhase4Browser(PSeqOperationsDbContext db, Phase4Checkpoint checkpoint)
    {
        // This host never loads Program/hosted workers or production authentication.
        Assert.Equal(SampleTrackingPhase4Support.Connection("restored").Database, db.Database.GetDbConnection().Database);
        var files = SampleTrackingPhase4Support.Files("restored");
        var raw = await db.LabScientificFiles.AsNoTracking().SingleAsync();
        var rawPath = SampleTrackingPhase4Support.PrivateFile("restored", raw.StorageKey);
        var originalBytes = await File.ReadAllBytesAsync(rawPath);
        var report = await db.LabInvestigationReports.AsNoTracking().SingleAsync(r => r.Id == checkpoint.ReportId);
        var organizationId = (await db.LabWorkOrders.AsNoTracking().SingleAsync(w => w.Id == checkpoint.WorkId)).SubmittingOrganizationId;
        var customer = await db.Users.AsNoTracking().FirstAsync(u => db.OrganizationMemberships.Any(m => m.UserId == u.Id && m.OrganizationId == organizationId));
        var customerIdentity = new ExternalIdentity(customer.ExternalIdentityProvider!, customer.ExternalSubjectId!, customer.Email, true);
        var originalStock = JsonSerializer.Serialize(await db.LabMaterialLots.AsNoTracking().OrderBy(l => l.Id).ToArrayAsync());
        var originalUses = JsonSerializer.Serialize(await db.LabMaterialConsumptions.AsNoTracking().OrderBy(u => u.Id).ToArrayAsync());
        var originalPhysical = await db.Set<LabPhysicalEvent>().CountAsync();
        var originalCommands = await db.Set<LabAssemblyCommand>().CountAsync();
        var insertedEvents = new List<Guid>();
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Test" });
        builder.WebHost.UseUrls("http://127.0.0.1:0"); builder.Logging.ClearProviders();
        builder.Services.AddAuthentication("Phase4").AddScheme<AuthenticationSchemeOptions, Phase4Authentication>("Phase4", _ => { });
        builder.Services.AddAuthorization(); builder.Services.AddSingleton(db); builder.Services.AddSingleton(files);
        builder.Services.AddSingleton<IExternalIdentityContext>(new Phase4Identity(checkpoint.ReviewerIdentity, customerIdentity));
        builder.Services.AddScoped<LabOperationsRequestContext>(); builder.Services.AddScoped<OrderRequestContext>(); builder.Services.AddScoped<TrialWorkGuard>();
        builder.Services.AddSingleton<IOptions<PSeqOrderToCashOptions>>(Options.Create(new PSeqOrderToCashOptions { GovernedPSeqResults = true, DualControlEnforced = true }));
        builder.Services.AddControllers(o => o.Filters.Add<ApiResponseEnvelopeFilter>()).AddApplicationPart(typeof(LabOperationsController).Assembly);
        await using var app = builder.Build(); using var gate = new SemaphoreSlim(1);
        app.Use(async (context, next) => { await gate.WaitAsync(context.RequestAborted); try { db.ChangeTracker.Clear(); await next(context); } finally { db.ChangeTracker.Clear(); gate.Release(); } });
        app.UseMiddleware<ApiExceptionMiddleware>(); app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
        app.MapGet("/api/verification/phase4", (HttpContext context) => Staff(context) ? Results.Json(new {
            checkpoint.WorkId, checkpoint.SpecimenId, checkpoint.PackageId, checkpoint.AnalysisId, checkpoint.SourceBarcode,
            checkpoint.ReportId, checkpoint.ReportSha256, rawFileId = raw.Id, raw.Sha256, raw.SizeBytes,
            originalStorageUnavailable = !Directory.Exists(Path.Combine(Environment.GetEnvironmentVariable("PSEQ_PHASE4_PRIVATE_ROOT")!, "source"))
        }) : Results.StatusCode(403)).RequireAuthorization();
        app.MapPost("/api/verification/phase4/state/{state}", async (HttpContext context, string state) => {
            if (!Staff(context)) return Results.StatusCode(403);
            // Deliberate fault injection only within this generated restored database/private root.
            if (state is "reset" or "healthy") await File.WriteAllBytesAsync(rawPath, originalBytes);
            else if (state == "missing") File.Delete(rawPath);
            else if (state == "corrupt") { var changed = (byte[])originalBytes.Clone(); changed[0] ^= 1; await File.WriteAllBytesAsync(rawPath, changed); }
            else if (state is not ("report-corrupt" or "report-healthy" or "long-history" or "append")) return Results.BadRequest();
            if (state is "reset" or "report-healthy" or "report-corrupt")
            {
                var body = report.BodyJson + (state == "report-corrupt" ? " " : "");
                await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE lab_ops.lab_investigation_reports SET body_json = {body} WHERE id = {report.Id}");
            }
            if (state == "reset" && insertedEvents.Count > 0) { await db.LabWorkEvents.Where(e => insertedEvents.Contains(e.Id)).ExecuteDeleteAsync(); insertedEvents.Clear(); }
            if (state is "long-history" or "append")
            {
                var events = Enumerable.Range(0, state == "append" ? 1 : 10007).Select(i => new LabWorkEvent(checkpoint.WorkId, checkpoint.SpecimenId,
                    state == "append" ? "TESTPhase4BrowserLaterAppend" : "TESTPhase4BrowserHistory", LabEvidenceTime.UtcNow, null, JsonSerializer.Serialize(new { ordinal = i }))).ToArray();
                db.AddRange(events); await db.SaveChangesAsync(); insertedEvents.AddRange(events.Select(e => e.Id));
            }
            return Results.Json(new { result = "prepared" });
        }).RequireAuthorization();
        try
        {
            await app.StartAsync();
            var repo = new DirectoryInfo(AppContext.BaseDirectory); while (repo is not null && !Directory.Exists(Path.Combine(repo.FullName, "frontend", "e2e"))) repo = repo.Parent; Assert.NotNull(repo);
            var start = new ProcessStartInfo("cmd.exe") { WorkingDirectory = Path.Combine(repo.FullName, "frontend"), RedirectStandardOutput = true, RedirectStandardError = true, CreateNoWindow = true };
            start.ArgumentList.Add("/c"); start.ArgumentList.Add("pnpm exec playwright test --config playwright.sample-recovery-phase4.config.ts --workers=1");
            start.Environment["PSEQ_PHASE4_TEST_API"] = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single(); start.Environment.Remove("FORCE_COLOR");
            using var process = Process.Start(start)!; var stdout = process.StandardOutput.ReadToEndAsync(); var stderr = process.StandardError.ReadToEndAsync();
            using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(15));
            try { await process.WaitForExitAsync(timeout.Token); } catch { if (!process.HasExited) process.Kill(entireProcessTree: true); throw; }
            var log = await stdout + await stderr; await File.WriteAllTextAsync(Path.Combine(SampleTrackingPhase4Support.Artifacts(), "browser.log"), log);
            Assert.True(process.ExitCode == 0, log);
            Assert.Equal(originalStock, JsonSerializer.Serialize(await db.LabMaterialLots.AsNoTracking().OrderBy(l => l.Id).ToArrayAsync()));
            Assert.Equal(originalUses, JsonSerializer.Serialize(await db.LabMaterialConsumptions.AsNoTracking().OrderBy(u => u.Id).ToArrayAsync()));
            Assert.Equal(originalPhysical, await db.Set<LabPhysicalEvent>().CountAsync()); Assert.Equal(originalCommands, await db.Set<LabAssemblyCommand>().CountAsync());
            Assert.Equal(report.BodyJson, (await db.LabInvestigationReports.AsNoTracking().SingleAsync(r => r.Id == report.Id)).BodyJson);
            await SampleTrackingPhase4Support.WriteAsync("browser-preservation.json", new { result = "passed", originalLotsAndUsesUnchanged = true, noPhysicalCommands = true, noAssemblyCommands = true, originalReportUnchanged = true });
        }
        finally { await app.StopAsync(); db.ChangeTracker.Clear(); }
        static bool Staff(HttpContext context) => context.User.FindFirst("phase4-actor")?.Value == "staff";
    }

    private sealed class Phase4Identity(ExternalIdentity staff, ExternalIdentity customer) : IExternalIdentityContext
    {
        public ExternalIdentity? Read(HttpContext context) => context.User.FindFirst("phase4-actor")?.Value switch { "staff" => staff, "customer" => customer, _ => null };
    }
    private sealed class Phase4Authentication(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var actor = Request.Headers.Authorization.ToString() switch { "Bearer phase4-staff" => "staff", "Bearer phase4-customer" => "customer", _ => null };
            return Task.FromResult(actor is null ? AuthenticateResult.NoResult() : AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity([new Claim("phase4-actor", actor)], Scheme.Name)), Scheme.Name)));
        }
    }
}
