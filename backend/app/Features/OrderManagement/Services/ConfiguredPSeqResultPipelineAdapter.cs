namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.OrderManagement.Application;
using PhaenoPortal.App.Features.Accounts.Services;

public sealed class ConfiguredPSeqResultPipelineAdapter(
    IOptions<PSeqOrderToCashOptions> options) : IPSeqResultPipelineAdapter
{
    public Task<PSeqResultTransferRegistration> RegisterManifestAsync(
        PSeqResultManifestRegistration registration,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var configured = options.Value;
        var errors = configured.ValidateGovernedResults();
        if (errors.Count > 0)
            throw new InvalidOperationException(string.Join(" ", errors));

        var submissionId = Convert.ToHexString(SHA256.HashData(
            Encoding.UTF8.GetBytes(registration.IdempotencyKey)))[..24];
        var baseUrl = configured.ObjectStorageTransferBaseUrl.TrimEnd('/');
        var targets = Enumerable.Range(1, registration.ExpectedArtifactCount)
            .Select(index => $"{baseUrl}/{Uri.EscapeDataString(submissionId)}/{index}")
            .ToList();
        return Task.FromResult(new PSeqResultTransferRegistration(
            configured.PipelineProviderKey.Trim(), submissionId, targets));
    }
}
