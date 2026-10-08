namespace PSeq.Operations.Laboratory.Domain;

public sealed class LabContainerBarcode
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabContainerId { get; private set; }
    public string Namespace { get; private set; } = null!;
    public string Value { get; private set; } = null!;
    public string Symbology { get; private set; } = null!;
    public LabContainerBarcodeSource Source { get; private set; }
    public bool IsPrimary { get; private set; }

    private LabContainerBarcode() { }

    public LabContainerBarcode(Guid containerId, string barcodeNamespace, string value,
        string symbology, LabContainerBarcodeSource source, bool isPrimary)
    {
        if (containerId == Guid.Empty) throw new ArgumentException("A container is required.", nameof(containerId));
        if (string.IsNullOrWhiteSpace(barcodeNamespace) || barcodeNamespace.Length > 50
            || barcodeNamespace.Any(char.IsControl))
            throw new ArgumentException("A valid barcode namespace is required.", nameof(barcodeNamespace));
        if (string.IsNullOrWhiteSpace(value) || value.Length > 100 || value.Any(char.IsControl))
            throw new ArgumentException("A valid barcode value is required.", nameof(value));
        if (symbology is not ("DataMatrix" or "Code128" or "Qr" or "Unknown"))
            throw new ArgumentException("Choose a supported or unknown barcode symbology.", nameof(symbology));
        LabContainerId = containerId;
        Namespace = barcodeNamespace.Trim().ToUpperInvariant();
        Value = value.Trim().ToUpperInvariant();
        Symbology = symbology;
        Source = source;
        IsPrimary = isPrimary;
    }
}
