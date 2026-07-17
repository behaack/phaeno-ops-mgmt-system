namespace PhaenoPortal.App.Features.Website.Services;

public interface IWebsiteRecaptchaVerifier
{
    Task<bool> VerifyAsync(
        string token,
        string expectedAction,
        CancellationToken cancellationToken = default);
}
