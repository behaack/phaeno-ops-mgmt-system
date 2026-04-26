namespace PhaenoPortal.App.Infrastructure.Persistence;

public sealed class PersistenceOptions
{
    public const string SectionName = "Persistence";

    public string Schema { get; init; } = "portal";

    public string MigrationsHistoryTable { get; init; } = "__ef_migrations_history";
}
