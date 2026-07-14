namespace PhaenoPortal.App.Features.DataProvisioning.Services;

using Microsoft.Extensions.Options;

public sealed class DataProvisioningProfile(
    IWebHostEnvironment environment,
    IOptions<DataProvisioningOptions> options)
{
    public long MaximumUploadBytes => options.Value.MaxUploadBytes;

    public (string Extension, string FileKind) ResolveFileKind(string fileName)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(extension)
            || !options.Value.AllowedFileKinds.TryGetValue(extension, out var fileKind)
            || string.IsNullOrWhiteSpace(fileKind))
        {
            throw new DataProvisioningException(
                "file_kind_not_allowed",
                "This file kind is not approved for the current environment.");
        }

        return (extension, fileKind.Trim());
    }

    public void EnsureSyntheticFixturesAllowed(bool isSynthetic)
    {
        if (!isSynthetic)
        {
            return;
        }

        if (environment.IsProduction() || !options.Value.EnableSyntheticFixtures)
        {
            throw new DataProvisioningException(
                "synthetic_data_not_allowed",
                "Synthetic source data is not allowed in this environment.");
        }
    }

    public void EnsureExternalPublicationAllowed(bool isSynthetic)
    {
        if (environment.IsProduction() && isSynthetic)
        {
            throw new DataProvisioningException(
                "synthetic_data_not_publishable",
                "Synthetic data cannot be published, made eligible, or granted in production.");
        }

        EnsureSyntheticFixturesAllowed(isSynthetic);
    }
}
