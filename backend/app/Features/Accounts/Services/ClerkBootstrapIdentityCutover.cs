namespace PhaenoPortal.App.Features.Accounts.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

public static class ClerkBootstrapIdentityCutover
{
    public static async Task RunAsync(
        IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var environment = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();
        if (!environment.IsProduction())
        {
            throw new InvalidOperationException(
                "The Clerk identity cutover command is available only in Production.");
        }

        var options = scope.ServiceProvider
            .GetRequiredService<IOptions<BootstrapOptions>>()
            .Value;
        if (string.IsNullOrWhiteSpace(options.AdminEmail)
            || string.IsNullOrWhiteSpace(options.ClerkIdentityCutoverPreviousSubjectId))
        {
            throw new InvalidOperationException(
                "The Clerk identity cutover requires the bootstrap administrator email and exact previous subject identifier.");
        }

        var dbContext = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
        var linkedUsers = await dbContext.Users
            .Where(user => user.ExternalIdentityProvider != null
                && user.ExternalSubjectId != null)
            .ToListAsync(cancellationToken);

        if (linkedUsers.Count != 1)
        {
            throw new InvalidOperationException(
                "The guarded bootstrap cutover requires exactly one linked Portal user.");
        }

        var normalizedAdminEmail = User.NormalizeEmail(options.AdminEmail);
        var user = linkedUsers.Single();
        if (!string.Equals(user.NormalizedEmail, normalizedAdminEmail, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "The only linked Portal user is not the configured bootstrap administrator.");
        }

        var provisioner = scope.ServiceProvider
            .GetRequiredService<IClerkBootstrapUserProvisioner>();
        var replacement = await provisioner.EnsureUserAsync(options, cancellationToken)
            ?? throw new InvalidOperationException(
                "A Clerk Production user with the configured bootstrap administrator email was not found.");

        var emailResolver = scope.ServiceProvider
            .GetRequiredService<IVerifiedExternalEmailResolver>();
        var replacementIdentity = new ExternalIdentity(
            Provider: "clerk",
            SubjectId: replacement.UserId,
            Email: options.AdminEmail,
            IsEmailVerified: false);
        if (!await emailResolver.IsVerifiedAsync(
            replacementIdentity,
            options.AdminEmail,
            cancellationToken))
        {
            throw new InvalidOperationException(
                "The Clerk Production user does not have the configured verified primary email.");
        }

        var previousSubjectId = options.ClerkIdentityCutoverPreviousSubjectId.Trim();
        if (user.IsLinkedTo("clerk", replacement.UserId))
        {
            var priorCutover = await dbContext.AuditEvents
                .AsNoTracking()
                .Where(audit => audit.EntityName == nameof(User)
                    && audit.EntityId == user.Id.ToString()
                    && audit.Operation == "ClerkProductionIdentityCutover")
                .OrderByDescending(audit => audit.OccurredAt)
                .Select(audit => audit.ChangesJson)
                .FirstOrDefaultAsync(cancellationToken);
            if (!RecordsExpectedPreviousSubject(priorCutover, previousSubjectId))
            {
                throw new InvalidOperationException(
                    "The completed Clerk identity cutover does not match the expected previous subject.");
            }

            return;
        }

        user.RelinkExternalIdentity(
            expectedProvider: "clerk",
            expectedSubjectId: previousSubjectId,
            newProvider: "clerk",
            newSubjectId: replacement.UserId);

        dbContext.AuditEvents.Add(new AuditEvent(
            entityName: nameof(User),
            entityId: user.Id.ToString(),
            operation: "ClerkProductionIdentityCutover",
            organizationId: null,
            actorUserId: user.Id,
            requestId: null,
            occurredAt: DateTime.UtcNow,
            changesJson: JsonSerializer.Serialize(new
            {
                externalIdentityProvider = "clerk",
                previousExternalSubjectId = previousSubjectId,
                replacementExternalSubjectId = replacement.UserId
            }, new JsonSerializerOptions(JsonSerializerDefaults.Web))));

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static bool RecordsExpectedPreviousSubject(
        string? changesJson,
        string expectedPreviousSubjectId)
    {
        if (string.IsNullOrWhiteSpace(changesJson))
        {
            return false;
        }

        using var document = JsonDocument.Parse(changesJson);
        return document.RootElement.TryGetProperty(
                "previousExternalSubjectId",
                out var previousSubject)
            && string.Equals(
                previousSubject.GetString(),
                expectedPreviousSubjectId,
                StringComparison.Ordinal);
    }
}
