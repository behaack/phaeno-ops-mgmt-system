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
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Trials.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Middleware;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    private sealed class Phase3BrowserFactAttribute : FactAttribute
    {
        public Phase3BrowserFactAttribute()
        { if (Environment.GetEnvironmentVariable("PSEQ_PHASE3_BROWSER_VERIFICATION") != "1" || string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION"))) Skip = "Requires the isolated Phase 3 browser wrapper."; }
    }
    private sealed record Phase3Scene(Guid Id, Guid WorkId, Guid[] SpecimenIds, Guid[] TubeIds, string[] Barcodes,
        Guid PrepId, Guid[] ExecutionIds, Guid ReviewerId, Guid MixId, string BoxBarcode, Guid EquipmentId, string EquipmentAssetCode, long EquipmentVersion);

    [Phase3BrowserFact]
    public async Task Phase3LifecycleBrowserUsesRealControllers()
    {
        await using var scope = await ShippingTestScope.CreateAsync(); var db = scope.DbContext;
        await using var transaction = await db.Database.BeginTransactionAsync();
        db.AddRange(new OrganizationMembership(scope.OtherCustomerUser.Id, scope.PlatformOrganization.Id, false),
            new LabRoleAssignment(scope.OtherCustomerUser.Id, LabRole.Supervisor)); await db.SaveChangesAsync();
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Test" });
        builder.WebHost.UseUrls("http://127.0.0.1:0"); builder.Logging.ClearProviders();
        builder.Services.AddAuthentication("Phase3").AddScheme<AuthenticationSchemeOptions, Phase3Authentication>("Phase3", _ => { });
        builder.Services.AddAuthorization(); builder.Services.AddSingleton(db);
        builder.Services.AddSingleton<IExternalIdentityContext>(new Phase3Identity(scope));
        builder.Services.AddScoped<LabOperationsRequestContext>(); builder.Services.AddScoped<OrderRequestContext>(); builder.Services.AddScoped<TrialWorkGuard>();
        builder.Services.AddControllers(o => o.Filters.Add<ApiResponseEnvelopeFilter>()).AddApplicationPart(typeof(LabOperationsController).Assembly);
        await using var app = builder.Build(); using var gate = new SemaphoreSlim(1);
        app.Use(async (context, next) => { await gate.WaitAsync(context.RequestAborted); try { db.ChangeTracker.Clear(); await next(context); } finally { db.ChangeTracker.Clear(); gate.Release(); } });
        app.UseMiddleware<ApiExceptionMiddleware>(); app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
        app.MapPost("/api/verification/phase3/scenes", async (HttpContext context) => {
            if (context.User.FindFirst("phase3-actor")?.Value != "staff") return Results.StatusCode(403);
            try { return Results.Json(await SeedPhase3SceneAsync(scope)); } catch (Exception ex) { return Results.Problem(ex.ToString()); }
        }).RequireAuthorization();
        try
        {
            await app.StartAsync();
            var repo = new DirectoryInfo(AppContext.BaseDirectory); while (repo is not null && !Directory.Exists(Path.Combine(repo.FullName, "frontend", "e2e"))) repo = repo.Parent; Assert.NotNull(repo);
            var start = new ProcessStartInfo("cmd.exe") { WorkingDirectory = Path.Combine(repo.FullName, "frontend"), RedirectStandardOutput = true, RedirectStandardError = true, CreateNoWindow = true };
            start.ArgumentList.Add("/c"); start.ArgumentList.Add("pnpm exec playwright test --config playwright.sample-lifecycle-phase3.config.ts --workers=1"
                + (Environment.GetEnvironmentVariable("PSEQ_PHASE3_BROWSER_SMOKE") == "1" ? " --project chromium -g light" : ""));
            start.Environment["PSEQ_PHASE3_TEST_API"] = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single(); start.Environment.Remove("FORCE_COLOR");
            using var process = Process.Start(start)!; var stdout = process.StandardOutput.ReadToEndAsync(); var stderr = process.StandardError.ReadToEndAsync();
            using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(15));
            try { await process.WaitForExitAsync(timeout.Token); } catch { if (!process.HasExited) process.Kill(entireProcessTree: true); throw; }
            var log = await stdout + await stderr; var path = Path.Combine(Environment.GetEnvironmentVariable("PSEQ_SAMPLE_BROWSER_ARTIFACTS") ?? Path.Combine(repo.FullName, ".tmp", "phase3-verification"), "browser.log"); await File.WriteAllTextAsync(path, log);
            Assert.True(process.ExitCode == 0, log);
        }
        finally { await app.StopAsync(); await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    private static async Task<Phase3Scene> SeedPhase3SceneAsync(ShippingTestScope scope)
    {
        var db = scope.DbContext; var id = Guid.NewGuid(); var key = id.ToString("N"); var now = LabEvidenceTime.UtcNow; var actor = scope.PlatformUser.Id;
        var order = scope.AddCommercialPhaseOrder("P3-" + key, 2);
        var protocol = new LabProtocol("p3-" + key, "TEST ONLY timed preparation", null);
        var step = new LabProtocolStepDefinition { Key = "timed", Name = "TEST timed step", Instructions = "TEST ONLY bench timing and participant capture",
            Required = true, Repeatable = true, OperatorConfirmation = true, TimingRequired = true, MinimumParticipants = 2,
            Captures = [], InputMaterials = [], PreparedOutputs = [], EquipmentTypes = [] };
        var supplier = new LabSupplier("P3 TEST supplier " + key); var storage = new LabStorageLocation("P3 TEST storage " + key);
        var material = new LabMaterialDefinition("p3-material-" + key, "P3 TEST reagent", LabMaterialLotKind.SupplierLot);
        var product = new LabSupplierProduct(supplier.Id, "P3-TEST", "P3 TEST product", LabProductType.ReagentId); product.SetDefaultQuantityUnit("uL");
        var lot = new LabMaterialLot(LabMaterialLotKind.SupplierLot, material.Id, "P3-LOT-" + key, supplier.Id, DateOnly.FromDateTime(now).AddDays(30), storage.Id, 20, "uL"); lot.AssignProduct(product.Id, supplier.Id); lot.RecordQc(LabQcDisposition.Passed, DateOnly.FromDateTime(now), null, "{}", actor, now);
        var equipment = new LabEquipment("P3-EQUIPMENT-" + key, "TEST calibration station", "Test", "TEST original equipment bench", DateOnly.FromDateTime(now), DateOnly.FromDateTime(now).AddDays(30));
        var mixStep = step with { Key = "mix", Name = "TEST timed mix", ProcessType = "masterMix", Captures = [new() { Key = "source", Label = "Source", Type = "material", Required = true, Scope = "batch", IncludeTracking = true, QuantityBasis = "total", PlannedQuantityText = "1", Unit = "uL", Material = new("Source", ProductId: product.Id, SupplierId: supplier.Id, ProductNumber: product.ProductNumber) }, new() { Key = "mix-equipment", Label = "Mix equipment", Type = "equipment", Required = true, Scope = "batch" }] };
        var mixWorkflow = new LabMasterMixWorkflow("P3 TEST mix " + key, "uL", [mixStep], actor); mixWorkflow.Approve(scope.CustomerUser.Id, now);
        var mix = new LabMasterMixPreparation(mixWorkflow, actor, now, Guid.NewGuid());
        var useMix = new LabProtocolStepDefinition { Key = "apply-mix", Name = "TEST apply shared mix", Instructions = "TEST ONLY exposure qualification", Required = true, Repeatable = false, OperatorConfirmation = true,
            InputMaterials = [], PreparedOutputs = [], EquipmentTypes = [], Captures = [new() { Key = "mix-used", Label = "Mix used", Type = "material", Required = true, Scope = "batch", QuantityBasis = "total", Unit = "uL",
                Material = new("Mix", MasterMixWorkflowId: mixWorkflow.Id, MasterMixWorkflowRevision: 1) }] };
        var definition = new LabProtocolDefinition { SchemaVersion = 1, PreparationBatchEnabled = true, Steps = [step, useMix] };
        var pv = new LabProtocolVersion(protocol.Id, 1, definition.ToJson(), actor, now); pv.Approve(scope.CustomerUser.Id, now);
        var workflow = new LabServiceWorkflow("p3-" + key, "TEST ONLY timed workflow", null); var wv = new LabServiceWorkflowVersion(workflow.Id, 1, actor, now); wv.Approve(scope.CustomerUser.Id, now);
        var stage = new LabServiceWorkflowStage(wv.Id, 1, "TEST stage", pv.Id, LabServiceWorkflowStageRequirement.Required, null, null);
        var format = new LabTrayFormat(new("TEST ONLY two tubes", 1, 2, "grid", [])); var batch = new LabPreparationBatch("P3-" + key, format, wv.Id); batch.AssignTray("P3-TRAY-" + key, false);
        var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, order.Id, scope.CustomerOrganization.Id, workflow.ServiceKey, 2, "test", null, wv.Id);
        work.SetTubeUsePolicy(LabTubeUsePolicy.RunOneWithFailureFallback, 1); work.RecordMilestone(LabWorkOrderStatus.Received); work.RecordMilestone(LabWorkOrderStatus.Processing);
        db.AddRange(protocol, pv, workflow, wv, stage, format, batch, work);
        var specimens = new List<LabSpecimen>(); var physical = new List<LabContainer>(); var executions = new List<LabProtocolExecution>(); var members = new List<LabPreparationMember>();
        for (var i = 0; i < 2; i++)
        {
            var sample = scope.AddCommercialPhaseSample(order, "P3-SAMPLE-" + i, "TEST source");
            var specimen = new LabSpecimen(work.Id, sample.Id); specimen.RecordReceipt(now, "TEST ONLY", "Bench"); specimen.AssignAccession("P3-ACC-" + key + i); work.Specimens.Add(specimen);
            var source = new LabContainer(work.Id, specimen.Id, null, LabContainerKind.SubmittedSpecimen, "P3-SOURCE-" + key + i, "TEST ONLY", "Bench", 20, "uL", null);
            source.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, actor, now); specimen.RefreshIntakeFromTubes([source], now);
            var tube = new LabContainer(work.Id, specimen.Id, source.Id, LabContainerKind.Other, "P3-PHYSICAL-" + key + i, "TEST ONLY physical tube", "Historical text only", 10 + i, "uL", null);
            var attempt = new LabSpecimenAttempt(work.Id, specimen.Id, source.Id, wv.Id, 1, null); attempt.Start(source.Barcode, source.Barcode, now);
            var execution = new LabProtocolExecution(work.Id, specimen.Id, pv.Id, actor, stage.Id); execution.AttachAttempt(attempt); execution.Start(now);
            var member = new LabPreparationMember(batch.Id, attempt.Id, "A" + (i + 1), source.Barcode);
            db.AddRange(source, tube, attempt, execution, member); specimens.Add(specimen); physical.Add(tube); executions.Add(execution); members.Add(member);
        }
        batch.Start(members, true, now); await db.SaveChangesAsync();
        db.AddRange(supplier, storage, material, product, lot, equipment, mixWorkflow, mix); await db.SaveChangesAsync();
        await scope.CreatePreparationController(db).RecordMasterMixIngredient(mix.Id, new(Guid.NewGuid(), lot.Id, 1, "uL", false, mix.Version, 0, "source"), default);
        return new(id, work.Id, specimens.Select(s => s.Id).ToArray(), physical.Select(t => t.Id).ToArray(), physical.Select(t => t.Barcode).ToArray(), batch.Id, executions.Select(e => e.Id).ToArray(), scope.OtherCustomerUser.Id, mix.Id, "P3-BOX-" + key, equipment.Id, equipment.AssetCode, equipment.Version);
    }

    private sealed class Phase3Identity(ShippingTestScope scope) : IExternalIdentityContext
    {
        public ExternalIdentity? Read(HttpContext context) => context.User.FindFirst("phase3-actor")?.Value switch
        { "staff" => scope.Phase1StaffIdentity, "reviewer" => scope.Phase3ReviewerIdentity, "customer" => scope.Phase1CustomerIdentity, _ => null };
    }
    private sealed class Phase3Authentication(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var actor = Request.Headers.Authorization.ToString() switch { "Bearer phase3-staff" => "staff", "Bearer phase3-reviewer" => "reviewer", "Bearer phase3-customer" => "customer", _ => null };
            return Task.FromResult(actor is null ? AuthenticateResult.NoResult() : AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity([new Claim("phase3-actor", actor)], Scheme.Name)), Scheme.Name)));
        }
    }
    private sealed partial class ShippingTestScope { public ExternalIdentity Phase3ReviewerIdentity => otherCustomerIdentity; }
}
