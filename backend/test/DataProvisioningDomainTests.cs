namespace PhaenoPortal.Test;

using System.Text.Json;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.DataProvisioning.Domain;
using PhaenoPortal.App.Features.DataProvisioning.Services;

public class DataProvisioningDomainTests
{
    [Fact]
    public void ReadySourceRevisionIsImmutable()
    {
        var source = CreateReadySource();

        Assert.Equal(SourceSampleStatus.Ready, source.Status);
        Assert.Throws<InvalidOperationException>(() =>
            source.UpdateMetadata(
                "Changed",
                "Description",
                "Biological context",
                "Assay context",
                "Analysis",
                "Passed",
                "Phaeno"));
    }

    [Fact]
    public void CuratedVersionSnapshotsReadySourceAndBuildsStableChecksum()
    {
        var source = CreateReadySource();
        var dataset = new CuratedDataset("Synthetic reference", "Fixture package");
        var snapshotAt = new DateTime(2026, 7, 14, 12, 0, 0, DateTimeKind.Utc);
        var version = new CuratedDatasetVersion(
            dataset.Id,
            versionNumber: 1,
            source,
            "Initial synthetic fixture",
            snapshotAt);
        foreach (var file in source.Files)
        {
            version.Files.Add(new CuratedDatasetVersionFile(version.Id, file));
        }

        var firstManifest = DatasetManifestService.Build(version);
        var secondManifest = DatasetManifestService.Build(version);

        Assert.Equal(firstManifest.ManifestJson, secondManifest.ManifestJson);
        Assert.Equal(firstManifest.ContentChecksum, secondManifest.ContentChecksum);
        Assert.Equal(64, firstManifest.ContentChecksum.Length);
        Assert.Equal(source.Id, version.SourceSampleId);
        Assert.Equal(source.Revision, version.SourceRevision);
        Assert.Equal(source.Files.Single().Sha256, version.Files.Single().Sha256);
    }

    [Fact]
    public void ManifestComparisonAcceptsJsonbKeyOrderingAndWhitespace()
    {
        const string applicationJson =
            "{\"sourceSampleId\":\"sample-1\",\"files\":[{\"id\":\"file-1\",\"sizeBytes\":2}]}";
        const string postgresqlJsonb =
            "{\"files\": [{\"id\": \"file-1\", \"sizeBytes\": 2}], \"sourceSampleId\": \"sample-1\"}";

        Assert.True(DatasetManifestService.SemanticallyEquals(
            applicationJson,
            postgresqlJsonb));
        Assert.False(DatasetManifestService.SemanticallyEquals(
            applicationJson,
            postgresqlJsonb.Replace("file-1", "file-2", StringComparison.Ordinal)));
    }

    [Fact]
    public void ManifestNormalizesTimestampsToPostgresqlMicrosecondPrecision()
    {
        var source = CreateReadySource();
        var dataset = new CuratedDataset("Synthetic reference", "Fixture package");
        var snapshotAt = new DateTime(
            2026,
            7,
            14,
            12,
            0,
            0,
            DateTimeKind.Utc).AddTicks(7);
        var version = new CuratedDatasetVersion(
            dataset.Id,
            versionNumber: 1,
            source,
            "Initial synthetic fixture",
            snapshotAt);

        var manifest = DatasetManifestService.Build(version);
        using var document = JsonDocument.Parse(manifest.ManifestJson);

        Assert.Equal(
            snapshotAt.AddTicks(-7),
            document.RootElement
                .GetProperty("sourceSnapshotAt")
                .GetDateTime());
    }

    [Fact]
    public void EligibilityAndGrantPinOnePublishedExactVersionUntilRevoked()
    {
        var source = CreateReadySource();
        var dataset = new CuratedDataset("Synthetic reference", "Fixture package");
        var now = new DateTime(2026, 7, 14, 12, 0, 0, DateTimeKind.Utc);
        var actorId = Guid.NewGuid();
        var version = new CuratedDatasetVersion(
            dataset.Id,
            versionNumber: 1,
            source,
            "Initial synthetic fixture",
            now);
        foreach (var file in source.Files)
        {
            version.Files.Add(new CuratedDatasetVersionFile(version.Id, file));
        }
        var manifest = DatasetManifestService.Build(version);
        version.SetManifest(manifest.ManifestJson, manifest.ContentChecksum);
        version.Publish(actorId, now);
        dataset.SetEligibleVersion(version, actorId, now);
        var prospect = new Organization("Prospect", OrganizationKind.Prospect);
        var grant = new OrganizationDatasetGrant(
            prospect,
            dataset,
            version,
            actorId,
            now);

        Assert.Equal(version.Id, dataset.EligibleVersionId);
        Assert.Equal(version.Id, grant.CuratedDatasetVersionId);
        Assert.Equal(OrganizationDatasetGrantStatus.Active, grant.Status);

        grant.Revoke("Prospect request", actorId, now.AddMinutes(1));

        Assert.Equal(OrganizationDatasetGrantStatus.Revoked, grant.Status);
        Assert.Equal("Prospect request", grant.RevocationReason);
    }

