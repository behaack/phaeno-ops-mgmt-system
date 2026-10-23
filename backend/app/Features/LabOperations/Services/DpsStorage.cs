namespace PhaenoPortal.App.Features.LabOperations.Services;

using Amazon;
using Amazon.Runtime.CredentialManagement;
using Amazon.S3;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Infrastructure.Storage;

/// <summary>The processing handoff can use S3 without relocating the application's managed files.</summary>
public sealed class DpsStorage : IDisposable
{
    private readonly Lazy<IAmazonS3> client;
    public S3FileStorageOptions Settings { get; }
    public bool Available { get; }
    public IAmazonS3 Client => Available ? client.Value : throw DpsMqttClient.Unavailable();

    internal DpsStorage(S3FileStorageOptions settings, IAmazonS3 objectClient)
    {
        Settings = settings;
        Available = !string.IsNullOrWhiteSpace(settings.BucketName) && !string.IsNullOrWhiteSpace(settings.Region);
        client = new(() => objectClient);
    }

    public DpsStorage(IOptions<DpsOptions> dps, IOptions<FileStorageOptions> files)
    {
        var dedicated = dps.Value.S3;
        Settings = string.IsNullOrWhiteSpace(dedicated.BucketName) ? files.Value.S3 : dedicated;
        Available = (!string.IsNullOrWhiteSpace(dedicated.BucketName)
            || files.Value.Provider.Equals(FileStorageProviders.S3, StringComparison.OrdinalIgnoreCase))
            && !string.IsNullOrWhiteSpace(Settings.BucketName) && !string.IsNullOrWhiteSpace(Settings.Region);
        if (Available) {
            try { _ = FileStorageKeys.NormalizePrefix(Settings.KeyPrefix); }
            catch (ArgumentException) { Available = false; }
        }
        client = new(() => {
            var config = new AmazonS3Config { ForcePathStyle = Settings.ForcePathStyle };
            if (string.IsNullOrWhiteSpace(Settings.ServiceUrl)) config.RegionEndpoint = RegionEndpoint.GetBySystemName(Settings.Region);
            else { config.ServiceURL = Settings.ServiceUrl; config.AuthenticationRegion = Settings.Region; }
            if (string.IsNullOrWhiteSpace(Settings.CredentialProfile)) return new AmazonS3Client(config);
            var profiles = new CredentialProfileStoreChain(string.IsNullOrWhiteSpace(Settings.CredentialProfileFile)
                ? null : Settings.CredentialProfileFile);
            if (!profiles.TryGetAWSCredentials(Settings.CredentialProfile, out var credentials))
                throw new InvalidOperationException("The DPS S3 credential profile is unavailable.");
            return new AmazonS3Client(credentials, config);
        });
    }
    public void Dispose() { if (client.IsValueCreated) client.Value.Dispose(); }
}
