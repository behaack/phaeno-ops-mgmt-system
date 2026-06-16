namespace PhaenoPortal.Test;

using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;

public class ClerkBootstrapUserProvisionerTests
{
    [Fact]
    public async Task EnsureUserReturnsExistingClerkUserByEmail()
    {
        var requests = new List<HttpRequestMessage>();
        var provisioner = CreateProvisioner(request =>
        {
            requests.Add(CloneRequest(request));
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("""{"data":[{"id":"user_existing"}],"total_count":1}""")
            };
        });

        var user = await provisioner.EnsureUserAsync(
            CreateBootstrapOptions(),
            CancellationToken.None);

        Assert.NotNull(user);
        Assert.Equal("user_existing", user.UserId);
        var request = Assert.Single(requests);
        Assert.Equal(HttpMethod.Get, request.Method);
        Assert.Contains("email_address=bhaack%40phaenobiotech.com", request.RequestUri?.ToString());
        Assert.Equal(
            "Bearer",
            request.Headers.Authorization?.Scheme);
        Assert.Equal("secret-key", request.Headers.Authorization?.Parameter);
    }

    [Fact]
    public async Task EnsureUserCreatesClerkUserWhenMissing()
    {
        var requests = new List<(HttpRequestMessage Request, string? Body)>();
        var provisioner = CreateProvisioner(request =>
        {
            var body = request.Content?.ReadAsStringAsync().GetAwaiter().GetResult();
            requests.Add((CloneRequest(request), body));
            if (request.Method == HttpMethod.Get)
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"data":[],"total_count":0}""")
                };
            }

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("""{"id":"user_created"}""")
            };
        });

        var user = await provisioner.EnsureUserAsync(
            CreateBootstrapOptions(),
            CancellationToken.None);

        Assert.NotNull(user);
        Assert.Equal("user_created", user.UserId);
        Assert.Collection(
            requests,
            first => Assert.Equal(HttpMethod.Get, first.Request.Method),
            second =>
            {
                Assert.Equal(HttpMethod.Post, second.Request.Method);
                Assert.Equal("https://api.clerk.test/users", second.Request.RequestUri?.ToString());
                Assert.NotNull(second.Body);
                var json = JsonSerializer.Deserialize<JsonElement>(second.Body);
                Assert.Equal("bhaack@phaenobiotech.com", json.GetProperty("email_address")[0].GetString());
                Assert.Equal("Bill", json.GetProperty("first_name").GetString());
                Assert.Equal("Haack", json.GetProperty("last_name").GetString());
                Assert.Equal("dev-password", json.GetProperty("password").GetString());
            });
    }

    private static ClerkBootstrapUserProvisioner CreateProvisioner(
        Func<HttpRequestMessage, HttpResponseMessage> handler)
    {
        var httpClient = new HttpClient(new StubHttpMessageHandler(handler))
        {
            BaseAddress = new Uri("https://api.clerk.test/")
        };

        return new ClerkBootstrapUserProvisioner(
            httpClient,
            Options.Create(new ClerkOptions
            {
                ApiBaseUrl = "https://api.clerk.test",
                SecretKey = "secret-key"
            }));
    }

    private static BootstrapOptions CreateBootstrapOptions()
    {
        return new BootstrapOptions
        {
            AdminEmail = "bhaack@phaenobiotech.com",
            AdminFirstName = "Bill",
            AdminLastName = "Haack",
            AdminPassword = "dev-password"
        };
    }

    private static HttpRequestMessage CloneRequest(HttpRequestMessage request)
    {
        var clone = new HttpRequestMessage(request.Method, request.RequestUri);
        clone.Headers.Authorization = request.Headers.Authorization;
        return clone;
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
