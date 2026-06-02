namespace PhaenoPortal.App.Features.Accounts.Services;

public interface IInvitationEmailSender
{
    Task<InvitationEmailSendResult> SendInvitationAsync(
        InvitationEmailMessage message,
        CancellationToken cancellationToken);
}

public sealed record InvitationEmailMessage(
    Guid InvitationId,
    string Email,
    string OrganizationName,
    string InviteUrl);

public sealed record InvitationEmailSendResult(string? ProviderMessageId);
