using Google.Apis.Auth.OAuth2;
using Google.Api.Gax.ResourceNames;
using Google.Cloud.RecaptchaEnterprise.V1;
using Microsoft.Extensions.Options;

namespace PhaenoPortal.App.Features.Website.Services;

public sealed class GoogleWebsiteRecaptchaVerifier(
    IOptions<WebsiteRecaptchaOptions> options,
    IWebHostEnvironment environment,
    ILogger<GoogleWebsiteRecaptchaVerifier> logger) : IWebsiteRecaptchaVerifier
{
    private readonly WebsiteRecaptchaOptions options = options.Value;

    public async Task<bool> VerifyAsync(
        string token,
        string expectedAction,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(expectedAction))
        {
            return false;
        }

        if (!options.IsConfigured)
        {
            throw new InvalidOperationException(
                "Website reCAPTCHA requires its project, site key, and service-account configuration.");
        }

        var serviceAccountKeyJson = await ReadServiceAccountKeyJsonAsync(cancellationToken);
        var clientBuilder = new RecaptchaEnterpriseServiceClientBuilder
        {
            GoogleCredential = CredentialFactory
                .FromJson<ServiceAccountCredential>(serviceAccountKeyJson)
                .ToGoogleCredential()
        };
        var client = await clientBuilder.BuildAsync(cancellationToken);
        var request = new CreateAssessmentRequest
        {
            ParentAsProjectName = ProjectName.FromProject(options.RecaptchaProjectId),
            Assessment = new Assessment
            {
                Event = new Event
                {
                    SiteKey = options.RecaptchaSecretKey,
                    Token = token,
                    ExpectedAction = expectedAction
                }
            }
        };

        var assessment = await client.CreateAssessmentAsync(
            request,
            cancellationToken: cancellationToken);

        if (!assessment.TokenProperties.Valid
            || !string.Equals(
                assessment.TokenProperties.Action,
                expectedAction,
                StringComparison.Ordinal))
        {
            logger.LogInformation(
                "Website reCAPTCHA rejected token for action {ExpectedAction}: {Reason}.",
                expectedAction,
                assessment.TokenProperties.InvalidReason);
            return false;
        }

        return assessment.RiskAnalysis.Score >= options.RecaptchaThreshold;
    }

    private async Task<string> ReadServiceAccountKeyJsonAsync(
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(options.RecaptchaServiceAccountKeyJson))
        {
            return options.RecaptchaServiceAccountKeyJson;
        }

        if (string.IsNullOrWhiteSpace(options.RecaptchaServiceAccountKeyPath))
        {
            throw new InvalidOperationException(
                "Website reCAPTCHA requires a service-account key path or JSON value.");
        }

        var keyPath = Path.IsPathRooted(options.RecaptchaServiceAccountKeyPath)
            ? options.RecaptchaServiceAccountKeyPath
            : Path.Combine(environment.ContentRootPath, options.RecaptchaServiceAccountKeyPath);
        if (!File.Exists(keyPath))
        {
            throw new FileNotFoundException(
                "The Website reCAPTCHA service-account key file was not found.",
                keyPath);
        }

        var json = await File.ReadAllTextAsync(keyPath, cancellationToken);
        if (string.IsNullOrWhiteSpace(json))
        {
            throw new InvalidOperationException(
                "The Website reCAPTCHA service-account key file is empty.");
        }

        return json;
    }
}
