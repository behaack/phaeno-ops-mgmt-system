namespace PhaenoPortal.Test;

using System.Diagnostics.Metrics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using PhaenoPortal.App.Features.Website.DTOs;
using PhaenoPortal.App.Features.Website.Entities;
using PhaenoPortal.App.Features.Website.Notifications;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class WebsiteNotificationProcessingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task PausePersistsAcrossConnectionsWithoutWaitingForInFlightProviderAndResumeRetainsQueue()
    {
        var source = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!);
        if (source.Host is not ("localhost" or "127.0.0.1") || source.Database != "phaeno_ops")
            throw new InvalidOperationException("Concurrent verification requires the configured localhost/phaeno_ops source.");
        var name = $"pseq_website_test_{Guid.NewGuid():N}";
        await using var admin = new NpgsqlConnection(source.ConnectionString);
        await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin)) await create.ExecuteNonQueryAsync();
        source.Database = name;
        source.Pooling = false;
        try
        {
            var actor = new User("synthetic@example.test", "Synthetic", "Operator");
            var contact = new WebContact { Id = Guid.NewGuid(), FirstName = "Synthetic", LastName = "Contact", OrganizationName = "Fixture", Email = "contact@example.test", NormalizedEmail = "CONTACT@EXAMPLE.TEST", SendBrochure = true, CreatedAtUtc = DateTimeOffset.UtcNow };
            var firstDelivery = new WebNotificationDelivery { WebContactId = contact.Id, Kind = WebNotificationKind.TechnicalBrief };
            var nextDelivery = new WebNotificationDelivery { WebContactId = contact.Id, Kind = WebNotificationKind.MailingListAlert };
            await using (var setup = Db(source.ConnectionString))
            {
                await setup.Database.MigrateAsync();
                setup.AddRange(actor, contact, firstDelivery, nextDelivery);
                await setup.SaveChangesAsync();
            }
            await using var dispatchDb = Db(source.ConnectionString);
            var blockingSender = new BlockingSender();
            var dispatch = new WebsiteNotificationDispatcher(dispatchDb, blockingSender, NullLogger<WebsiteNotificationDispatcher>.Instance)
                .ProcessNextAsync(default, firstDelivery.Id);
            try
            {
                await blockingSender.Started.Task.WaitAsync(TimeSpan.FromSeconds(10));
                await using var operatorDb = Db(source.ConnectionString);
                var processing = new WebsiteNotificationProcessingService(operatorDb);
                var initial = await processing.ReadSummaryAsync();
                await processing.ChangeAsync(new(initial.Version, true, "Synthetic provider investigation"), actor.Id).WaitAsync(TimeSpan.FromSeconds(5));
                Assert.False(dispatch.IsCompleted);
                await using var restartedDb = Db(source.ConnectionString);
                var freshProcessing = new WebsiteNotificationProcessingService(restartedDb);
                var persistedPause = await freshProcessing.ReadSummaryAsync();
                Assert.True(persistedPause.IsPaused);
                var sender = new CountingSender();
                var resumedDispatcher = new WebsiteNotificationDispatcher(restartedDb, sender, NullLogger<WebsiteNotificationDispatcher>.Instance);
                Assert.False(await resumedDispatcher.ProcessNextAsync(default, nextDelivery.Id));
                Assert.Equal(0, sender.Count);
                Assert.Equal(0, await restartedDb.Set<WebNotificationAttempt>().CountAsync(item => item.WebNotificationDeliveryId == nextDelivery.Id));

                blockingSender.Release.TrySetResult();
                Assert.True(await dispatch.WaitAsync(TimeSpan.FromSeconds(10)));
                Assert.Equal(WebNotificationState.Accepted, (await restartedDb.Set<WebNotificationDelivery>().AsNoTracking().SingleAsync(item => item.Id == firstDelivery.Id)).State);
                await freshProcessing.ChangeAsync(new(persistedPause.Version, false, "Synthetic provider restored"), actor.Id);
                Assert.True(await resumedDispatcher.ProcessNextAsync(default, nextDelivery.Id));
                Assert.Equal(1, sender.Count);
                Assert.Equal(2, await restartedDb.AuditEvents.CountAsync(item => item.EntityName == nameof(WebNotificationProcessingControl)));
            }
            finally
            {
                blockingSender.Release.TrySetResult();
                await dispatch.WaitAsync(TimeSpan.FromSeconds(10));
            }
        }
        finally
        {
            await using var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS {name} WITH (FORCE)", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private static PSeqOperationsDbContext Db(string connection) => new(new DbContextOptionsBuilder<PSeqOperationsDbContext>()
        .UseNpgsql(connection).Options, Options.Create(new PersistenceOptions()));
    private sealed class BlockingSender : IWebsiteNotificationSender
    {
        public TaskCompletionSource Started { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private async Task Send(CancellationToken token) { Started.TrySetResult(); await Release.Task.WaitAsync(token); }
        public Task SendContactAsync(WebContact contact, CancellationToken token) => Send(token);
        public Task SendTechnicalBriefAsync(WebContact contact, CancellationToken token) => Send(token);
        public Task SendOrderAsync(WebOrder order, CancellationToken token) => Send(token);
    }
    private sealed class CountingSender : IWebsiteNotificationSender
    {
        public int Count { get; private set; }
        private Task Send() { Count++; return Task.CompletedTask; }
        public Task SendContactAsync(WebContact contact, CancellationToken token) => Send();
        public Task SendTechnicalBriefAsync(WebContact contact, CancellationToken token) => Send();
        public Task SendOrderAsync(WebOrder order, CancellationToken token) => Send();
    }
}

