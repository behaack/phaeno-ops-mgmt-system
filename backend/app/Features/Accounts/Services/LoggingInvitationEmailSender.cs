namespace PhaenoPortal.App.Features.Accounts.Services;

public sealed class LoggingInvitationEmailSender(
    ILogger<LoggingInvitationEmailSender> logger) : IInvitationEmailSender
{
    public Task<InvitationEmailSendResult> SendInvitationAsync(
        InvitationEmailMessage message,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Invitation {InvitationId} for {Email} to {OrganizationName}: {InviteUrl}",
            message.InvitationId,
            message.Email,
            message.OrganizationName,
            message.InviteUrl);

        return Task.FromResult(new InvitationEmailSendResult($"dev-{message.InvitationId:N}"));
    }
}