    [Fact]
    public void GrantUpgradeSupersedesPriorExactVersionWithoutErasingHistory()
    {
        var source = CreateReadySource();
        var dataset = new CuratedDataset("Synthetic reference", "Fixture package");
        var now = new DateTime(2026, 7, 14, 12, 0, 0, DateTimeKind.Utc);
        var actorId = Guid.NewGuid();
        var firstVersion = CreatePublishedVersion(dataset, source, 1, actorId, now);
        var secondVersion = CreatePublishedVersion(dataset, source, 2, actorId, now.AddMinutes(1));
        dataset.SetEligibleVersion(secondVersion, actorId, now.AddMinutes(1));
        var prospect = new Organization("Prospect", OrganizationKind.Prospect);
        var priorGrant = new OrganizationDatasetGrant(
            prospect,
            dataset,
            firstVersion,
            actorId,
            now);

        priorGrant.Supersede(actorId, now.AddMinutes(2));
        var replacement = new OrganizationDatasetGrant(
            prospect,
            dataset,
            secondVersion,
            actorId,
            now.AddMinutes(2));

        Assert.Equal(OrganizationDatasetGrantStatus.Superseded, priorGrant.Status);
        Assert.Equal(now.AddMinutes(2), priorGrant.SupersededAt);
        Assert.Equal(OrganizationDatasetGrantStatus.Active, replacement.Status);
        Assert.Equal(secondVersion.Id, replacement.CuratedDatasetVersionId);
    }

    [Fact]
    public void GovernanceQuarantineCanRestoreUnchangedContentOrWithdrawUnsafeContent()
    {
        var source = CreateReadySource();
        var dataset = new CuratedDataset("Synthetic reference", "Fixture package");
        var actorId = Guid.NewGuid();
        var now = new DateTime(2026, 7, 14, 12, 0, 0, DateTimeKind.Utc);
        var clearableVersion = CreatePublishedVersion(dataset, source, 1, actorId, now);
        var priorStatus = clearableVersion.Quarantine();

        clearableVersion.ClearQuarantine(priorStatus);

        Assert.Equal(CuratedDatasetVersionStatus.Published, clearableVersion.Status);

        var unsafeVersion = CreatePublishedVersion(dataset, source, 2, actorId, now.AddMinutes(1));
        unsafeVersion.Quarantine();
        unsafeVersion.Withdraw();

        Assert.Equal(CuratedDatasetVersionStatus.Withdrawn, unsafeVersion.Status);
        Assert.Throws<InvalidOperationException>(() =>
            unsafeVersion.ClearQuarantine(CuratedDatasetVersionStatus.Published));
    }

    [Fact]
    public void AffectedOrganizationAttestationPreservesEvidenceAndClosesOutstandingStatus()
    {
        var organization = new Organization("Prospect", OrganizationKind.Prospect);
        var actorId = Guid.NewGuid();
        var now = new DateTime(2026, 7, 14, 12, 0, 0, DateTimeKind.Utc);
        var affected = new DataGovernanceAffectedOrganization(
            Guid.NewGuid(),
            organization,
            affectedGrantCount: 2);
        affected.RequireAttestation();
        affected.RecordReminder(now);

        affected.Attest(
            actorId,
            AttestationSource.SubmittedInPortal,
            "admin@example.test",
            "Submitted in portal",
            "Deleted all downloaded copies.",
            now.AddMinutes(1));

        Assert.Equal(AffectedOrganizationStatus.Attested, affected.Status);
        Assert.Equal(1, affected.ReminderCount);
        Assert.Equal(AttestationSource.SubmittedInPortal, affected.AttestationSource);
        Assert.Equal("Deleted all downloaded copies.", affected.AttestationNotes);
    }

    private static CuratedDatasetVersion CreatePublishedVersion(
        CuratedDataset dataset,
        SourceSample source,
        int versionNumber,
        Guid actorId,
        DateTime now)
    {
        var version = new CuratedDatasetVersion(
            dataset.Id,
            versionNumber,
            source,
            $"Version {versionNumber}",
            now);
        foreach (var file in source.Files)
        {
            version.Files.Add(new CuratedDatasetVersionFile(version.Id, file));
        }

        var manifest = DatasetManifestService.Build(version);
        version.SetManifest(manifest.ManifestJson, manifest.ContentChecksum);
        version.Publish(actorId, now);
        return version;
    }

    private static SourceSample CreateReadySource()
    {
        var actorId = Guid.NewGuid();
        var now = new DateTime(2026, 7, 14, 11, 0, 0, DateTimeKind.Utc);
        var source = new SourceSample("Synthetic source", isSynthetic: true);
        source.UpdateMetadata(
            "Synthetic source",
            "Harmless synthetic fixture",
            "Synthetic biological context",
            "Synthetic assay context",
            "Synthetic analysis summary",
            "Passed fixture checks",
            "Generated for automated tests");
        source.ConfirmOwnership(
            "Phaeno-generated synthetic fixture",
            "TEST-FIXTURE",
            actorId,
            now);
        source.ConfirmDeidentification(
            "Contains no human or customer identifiers",
            "Synthetic-only content",
            actorId,
            now);
        var file = new ManagedFile(
            source.Id,
            "fixture.json",
            "structured_fixture",
            "application/json",
            2,
            new string('a', 64),
            "test/fixture.json");
        file.RecordScan(ManagedFileScanStatus.Clean, "Trusted test scanner");
        source.Files.Add(file);
        source.MarkReady(actorId, now);
        return source;
    }
}
