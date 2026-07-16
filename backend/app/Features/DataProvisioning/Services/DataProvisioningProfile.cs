namespace PhaenoPortal.App.Features.DataProvisioning.Services;

using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.DataProvisioning.Application;

public sealed class DataProvisioningProfile(
    IWebHostEnvironment environment,
    IOptions<DataProvisioningOptions> options)
{
    public long MaximumUploadBytes => options.Value.MaxUploadBytes;

    public (string Extension, string FileKind) ResolveFileKind(string fileName)
    {
        var approvedFileKind = DataProvisioningPolicy.ResolveApprovedFileKind(
            fileName,
            options.Value.AllowedFileKinds);
        if (!approvedFileKind.HasValue)
        {
            throw new DataProvisioningException(
                "file_kind_not_allowed",
                "This file kind is not approved for the current environment.");
        }

        return approvedFileKind.Value;
    }

    public void EnsureSyntheticFixturesAllowed(bool isSynthetic)
    {
        if (!DataProvisioningPolicy.CanUseSyntheticData(
            isSynthetic,
            environment.IsProduction(),
            options.Value.EnableSyntheticFixtures))
        {
            throw new DataProvisioningException(
                "synthetic_data_not_allowed",
                "Synthetic source data is not allowed in this environment.");
        }
    }

    public void EnsureExternalPublicationAllowed(bool isSynthetic)
    {
        if (!DataProvisioningPolicy.CanPublishExternally(
            isSynthetic,
            environment.IsProduction()))
        {
            throw new DataProvisioningException(
                "synthetic_data_not_publishable",
                "Synthetic data cannot be published, made eligible, or granted in production.");
        }

        EnsureSyntheticFixturesAllowed(isSynthetic);
    }
}
