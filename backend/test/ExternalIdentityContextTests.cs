namespace PhaenoPortal.Test;

using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using PhaenoPortal.App.Features.Accounts.Services;

public class ExternalIdentityContextTests
{
    [Fact]
    public void ClaimsExternalIdentityContextReadsClerkSubjectAndVerifiedEmail()
    {
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                [
                    new Claim("sub", "user_123"),
                    new Claim("email", "person@example.com"),
                    new Claim("email_verified", "true")
                ],
                authenticationType: "Test"))
        };
        var context = new ClaimsExternalIdentityContext();

        var identity = context.Read(httpContext);

        Assert.NotNull(identity);
        Assert.Equal("clerk", identity.Provider);
        Assert.Equal("user_123", identity.SubjectId);
        Assert.Equal("person@example.com", identity.Email);
        Assert.True(identity.IsEmailVerified);
    }

    [Fact]
    public void ClaimsExternalIdentityContextReturnsNullForUnauthenticatedUser()
    {
        var httpContext = new DefaultHttpContext();
        var context = new ClaimsExternalIdentityContext();

        var identity = context.Read(httpContext);

        Assert.Null(identity);
    }

    [Fact]
    public void ClaimsExternalIdentityContextReturnsNullWithoutSubjectOrEmail()
    {
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim("email_verified", "true")],
                authenticationType: "Test"))
        };
        var context = new ClaimsExternalIdentityContext();

        var identity = context.Read(httpContext);

        Assert.Null(identity);
    }

    [Fact]
    public void ClaimsExternalIdentityContextReadsUnverifiedEmailAsUnverified()
    {
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                [
                    new Claim("sub", "user_123"),
                    new Claim("email", "person@example.com"),
                    new Claim("email_verified", "false")
                ],
                authenticationType: "Test"))
        };
        var context = new ClaimsExternalIdentityContext();

        var identity = context.Read(httpContext);

        Assert.NotNull(identity);
        Assert.False(identity.IsEmailVerified);
    }
}
