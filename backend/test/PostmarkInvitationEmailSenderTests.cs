namespace PhaenoPortal.Test;

using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Application;
using PhaenoPortal.App.Features.Accounts.Services;

public class PostmarkInvitationEmailSenderTests
{
    [Fact]
    public async Task SendInvitationPostsSingleEmailToPostmark()
    {
        HttpRequestMessage? sentRequest = null;
        string? sentBody = null;
        var handler = new StubHttpMessageHandler(request =>
        {
            sentRequest = request;
            sentBody = request.Content?.ReadAsStringAsync().GetAwaiter().GetResult();
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("""{"MessageID":"message-123"}""")
            };
        });
        using var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.postmarkapp.com/")
        };
        var sender = new PostmarkInvitationEmailSender(
            httpClient,
            Options.Create(new PostmarkOptions
            {
                ServerToken = "server-token",
                FromEmail = "invites@phaeno.test",
                FromName = "Phaeno Portal",
                MessageStream = "outbound"
            }));

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
        Assert.Equal("https://api.postmarkapp.com/email", sentRequest.RequestUri?.ToString());
        Assert.Equal(
            "server-token",
            Assert.Single(sentRequest.Headers.GetValues("X-Postmark-Server-Token")));

        Assert.NotNull(sentBody);
        var json = JsonSerializer.Deserialize<JsonElement>(sentBody);
        Assert.Equal("Phaeno Portal <invites@phaeno.test>", json.GetProperty("From").GetString());
        Assert.Equal("person@example.com", json.GetProperty("To").GetString());
        Assert.Equal("You have been invited to Acme Health", json.GetProperty("Subject").GetString());
        Assert.Equal("outbound", json.GetProperty("MessageStream").GetString());
        Assert.Contains("https://portal.example.test/accept-invite?token=abc", json.GetProperty("TextBody").GetString());
        Assert.Contains("Acme Health", json.GetProperty("HtmlBody").GetString());
    }

    private sealed class StubHttpMessageHandler(
        Func<HttpRequestMessage, HttpResponseMessage> handler) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(handler(request));
        }
    }
}
