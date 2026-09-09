namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public class SampleShippingContainerTests
{
    private static SampleShippingContainerDefinitionDto Size(int capacity, string? sku = null, int displayOrder = 0)
        => new(Guid.NewGuid(), Guid.NewGuid(), sku ?? $"C-{capacity}", $"Container {capacity}", capacity, 1, null, null, null, null,
            DateTime.UtcNow.AddDays(-1), null, true, displayOrder, 1, []);

    [Fact]
    public void DefaultThirtyTubesUsesTwentyAndTen()
    {
        var sizes = new[] { Size(20), Size(10), Size(5) };
        var result = SampleShippingContainerPacker.Preview(sizes, 30);
        Assert.True(result.IsComplete);
        Assert.Equal(2, result.ContainerCount);
        Assert.Equal(30, result.TotalCapacity);
        Assert.Equal(new[] { 20, 10 }, result.Containers.Select(item => item.Capacity));
        Assert.All(result.Containers, item => Assert.Equal(1, item.Quantity));
    }

    [Theory]
    [InlineData(20, 2, 10)]
    [InlineData(5, 6, 0)]
    public void ActualAvailabilityControlsRecommendation(int capacity, int quantity, int spare)
    {
        var sizes = new[] { Size(20), Size(10), Size(5) };
        var available = sizes.Select(item => new ContainerQuantityRequest(item.Id, item.TubeCapacity == capacity ? quantity : 0)).ToArray();
        var result = SampleShippingContainerPacker.Preview(sizes, 30, available);
        Assert.True(result.IsComplete);
        Assert.Equal(quantity, result.ContainerCount);
        Assert.Equal(spare, result.UnusedCapacity);
        Assert.Equal(capacity, Assert.Single(result.Containers).Capacity);
    }

    [Fact]
    public void ExactSearchFindsLeastWasteWithoutGreedyLargestSize()
    {
        var result = SampleShippingContainerPacker.Preview([Size(6), Size(5)], 10);
        Assert.Equal(5, Assert.Single(result.Containers).Capacity);
        Assert.Equal(2, result.ContainerCount);
        Assert.Equal(0, result.UnusedCapacity);
    }

    [Fact]
    public void FewestContainersRanksBeforeWaste()
    {
        var result = SampleShippingContainerPacker.Preview([Size(20), Size(5)], 15);
        Assert.Equal(1, result.ContainerCount);
        Assert.Equal(5, result.UnusedCapacity);
    }

    [Fact]
    public void InsufficientAvailabilityReportsExactUnallocatedTubes()
    {
        var size = Size(5);
        var result = SampleShippingContainerPacker.Preview([size], 30, [new(size.Id, 4)]);
        Assert.False(result.IsComplete);
        Assert.Equal(10, result.UnallocatedTubes);
        Assert.Equal(20, result.TotalCapacity);
        Assert.Equal(0, result.UnusedCapacity);
    }

    [Fact]
    public void ZeroAvailabilityDoesNotInventContainers()
    {
        var size = Size(20);
        var result = SampleShippingContainerPacker.Preview([size], 30, [new(size.Id, 0)]);
        Assert.Empty(result.Containers);
        Assert.Equal(30, result.UnallocatedTubes);
        Assert.Equal(0, result.TotalCapacity);
    }

    [Fact]
    public void UnknownAvailabilityIsNotZeroAndNoCompatibleOptionsIsIncomplete()
    {
        var size = Size(5);
        Assert.True(SampleShippingContainerPacker.Preview([size], 30, []).IsComplete);
        var empty = SampleShippingContainerPacker.Preview([], 30);
        Assert.False(empty.IsComplete);
        Assert.Equal(30, empty.UnallocatedTubes);
    }

    [Theory]
    [InlineData(20, 2, 10)]
    [InlineData(5, 6, 0)]
    public void ValidCustomerAlternativesAreAccepted(int capacity, int quantity, int spare)
    {
        var sizes = new[] { Size(20), Size(10), Size(5) };
        var selected = sizes.Single(item => item.TubeCapacity == capacity);
        var result = SampleShippingContainerPacker.Preview(sizes, 30, selection: [new(selected.Id, quantity)]);
        Assert.True(result.IsComplete);
        Assert.Equal(quantity, result.ContainerCount);
        Assert.Equal(spare, result.UnusedCapacity);
    }

    [Fact]
    public void EmptySelectedContainersAreNotCreatedAndShortfallRemainsVisible()
    {
        var size = Size(20);
        var result = SampleShippingContainerPacker.Preview([size], 5, selection: [new(size.Id, 6)]);
        Assert.Equal(1, result.ContainerCount);
        Assert.Equal(15, result.UnusedCapacity);
        Assert.Equal(5, Assert.Single(result.Containers).AssignedTubes);
        Assert.Equal(30, SampleShippingContainerPacker.Preview([size], 30, selection: []).UnallocatedTubes);
    }

    [Fact]
    public void InvalidSelectionsRejectDuplicatesUnavailableAndUnknownDefinitions()
    {
        var size = Size(20);
        Assert.Throws<OrderManagementException>(() => SampleShippingContainerPacker.Preview([size], 30, [new(size.Id, 1)], [new(size.Id, 2)]));
        Assert.Throws<OrderManagementException>(() => SampleShippingContainerPacker.Preview([size], 30, selection: [new(size.Id, 1), new(size.Id, 1)]));
        Assert.Throws<OrderManagementException>(() => SampleShippingContainerPacker.Preview([size], 30, selection: [new(Guid.NewGuid(), 1)]));
        Assert.Throws<OrderManagementException>(() => SampleShippingContainerPacker.Preview([size], 30, [new(size.Id, -1)]));
    }

    [Fact]
    public void RecommendationTieBreakIsStableAndHandlesMaximumTubeRoster()
    {
        var first = Size(10, "0001");
        var second = Size(10, "0002");
        Assert.Equal(first.Id, Assert.Single(SampleShippingContainerPacker.Preview([second, first], 10).Containers).ContainerDefinitionId);
        var result = SampleShippingContainerPacker.Preview([Size(1), Size(19), Size(20)], 10000);
        Assert.Equal(500, result.ContainerCount);
        Assert.Equal(10000, result.TotalCapacity);
    }

    [Fact]
    public void ExactOptimizerMatchesExhaustiveSmallAvailabilityCases()
    {
        var sizes = new[] { Size(7), Size(4), Size(3) };
        for (var demand = 1; demand <= 25; demand++)
        for (var a = 0; a <= 2; a++)
        for (var b = 0; b <= 2; b++)
        for (var c = 0; c <= 2; c++)
        {
            var possibilities = (from x in Enumerable.Range(0, a + 1)
                                 from y in Enumerable.Range(0, b + 1)
                                 from z in Enumerable.Range(0, c + 1)
                                 select new { Capacity = 7 * x + 4 * y + 3 * z, Count = x + y + z }).ToArray();
            var covering = possibilities.Where(item => item.Capacity >= demand).OrderBy(item => item.Count).ThenBy(item => item.Capacity).FirstOrDefault();
            var result = SampleShippingContainerPacker.Preview(sizes, demand, [new(sizes[0].Id, a), new(sizes[1].Id, b), new(sizes[2].Id, c)]);
            if (covering is not null)
            {
                Assert.True(result.IsComplete);
                Assert.Equal(covering.Count, result.ContainerCount);
                Assert.Equal(covering.Capacity, result.TotalCapacity);
            }
            else Assert.Equal(demand - possibilities.Max(item => item.Capacity), result.UnallocatedTubes);
        }
    }

    [Fact]
    public void ContainerSkuRemainsTextAndInvalidCapacityOrEffectivePeriodIsRejected()
    {
        var type = new SampleShippingContainerType("  0012-ab  ");
        Assert.Equal("0012-ab", type.Sku);
        Assert.Equal("0012-AB", type.NormalizedSku);
        var now = DateTime.UtcNow;
        Assert.Throws<ArgumentException>(() => new SampleShippingContainerDefinition(type.Id, 1, null, "Small box", 0, null, null, null, now, null, false, 0));
        Assert.Throws<ArgumentException>(() => new SampleShippingContainerDefinition(type.Id, 1, null, "Small box", 20, null, null, null, now, now.AddDays(-1), false, 0));
        var definition = new SampleShippingContainerDefinition(type.Id, 1, null, "Small box", 20, null, null, null, now, null, false, 0);
        Assert.False(definition.IsActive);
        Assert.Equal(20, definition.TubeCapacity);
    }

    [Fact]
    public void DeactivationRetainsHistoryAndHandlesFutureEffectiveRevisions()
    {
        var now = DateTime.UtcNow;
        var active = new SampleShippingContainerDefinition(Guid.NewGuid(), 1, null, "Active", 20, null, null, null, now.AddDays(-1), null, true, 0);
        var future = new SampleShippingContainerDefinition(Guid.NewGuid(), 1, null, "Future", 20, null, null, null, now.AddDays(1), null, true, 0);
        active.Deactivate(now); future.Deactivate(now);
        Assert.False(active.IsActive); Assert.False(future.IsActive);
        Assert.Equal(now, active.EffectiveTo); Assert.Null(future.EffectiveTo);
        Assert.Equal(now, active.DeactivatedAt); Assert.Equal(now, future.DeactivatedAt);
        Assert.Equal(20, active.TubeCapacity);
    }

    [Fact]
    public void ReceivedPhysicalTubeCannotBeReleasedForAnotherAssignment()
    {
        var now = DateTime.UtcNow;
        var tube = new RegisteredSampleTube(Guid.NewGuid(), "RECEIVED-EXAMPLE");
        tube.MarkAssigned(now);
        tube.RecordReceipt(now);
        Assert.Throws<InvalidOperationException>(() => tube.MarkAvailable());
        Assert.Equal(RegisteredSampleTubeStatus.Assigned, tube.Status);
        Assert.Equal(now, tube.ReceivedAt);
    }
}
