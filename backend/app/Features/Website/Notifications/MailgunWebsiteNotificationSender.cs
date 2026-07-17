using System.Net.Http.Headers;
using System.Text;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Website.Entities;

namespace PhaenoPortal.App.Features.Website.Notifications;

public sealed class MailgunWebsiteNotificationSender(
    HttpClient httpClient,
    IOptions<WebsiteEmailOptions> emailOptions,
    IOptions<WebsiteApiOptions> websiteOptions,
    ILogger<MailgunWebsiteNotificationSender> logger) : IWebsiteNotificationSender
{
    private readonly WebsiteEmailOptions emailOptions = emailOptions.Value;
    private readonly WebsiteApiOptions websiteOptions = websiteOptions.Value;

    public Task SendContactAsync(
        WebContact contact,
        CancellationToken cancellationToken = default) =>
        SendAsync(
            "new-mailing-list-contact",
            EmailAddress(emailOptions.PhaenoAccountName, emailOptions.AccountTo),
            new Dictionary<string, string?>
            {
                ["firstName"] = contact.FirstName,
                ["lastName"] = contact.LastName,
                ["organizationName"] = contact.OrganizationName,
                ["email"] = contact.Email,
                ["sendBrochure"] = (contact.SendBrochure == true).ToString()
            },
            cancellationToken);

    public Task SendTechnicalBriefAsync(
        WebContact contact,
        CancellationToken cancellationToken = default) =>
        SendAsync(
            "fulfill-web-technical-brief-request",
            EmailAddress(contact.FirstName, contact.LastName, contact.Email),
            new Dictionary<string, string?>
            {
                ["firstName"] = contact.FirstName,
                ["lastName"] = contact.LastName,
                ["technicalBriefPath"] = websiteOptions.TechnicalBriefUrl
            },
            cancellationToken);

    public Task SendOrderAsync(
        WebOrder order,
        CancellationToken cancellationToken = default) =>
        SendAsync(
            "new-web-order",
            EmailAddress(emailOptions.PhaenoAccountName, emailOptions.AccountTo),
            new Dictionary<string, string?>
            {
                ["firstName"] = order.FirstName,
                ["lastName"] = order.LastName,
                ["organizationName"] = order.OrganizationName,
                ["email"] = order.Email,
                ["description"] = order.Description
            },
            cancellationToken);

    private async Task SendAsync(
        string template,
        string to,
        IReadOnlyDictionary<string, string?> variables,
        CancellationToken cancellationToken)
    {
        var form = new Dictionary<string, string>
        {
            ["from"] = emailOptions.AccountFrom,
            ["to"] = to,
            ["template"] = template,
            ["o:tracking"] = "false",
            ["o:tracking-clicks"] = "no",
            ["o:require-tls"] = "true",
            ["o:skip-verification"] = "true",
            ["o:dkim"] = "yes",
            ["o:tag"] = "transactional"
        };
        foreach (var (key, value) in variables)
        {
            if (value is not null)
            {
                form[$"v:{key}"] = value;
            }
        }

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{emailOptions.Url.TrimEnd('/')}/{emailOptions.Resource.TrimStart('/')}");
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(
                Encoding.ASCII.GetBytes($"api:{emailOptions.ApiKey}")));
        request.Content = new FormUrlEncodedContent(form);

        try
        {
            using var response = await httpClient.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception,
                "Mailgun failed to send Website template {Template}. The submission remains persisted.",
                template);
        }
    }

    private static string EmailAddress(string firstName, string lastName, string email) =>
        EmailAddress($"{firstName} {lastName}".Trim(), email);

    private static string EmailAddress(string name, string email) =>
        $"{name} <{email}>";
}
