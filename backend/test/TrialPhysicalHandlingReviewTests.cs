namespace PhaenoPortal.Test;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Infrastructure.Persistence;

public partial class TrialProjectPostgresTests
{
    private static async Task VerifyPhysicalHandlingAndLocations(HttpClient client, PSeqOperationsDbContext db, Guid workId, Guid specimenId)
    {
        const string root = "/api/platform/lab-operations";
        var tube = new LabContainer(workId, specimenId, null, LabContainerKind.Other, "ORDER-" + Guid.NewGuid().ToString("N"), "TEST ONLY handling order", "TEST staging", 2, "uL", null);
        db.Add(tube); await db.SaveChangesAsync();
        async Task<JsonElement> Success(HttpResponseMessage response)
        {
            using (response) { var body = await response.Content.ReadFromJsonAsync<JsonElement>(); Assert.True(response.IsSuccessStatusCode, body.ToString()); return body.GetProperty("data").Clone(); }
        }
        async Task<JsonElement> Box(string label) => await Success(await client.PostAsJsonAsync(root + "/storage-boxes",
            new StorageBoxInput(Guid.NewGuid(), label + Guid.NewGuid().ToString("N"), "TEST room", "TEST freezer", "TEST rack", "TEST original shelf", "TEST registration")));
        var firstBox = await Box("ORDER-A-"); var secondBox = await Box("ORDER-B-");
        async Task<HttpResponseMessage> Record(string kind, string? occurred = null, string? destination = null) =>
            await client.PostAsJsonAsync($"{root}/containers/{tube.Id}/physical", new PhysicalContainerInput(Guid.NewGuid(),
                await db.LabContainers.AsNoTracking().Where(c => c.Id == tube.Id).Select(c => c.Version).SingleAsync(), kind, tube.Barcode,
                "TEST actual handling", occurred, "TEST handover", destination, "TEST tracking"));
        await Success(await Record("Placed", destination: firstBox.GetProperty("barcode").GetString()));
        var first = await db.Set<LabPhysicalEvent>().AsNoTracking().SingleAsync(e => e.LabContainerId == tube.Id);
        await Success(await Record("Placed", destination: secondBox.GetProperty("barcode").GetString()));
        var current = await db.LabContainers.AsNoTracking().SingleAsync(c => c.Id == tube.Id);
        var late = first.OccurredAtUtc.ToString("yyyy-MM-dd'T'HH:mm:ss.ffffff+00:00", System.Globalization.CultureInfo.InvariantCulture);
        foreach (var kind in new[] { "Placed", "Returned" })
        {
            using var response = await Record(kind, late, kind == "Placed" ? firstBox.GetProperty("barcode").GetString() : "TEST approved destination");
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal("physical_chronology_conflict", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("error").GetProperty("code").GetString());
            var unchanged = await db.LabContainers.AsNoTracking().SingleAsync(c => c.Id == tube.Id);
            Assert.Equal(current.Version, unchanged.Version); Assert.Equal(current.StorageBoxId, unchanged.StorageBoxId); Assert.Equal(current.Status, unchanged.Status);
            Assert.Equal(2, await db.Set<LabPhysicalEvent>().CountAsync(e => e.LabContainerId == tube.Id));
        }
        // An explicit precise time after the last placement remains recordable, including the same minute.
        var actual = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.ffffff+00:00", System.Globalization.CultureInfo.InvariantCulture);
        await Success(await Record("Returned", actual, "TEST approved destination"));
        var physical = await Success(await client.GetAsync($"{root}/containers/{tube.Id}/physical"));
        Assert.Equal(JsonValueKind.Null, physical.GetProperty("box").ValueKind);
        var locations = physical.GetProperty("history").GetProperty("locations"); Assert.Equal(2, locations.GetArrayLength());
        Assert.All(locations.EnumerateArray(), l => Assert.Equal("TEST original shelf", l.GetProperty("location").GetProperty("shelf").GetString()));
        Assert.Empty(physical.GetProperty("history").GetProperty("boxMoves").EnumerateArray());
        var reportId = Guid.NewGuid();
        var trialId = await db.TrialSamples.Where(s => s.LabWorkOrderId == workId).Select(s => s.TrialProjectId).SingleAsync();
        var trial = await db.TrialProjects.SingleAsync(t => t.Id == trialId);
        var closedStatus = trial.Status;
        trial.SetHold(true, "TEST preserve material while generating internal report"); await db.SaveChangesAsync();
        await Success(await client.PostAsJsonAsync($"{root}/work-orders/{workId}/specimens/{specimenId}/investigation/reports", new { requestId = reportId }));
        var stillHeld = await db.TrialProjects.AsNoTracking().SingleAsync(t => t.Id == trialId);
        Assert.True(stillHeld.IsOnHold); Assert.Equal(closedStatus, stillHeld.Status);
        var saved = await db.LabInvestigationReports.AsNoTracking().SingleAsync(r => r.Id == reportId);
        using (var manifest = JsonDocument.Parse(saved.BodyJson))
            Assert.Equal(2, manifest.RootElement.GetProperty("snapshot").GetProperty("evidence").GetProperty("storageLocations").EnumerateArray()
                .Count(l => l.GetProperty("labContainerId").GetGuid() == tube.Id));
        client.DefaultRequestHeaders.Authorization = new("Bearer", "custody-customer");
        using (var forbidden = await client.PostAsJsonAsync($"{root}/work-orders/{workId}/specimens/{specimenId}/investigation/reports", new { requestId = Guid.NewGuid() }))
            Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        client.DefaultRequestHeaders.Authorization = new("Bearer", "custody-staff");
        await Success(await client.PostAsJsonAsync(root + "/storage-boxes", new StorageBoxInput(Guid.NewGuid(), secondBox.GetProperty("barcode").GetString()!,
            "TEST later room", "TEST later freezer", "TEST later rack", "TEST later shelf", "TEST move after departure", secondBox.GetProperty("version").GetInt64())));
        var investigation = await Success(await client.GetAsync($"{root}/work-orders/{workId}/specimens/{specimenId}/investigation"));
        var evidence = investigation.GetProperty("evidence");
        var selected = evidence.GetProperty("storageLocations").EnumerateArray().Where(l => l.GetProperty("labContainerId").GetGuid() == tube.Id).ToArray();
        Assert.Equal(2, selected.Length); Assert.All(selected, l => Assert.Equal("TEST original shelf", l.GetProperty("location").GetProperty("shelf").GetString()));
        Assert.DoesNotContain("TEST later shelf", JsonSerializer.Serialize(selected));
        Assert.DoesNotContain(evidence.GetProperty("storageBoxes").EnumerateArray(), b => b.GetProperty("id").GetGuid() == secondBox.GetProperty("id").GetGuid());
        var original = await db.LabInvestigationReports.AsNoTracking().SingleAsync(r => r.Id == reportId);
        Assert.Equal(saved.BodyJson, original.BodyJson); Assert.Equal(saved.Sha256, original.Sha256);
    }
}
