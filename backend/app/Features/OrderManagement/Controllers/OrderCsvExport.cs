namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Text;
using PhaenoPortal.App.Features.OrderManagement.DTOs;

internal static class OrderCsvExport
{
    public static byte[] Create(IEnumerable<OrderListItemDto> items)
    {
        var csv = new StringBuilder("number,status,reference,created_at,updated_at\r\n");
        foreach (var item in items)
        {
            csv.Append(Cell(item.Number)).Append(',')
                .Append(Cell(item.Status)).Append(',')
                .Append(Cell(item.Reference)).Append(',')
                .Append(Cell(item.CreatedAt.ToUniversalTime().ToString("O"))).Append(',')
                .Append(Cell(item.UpdatedAt.ToUniversalTime().ToString("O"))).Append("\r\n");
        }

        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray();
    }

    private static string Cell(string? value)
    {
        var safe = value ?? string.Empty;
        return safe.IndexOfAny([',', '"', '\r', '\n']) >= 0 ? $"\"{safe.Replace("\"", "\"\"")}\"" : safe;
    }
}
