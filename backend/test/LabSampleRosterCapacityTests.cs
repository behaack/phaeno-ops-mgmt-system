namespace PhaenoPortal.Test;

using System.Text;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed class LabSampleRosterCapacityTests
{
    [Fact]
    public void CapacityCountsSpecimensAndNormalizesSourcesRatherThanCountingTubes()
    {
        var order = CreateOrder();
        order.Samples.Add(Sample(order, "A-1", "Human PBMCs", 6));
        var error = Assert.Throws<InvalidOperationException>(() => order.EnsureSampleSourceCapacity(" human pbmcs "));
        Assert.Contains("1 of 1", error.Message);
        order.EnsureSampleSourceCapacity(" mouse liver ");
        Assert.False(order.HasAcceptedSampleSourceCounts);
    }

    [Fact]
    public void LegacyExcessAndUnknownSourcesAllowUnchangedEditsAndRecoveryMoves()
    {
        var order = CreateOrder();
        var first = Sample(order, "A-1", "Human PBMCs");
        var excess = Sample(order, "A-2", "Human PBMCs");
        var unknown = Sample(order, "A-3", "Legacy source");
        order.Samples.Add(first); order.Samples.Add(excess); order.Samples.Add(unknown);
        order.EnsureSampleSourceCapacity(" HUMAN PBMCS ", excess.Id);
        order.EnsureSampleSourceCapacity(" legacy SOURCE ", unknown.Id);
        order.EnsureSampleSourceCapacity("Mouse liver", excess.Id);
        Assert.Throws<InvalidOperationException>(() => order.EnsureSampleSourceCapacity("Human PBMCs", unknown.Id));
        Assert.False(order.HasAcceptedSampleSourceCounts);
    }

    [Fact]
    public void CsvRejectsOverfullSourceEvenWhenOverallCountMatchesAndPreservesTubeCounts()
    {
        var order = CreateOrder();
        var invalid = LabSampleCsvParser.Parse(Encoding.UTF8.GetBytes(
            "customer_sample_id,biological_source,tube_count\nA-1,Human PBMCs,4\nA-2, human pbmcs ,2\nB-1,Mouse liver,1\n"), order);
        Assert.Contains(invalid.Errors, error => error.Message.Contains("Human PBMCs requires 1 samples; this file contains 2."));
        Assert.Contains(invalid.Errors, error => error.Message.Contains("Mouse liver requires 2 samples; this file contains 1."));
        var valid = LabSampleCsvParser.Parse(Encoding.UTF8.GetBytes(
            "customer_sample_id,biological_source,tube_count\nA-1,Human PBMCs,4\nB-1, mouse liver ,2\nB-2,Mouse liver,1\n"), order);
        Assert.Empty(valid.Errors);
        Assert.Equal([4, 2, 1], valid.Rows.Select(row => row.TubeCount));
        Assert.Empty(order.Samples);
    }

    private static LabServiceOrder CreateOrder()
    {
        var order = new LabServiceOrder(Guid.NewGuid(), Guid.NewGuid(), OrderNumberGenerator.Lab(), "Capacity unit", null,
            3, true, null, "Frozen", "No hazards", "Ship cold");
        order.SourceGroups.Add(new LabServiceSourceGroup(order.Id, "Human PBMCs", 1));
        order.SourceGroups.Add(new LabServiceSourceGroup(order.Id, "Mouse liver", 2));
        return order;
    }

    private static LabSample Sample(LabServiceOrder order, string id, string source, int tubes = 1)
        => new(order.Id, id, "RNA", source, tubes, "tubes", "Frozen", "No hazards", null, null, null, "[]");
}
