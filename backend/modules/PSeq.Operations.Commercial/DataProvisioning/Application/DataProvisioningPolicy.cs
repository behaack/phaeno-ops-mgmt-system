namespace PSeq.Operations.Commercial.DataProvisioning.Application;

public static class DataProvisioningPolicy
{
    public static (string Extension, string FileKind)? ResolveApprovedFileKind(
        string fileName,
        IReadOnlyDictionary<string, string> allowedFileKinds)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(extension)
            || !allowedFileKinds.TryGetValue(extension, out var fileKind)
            || string.IsNullOrWhiteSpace(fileKind))
        {
            return null;
        }

        return (extension, fileKind.Trim());
    }

    public static bool CanUseSyntheticData(
        bool isSynthetic,
        bool isProduction,
        bool syntheticFixturesEnabled) =>
        !isSynthetic || (!isProduction && syntheticFixturesEnabled);

    public static bool CanPublishExternally(bool isSynthetic, bool isProduction) =>
        !isSynthetic || !isProduction;
}
