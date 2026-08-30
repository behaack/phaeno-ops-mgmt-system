namespace PhaenoPortal.App.Features.Accounts.Services;

using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Common.Exceptions;
using PSeq.Operations.Commercial.Accounts.Domain;

public interface IVerifiedExternalEmailResolver
{
    Task<bool> IsVerifiedAsync(
        ExternalIdentity identity,
        string expectedEmail,
        CancellationToken cancellationToken);
}

public sealed class ClerkVerifiedEmailResolver(
    HttpClient httpClient,
    IOptions<ClerkOptions> clerkOptions) : IVerifiedExternalEmailResolver
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly ClerkOptions clerkOptions = clerkOptions.Value;

    public async Task<bool> IsVerifiedAsync(
        ExternalIdentity identity,
        string expectedEmail,
        CancellationToken cancellationToken)
    {
        if (identity.IsEmailVerified && EmailsMatch(identity.Email, expectedEmail))
        {
            return true;
        }

        if (!string.Equals(identity.Provider, "clerk", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(clerkOptions.SecretKey))
        {
            throw new ClerkIdentityVerificationUnavailableException();
        }

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"users/{Uri.EscapeDataString(identity.SubjectId)}");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            clerkOptions.SecretKey);

        HttpResponseMessage response;
        try
        {
            response = await httpClient.SendAsync(request, cancellationToken);
        }
        catch (HttpRequestException exception)
        {
            throw new ClerkIdentityVerificationUnavailableException(exception);
        }

        using (response)
        {
            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                return false;
            }

            if (!response.IsSuccessStatusCode)
            {
                throw new ClerkIdentityVerificationUnavailableException();
            }

            await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var user = await JsonSerializer.DeserializeAsync<ClerkUserResponse>(
                responseStream,
                JsonOptions,
                cancellationToken);

            return user?.EmailAddresses?.Any(address =>
                string.Equals(address.Id, user.PrimaryEmailAddressId, StringComparison.Ordinal)
                && EmailsMatch(address.EmailAddress, expectedEmail)
                && string.Equals(
                    address.Verification?.Status,
                    "verified",
                    StringComparison.OrdinalIgnoreCase)) == true;
        }
    }

    private static bool EmailsMatch(string first, string second) =>
        string.Equals(
            User.NormalizeEmail(first),
            User.NormalizeEmail(second),
            StringComparison.Ordinal);

    private sealed record ClerkUserResponse(
        [property: JsonPropertyName("primary_email_address_id")]
        string? PrimaryEmailAddressId,
        [property: JsonPropertyName("email_addresses")]
        IReadOnlyList<ClerkEmailAddressResponse>? EmailAddresses);

    private sealed record ClerkEmailAddressResponse(
        [property: JsonPropertyName("id")]
        string Id,
        [property: JsonPropertyName("email_address")]
        string EmailAddress,
        [property: JsonPropertyName("verification")]
        ClerkEmailVerificationResponse? Verification);

    private sealed record ClerkEmailVerificationResponse(
        [property: JsonPropertyName("status")]
        string? Status);
}

public sealed class ClerkIdentityVerificationUnavailableException : DomainException
{
    private const string ErrorMessage =
        "The identity service could not verify the authenticated email. Try again.";

    public ClerkIdentityVerificationUnavailableException()
        : base(ErrorMessage) { }

    public ClerkIdentityVerificationUnavailableException(Exception innerException)
        : base(ErrorMessage, innerException) { }

    public override int StatusCode => StatusCodes.Status503ServiceUnavailable;

    public override string ErrorType => "service_unavailable";

    public override string ErrorCode => "identity_verification_unavailable";
}
