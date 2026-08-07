namespace PhaenoPortal.App.Infrastructure.Storage;

using Amazon;
using Amazon.S3;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.DataProvisioning.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.DataProvisioning.Application;

public static class StorageServiceCollectionExtensions
{
    public static IServiceCollection AddFileStorage(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        var section = configuration.GetSection(FileStorageOptions.SectionName);
        services.AddOptions<FileStorageOptions>()
            .Bind(section)
            .ValidateOnStart();
        services.AddSingleton<IValidateOptions<FileStorageOptions>, FileStorageOptionsValidator>();

        var provider = section[nameof(FileStorageOptions.Provider)]
            ?? FileStorageProviders.Local;
        if (string.Equals(provider, FileStorageProviders.Disabled, StringComparison.OrdinalIgnoreCase))
        {
            services.AddSingleton<IFileStorage, DisabledFileStorage>();
        }
        else if (string.Equals(provider, FileStorageProviders.Local, StringComparison.OrdinalIgnoreCase))
        {
            services.AddSingleton<IFileStorage, LocalFileStorage>();
        }
        else if (string.Equals(provider, FileStorageProviders.S3, StringComparison.OrdinalIgnoreCase))
        {
            services.AddSingleton<IAmazonS3>(serviceProvider =>
            {
                var options = serviceProvider
                    .GetRequiredService<IOptions<FileStorageOptions>>()
                    .Value
                    .S3;
                var clientConfiguration = new AmazonS3Config
                {
                    ForcePathStyle = options.ForcePathStyle
                };

                if (string.IsNullOrWhiteSpace(options.ServiceUrl))
                {
                    clientConfiguration.RegionEndpoint = RegionEndpoint.GetBySystemName(options.Region);
                }
                else
                {
                    clientConfiguration.ServiceURL = options.ServiceUrl;
                    clientConfiguration.AuthenticationRegion = options.Region;
                }

                return new AmazonS3Client(clientConfiguration);
            });
            services.AddSingleton<IFileStorage, S3FileStorage>();
        }
        else
        {
            throw new InvalidOperationException(
                $"FileStorage provider '{provider}' is unsupported. Registered providers: Disabled, Local, S3.");
        }

        services.AddSingleton<IManagedFileStorage, ManagedFileStorageAdapter>();
        services.AddSingleton<IOperationalFileStorage, OperationalFileStorageAdapter>();
        return services;
    }
}
