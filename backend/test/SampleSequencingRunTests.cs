namespace PhaenoPortal.Test;

using System.Text;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class SampleSequencingRunTests
{
    [Theory]
    [InlineData(1, 20)]
    [InlineData(20, 20)]
    public void CommercialRunsDoNotChangeUniqueSampleOrContainerCounts(int samples, int runs)
    {
        var order = Order(samples);
        order.SetSequencingRunCount(runs);
        for (var i = 0; i < samples; i++)
        {
            var sample = new LabSample(order.Id, $"S-{i}", "extracted_rna", "Human PBMCs", 1, "tube", "Frozen", "No hazards", null, null, null, "[]");
            sample.SetSequencingRunCount(runs / samples);
            order.Samples.Add(sample);
        }
        Assert.Equal(samples, order.RequestedSpecimenCount);
        Assert.Equal(runs, order.RequestedSequencingRunCount);
        Assert.Equal(samples, order.Samples.Sum(s => s.Quantity));
        Assert.True(order.HasAcceptedSampleSourceCounts);
        order.Samples.First().SetSequencingRunCount(runs / samples + 1);
        Assert.False(order.HasAcceptedSampleSourceCounts);
    }

    [Fact]
    public void LegacyOrdersDefaultToOneRunPerSampleAndRunAllocationCannotChangeAfterSubmission()
    {
        var order = Order(2);
        Assert.Equal(2, order.RequestedSequencingRunCount);
        Assert.Throws<ArgumentOutOfRangeException>(() => order.SetSequencingRunCount(1));
        order.SetSequencingRunCount(20);
        order.Submit(Guid.NewGuid(), DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() => order.SetSequencingRunCount(21));
    }

    [Fact]
    public void CsvSupportsTwentyRunsOfOneSampleWithoutTwentySampleIdsOrTubes()
    {
        var order = Order(1); order.SetSequencingRunCount(20);
        var result = LabSampleCsvParser.Parse(Encoding.UTF8.GetBytes("customer_sample_id,biological_source,tube_count,sequencing_runs\nS-1,,1,20\n"), order);
        Assert.Empty(result.Errors);
        var row = Assert.Single(result.Rows);
        Assert.Equal(1, row.TubeCount); Assert.Equal(20, row.SequencingRunCount);
        var legacy = LabSampleCsvParser.Parse(Encoding.UTF8.GetBytes("customer_sample_id,biological_source,tube_count\nS-1,,1\n"), order);
        Assert.Contains(legacy.Errors, error => error.Column == "sequencing_runs");
        Assert.Empty(order.Samples);
    }

    [Theory]
    [InlineData("0")] [InlineData("-1")] [InlineData("1.5")] [InlineData("10001")]
    public void CsvRejectsInvalidRunAllocation(string count)
    {
        var result = LabSampleCsvParser.Parse(Encoding.UTF8.GetBytes($"customer_sample_id,biological_source,tube_count,sequencing_runs\nS-1,,1,{count}\n"), Order(1));
        Assert.Contains(result.Errors, error => error.Column == "sequencing_runs");
    }

    private static LabServiceOrder Order(int count)
    {
        var order = new LabServiceOrder(Guid.NewGuid(), Guid.NewGuid(), OrderNumberGenerator.Lab(), "Repeated sequencing", null,
            count, false, "Human PBMCs", "Frozen", "No hazards", "Ship cold");
        order.SourceGroups.Add(new(order.Id, "Human PBMCs", count));
        return order;
    }
}
