namespace PhaenoPortal.Test;

using System.Net;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;

public class ClerkVerifiedEmailResolverTests
{
    [Fact]
    public async Task IsVerifiedReadsVerifiedEmailFromClerkWhenClaimsOmitEmail()
    {
        var requests = new List<HttpRequestMessage>();
        var resolver = CreateResolver(request =>
        {
            requests.Add(CloneRequest(request));
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {
                      "primary_email_address_id": "idn_primary",
                      "email_addresses": [
                        {
                          "id": "idn_primary",
                          "email_address": "bhaack360@gmail.com",
                          "verification": { "status": "verified", "strategy": "email_code" }
                        }
                      ]
                    }
                    """)
            };
        });

        var verified = await resolver.IsVerifiedAsync(
            new ExternalIdentity("clerk", "user_123", string.Empty, false),
            "bhaack360@gmail.com",
            CancellationToken.None);

        Assert.True(verified);
        var request = Assert.Single(requests);
        Assert.Equal("https://api.clerk.test/users/user_123", request.RequestUri?.ToString());
        Assert.Equal("Bearer", request.Headers.Authorization?.Scheme);
        Assert.Equal("secret-key", request.Headers.Authorization?.Parameter);
    }

    [Fact]
    public async Task IsVerifiedRejectsAClerkEmailThatIsNotVerified()
    {
        var resolver = CreateResolver(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                  "primary_email_address_id": "idn_primary",
                  "email_addresses": [
                    {
                      "id": "idn_primary",
                      "email_address": "bhaack360@gmail.com",
                      "verification": { "status": "unverified" }
                    }
                  ]
                }
                """)
        });

        var verified = await resolver.IsVerifiedAsync(
            new ExternalIdentity("clerk", "user_123", string.Empty, false),
            "bhaack360@gmail.com",
            CancellationToken.None);

        Assert.False(verified);
    }

    [Fact]
    public async Task IsVerifiedUsesMatchingVerifiedClaimsWithoutCallingClerk()
    {
        var resolver = CreateResolver(_ => throw new InvalidOperationException("Clerk should not be called."));

        var verified = await resolver.IsVerifiedAsync(
            new ExternalIdentity("clerk", "user_123", "Person@Example.com", true),
            "person@example.com",
            CancellationToken.None);

        Assert.True(verified);
    }

    private static ClerkVerifiedEmailResolver CreateResolver(
        Func<HttpRequestMessage, HttpResponseMessage> handler)
    {
        var httpClient = new HttpClient(new StubHttpMessageHandler(handler))
        {
            BaseAddress = new Uri("https://api.clerk.test/")
        };

        return new ClerkVerifiedEmailResolver(
            httpClient,
            Options.Create(new ClerkOptions
            {
                ApiBaseUrl = "https://api.clerk.test",
                SecretKey = "secret-key"
            }));
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
