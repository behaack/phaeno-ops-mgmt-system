namespace PhaenoPortal.App.Features.DataProvisioning.Services;

public sealed class DataProvisioningOptions
{
    public const string SectionName = "DataProvisioning";

    public string StorageRoot { get; set; } = "App_Data/provisioning-files";

    public long MaxUploadBytes { get; set; } = 52_428_800;

    public bool EnableSyntheticFixtures { get; set; }

    public bool UseTrustedDevelopmentScanner { get; set; }

    public Dictionary<string, string> AllowedFileKinds { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}
