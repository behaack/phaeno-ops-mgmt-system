namespace PhaenoPortal.App.Features.DataProvisioning.Services;

using PhaenoPortal.App.Features.DataProvisioning.Domain;

public sealed record ManagedFileScanResult(
    ManagedFileScanStatus Status,
    string? Message);

public interface IManagedFileScanner
{
    Task<ManagedFileScanResult> ScanAsync(
        string storageKey,
        CancellationToken cancellationToken);
}

public sealed class EnvironmentManagedFileScanner(
    IWebHostEnvironment environment,
    Microsoft.Extensions.Options.IOptions<DataProvisioningOptions> options) : IManagedFileScanner
{
    public Task<ManagedFileScanResult> ScanAsync(
        string storageKey,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        return Task.FromResult(
            !environment.IsProduction() && options.Value.UseTrustedDevelopmentScanner
                ? new ManagedFileScanResult(
                    ManagedFileScanStatus.Clean,
                    "Trusted development/test fixture scanner.")
                : new ManagedFileScanResult(
                    ManagedFileScanStatus.Unavailable,
                    "No production malware scanner is configured."));
    }
}
