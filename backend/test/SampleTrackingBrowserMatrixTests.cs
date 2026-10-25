namespace PhaenoPortal.Test;

using System.Text.Json;
using Npgsql;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class SampleTrackingBrowserMatrixTests
{
    private sealed class BrowserMatrixFactAttribute : FactAttribute
    {
        public BrowserMatrixFactAttribute()
        { if (Environment.GetEnvironmentVariable("PSEQ_SAMPLE_BROWSER_MATRIX") != "1") Skip = "Use the guarded full sample-tracking browser runner."; }
    }

    [BrowserMatrixFact]
    public async Task FullSampleTrackingBrowserMatrixUsesOwnedDatabasesAndPreservesDevelopment()
    {
        var root = Environment.GetEnvironmentVariable("PSEQ_SAMPLE_MATRIX_ARTIFACTS") ?? throw new InvalidOperationException("Prepare matrix artifacts.");
        Assert.True(Directory.Exists(root));
        var reference = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION"));
        Assert.Contains(reference.Host, new[] { "localhost", "127.0.0.1", "::1" });
        var phases = (Environment.GetEnvironmentVariable("PSEQ_SAMPLE_MATRIX_PHASES") ?? "phase1,phase2,phase3,phase4").Split(',');
        Assert.NotEmpty(phases); Assert.Equal(phases.Length, phases.Distinct().Count());
        Assert.All(phases, p => Assert.Contains(p, new[] { "phase1", "phase2", "phase3", "phase4" }));
        var keys = new[] { "PSEQ_OPERATIONS_REFERENCE_CONNECTION", "ConnectionStrings__DefaultConnection", "PSEQ_PHASE4_ARTIFACTS", "PSEQ_SAMPLE_BROWSER_ARTIFACTS",
            "PSEQ_PHASE1_BROWSER_VERIFICATION", "PSEQ_PHASE2_BROWSER_VERIFICATION", "PSEQ_PHASE3_BROWSER_VERIFICATION", "PSEQ_PHASE3_BROWSER_SMOKE",
            "PSEQ_PHASE4_VALIDATION", "PSEQ_PHASE4_STAGE", "PSEQ_PHASE4_BROWSER_VERIFICATION", "PSEQ_RECOVERY_EXPORT_DIR" };
        var previous = keys.ToDictionary(k => k, Environment.GetEnvironmentVariable);
        var outcomes = new List<object>(); var errors = new List<Exception>();
        var before = await SampleTrackingPhase4Support.FingerprintTables(reference);
        await Save("development-before.json", before);
        try
        {
            foreach (var phase in phases)
            {
                var phaseRoot = Path.Combine(root, phase); Directory.CreateDirectory(phaseRoot);
                try
                {
                    Environment.SetEnvironmentVariable("PSEQ_PHASE4_ARTIFACTS", phaseRoot);
                    Environment.SetEnvironmentVariable("PSEQ_SAMPLE_BROWSER_ARTIFACTS", phaseRoot);
                    Environment.SetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION", reference.ConnectionString);
                    Environment.SetEnvironmentVariable("PSEQ_PHASE1_BROWSER_VERIFICATION", phase == "phase1" ? "1" : null);
                    Environment.SetEnvironmentVariable("PSEQ_PHASE2_BROWSER_VERIFICATION", phase == "phase2" ? "1" : null);
                    Environment.SetEnvironmentVariable("PSEQ_PHASE3_BROWSER_VERIFICATION", phase == "phase3" ? "1" : null);
                    Environment.SetEnvironmentVariable("PSEQ_PHASE3_BROWSER_SMOKE", null);
                    Environment.SetEnvironmentVariable("PSEQ_PHASE4_VALIDATION", "1");
                    Environment.SetEnvironmentVariable("PSEQ_PHASE4_STAGE", "run");
                    Environment.SetEnvironmentVariable("PSEQ_PHASE4_BROWSER_VERIFICATION", phase == "phase4" ? "1" : null);
                    Environment.SetEnvironmentVariable("PSEQ_RECOVERY_EXPORT_DIR", null);
                    if (phase == "phase4")
                    {
                        await new LabOperationsCommercialHandoffPostgresTests().Phase4ConnectedJourneySurvivesIndependentRestoreAndRecoveryFailures();
                        // This related acceptance uses real MVC/Trial guards; it is API evidence,
                        // distinct from the four restored-data browser scenarios.
                        await new TrialProjectPostgresTests().ClosedTrialPhysicalCustodyUsesRealMvcGuardAndActualHistoryTimes();
                    }
                    else
                    {
                        await using var owned = await SampleTrackingReviewDatabase.CreateAsync(phase + "-browser");
                        Environment.SetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION", owned.ConnectionString);
                        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", owned.ConnectionString);
                        var test = new SampleShippingPostgresTests();
                        if (phase == "phase1") await test.PreparationMixedTrayEnforcesReservationsEvidenceFailureAndQcHandoff();
                        else if (phase == "phase2") await test.Phase2CaptureBrowserUsesRealControllersAndFrozenEvidence();
                        else await test.Phase3LifecycleBrowserUsesRealControllers();
                    }
                    outcomes.Add(new { phase, result = "passed" });
                }
                catch (Exception error) { outcomes.Add(new { phase, result = "failed", errorType = error.GetType().Name }); errors.Add(error); }
                finally
                {
                    foreach (var key in keys) Environment.SetEnvironmentVariable(key, previous[key]);
                    await Save("matrix.json", new { outcomes, scope = "Connected local synthetic Chromium desktop/phone, light/dark; no hosted workers or DPS." });
                }
            }
        }
        finally
        {
            foreach (var key in keys) Environment.SetEnvironmentVariable(key, previous[key]);
            var after = await SampleTrackingPhase4Support.FingerprintTables(reference); await Save("development-after.json", after);
            Assert.Equal(before, after);
        }
        if (errors.Count > 0) throw new AggregateException("Browser matrix failed; inspect each phase's retained result and cleanup receipts.", errors);
        Task Save(string name, object value) => File.WriteAllTextAsync(Path.Combine(root, name), JsonSerializer.Serialize(value, new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true }));
    }
}
