namespace PhaenoPortal.App.Infrastructure.Persistence;

public sealed class PersistenceOptions
{
    public const string SectionName = "Persistence";

    public string CommercialSchema { get; init; } = "commercial_ops";

    public string LaboratorySchema { get; init; } = "lab_ops";

    public string WebsiteSchema { get; init; } = "website";

    public string MigrationsHistorySchema { get; init; } = "public";

    public string MigrationsHistoryTable { get; init; } = "__ef_migrations_history";

    public PersistenceOptions Validate()
    {
        ValidateIdentifier(CommercialSchema, nameof(CommercialSchema));
        ValidateIdentifier(LaboratorySchema, nameof(LaboratorySchema));
        ValidateIdentifier(WebsiteSchema, nameof(WebsiteSchema));
        ValidateIdentifier(MigrationsHistorySchema, nameof(MigrationsHistorySchema));
        ValidateIdentifier(
            MigrationsHistoryTable,
            nameof(MigrationsHistoryTable),
            allowLeadingUnderscore: true);

        var schemas = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            CommercialSchema,
            LaboratorySchema,
            WebsiteSchema,
            MigrationsHistorySchema
        };
        if (schemas.Count != 4)
        {
            throw new InvalidOperationException(
                "Commercial, Laboratory, Website, and migration-history schemas must be distinct.");
        }

        return this;
    }

    private static void ValidateIdentifier(
        string value,
        string optionName,
        bool allowLeadingUnderscore = false)
    {
        if (string.IsNullOrWhiteSpace(value)
            || (!IsLowerAsciiLetter(value[0])
                && !(allowLeadingUnderscore && value[0] == '_'))
            || value.Any(character => !IsLowerAsciiLetter(character)
                && !char.IsDigit(character)
                && character != '_'))
        {
            throw new InvalidOperationException(
                $"Persistence:{optionName} must be a lowercase snake_case PostgreSQL identifier.");
        }
    }

    private static bool IsLowerAsciiLetter(char character) =>
        character is >= 'a' and <= 'z';
}
