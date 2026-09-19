namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class PSeqResultPipelineController
{
    [HttpPost("sequencing-outputs")]
    public async Task<LabSequencingOutput> RegisterSequencingOutput([FromBody] RegisterSequencingOutputRequest request, CancellationToken ct)
    {
        RequirePipelineAuthentication();
        RequireGovernedResultsConfiguration();
        return await new LabResultLineageService(dbContext).RegisterOutputAsync(request, null, $"pipeline:{Rollout.PipelineProviderKey}", ct);
    }

    [HttpPost("analysis-runs")]
    public async Task<LabAnalysisRun> RegisterAnalysisRun([FromBody] RegisterAnalysisRunRequest request, CancellationToken ct)
    {
        RequirePipelineAuthentication();
        RequireGovernedResultsConfiguration();
        return await new LabResultLineageService(dbContext).RegisterAnalysisAsync(request, null, $"pipeline:{Rollout.PipelineProviderKey}", ct, Rollout.RequireScientificEvidence);
    }
}
