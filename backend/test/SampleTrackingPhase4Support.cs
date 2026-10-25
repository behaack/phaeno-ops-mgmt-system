namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Npgsql;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using PhaenoPortal.App.Infrastructure.Storage;

internal static partial class SampleTrackingPhase4Support
{
    public static NpgsqlConnectionStringBuilder Connection(string role)
    {
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION"));
        if (connection.Host is not ("localhost" or "127.0.0.1" or "::1")) throw new InvalidOperationException("Phase 4 accepts only loopback disposable databases.");
        var source = Environment.GetEnvironmentVariable("PSEQ_PHASE4_SOURCE_DATABASE") ?? "";
        var restored = Environment.GetEnvironmentVariable("PSEQ_PHASE4_RESTORED_DATABASE") ?? "";
        if (!System.Text.RegularExpressions.Regex.IsMatch(source, "^pseq_handoff_test_[0-9a-f]{32}$")
            || restored != "pseq_phase4_restored_" + source["pseq_handoff_test_".Length..])
            throw new InvalidOperationException("Use the generated Phase 4 database pair.");
        connection.Database = role switch { "source" => source, "restored" => restored, _ => throw new ArgumentException("Unknown recovery role.") };
        connection.Pooling = false; return connection;
    }

    public static string Artifacts()
    {
        var root = Path.GetFullPath(Environment.GetEnvironmentVariable("PSEQ_PHASE4_ARTIFACTS") ?? throw new InvalidOperationException("An owned artifact directory is required."));
        if (!Directory.Exists(root) || (File.GetAttributes(root) & FileAttributes.ReparsePoint) != 0) throw new InvalidOperationException("Prepare a regular artifact directory.");
        return root;
    }

    public static IOperationalFileStorage Files(string role)
    {
        if (role is not ("source" or "restored")) throw new ArgumentException("Unknown private-file role.");
        var root = Path.GetFullPath(Environment.GetEnvironmentVariable("PSEQ_PHASE4_PRIVATE_ROOT") ?? throw new InvalidOperationException("An owned private root is required."));
        if (!root.StartsWith(Path.GetFullPath(Path.GetTempPath()), StringComparison.OrdinalIgnoreCase)
            || !System.Text.RegularExpressions.Regex.IsMatch(Path.GetFileName(root), "^phaeno-phase4-[0-9a-f]{32}$")
            || (File.GetAttributes(root) & FileAttributes.ReparsePoint) != 0)
            throw new InvalidOperationException("Private recovery files must use the generated temporary root outside the application.");
        return new OperationalFileStorageAdapter(new LocalFileStorage(new Phase4FileEnvironment(Path.Combine(root, "fixture-app")),
            Options.Create(new FileStorageOptions { LocalRootPath = Path.Combine(root, role) })));
    }

    public static PSeqOperationsDbContext Context(string role, DbCommandInterceptor? meter = null)
    {
        var settings = new PersistenceOptions();
        var options = new DbContextOptionsBuilder<PSeqOperationsDbContext>().UseNpgsql(Connection(role).ConnectionString,
            postgres => postgres.MigrationsHistoryTable(settings.MigrationsHistoryTable, settings.MigrationsHistorySchema))
            .AddInterceptors(new AuditSaveChangesInterceptor(new RecoveryAuditContext()));
        if (meter is not null) options.AddInterceptors(meter);
        return new(options.Options, Options.Create(settings));
    }

    public sealed class CleanScanner : IOperationalFileScanner
    {
        public Task<OperationalScanResult> ScanAsync(string key, CancellationToken ct) => Task.FromResult(new OperationalScanResult(OperationalFileScanStatus.Clean, "TEST synthetic scan outcome"));
    }
    private sealed class RecoveryAuditContext : ICurrentUserContext
    {
        public Guid? UserId => null;
        public Guid? OrganizationId => null;
        public string? RequestId => "TEST-Phase4-recovery";
    }
    private sealed class Phase4FileEnvironment(string root) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "PSeq.Phase4Test";
        public string EnvironmentName { get; set; } = "Test";
        public string ContentRootPath { get; set; } = root;
        public string WebRootPath { get; set; } = root;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    }
}

internal sealed class Phase4QueryMeter : DbCommandInterceptor
{
    public int Commands { get; set; }
    public override ValueTask<InterceptionResult<System.Data.Common.DbDataReader>> ReaderExecutingAsync(System.Data.Common.DbCommand command,
        CommandEventData eventData, InterceptionResult<System.Data.Common.DbDataReader> result, CancellationToken cancellationToken = default)
    { Commands++; return ValueTask.FromResult(result); }
}
