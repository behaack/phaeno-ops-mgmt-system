namespace PSeq.Operations.Commercial.Accounts.Application;

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
    string InviteUrl,
    string Locale = "en-US");

public sealed record InvitationEmailSendResult(string? ProviderMessageId);
