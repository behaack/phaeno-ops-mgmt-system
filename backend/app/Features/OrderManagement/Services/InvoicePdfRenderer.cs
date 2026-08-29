namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Globalization;
using System.Text;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed record InvoicePdfLine(string Description, decimal Quantity, decimal UnitPrice, decimal Total);

public static class InvoicePdfRenderer
{
    public static byte[] Render(string invoiceNumber, string customerName,
        DateOnly issuedOn, DateOnly dueOn, IReadOnlyList<InvoicePdfLine> lines,
        decimal subtotal, decimal tax, decimal total, string currency)
    {
        var textLines = new List<string>
        {
            "Phaeno Biotechnology - Invoice",
            $"Invoice: {invoiceNumber}",
            $"Customer: {customerName}",
            $"Issued: {issuedOn:yyyy-MM-dd}",
            $"Due: {dueOn:yyyy-MM-dd}",
            string.Empty
        };
        textLines.AddRange(lines.Select((line, index) =>
            $"{index + 1}. {line.Description} | {line.Quantity:0.######} x {line.UnitPrice:0.00} | {line.Total:0.00} {currency}"));
        textLines.AddRange([
            string.Empty,
            $"Subtotal: {subtotal:0.00} {currency}",
            $"Tax: {tax:0.00} {currency}",
            $"Total: {total:0.00} {currency}"
        ]);

        var content = new StringBuilder("BT /F1 11 Tf 54 756 Td 14 TL ");
        foreach (var line in textLines)
            content.Append('(').Append(Escape(line)).Append(") Tj T* ");
        content.Append("ET");
        var contentBytes = Encoding.ASCII.GetBytes(content.ToString());
        var objects = new[]
        {
            "<< /Type /Catalog /Pages 2 0 R >>",
            "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            $"<< /Length {contentBytes.Length.ToString(CultureInfo.InvariantCulture)} >>\nstream\n{content}\nendstream"
        };
        using var stream = new MemoryStream();
        using var writer = new StreamWriter(stream, Encoding.ASCII, 1024, leaveOpen: true) { NewLine = "\n" };
        writer.WriteLine("%PDF-1.4");
        writer.Flush();
        var offsets = new List<long> { 0 };
        for (var index = 0; index < objects.Length; index++)
        {
            offsets.Add(stream.Position);
            writer.WriteLine($"{index + 1} 0 obj");
            writer.WriteLine(objects[index]);
            writer.WriteLine("endobj");
            writer.Flush();
        }
        var xrefOffset = stream.Position;
        writer.WriteLine("xref");
        writer.WriteLine($"0 {objects.Length + 1}");
        writer.WriteLine("0000000000 65535 f ");
        foreach (var offset in offsets.Skip(1)) writer.WriteLine($"{offset:0000000000} 00000 n ");
        writer.WriteLine("trailer");
        writer.WriteLine($"<< /Size {objects.Length + 1} /Root 1 0 R >>");
        writer.WriteLine("startxref");
        writer.WriteLine(xrefOffset.ToString(CultureInfo.InvariantCulture));
        writer.WriteLine("%%EOF");
        writer.Flush();
        return stream.ToArray();
    }

    private static string Escape(string value) => value
        .Replace("\\", "\\\\", StringComparison.Ordinal)
        .Replace("(", "\\(", StringComparison.Ordinal)
        .Replace(")", "\\)", StringComparison.Ordinal);
}
