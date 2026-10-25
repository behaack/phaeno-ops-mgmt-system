namespace PhaenoPortal.Test;

using System.Diagnostics;
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
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Trials.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Storage;
using PhaenoPortal.App.Middleware;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public partial class SampleShippingPostgresTests
{
    private sealed class Phase2BrowserFactAttribute : FactAttribute
    {
        public Phase2BrowserFactAttribute()
        { if (Environment.GetEnvironmentVariable("PSEQ_PHASE2_BROWSER_VERIFICATION") != "1" || string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION"))) Skip = "Requires the isolated Phase 2 browser/reference database wrapper."; }
    }
    private sealed record Phase2Scene(Guid Id, Guid BatchId, Guid SendoutId, Guid WorkId, Guid[] SpecimenIds,
        Guid MixId, Guid ReagentId, Guid SourceLotId, string SupplierName, string JobReference,
        Guid[] OriginalOutputs, Guid VersionId, string OriginalVersionJson);

    [Phase2BrowserFact]
    public async Task Phase2CaptureBrowserUsesRealControllersAndFrozenEvidence()
    {
        await using var scope = await ShippingTestScope.CreateAsync(); var db = scope.DbContext;
        await using var transaction = await db.Database.BeginTransactionAsync();
        var commandsBefore = await db.Set<LabAssemblyCommand>().CountAsync();
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Test" });
        builder.WebHost.UseUrls("http://127.0.0.1:0"); builder.Logging.ClearProviders();
        builder.Services.AddAuthentication("Phase1Browser").AddScheme<AuthenticationSchemeOptions, Phase1Authentication>("Phase1Browser", _ => { });
        builder.Services.AddAuthorization(); builder.Services.AddSingleton(db);
        builder.Services.AddSingleton<IExternalIdentityContext>(new Phase1Identity(scope));
        builder.Services.AddScoped<LabOperationsRequestContext>(); builder.Services.AddScoped<OrderRequestContext>(); builder.Services.AddScoped<TrialWorkGuard>();
        builder.Services.Configure<LabFastqOptions>(_ => { }); builder.Services.Configure<FileScanningOptions>(_ => { });
        builder.Services.AddControllers(o => o.Filters.Add<ApiResponseEnvelopeFilter>()).AddApplicationPart(typeof(LabOperationsController).Assembly);
        await using var app = builder.Build(); using var gate = new SemaphoreSlim(1);
        app.Use(async (context, next) => { await gate.WaitAsync(context.RequestAborted); try { db.ChangeTracker.Clear(); await next(context); } finally { db.ChangeTracker.Clear(); gate.Release(); } });
        app.UseMiddleware<ApiExceptionMiddleware>(); app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
        var scenes = new Dictionary<Guid, Phase2Scene>(); var packages = new Dictionary<Guid, Guid>();
        bool Staff(HttpContext c) => c.User.FindFirst("phase1-actor")?.Value == "staff";
        app.MapPost("/api/verification/phase2/scenes", async (HttpContext c) => {
            if (!Staff(c)) return Results.StatusCode(403);
            try { var scene = await SeedPhase2SceneAsync(scope); scenes.Add(scene.Id, scene); return Results.Json(scene); }
            catch (Exception ex) { return Results.Problem(ex.ToString()); }
        }).RequireAuthorization();
        app.MapPost("/api/verification/phase2/{id:guid}/touch", async (HttpContext c, Guid id) => {
            if (!Staff(c) || !scenes.TryGetValue(id, out var scene)) return Results.StatusCode(403);
            var sendout = await db.LabNgsSendouts.SingleAsync(s => s.Id == scene.SendoutId); db.Entry(sendout).Property(s => s.UpdatedAt).IsModified = true; await db.SaveChangesAsync(); return Results.Ok();
        }).RequireAuthorization();
        app.MapPost("/api/verification/phase2/{id:guid}/protect", async (HttpContext c, Guid id) => {
            if (!Staff(c) || !scenes.TryGetValue(id, out var scene)) return Results.StatusCode(403);
            try {
            var first = await db.LabSequencingOutputs.SingleAsync(o => o.Id == scene.OriginalOutputs[0]);
            var analysis = await new LabResultLineageService(db).RegisterAnalysisAsync(new(Guid.NewGuid(), scene.WorkId, first.LabSpecimenId, "TEST ONLY", "TEST completed analysis " + id.ToString("N"), [first.Id]), scope.PlatformUser.Id, "TEST ONLY browser fixture", default);
            var work = await db.LabWorkOrders.SingleAsync(w => w.Id == scene.WorkId); var sample = await db.LabSpecimens.SingleAsync(s => s.Id == first.LabSpecimenId);
            var package = new ResultOutputPackage(scope.CustomerOrganization.Id, work.AuthorizationSourceId, work.Id, sample.SubmittedSpecimenId, 1, null,
                "TEST ONLY", "TEST transfer " + id.ToString("N"), "phase2-" + scene.Id.ToString("N"), "{}", new string('A', 64), 1, labAnalysisRunId: analysis.Id);
            package.BeginScanning(); package.MarkReadyForReview(1, true, true); package.RecordScientificApproval(Guid.NewGuid(), scope.CustomerUser.Id, DateTime.UtcNow); package.MarkReadyForRelease(package.ScientificApprovalId!.Value); package.Release(scope.PlatformUser.Id, DateTime.UtcNow);
            db.ResultOutputPackages.Add(package); await db.SaveChangesAsync(); packages[id] = package.Id; return Results.Ok();
            } catch (Exception ex) { return Results.Problem(ex.ToString()); }
        }).RequireAuthorization();
        app.MapPost("/api/verification/phase2/{id:guid}/withdraw", async (HttpContext c, Guid id) => {
            if (!Staff(c) || !packages.TryGetValue(id, out var packageId)) return Results.StatusCode(403);
            var package = await db.ResultOutputPackages.SingleAsync(p => p.Id == packageId); package.Withdraw(scope.PlatformUser.Id, DateTime.UtcNow, "TEST ONLY acceptance withdrawal"); await db.SaveChangesAsync(); return Results.Ok();
        }).RequireAuthorization();
        try {
            await app.StartAsync();
            var repo = new DirectoryInfo(AppContext.BaseDirectory); while (repo is not null && !Directory.Exists(Path.Combine(repo.FullName, "frontend", "e2e"))) repo = repo.Parent; Assert.NotNull(repo);
            var start = new ProcessStartInfo("cmd.exe") { WorkingDirectory = Path.Combine(repo.FullName, "frontend"), RedirectStandardOutput = true, RedirectStandardError = true, CreateNoWindow = true };
            start.ArgumentList.Add("/c"); start.ArgumentList.Add("pnpm exec playwright test --config playwright.sample-capture-phase2.config.ts --workers=1"
                + (Environment.GetEnvironmentVariable("PSEQ_PHASE2_BROWSER_SMOKE") == "1" ? " --project chromium -g light" : ""));
            start.Environment["PSEQ_PHASE2_TEST_API"] = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single(); start.Environment.Remove("FORCE_COLOR");
            using var process = Process.Start(start)!; var stdout = process.StandardOutput.ReadToEndAsync(); var stderr = process.StandardError.ReadToEndAsync();
            using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(12));
            try { await process.WaitForExitAsync(timeout.Token); } catch { if (!process.HasExited) process.Kill(entireProcessTree: true); throw; }
            var log = await stdout + await stderr; var path = Path.Combine(Environment.GetEnvironmentVariable("PSEQ_SAMPLE_BROWSER_ARTIFACTS") ?? Path.Combine(repo.FullName, ".tmp", "phase2-verification"), "browser.log"); Directory.CreateDirectory(Path.GetDirectoryName(path)!); await File.WriteAllTextAsync(path, log);
            Assert.True(process.ExitCode == 0, log); db.ChangeTracker.Clear();
            foreach (var scene in scenes.Values) {
                Assert.Equal(scene.OriginalVersionJson, (await db.LabVendorResultsVersions.AsNoTracking().SingleAsync(v => v.Id == scene.VersionId)).SnapshotJson);
                Assert.Equal(14, (await db.LabMaterialLots.AsNoTracking().SingleAsync(l => l.Id == scene.SourceLotId)).AvailableQuantity);
            }
            Assert.Equal(commandsBefore, await db.Set<LabAssemblyCommand>().CountAsync());
        } finally { await app.StopAsync(); await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    private static async Task<Phase2Scene> SeedPhase2SceneAsync(ShippingTestScope scope)
    {
        var db = scope.DbContext; var id = Guid.NewGuid(); var key = id.ToString("N"); var actor = scope.PlatformUser.Id;
        var now = LabEvidenceTime.UtcNow; var past = DateTime.UtcNow.Date.AddDays(-1).AddHours(8); var api = scope.CreatePreparationController(db);
        var order = new LabServiceOrder(scope.CustomerOrganization.Id, scope.CustomerOrganization.Departments.Single(d => d.IsDefault).Id, "P2-" + key, "TEST ONLY Phase 2 " + key, null, 2, false, "TEST source", "Frozen", "TEST safe", "TEST instructions");
        var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, order.Id, order.OrganizationId, "p2-" + key, 1, "test", null);
        work.RecordMilestone(LabWorkOrderStatus.Received); work.RecordMilestone(LabWorkOrderStatus.Processing); work.RecordMilestone(LabWorkOrderStatus.DataProcessing);
        var protocol = new LabProtocol("p2-" + key, "TEST ONLY preparation", null); var pv = new LabProtocolVersion(protocol.Id, 1, LabProtocolTestData.Definition(), actor, past); pv.Approve(scope.CustomerUser.Id, past);
        var workflow = new LabServiceWorkflow("p2-" + key, "TEST ONLY preparation", null); var wv = new LabServiceWorkflowVersion(workflow.Id, 1, actor, past); wv.Approve(scope.CustomerUser.Id, past);
        var stage = new LabServiceWorkflowStage(wv.Id, 1, "Prepare", pv.Id, LabServiceWorkflowStageRequirement.Required, null, null);
        var batch = new LabOperationalBatch("P2-" + key, "TEST ONLY Phase 2", null); batch.Start(past.AddMinutes(1));
        db.AddRange(order, work, protocol, pv, workflow, wv, stage, batch); await db.SaveChangesAsync();
        var specimens = new List<LabSpecimen>(); var libraries = new List<LabLibrary>(); var members = new List<LabBatchMember>();
        for (var i = 0; i < 2; i++) {
            var sample = new LabSample(order.Id, "TEST-P2-" + i, "RNA", "TEST source", 1, "uL", "Frozen", "TEST safe", null, null, null, "[]"); order.Samples.Add(sample);
            var specimen = new LabSpecimen(work.Id, sample.Id); specimen.RecordReceipt(past, "TEST ONLY", "TEST freezer"); specimen.AssignAccession("P2-" + key + "-" + i); work.Specimens.Add(specimen);
            var source = new LabContainer(work.Id, specimen.Id, null, LabContainerKind.SubmittedSpecimen, "P2-SOURCE-" + key + i, "TEST tube", "TEST freezer", 1, "uL", null); source.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, actor, past);
            var attempt = new LabSpecimenAttempt(work.Id, specimen.Id, source.Id, wv.Id, 1, null); attempt.Start(source.Barcode, source.Barcode, past);
            var output = new LabContainer(work.Id, specimen.Id, source.Id, LabContainerKind.Library, "P2-LIB-" + key + i, "TEST library", "TEST freezer", 1, "uL", null); output.AttachAttempt(attempt);
            var execution = new LabProtocolExecution(work.Id, specimen.Id, pv.Id, actor, stage.Id); execution.AttachAttempt(attempt); execution.Start(past);
            execution.RecordStep(pv, LabProtocolTestData.Input() with { Performance = new("now", true) }, actor, new HashSet<LabRole> { LabRole.Operator }, past); execution.Complete(pv, null, past);
            var library = new LabLibrary(work.Id, specimen.Id, source.Id, output.Id, execution.Id, "P2-LIB-" + key + i); library.RecordQc(true, "{}");
            var member = new LabBatchMember(batch.Id, work.Id, library.Id, past);
            db.AddRange(sample, specimen, source, attempt, output, execution, library, member); await db.SaveChangesAsync(); attempt.Refresh(false, true, actor, past); await db.SaveChangesAsync();
            specimens.Add(specimen); libraries.Add(library); members.Add(member);
        }
        var sendout = new LabNgsSendout(batch.Id, "TEST ONLY vendor", "TEST-JOB-" + key, JsonSerializer.Serialize(new { members = libraries.Select((l, i) => new { libraryId = l.Id, libraryKey = l.LibraryKey, memberId = members[i].Id, containerBarcode = "P2-LIB-" + key + i }) }), null);
        sendout.SetStatus(LabNgsSendoutStatus.Shipped, past); sendout.SetStatus(LabNgsSendoutStatus.ReceivedByProvider, past); db.LabNgsSendouts.Add(sendout); await db.SaveChangesAsync();
        var draft = new LabVendorResultsDraft(Guid.NewGuid(), sendout.Id, actor, sendout.Version, now, 24); db.Add(draft); await db.SaveChangesAsync(); var sets = new List<Guid>();
        for (var i = 0; i < 2; i++) {
            // Already-verified synthetic file receipts; real upload/byte/scanner paths are covered by the FASTQ regression.
            var set = new LabFastqSet(Guid.NewGuid(), draft.Id, members[i].Id, work.Id, specimens[i].Id, libraries[i].Id, 1, "NewPreparation", "SingleEnd", 1, JsonSerializer.Serialize(new LabFastqOptions(), JsonSerializerOptions.Web), actor, now);
            var file = new LabScientificFile(work.Id, specimens[i].Id, "TEST-P2.fastq", "TEST-ONLY/p2/" + key + i, new string('A', 64), 24, actor, now);
            var upload = new LabFastqUpload(Guid.NewGuid(), set.Id, file.FileName, file.FileName, 1, 1, 1, "TEST lane", 24, new string('B', 64), actor, now.AddHours(24)); upload.Complete(file.Id, 1, new string('C', 64));
            db.AddRange(set, file, upload); sets.Add(set.Id);
        }
        await db.SaveChangesAsync();
        var captures = sets.Select((set, i) => new VendorSequencingRunCapture(set, 1, "TEST-RUN-" + (i == 0 ? "A" : "B"), new(1, Instrument: "TEST instrument " + i, Flowcell: "TEST flowcell " + i, Lane: "1", IndexMapping: "TEST-INDEX-" + i,
            RunStartedAtUtc: past.AddHours(1).AddTicks(1234560), RunCompletedAtUtc: past.AddHours(2).AddTicks(6543210), Software: [new("TEST demultiplexer", "1.0")], Documents: [new("vendor-run", "vendor:TEST-EVIDENCE-" + i, new string('D', 64), 100)]))).ToArray();
        await api.RecordVendorResults(sendout.Id, new(draft.Id, sendout.Version, sendout.ProviderReference!, false, past.AddHours(1), past.AddHours(3), past.AddHours(4), "Success", [], sets, "TEST ONLY first receipt", draft.Id, draft.Version, true, captures), default);
        var originalVersion = await db.LabVendorResultsVersions.AsNoTracking().SingleAsync(v => v.Id == draft.Id);
        var outputs = new List<Guid>(); foreach (var specimen in specimens) outputs.Add((await db.LabSequencingOutputs.AsNoTracking().SingleAsync(o => o.LabSpecimenId == specimen.Id)).Id);

        var definition = new LabMaterialDefinition("p2-source-" + key, "TEST source reagent", LabMaterialLotKind.SupplierLot);
        var supplier = new LabSupplier("TEST original supplier " + key); var storage = new LabStorageLocation("TEST original storage " + key);
        var product = new LabSupplierProduct(supplier.Id, "TEST-PRODUCT", "TEST original product", LabProductType.ReagentId); product.SetDefaultQuantityUnit("uL");
        var lot = new LabMaterialLot(LabMaterialLotKind.SupplierLot, definition.Id, "P2-LOT-" + key, supplier.Id, DateOnly.FromDateTime(now).AddDays(30), storage.Id, 20, "uL"); lot.AssignProduct(product.Id, supplier.Id);
        lot.RecordQc(LabQcDisposition.Passed, DateOnly.FromDateTime(now), null, "{\"capture\":1}", actor, now);
        var mixStep = new LabProtocolStepDefinition { Key = "mix", Name = "TEST combine", Instructions = "TEST ONLY", ProcessType = "masterMix", Required = true, Repeatable = false, OperatorConfirmation = true,
            InputMaterials = [], PreparedOutputs = [], EquipmentTypes = [], Captures = [new() { Key = "source", Label = "Source", Type = "material", Required = true, Scope = "batch", IncludeTracking = true, QuantityBasis = "total", PlannedQuantityText = "4", Unit = "uL", Material = new("Source", ProductId: product.Id, SupplierId: supplier.Id, ProductNumber: product.ProductNumber) }] };
        var mw = new LabMasterMixWorkflow("TEST ONLY mix " + key, "uL", [mixStep], actor); mw.Approve(scope.CustomerUser.Id, now); var mix = new LabMasterMixPreparation(mw, actor, now, Guid.NewGuid());
        var outputDefinition = new LabMaterialDefinition("p2-reagent-" + key, "TEST manufactured reagent", LabMaterialLotKind.PreparedReagent); outputDefinition.SetPreparedReagentUnit("uL");
        var rw = new LabReagentWorkflow("TEST ONLY reagent " + key, outputDefinition.Id, [new("mix", "Mix", "TEST ONLY combine")], actor); rw.Approve(scope.CustomerUser.Id, now);
        var outputLot = new LabMaterialLot(LabMaterialLotKind.PreparedReagent, outputDefinition.Id, "P2-OUTPUT-" + key, null, null, storage.Id, 0, "uL"); var run = new LabReagentManufacturingRun(rw, outputLot.Id, actor, now);
        db.AddRange(definition, supplier, storage, product, lot, mw, mix, outputDefinition, rw, outputLot, run); await db.SaveChangesAsync();
        for (var occurrence = 1; occurrence <= 2; occurrence++) {
            await api.RecordMasterMixIngredient(mix.Id, new(Guid.NewGuid(), lot.Id, occurrence, "uL", false, mix.Version, 0, "source"), default);
            await api.RecordReagentMaterialUse(run.Id, new(lot.Id, 1, "uL", false, run.Version), default);
            lot.RecordQc(LabQcDisposition.Passed, DateOnly.FromDateTime(now), null, "{\"capture\":2}", actor, now); await db.SaveChangesAsync();
        }
        var legacy = new LabMasterMixIngredientUse(Guid.NewGuid(), mix.Id, lot.Id, 1, "uL", false, actor, now, 0, "source", "{}"); db.Add(legacy); db.Entry(legacy).Property(u => u.ResourceSnapshotJson).CurrentValue = null;
        lot.Consume(1, false, legacy.Id, actor, now); mix.RecordIngredientUse(now); await db.SaveChangesAsync();
        await api.AbandonReagentRun(run.Id, new("TEST ONLY completed browser fixture capture", run.Version), default);
        supplier.Rename("TEST changed supplier " + key); product.Update("TEST-CHANGED", "TEST changed catalog", LabProductType.ReagentId, true); storage.Rename("TEST changed storage " + key);
        lot.RecordQc(LabQcDisposition.Failed, DateOnly.FromDateTime(now), "TEST ONLY later QC failure", "{}", actor, now); await db.SaveChangesAsync();
        return new(id, batch.Id, sendout.Id, work.Id, specimens.Select(s => s.Id).ToArray(), mix.Id, run.Id, lot.Id, "TEST original supplier " + key, sendout.ProviderReference!, outputs.ToArray(), originalVersion.Id, originalVersion.SnapshotJson);
    }
}
