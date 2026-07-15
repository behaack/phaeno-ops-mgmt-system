using System.IO.Compression;
using System.Net;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.DataProvisioning.Controllers;
using PhaenoPortal.App.Features.DataProvisioning.Domain;
using PhaenoPortal.App.Features.DataProvisioning.DTOs;
using PhaenoPortal.App.Features.DataProvisioning.Services;
using PhaenoPortal.App.Features.RelationshipManagement.Controllers;
using PhaenoPortal.App.Features.RelationshipManagement.Domain;
using PhaenoPortal.App.Features.RelationshipManagement.DTOs;
using PhaenoPortal.App.Features.RelationshipManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

return await ReferenceJourney.RunAsync();

internal static class ReferenceJourney
{
    private const string ConnectionEnvironmentVariable =
        "PHAENO_PORTAL_REFERENCE_CONNECTION";
    private const string SchemaEnvironmentVariable =
        "PHAENO_PORTAL_REFERENCE_SCHEMA";

    public static async Task<int> RunAsync()
    {
        var connectionString = Environment.GetEnvironmentVariable(
            ConnectionEnvironmentVariable);
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            Console.Error.WriteLine(
                $"Set {ConnectionEnvironmentVariable} to an isolated or development PostgreSQL connection string.");
            return 2;
        }

        var schema = Environment.GetEnvironmentVariable(SchemaEnvironmentVariable);
        if (string.IsNullOrWhiteSpace(schema))
        {
            schema = "portal";
        }

        var runKey = Guid.NewGuid().ToString("N");
        var storageRoot = Path.Combine(
            Path.GetTempPath(),
            "phaeno-portal-reference-journey",
            runKey);
        Directory.CreateDirectory(storageRoot);

