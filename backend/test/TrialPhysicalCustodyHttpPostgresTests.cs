namespace PhaenoPortal.Test;

using System.Net;
using System.Net.Http.Json;
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
using Npgsql;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Trials.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Middleware;
using PSeq.Operations.Commercial.Trials.Domain;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class TrialProjectPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ClosedTrialPhysicalCustodyUsesRealMvcGuardAndActualHistoryTimes()
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION"));
        Assert.True(settings.Host is "localhost" or "127.0.0.1");
        var referenceDatabase = settings.Database; var name = "pseq_trial_preparation_test_" + Guid.NewGuid().ToString("N");
        var receiptRoot = Environment.GetEnvironmentVariable("PSEQ_PHASE4_ARTIFACTS");
        settings.Database = "postgres"; settings.Pooling = false;
        await using var admin = new NpgsqlConnection(settings.ConnectionString); await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE \"{name}\" TEMPLATE template0", admin)) await create.ExecuteNonQueryAsync();
        try
        {
            if (!string.IsNullOrWhiteSpace(receiptRoot)) await File.WriteAllTextAsync(Path.Combine(receiptRoot, "trial-custody-ownership.json"), JsonSerializer.Serialize(new { database = name, scope = "Generated disposable local Trial fixture" }));
            settings.Database = name; await using var scope = await Fixture.Create(settings.ConnectionString);
            var db = scope.Db; db.Add(new LabRoleAssignment(scope.Scientific.User.Id, LabRole.Supervisor));
            if (!scope.Customer.HasLinkedExternalIdentity()) scope.Customer.LinkExternalIdentity("clerk", "custody-customer-" + scope.Customer.Id);
            await db.SaveChangesAsync();
            var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Test" });
            builder.WebHost.UseUrls("http://127.0.0.1:0"); builder.Logging.ClearProviders();
            builder.Services.AddAuthentication("CustodyReview").AddScheme<AuthenticationSchemeOptions, CustodyReviewAuthentication>("CustodyReview", _ => { });
            builder.Services.AddAuthorization(); builder.Services.AddSingleton(db);
            builder.Services.AddSingleton<IExternalIdentityContext>(new CustodyReviewIdentity(
                new("clerk", scope.Scientific.User.ExternalSubjectId!, scope.Scientific.User.Email, true),
                new("clerk", scope.Customer.ExternalSubjectId!, scope.Customer.Email, true)));
            builder.Services.AddScoped<LabOperationsRequestContext>(); builder.Services.AddScoped<OrderRequestContext>(); builder.Services.AddScoped<TrialWorkGuard>();
            builder.Services.AddControllers(o => o.Filters.Add<ApiResponseEnvelopeFilter>()).AddApplicationPart(typeof(LabOperationsController).Assembly);
            await using var app = builder.Build(); using var gate = new SemaphoreSlim(1);
            app.Use(async (context, next) => { await gate.WaitAsync(context.RequestAborted); try { db.ChangeTracker.Clear(); await next(context); } finally { db.ChangeTracker.Clear(); gate.Release(); } });
            app.UseMiddleware<ApiExceptionMiddleware>(); app.UseAuthentication(); app.UseAuthorization(); app.MapControllers(); await app.StartAsync();
            using var client = new HttpClient { BaseAddress = new Uri(app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single()) };
            client.DefaultRequestHeaders.Authorization = new("Bearer", "custody-staff");
            var cases = new List<object>(); Guid historyWorkId = default; Guid historySpecimenId = default;
            try
            {
                foreach (var returned in new[] { false, true })
                {
                    var trial = await scope.CreateApprovedTrial();
                    if (returned)
                    {
                        var terms = await scope.ScopeRequest(trial);
                        await scope.Workflow.ProposeAsync(trial, scope.Commercial, terms with { MaterialDisposition = TrialMaterialDisposition.Return,
                            ReturnDestination = "TEST approved destination", ReturnHandling = "TEST handling", ReturnShippingPayer = "TEST payer", Reason = "TEST return terms" }, default);
                        await db.SaveChangesAsync();
                    }
                    await scope.Submit(trial, "REVIEW-HTTP-" + returned);
                    var workId = trial.Samples.Single().LabWorkOrderId!.Value; historyWorkId = workId;
                    var specimen = await db.LabSpecimens.SingleAsync(s => s.LabWorkOrderId == workId);
                    var tube = new LabContainer(workId, specimen.Id, null, LabContainerKind.Other, "REVIEW-" + Guid.NewGuid().ToString("N"), "TEST ONLY", "TEST bench", 5, "uL", null);
                    db.Add(tube); await db.SaveChangesAsync();
                    var tubeId = tube.Id; var barcode = tube.Barcode;
                    async Task<JsonElement> Record(string kind, string? destination = null, string? tracking = null, string? expectedError = null, HttpStatusCode expectedStatus = HttpStatusCode.Conflict)
                    {
                        var version = await db.LabContainers.AsNoTracking().Where(c => c.Id == tubeId).Select(c => c.Version).SingleAsync();
                        using var response = await client.PostAsJsonAsync($"/api/platform/lab-operations/containers/{tubeId}/physical",
                            new PhysicalContainerInput(Guid.NewGuid(), version, kind, barcode, "TEST actual custody", Method: "TEST method", Destination: destination, TrackingReference: tracking));
                        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
                        if (expectedError is null) Assert.True(response.IsSuccessStatusCode, body.ToString());
                        else { Assert.Equal(expectedStatus, response.StatusCode); Assert.Equal(expectedError, body.GetProperty("error").GetProperty("code").GetString()); }
                        return body;
                    }
                    await Record("Destroyed", expectedError: "trial_material_terms");
                    // The frozen Trial is closed, but scientific work remains gated by the actual MVC filter.
                    trial = await db.TrialProjects.Include(t => t.Scopes).SingleAsync(t => t.Id == trial.Id);
                    trial.Close(TrialStatus.ClosedIncomplete, "TEST closure", DateTime.UtcNow); await db.SaveChangesAsync();
                    if (!returned) await Record("Destroyed", expectedError: "trial_material_terms");
                    trial = await db.TrialProjects.Include(t => t.Scopes).SingleAsync(t => t.Id == trial.Id);
                    db.Entry(trial).Property(t => t.ResidualRetainUntilUtc).CurrentValue = DateTime.UtcNow.AddMinutes(-1);
                    trial.SetHold(true, "TEST preservation"); await db.SaveChangesAsync();
                    await Record(returned ? "Returned" : "Destroyed", "TEST approved destination", "TEST tracking", "trial_material_terms");
                    await Record("HoldPlaced"); // Preservation records remain possible on a held/closed Trial.
                    var box = new LabStorageBox("CUSTODY-" + Guid.NewGuid().ToString("N"), "TEST room", "TEST freezer", "TEST rack", "TEST shelf");
                    db.Add(box); await db.SaveChangesAsync();
                    var moveVersion = await db.LabContainers.AsNoTracking().Where(c => c.Id == tubeId).Select(c => c.Version).SingleAsync();
                    using (var move = await client.PostAsJsonAsync($"/api/platform/lab-operations/containers/{tubeId}/move",
                        new { version = moveVersion, scannedContainerBarcode = barcode, scannedDestinationBarcode = box.Barcode, confirmed = true }))
                        Assert.True(move.IsSuccessStatusCode, await move.Content.ReadAsStringAsync());
                    var count = await db.LabContainers.CountAsync(c => c.LabWorkOrderId == workId);
                    using (var scientific = await client.PostAsJsonAsync($"/api/platform/lab-operations/work-orders/{workId}/containers",
                        new CreateContainerRequest(null, null, "Other", "TEST blocked new work", "TEST bench", 1, "uL", null)))
                    {
                        var body = await scientific.Content.ReadFromJsonAsync<JsonElement>(); Assert.Equal(HttpStatusCode.Conflict, scientific.StatusCode);
                        Assert.Equal("trial_work_unavailable", body.GetProperty("error").GetProperty("code").GetString());
                    }
                    Assert.Equal(count, await db.LabContainers.CountAsync(c => c.LabWorkOrderId == workId));
                    trial = await db.TrialProjects.Include(t => t.Scopes).SingleAsync(t => t.Id == trial.Id); trial.SetHold(false, "TEST release global hold"); await db.SaveChangesAsync();
                    var held = await Record(returned ? "Returned" : "Destroyed", "TEST approved destination", "TEST tracking", "lab_transition_not_allowed");
                    Assert.Contains("preservation hold", held.ToString()); await Record("HoldReleased");
                    var attempt = new LabSpecimenAttempt(workId, specimen.Id, tubeId, scope.WorkflowVersion.Id, 1, null);
                    db.Add(attempt); await db.SaveChangesAsync();
                    await Record(returned ? "Returned" : "Destroyed", "TEST approved destination", "TEST tracking", "physical_work_active");
                    await db.LabSpecimenAttempts.Where(a => a.Id == attempt.Id).ExecuteDeleteAsync();
                    if (returned)
                    {
                        await Record("Returned", "Wrong destination", "TEST tracking", "trial_material_terms");
                        await Record("Returned", "TEST approved destination", expectedError: "physical_return_tracking_required", expectedStatus: HttpStatusCode.BadRequest);
                    }
                    client.DefaultRequestHeaders.Authorization = new("Bearer", "custody-customer");
                    using (var denied = await client.PostAsJsonAsync($"/api/platform/lab-operations/containers/{tubeId}/physical",
                        new PhysicalContainerInput(Guid.NewGuid(), 0, "HoldPlaced", barcode, "TEST forbidden"))) Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);
                    client.DefaultRequestHeaders.Authorization = new("Bearer", "custody-staff");
                    var result = (await Record(returned ? "Returned" : "Destroyed", returned ? "TEST approved destination" : null, returned ? "TEST tracking" : null)).GetProperty("data");
                    Assert.Equal(returned ? "Returned" : "Disposed", result.GetProperty("status").GetString());
                    Assert.Equal(returned ? 5m : 0m, result.GetProperty("quantity").GetDecimal());
                    Assert.Equal(1, await db.Set<LabPhysicalEvent>().CountAsync(e => e.LabContainerId == tubeId && (e.Kind == "Returned" || e.Kind == "Destroyed")));
                    cases.Add(new { returned, result = "passed", realMvcFilter = true, holdsTermsActiveWorkAndRoleGuardsRetained = true });
                }
                historySpecimenId = await db.LabSpecimens.Where(s => s.LabWorkOrderId == historyWorkId).Select(s => s.Id).SingleAsync();
                await VerifyPhysicalHandlingAndLocations(client, db, historyWorkId, historySpecimenId);
                await VerifyLateHandlingHistory(db, historyWorkId, scope.Scientific.User.Id);
                if (!string.IsNullOrWhiteSpace(receiptRoot))
                    await File.WriteAllTextAsync(Path.Combine(receiptRoot, "trial-custody-http.json"), JsonSerializer.Serialize(new { result = "passed", cases, lateHistoryCases = 4,
                        actualHttpLateHandling = "passed", departedPlacementLocations = "passed", originalReportPreserved = true }, JsonSerializerOptions.Web));
            }
            finally { await app.StopAsync(); }
        }
        finally
        {
            Assert.NotEqual(referenceDatabase, name); Assert.Matches("^pseq_trial_preparation_test_[0-9a-f]{32}$", name);
            await using (var drop = new NpgsqlCommand($"DROP DATABASE \"{name}\" WITH (FORCE)", admin)) await drop.ExecuteNonQueryAsync();
            await using var absent = new NpgsqlCommand("SELECT count(*) FROM pg_database WHERE datname=@name", admin); absent.Parameters.AddWithValue("name", name);
            Assert.Equal(0L, await absent.ExecuteScalarAsync());
            if (!string.IsNullOrWhiteSpace(receiptRoot)) await File.WriteAllTextAsync(Path.Combine(receiptRoot, "trial-custody-cleanup.json"), JsonSerializer.Serialize(new { result = "passed", droppedAndAbsent = name }));
        }
    }

    private static async Task VerifyLateHandlingHistory(PhaenoPortal.App.Infrastructure.Persistence.PSeqOperationsDbContext db, Guid workId, Guid actor)
    {
        // Explicit projection fixtures: actual days and late/out-of-order entry days are independent evidence.
        var day = DateTime.UtcNow.Date.AddDays(-10);
        var box = new LabStorageBox("REVIEW-A-" + Guid.NewGuid().ToString("N"), "TEST room", "TEST freezer", "TEST rack", "TEST shelf");
        var unrelated = new LabStorageBox("REVIEW-B-" + Guid.NewGuid().ToString("N"), "TEST room", "TEST freezer", "TEST rack", "TEST shelf");
        var tubes = Enumerable.Range(0, 4).Select(_ => new LabContainer(workId, null, null, LabContainerKind.Other, "HISTORY-" + Guid.NewGuid().ToString("N"), "TEST ONLY", "TEST", null, null, null)).ToArray();
        db.AddRange(box, unrelated); db.AddRange(tubes); await db.SaveChangesAsync();
        LabPhysicalEvent Event(int tube, string kind, int occurred, int recorded, Guid? boxId = null) => new(Guid.NewGuid(), tubes[tube].Id, kind, actor, day.AddDays(occurred), day.AddDays(recorded), "TEST late handling", "{}", Guid.NewGuid().ToString("N"), boxId);
        var events = new[] { Event(0, "Placed", 1, 1, box.Id), Event(0, "Returned", 2, 6), Event(1, "Placed", 1, 1, box.Id), Event(1, "Destroyed", 2, 5),
            Event(2, "Placed", 1, 4, box.Id), Event(3, "Placed", 1, 7, box.Id), Event(3, "Removed", 2, 2) };
        var moves = new[] { new LabStorageBoxMove(Guid.NewGuid(), box.Id, actor, day.AddDays(3), "TEST move", "{}", "first"),
            new LabStorageBoxMove(Guid.NewGuid(), box.Id, actor, day.AddDays(8), "TEST move", "{}", "second"),
            new LabStorageBoxMove(Guid.NewGuid(), unrelated.Id, actor, day.AddDays(3), "TEST unrelated move", "{}", "other") };
        db.AddRange(events); db.AddRange(moves); await db.SaveChangesAsync();
        for (var i = 0; i < tubes.Length; i++)
        {
            var history = await new LabPhysicalHistory(db).ReadAsync([tubes[i].Id], default);
            Assert.False(history.Limited); Assert.Equal(i == 2 ? moves.Take(2).Select(m => m.Id) : [], history.BoxMoves.Select(m => m.Id));
            Assert.Equal(events.Where(e => e.LabContainerId == tubes[i].Id).OrderBy(e => e.RecordedAtUtc).ThenBy(e => e.Id).Select(e => e.Id), history.Events.Select(e => e.Id));
        }
    }

    private sealed class CustodyReviewIdentity(ExternalIdentity staff, ExternalIdentity customer) : IExternalIdentityContext
    {
        public ExternalIdentity? Read(HttpContext context) => context.User.FindFirst("custody-actor")?.Value == "staff" ? staff : customer;
    }
    private sealed class CustodyReviewAuthentication(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var actor = Request.Headers.Authorization.ToString() switch { "Bearer custody-staff" => "staff", "Bearer custody-customer" => "customer", _ => null };
            return Task.FromResult(actor is null ? AuthenticateResult.NoResult() : AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity([new Claim("custody-actor", actor)], Scheme.Name)), Scheme.Name)));
        }
    }
}
