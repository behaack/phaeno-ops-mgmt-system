using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Options;

namespace PhaenoPortal.App.Infrastructure.Persistence;

public sealed class DesignTimePSeqOperationsDbContextFactory
    : IDesignTimeDbContextFactory<PSeqOperationsDbContext>
{
    public PSeqOperationsDbContext CreateDbContext(string[] args)
    {
        string environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
        string basePath = ResolveAppSettingsPath();

        IConfiguration configuration = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .AddEnvironmentVariables()
            .AddCommandLine(args)
            .Build();

        var persistenceOptions = new PersistenceOptions();
        configuration.GetSection(PersistenceOptions.SectionName).Bind(persistenceOptions);
        persistenceOptions.Validate();

        string? connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Connection string 'DefaultConnection' is required for EF Core migrations.");
        }

        var optionsBuilder = new DbContextOptionsBuilder<PSeqOperationsDbContext>();
        optionsBuilder.UseNpgsql(
            connectionString,
            npgsql => npgsql.MigrationsHistoryTable(
                persistenceOptions.MigrationsHistoryTable,
                persistenceOptions.MigrationsHistorySchema));

        return new PSeqOperationsDbContext(
            optionsBuilder.Options,
            Options.Create(persistenceOptions));
    }

    private static string ResolveAppSettingsPath()
    {
        string currentDirectory = Directory.GetCurrentDirectory();

        if (File.Exists(Path.Combine(currentDirectory, "appsettings.json")))
        {
            return currentDirectory;
        }

        string appDirectory = Path.Combine(currentDirectory, "app");
        if (File.Exists(Path.Combine(appDirectory, "appsettings.json")))
        {
            return appDirectory;
        }

        string backendAppDirectory = Path.Combine(currentDirectory, "backend", "app");
        if (File.Exists(Path.Combine(backendAppDirectory, "appsettings.json")))
        {
            return backendAppDirectory;
        }

        throw new InvalidOperationException("Could not locate backend appsettings.json for EF Core design-time services.");
    }
}
