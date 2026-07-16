namespace PSeq.Operations.Commercial.OrderManagement.Application;

public interface IOrderNotificationSender
{
    Task SendAsync(
        IReadOnlyList<string> recipients,
        string subject,
        string body,
        CancellationToken cancellationToken);
}