public sealed class WebsiteNotificationQueueMonitorTests
{
    [Fact]
    public void PausedQueueStillReportsChangedAttentionBoundedRemindersRecoveryAndCountGauges()
    {
        var logger = new RecordingLogger();
        using var monitor = new WebsiteNotificationQueueMonitor(logger);
        using var listener = new MeterListener();
        var measurements = new Dictionary<string, int>();
        listener.InstrumentPublished = (instrument, owner) => { if (instrument.Meter.Name == WebsiteNotificationQueueMonitor.MeterName) owner.EnableMeasurementEvents(instrument); };
        listener.SetMeasurementEventCallback<int>((instrument, value, _, _) => measurements[instrument.Name] = value);
        listener.Start();
        var now = DateTimeOffset.UtcNow;
        var summary = new WebOpsNotificationSummaryDto(true, Guid.NewGuid(), now, "Private actor", "Private reason", 3, 2, 1, now.AddHours(-1), 1);
        monitor.Observe(summary, now, now);
        monitor.Observe(summary, now, now.AddMinutes(1));
        Assert.Single(logger.Events);
        monitor.Observe(summary, now, now.AddMinutes(15));
        Assert.Equal(2, logger.Events.Count);
        monitor.Observe(summary with { FailedCount = 2 }, now.AddMinutes(16), now.AddMinutes(16));
        Assert.Equal(3, logger.Events.Count);
        listener.RecordObservableInstruments();
        Assert.Equal(3, measurements["website.notifications.pending"]);
        Assert.Equal(2, measurements["website.notifications.processing"]);
        Assert.Equal(2, measurements["website.notifications.failed"]);
        Assert.Equal(1, measurements["website.notifications.expired_processing"]);
        Assert.Equal(1, measurements["website.notifications.paused"]);
        monitor.Observe(summary with { FailedCount = 0, ExpiredProcessingCount = 0 }, null, now.AddMinutes(17));
        Assert.Equal(new[] { 5410, 5410, 5410, 5411 }, logger.Events.Select(item => item.Id));
        Assert.All(logger.Events, item => { Assert.DoesNotContain("Private actor", item.Message); Assert.DoesNotContain("Private reason", item.Message); });
    }

    private sealed class RecordingLogger : ILogger<WebsiteNotificationQueueMonitor>
    {
        public List<(int Id, string Message)> Events { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) => Events.Add((eventId.Id, formatter(state, exception)));
    }
}
