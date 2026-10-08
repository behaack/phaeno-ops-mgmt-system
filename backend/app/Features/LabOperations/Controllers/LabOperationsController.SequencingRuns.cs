namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using PhaenoPortal.App.Features.LabOperations.Services;

public sealed partial class LabOperationsController
{
    private Task<Dictionary<Guid, int>> ReadSequencingRunAllocationsAsync(Guid workId, CancellationToken ct) =>
        new LabSequencingRunProgress(dbContext).AllocationsAsync(workId, ct);
}
