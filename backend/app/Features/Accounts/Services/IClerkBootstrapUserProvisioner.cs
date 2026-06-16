namespace PhaenoPortal.App.Features.Accounts.Services;

public interface IClerkBootstrapUserProvisioner
{
    Task<ClerkBootstrapUser?> EnsureUserAsync(
        BootstrapOptions bootstrapOptions,
        CancellationToken cancellationToken);
}

public sealed record ClerkBootstrapUser(string UserId);
