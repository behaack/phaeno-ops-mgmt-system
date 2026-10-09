namespace PhaenoPortal.App.Features.LabOperations.Services;

public static class ScientificStorageHierarchy
{
    public static void RequireOriginalSequencingBranch(string storageKey, Guid sample, Guid library, int purchasedRun)
    {
        var key = PhaenoPortal.App.Infrastructure.Storage.S3OriginalObject.Parse(storageKey).Key;
        var segments = key.Split('/');
        // Use the record branch, never a repeated sample label inside a raw subfolder.
        var sampleIndex = Array.FindIndex(segments, segment => segment == Identity("sample", sample));
        var run = purchasedRun;
        if (sampleIndex < 0 || run < 1 || sampleIndex + 4 >= segments.Length
            || segments[sampleIndex + 1] != Identity("library", library)
            || segments[sampleIndex + 3] != "raw"
            || !System.Text.RegularExpressions.Regex.IsMatch(segments[sampleIndex + 2],
                "^sequencing-[0-9a-f]{32}-run-" + run.ToString("D3") + "$"))
            throw new PhaenoPortal.App.Features.OrderManagement.Services.OrderManagementException("scientific_source_branch_mismatch",
                "Choose raw S3 files from the selected library and purchased sequencing run.", 409);
    }

    private static string Identity(string kind, Guid id) => id != Guid.Empty
        ? $"{kind}-{id:N}" : throw new ArgumentException($"A {kind} identity is required.");

    public static string Sample(Guid customer, Guid job, Guid sample) =>
        $"{Identity("customer", customer)}/{Identity("job", job)}/{Identity("sample", sample)}";

    public static string Sequencing(Guid customer, Guid job, Guid sample, Guid library, Guid capture, int purchasedRun)
    {
        if (purchasedRun < 1) throw new ArgumentOutOfRangeException(nameof(purchasedRun));
        // An immutable dataset capture distinguishes repeated acquisitions and corrections.
        // Provider run reference/times remain scientific evidence; the allocation is not an event ID.
        return $"{Sample(customer, job, sample)}/{Identity("library", library)}/{Identity("sequencing", capture)}-run-{purchasedRun:D3}";
    }

    public static string RawSet(Guid customer, Guid job, Guid sample, Guid library, Guid capture, int purchasedRun) =>
        $"{Sequencing(customer, job, sample, library, capture, purchasedRun)}/raw";

    public static string Assembly(Guid customer, Guid job, Guid sample, Guid library, Guid capture, int purchasedRun, Guid attempt) =>
        $"{Sequencing(customer, job, sample, library, capture, purchasedRun)}/assemblies/{Identity("assembly", attempt)}";
}
