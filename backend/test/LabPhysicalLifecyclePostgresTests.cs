namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task PhysicalBoxOccupancyMovesAndFinalDispositionAreScopedReplayableAndImmutable()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext; var lab = scope.CreateLabController();
        var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, Guid.NewGuid(), scope.CustomerOrganization.Id, "physical", 1, "test", null);
        var otherWork = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, Guid.NewGuid(), scope.OtherCustomerOrganization.Id, "physical", 1, "test", null);
        var tube = new LabContainer(work.Id, null, null, LabContainerKind.Other, $"PHYSICAL-{scope.Suffix}", "TEST ONLY", "Bench", 10, "uL", null);
        var other = new LabContainer(otherWork.Id, null, null, LabContainerKind.Other, $"OTHER-{scope.Suffix}", "TEST ONLY", "Bench", 20, "uL", null);
        db.AddRange(work, otherWork, tube, other); await db.SaveChangesAsync();
        var registration = new StorageBoxInput(Guid.NewGuid(), $"BOX-{scope.Suffix}", "Room", "Freezer", "Rack", "Shelf 1", "TEST ONLY registration");
        var box = await lab.SaveStorageBox(registration, default);
        Assert.Equal(box.Id, (await lab.SaveStorageBox(registration, default)).Id);
        var placement = new PhysicalContainerInput(Guid.NewGuid(), tube.Version, "Placed", "  " + tube.Barcode.ToLowerInvariant() + "  ", "TEST ONLY placement", Destination: box.Barcode, Position: "A1");
        var placed = await lab.RecordPhysicalContainer(tube.Id, placement, default);
        Assert.Equal(placed.Id, (await lab.RecordPhysicalContainer(tube.Id, placement, default)).Id);
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.RecordPhysicalContainer(other.Id,
            new(Guid.NewGuid(), other.Version, "Placed", other.Barcode, "TEST collision", Destination: box.Barcode, Position: "A1"), default));
        db.ChangeTracker.Clear();
        other = await db.LabContainers.SingleAsync(c => c.Id == other.Id);
        var placedOther = await lab.RecordPhysicalContainer(other.Id, new(Guid.NewGuid(), other.Version, "Placed", other.Barcode, "TEST ONLY other placement", Destination: box.Barcode, Position: "B1"), default);
        await lab.RecordPhysicalContainer(other.Id, new(Guid.NewGuid(), placedOther.Version, "Transferred", other.Barcode, "TEST ONLY handover", Method: "Sealed tube handover", Destination: "TEST archive", TrackingReference: "TEST-HANDOVER"), default);
        db.ChangeTracker.Clear(); box = await db.Set<LabStorageBox>().SingleAsync(b => b.Id == box.Id);
        await lab.SaveStorageBox(registration with { RequestId = Guid.NewGuid(), Version = box.Version, Shelf = "Shelf 2", Reason = "TEST ONLY collective move" }, default);
        var selected = await new LabPhysicalHistory(db).ReadAsync([tube.Id], default);
        Assert.Single(selected.BoxMoves); Assert.All(selected.Events, e => Assert.Equal(tube.Id, e.LabContainerId));
        var departed = await new LabPhysicalHistory(db).ReadAsync([other.Id], default); Assert.Empty(departed.BoxMoves);
        db.ChangeTracker.Clear(); tube = await db.LabContainers.SingleAsync(c => c.Id == tube.Id);
        var held = await lab.RecordPhysicalContainer(tube.Id, new(Guid.NewGuid(), tube.Version, "HoldPlaced", tube.Barcode, "TEST incident"), default);
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.RecordPhysicalContainer(tube.Id,
            new(Guid.NewGuid(), held.Version, "Exhausted", tube.Barcode, "TEST invalid exhaustion", Method: "TEST"), default));
        db.ChangeTracker.Clear();
        var frozen = await db.Set<LabPhysicalEvent>().FirstAsync(e => e.LabContainerId == tube.Id);
        db.Remove(frozen); await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
        db.ChangeTracker.Clear();
        var queue = JsonSerializer.SerializeToElement(await lab.PhysicalRetention("holds", 1), JsonSerializerOptions.Web);
        Assert.Contains(queue.GetProperty("items").EnumerateArray(), row => row.GetProperty("id").GetGuid() == tube.Id);
    }
}
