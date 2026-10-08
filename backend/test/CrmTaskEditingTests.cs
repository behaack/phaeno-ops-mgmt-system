namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Crm.Services;

public sealed class CrmTaskEditingTests
{
    [Theory]
    [InlineData(CrmTaskStatus.Open)]
    [InlineData(CrmTaskStatus.InProgress)]
    [InlineData(CrmTaskStatus.Blocked)]
    public void ReschedulingPreservesWorkflowAndMovesAttention(CrmTaskStatus status)
    {
        var now = new DateTime(2026, 9, 16, 12, 0, 0, DateTimeKind.Utc);
        var task = new CrmTask("Follow up", null, Guid.NewGuid(), CrmTaskPriority.Normal,
            now.AddDays(-1), now.AddDays(-1).AddHours(-1), "WEEKLY", companyId: Guid.NewGuid());
        if (status == CrmTaskStatus.InProgress) task.Start();
        if (status == CrmTaskStatus.Blocked) task.Block("Waiting for reply");
        var tasks = new[] { task }.AsQueryable();
        Assert.Single(CrmAttentionFilters.Tasks(tasks, true, false, now));
        task.Update(task.Title, "Reviewed follow-up", CrmTaskPriority.High, now.AddDays(2), now.AddDays(2).AddHours(-2), task.RecurrenceRule);
        Assert.Equal(status, task.Status);
        Assert.Equal(status == CrmTaskStatus.Blocked ? "Waiting for reply" : null, task.BlockedReason);
        Assert.Empty(CrmAttentionFilters.Tasks(tasks, true, false, now));
        Assert.Single(CrmAttentionFilters.Tasks(tasks, false, true, now));
        Assert.Equal("WEEKLY", task.RecurrenceRule);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void TerminalTaskCannotBeEditedReassignedOrReopened(bool completed)
    {
        var owner = Guid.NewGuid();
        var due = DateTime.UtcNow;
        var task = new CrmTask("Retained task", null, owner, CrmTaskPriority.Normal, due, null, null, companyId: Guid.NewGuid());
        if (completed) task.Complete(owner, due); else task.Cancel();
        Assert.Throws<InvalidOperationException>(() => task.Update("Changed", null, CrmTaskPriority.High, due.AddDays(1), null, null));
        Assert.Throws<InvalidOperationException>(() => task.AssignOwner(Guid.NewGuid()));
        Assert.Throws<InvalidOperationException>(() => task.Reopen());
        Assert.Equal("Retained task", task.Title);
        Assert.Equal(due, task.DueAt);
        Assert.Equal(owner, task.OwnerUserId);
        Assert.Equal(completed ? CrmTaskStatus.Completed : CrmTaskStatus.Cancelled, task.Status);
    }

    [Fact]
    public void InvalidReminderDoesNotPartiallyRescheduleTask()
    {
        var due = DateTime.UtcNow;
        var task = new CrmTask("Follow up", null, Guid.NewGuid(), CrmTaskPriority.Normal, due, null, null, companyId: Guid.NewGuid());
        Assert.Throws<ArgumentException>(() => task.Update("Changed", "Draft", CrmTaskPriority.High, due.AddDays(1), due.AddDays(2), null));
        Assert.Equal("Follow up", task.Title);
        Assert.Equal(due, task.DueAt);
        Assert.Null(task.ReminderAt);
    }
}
