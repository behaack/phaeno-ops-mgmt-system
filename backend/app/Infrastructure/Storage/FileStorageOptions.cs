namespace PhaenoPortal.App.Infrastructure.Storage;

using Microsoft.Extensions.Options;

public static class FileStorageProviders
{
    public const string Local = "Local";
    public const string S3 = "S3";
}

public sealed class FileStorageOptions
{
    public const string SectionName = "FileStorage";

    public string Provider { get; set; } = FileStorageProviders.Local;

    public string LocalRootPath { get; set; } = "App_Data";

    public S3FileStorageOptions S3 { get; set; } = new();
}

public sealed class S3FileStorageOptions
{
    public string BucketName { get; set; } = string.Empty;

    public string Region { get; set; } = string.Empty;

    public string KeyPrefix { get; set; } = "phaeno-portal";

    public string ServiceUrl { get; set; } = string.Empty;

    public bool ForcePathStyle { get; set; }
}

internal sealed class FileStorageOptionsValidator(IWebHostEnvironment environment)
    : IValidateOptions<FileStorageOptions>
{
    public ValidateOptionsResult Validate(string? name, FileStorageOptions options)
    {
        if (string.Equals(options.Provider, FileStorageProviders.Local, StringComparison.OrdinalIgnoreCase))
        {
            if (environment.IsProduction())
            {
                return ValidateOptionsResult.Fail(
                    "FileStorage:Provider must be S3 in Production; local application storage is not durable production storage.");
            }

            return string.IsNullOrWhiteSpace(options.LocalRootPath)
                ? ValidateOptionsResult.Fail("FileStorage:LocalRootPath is required for the Local provider.")
                : ValidateOptionsResult.Success;
        }

        if (string.Equals(options.Provider, FileStorageProviders.S3, StringComparison.OrdinalIgnoreCase))
        {
            var failures = new List<string>();
            if (string.IsNullOrWhiteSpace(options.S3.BucketName))
            {
                failures.Add("FileStorage:S3:BucketName is required for the S3 provider.");
            }
            if (string.IsNullOrWhiteSpace(options.S3.Region))
            {
                failures.Add("FileStorage:S3:Region is required for the S3 provider.");
            }

            try
            {
                FileStorageKeys.NormalizePrefix(options.S3.KeyPrefix);
            }
            catch (ArgumentException)
            {
                failures.Add("FileStorage:S3:KeyPrefix must be a relative object-key prefix without traversal segments.");
            }

            return failures.Count == 0
                ? ValidateOptionsResult.Success
                : ValidateOptionsResult.Fail(failures);
        }

        return ValidateOptionsResult.Fail(
            $"FileStorage:Provider '{options.Provider}' is unsupported. Registered providers: Local, S3.");
    }
}
