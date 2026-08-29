namespace PhaenoPortal.App.Features.Accounts.Services;

using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Application;
using PhaenoPortal.App.Features.Website;

public sealed class MailgunInvitationEmailSender(
    HttpClient httpClient,
    IOptions<WebsiteEmailOptions> options,
    InvitationEmailTemplateRenderer templateRenderer) : IInvitationEmailSender
{
    private readonly WebsiteEmailOptions options = options.Value;

    public async Task<InvitationEmailSendResult> SendInvitationAsync(
        InvitationEmailMessage message,
        CancellationToken cancellationToken)
    {
        if (!options.CanSendTransactional)
        {
            throw new InvalidOperationException(
                "Mailgun invitation sender requires EmailServiceSettings API and sender configuration.");
        }

        var content = templateRenderer.Render(message);

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{options.Url.TrimEnd('/')}/{options.Resource.TrimStart('/')}");
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.ASCII.GetBytes($"api:{options.ApiKey}")));
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["from"] = options.AccountFrom,
            ["to"] = message.Email,
            ["subject"] = $"You have been invited to {message.OrganizationName}",
            ["text"] = content.Text,
            ["html"] = content.Html,
            ["o:tracking"] = "false",
            ["o:tracking-clicks"] = "no",
            ["o:tracking-opens"] = "no",
            ["o:require-tls"] = "true",
            ["o:skip-verification"] = "false",
            ["o:dkim"] = "yes",
            ["o:tag"] = "portal-invitation",
            ["v:invitation-id"] = message.InvitationId.ToString()
        });

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"Mailgun invitation email failed with {(int)response.StatusCode} {response.StatusCode}: {responseBody}",
                null,
                response.StatusCode);
        }

        var mailgunResponse = JsonSerializer.Deserialize<MailgunEmailResponse>(responseBody);
        var providerMessageId = NormalizeMessageId(mailgunResponse?.Id);
        if (string.IsNullOrWhiteSpace(providerMessageId))
            throw new InvalidOperationException("Mailgun accepted the invitation without a message identifier.");

        return new InvitationEmailSendResult(providerMessageId);
    }

    internal static string? NormalizeMessageId(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim().Trim('<', '>');

    private sealed record MailgunEmailResponse(
        [property: JsonPropertyName("id")] string? Id);
}
