namespace PhaenoPortal.Test;

using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Application;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Website;

public class MailgunInvitationEmailSenderTests
{
    [Fact]
    public async Task SendInvitationPostsSingleEmailToMailgun()
    {
        HttpRequestMessage? sentRequest = null;
        string? sentBody = null;
        var handler = new StubHttpMessageHandler(request =>
        {
            sentRequest = request;
            sentBody = request.Content?.ReadAsStringAsync().GetAwaiter().GetResult();
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("""{"id":"<message-123>","message":"Queued. Thank you."}""")
            };
        });
        using var httpClient = new HttpClient(handler);
        var sender = new MailgunInvitationEmailSender(
            httpClient,
            Options.Create(new WebsiteEmailOptions
            {
                Url = "https://api.mailgun.net/v3/mg.phaeno.test",
                Resource = "messages",
                ApiKey = "mailgun-api-key",
                AccountFrom = "Phaeno Portal <invites@mg.phaeno.test>",
                AccountTo = "info@phaeno.test"
            }),
            new InvitationEmailTemplateRenderer());

        var result = await sender.SendInvitationAsync(
            new InvitationEmailMessage(
                Guid.NewGuid(),
                "person@example.com",
                "Acme Health",
                "https://portal.example.test/accept-invite?token=abc"),
            CancellationToken.None);

        Assert.Equal("message-123", result.ProviderMessageId);
        Assert.NotNull(sentRequest);
        Assert.Equal(HttpMethod.Post, sentRequest.Method);
        Assert.Equal(
            "https://api.mailgun.net/v3/mg.phaeno.test/messages",
            sentRequest.RequestUri?.ToString());
        Assert.Equal("Basic", sentRequest.Headers.Authorization?.Scheme);
        Assert.Equal(
            Convert.ToBase64String(Encoding.ASCII.GetBytes("api:mailgun-api-key")),
            sentRequest.Headers.Authorization?.Parameter);

        Assert.NotNull(sentBody);
        var form = ParseForm(sentBody);
        Assert.Equal("Phaeno Portal <invites@mg.phaeno.test>", form["from"]);
        Assert.Equal("person@example.com", form["to"]);
        Assert.Equal("You have been invited to Acme Health", form["subject"]);
        Assert.Equal("portal-invitation", form["o:tag"]);
        Assert.Equal("true", form["o:require-tls"]);
        Assert.Equal("false", form["o:skip-verification"]);
        Assert.Contains("https://portal.example.test/accept-invite?token=abc", form["text"]);
        Assert.Contains("Acme Health", form["html"]);
    }

    [Fact]
    public void TemplateRendererUsesLocaleNamedEmbeddedTemplatesAndEscapesHtml()
    {
        var rendered = new InvitationEmailTemplateRenderer().Render(
            new InvitationEmailMessage(
                Guid.NewGuid(),
                "person@example.com",
                "Research & Development <Team>",
                "https://portal.example.test/accept-invite?token=a&next=b"));

        Assert.Contains("Research &amp; Development &lt;Team&gt;", rendered.Html);
        Assert.Contains("token=a&amp;next=b", rendered.Html);
        Assert.Contains("Research & Development <Team>", rendered.Text);
        Assert.DoesNotContain("{{organization_name}}", rendered.Html);
        Assert.DoesNotContain("{{invite_url}}", rendered.Text);
    }

    [Fact]
    public void WebhookVerifierAcceptsOnlyValidMailgunHmac()
    {
        const string timestamp = "1788050000";
        const string token = "mailgun-webhook-token";
        const string key = "mailgun-webhook-signing-key";
        var signature = Convert.ToHexString(HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(key),
            Encoding.UTF8.GetBytes(timestamp + token))).ToLowerInvariant();
        var verifier = new MailgunWebhookSignatureVerifier(
            Options.Create(new WebsiteEmailOptions { WebhookSigningKey = key }));

        Assert.True(verifier.IsAuthentic(timestamp, token, signature));
        Assert.True(verifier.IsAuthentic(timestamp, token, "bad-signature", signature));
        Assert.False(verifier.IsAuthentic(timestamp, token, "00"));
        Assert.False(verifier.IsAuthentic(timestamp, "changed-token", signature));
    }

    [Fact]
    public void ProductionValidationRequiresMailgunSenderWebhookAndPortalConfiguration()
    {
        var valid = new WebsiteEmailOptions
        {
            Url = "https://api.mailgun.net/v3/mg.phaeno.test",
            Resource = "messages",
            ApiKey = "mailgun-api-key",
            AccountFrom = "Phaeno Portal <invites@mg.phaeno.test>",
            WebhookSigningKey = "mailgun-webhook-signing-key"
        };

        Assert.Empty(valid.ValidateInvitationProduction("https://portal.phaeno.test"));
        Assert.NotEmpty(new WebsiteEmailOptions().ValidateInvitationProduction("http://portal.phaeno.test"));
    }

    private static Dictionary<string, string> ParseForm(string body) =>
        body.Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2))
            .ToDictionary(
                part => Uri.UnescapeDataString(part[0].Replace('+', ' ')),
                part => Uri.UnescapeDataString(part.ElementAtOrDefault(1)?.Replace('+', ' ') ?? string.Empty));

    private sealed class StubHttpMessageHandler(
        Func<HttpRequestMessage, HttpResponseMessage> handler) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken) => Task.FromResult(handler(request));
    }
}
