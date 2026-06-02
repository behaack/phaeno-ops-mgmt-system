namespace PhaenoPortal.App.Features.Accounts.Services;

using System.Security.Cryptography;
using System.Text;

public sealed class InvitationTokenService
{
    public InvitationToken CreateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        var rawToken = Base64UrlEncode(bytes);

        return new InvitationToken(rawToken, HashToken(rawToken));
    }

    public string HashToken(string rawToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes);
    }

    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}

public sealed record InvitationToken(string RawToken, string TokenHash);
