namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    private async Task<Dictionary<Guid, string>> ReadPreparationServiceNamesAsync(IEnumerable<Guid> versionIds, CancellationToken ct)
    {
        var ids = versionIds.Distinct().ToArray();
        var workflows = await (from version in dbContext.LabServiceWorkflowVersions.AsNoTracking()
            join workflow in dbContext.LabServiceWorkflows.AsNoTracking() on version.LabServiceWorkflowId equals workflow.Id
            where ids.Contains(version.Id) select new { version.Id, workflow.ServiceKey, workflow.Name }).ToListAsync(ct);
        var keys = workflows.Select(item => item.ServiceKey.ToLower()).Distinct().ToArray();
        var services = await dbContext.QboCatalogItems.AsNoTracking().Where(item => keys.Contains(item.ExternalItemId.ToLower()))
            .Select(item => new { Key = item.ExternalItemId.ToLower(), item.Name }).ToDictionaryAsync(item => item.Key, item => item.Name, ct);
        return workflows.ToDictionary(item => item.Id, item => services.GetValueOrDefault(item.ServiceKey.ToLower(), item.Name));
    }

    private static string PreparationDisplayName(LabPreparationBatch batch, string serviceName) =>
        $"{serviceName} · Prep {batch.CreatedAt:yyyyMMdd-HHmmss}-{batch.Id.ToString("N")[..6]}";
}
