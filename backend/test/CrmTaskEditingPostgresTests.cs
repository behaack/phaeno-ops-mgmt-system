namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Crm.Controllers;
using PhaenoPortal.App.Features.Crm.DTOs;
using PhaenoPortal.App.Features.Crm.Services;

public sealed partial class CrmCommercialAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task TaskEditsPersistAuditRejectStaleReplayAndShiftNextRecurrence()
    {
        await using var scope = await Scope.Create();
        var company = new CrmCompany($"TEST ONLY task editing {Guid.NewGuid():N}", scope.Actor.Id);
        scope.Db.Add(company);
        await scope.Db.SaveChangesAsync();
        var controller = scope.Controller(new CrmWorkController(scope.Db, scope.Identity));
        var due = new DateTime(2026, 9, 17, 12, 0, 0, DateTimeKind.Utc);
        var create = new UpsertCrmTaskRequest("TEST ONLY follow-up", null, scope.Actor.Id, CrmTaskPriority.Normal,
            due, due.AddHours(-1), "WEEKLY", company.Id, null, null, null, null);
        var created = Assert.IsType<CrmTaskDto>(Assert.IsType<CreatedResult>((await controller.CreateTask(create, default)).Result).Value);
        scope.Db.ChangeTracker.Clear();
        var edit = create with { DueAt = due.AddDays(2), ReminderAt = due.AddDays(2).AddHours(-2), Priority = CrmTaskPriority.High, Version = created.Version };
        var saved = await controller.UpdateTask(created.Id, edit, default);
        Assert.Equal(CrmTaskStatus.Open, saved.Status);
        Assert.Equal(edit.DueAt, saved.DueAt);
        Assert.Equal(created.Version + 1, saved.Version);
        scope.Db.ChangeTracker.Clear();
        Assert.Equal(saved, await controller.GetTask(saved.Id, default));
        var history = await scope.Db.CrmActivities.AsNoTracking().Where(value => value.CompanyId == company.Id && value.Subject == "Task updated").ToListAsync();
        var entry = Assert.Single(history);
        Assert.Equal(scope.Actor.Id, entry.ActorUserId);
        Assert.Equal(CrmActivityType.TaskEvent, entry.Type);
        Assert.Contains("Due: 2026-09-17 12:00:00 UTC → 2026-09-19 12:00:00 UTC", entry.Body);
        Assert.Contains("Reminder: 2026-09-17 11:00:00 UTC → 2026-09-19 10:00:00 UTC", entry.Body);
        Assert.Contains("Priority: Normal → High", entry.Body);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => controller.UpdateTask(saved.Id, edit, default));
        Assert.Equal(1, await scope.Db.CrmActivities.CountAsync(value => value.CompanyId == company.Id && value.Subject == "Task updated"));
        scope.Db.ChangeTracker.Clear();
        var completed = await controller.ChangeTaskStatus(saved.Id, new(CrmTaskStatus.Completed, null, saved.Version), default);
        scope.Db.ChangeTracker.Clear();
        var next = await scope.Db.CrmTasks.AsNoTracking().SingleAsync(value => value.CompanyId == company.Id && value.Id != saved.Id);
        Assert.Equal(edit.DueAt!.Value.AddDays(7), next.DueAt);
        Assert.Equal(next.DueAt!.Value.AddHours(-2), next.ReminderAt);
        Assert.Equal(CrmTaskPriority.High, next.Priority);
        Assert.Equal(409, (await Assert.ThrowsAsync<CrmException>(() => controller.UpdateTask(saved.Id, edit with { Version = completed.Version }, default))).StatusCode);
        Assert.Equal(409, (await Assert.ThrowsAsync<CrmException>(() => controller.ChangeTaskStatus(saved.Id, new(CrmTaskStatus.Open, null, completed.Version), default))).StatusCode);
        scope.Db.ChangeTracker.Clear();
        Assert.Equal(2, await scope.Db.CrmTasks.CountAsync(value => value.CompanyId == company.Id));
        scope.Role.SetActive(false);
        scope.Db.Attach(scope.Role);
        scope.Db.Entry(scope.Role).State = EntityState.Modified;
        await scope.Db.SaveChangesAsync();
        await Forbidden(() => controller.GetTask(saved.Id, default));
        await Forbidden(() => controller.UpdateTask(next.Id, edit with { Version = next.Version }, default));
    }
}
