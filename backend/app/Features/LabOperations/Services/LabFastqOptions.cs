namespace PhaenoPortal.App.Features.LabOperations.Services;

public sealed class LabFastqOptions
{
    public const string SectionName = "LabFastq";
    // Tentative engineering values. Confirm against representative vendor files.
    public long MaximumFileBytes { get; set; } = 1_073_741_824;
    public long MaximumFileSetBytes { get; set; } = 17_179_869_184;
    public long MaximumExpandedFileBytes { get; set; } = 17_179_869_184;
    public long MaximumBatchArchiveBytes { get; set; } = 17_179_869_184;
    public long MaximumArchiveExpandedBytes { get; set; } = 68_719_476_736;
    public int MaximumArchiveEntries { get; set; } = 512;
    public int MaximumFilesPerSet { get; set; } = 256;
    public int MaximumReadLength { get; set; } = 16_384;
    public int DraftLifetimeHours { get; set; } = 24;
    public string[] AllowedReadLayouts { get; set; } = ["PairedEnd", "SingleEnd"];
    public string[] AllowedCompression { get; set; } = ["Gzip", "None"];
    public bool AllowMultipleGroups { get; set; } = true;
    public bool AllowSplitParts { get; set; } = true;
    public bool IsValid() => MaximumFileBytes > 0 && MaximumFileSetBytes >= MaximumFileBytes
        && MaximumExpandedFileBytes >= MaximumFileBytes && MaximumFilesPerSet is > 0 and <= 256
        && MaximumBatchArchiveBytes > 0 && MaximumArchiveExpandedBytes >= MaximumFileBytes
        && MaximumArchiveEntries is > 0 and <= 4096
        && MaximumReadLength is > 0 and <= 1_048_576 && DraftLifetimeHours is > 0 and <= 168
        && AllowedReadLayouts is { Length: > 0 } && AllowedReadLayouts.All(x => x is "PairedEnd" or "SingleEnd")
        && AllowedReadLayouts.Distinct().Count() == AllowedReadLayouts.Length
        && (!AllowedReadLayouts.Contains("PairedEnd") || MaximumFilesPerSet >= 2)
        && AllowedCompression is { Length: > 0 } && AllowedCompression.All(x => x is "Gzip" or "None")
        && AllowedCompression.Distinct().Count() == AllowedCompression.Length;
}
