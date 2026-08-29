namespace PhaenoPortal.App.Features.DataProvisioning.Services;

using System.Net;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.DataProvisioning.Application;
using PhaenoPortal.App.Features.Website;

public sealed class MailgunDataProvisioningNoticeSender(
    HttpClient httpClient,
    IOptions<WebsiteEmailOptions> options) : IDataProvisioningNoticeSender
{
    private readonly WebsiteEmailOptions options = options.Value;

    public async Task SendAsync(
        DataProvisioningNoticeMessage message,
        CancellationToken cancellationToken)
    {
        if (!options.CanSendTransactional)
        {
            throw new InvalidOperationException(
                "Mailgun data-provisioning sender requires API and sender configuration.");
        }

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
            ["subject"] = message.Subject,
            ["text"] = message.Body,
            ["html"] = $"<p>{WebUtility.HtmlEncode(message.Body).Replace("\n", "<br>", StringComparison.Ordinal)}</p>",
            ["o:tracking"] = "false",
            ["o:tracking-clicks"] = "no",
            ["o:tracking-opens"] = "no",
            ["o:require-tls"] = "true",
            ["o:skip-verification"] = "false",
            ["o:dkim"] = "yes",
            ["o:tag"] = "portal-data-provisioning"
        });

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException(
                $"Mailgun data-provisioning notice failed with {(int)response.StatusCode} {response.StatusCode}: {responseBody}",
                null,
                response.StatusCode);
        }
    }
}
