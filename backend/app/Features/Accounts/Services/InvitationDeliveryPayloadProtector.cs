namespace PhaenoPortal.App.Features.Accounts.Services;

using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;

public sealed record InvitationDeliveryPayload(
    Guid InvitationId,
    string RecipientEmail,
    string OrganizationName,
    string InviteUrl);

public interface IInvitationDeliveryPayloadProtector
{
    string Protect(InvitationDeliveryPayload payload);
    InvitationDeliveryPayload Unprotect(string protectedPayload);
}

public sealed class InvitationDeliveryPayloadProtector(
    IDataProtectionProvider dataProtectionProvider) : IInvitationDeliveryPayloadProtector
{
    private const string Purpose = "PSeq.Operations.Accounts.InvitationDelivery.v1";
    private readonly IDataProtector protector = dataProtectionProvider.CreateProtector(Purpose);

    public string Protect(InvitationDeliveryPayload payload) =>
        protector.Protect(JsonSerializer.Serialize(payload));

    public InvitationDeliveryPayload Unprotect(string protectedPayload) =>
        JsonSerializer.Deserialize<InvitationDeliveryPayload>(protector.Unprotect(protectedPayload))
        ?? throw new InvalidOperationException("The invitation delivery payload is invalid.");
}
