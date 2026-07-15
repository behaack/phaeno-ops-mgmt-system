namespace PhaenoPortal.App.Features.DataProvisioning.Services;

using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;

public sealed class PostmarkDataProvisioningNoticeSender(
    HttpClient httpClient,
    IOptions<PostmarkOptions> options) : IDataProvisioningNoticeSender
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = null
    };

    private readonly PostmarkOptions options = options.Value;

    public async Task SendAsync(
        DataProvisioningNoticeMessage message,
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
                    Subject: message.Subject,
                    TextBody: message.Body,
                    HtmlBody: $"<p>{WebUtility.HtmlEncode(message.Body).Replace("\n", "<br>", StringComparison.Ordinal)}</p>",
                    MessageStream: this.options.MessageStream),
                JsonOptions),
            Encoding.UTF8,
            "application/json");

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException(
                $"Postmark data-provisioning notice failed with {(int)response.StatusCode} {response.StatusCode}: {responseBody}",
                null,
                response.StatusCode);
        }
    }

    private static string BuildFromAddress(PostmarkOptions options) =>
        string.IsNullOrWhiteSpace(options.FromName)
            ? options.FromEmail
            : $"{options.FromName} <{options.FromEmail}>";

    private sealed record PostmarkEmailRequest(
        string From,
        string To,
        string Subject,
        string TextBody,
        string HtmlBody,
        string MessageStream);
}
