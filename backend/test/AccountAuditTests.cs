namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

public class AccountAuditTests
{
    [Fact]
    public void AddCreatesSemanticAuditEventWithRequestMetadata()
    {
        var dbContextOptions = new DbContextOptionsBuilder<PSeqOperationsDbContext>()
            .UseNpgsql("Host=localhost;Database=phaeno_portal_test;Username=postgres;Password=postgres")
            .Options;
        using var dbContext = new PSeqOperationsDbContext(
            dbContextOptions,
            Options.Create(new PersistenceOptions()));
        var httpContext = new DefaultHttpContext
        {
            TraceIdentifier = "request-123"
        };
        var invitationId = Guid.NewGuid();
        var organizationId = Guid.NewGuid();
        var actorUserId = Guid.NewGuid();

        AccountAudit.Add(
            dbContext,
            httpContext,
            nameof(OrganizationInvitation),
            invitationId,
            AccountAudit.InviteAccepted,
            organizationId,
            actorUserId,
            new { Email = "user@example.com" });

        var auditEvent = Assert.Single(dbContext.ChangeTracker
            .Entries<AuditEvent>()
            .Select(entry => entry.Entity));
        Assert.Equal(nameof(OrganizationInvitation), auditEvent.EntityName);
        Assert.Equal(invitationId.ToString(), auditEvent.EntityId);
        Assert.Equal(AccountAudit.InviteAccepted, auditEvent.Operation);
        Assert.Equal(organizationId, auditEvent.OrganizationId);
        Assert.Equal(actorUserId, auditEvent.ActorUserId);
        Assert.Equal("request-123", auditEvent.RequestId);

        var details = JsonSerializer.Deserialize<JsonElement>(auditEvent.ChangesJson);
        Assert.Equal("user@example.com", details.GetProperty("email").GetString());
    }
}
