namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed record LabSampleCsvParseResult(
    IReadOnlyList<LabSampleImportRowDto> Rows,
    IReadOnlyList<LabSampleImportErrorDto> Errors,
    int BlankRowCount,
    IReadOnlyDictionary<string, int> SourceCounts);

public static class LabSampleCsvParser
{
    private static readonly string[] RequiredHeaders =
        ["customer_sample_id", "biological_source", "tube_count"];

    public static LabSampleCsvParseResult Parse(byte[] bytes, LabServiceOrder order)
    {
        string text;
        try { text = new UTF8Encoding(false, true).GetString(bytes); }
        catch (DecoderFallbackException)
        {
            return new LabSampleCsvParseResult([],
                [new LabSampleImportErrorDto(1, "file", "Save the file as UTF-8 CSV and upload it again.")], 0,
                new Dictionary<string, int>());
        }

        if (text.Length > 0 && text[0] == '\uFEFF') text = text[1..];
        var parsed = ReadRows(text);
        var errors = parsed.Errors.ToList();
        if (parsed.Rows.Count == 0)
        {
            errors.Add(new LabSampleImportErrorDto(1, "file", "The CSV file is empty."));
            return new LabSampleCsvParseResult([], errors, 0, new Dictionary<string, int>());
        }

        var headers = parsed.Rows[0].Select(value => value.Trim()).ToList();
        if (headers.Count != RequiredHeaders.Length
            || headers.Distinct(StringComparer.OrdinalIgnoreCase).Count() != headers.Count
            || !headers.SequenceEqual(RequiredHeaders, StringComparer.OrdinalIgnoreCase))
        {
            errors.Add(new LabSampleImportErrorDto(1, "header",
                "Use exactly these columns in this order: customer_sample_id, biological_source, tube_count."));
            return new LabSampleCsvParseResult([], errors, 0, new Dictionary<string, int>());
        }

        var sourceGroups = order.SourceGroups.ToDictionary(
            group => group.NormalizedBiologicalSource,
            group => group,
            StringComparer.Ordinal);
        var rows = new List<LabSampleImportRowDto>();
        var blankRows = 0;
        for (var index = 1; index < parsed.Rows.Count; index++)
        {
            var sourceRow = parsed.Rows[index];
            var rowNumber = index + 1;
            if (sourceRow.All(string.IsNullOrWhiteSpace))
            {
                blankRows++;
                continue;
            }
            if (sourceRow.Count != RequiredHeaders.Length)
            {
                errors.Add(new LabSampleImportErrorDto(rowNumber, "row",
                    "This row must contain exactly three columns."));
                continue;
            }

            var customerSampleId = sourceRow[0].Trim();
            var biologicalSource = sourceRow[1].Trim();
            var tubeText = sourceRow[2].Trim();
            var rowHasError = false;
            if (customerSampleId.Length is < 1 or > 255)
            {
                errors.Add(new LabSampleImportErrorDto(rowNumber, "customer_sample_id",
                    "Enter a Customer sample ID between 1 and 255 characters."));
                rowHasError = true;
            }
            if (string.IsNullOrWhiteSpace(biologicalSource) && sourceGroups.Count == 1)
                biologicalSource = sourceGroups.Values.Single().BiologicalSource;
            if (string.IsNullOrWhiteSpace(biologicalSource))
            {
                errors.Add(new LabSampleImportErrorDto(rowNumber, "biological_source",
                    "Select one of the biological sources accepted with this Job."));
                rowHasError = true;
            }
            else
            {
                var normalized = LabServiceSourceGroup.Normalize(biologicalSource);
                if (!sourceGroups.TryGetValue(normalized, out var group))
                {
                    errors.Add(new LabSampleImportErrorDto(rowNumber, "biological_source",
                        "This biological source is not part of the accepted Job."));
                    rowHasError = true;
                }
                else biologicalSource = group.BiologicalSource;
            }
            if (!int.TryParse(tubeText, out var tubeCount) || tubeCount < 1 || tubeCount > 100)
            {
                errors.Add(new LabSampleImportErrorDto(rowNumber, "tube_count",
                    "Tube count must be a whole number between 1 and 100."));
                rowHasError = true;
            }
            if (!rowHasError)
                rows.Add(new LabSampleImportRowDto(rowNumber, customerSampleId, biologicalSource, tubeCount));
        }

        foreach (var duplicate in rows.GroupBy(row => row.CustomerSampleId, StringComparer.OrdinalIgnoreCase)
                     .Where(group => group.Count() > 1))
            foreach (var row in duplicate)
                errors.Add(new LabSampleImportErrorDto(row.RowNumber, "customer_sample_id",
                    $"Customer sample ID '{row.CustomerSampleId}' appears more than once."));

        var sourceCounts = rows.GroupBy(row => row.BiologicalSource, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.Count(), StringComparer.OrdinalIgnoreCase);
        if (rows.Count != order.RequestedSpecimenCount)
            errors.Add(new LabSampleImportErrorDto(0, "sample_count",
                $"The accepted Job requires exactly {order.RequestedSpecimenCount} samples; this file contains {rows.Count} valid rows."));
        foreach (var group in order.SourceGroups)
        {
            var actual = sourceCounts.GetValueOrDefault(group.BiologicalSource);
            if (actual != group.SpecimenCount)
                errors.Add(new LabSampleImportErrorDto(0, "biological_source",
                    $"{group.BiologicalSource} requires {group.SpecimenCount} samples; this file contains {actual}."));
        }
        return new LabSampleCsvParseResult(rows, errors, blankRows, sourceCounts);
    }

    private static (List<List<string>> Rows, List<LabSampleImportErrorDto> Errors) ReadRows(string text)
    {
        var rows = new List<List<string>>();
        var errors = new List<LabSampleImportErrorDto>();
        var row = new List<string>();
        var field = new StringBuilder();
        var quoted = false;
        for (var index = 0; index < text.Length; index++)
        {
            var value = text[index];
            if (quoted)
            {
                if (value == '"')
                {
                    if (index + 1 < text.Length && text[index + 1] == '"')
                    {
                        field.Append('"');
                        index++;
                    }
                    else quoted = false;
                }
                else field.Append(value);
                continue;
            }
            if (value == '"' && field.Length == 0) { quoted = true; continue; }
            if (value == ',') { row.Add(field.ToString()); field.Clear(); continue; }
            if (value is '\r' or '\n')
            {
                if (value == '\r' && index + 1 < text.Length && text[index + 1] == '\n') index++;
                row.Add(field.ToString()); field.Clear(); rows.Add(row); row = [];
                continue;
            }
            field.Append(value);
        }
        if (quoted) errors.Add(new LabSampleImportErrorDto(rows.Count + 1, "row", "A quoted field is not closed."));
        if (field.Length > 0 || row.Count > 0) { row.Add(field.ToString()); rows.Add(row); }
        return (rows, errors);
    }
}
