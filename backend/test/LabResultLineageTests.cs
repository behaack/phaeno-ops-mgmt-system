namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Features.Accounts.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public sealed class LabResultLineageTests
{
    [Fact]
    public async Task Immediate_enforcement_blocks_preexisting_unlinked_results_without_backfilling()
    {
        var options = new PSeqOrderToCashOptions();
        Assert.True(options.RequireResultTraceability);
        Assert.True(options.RequireScientificEvidence);
        using var db = Context();
        var service = new LabResultLineageService(db);
        var package = Package(); var release = Release();
        await Assert.ThrowsAsync<OrderManagementException>(() => service.RequirePackageAsync(package, default));
        await Assert.ThrowsAsync<OrderManagementException>(() => service.RequireReleaseAsync(release, default));
        Assert.Null(package.LabAnalysisRunId); Assert.False(package.TraceabilityRequired);
        Assert.Null(release.LabAnalysisRunId); Assert.False(release.TraceabilityRequired);
        Assert.Equal(ResultOutputPackageState.Uploading, package.State);
        // Historical read/compatibility fixtures can explicitly use the earlier deployment policy.
        var legacy = new PSeqOrderToCashOptions { RequireResultTraceability = false, RequireScientificEvidence = false };
        await service.RequirePackageAsync(package, default, legacy);
        await service.RequireReleaseAsync(release, default, legacy);
    }

    [Fact]
    public void Historical_entities_remain_readable_without_fabricated_lineage()
    {
        var package = Package();
        ApproveAndRelease(package);
        Assert.Equal(ResultOutputPackageState.Released, package.State);
        Assert.Null(package.LabAnalysisRunId);
        Assert.False(package.TraceabilityRequired);
        var release = Release();
        release.MarkReady(true);
        Assert.True(release.Release(DateTime.UtcNow));
        Assert.False(release.TraceabilityRequired);
    }

    [Fact]
    public void Enabled_results_cannot_be_created_without_the_producing_analysis()
    {
        Assert.Throws<InvalidOperationException>(() => Package(required: true));
        Assert.Throws<InvalidOperationException>(() => Release(required: true));
        Assert.Throws<InvalidOperationException>(() => Release(Guid.NewGuid(), locator: null));
    }

    [Fact]
    public void Voluntary_lineage_pins_requirement_even_when_rollout_is_off()
    {
        var id = Guid.NewGuid();
        var package = Package(id);
        ApproveAndRelease(package);
        var release = Release(id, locator: "*");
        release.MarkReady(false);
        release.Release(DateTime.UtcNow);
        Assert.True(package.TraceabilityRequired);
        Assert.True(release.TraceabilityRequired);
        Assert.Equal(id, release.LabAnalysisRunId);
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData("00000000-0000-0000-0000-000000000000", false)]
    public async Task Missing_required_or_empty_run_fails_before_any_database_access(string? id, bool required)
    {
        await using var db = Context();
        var service = new LabResultLineageService(db);
        var error = await Assert.ThrowsAsync<OrderManagementException>(() => service.RequireResultAsync(id is null ? null : Guid.Parse(id),
            required, Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None));
        Assert.Equal("result_lineage_invalid", error.ErrorCode);
    }

    [Fact]
    public async Task Default_off_optional_lineage_does_not_query_or_require_laboratory_data()
    {
        await using var db = Context();
        Assert.Null(await new LabResultLineageService(db).RequireResultAsync(null, false,
            Guid.NewGuid(), null, Guid.NewGuid(), CancellationToken.None));
    }

    [Fact]
    public void Corrections_require_both_a_predecessor_and_reason_and_retain_original_identity()
    {
        var first = Output();
        var corrected = Output(previous: first.Id, reason: "Correct provider file reference");
        Assert.Equal(first.Id, corrected.CorrectsOutputId);
        Assert.NotEqual(first.ExternalIdentitySha256, corrected.ExternalIdentitySha256);
        Assert.Null(first.CorrectsOutputId);
        Assert.Throws<ArgumentException>(() => Output(previous: first.Id));
        Assert.Throws<ArgumentException>(() => Output(reason: "Unlinked correction"));
        Assert.Throws<ArgumentException>(() => Output(sha: "not-a-checksum"));
        Assert.Throws<ArgumentException>(() => new LabAnalysisRun(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            "test", "run", first.Id, null, new string('A', 64), null, "pipeline:test", DateTime.UtcNow));
    }

    [Fact]
    public void Input_sets_cannot_be_extended_and_saved_evidence_cannot_be_deleted()
    {
        using var db = Context();
        db.LabAnalysisInputs.Add(new LabAnalysisInput(Guid.NewGuid(), Guid.NewGuid()));
        Assert.Throws<InvalidOperationException>(() => db.SaveChanges());
        db.ChangeTracker.Clear();
        var output = Output();
        db.Attach(output);
        db.Remove(output);
        Assert.Throws<InvalidOperationException>(() => db.SaveChanges());
        db.ChangeTracker.Clear();
        var use = new LabEquipmentUsage(Guid.NewGuid(), Guid.NewGuid(), DateTime.UtcNow, Guid.NewGuid(), "run", resourceSnapshotJson: "{\"assetCode\":\"original\"}");
        db.Attach(use);
        db.Entry(use).Property(x => x.ResourceSnapshotJson).CurrentValue = "{}";
        Assert.Throws<InvalidOperationException>(() => db.SaveChanges());
    }

    [Fact]
    public void Corrected_packages_keep_their_predecessor_and_checksummed_reason()
    {
        var original = Package(Guid.NewGuid());
        ResultOutputPackage Correction(string manifest) => new(original.OrganizationId, original.LabServiceOrderId,
            original.LabWorkOrderId, original.LabSampleId, 2, original.Id, "test", "new-transfer", "new-retry", manifest,
            new string('C', 64), 1, labAnalysisRunId: original.LabAnalysisRunId);
        Assert.Throws<InvalidOperationException>(() => Correction("{}"));
        var corrected = Correction("{\"correctionReason\":\"Correct report attribution\"}");
        Assert.Equal(original.Id, corrected.CorrectsPackageId);
        Assert.Contains("Correct report attribution", corrected.ManifestJson);
    }

    [Fact]
    public void Persisted_links_are_restrictive_and_result_bindings_cannot_be_reassigned()
    {
        using var db = Context();
        foreach (var type in new[] { typeof(LabSequencingOutput), typeof(LabAnalysisRun), typeof(LabAnalysisInput) })
        {
            var entity = db.Model.FindEntityType(type)!;
            Assert.All(entity.GetForeignKeys(), fk => Assert.Equal(DeleteBehavior.Restrict, fk.DeleteBehavior));
            Assert.All(entity.GetProperties(), p => Assert.Equal(PropertySaveBehavior.Throw, p.GetAfterSaveBehavior()));
        }
        foreach (var type in new[] { typeof(ResultOutputPackage), typeof(LabResultRelease) })
        {
            var entity = db.Model.FindEntityType(type)!;
            Assert.True(entity.FindProperty("LabAnalysisRunId")!.IsNullable);
            Assert.Equal(PropertySaveBehavior.Throw, entity.FindProperty("LabAnalysisRunId")!.GetAfterSaveBehavior());
            Assert.Equal(PropertySaveBehavior.Throw, entity.FindProperty("TraceabilityRequired")!.GetAfterSaveBehavior());
        }
    }

    private static PSeqOperationsDbContext Context() => new(new DbContextOptionsBuilder<PSeqOperationsDbContext>()
        .UseNpgsql("Host=127.0.0.1;Port=1;Database=not_accessed;Username=test").Options, Options.Create(new PersistenceOptions()));
    private static ResultOutputPackage Package(Guid? run = null, bool required = false) => new(Guid.NewGuid(), Guid.NewGuid(),
        Guid.NewGuid(), Guid.NewGuid(), 1, null, "test", "transfer", "retry", "{}", new string('A', 64), 1,
        labAnalysisRunId: run, traceabilityRequired: required);
    private static LabResultRelease Release(Guid? run = null, bool required = false, string? locator = null) => new(Guid.NewGuid(),
        Guid.NewGuid(), Guid.NewGuid(), 1, "profile", "pipeline", "provenance", "pass", "{}", DateTime.UtcNow, run, required, locator);
    private static void ApproveAndRelease(ResultOutputPackage package)
    {
        package.BeginScanning(); package.MarkReadyForReview(1, true, true);
        var approvalId = Guid.NewGuid(); var actor = Guid.NewGuid();
        package.RecordScientificApproval(approvalId, actor, DateTime.UtcNow);
        package.MarkReadyForRelease(approvalId); package.Release(actor, DateTime.UtcNow);
    }
    private static LabSequencingOutput Output(Guid? previous = null, string? reason = null, string? sha = null) => new(Guid.NewGuid(),
        Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "provider", "actual-run",
        "sample:01/index:ATCG", "file-version:01", sha ?? new string('A', 64), 10, previous, reason,
        "{\"sourceBarcode\":\"TUBE-01\"}", new string('B', 64), null, "pipeline:test", DateTime.UtcNow);
}
