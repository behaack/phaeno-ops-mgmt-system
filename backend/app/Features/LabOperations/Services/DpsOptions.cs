namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Net;

public sealed class DpsApprovedRecipe
{
    public string Key { get; set; } = "";
    public string Name { get; set; } = "";
    public string Version { get; set; } = "";
    public string ParametersJson { get; set; } = "{}";
    public string[] RequiredOutputRoles { get; set; } = [];
}
public sealed class DpsOptions
{
    public const string SectionName = "Dps";
    public bool Enabled { get; set; }
    public string Environment { get; set; } = "local";
    public string Host { get; set; } = "";
    public int Port { get; set; } = 8883;
    public bool UseTls { get; set; } = true;
    public string ClientId { get; set; } = "";
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string ClientCertificatePath { get; set; } = "";
    public string ClientCertificatePassword { get; set; } = "";
    public int RequestTimeoutSeconds { get; set; } = 15;
    public int OperationTimeoutSeconds { get; set; } = 300;
    public long MaximumOutputFileBytes { get; set; } = 1_073_741_824;
    public long MaximumOutputSetBytes { get; set; } = 17_179_869_184;
    public List<DpsApprovedRecipe> Recipes { get; set; } = [];
    public string TopicRoot => $"phaeno/dps/v1/{Environment}";
    public bool IsConfigured()
    {
        var loopback = Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
            || IPAddress.TryParse(Host, out var address) && IPAddress.IsLoopback(address);
        return (Environment is "local" or "staging" or "production") && !string.IsNullOrWhiteSpace(Host)
            && Host == Host.Trim() && !Host.Any(c => char.IsControl(c) || c is '/' or '\\' or '#' or '+' or ' ')
            && !Host.Contains("://", StringComparison.Ordinal) && Port is > 0 and <= 65535
            && RequestTimeoutSeconds is >= 1 and <= 30 && OperationTimeoutSeconds is >= 30 and <= 900
            && MaximumOutputFileBytes > 0 && MaximumOutputSetBytes >= MaximumOutputFileBytes
            && (UseTls || Environment == "local" && loopback)
            && (loopback || !string.IsNullOrWhiteSpace(ClientCertificatePath) || !string.IsNullOrWhiteSpace(Username))
            && string.IsNullOrEmpty(Username) == string.IsNullOrEmpty(Password)
            && ClientId.Length <= 128 && !ClientId.Any(char.IsControl);
    }
}
