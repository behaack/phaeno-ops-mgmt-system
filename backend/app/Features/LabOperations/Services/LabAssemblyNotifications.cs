namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

[Authorize]
public sealed class LabAssemblyNotificationHub(LabOperationsRequestContext access, PSeqOperationsDbContext db,
    LabAssemblySubscriptions subscriptions) : Hub
{
    public const string Path = "/api/platform/lab-operations/assembly-notifications";
    internal static readonly LabRole[] ViewerRoles = [LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator];
    public override async Task OnConnectedAsync()
    {
        try
        {
            var actor = await access.RequireAsync(Context.GetHttpContext()!, Context.ConnectionAborted, ViewerRoles);
            subscriptions.Add(Context.ConnectionId, actor.User.Id, Context.User!, Context.Abort);
            await base.OnConnectedAsync();
        }
        catch (OrderManagementException) { Context.Abort(); throw new HubException("Active Phaeno laboratory access is required."); }
    }
    public async Task Watch(Guid[] jobIds)
    {
        try
        {
            await access.RequireAsync(Context.GetHttpContext()!, Context.ConnectionAborted, ViewerRoles);
            if (jobIds is null || jobIds.Length > 250 || jobIds.Contains(Guid.Empty)) throw new HubException("Choose at most 250 saved assembly attempts.");
            var ids = jobIds.Distinct().ToArray();
            var visible = await (from job in db.Set<LabAssemblyJob>().AsNoTracking()
                join work in db.LabWorkOrders on job.LabWorkOrderId equals work.Id
                join specimen in db.LabSpecimens on job.LabSpecimenId equals specimen.Id
                where ids.Contains(job.Id) && job.OrganizationId == work.SubmittingOrganizationId && specimen.LabWorkOrderId == work.Id
                select job.Id).ToArrayAsync(Context.ConnectionAborted);
            if (visible.Length != ids.Length) throw new HubException("The selected assembly attempts are unavailable.");
            subscriptions.Require(Context.ConnectionId).Watch(ids);
        }
        catch (OrderManagementException) { Context.Abort(); throw new HubException("Active Phaeno laboratory access is required."); }
    }
    public override Task OnDisconnectedAsync(Exception? exception)
    { subscriptions.Remove(Context.ConnectionId); return base.OnDisconnectedAsync(exception); }
}

public sealed class LabAssemblySubscriptions
{
    private readonly ConcurrentDictionary<string, Subscription> connections = new();
    private readonly object registrationGate = new();
    public Subscription[] Read() => connections.Values.ToArray();
    public void Add(string connectionId, Guid userId, ClaimsPrincipal user, Action abort)
    {
        lock (registrationGate)
        {
            if (connections.Count >= 1024 || connections.Values.Count(s => s.UserId == userId) >= 10)
                throw new HubException("The assembly notification connection limit was reached.");
            connections[connectionId] = new(connectionId, userId, user, abort);
        }
    }
    public void Remove(string id) => connections.TryRemove(id, out _);
    public Subscription Require(string id) => connections.GetValueOrDefault(id) ?? throw new HubException("Reconnect before subscribing.");
    public sealed class Subscription(string connectionId, Guid userId, ClaimsPrincipal user, Action abort)
    {
        private readonly object gate = new();
        private Dictionary<Guid, (long Version, DateTime? ProgressAt, long? ProgressSequence)?> versions = [];
        public string ConnectionId => connectionId;
        public Guid UserId => userId;
        public ClaimsPrincipal User => user;
        public void Abort() => abort();
        public void Watch(Guid[] ids) { lock (gate) versions = ids.ToDictionary(id => id, id => versions.GetValueOrDefault(id)); }
        public Guid[] Jobs() { lock (gate) return versions.Keys.ToArray(); }
        public bool Changed(Guid id, long version, DateTime? progressAt = null, long? progressSequence = null)
        { lock (gate) return versions.TryGetValue(id, out var saved) && saved != (version, progressAt, progressSequence); }
        public void Sent(Guid id, long version, DateTime? progressAt = null, long? progressSequence = null)
        { lock (gate) { if (versions.ContainsKey(id)) versions[id] = (version, progressAt, progressSequence); } }
    }
}

/// <summary>Each API instance notifies its own connections from committed snapshots; no late-commit cursor gaps.</summary>
public sealed class LabAssemblyNotificationWorker(IServiceScopeFactory scopes, LabAssemblySubscriptions subscriptions,
    IHubContext<LabAssemblyNotificationHub> hub, LabAssemblyProgress progress, TimeProvider time, ILogger<LabAssemblyNotificationWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(2));
        try { while (await timer.WaitForNextTickAsync(ct)) await PumpAsync(ct); }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
    }
    public async Task PumpAsync(CancellationToken ct)
    {
        foreach (var connection in subscriptions.Read())
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromSeconds(5));
            var token = timeout.Token;
            try
            {
                if (!long.TryParse(connection.User.FindFirst("exp")?.Value, out var expires)
                    || expires <= time.GetUtcNow().ToUnixTimeSeconds()) { connection.Abort(); subscriptions.Remove(connection.ConnectionId); continue; }
                await using var scope = scopes.CreateAsyncScope();
                // Fresh request context avoids caching authorization across notifications.
                await scope.ServiceProvider.GetRequiredService<LabOperationsRequestContext>().RequireAsync(
                    new DefaultHttpContext { User = connection.User }, token, LabAssemblyNotificationHub.ViewerRoles);
                var ids = connection.Jobs(); if (ids.Length == 0) continue;
                var db = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
                var jobs = await db.Set<LabAssemblyJob>().AsNoTracking().Where(j => ids.Contains(j.Id))
                    .Select(j => new { j.Id, j.Version, j.State }).ToArrayAsync(token);
                foreach (var job in jobs)
                {
                    var current = progress.Read(job.Id, job.State is "Succeeded" or "Failed" or "Terminated" or "CancelledBeforeStart");
                    if (!connection.Changed(job.Id, job.Version, current?.ReceivedAtUtc, current?.Sequence)) continue;
                    await hub.Clients.Client(connection.ConnectionId).SendAsync("AssemblyJobChanged", new { jobId = job.Id, version = job.Version }, token);
                    connection.Sent(job.Id, job.Version, current?.ReceivedAtUtc, current?.Sequence);
                }
            }
            catch (OrderManagementException) { connection.Abort(); subscriptions.Remove(connection.ConnectionId); }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception error) { logger.LogWarning("Assembly notification refresh failed ({ErrorType}); HTTP recovery remains available.", error.GetType().Name); }
        }
    }
}
