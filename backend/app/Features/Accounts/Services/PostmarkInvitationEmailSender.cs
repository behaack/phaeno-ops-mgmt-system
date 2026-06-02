namespace PhaenoPortal.App.Features.Accounts.Services;

using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

public sealed class PostmarkInvitationEmailSender(
    HttpClient httpClient,
    IOptions<PostmarkOptions> options) : IInvitationEmailSender
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = null
    };

    private readonly PostmarkOptions options = options.Value;

    public async Task<InvitationEmailSendResult> SendInvitationAsync(
        InvitationEmailMessage message,
        CancellationToken cancellationToken)
    {
        if (!this.options.IsConfigured)
        {
            throw new InvalidOperationException(
                "Postmark sender requires Postmark:ServerToken and Postmark:FromEmail.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "email");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.Add("X-Postmark-Server-Token", this.options.ServerToken);
        request.Content = new StringContent(
            JsonSerializer.Serialize(
                new PostmarkEmailRequest(
                    From: BuildFromAddress(this.options),
                    To: message.Email,
                    Subject: $"You have been invited to {message.OrganizationName}",
                    TextBody: BuildTextBody(message),
                    HtmlBody: BuildHtmlBody(message),
                    MessageStream: this.options.MessageStream),
                JsonOptions),
            Encoding.UTF8,
            "application/json");

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"Postmark invitation email failed with {(int)response.StatusCode} {response.StatusCode}: {responseBody}",
                null,
                response.StatusCode);
        }

        var postmarkResponse = JsonSerializer.Deserialize<PostmarkEmailResponse>(
            responseBody,
            JsonOptions);

        return new InvitationEmailSendResult(postmarkResponse?.MessageID);
    }

    private static string BuildFromAddress(PostmarkOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.FromName))
        {
            return options.FromEmail;
        }

        return $"{options.FromName} <{options.FromEmail}>";
    }

    private static string BuildTextBody(InvitationEmailMessage message)
    {
        return $"""
            You have been invited to {message.OrganizationName} in Phaeno Portal.

            Accept or decline your invitation:
            {message.InviteUrl}

            This invitation link is intended only for {message.Email}.
            """;
    }

    private static string BuildHtmlBody(InvitationEmailMessage message)
    {
        var organizationName = WebUtility.HtmlEncode(message.OrganizationName);
        var inviteUrl = WebUtility.HtmlEncode(message.InviteUrl);
        var email = WebUtility.HtmlEncode(message.Email);

        return $"""
            <!doctype html>
            <html lang="en">
              <body>
                <p>You have been invited to <strong>{organizationName}</strong> in Phaeno Portal.</p>
                <p><a href="{inviteUrl}">Accept or decline your invitation</a></p>
                <p>This invitation link is intended only for {email}.</p>
              </body>
            </html>
            """;
    }

    private sealed record PostmarkEmailRequest(
        string From,
        string To,
        string Subject,
        string TextBody,
        string HtmlBody,
        string MessageStream);

    private sealed record PostmarkEmailResponse(string? MessageID);
}
