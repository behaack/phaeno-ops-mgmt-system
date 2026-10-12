namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.WorkAttention;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Api;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class DepartmentAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task WorkAttentionCountsBeyondOneThousandAndScopesBeforePaging()
    {
        await using var scope = await Scope.Create();
        var own = Enumerable.Range(0, 1005).Select(_ => scope.AddOrder(scope.General)).ToArray();
        var hiddenDepartment = scope.AddOrder(scope.Research);
        var foreign = new Organization($"Other work Customer {Guid.NewGuid():N}", OrganizationKind.Customer);
        scope.Db.Add(foreign);
        var hiddenOrganization = new LabServiceOrder(foreign.Id, foreign.Departments.Single().Id, $"HIDDEN-{Guid.NewGuid():N}",
            "Other organization", null, 1, false, "RNA", "Frozen", "None", "Synthetic instructions");
        scope.Db.Add(hiddenOrganization);
        await scope.Db.SaveChangesAsync();
        var session = AttentionSession(scope, EmptyAttentionCaps() with { CanViewLabServiceOrders = true, CanSubmitLabServiceRequests = true });
        var reader = new WorkAttentionReader(scope.Db, new PSeqOrderToCashOptions(), session, false, DateTime.UtcNow);
        var query = reader.Queries().Aggregate((left, right) => left.Concat(right));
        var last = await RecordPage.ReadAsync(query.OrderBy(item => item.CreatedAtUtc).ThenBy(item => item.SourceId), 41, 25, default);
        Assert.Equal(1005, last.TotalCount);
        Assert.Equal(5, last.Items.Count);
        Assert.All(last.Items, item => Assert.Contains(item.SourceId, own.Select(order => order.Id)));
        Assert.DoesNotContain(last.Items, item => item.SourceId == hiddenDepartment.Id || item.SourceId == hiddenOrganization.Id);
        scope.Db.Entry(own[0]).Property(order => order.Status).CurrentValue = LabServiceOrderStatus.Completed;
        await scope.Db.SaveChangesAsync();
        Assert.Equal(1004, await query.CountAsync());
        var denied = new WorkAttentionReader(scope.Db, new PSeqOrderToCashOptions(), session with { Capabilities = EmptyAttentionCaps() }, false, DateTime.UtcNow);
        Assert.Empty(denied.Queries());
    }

    [PostgreSqlReferenceFact]
    public async Task WorkRecoveryReadsTheFailureWithoutARecordedSummaryAndClearsFromTheSource()
    {
        await using var scope = await Scope.Create();
        var now = DateTime.UtcNow;
        var invitation = new OrganizationInvitation(scope.Organization.Id, $"work-{Guid.NewGuid():N}@example.invalid", "Synthetic", "Invitee", false, Guid.NewGuid().ToString("N"), now.AddDays(1));
        var delivery = new InvitationDeliveryAttempt(invitation.Id, "synthetic payload; never dispatched", now);
        delivery.MarkSending(now);
        delivery.MarkFailure("Synthetic failure", now, 5, TimeSpan.FromMinutes(2));
        scope.Db.AddRange(invitation, delivery);
        await scope.Db.SaveChangesAsync();
        Assert.False(await scope.Db.OperationalAttentionItems.AnyAsync(item => item.SourceId == delivery.Id));
        var session = AttentionSession(scope, EmptyAttentionCaps() with { CanOperateCommercialWork = true }) with { IsPlatformAdmin = true };
        var reader = new WorkAttentionReader(scope.Db, new PSeqOrderToCashOptions { AttentionOperations = true }, session, true, now);
        var query = reader.Queries().Aggregate((left, right) => left.Concat(right)).Where(item => item.SourceId == delivery.Id);
        var item = Assert.Single(await query.ToListAsync());
        Assert.Equal("InvitationRecovery", item.SourceType);
        Assert.Contains("attentionSource=InvitationDeliveryAttempt", item.Destination);
        Assert.Null(item.OwnerUserId);
        delivery.MarkSending(now.AddMinutes(10));
        delivery.MarkAccepted("synthetic acceptance; no provider call", now.AddMinutes(10));
        await scope.Db.SaveChangesAsync();
        Assert.Empty(await query.ToListAsync());
        Assert.False(await scope.Db.OperationalAttentionItems.AnyAsync(value => value.SourceId == delivery.Id));
    }

    private static SessionCapabilitiesDto EmptyAttentionCaps() => Activator.CreateInstance<SessionCapabilitiesDto>();
    private static SessionDto AttentionSession(Scope scope, SessionCapabilitiesDto capabilities) => new()
    {
        State = "ready", IsPlatformAdmin = false, Memberships = [], Capabilities = capabilities,
        User = new() { Id = scope.Actor.Id, Email = scope.Actor.Email, FirstName = "Synthetic", LastName = "Actor", Status = UserAccountStatus.Active },
        SelectedOrganization = new() { OrganizationId = scope.Organization.Id, MembershipId = scope.AdminMembership.Id, IsAvailable = true },
        SelectedDepartment = new() { DepartmentId = scope.General.Id, OrganizationId = scope.Organization.Id, IsAvailable = true, IsDepartmentAdmin = true },
    };
}
