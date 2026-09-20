namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ManagedFilesRequireExactSampleAndMetadataAndSurviveCustomerRetention()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var storage = RestoreFiles(Path.Combine(Path.GetTempPath(), "phaeno-managed-files-" + Guid.NewGuid(), "files"));
            var fixture = await SeedRestoreEvidence(scope, storage);
            var db = scope.DbContext;
            var file = new LabScientificFile(fixture.WorkId, fixture.SpecimenId, "reads.fastq.gz", "test-private-key",
                new string('a', 64), 123, scope.PlatformUser.Id, DateTime.UtcNow);
            db.Add(file); await db.SaveChangesAsync();
            var reference = LabScientificFiles.Prefix + file.Id;
            await LabScientificFiles.ValidateAsync(db, fixture.WorkId, fixture.SpecimenId, reference, new string('a', 64), 123, default);
            foreach (var input in new[] {
                (Guid.NewGuid(), fixture.SpecimenId, new string('a', 64), 123L),
                (fixture.WorkId, Guid.NewGuid(), new string('a', 64), 123L),
                (fixture.WorkId, fixture.SpecimenId, new string('b', 64), 123L),
                (fixture.WorkId, fixture.SpecimenId, new string('a', 64), 124L) })
                await Assert.ThrowsAsync<OrderManagementException>(() => LabScientificFiles.ValidateAsync(db, input.Item1, input.Item2, reference, input.Item3, input.Item4, default));
            await Assert.ThrowsAsync<OrderManagementException>(() => LabScientificFiles.ValidateDocumentsAsync(db, fixture.WorkId, Guid.NewGuid(),
                new LabScientificEvidence(1, Documents: [new("qc", reference, file.Sha256, file.SizeBytes)]), default));
            // Provider declarations remain compatible but never acquire managed custody status.
            await LabScientificFiles.ValidateAsync(db, fixture.WorkId, fixture.SpecimenId, "provider:old-file", new string('a', 64), 123, default);
            await Assert.ThrowsAsync<OrderManagementException>(() => new InvestigationPreservingFileStorage(storage, db).DeleteIfExistsAsync(file.StorageKey, default));
            Assert.DoesNotContain("test-private-key", JsonSerializer.Serialize(LabScientificFiles.Public(file)));
            db.Remove(file);
            await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
            db.Entry(file).State = EntityState.Unchanged;
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }
}
