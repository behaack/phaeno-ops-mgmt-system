using System.Text.Json.Nodes;
using Npgsql;
using NpgsqlTypes;

internal static partial class DatabaseReset
{
    private static readonly HashSet<string> ModelSeedTables = ["commercial_ops.crm_pipelines", "commercial_ops.crm_pipeline_stages", "commercial_ops.trial_deliverable_definitions", "commercial_ops.released_deliverable_policy_defaults", "lab_ops.lab_product_types", "website.web_notification_processing_controls"];
    private static async Task Import(NpgsqlConnection db, string path, bool verifyOnly)
    {
        var bytes = await File.ReadAllBytesAsync(path); var hash = Hash(bytes);
        var package = JsonNode.Parse(bytes)!.AsObject();
        if (package["format"]?.GetValue<int>() != 1 || package["kind"]?.GetValue<string>() != "reviewed-reset-package")
            throw new InvalidOperationException("Expected a reviewed reset package, not a raw snapshot.");
        var designatedTarget = package["targetDatabase"]?.GetValue<string>() == db.Database;
        var activatedTarget = verifyOnly && package["activatedDatabase"]?.GetValue<string>() == db.Database;
        if ((!designatedTarget && !activatedTarget) || (!verifyOnly && package["sourceDatabase"]?.GetValue<string>() == db.Database))
            throw new InvalidOperationException("Package target must be the designated replacement, distinct from its source.");
        if (package["dispositions"] is not JsonObject dispositions || dispositions.Count == 0)
            throw new InvalidOperationException("Every target table needs an explicit preservation disposition.");
        var tables = package["tables"]!.AsArray().Select(n => n!.AsObject()).ToDictionary(n => n["key"]!.GetValue<string>());
        await using var tx = await db.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        await new NpgsqlCommand("SELECT pg_advisory_xact_lock(71920260919)", db).ExecuteNonQueryAsync();
        var value = await new NpgsqlCommand("SELECT shobj_description(oid, 'pg_database') FROM pg_database WHERE datname=current_database()", db).ExecuteScalarAsync();
        var marker = value is string comment ? comment : null;
        var expectedMarker = "phaeno-reset-v1:" + hash;
        if (marker == expectedMarker)
        {
            await VerifyRows(db, tables, dispositions); await tx.CommitAsync();
            Console.WriteLine("import=ALREADY_APPLIED verification=PASS"); return;
        }
        if (verifyOnly) throw new InvalidOperationException("Target does not contain this exact import receipt.");
        if (!string.IsNullOrEmpty(marker)) throw new InvalidOperationException("Target already has a database comment; refusing reset.");
        var migrations = await Query(db, "SELECT COALESCE(jsonb_agg(\"MigrationId\"),'[]')::text FROM public.__ef_migrations_history");
        if (migrations.Count != 1 || migrations[0]!.GetValue<string>() != package["baselineMigration"]!.GetValue<string>())
            throw new InvalidOperationException("Replacement must contain exactly the reviewed initial migration.");
        var targets = await Query(db, "SELECT jsonb_agg(table_schema||'.'||table_name ORDER BY table_schema,table_name)::text FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema IN ('commercial_ops','lab_ops','website')");
        if (targets.Count != dispositions.Count || tables.Keys.Any(k => !dispositions.ContainsKey(k))) throw new InvalidOperationException("Package does not classify exactly the target tables.");
        foreach (var item in targets)
        {
            var key = item!.GetValue<string>();
            if (!dispositions.ContainsKey(key)) throw new InvalidOperationException($"Unclassified target table: {key}");
            var existing = await ReadRows(db, key);
            if (existing.Count > 0 && (!ModelSeedTables.Contains(key) || package["expectedModelSeeds"]?[key] is not JsonArray expected || !JsonNode.DeepEquals(existing, await NormalizeRows(db, key, expected))))
                throw new InvalidOperationException($"Target is not fresh; unexpected existing records in {key}");
        }
        var dependencies = (await Query(db, ForeignKeysSql)).Select(n => (Table:n!["table"]!.GetValue<string>(), Target:n["target"]!.GetValue<string>())).ToArray();
        var pending = tables.Where(t => t.Value["rows"]!.AsArray().Count > 0).Select(t => t.Key).ToHashSet();
        while (pending.Count > 0)
        {
            var ready = pending.Where(key => dependencies.Where(d => d.Table == key && d.Target != key).All(d => !pending.Contains(d.Target))).Order().ToArray();
            if (ready.Length == 0) throw new InvalidOperationException("Cross-table dependency cycle requires a reviewed mapping.");
            foreach (var key in ready)
            {
                var rows = tables[key]["rows"]!.AsArray();
                if (rows.Count > 0)
                {
                    var columns = tables[key]["columns"]!.AsArray().Where(c => c!["generated"]?.GetValue<string>() != "ALWAYS").Select(c => c!["name"]!.GetValue<string>()).ToArray();
                    if (!columns.Contains("id")) throw new InvalidOperationException($"No stable id in {key}");
                    var names = string.Join(",", columns.Select(Identifier));
                    var updates = string.Join(",", columns.Where(c => c != "id").Select(c => $"{Identifier(c)}=EXCLUDED.{Identifier(c)}"));
                    await using var command = new NpgsqlCommand($"INSERT INTO {Qualified(key)} ({names}) SELECT {names} FROM jsonb_populate_recordset(NULL::{Qualified(key)},@rows) ON CONFLICT (id) DO UPDATE SET {updates}", db) { CommandTimeout = 120 };
                    command.Parameters.AddWithValue("rows", NpgsqlDbType.Jsonb, rows.ToJsonString());
                    await command.ExecuteNonQueryAsync();
                }
                pending.Remove(key);
            }
        }
        await VerifyRows(db, tables, dispositions);
        await new NpgsqlCommand($"COMMENT ON DATABASE {Identifier(db.Database)} IS '{expectedMarker}'", db).ExecuteNonQueryAsync();
        await tx.CommitAsync(); Console.WriteLine($"import=PASS tables={tables.Count} manifest_sha256={hash}");
    }
    private static async Task VerifyRows(NpgsqlConnection db, Dictionary<string,JsonObject> tables, JsonObject dispositions)
    {
        foreach (var (key, disposition) in dispositions)
        {
            if (disposition?.GetValue<string>() is not ("preserve" or "seed" or "discard" or "system")) throw new InvalidOperationException($"Unresolved disposition: {key}");
            var actual = await ReadRows(db, key);
            var expected = tables.TryGetValue(key, out var table) ? table["rows"]!.AsArray() : new JsonArray();
            var normalized = await NormalizeRows(db, key, expected);
            if (!JsonNode.DeepEquals(actual, normalized)) throw new InvalidOperationException($"Preservation mismatch: {key} expected={expected.Count} actual={actual.Count}");
        }
    }
    private static async Task<JsonNode> NormalizeRows(NpgsqlConnection db, string key, JsonArray rows)
    {
        await using var command = new NpgsqlCommand($"SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)->>'id'),'[]')::text FROM jsonb_populate_recordset(NULL::{Qualified(key)},@rows) t", db);
        command.Parameters.AddWithValue("rows", NpgsqlDbType.Jsonb, rows.ToJsonString());
        return JsonNode.Parse((string)(await command.ExecuteScalarAsync())!)!;
    }
}
