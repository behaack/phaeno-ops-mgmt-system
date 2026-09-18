namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task CompletionForecastUsesSlowestSampleAndPreviewDoesNotReplacePinnedPolicyOrWriteSnapshots()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext;
        await using (var transaction = await db.Database.BeginTransactionAsync())
        {
            var now = new DateTime(2026, 9, 18, 17, 0, 0, DateTimeKind.Utc);
            var workflow = new LabServiceWorkflow($"forecast-{scope.Suffix}", "TEST ONLY forecast", null);
            var protocol = new LabProtocol($"forecast-{scope.Suffix}", "TEST ONLY forecast", null);
            var pv = new LabProtocolVersion(protocol.Id, 1, LabPreparationBatchTests.Definition().ToJson(), scope.PlatformUser.Id, now);
            var wv = new LabServiceWorkflowVersion(workflow.Id, 1, scope.PlatformUser.Id, now);
            var stage = new LabServiceWorkflowStage(wv.Id, 1, "Preparation", pv.Id, LabServiceWorkflowStageRequirement.Required, null, null);
            var calendar = new LabBusinessCalendar(900000, "America/Los_Angeles", new(2026, 1, 1), new(2027, 12, 31), "TEST ONLY calendar");
            var policy = new LabTimingPolicy(wv.Id, calendar.Id, 1, "TEST ONLY policy", false);
            policy.AddDuration("acceptance", 2, LabDayBasis.Calendar);
            policy.AddDuration(stage.Id.ToString(), 3, LabDayBasis.Calendar);
            policy.AddDuration("assembly", 2, LabDayBasis.Business);
            policy.AddDuration("qc", 1, LabDayBasis.Calendar);
            policy.AddDuration("delivery", 0, LabDayBasis.Calendar);
            var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, Guid.NewGuid(), scope.CustomerOrganization.Id,
                workflow.ServiceKey, 1, "test", $"TEST-FORECAST-{scope.Suffix}");
            // Commercial work does not pin an execution workflow on the job itself.
            Assert.Null(work.LabServiceWorkflowVersionId);
            var earlier = new LabSpecimen(work.Id, Guid.NewGuid()); earlier.RecordReceipt(now.AddDays(-1), "TEST ONLY", null);
            var later = new LabSpecimen(work.Id, Guid.NewGuid()); later.RecordReceipt(now, "TEST ONLY", null);
            work.Specimens.Add(earlier); work.Specimens.Add(later);
            db.AddRange(workflow, protocol, pv, wv, stage, calendar, policy, work, new LabJobTimingPolicy(work.Id, policy.Id, 1, "TEST ONLY binding"));
            await db.SaveChangesAsync();
            var service = new LabCompletionForecastService(db);
            var result = (await service.CalculateAsync([work.Id], now, default))[work.Id];
            Assert.Equal(now.AddDays(8), result.ExpectedAtUtc);
            Assert.Equal(2, result.EstimatedSamples);
            Assert.Equal([later.Id], result.DrivingSampleIds);
            Assert.Equal(now.AddDays(7), result.Samples.Single(s => s.SampleId == earlier.Id).ExpectedAtUtc);
            Assert.Equal("Scientific acceptance", result.Samples[0].Stage);
            var proposed = new LabTimingPolicy(wv.Id, calendar.Id, 2, "TEST ONLY incomplete policy", false);
            proposed.AddDuration("acceptance", 2, LabDayBasis.Calendar);
            db.Add(proposed); await db.SaveChangesAsync();
            var preview = (await service.CalculateAsync([work.Id], now, default, proposed.Id))[work.Id];
            Assert.Null(preview.ExpectedAtUtc);
            Assert.Equal("InsufficientInformation", preview.Status);
            Assert.Equal(policy.Id, (await service.CalculateAsync([work.Id], now, default))[work.Id].PolicyId);
            Assert.False(await db.Set<LabForecastSnapshot>().AnyAsync(s => s.LabWorkOrderId == work.Id));
            Assert.Single(await db.Set<LabJobTimingPolicy>().Where(p => p.LabWorkOrderId == work.Id).ToListAsync());
            await transaction.RollbackAsync();
        }
        scope.ClearTrackedState();
    }
}
