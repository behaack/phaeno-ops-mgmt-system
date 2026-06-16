namespace PhaenoPortal.App.Features.Accounts.Services;

using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

public sealed class ClerkBootstrapUserProvisioner(
    HttpClient httpClient,
    IOptions<ClerkOptions> clerkOptions) : IClerkBootstrapUserProvisioner
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly ClerkOptions clerkOptions = clerkOptions.Value;

    public async Task<ClerkBootstrapUser?> EnsureUserAsync(
        BootstrapOptions bootstrapOptions,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(this.clerkOptions.SecretKey)
            || string.IsNullOrWhiteSpace(bootstrapOptions.AdminEmail))
        {
            return null;
        }

        var existingUserId = await FindUserIdByEmailAsync(
            bootstrapOptions.AdminEmail,
            cancellationToken);
        if (!string.IsNullOrWhiteSpace(existingUserId))
        {
            return new ClerkBootstrapUser(existingUserId);
        }

        if (string.IsNullOrWhiteSpace(bootstrapOptions.AdminPassword))
        {
            return null;
        }

        using var request = CreateRequest(HttpMethod.Post, "users");
        request.Content = new StringContent(
            JsonSerializer.Serialize(
                new ClerkCreateUserRequest(
                    EmailAddress: [bootstrapOptions.AdminEmail],
                    Password: bootstrapOptions.AdminPassword,
                    FirstName: bootstrapOptions.AdminFirstName,
                    LastName: bootstrapOptions.AdminLastName),
                JsonOptions),
            Encoding.UTF8,
            "application/json");

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"Clerk bootstrap user creation failed with {(int)response.StatusCode} {response.StatusCode}: {responseBody}",
                null,
                response.StatusCode);
        }

        var user = JsonSerializer.Deserialize<ClerkUserResponse>(responseBody, JsonOptions);
        return string.IsNullOrWhiteSpace(user?.Id)
            ? null
            : new ClerkBootstrapUser(user.Id);
    }

    private async Task<string?> FindUserIdByEmailAsync(
        string email,
        CancellationToken cancellationToken)
    {
        using var request = CreateRequest(
            HttpMethod.Get,
            $"users?email_address={Uri.EscapeDataString(email)}&limit=1");
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"Clerk bootstrap user lookup failed with {(int)response.StatusCode} {response.StatusCode}: {responseBody}",
                null,
                response.StatusCode);
        }

        var users = DeserializeUsers(responseBody);
        return users.FirstOrDefault()?.Id;
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string requestUri)
    {
        var request = new HttpRequestMessage(method, requestUri);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            this.clerkOptions.SecretKey);
        return request;
    }

    private static IReadOnlyList<ClerkUserResponse> DeserializeUsers(string responseBody)
    {
        using var document = JsonDocument.Parse(responseBody);
        if (document.RootElement.ValueKind == JsonValueKind.Array)
        {
            return JsonSerializer.Deserialize<List<ClerkUserResponse>>(
                document.RootElement.GetRawText(),
                JsonOptions) ?? [];
        }

        if (document.RootElement.ValueKind == JsonValueKind.Object
            && document.RootElement.TryGetProperty("data", out var data)
            && data.ValueKind == JsonValueKind.Array)
        {
            return JsonSerializer.Deserialize<List<ClerkUserResponse>>(
                data.GetRawText(),
                JsonOptions) ?? [];
        }

        return [];
    }

    private sealed record ClerkCreateUserRequest(
        [property: JsonPropertyName("email_address")]
        string[] EmailAddress,
        [property: JsonPropertyName("password")]
        string Password,
        [property: JsonPropertyName("first_name")]
        string FirstName,
        [property: JsonPropertyName("last_name")]
        string LastName);

    private sealed record ClerkUserResponse([property: JsonPropertyName("id")] string? Id);
}
