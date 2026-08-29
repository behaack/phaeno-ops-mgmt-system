namespace PhaenoPortal.App.Features.Accounts.Services;

using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Website;

public sealed class MailgunWebhookSignatureVerifier(
    IOptions<WebsiteEmailOptions> options)
{
    private readonly byte[] signingKey = Encoding.UTF8.GetBytes(options.Value.WebhookSigningKey);

    public bool IsAuthentic(
        string? timestamp,
        string? token,
        params string?[] signatures)
    {
        if (signingKey.Length == 0
            || string.IsNullOrWhiteSpace(timestamp)
            || string.IsNullOrWhiteSpace(token))
            return false;

        var expected = HMACSHA256.HashData(
            signingKey,
            Encoding.UTF8.GetBytes(timestamp + token));
        foreach (var signature in signatures)
        {
            if (string.IsNullOrWhiteSpace(signature)) continue;
            try
            {
                var supplied = Convert.FromHexString(signature);
                if (supplied.Length == expected.Length
                    && CryptographicOperations.FixedTimeEquals(supplied, expected))
                    return true;
            }
            catch (FormatException)
            {
                // Invalid hexadecimal signatures are unauthenticated.
            }
        }

        return false;
    }
}
