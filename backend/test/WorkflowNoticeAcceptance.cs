namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Application;
using PSeq.Operations.Commercial.OrderManagement.Domain;

internal static class WorkflowNoticeAcceptance
{
    // Called only for actual transitions in disposable acceptance fixtures; no real sender.
    public static async Task VerifyRetry(PSeqOperationsDbContext db, Guid workflowId, string expectedEmail)
    {
        var notices = await db.OrderNotifications.Where(value => value.WorkflowId == workflowId).ToArrayAsync();
        Assert.NotEmpty(notices);
        foreach (var notice in notices)
        {
            var body = notice.Body; var eventType = notice.EventType; var created = notice.CreatedAt;
            if (notice.EventType.StartsWith("trial-", StringComparison.Ordinal) || notice.EventType == "pseq-result-released")
            {
                var link = Assert.Single(body.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries), value => Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme == "https");
                var uri = new Uri(link);
                Assert.Equal((notice.EventType == "pseq-result-released" ? "/lab-services/" : "/trial-projects/") + workflowId, uri.AbsolutePath);
                Assert.Empty(uri.Query); Assert.Empty(uri.UserInfo);
            }
            var sender = new Sender();
            notice.BeginAttempt(DateTime.UtcNow.AddMinutes(1)); await db.SaveChangesAsync();
            await OrderNotificationDispatcher.DeliverAsync(db, sender, notice.Id, notice.Version, NullLogger.Instance, default);
            Assert.Equal(OrderNotificationStatus.Failed, notice.Status);
            notice.Retry(DateTime.UtcNow); notice.BeginAttempt(DateTime.UtcNow.AddMinutes(1)); await db.SaveChangesAsync();
            sender.Fail = false;
            await OrderNotificationDispatcher.DeliverAsync(db, sender, notice.Id, notice.Version, NullLogger.Instance, default);
            Assert.Equal(OrderNotificationStatus.Sent, notice.Status);
            Assert.Contains(expectedEmail, sender.Recipients);
            Assert.Equal(body, notice.Body); Assert.Equal(eventType, notice.EventType); Assert.Equal(created, notice.CreatedAt);
            Assert.DoesNotContain("PRIVATE-INTERNAL", notice.Body);
            var sent = sender.Calls;
            await OrderNotificationDispatcher.DeliverAsync(db, sender, notice.Id, notice.Version, NullLogger.Instance, default);
            Assert.Equal(sent, sender.Calls); // Same completed notice is not sent again.
        }
        Assert.Equal(notices.Length, await db.OrderNotifications.CountAsync(value => value.WorkflowId == workflowId));
    }

    private sealed class Sender : IOrderNotificationSender
    {
        public bool Fail { get; set; } = true;
        public int Calls { get; private set; }
        public List<string> Recipients { get; } = [];
        public Task SendAsync(IReadOnlyList<string> recipients, string subject, string body, CancellationToken token)
        {
            Calls++;
            if (Fail) throw new IOException("SIMULATED sender unavailable");
            Recipients.AddRange(recipients); return Task.CompletedTask;
        }
    }
}
