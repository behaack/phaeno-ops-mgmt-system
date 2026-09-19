using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using Npgsql;
using NpgsqlTypes;

// No Portal startup: this maintenance process cannot start workers, bootstrap or external services.
return await DatabaseReset.RunAsync(args);

internal static partial class DatabaseReset
{
    private static readonly HashSet<string> Schemas = ["commercial_ops", "lab_ops", "website"];
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    public static async Task<int> RunAsync(string[] args)
    {
        try
        {
            if (args.Length < 3 || args[0] is not ("snapshot" or "apply" or "verify"))
                throw new InvalidOperationException("Usage: snapshot OUTPUT EXPECTED_DATABASE [--local-config PATH] | apply/verify PACKAGE EXPECTED_DATABASE [--local-config PATH]");
            var connection = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
            var local = Array.IndexOf(args, "--local-config");
            if (local >= 0)
            {
                if (local + 1 >= args.Length) throw new InvalidOperationException("Missing local configuration path.");
                var config = JsonNode.Parse(await File.ReadAllTextAsync(args[local + 1]))!;
                connection = config["ConnectionStrings"]?["DefaultConnection"]?.GetValue<string>();
            }
            if (string.IsNullOrWhiteSpace(connection)) throw new InvalidOperationException("An explicit connection is required.");
            await using var db = new NpgsqlConnection(connection);
            await db.OpenAsync();
            if (db.Database != args[2]) throw new InvalidOperationException("Database does not match the literal expected target.");
            if (args[0] == "snapshot") await Snapshot(db, args[1]);
            else await Import(db, args[1], args[0] == "verify");
            return 0;
        }
        catch (Exception error)
        {
            var reason = error switch { PostgresException pg => $"sqlstate={pg.SqlState} table={pg.SchemaName}.{pg.TableName} constraint={pg.ConstraintName}", NpgsqlException => "Database connection or command failed.", _ => error.Message };
            Console.Error.WriteLine($"database_reset=FAIL type={error.GetType().Name} reason={reason}"); return 1;
        }
    }
    private static async Task<JsonArray> Query(NpgsqlConnection db, string sql)
    {
        await using var command = new NpgsqlCommand(sql, db) { CommandTimeout = 120 };
        return JsonNode.Parse((string)(await command.ExecuteScalarAsync() ?? "[]"))!.AsArray();
    }
    private static async Task Snapshot(NpgsqlConnection db, string path)
    {
        await using var tx = await db.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead);
        await new NpgsqlCommand("SET TRANSACTION READ ONLY", db).ExecuteNonQueryAsync();
        var inventory = await Query(db, "SELECT COALESCE(jsonb_agg(table_schema||'.'||table_name ORDER BY table_schema,table_name),'[]')::text FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema IN ('commercial_ops','lab_ops','website')");
        var tables = new JsonArray();
        foreach (var entry in inventory)
        {
            var key = entry!.GetValue<string>(); var parts = key.Split('.');
            var rows = await ReadRows(db, key);
            var columns = await Query(db, $"SELECT jsonb_agg(jsonb_build_object('name',column_name,'type',udt_name,'nullable',is_nullable,'generated',is_generated) ORDER BY ordinal_position)::text FROM information_schema.columns WHERE table_schema='{parts[0]}' AND table_name='{parts[1]}'");
            tables.Add(new JsonObject { ["key"] = key, ["columns"] = columns, ["rows"] = rows });
            Console.WriteLine($"{key}={rows.Count}");
        }
        var foreignKeys = await Query(db, ForeignKeysSql);
        var migrations = await Query(db, "SELECT COALESCE(jsonb_agg(\"MigrationId\" ORDER BY \"MigrationId\"),'[]')::text FROM public.__ef_migrations_history");
        var schemaObjects = await Query(db, """
            SELECT COALESCE(jsonb_agg(item ORDER BY item->>'kind',item->>'key'),'[]')::text FROM (
                SELECT jsonb_build_object('kind','column','key',table_schema||'.'||table_name||'.'||column_name,
                    'type',udt_name,'nullable',is_nullable,'default',column_default,'length',character_maximum_length,
                    'precision',numeric_precision,'scale',numeric_scale,'identity',is_identity,'generated',generation_expression) AS item
                FROM information_schema.columns WHERE table_schema IN ('commercial_ops','lab_ops','website')
                UNION ALL SELECT jsonb_build_object('kind','index','key',schemaname||'.'||indexname,'definition',indexdef)
                FROM pg_indexes WHERE schemaname IN ('commercial_ops','lab_ops','website')
                UNION ALL SELECT jsonb_build_object('kind','constraint','key',n.nspname||'.'||c.relname||'.'||co.conname,'definition',pg_get_constraintdef(co.oid))
                FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
                WHERE n.nspname IN ('commercial_ops','lab_ops','website')
                UNION ALL SELECT jsonb_build_object('kind','trigger','key',n.nspname||'.'||c.relname||'.'||t.tgname,'definition',pg_get_triggerdef(t.oid))
                FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
                WHERE NOT t.tgisinternal AND n.nspname IN ('commercial_ops','lab_ops','website')
                UNION ALL SELECT jsonb_build_object('kind','routine','key',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')','definition',pg_get_functiondef(p.oid))
                FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prokind='f' AND n.nspname IN ('commercial_ops','lab_ops','website')
            ) objects
            """);
        var snapshot = new JsonObject { ["format"] = 1, ["sourceDatabase"] = db.Database, ["serverVersion"] = db.PostgreSqlVersion.ToString(), ["capturedAtUtc"] = DateTime.UtcNow, ["migrations"] = migrations, ["tables"] = tables, ["foreignKeys"] = foreignKeys, ["schemaObjects"] = schemaObjects };
        await File.WriteAllTextAsync(path, snapshot.ToJsonString(JsonOptions));
        await tx.CommitAsync();
        Console.WriteLine($"snapshot=PASS tables={tables.Count} sha256={Hash(await File.ReadAllBytesAsync(path))}");
    }
    private const string ForeignKeysSql = """
        SELECT COALESCE(jsonb_agg(jsonb_build_object('table',n.nspname||'.'||c.relname,'target',tn.nspname||'.'||tc.relname,'name',co.conname,'definition',pg_get_constraintdef(co.oid)) ORDER BY n.nspname,c.relname,co.conname),'[]')::text
        FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
        JOIN pg_class tc ON tc.oid=co.confrelid JOIN pg_namespace tn ON tn.oid=tc.relnamespace
        WHERE co.contype='f' AND n.nspname IN ('commercial_ops','lab_ops','website')
        """;
    private static Task<JsonArray> ReadRows(NpgsqlConnection db, string key) => Query(db, $"SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)->>'id'),'[]')::text FROM {Qualified(key)} t");
    private static string Qualified(string name)
    {
        var parts = name.Split('.');
        if (parts.Length != 2 || !Schemas.Contains(parts[0])) throw new InvalidOperationException("Invalid schema/table identifier.");
        return Identifier(parts[0]) + "." + Identifier(parts[1]);
    }
    private static string Identifier(string name)
    {
        if (name.Length == 0 || name.Any(c => !char.IsAsciiLetterOrDigit(c) && c != '_')) throw new InvalidOperationException("Invalid identifier.");
        return '"' + name + '"';
    }
    private static string Hash(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
}
