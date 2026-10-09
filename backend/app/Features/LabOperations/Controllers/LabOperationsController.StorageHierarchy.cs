namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    private async Task<string> FastqRawDirectoryAsync(LabFastqSet set, CancellationToken ct)
    {
        var work = await RequireWorkOrderAsync(set.LabWorkOrderId, ct);
        return ScientificStorageHierarchy.RawSet(work.SubmittingOrganizationId, work.Id, set.LabSpecimenId,
            set.LabLibraryId, set.Id, set.SequencingRunNumber);
    }
}
