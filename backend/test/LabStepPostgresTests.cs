namespace PhaenoPortal.Test;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task HistoricalCatalogIsReadableButAllAuthoringOperationsAreArchived()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var controller = scope.CreateLabController();
        var original = await controller.ReadLabSteps(default);
        var error = await Assert.ThrowsAsync<OrderManagementException>(() => controller.CreateLabStep(new("TEST archive blocked", null), default));
        Assert.Equal("lab_step_catalog_archived", error.ErrorCode);
        Assert.Equal(original.Count, (await controller.ReadLabSteps(default)).Count);
    }

    [PostgreSqlReferenceFact]
    public async Task ProtocolDraftOwnsInstructionsWhileHistoricalCatalogSourceRemainsUnchanged()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var controller = scope.CreateLabController();
            var historical = new LabStep($"source-{scope.Suffix}", "TEST historical procedure", null);
            historical.RecordVersion(1);
            var source = new LabStepVersion(historical.Id, 1, LabStepTests.Definition().ToJson(), scope.PlatformUser.Id, DateTime.UtcNow);
            source.ApproveWithOverride(scope.PlatformUser.Id, DateTime.UtcNow, "TEST ONLY historical approval");
            scope.DbContext.AddRange(historical, source); await scope.DbContext.SaveChangesAsync();
            var original = source.DefinitionJson;
            var definition = LabProtocolDefinition.Parse(original);
            var own = definition with { Steps = [definition.Steps[0] with { Key = "own-first", Instructions = "Locally revised instruction", LabStepVersionId = source.Id }, definition.Steps[0] with { Key = "own-second", LabStepVersionId = source.Id }] };
            var protocol = await controller.CreateProtocol(new($"TEST owned procedure {scope.Suffix}", null), default);
            protocol = await controller.CreateProtocolVersion(protocol.Id, new(own.ToJson(), protocol.Version), default);
            var saved = LabProtocolDefinition.Parse(Assert.Single(protocol.Versions).DefinitionJson);
            Assert.Equal(2, saved.Steps.Count);
            Assert.Equal("Locally revised instruction", saved.Steps[0].Instructions);
            Assert.Equal(original, source.DefinitionJson);
            foreach (var operation in new Func<Task>[] {
                async () => { await controller.UpdateLabStep(historical.Id, new("Changed", null, historical.Version), default); },
                async () => { await controller.SaveLabStepVersion(historical.Id, new(original, historical.Version), default); },
                async () => { await controller.TransitionLabStep(historical.Id, new("approve", historical.Version, source.Id), default); }
            }) Assert.Equal("lab_step_catalog_archived", (await Assert.ThrowsAsync<OrderManagementException>(operation)).ErrorCode);
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }
}
