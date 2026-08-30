namespace PhaenoPortal.Test;

using System.Text;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class LabSampleCsvParserTests
{
    [Fact]
    public void CsvImportPreservesTextIdentifiersAndInheritsTheSingleSource()
    {
        var order = Order(2, ("Human PBMCs", 2));
        var csv = "customer_sample_id,biological_source,tube_count\r\n00123,,2\r\n\"S,2\",,1\r\n";

        var result = LabSampleCsvParser.Parse(Encoding.UTF8.GetBytes(csv), order);

        Assert.Empty(result.Errors);
        Assert.Equal(["00123", "S,2"], result.Rows.Select(row => row.CustomerSampleId));
        Assert.All(result.Rows, row => Assert.Equal("Human PBMCs", row.BiologicalSource));
    }

    [Fact]
    public void CsvImportReportsSourceAndCommittedCountMismatchesWithoutChangingTheJob()
    {
        var order = Order(2, ("Human PBMCs", 1), ("Mouse liver", 1));
        var csv = "customer_sample_id,biological_source,tube_count\nS-1,Human PBMCs,1\n";

        var result = LabSampleCsvParser.Parse(Encoding.UTF8.GetBytes(csv), order);

        Assert.Contains(result.Errors, error => error.Column == "sample_count");
        Assert.Contains(result.Errors, error => error.Message.Contains("Mouse liver", StringComparison.Ordinal));
        Assert.Empty(order.Samples);
    }

    private static LabServiceOrder Order(int count, params (string Source, int Count)[] groups)
    {
        var order = new LabServiceOrder(Guid.NewGuid(), OrderNumberGenerator.Lab(), "CSV Job", null,
            count, groups.Length > 1, groups.Length == 1 ? groups[0].Source : null,
            "Keep frozen.", "No known hazards.", "Ship cold");
        foreach (var group in groups)
            order.SourceGroups.Add(new LabServiceSourceGroup(order.Id, group.Source, group.Count));
        return order;
    }
}