        try
        {
            await RunJourneyAsync(connectionString, schema, storageRoot, runKey);
            Console.WriteLine(
                "PASS: relationship request and entitlement integrity, synthetic source, immutable publication, exact-version grant, tenant downloads, isolation, audit, revocation, and rollback.");
            return 0;
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine($"FAIL: {exception}");
            if (exception is DbUpdateConcurrencyException concurrencyException)
            {
                foreach (var entry in concurrencyException.Entries)
                {
                    var version = entry.Metadata.FindProperty("Version");
                    var originalVersion = version is null
                        ? null
                        : entry.Property(version.Name).OriginalValue;
                    var currentVersion = version is null
                        ? null
                        : entry.Property(version.Name).CurrentValue;
                    Console.Error.WriteLine(
                        $"Concurrency entry: {entry.Metadata.ClrType.Name}; original version={originalVersion}; current version={currentVersion}.");
                }
            }
            if (exception is DataProvisioningException provisioningException
                && provisioningException.Details is not null)
            {
                Console.Error.WriteLine(
                    $"Provisioning details: {System.Text.Json.JsonSerializer.Serialize(provisioningException.Details)}");
            }
            return 1;
        }
        finally
        {
            if (Directory.Exists(storageRoot))
            {
                Directory.Delete(storageRoot, recursive: true);
            }
        }
    }

    private static async Task RunJourneyAsync(
        string connectionString,
        string schema,
        string storageRoot,
        string runKey)
    {
        var currentUser = new MutableCurrentUserContext();
        var persistenceOptions = new PersistenceOptions
        {
            Schema = schema
        };
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(
                connectionString,
                npgsql => npgsql.MigrationsHistoryTable(
                    persistenceOptions.MigrationsHistoryTable,
                    persistenceOptions.Schema))
            .AddInterceptors(new AuditSaveChangesInterceptor(currentUser))
            .Options;

        await using var dbContext = new AppDbContext(
            dbOptions,
            Options.Create(persistenceOptions));
        Require(
            await dbContext.Database.CanConnectAsync(),
            "The configured PostgreSQL database is unavailable.");
        var pendingMigrations = await dbContext.Database
            .GetPendingMigrationsAsync();
        Require(
            !pendingMigrations.Any(),
            $"Apply pending migrations before running the journey: {string.Join(", ", pendingMigrations)}");

        await using var transaction = await dbContext.Database
            .BeginTransactionAsync();
        var transactionCompleted = false;
        var sourceLabel = $"Synthetic reference {runKey}";

        try
        {
            var identities = await SeedReferenceOrganizationsAsync(
                dbContext,
                runKey);
            currentUser.UserId = identities.PlatformAdminUserId;
            var relationshipCustomerLabel = $"Reference Customer {runKey}";
            await RunRelationshipLifecycleAsync(
                dbContext,
                identities.PlatformAdminSubject,
                relationshipCustomerLabel);
            ResetRequestScope(dbContext);

            var environment = new ReferenceWebHostEnvironment(storageRoot);
            var provisioningOptions = new DataProvisioningOptions
            {
                StorageRoot = storageRoot,
                MaxUploadBytes = 1_048_576,
                EnableSyntheticFixtures = true,
                UseTrustedDevelopmentScanner = true,
                AllowedFileKinds = new Dictionary<string, string>(
                    StringComparer.OrdinalIgnoreCase)
                {
                    [".csv"] = "synthetic_tabular_fixture"
                }
            };
            var wrappedOptions = Options.Create(provisioningOptions);
            var profile = new DataProvisioningProfile(
                environment,
                wrappedOptions);
            var storage = new LocalManagedFileStorage(
                environment,
                wrappedOptions);
            var scanner = new EnvironmentManagedFileScanner(
                environment,
                wrappedOptions);
            var adminController = new DataProvisioningAdminController(
                dbContext,
                new ReferenceIdentityContext(identities.PlatformAdminSubject),
                profile,
                storage,
                scanner)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = CreateHttpContext()
                }
            };

            var source = ReadActionValue(
                await adminController.CreateSourceSample(
                    new CreateSourceSampleRequest
                    {
                        Label = sourceLabel,
                        IsSynthetic = true
                    },
                    CancellationToken.None));
            Require(source.IsSynthetic, "The source was not marked synthetic.");
            ResetRequestScope(dbContext);

            source = await adminController.UpdateSourceSample(
                source.Id,
                new UpdateSourceSampleRequest
                {
                    Label = sourceLabel,
                    Description = "Synthetic, non-production transcript fixture.",
                    BiologicalContext = "Synthetic organism and transcript context.",
                    AssayContext = "Synthetic development-only assay.",
                    AnalysisSummary = "Deterministic reference assembly output.",
                    QcStatus = "Synthetic fixture checks passed.",
                    Provenance = "Generated only for the portal reference journey.",
                    OwnershipBasis = "Phaeno-created synthetic fixture.",
                    OwnershipEvidenceReference = $"reference:{runKey}",
                    DeidentificationMethod = "No human or customer data is present.",
                    DeidentificationNotes = "Synthetic fixture; de-identification is not applicable.",
                    Version = source.Version
                },
                CancellationToken.None);
            var persistedSourceVersion = await dbContext.SourceSamples
                .AsNoTracking()
                .Where(item => item.Id == source.Id)
                .Select(item => item.Version)
                .SingleAsync();
            Require(
                persistedSourceVersion == source.Version,
                $"The persisted source version {persistedSourceVersion} did not match the returned version {source.Version}.");
            ResetRequestScope(dbContext);

            var fixtureBytes = Encoding.UTF8.GetBytes(
                "transcript_id,sequence_length,qc_status\nsynthetic-tx-1,128,pass\n");
            await using (var uploadStream = new MemoryStream(fixtureBytes))
            {
                var formFile = new FormFile(
                    uploadStream,
                    0,
                    uploadStream.Length,
                    "file",
                    "synthetic-transcripts.csv")
                {
                    Headers = new HeaderDictionary(),
                    ContentType = "text/csv"
                };
                var uploadedFile = ReadActionValue(
                    await adminController.UploadSourceFile(
                        source.Id,
                        formFile,
                        CancellationToken.None));
                Require(
                    uploadedFile.ScanStatus == ManagedFileScanStatus.Clean,
                    "The trusted development scanner did not mark the fixture clean.");
                Require(
                    uploadedFile.SizeBytes == fixtureBytes.Length,
                    "The authoritative uploaded size did not match the fixture.");
            }
            ResetRequestScope(dbContext);

            source = await adminController.GetSourceSample(
                source.Id,
                CancellationToken.None);
            ResetRequestScope(dbContext);
            source = await adminController.MarkSourceReady(
                source.Id,
                new VersionedCommandRequest { Version = source.Version },
                CancellationToken.None);
            Require(
                source.Status == SourceSampleStatus.Ready,
                "The complete synthetic source revision was not marked ready.");
            ResetRequestScope(dbContext);

            var dataset = ReadActionValue(
                await adminController.CreateDataset(
                    new CreateCuratedDatasetRequest
                    {
                        Name = $"Synthetic transcript package {runKey}",
                        Description = "Development-only reference package."
                    },
                    CancellationToken.None));
            ResetRequestScope(dbContext);
            var datasetVersion = ReadActionValue(
                await adminController.CreateDatasetVersion(
                    dataset.Id,
                    new CreateCuratedDatasetVersionRequest
                    {
                        SourceSampleId = source.Id,
                        ReleaseNotes = "Initial synthetic reference release.",
                        DatasetVersion = dataset.Version
                    },
                    CancellationToken.None));
            Require(
                datasetVersion.Files.Count == 1,
                "The immutable version did not snapshot the managed fixture file.");
            Require(
                !string.IsNullOrWhiteSpace(datasetVersion.ContentChecksum),
                "The immutable version checksum was not generated.");
            ResetRequestScope(dbContext);
            var persistedDraft = await dbContext.CuratedDatasetVersions
                .AsNoTracking()
                .Include(item => item.Files)
                .SingleAsync(item => item.Id == datasetVersion.Id);
            var rebuiltManifest = DatasetManifestService.Build(persistedDraft);
            Require(
                DatasetManifestService.SemanticallyEquals(
                    persistedDraft.ManifestJson,
                    rebuiltManifest.ManifestJson),
                $"The draft manifest changed after persistence {DescribeDifference(persistedDraft.ManifestJson, rebuiltManifest.ManifestJson)}");
            Require(
                string.Equals(
                    persistedDraft.ContentChecksum,
                    rebuiltManifest.ContentChecksum,
                    StringComparison.Ordinal),
                "The draft checksum changed after persistence.");

            datasetVersion = await adminController.PublishDatasetVersion(
                dataset.Id,
                datasetVersion.Id,
                new VersionedCommandRequest { Version = datasetVersion.Version },
                CancellationToken.None);
            Require(
                datasetVersion.Status == CuratedDatasetVersionStatus.Published,
                "The immutable version was not published.");
            ResetRequestScope(dbContext);

            dataset = await adminController.GetDataset(
                dataset.Id,
                CancellationToken.None);
            ResetRequestScope(dbContext);
            dataset = await adminController.SetDatasetEligibility(
                dataset.Id,
                new SetDatasetEligibilityRequest
                {
                    DatasetVersionId = datasetVersion.Id,
                    IsEligible = true,
                    Version = dataset.Version
                },
                CancellationToken.None);
            Require(
                dataset.EligibleVersionId == datasetVersion.Id,
                "The published exact version was not made eligible.");
            ResetRequestScope(dbContext);

            var idempotencyKey = $"reference-{runKey}";
            var grantResult = await adminController.GrantDataset(
                identities.GrantedProspectOrganizationId,
                new GrantDatasetRequest
                {
                    DatasetVersionId = datasetVersion.Id,
                    IdempotencyKey = idempotencyKey
                },
                CancellationToken.None);
            Require(
                grantResult.Status == ProvisioningRunStatus.Succeeded
                    && grantResult.Grant is not null,
                "The exact-version Prospect grant did not succeed.");
            var grantedDataset = grantResult.Grant
                ?? throw new InvalidOperationException(
                    "The successful provisioning run did not return its grant.");
            ResetRequestScope(dbContext);
            var retryResult = await adminController.GrantDataset(
                identities.GrantedProspectOrganizationId,
                new GrantDatasetRequest
                {
                    DatasetVersionId = datasetVersion.Id,
                    IdempotencyKey = idempotencyKey
                },
                CancellationToken.None);
            Require(
                retryResult.ProvisioningRunId == grantResult.ProvisioningRunId
                    && retryResult.Grant?.Id == grantedDataset.Id,
                "The idempotent grant retry created a different result.");
            ResetRequestScope(dbContext);

            currentUser.UserId = identities.GrantedProspectUserId;
            var grantedTenantController = CreateTenantController(
                dbContext,
                storage,
                identities.GrantedProspectSubject,
                identities.GrantedProspectOrganizationId);
            var visibleDatasets = await grantedTenantController.List(
                CancellationToken.None);
            var visibleDataset = RequireSingle(
                visibleDatasets,
                "The selected Prospect did not see exactly one granted package.");
            Require(
                visibleDataset.DatasetVersionId == datasetVersion.Id,
                "The tenant did not receive the exact granted version.");
            ResetRequestScope(dbContext);

            var detail = await grantedTenantController.Get(
                dataset.Id,
                CancellationToken.None);
            var tenantFile = RequireSingle(
                detail.Files,
                "The tenant package did not expose exactly one managed file.");
            ResetRequestScope(dbContext);
            var fileResult = RequireFileResult(
                await grantedTenantController.DownloadFile(
                    dataset.Id,
                    tenantFile.Id,
                    CancellationToken.None));
            await using (var downloadStream = fileResult.FileStream)
            {
                using var buffer = new MemoryStream();
                await downloadStream.CopyToAsync(buffer);
                Require(
                    buffer.ToArray().SequenceEqual(fixtureBytes),
                    "The individual download bytes did not match the immutable fixture.");
            }
            ResetRequestScope(dbContext);

            var archiveResult = RequireFileResult(
                await grantedTenantController.DownloadArchive(
                    dataset.Id,
                    CancellationToken.None));
            await using (var archiveStream = archiveResult.FileStream)
            using (var archive = new ZipArchive(
                archiveStream,
                ZipArchiveMode.Read,
                leaveOpen: true))
            {
                var archiveEntry = RequireSingle(
                    archive.Entries,
                    "The archive did not contain exactly one fixture file.");
                await using var archiveEntryStream = archiveEntry.Open();
                using var buffer = new MemoryStream();
                await archiveEntryStream.CopyToAsync(buffer);
                Require(
                    buffer.ToArray().SequenceEqual(fixtureBytes),
                    "The archive entry bytes did not match the immutable fixture.");
            }
            ResetRequestScope(dbContext);

            var downloadHistory = await grantedTenantController
                .ListDownloadHistory(CancellationToken.None);
            Require(
                downloadHistory.Count == 2
                    && downloadHistory.Any(item => item.Kind == DatasetDownloadKind.File)
                    && downloadHistory.Any(item => item.Kind == DatasetDownloadKind.Archive),
                "The tenant download history did not record both download kinds.");
            ResetRequestScope(dbContext);

            currentUser.UserId = identities.OtherProspectUserId;
            var otherTenantController = CreateTenantController(
                dbContext,
                storage,
                identities.OtherProspectSubject,
                identities.OtherProspectOrganizationId);
            Require(
                !(await otherTenantController.List(CancellationToken.None)).Any(),
                "An ungranted Prospect discovered the package.");
            ResetRequestScope(dbContext);
            await ExpectProvisioningErrorAsync(
                () => otherTenantController.Get(dataset.Id, CancellationToken.None),
                "curated_dataset_not_found");
            ResetRequestScope(dbContext);

            currentUser.UserId = identities.PlatformAdminUserId;
            var revokedGrant = await adminController.RevokeGrant(
                grantedDataset.Id,
                new RevokeDatasetGrantRequest
                {
                    Reason = "Reference journey revocation verification.",
                    Version = grantedDataset.Version
                },
                CancellationToken.None);
            Require(
                revokedGrant.Status == OrganizationDatasetGrantStatus.Revoked,
                "The package grant was not revoked.");
            ResetRequestScope(dbContext);

            currentUser.UserId = identities.GrantedProspectUserId;
            Require(
                !(await grantedTenantController.List(CancellationToken.None)).Any(),
                "Revocation did not immediately remove tenant package access.");
            ResetRequestScope(dbContext);
            await ExpectProvisioningErrorAsync(
                () => grantedTenantController.Get(dataset.Id, CancellationToken.None),
                "curated_dataset_not_found");
            ResetRequestScope(dbContext);
            Require(
                await dbContext.DatasetDownloadAudits.CountAsync(
                    item => item.OrganizationId
                        == identities.GrantedProspectOrganizationId) == 2,
                "The persisted download-audit count was incorrect.");

            await transaction.RollbackAsync();
            transactionCompleted = true;
            dbContext.ChangeTracker.Clear();
            Require(
                !await dbContext.SourceSamples.AnyAsync(
                    item => item.Label == sourceLabel),
                "The reference fixture rows remained after transaction rollback.");
            Require(
                !await dbContext.Organizations.AnyAsync(
                    item => item.Name == relationshipCustomerLabel),
                "The relationship reference rows remained after transaction rollback.");
        }
        finally
        {
            if (!transactionCompleted)
            {
                await transaction.RollbackAsync();
            }
        }
    }

    private static async Task RunRelationshipLifecycleAsync(
        AppDbContext dbContext,
        string platformAdminSubject,
        string customerLabel)
    {
        var customer = new Organization(customerLabel, OrganizationKind.Customer);
        dbContext.Organizations.Add(customer);
        await dbContext.SaveChangesAsync();
        var customerId = customer.Id;
        ResetRequestScope(dbContext);

        var controller = new RelationshipManagementController(
            dbContext,
            new ReferenceIdentityContext(platformAdminSubject))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = CreateHttpContext()
            }
        };

        var onboardingRequest = ReadActionValue(
            await controller.CreateRequest(
                new CreatePortalIntegrationRequest
                {
                    OrganizationId = customerId,
                    RequestType = PortalIntegrationRequestType.Onboarding,
                    Summary = "Reference onboarding request without a service change."
                },
                CancellationToken.None));
        ResetRequestScope(dbContext);
        onboardingRequest = await controller.DecideRequest(
            onboardingRequest.Id,
            new DecidePortalIntegrationRequest
            {
                Approved = true,
                Reason = "Reference onboarding approval.",
                Version = onboardingRequest.Version
            },
            CancellationToken.None);
        ResetRequestScope(dbContext);

        var effectiveFrom = DateTime.UtcNow.AddMinutes(-5);
        await ExpectRelationshipErrorAsync(
            () => controller.CreateEntitlement(
                customerId,
                new CreateOrganizationServiceEntitlementRequest
                {
                    Service = PortalService.PSeqLabService,
                    EffectiveFrom = effectiveFrom,
                    ConfigurationStatus = EntitlementConfigurationStatus.Ready,
                    SourceRequestId = onboardingRequest.Id
                },
                CancellationToken.None),
            "source_request_not_eligible");
        ResetRequestScope(dbContext);

        var serviceRequest = ReadActionValue(
            await controller.CreateRequest(
                new CreatePortalIntegrationRequest
                {
                    OrganizationId = customerId,
                    RequestType = PortalIntegrationRequestType.ServiceChange,
                    Summary = "Reference PSeq Lab Service approval.",
                    RequestedServices = [PortalService.PSeqLabService]
                },
                CancellationToken.None));
        ResetRequestScope(dbContext);
        serviceRequest = await controller.DecideRequest(
            serviceRequest.Id,
            new DecidePortalIntegrationRequest
            {
                Approved = true,
                Reason = "Reference service approval.",
                Version = serviceRequest.Version
            },
            CancellationToken.None);
        ResetRequestScope(dbContext);

        var entitlement = ReadActionValue(
            await controller.CreateEntitlement(
                customerId,
                new CreateOrganizationServiceEntitlementRequest
                {
                    Service = PortalService.PSeqLabService,
                    EffectiveFrom = effectiveFrom,
                    ConfigurationStatus = EntitlementConfigurationStatus.Ready,
                    SourceRequestId = serviceRequest.Id,
                    Notes = "Reference entitlement."
                },
                CancellationToken.None));
        Require(
            entitlement.SourceRequestId == serviceRequest.Id
                && entitlement.IsEffective
                && entitlement.IsUsable,
            "The approved service request did not produce a usable entitlement.");
        ResetRequestScope(dbContext);

        var activeSummary = await controller.GetOrganizationSummary(
            customerId,
            CancellationToken.None);
        Require(
            activeSummary.EffectiveServices.SequenceEqual(
                [PortalService.PSeqLabService]),
            "The organization summary did not expose the effective service.");
        ResetRequestScope(dbContext);

        const string endReason = "Reference commercial term ended.";
        var ended = await controller.EndEntitlement(
            customerId,
            entitlement.Id,
            new EndOrganizationServiceEntitlementRequest
            {
                EffectiveTo = DateTime.UtcNow,
                Reason = endReason,
                Version = entitlement.Version
            },
            CancellationToken.None);
        Require(
            ended.EndReason == endReason && !ended.IsEffective && !ended.IsUsable,
            "The entitlement end reason or effective state was not retained.");
        ResetRequestScope(dbContext);

        var endedSummary = await controller.GetOrganizationSummary(
            customerId,
            CancellationToken.None);
        Require(
            endedSummary.EffectiveServices.Count == 0,
            "The ended entitlement remained effective in the organization summary.");
    }

    private static async Task<ReferenceIdentities> SeedReferenceOrganizationsAsync(
        AppDbContext dbContext,
        string runKey)
    {
        var platformSubject = $"reference-admin-{runKey}";
        var grantedSubject = $"reference-granted-{runKey}";
        var otherSubject = $"reference-other-{runKey}";
        var platformAdmin = CreateActiveUser(
            $"reference-admin-{runKey}@example.invalid",
            platformSubject);
        var grantedProspectUser = CreateActiveUser(
            $"reference-granted-{runKey}@example.invalid",
            grantedSubject);
        var otherProspectUser = CreateActiveUser(
            $"reference-other-{runKey}@example.invalid",
            otherSubject);
        var phaeno = new Organization(
            $"Reference Phaeno {runKey}",
            OrganizationKind.Phaeno);
        var grantedProspect = new Organization(
            $"Reference Prospect A {runKey}",
            OrganizationKind.Prospect);
        var otherProspect = new Organization(
            $"Reference Prospect B {runKey}",
            OrganizationKind.Prospect);

        dbContext.AddRange(
            platformAdmin,
            grantedProspectUser,
            otherProspectUser,
            phaeno,
            grantedProspect,
            otherProspect,
            new OrganizationMembership(
                platformAdmin.Id,
                phaeno.Id,
                isOrganizationAdmin: true),
            new OrganizationMembership(
                grantedProspectUser.Id,
                grantedProspect.Id,
                isOrganizationAdmin: true),
            new OrganizationMembership(
                otherProspectUser.Id,
                otherProspect.Id,
                isOrganizationAdmin: true));
        await dbContext.SaveChangesAsync();
        dbContext.ChangeTracker.Clear();

        return new ReferenceIdentities(
            platformAdmin.Id,
            platformSubject,
            grantedProspect.Id,
            grantedProspectUser.Id,
            grantedSubject,
            otherProspect.Id,
            otherProspectUser.Id,
            otherSubject);
    }

    private static User CreateActiveUser(string email, string subject)
    {
        var user = new User(email, "Reference", "User");
        user.AcceptInvitation(
            "Reference",
            "User",
            "clerk",
            subject,
            DateTime.UtcNow);
        return user;
    }

    private static CuratedDataController CreateTenantController(
        AppDbContext dbContext,
        IManagedFileStorage storage,
        string subject,
        Guid organizationId)
    {
        return new CuratedDataController(
            dbContext,
            new ReferenceIdentityContext(subject),
            storage)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = CreateHttpContext(organizationId)
            }
        };
    }

    private static DefaultHttpContext CreateHttpContext(Guid? organizationId = null)
    {
        var context = new DefaultHttpContext
        {
            TraceIdentifier = $"reference-{Guid.NewGuid():N}"
        };
        context.Connection.RemoteIpAddress = IPAddress.Loopback;
        if (organizationId.HasValue)
        {
            context.Request.Headers[
                DataProvisioningAuthorization.SelectedOrganizationHeader]
                = organizationId.Value.ToString();
        }

        return context;
    }

    private static void ResetRequestScope(AppDbContext dbContext)
    {
        dbContext.ChangeTracker.Clear();
    }

    private static T ReadActionValue<T>(ActionResult<T> result)
        where T : class
    {
        if (result.Value is not null)
        {
            return result.Value;
        }

        if (result.Result is ObjectResult { Value: T value })
        {
            return value;
        }

        throw new InvalidOperationException(
            $"The controller did not return {typeof(T).Name}.");
    }

    private static FileStreamResult RequireFileResult(IActionResult result)
    {
        return result as FileStreamResult
            ?? throw new InvalidOperationException(
                "The controller did not return a streamed file result.");
    }

    private static string DescribeDifference(string expected, string actual)
    {
        var sharedLength = Math.Min(expected.Length, actual.Length);
        var index = 0;
        while (index < sharedLength && expected[index] == actual[index])
        {
            index++;
        }

        var expectedStart = Math.Max(0, index - 40);
        var actualStart = Math.Max(0, index - 40);
        var expectedLength = Math.Min(100, expected.Length - expectedStart);
        var actualLength = Math.Min(100, actual.Length - actualStart);
        return $"at character {index}; expected '{expected.Substring(expectedStart, expectedLength)}'; actual '{actual.Substring(actualStart, actualLength)}'.";
    }

    private static T RequireSingle<T>(
        IEnumerable<T> values,
        string failureMessage)
    {
        var items = values.Take(2).ToList();
        Require(items.Count == 1, failureMessage);
        return items[0];
    }

    private static async Task ExpectProvisioningErrorAsync<T>(
        Func<Task<T>> action,
        string expectedCode)
    {
        try
        {
            await action();
        }
        catch (DataProvisioningException exception)
            when (exception.ErrorCode == expectedCode)
        {
            return;
        }

        throw new InvalidOperationException(
            $"Expected provisioning error '{expectedCode}'.");
    }

    private static async Task ExpectRelationshipErrorAsync<T>(
        Func<Task<T>> action,
        string expectedCode)
    {
        try
        {
            await action();
        }
        catch (RelationshipManagementException exception)
            when (exception.ErrorCode == expectedCode)
        {
            return;
        }

        throw new InvalidOperationException(
            $"Expected relationship management error '{expectedCode}'.");
    }

    private static void Require(bool condition, string failureMessage)
    {
        if (!condition)
        {
            throw new InvalidOperationException(failureMessage);
        }
    }

    private sealed record ReferenceIdentities(
        Guid PlatformAdminUserId,
        string PlatformAdminSubject,
        Guid GrantedProspectOrganizationId,
        Guid GrantedProspectUserId,
        string GrantedProspectSubject,
        Guid OtherProspectOrganizationId,
        Guid OtherProspectUserId,
        string OtherProspectSubject);
}

internal sealed class ReferenceIdentityContext(string subject)
    : IExternalIdentityContext
{
    public ExternalIdentity? Read(HttpContext httpContext)
    {
        return new ExternalIdentity(
            "clerk",
            subject,
            $"{subject}@example.invalid",
            IsEmailVerified: true);
    }
}

internal sealed class MutableCurrentUserContext : ICurrentUserContext
{
    public Guid? UserId { get; set; }

    public Guid? OrganizationId => null;

    public string RequestId => "reference-journey";
}

internal sealed class ReferenceWebHostEnvironment(string contentRoot)
    : IWebHostEnvironment
{
    public string EnvironmentName { get; set; } = Environments.Development;

    public string ApplicationName { get; set; } =
        "PhaenoPortal.ReferenceJourney";

    public string WebRootPath { get; set; } = contentRoot;

    public IFileProvider WebRootFileProvider { get; set; } =
        new NullFileProvider();

    public string ContentRootPath { get; set; } = contentRoot;

    public IFileProvider ContentRootFileProvider { get; set; } =
        new NullFileProvider();
}
