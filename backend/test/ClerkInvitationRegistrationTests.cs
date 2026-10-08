namespace PhaenoPortal.Test;

using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PSeq.Operations.Commercial.Accounts.Domain;

public class ClerkInvitationRegistrationTests
{
    private static OrganizationInvitation Invite() => new(Guid.NewGuid(), "invited@example.com", "Invited", "Person", false, "token-hash", DateTime.UtcNow.AddDays(7));
    private const string Url = "https://identity.example.test/v1/tickets/private-test-ticket";

    [Fact]
    public async Task ExistingIdentityUsesSignInWithoutCreatingProviderInvitation()
    {
        var calls = 0;
        var service = Create(async request =>
        {
            calls++;
            Assert.Equal(HttpMethod.Get, request.Method);
            Assert.Contains("users?email_address=", request.RequestUri!.ToString());
            Assert.Equal("Bearer", request.Headers.Authorization!.Scheme);
            await Task.CompletedTask;
            return Response("""[{"id":"existing", "email_addresses":[{"email_address":"INVITED@example.com"}]}]""");
        });
        Assert.Null(await service.PrepareAsync(Invite(), default));
        Assert.Equal(1, calls);
    }

    [Fact]
    public async Task NewIdentityGetsSilentInviteBoundToPortalRevisionAndCorrectReturnRoute()
    {
        var invitation = Invite();
        var calls = 0;
        var service = Create(async request =>
        {
            calls++;
            if (request.Method == HttpMethod.Get) return Response("[]");
            using var body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync());
            var data = body.RootElement;
            Assert.Equal(invitation.Email, data.GetProperty("email_address").GetString());
            Assert.False(data.GetProperty("notify").GetBoolean());
            Assert.True(data.GetProperty("ignore_existing").GetBoolean());
            Assert.Equal("https://portal.example.test/accept-invite", data.GetProperty("redirect_url").GetString());
            Assert.InRange(data.GetProperty("expires_in_days").GetInt32(), 1, 7);
            Assert.Equal($"{invitation.Id:N}:{invitation.Version}", data.GetProperty("public_metadata").GetProperty("portal_invitation_revision").GetString());
            Assert.DoesNotContain("token-hash", data.ToString());
            return Response(JsonSerializer.Serialize(new { email_address = invitation.Email, url = Url }));
        });
        Assert.Equal(Url, await service.PrepareAsync(invitation, default));
        Assert.Equal(3, calls);
    }

    [Fact]
    public async Task RetryReusesMatchingInvitationOnly()
    {
        var invitation = Invite();
        var service = Create(request =>
        {
            Assert.Equal(HttpMethod.Get, request.Method);
            if (request.RequestUri!.AbsolutePath.EndsWith("users")) return Task.FromResult(Response("[]"));
            return Task.FromResult(Response(JsonSerializer.Serialize(new { data = new[] {
                new { email_address = "other@example.com", status = "pending", url = Url + "-wrong", public_metadata = new { portal_invitation_revision = $"{invitation.Id:N}:{invitation.Version}" } },
                new { email_address = invitation.Email, status = "pending", url = Url + "-old", public_metadata = new { portal_invitation_revision = "old" } },
                new { email_address = invitation.Email, status = "pending", url = Url, public_metadata = new { portal_invitation_revision = $"{invitation.Id:N}:{invitation.Version}" } },
            }})));
        });
        Assert.Equal(Url, await service.PrepareAsync(invitation, default));
    }

    [Theory]
    [InlineData(401)]
    [InlineData(429)]
    [InlineData(500)]
    public async Task ProviderFailureIsRecoverableAndDoesNotLeakResponse(int status)
    {
        var service = Create(_ => Task.FromResult(Response("private-provider-details", (HttpStatusCode)status)));
        var error = await Assert.ThrowsAsync<InvitationRegistrationUnavailableException>(() => service.PrepareAsync(Invite(), default));
        Assert.Equal(503, error.StatusCode);
        Assert.DoesNotContain("private-provider-details", error.ToString());
    }

    [Theory]
    [InlineData("http://identity.example.test/ticket")]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://user:password@identity.example.test/ticket")]
    public async Task MalformedProviderLinksFailClosed(string url)
    {
        var service = Create(request => Task.FromResult(request.Method == HttpMethod.Get ? Response("[]")
            : Response(JsonSerializer.Serialize(new { email_address = "invited@example.com", url }))));
        await Assert.ThrowsAsync<InvitationRegistrationUnavailableException>(() => service.PrepareAsync(Invite(), default));
    }

    private static HttpResponseMessage Response(string value, HttpStatusCode status = HttpStatusCode.OK) => new(status) { Content = new StringContent(value) };
    private static ClerkInvitationRegistration Create(Func<HttpRequestMessage, Task<HttpResponseMessage>> action) => new(
        new HttpClient(new Handler(action)) { BaseAddress = new Uri("https://api.clerk.test/") },
        Options.Create(new ClerkOptions { SecretKey = "test-secret" }),
        Options.Create(new InvitationOptions { PublicBaseUrl = "https://portal.example.test" }));
    private sealed class Handler(Func<HttpRequestMessage, Task<HttpResponseMessage>> action) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => action(request);
    }
}
