namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Trials.Services;
using PSeq.Operations.Commercial.Trials.Domain;

public sealed partial class TrialProjectPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task TrialTimelineReachesOlderEventsAndFiltersCommercialOutcomesBeforeCounts()
    {
        await using var scope = await Fixture.Create();
        var trial = await scope.Workflow.CreateAsync(scope.Commercial, CreationRequest(scope.Company.Id, scope.SampleType.Id, scope.Department.Id), default);
        await scope.Db.SaveChangesAsync();
        var baseline = await scope.Db.TrialEvents.CountAsync(value => value.TrialProjectId == trial.Id && value.Kind != "commercial-outcome");
        for (var index = 0; index < 120; index++) scope.Db.Add(new TrialEvent(trial.Id, "synthetic-visible", $"TEST ONLY timeline {index}", scope.Commercial.User.Id, DateTime.UtcNow.AddMinutes(-index)));
        scope.Db.Add(new TrialEvent(trial.Id, "commercial-outcome", "TEST ONLY staff outcome", scope.Commercial.User.Id, DateTime.UtcNow));
        await scope.Db.SaveChangesAsync();
        var external = new TrialActor(scope.Commercial.User, false, false, null);
        var older = await scope.Reader.TimelinePageAsync(trial, external, 5, default);
        Assert.Equal(baseline + 120, older.TotalCount);
        Assert.NotEmpty(older.Items);
        Assert.DoesNotContain(older.Items, value => value.Kind == "commercial-outcome");
        Assert.Equal(baseline + 121, (await scope.Reader.TimelinePageAsync(trial, scope.Commercial, 1, default)).TotalCount);
    }
}
