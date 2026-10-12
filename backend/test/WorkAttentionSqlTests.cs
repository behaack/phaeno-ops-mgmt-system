namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.WorkAttention;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class WorkAttentionSqlTests
{
    [Fact]
    public void Staff_union_remains_server_paged_and_does_not_depend_on_old_controller_caps()
    {
        var caps = Activator.CreateInstance<SessionCapabilitiesDto>();
        foreach (var property in typeof(SessionCapabilitiesDto).GetProperties().Where(property => property.PropertyType == typeof(bool))) property.SetValue(caps, true);
        var session = new SessionDto { State = "ready", IsPlatformAdmin = true, Memberships = [], Capabilities = caps,
            User = new SessionUserDto { Id = Guid.NewGuid(), Email = "synthetic@example.invalid", FirstName = "Synthetic", LastName = "Actor", Status = PSeq.Operations.Commercial.Accounts.Domain.UserAccountStatus.Active } };
        using var db = new PSeqOperationsDbContext(new DbContextOptionsBuilder<PSeqOperationsDbContext>().UseNpgsql("Host=127.0.0.1;Database=shape_only").Options, Options.Create(new PersistenceOptions()));
        var sources = new WorkAttentionReader(db, new PSeqOrderToCashOptions { GovernedPSeqResults = true, AttentionOperations = true }, session, true, DateTime.UtcNow).Queries();
        var sql = sources.Aggregate((left, right) => left.Concat(right)).Where(item => item.OwnerUserId == null || item.OwnerUserId == session.User.Id)
            .OrderBy(item => item.Priority).ThenBy(item => item.SourceId).Skip(1000).Take(25).ToQueryString();
        Assert.Contains("UNION ALL", sql);
        Assert.Contains("LIMIT", sql);
        Assert.Contains("OFFSET", sql);
        Assert.DoesNotContain("LIMIT 250", sql);
    }
}
