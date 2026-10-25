namespace PhaenoPortal.Test;

using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Npgsql;

internal static partial class SampleTrackingPhase4Support
{
    internal sealed record TableProof(string Schema, string Table, long Rows, string Sha256);
    private sealed record FileProof(string Path, long Bytes, string Sha256);

    public static async Task WriteAsync(string name, object value) => await File.WriteAllTextAsync(Path.Combine(Artifacts(), name),
        JsonSerializer.Serialize(value, new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true }));

    public static string PrivateFile(string role, string key)
    {
        if (role is not ("source" or "restored")) throw new ArgumentException("Unknown recovery role.");
        var root = OwnedPrivateRoot();
        var area = Path.Combine(root, role, "order-files") + Path.DirectorySeparatorChar;
        var target = Path.GetFullPath(Path.Combine(area, key.Replace('/', Path.DirectorySeparatorChar)));
        if (!target.StartsWith(area, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Private key leaves its owned storage area.");
        return target;
    }

    private static string OwnedPrivateRoot()
    {
        var root = Path.GetFullPath(Environment.GetEnvironmentVariable("PSEQ_PHASE4_PRIVATE_ROOT") ?? "");
        var parent = Path.TrimEndingDirectorySeparator(Path.GetFullPath(Path.GetTempPath())) + Path.DirectorySeparatorChar;
        if (!root.StartsWith(parent, StringComparison.OrdinalIgnoreCase)
            || Path.GetDirectoryName(root) + Path.DirectorySeparatorChar != parent
            || !System.Text.RegularExpressions.Regex.IsMatch(Path.GetFileName(root), "^phaeno-phase4-[0-9a-f]{32}$"))
            throw new InvalidOperationException("Cleanup accepts only the generated direct temporary child.");
        return root;
    }

    public static async Task RunAsync(Func<Task> capture, Func<Task> recover,
        Func<string, Task>? beforeCleanup = null, string? receiptSubdirectory = null,
        Func<string, Task>? afterDatabaseCreated = null)
    {
        var receiptRoot = Artifacts();
        if (receiptSubdirectory is not null)
        {
            if (!System.Text.RegularExpressions.Regex.IsMatch(receiptSubdirectory, "^[a-z0-9-]+$")) throw new ArgumentException("Use a bounded receipt directory name.");
            receiptRoot = Path.Combine(receiptRoot, receiptSubdirectory);
            if (Directory.Exists(receiptRoot)) throw new InvalidOperationException("Do not overwrite recovery receipts.");
            Directory.CreateDirectory(receiptRoot);
        }
        Task Save(string name, object value) => File.WriteAllTextAsync(Path.Combine(receiptRoot, name),
            JsonSerializer.Serialize(value, new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true }));
        var reference = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION"));
        if (reference.Host is not ("localhost" or "127.0.0.1" or "::1") || string.IsNullOrWhiteSpace(reference.Database))
            throw new InvalidOperationException("Use a local reference connection; the runner generates separate databases.");
        var id = Guid.NewGuid().ToString("N");
        var source = "pseq_handoff_test_" + id; var restored = "pseq_phase4_restored_" + id;
        var privateRoot = Path.Combine(Path.GetTempPath(), "phaeno-phase4-" + id);
        var keys = new[] { "PSEQ_OPERATIONS_REFERENCE_CONNECTION", "PSEQ_PHASE4_SOURCE_DATABASE", "PSEQ_PHASE4_RESTORED_DATABASE", "PSEQ_PHASE4_PRIVATE_ROOT" };
        var previous = keys.ToDictionary(k => k, Environment.GetEnvironmentVariable);
        var created = new List<string>(); var creationAttempted = new List<string>(); var cleaned = new List<string>(); var success = false; var ownsPrivateRoot = false; var started = DateTime.UtcNow;
        var adminSettings = new NpgsqlConnectionStringBuilder(reference.ConnectionString) { Database = "postgres", Pooling = false };
        TableProof[]? before = null; TableProof[]? after = null; Exception? operationError = null;
        IReadOnlyList<Phase4Cleanup.Failure> cleanupErrors = [];
        bool Preserved() => before is not null && after is not null && before.SequenceEqual(after);
        bool ResourcesRemoved() => cleaned.Count == creationAttempted.Count && (!ownsPrivateRoot || !Directory.Exists(privateRoot));
        Task Ownership() => Save("ownership.json", new { source, restored, privateRoot, privateRootOwned = ownsPrivateRoot,
            created = created.ToArray(), creationAttempted = creationAttempted.ToArray(), configuredDevelopmentDatabase = reference.Database, scope = "Generated local fixtures only; no credentials" });
        try
        {
            // Persist intended identities before setup, including setup failures and uncertain responses.
            await Ownership();
            before = await FingerprintTables(reference); await Save("development-before.json", before);
            Environment.SetEnvironmentVariable(keys[1], source); Environment.SetEnvironmentVariable(keys[2], restored);
            Environment.SetEnvironmentVariable(keys[3], privateRoot);
            if (Directory.Exists(privateRoot)) throw new InvalidOperationException("Refusing an existing private root.");
            Directory.CreateDirectory(privateRoot); ownsPrivateRoot = true; await Ownership();
            await using (var admin = new NpgsqlConnection(adminSettings.ConnectionString))
            {
                await admin.OpenAsync();
                foreach (var name in new[] { source, restored })
                {
                    if (name == reference.Database) throw new InvalidOperationException("Generated database must differ from configured development.");
                    await using (var absent = new NpgsqlCommand("SELECT count(*) FROM pg_database WHERE datname = @name", admin))
                    {
                        absent.Parameters.AddWithValue("name", name);
                        if ((long)(await absent.ExecuteScalarAsync())! != 0) throw new InvalidOperationException("Refusing a pre-existing fixture identity.");
                    }
                    // A lost CREATE response is uncertain, not proof of absence. Persist ownership
                    // after absence verification and before issuing the command, then reconcile it independently.
                    creationAttempted.Add(name); await Ownership();
                    await using var command = new NpgsqlCommand($"CREATE DATABASE \"{name}\" TEMPLATE template0", admin);
                    await command.ExecuteNonQueryAsync();
                    if (afterDatabaseCreated is not null) await afterDatabaseCreated(name);
                    created.Add(name); await Ownership();
                }
            }
            var sourceSettings = new NpgsqlConnectionStringBuilder(reference.ConnectionString) { Database = source, Pooling = false };
            Environment.SetEnvironmentVariable(keys[0], sourceSettings.ConnectionString);
            await Save("progress.json", new { stage = "connected-journey", atUtc = DateTime.UtcNow });
            await capture();
            await Save("progress.json", new { stage = "backup-and-restore", atUtc = DateTime.UtcNow });
            var sourceProof = await FingerprintTables(sourceSettings); await Save("source-tables.json", sourceProof);
            var dump = Path.Combine(privateRoot, "database.dump");
            await RunTool("pg_dump", sourceSettings, "--format=custom", "--no-owner", "--no-acl", "--file", dump);
            var dumpHash = Convert.ToHexString(SHA256.HashData(await File.ReadAllBytesAsync(dump)));
            var sourceFiles = Path.Combine(privateRoot, "source"); var backupFiles = Path.Combine(privateRoot, "backup");
            CopyTree(sourceFiles, backupFiles);
            var fileProof = await FingerprintFiles(sourceFiles); Assert.NotEmpty(fileProof);
            Assert.Equal(fileProof, await FingerprintFiles(backupFiles)); await Save("backup-files.json", fileProof);
            var restoredSettings = new NpgsqlConnectionStringBuilder(sourceSettings.ConnectionString) { Database = restored };
            Assert.Equal(dumpHash, Convert.ToHexString(SHA256.HashData(await File.ReadAllBytesAsync(dump))));
            await RunTool("pg_restore", restoredSettings, "--exit-on-error", "--no-owner", "--no-acl", "--dbname", restored, dump);
            var restoredProof = await FingerprintTables(restoredSettings); Assert.Equal(sourceProof, restoredProof);
            await Save("restored-tables.json", restoredProof);
            var restoredFiles = Path.Combine(privateRoot, "restored"); CopyTree(backupFiles, restoredFiles);
            Assert.Equal(fileProof, await FingerprintFiles(restoredFiles));
            Assert.Equal(privateRoot, Path.GetDirectoryName(sourceFiles)); RejectLinks(sourceFiles);
            Directory.Move(sourceFiles, Path.Combine(privateRoot, "source-offline"));
            await Save("progress.json", new { stage = "restored-functional-checks", atUtc = DateTime.UtcNow });
            await recover();
            await Save("backup-restore.json", new { result = "passed", source, restored, dumpSha256 = dumpHash,
                tables = sourceProof.Length, rows = sourceProof.Sum(t => t.Rows), files = fileProof.Length,
                allTableContentsEqual = true, migrationsIncluded = sourceProof.Any(t => t.Table == "__ef_migrations_history"),
                independentFilesEqual = true, originalFilesOffline = true, syntheticOnly = true });
            success = true;
        }
        catch (Exception error) { operationError = error; }
        finally
        {
            var actions = creationAttempted.Select(name => new Phase4Cleanup.Action("database:" + name, async () =>
            {
                Assert.Contains(name, new[] { source, restored }); Assert.NotEqual(reference.Database, name);
                if (beforeCleanup is not null) await beforeCleanup("database:" + name);
                // Each cleanup reconnects independently; a broken setup/drop connection cannot poison the next attempt.
                await using var admin = new NpgsqlConnection(adminSettings.ConnectionString); await admin.OpenAsync();
                await using (var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{name}\" WITH (FORCE)", admin)) await drop.ExecuteNonQueryAsync();
                await using var absent = new NpgsqlCommand("SELECT count(*) FROM pg_database WHERE datname = @name", admin); absent.Parameters.AddWithValue("name", name);
                Assert.Equal(0L, await absent.ExecuteScalarAsync()); cleaned.Add(name);
            })).ToList();
            actions.Add(new("private-files", () =>
            {
                if (ownsPrivateRoot && Directory.Exists(privateRoot))
                { Assert.Equal(privateRoot, OwnedPrivateRoot()); RejectLinks(privateRoot); Directory.Delete(privateRoot, recursive: true); }
                return Task.CompletedTask;
            }));
            actions.Add(new("development-preservation", async () =>
            {
                after = await FingerprintTables(reference); await Save("development-after.json", after);
                if (before is not null) Assert.Equal(before, after);
            }));
            cleanupErrors = await Phase4Cleanup.FinishAsync(actions,
                () => { foreach (var key in keys) Environment.SetEnvironmentVariable(key, previous[key]); },
                [new("cleanup-receipt", failures => Save("cleanup.json", new {
                    result = failures.Count == 0 && ResourcesRemoved() ? "passed" : "failed", created, creationAttempted, droppedAndAbsent = cleaned,
                    remainingKnownDatabases = creationAttempted.Except(cleaned).ToArray(), privateRootOwned = ownsPrivateRoot,
                    privateRootRemoved = ownsPrivateRoot && !Directory.Exists(privateRoot), configuredDevelopmentUnchanged = Preserved(),
                    errors = failures.Select(f => new { action = f.Action, errorType = f.Error.GetType().Name }).ToArray() })),
                 new("run-receipt", failures => Save("run.json", new {
                    result = success && failures.Count == 0 && Preserved() && ResourcesRemoved() ? "passed" : "failed",
                    startedAtUtc = started, completedAtUtc = DateTime.UtcNow, operationErrorType = operationError?.GetType().Name,
                    cleanupErrors = failures.Select(f => new { action = f.Action, errorType = f.Error.GetType().Name }).ToArray(),
                    scope = "Synthetic connected local Portal journey and independent PostgreSQL/private-file recovery. No deployment, DPS or hosted writes." }))]);
        }
        Phase4Cleanup.ThrowIfFailed(operationError, cleanupErrors);
    }

    internal static async Task<TableProof[]> FingerprintTables(NpgsqlConnectionStringBuilder settings)
    {
        await using var db = new NpgsqlConnection(settings.ConnectionString); await db.OpenAsync();
        var names = new List<(string Schema, string Table)>();
        await using (var command = new NpgsqlCommand("SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY schemaname, tablename", db))
        await using (var reader = await command.ExecuteReaderAsync()) while (await reader.ReadAsync()) names.Add((reader.GetString(0), reader.GetString(1)));
        var result = new List<TableProof>();
        foreach (var (schema, table) in names)
        {
            static string Quote(string identifier) => '"' + identifier.Replace("\"", "\"\"") + '"';
            await using var command = new NpgsqlCommand($"SELECT to_jsonb(t)::text FROM {Quote(schema)}.{Quote(table)} AS t ORDER BY to_jsonb(t)::text COLLATE \"C\"", db);
            await using var reader = await command.ExecuteReaderAsync(); using var sha = IncrementalHash.CreateHash(HashAlgorithmName.SHA256); long count = 0;
            while (await reader.ReadAsync()) { sha.AppendData(Encoding.UTF8.GetBytes(reader.GetString(0) + "\n")); count++; }
            result.Add(new(schema, table, count, Convert.ToHexString(sha.GetHashAndReset())));
        }
        return result.ToArray();
    }

    private static void RejectLinks(string root)
    {
        if ((File.GetAttributes(root) & FileAttributes.ReparsePoint) != 0) throw new InvalidOperationException("Recovery fixture cannot contain filesystem links.");
        foreach (var entry in Directory.EnumerateFileSystemEntries(root))
        {
            if ((File.GetAttributes(entry) & FileAttributes.ReparsePoint) != 0) throw new InvalidOperationException("Recovery fixture cannot contain filesystem links.");
            if (Directory.Exists(entry)) RejectLinks(entry);
        }
    }
    private static void CopyTree(string source, string target)
    {
        RejectLinks(source); Assert.False(Directory.Exists(target)); Directory.CreateDirectory(target);
        foreach (var file in Directory.EnumerateFiles(source, "*", SearchOption.AllDirectories))
        {
            var destination = Path.Combine(target, Path.GetRelativePath(source, file)); Directory.CreateDirectory(Path.GetDirectoryName(destination)!); File.Copy(file, destination);
        }
    }
    private static async Task<FileProof[]> FingerprintFiles(string root)
    {
        RejectLinks(root); var result = new List<FileProof>();
        foreach (var file in Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories).Order(StringComparer.Ordinal))
        {
            await using var stream = File.OpenRead(file);
            result.Add(new(Path.GetRelativePath(root, file).Replace('\\', '/'), stream.Length, Convert.ToHexString(await SHA256.HashDataAsync(stream))));
        }
        return result.ToArray();
    }
    private static async Task RunTool(string tool, NpgsqlConnectionStringBuilder settings, params string[] arguments)
    {
        var directory = Environment.GetEnvironmentVariable("PSEQ_POSTGRES_TOOLS_DIRECTORY") ?? throw new InvalidOperationException("PostgreSQL tools directory is required.");
        var start = new ProcessStartInfo(Path.Combine(directory, tool + (OperatingSystem.IsWindows() ? ".exe" : "")))
            { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
        foreach (var arg in arguments) start.ArgumentList.Add(arg);
        start.Environment["PGHOST"] = settings.Host; start.Environment["PGPORT"] = settings.Port.ToString(); start.Environment["PGDATABASE"] = settings.Database;
        start.Environment["PGUSER"] = settings.Username; start.Environment["PGPASSWORD"] = settings.Password ?? "";
        using var process = Process.Start(start)!; var output = process.StandardOutput.ReadToEndAsync(); var error = process.StandardError.ReadToEndAsync();
        using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(2));
        try { await process.WaitForExitAsync(timeout.Token); } catch { process.Kill(entireProcessTree: true); throw; }
        await output; Assert.True(process.ExitCode == 0, $"{tool} failed: {await error}");
    }
}
