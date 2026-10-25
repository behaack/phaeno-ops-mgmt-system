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
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Trials.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Middleware;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    private static async Task VerifyPhase1BrowserAsync(ShippingTestScope scope, List<Guid> workIds, Guid batchId,
        LabMaterialLot lot, LabMaterialLot componentLot)
    {
        var db = scope.DbContext; var now = LabEvidenceTime.UtcNow;
        var library = await db.LabLibraries.AsNoTracking().SingleAsync(l => l.LabWorkOrderId == workIds[0]);
        var samples = await db.LabSpecimens.AsNoTracking().Where(s => workIds.Contains(s.LabWorkOrderId)
            && db.LabSpecimenAttempts.Any(a => a.LabSpecimenId == s.Id)).OrderBy(s => s.LabWorkOrderId == workIds[0] ? 0 : 1)
            .Select(s => new { workId = s.LabWorkOrderId, specimenId = s.Id, accession = s.AccessionNumber }).ToArrayAsync();
        var selectedMember = Guid.NewGuid(); var otherMember = Guid.NewGuid(); var otherLibrary = Guid.NewGuid();
        var manifest = JsonSerializer.Serialize(new { members = new[] {
            new { libraryId = library.Id, libraryKey = library.LibraryKey, memberId = selectedMember },
            new { libraryId = otherLibrary, libraryKey = "OTHER-SAMPLE-SECRET", memberId = otherMember } } });
        var sendout = new LabNgsSendout(batchId, "TEST ONLY Phase 1 vendor", "TEST vendor reference", manifest, null);
        sendout.SetStatus(LabNgsSendoutStatus.Shipped, now); sendout.SetStatus(LabNgsSendoutStatus.ReceivedByProvider, now);
        sendout.RecordResults("TEST ONLY vendor job", true, null, null, null, LabVendorOutcome.Failure, "Synthetic run not performed", now);
        db.LabNgsSendouts.Add(sendout); await db.SaveChangesAsync();
        foreach (var number in new[] { 1, 2 })
        {
            var snapshot = new VendorResultsSnapshot(batchId, "TEST batch", "TEST batch", sendout.Id, sendout.ProviderName,
                "TEST vendor job", true, null, null, null, "Failure", null, now, manifest,
                [new(selectedMember, library.Id, library.LibraryKey, "Failure", "Selected library run not performed"),
                    new(otherMember, otherLibrary, "OTHER-SAMPLE-SECRET", "Failure", "OTHER-SAMPLE-SECRET")], [], []);
            var version = new LabVendorResultsVersion(Guid.NewGuid(), sendout.Id, number, JsonSerializer.Serialize(snapshot, JsonSerializerOptions.Web),
                number == 1 ? null : "Synthetic corrected vendor evidence", scope.PlatformUser.Id, "TEST operator", now);
            db.LabVendorResultsVersions.Add(version);
            db.LabCustodyEvents.Add(LabCustodyEvent.ForCommand(version.Id, sendout.Id, number == 1 ? "VENDOR_RUN_NOT_PERFORMED" : "VENDOR_RESULTS_CORRECTED",
                sendout.ProviderName, JsonSerializer.Serialize(new { resultVersion = number, previous = new { secret = "OTHER-SAMPLE-SECRET" } }), scope.PlatformUser.Id, now));
        }
        await db.SaveChangesAsync();
        var beforeLot = JsonSerializer.Serialize(await db.LabMaterialLots.AsNoTracking().SingleAsync(l => l.Id == lot.Id));
        var beforeUses = JsonSerializer.Serialize(await db.LabMaterialConsumptions.AsNoTracking().Where(u => u.LabMaterialLotId == lot.Id).OrderBy(u => u.Id).ToArrayAsync());
        var beforeCommands = await db.Set<LabAssemblyCommand>().CountAsync();
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Test" });
        builder.WebHost.UseUrls("http://127.0.0.1:0"); builder.Logging.ClearProviders();
        builder.Services.AddAuthentication("Phase1Browser").AddScheme<AuthenticationSchemeOptions, Phase1Authentication>("Phase1Browser", _ => { });
        builder.Services.AddAuthorization(); builder.Services.AddSingleton(db);
        builder.Services.AddSingleton<IExternalIdentityContext>(new Phase1Identity(scope));
        builder.Services.AddScoped<LabOperationsRequestContext>(); builder.Services.AddScoped<OrderRequestContext>();
        builder.Services.AddScoped<TrialWorkGuard>();
        builder.Services.AddControllers(o => o.Filters.Add<ApiResponseEnvelopeFilter>()).AddApplicationPart(typeof(LabOperationsController).Assembly);
        await using var app = builder.Build(); using var gate = new SemaphoreSlim(1);
        app.Use(async (context, next) => {
            await gate.WaitAsync(context.RequestAborted);
            try { db.ChangeTracker.Clear(); await next(context); }
            finally { db.ChangeTracker.Clear(); gate.Release(); }
        });
        app.UseMiddleware<ApiExceptionMiddleware>(); app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
        app.MapGet("/api/verification/phase1", (HttpContext context) => context.User.FindFirst("phase1-actor")?.Value == "staff"
            ? Results.Json(new { samples, lotNumber = lot.LotNumber, componentLotNumber = componentLot.LotNumber }) : Results.StatusCode(403)).RequireAuthorization();
        app.MapGet("/api/verification/phase1-limited/{workId:guid}/{specimenId:guid}", async (HttpContext context, Guid workId, Guid specimenId) => {
            if (context.User.FindFirst("phase1-actor")?.Value != "staff" || !samples.Any(s => s.workId == workId && s.specimenId == specimenId)) return Results.StatusCode(403);
            var data = await new LabInvestigationService(db).ReadAsync(workId, specimenId, context.RequestAborted, 1);
            return Results.Json(new { success = true, data, error = (object?)null });
        }).RequireAuthorization();
        try
        {
            await app.StartAsync();
            var address = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
            var repo = new DirectoryInfo(AppContext.BaseDirectory);
            while (repo is not null && !Directory.Exists(Path.Combine(repo.FullName, "frontend", "e2e"))) repo = repo.Parent;
            Assert.NotNull(repo);
            var start = new ProcessStartInfo("cmd.exe") { WorkingDirectory = Path.Combine(repo.FullName, "frontend"),
                RedirectStandardOutput = true, RedirectStandardError = true, CreateNoWindow = true };
            start.ArgumentList.Add("/c"); start.ArgumentList.Add("pnpm exec playwright test --config playwright.sample-investigation.config.ts e2e/sample-investigation.phase1-connected.spec.ts --workers=1");
            start.Environment["PSEQ_PHASE1_TEST_API"] = address; start.Environment["NO_COLOR"] = "1"; start.Environment.Remove("FORCE_COLOR");
            using var process = Process.Start(start)!;
            var stdout = process.StandardOutput.ReadToEndAsync(); var stderr = process.StandardError.ReadToEndAsync();
            try { await process.WaitForExitAsync(new CancellationTokenSource(TimeSpan.FromMinutes(12)).Token); }
            catch { if (!process.HasExited) process.Kill(entireProcessTree: true); throw; }
            var output = await stdout + await stderr;
            var logPath = Path.Combine(Environment.GetEnvironmentVariable("PSEQ_SAMPLE_BROWSER_ARTIFACTS") ?? Path.Combine(repo.FullName, ".tmp", "phase1-verification"), "browser.log");
            Directory.CreateDirectory(Path.GetDirectoryName(logPath)!); await File.WriteAllTextAsync(logPath, output);
            Assert.True(process.ExitCode == 0, output);
            Assert.Equal(beforeLot, JsonSerializer.Serialize(await db.LabMaterialLots.AsNoTracking().SingleAsync(l => l.Id == lot.Id)));
            Assert.Equal(beforeUses, JsonSerializer.Serialize(await db.LabMaterialConsumptions.AsNoTracking().Where(u => u.LabMaterialLotId == lot.Id).OrderBy(u => u.Id).ToArrayAsync()));
            Assert.Equal(beforeCommands, await db.Set<LabAssemblyCommand>().CountAsync());
            Assert.All(await db.LabInvestigationReports.AsNoTracking().Where(r => workIds.Contains(r.LabWorkOrderId)).ToArrayAsync(), r => Assert.True(r.HasValidChecksum()));
        }
        finally
        {
            await app.StopAsync(); db.ChangeTracker.Clear();
            await db.LabInvestigationReports.Where(r => workIds.Contains(r.LabWorkOrderId)).ExecuteDeleteAsync();
            await db.LabCustodyEvents.Where(e => e.LabNgsSendoutId == sendout.Id).ExecuteDeleteAsync();
            await db.LabVendorResultsVersions.Where(v => v.LabNgsSendoutId == sendout.Id).ExecuteDeleteAsync();
            await db.LabNgsSendouts.Where(s => s.Id == sendout.Id).ExecuteDeleteAsync();
        }
    }

    private sealed class Phase1Identity(ShippingTestScope scope) : IExternalIdentityContext
    {
        public ExternalIdentity? Read(HttpContext context) => context.User.FindFirst("phase1-actor")?.Value switch
        { "staff" => scope.Phase1StaffIdentity, "customer" => scope.Phase1CustomerIdentity, _ => null };
    }
    private sealed class Phase1Authentication(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var actor = Request.Headers.Authorization.ToString() switch { "Bearer phase1-staff" => "staff", "Bearer phase1-customer" => "customer", _ => null };
            return Task.FromResult(actor is null ? AuthenticateResult.NoResult() : AuthenticateResult.Success(new AuthenticationTicket(
                new ClaimsPrincipal(new ClaimsIdentity([new Claim("phase1-actor", actor)], Scheme.Name)), Scheme.Name)));
        }
    }
    private sealed partial class ShippingTestScope
    {
        public ExternalIdentity Phase1StaffIdentity => platformIdentity;
        public ExternalIdentity Phase1CustomerIdentity => customerIdentity;
    }
}
