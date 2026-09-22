namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Collections.Concurrent;
using PSeq.Operations.Laboratory.Domain;

public sealed record AssemblyRecipe(string Key, string Name, string Version, string ParametersJson);
public sealed record AssemblyProviderAvailability(bool Available, string Message, bool SupportsCancellation, IReadOnlyList<AssemblyRecipe> Recipes);
public sealed record AssemblyInput(Guid SequencingOutputId, string ExternalFileReference, string Sha256, long SizeBytes);
public sealed record VerifiedAssemblyInput(Guid SequencingOutputId, string Bucket, string Key, string? VersionId, string Sha256, long SizeBytes, bool ImmutableObject = false);
public sealed record AssemblyInputVerification(string ManifestSha256, DateTime VerifiedAtUtc, IReadOnlyList<VerifiedAssemblyInput> Files);
public sealed record AssemblyProviderSnapshot(string ProviderJobId, string State, DateTime? StartedAtUtc = null,
    DateTime? StoppedAtUtc = null, DateTime? DispositionAtUtc = null, string? Reason = null,
    string? OutputManifestJson = null, bool NeverStarted = false, double? Percentage = null, long? ProgressSequence = null);

/// <summary>POMS-owned boundary, not a claim about the external SignalR wire contract.</summary>
public interface ILabAssemblyProvider
{
    string Key { get; }
    AssemblyProviderAvailability Availability { get; }
    bool SupportsIdempotentStart { get; }
    Task<AssemblyInputVerification> VerifyInputsAsync(IReadOnlyList<AssemblyInput> inputs, CancellationToken ct);
    Task<AssemblyProviderSnapshot?> FindAsync(Guid clientJobId, CancellationToken ct);
    Task<AssemblyProviderSnapshot> StartAsync(LabAssemblyJob job, CancellationToken ct);
    Task<AssemblyProviderSnapshot?> CancelAsync(Guid clientJobId, string reason, CancellationToken ct);
}

/// <summary>No simulated execution is registered in the application. A real adapter replaces this after contract review.</summary>
public sealed class UnavailableLabAssemblyProvider : ILabAssemblyProvider
{
    public string Key => "unconfigured";
    public AssemblyProviderAvailability Availability => new(false,
        "Assembly is not connected yet. The processing service must be configured before jobs can start.", false, []);
    public bool SupportsIdempotentStart => false;
    public Task<AssemblyInputVerification> VerifyInputsAsync(IReadOnlyList<AssemblyInput> inputs, CancellationToken ct) => throw Unavailable();
    public Task<AssemblyProviderSnapshot?> FindAsync(Guid clientJobId, CancellationToken ct) => throw Unavailable();
    public Task<AssemblyProviderSnapshot> StartAsync(LabAssemblyJob job, CancellationToken ct) => throw Unavailable();
    public Task<AssemblyProviderSnapshot?> CancelAsync(Guid clientJobId, string reason, CancellationToken ct) => throw Unavailable();
    private static InvalidOperationException Unavailable() => new("The assembly provider contract has not been configured.");
}

public sealed record AssemblyProgress(double Percentage, DateTime ReceivedAtUtc, long? Sequence);

/// <summary>Loss is intentional. No DB writes, historical series, message logs or durable queue.</summary>
public sealed class LabAssemblyProgress(TimeProvider time)
{
    private readonly ConcurrentDictionary<Guid, AssemblyProgress> latest = new();
    public void Report(Guid jobId, double percentage, long? sequence = null)
    {
        if (!double.IsFinite(percentage) || percentage < 0 || percentage > 100) return;
        var now = time.GetUtcNow().UtcDateTime;
        foreach (var item in latest.Where(p => now - p.Value.ReceivedAtUtc > TimeSpan.FromMinutes(2))) latest.TryRemove(item.Key, out _);
        if (latest.Count >= 4096 && !latest.ContainsKey(jobId)) return;
        latest.AddOrUpdate(jobId, new AssemblyProgress(percentage, now, sequence), (_, old) =>
            sequence.HasValue && old.Sequence.HasValue && sequence <= old.Sequence ? old : new(percentage, now, sequence));
    }
    public AssemblyProgress? Read(Guid jobId, bool terminal)
    {
        if (terminal) { Forget(jobId); return null; }
        return latest.TryGetValue(jobId, out var value) && time.GetUtcNow().UtcDateTime - value.ReceivedAtUtc <= TimeSpan.FromMinutes(2) ? value : null;
    }
    public void Forget(Guid jobId) => latest.TryRemove(jobId, out _);
}

public sealed class LabAssemblyOptions
{
    public const string SectionName = "LabAssembly";
    public bool WorkerEnabled { get; set; } // Default off, independently of provider readiness.
    public int PollSeconds { get; set; } = 5;
    public int MaximumConcurrentJobs { get; set; } = 4;
}
