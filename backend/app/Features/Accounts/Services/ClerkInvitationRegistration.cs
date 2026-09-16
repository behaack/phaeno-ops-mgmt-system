namespace PhaenoPortal.App.Features.Accounts.Services;

using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Common.Exceptions;
using PSeq.Operations.Commercial.Accounts.Domain;

public interface IInvitationRegistration
{
    Task<string?> PrepareAsync(OrganizationInvitation invitation, CancellationToken cancellationToken);
}

// Called only after the Portal invitation token and current lifecycle have been validated.
// Null means the identity already exists and must use the normal sign-in challenges.
public sealed class ClerkInvitationRegistration(
    HttpClient httpClient,
    IOptions<ClerkOptions> clerkOptions,
    IOptions<InvitationOptions> invitationOptions) : IInvitationRegistration
{
    public async Task<string?> PrepareAsync(OrganizationInvitation invitation, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(clerkOptions.Value.SecretKey))
            throw new InvitationRegistrationUnavailableException();
        try
        {
            using var users = await SendAsync(HttpMethod.Get,
                $"users?email_address={Uri.EscapeDataString(invitation.Email)}", null, cancellationToken);
            if (Items(users.RootElement).Any(user => user.TryGetProperty("email_addresses", out var addresses)
                && addresses.EnumerateArray().Any(address => EmailMatches(address, invitation.Email))))
                return null;

            // Reuse only handoffs belonging to this exact Portal invitation revision.
            // Resent links and independently created Clerk invitations cannot supply this handoff.
            var marker = $"{invitation.Id:N}:{invitation.Version}";
            using var pending = await SendAsync(HttpMethod.Get,
                $"invitations?query={Uri.EscapeDataString(invitation.Email)}&status=pending&limit=500", null, cancellationToken);
            foreach (var candidate in Items(pending.RootElement))
            {
                if (EmailMatches(candidate, invitation.Email)
                    && candidate.TryGetProperty("status", out var status) && status.GetString() == "pending"
                    && candidate.TryGetProperty("public_metadata", out var metadata)
                    && metadata.TryGetProperty("portal_invitation_revision", out var revision)
                    && revision.GetString() == marker
                    && candidate.TryGetProperty("url", out var link) && link.ValueKind == JsonValueKind.String)
                    return ReadUrl(candidate);
            }

            var remainingDays = (int)Math.Ceiling((invitation.ExpiresAt - DateTime.UtcNow).TotalDays);
            using var created = await SendAsync(HttpMethod.Post, "invitations", new
            {
                email_address = invitation.Email,
                notify = false,
                ignore_existing = true,
                expires_in_days = Math.Clamp(remainingDays, 1, 30),
                redirect_url = invitationOptions.Value.PublicBaseUrl.TrimEnd('/') + "/accept-invite",
                public_metadata = new { portal_invitation_revision = marker },
            }, cancellationToken);
            if (!EmailMatches(created.RootElement, invitation.Email))
                throw new InvitationRegistrationUnavailableException();
            return ReadUrl(created.RootElement);
        }
        catch (Exception error) when (error is HttpRequestException or JsonException or InvalidOperationException or TaskCanceledException
            && !cancellationToken.IsCancellationRequested)
        {
            // Never include provider bodies, invitation URLs, or credentials in errors or logs.
            throw new InvitationRegistrationUnavailableException();
        }
    }

    private async Task<JsonDocument> SendAsync(HttpMethod method, string path, object? body, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", clerkOptions.Value.SecretKey);
        if (body is not null) request.Content = JsonContent.Create(body);
        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode) throw new InvitationRegistrationUnavailableException();
        await using var content = await response.Content.ReadAsStreamAsync(cancellationToken);
        return await JsonDocument.ParseAsync(content, cancellationToken: cancellationToken);
    }

    private static IEnumerable<JsonElement> Items(JsonElement root) =>
        root.ValueKind == JsonValueKind.Array ? root.EnumerateArray()
        : root.GetProperty("data").EnumerateArray();

    private static bool EmailMatches(JsonElement value, string email) =>
        value.TryGetProperty("email_address", out var address)
        && string.Equals(address.GetString(), email, StringComparison.OrdinalIgnoreCase);

    private static string ReadUrl(JsonElement invitation)
    {
        if (!invitation.TryGetProperty("url", out var property)
            || !Uri.TryCreate(property.GetString(), UriKind.Absolute, out var url)
            || url.Scheme != Uri.UriSchemeHttps || !string.IsNullOrEmpty(url.UserInfo))
            throw new InvitationRegistrationUnavailableException();
        return url.AbsoluteUri;
    }
}

public sealed class InvitationRegistrationUnavailableException() : DomainException(
    "Account setup is temporarily unavailable. Try again; your invitation is still saved.")
{
    public override int StatusCode => StatusCodes.Status503ServiceUnavailable;
    public override string ErrorType => "service_unavailable";
    public override string ErrorCode => "invitation_registration_unavailable";
}
