namespace PSeq.Operations.Commercial.DataProvisioning.Application;

using PSeq.Operations.Commercial.DataProvisioning.Domain;

public sealed record ManagedFileScanResult(
    ManagedFileScanStatus Status,
    string? Message);

public interface IManagedFileScanner
{
    Task<ManagedFileScanResult> ScanAsync(
        string storageKey,
        CancellationToken cancellationToken);
}
